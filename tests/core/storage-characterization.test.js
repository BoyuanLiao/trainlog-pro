const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const storageModule = fs.readFileSync('js/core/storage.js','utf8');

function makeLocalStorage(seed={}, options={}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem(key){ return store.has(key) ? store.get(key) : null; },
    setItem(key,value){ if(options.throwOnSet && options.throwOnSet(key,value)) throw new Error('storage write failed'); store.set(key,String(value)); },
    removeItem(key){ store.delete(key); },
    dump(){ return Object.fromEntries(store.entries()); }
  };
}

function makeHarness({seed={},throwOnSet}={}) {
  const localStorage=makeLocalStorage(seed,{throwOnSet});
  let uidCount=0,renderCount=0;
  const ctx=vm.createContext({window:{},console,JSON,Date,Math,Object,Array,Map,Set});
  vm.runInContext(storageModule,ctx);
  const create=ctx.window.TrainLogStorage.create;
  const core=create({
    appKey:'trainlogProData', legacyKey:'fitnessRecordsV1', storage:localStorage,
    migrate:raw=>({migrated:true,raw}), freshData:()=>({fresh:true,snapshots:[]}),
    uid:p=>p+'_test_'+(++uidCount), now:()=>new Date('2026-09-13T01:00:00+08:00')
  });
  return {core,localStorage,render:()=>{renderCount++},get renderCount(){return renderCount}};
}

// 1. Current valid payload is parsed then migrated.
{
  const h=makeHarness({seed:{trainlogProData:JSON.stringify({schemaVersion:18,workouts:[{id:'w1'}]})}});
  const result=h.core.loadData();
  assert.equal(result.data.migrated,true);
  assert.equal(result.data.raw.workouts[0].id,'w1');
  assert.equal(result.recoveryIssue,null);
}

// 2. Broken current JSON is preserved under recovery key and fresh data is returned.
{
  const broken='{bad json';
  const h=makeHarness({seed:{trainlogProData:broken}});
  const result=h.core.loadData();
  assert.equal(result.data.fresh,true);
  assert.equal(h.localStorage.getItem('trainlogProData_recovery_latest'),broken);
  assert.equal(result.recoveryIssue.key,'trainlogProData_recovery_latest');
  assert.equal(result.recoveryIssue.raw,broken);
  assert.ok(result.recoveryIssue.message);
}

// 3. Recovery write failure still exposes recoveryIssue and boots fresh.
{
  const h=makeHarness({seed:{trainlogProData:'{bad'},throwOnSet:key=>key==='trainlogProData_recovery_latest'});
  const result=h.core.loadData();
  assert.equal(result.data.fresh,true);
  assert.equal(result.recoveryIssue.key,'');
  assert.equal(result.recoveryIssue.raw,'{bad');
}

// 4. Legacy fitnessRecordsV1 is migrated and persisted to current key.
{
  const legacy=JSON.stringify([{date:'2025-01-01',name:'Legacy'}]);
  const h=makeHarness({seed:{fitnessRecordsV1:legacy}});
  const result=h.core.loadData();
  assert.equal(result.data.migrated,true);
  assert.equal(result.data.raw.schemaVersion,1);
  assert.deepEqual(JSON.parse(JSON.stringify(result.data.raw.records)),JSON.parse(legacy));
  assert.equal(JSON.parse(h.localStorage.getItem('trainlogProData')).migrated,true);
}

// 5. Broken legacy JSON is copied to legacy recovery key and app starts fresh.
{
  const h=makeHarness({seed:{fitnessRecordsV1:'not-json'}});
  const result=h.core.loadData();
  assert.equal(result.data.fresh,true);
  assert.equal(h.localStorage.getItem('fitnessRecordsV1_recovery_latest'),'not-json');
}

// 6. With no persisted data, loadData returns fresh data.
{
  const h=makeHarness();
  assert.equal(h.core.loadData().data.fresh,true);
}

// 7. snapshot excludes nested snapshots and keeps only five valid snapshots.
{
  const h=makeHarness();
  const data={value:42,snapshots:[{id:'old1',payload:{a:1}},{id:'old2',payload:{a:2}},{id:'old3',payload:{a:3}},{id:'old4',payload:{a:4}},{id:'old5',payload:{a:5}},{id:'bad'}]};
  h.core.snapshot(data,'before change');
  assert.equal(data.snapshots.length,5);
  assert.equal(data.snapshots[0].reason,'before change');
  assert.equal(data.snapshots[0].payload.value,42);
  assert.equal(Object.prototype.hasOwnProperty.call(data.snapshots[0].payload,'snapshots'),false);
  assert.equal(data.snapshots.some(x=>x.id==='bad'),false);
}

// 8. save without snapshot persists exact data and renders once.
{
  const h=makeHarness();
  const data={value:7,snapshots:[]};
  h.core.save(data,'',false,h.render);
  assert.deepEqual(JSON.parse(h.localStorage.getItem('trainlogProData')),data);
  assert.equal(h.renderCount,1);
}

// 9. save with snapshot creates snapshot before persistence and uses supplied reason.
{
  const h=makeHarness();
  const data={value:9,snapshots:[]};
  h.core.save(data,'manual test',true,h.render);
  const persisted=JSON.parse(h.localStorage.getItem('trainlogProData'));
  assert.equal(persisted.snapshots.length,1);
  assert.equal(persisted.snapshots[0].reason,'manual test');
  assert.equal(persisted.snapshots[0].payload.value,9);
  assert.equal(h.renderCount,1);
}

// 10. Empty snapshot reason falls back to current automatic label.
{
  const h=makeHarness();
  const data={value:10,snapshots:[]};
  h.core.save(data,'',true,h.render);
  const persisted=JSON.parse(h.localStorage.getItem('trainlogProData'));
  assert.equal(persisted.snapshots[0].reason,'自動快照');
}

console.log('storage characterization: 10 cases passed');
