'use strict';

const assert=require('assert');
const {createBrowserContext,loadBrowserScript}=require('../helpers/load-browser-script');

const ctx=createBrowserContext();
loadBrowserScript(ctx,'js/core/storage.js');
const Storage=ctx.TrainLogStorage;
const plain=value=>JSON.parse(JSON.stringify(value));

function memoryStorage(initial={}){
  const map=new Map(Object.entries(initial));
  return {
    map,
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value))
  };
}
const deps={
  appKey:'app',
  legacyKey:'legacy',
  migrate:x=>({...x,migrated:true}),
  freshData:()=>({fresh:true,snapshots:[]}),
  uid:p=>p+'_id',
  now:()=>new Date('2026-09-20T00:00:00.000Z')
};

assert.throws(()=>Storage.create({...deps,storage:null}),/storage adapter/);
assert.throws(()=>Storage.create({storage:memoryStorage(),migrate:null,freshData:deps.freshData,uid:deps.uid}),/missing required dependency/);

// Current valid payload wins.
{
  const storage=memoryStorage({app:JSON.stringify({value:1})});
  const core=Storage.create({...deps,storage});
  assert.deepStrictEqual(plain(core.loadData()),{data:{value:1,migrated:true},recoveryIssue:null});
}

// Corrupt current payload is preserved and fresh data is returned.
{
  const storage=memoryStorage({app:'{broken'});
  const core=Storage.create({...deps,storage});
  const result=core.loadData();
  assert.strictEqual(result.data.fresh,true);
  assert.strictEqual(storage.getItem('app_recovery_latest'),'{broken');
  assert.strictEqual(result.recoveryIssue.key,'app_recovery_latest');
  assert.strictEqual(result.recoveryIssue.raw,'{broken');
  assert.strictEqual(result.recoveryIssue.at,'2026-09-20T00:00:00.000Z');
}

// Recovery-copy write failure must not prevent startup.
{
  const storage=memoryStorage({app:'{broken'});
  const original=storage.setItem;
  storage.setItem=(key,value)=>{
    if(key==='app_recovery_latest')throw new Error('quota');
    original(key,value);
  };
  const result=Storage.create({...deps,storage}).loadData();
  assert.strictEqual(result.data.fresh,true);
  assert.strictEqual(result.recoveryIssue.key,'');
}

// Legacy data migrates and is persisted into the current key.
{
  const storage=memoryStorage({legacy:JSON.stringify([{id:1}])});
  const result=Storage.create({...deps,storage}).loadData();
  assert.strictEqual(result.data.schemaVersion,1);
  assert.deepStrictEqual(result.data.records,[{id:1}]);
  assert.strictEqual(result.data.migrated,true);
  assert(storage.getItem('app').includes('"migrated":true'));
}

// Corrupt legacy data is backed up, then fresh data is used.
{
  const storage=memoryStorage({legacy:'bad json'});
  const result=Storage.create({...deps,storage}).loadData();
  assert.strictEqual(result.data.fresh,true);
  assert.strictEqual(storage.getItem('legacy_recovery_latest'),'bad json');
}

// Snapshots are capped at five and never recursively contain snapshots.
{
  const storage=memoryStorage();
  const core=Storage.create({...deps,storage});
  const data={value:7,snapshots:Array.from({length:5},(_,i)=>({id:'old'+i,payload:{i}}))};
  const snap=core.snapshot(data,'before change');
  assert.strictEqual(data.snapshots.length,5);
  assert.strictEqual(data.snapshots[0],snap);
  assert.strictEqual(snap.reason,'before change');
  assert.strictEqual(snap.at,'2026-09-20T00:00:00.000Z');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(snap.payload,'snapshots'),false);
  assert.strictEqual(data.snapshots.some(x=>x.id==='old4'),false);
}

// save writes data, optionally snapshots, and invokes render exactly once.
{
  const storage=memoryStorage();
  const core=Storage.create({...deps,storage});
  const data={value:1,snapshots:[]};
  let renders=0;
  core.save(data,'save test',true,()=>renders++);
  assert.strictEqual(renders,1);
  assert.strictEqual(data.snapshots.length,1);
  const persisted=JSON.parse(storage.getItem('app'));
  assert.strictEqual(persisted.value,1);
  assert.strictEqual(persisted.snapshots.length,1);
}

// Storage write errors intentionally propagate so the caller can surface them.
{
  const storage=memoryStorage();
  storage.setItem=()=>{throw new Error('quota exceeded')};
  const core=Storage.create({...deps,storage});
  assert.throws(()=>core.save({snapshots:[]}),/quota exceeded/);
}

console.log('storage edge cases: passed');
