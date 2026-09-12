const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const app = fs.readFileSync('js/app.js','utf8');

function functionSource(name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = re.exec(app);
  if (!m) throw new Error('Missing function ' + name);
  const start = m.index;
  const brace = app.indexOf('{', m.index + m[0].length);
  let depth=0,state='normal',escaped=false;
  for(let i=brace;i<app.length;i++){
    const ch=app[i],next=app[i+1]||'';
    if(state==='line'){ if(ch==='\n')state='normal'; continue; }
    if(state==='block'){ if(ch==='*'&&next==='/'){state='normal';i++;} continue; }
    if(['single','double','template'].includes(state)){
      if(escaped){escaped=false;continue;}
      if(ch==='\\'){escaped=true;continue;}
      if((state==='single'&&ch==="'")||(state==='double'&&ch==='"')||(state==='template'&&ch==='`'))state='normal';
      continue;
    }
    if(ch==='/'&&next==='/'){state='line';i++;continue;}
    if(ch==='/'&&next==='*'){state='block';i++;continue;}
    if(ch==="'"){state='single';continue;}
    if(ch==='"'){state='double';continue;}
    if(ch==='`'){state='template';continue;}
    if(ch==='{')depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0)return app.slice(start,i+1);
    }
  }
  throw new Error('Unclosed function '+name);
}

function makeLocalStorage(seed={}, options={}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem(key){ return store.has(key) ? store.get(key) : null; },
    setItem(key,value){ if(options.throwOnSet && options.throwOnSet(key,value)) throw new Error('storage write failed'); store.set(key,String(value)); },
    removeItem(key){ store.delete(key); },
    dump(){ return Object.fromEntries(store.entries()); }
  };
}

function makeContext({seed={}, throwOnSet}={}) {
  const localStorage = makeLocalStorage(seed,{throwOnSet});
  let renderCount = 0;
  let uidCount = 0;
  const ctx = vm.createContext({ console, JSON, Date, Math, Object, Array, Map, Set, localStorage });
  vm.runInContext(`
    const APP_KEY='trainlogProData';
    let recoveryIssue=null;
    let data={};
    const uid=(p='id')=>p+'_test_'+(++globalThis.__uidCount);
    const migrate=raw=>({migrated:true,raw});
    const freshData=()=>({fresh:true,snapshots:[]});
    const renderAll=()=>{globalThis.__renderCount++};
    globalThis.__uidCount=0;
    globalThis.__renderCount=0;
  `,ctx);
  for(const name of ['loadData','snapshot','save']) vm.runInContext(functionSource(name),ctx);
  return {ctx,localStorage,get renderCount(){return vm.runInContext('__renderCount',ctx)},get recoveryIssue(){return vm.runInContext('recoveryIssue',ctx)}};
}

// 1. Current valid payload is parsed then migrated.
{
  const h=makeContext({seed:{trainlogProData:JSON.stringify({schemaVersion:18,workouts:[{id:'w1'}]})}});
  const out=vm.runInContext('loadData()',h.ctx);
  assert.equal(out.migrated,true);
  assert.equal(out.raw.workouts[0].id,'w1');
}

// 2. Broken current JSON is preserved under recovery key and fresh data is returned.
{
  const broken='{bad json';
  const h=makeContext({seed:{trainlogProData:broken}});
  const out=vm.runInContext('loadData()',h.ctx);
  assert.equal(out.fresh,true);
  assert.equal(h.localStorage.getItem('trainlogProData_recovery_latest'),broken);
  assert.equal(h.recoveryIssue.key,'trainlogProData_recovery_latest');
  assert.equal(h.recoveryIssue.raw,broken);
  assert.ok(h.recoveryIssue.message);
}

// 3. Recovery write failure must still expose recoveryIssue and boot fresh.
{
  const h=makeContext({seed:{trainlogProData:'{bad'},throwOnSet:key=>key==='trainlogProData_recovery_latest'});
  const out=vm.runInContext('loadData()',h.ctx);
  assert.equal(out.fresh,true);
  assert.equal(h.recoveryIssue.key,'');
  assert.equal(h.recoveryIssue.raw,'{bad');
}

// 4. Legacy fitnessRecordsV1 is migrated and persisted to current key.
{
  const legacy=JSON.stringify([{date:'2025-01-01',name:'Legacy'}]);
  const h=makeContext({seed:{fitnessRecordsV1:legacy}});
  const out=vm.runInContext('loadData()',h.ctx);
  assert.equal(out.migrated,true);
  assert.equal(out.raw.schemaVersion,1);
  assert.deepEqual(JSON.parse(JSON.stringify(out.raw.records)),JSON.parse(legacy));
  const persisted=JSON.parse(h.localStorage.getItem('trainlogProData'));
  assert.equal(persisted.migrated,true);
}

// 5. Broken legacy JSON is copied to legacy recovery key and app starts fresh.
{
  const h=makeContext({seed:{fitnessRecordsV1:'not-json'}});
  const out=vm.runInContext('loadData()',h.ctx);
  assert.equal(out.fresh,true);
  assert.equal(h.localStorage.getItem('fitnessRecordsV1_recovery_latest'),'not-json');
}

// 6. With no persisted data, loadData returns fresh data.
{
  const h=makeContext();
  const out=vm.runInContext('loadData()',h.ctx);
  assert.equal(out.fresh,true);
}

// 7. snapshot excludes nested snapshots from payload and keeps only five valid snapshots.
{
  const h=makeContext();
  vm.runInContext(`data={value:42,snapshots:[
    {id:'old1',payload:{a:1}},{id:'old2',payload:{a:2}},{id:'old3',payload:{a:3}},
    {id:'old4',payload:{a:4}},{id:'old5',payload:{a:5}},{id:'bad'}
  ]}; snapshot('before change');`,h.ctx);
  const d=vm.runInContext('data',h.ctx);
  assert.equal(d.snapshots.length,5);
  assert.equal(d.snapshots[0].reason,'before change');
  assert.equal(d.snapshots[0].payload.value,42);
  assert.equal(Object.prototype.hasOwnProperty.call(d.snapshots[0].payload,'snapshots'),false);
  assert.equal(d.snapshots.some(x=>x.id==='bad'),false);
}

// 8. save without snapshot persists exact data and renders once.
{
  const h=makeContext();
  vm.runInContext(`data={value:7,snapshots:[]}; save();`,h.ctx);
  assert.deepEqual(JSON.parse(h.localStorage.getItem('trainlogProData')),{value:7,snapshots:[]});
  assert.equal(h.renderCount,1);
}

// 9. save with snapshot creates snapshot before persistence and uses supplied reason.
{
  const h=makeContext();
  vm.runInContext(`data={value:9,snapshots:[]}; save('manual test',true);`,h.ctx);
  const persisted=JSON.parse(h.localStorage.getItem('trainlogProData'));
  assert.equal(persisted.snapshots.length,1);
  assert.equal(persisted.snapshots[0].reason,'manual test');
  assert.equal(persisted.snapshots[0].payload.value,9);
  assert.equal(h.renderCount,1);
}

// 10. Empty snapshot reason falls back to current automatic label.
{
  const h=makeContext();
  vm.runInContext(`data={value:10,snapshots:[]}; save('',true);`,h.ctx);
  const persisted=JSON.parse(h.localStorage.getItem('trainlogProData'));
  assert.equal(persisted.snapshots[0].reason,'自動快照');
}

console.log('storage characterization: 10 cases passed');
