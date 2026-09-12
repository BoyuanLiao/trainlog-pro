from pathlib import Path
import re

storage = r'''/**
 * TrainLog Pro persistence core.
 * Owns LocalStorage load/recovery plus snapshot/save behavior.
 * No DOM access; migration and render callbacks are injected.
 */
(() => {
  'use strict';

  function create(options = {}) {
    const appKey = options.appKey || 'trainlogProData';
    const legacyKey = options.legacyKey || 'fitnessRecordsV1';
    const storage = options.storage;
    const migrate = options.migrate;
    const freshData = options.freshData;
    const uid = options.uid;
    const now = typeof options.now === 'function' ? options.now : () => new Date();

    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new Error('TrainLogStorage.create requires a storage adapter');
    }
    if (typeof migrate !== 'function' || typeof freshData !== 'function' || typeof uid !== 'function') {
      throw new Error('TrainLogStorage.create missing required dependency');
    }

    function loadData() {
      let recoveryIssue = null;
      const cur = storage.getItem(appKey);
      if (cur) {
        try {
          return { data: migrate(JSON.parse(cur)), recoveryIssue };
        } catch (err) {
          try {
            const recoveryKey = appKey + '_recovery_latest';
            storage.setItem(recoveryKey, cur);
            recoveryIssue = {key:recoveryKey,raw:cur,at:now().toISOString(),message:String(err?.message||err||'JSON parse error')};
          } catch {
            recoveryIssue = {key:'',raw:cur,at:now().toISOString(),message:String(err?.message||err||'JSON parse error')};
          }
          return { data: freshData(), recoveryIssue };
        }
      }
      try {
        const legacy = storage.getItem(legacyKey);
        if (legacy) {
          const data = migrate({schemaVersion:1,records:JSON.parse(legacy)});
          storage.setItem(appKey, JSON.stringify(data));
          return { data, recoveryIssue };
        }
      } catch {
        try { storage.setItem(legacyKey + '_recovery_latest', storage.getItem(legacyKey) || ''); } catch {}
      }
      return { data: freshData(), recoveryIssue };
    }

    function snapshot(data, reason) {
      const copy = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'snapshots'))));
      const snaps = (data.snapshots || []).filter(s => s && s.payload);
      snaps.unshift({id:uid('snap'),at:now().toISOString(),reason,payload:copy});
      data.snapshots = snaps.slice(0,5);
      return data.snapshots[0];
    }

    function save(data, reason = '', takeSnapshot = false, render) {
      if (takeSnapshot) snapshot(data, reason || '自動快照');
      storage.setItem(appKey, JSON.stringify(data));
      if (typeof render === 'function') render();
    }

    return Object.freeze({ loadData, snapshot, save });
  }

  window.TrainLogStorage = Object.freeze({ create });
})();
'''
Path('js/core/storage.js').write_text(storage, encoding='utf-8')

app_path = Path('js/app.js')
app = app_path.read_text(encoding='utf-8')

def function_span(source, name):
    m = re.search(r'(?m)^\s*function\s+' + re.escape(name) + r'\s*\(', source)
    if not m:
        raise RuntimeError(f'missing {name}')
    brace = source.find('{', m.end())
    depth = 0
    state = 'normal'
    escaped = False
    i = brace
    while i < len(source):
        ch = source[i]
        nxt = source[i+1] if i+1 < len(source) else ''
        if state == 'line':
            if ch == '\n': state = 'normal'
            i += 1; continue
        if state == 'block':
            if ch == '*' and nxt == '/': state = 'normal'; i += 2
            else: i += 1
            continue
        if state in ('single','double','template'):
            if escaped: escaped = False; i += 1; continue
            if ch == '\\': escaped = True; i += 1; continue
            if (state == 'single' and ch == "'") or (state == 'double' and ch == '"') or (state == 'template' and ch == '`'):
                state = 'normal'
            i += 1; continue
        if ch == '/' and nxt == '/': state='line'; i += 2; continue
        if ch == '/' and nxt == '*': state='block'; i += 2; continue
        if ch == "'": state='single'; i += 1; continue
        if ch == '"': state='double'; i += 1; continue
        if ch == '`': state='template'; i += 1; continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(source) and source[end] in ' \t\r': end += 1
                if end < len(source) and source[end] == '\n': end += 1
                return m.start(), end
        i += 1
    raise RuntimeError(f'unclosed {name}')

# Remove old loadData first, but keep recoveryIssue declaration and data initialization locations predictable.
load_start, load_end = function_span(app, 'loadData')
app = app[:load_start] + app[load_end:]

# Replace snapshot/save implementations with thin wrappers.
for name, replacement in {
    'snapshot': "function snapshot(reason){return storageCore.snapshot(data,reason)}\n",
    'save': "function save(reason='',takeSnapshot=false){return storageCore.save(data,reason,takeSnapshot,renderAll)}\n",
}.items():
    start, end = function_span(app, name)
    app = app[:start] + replacement + app[end:]

anchor = 'let recoveryIssue=null;\n'
if anchor not in app:
    raise RuntimeError('recoveryIssue anchor missing')
bridge = """const storageCore=window.TrainLogStorage.create({appKey:APP_KEY,legacyKey:'fitnessRecordsV1',storage:localStorage,migrate,freshData,uid});
function loadData(){const result=storageCore.loadData();recoveryIssue=result.recoveryIssue;return result.data}
"""
app = app.replace(anchor, anchor + bridge, 1)
app_path.write_text(app, encoding='utf-8')

# Ensure storage module loads after migration and before app.
index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
if 'js/core/storage.js' not in index:
    app_tag = re.search(r'(?P<indent>^[ \t]*)<script[^>]*src=["\']js/app\.js(?P<query>\?[^"\']*)?["\'][^>]*></script>', index, re.M)
    if not app_tag:
        raise RuntimeError('app.js tag missing')
    indent = app_tag.group('indent')
    query = app_tag.group('query') or ''
    tag = f'{indent}<script src="js/core/storage.js{query}"></script>\n'
    index = index[:app_tag.start()] + tag + index[app_tag.start():]
    index_path.write_text(index, encoding='utf-8')

# Rewrite storage test to exercise extracted module directly while preserving the same ten cases.
test_path = Path('tests/core/storage-characterization.test.js')
test = r'''const fs = require('fs');
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
'''
test_path.write_text(test, encoding='utf-8')

# Update docs.
core_readme = Path('js/core/README.md')
text = core_readme.read_text(encoding='utf-8')
text = text.replace('狀態：**重構骨架，程式目前尚未從 `app.js` 搬入。**','狀態：**Phase 3 進行中。migration 與 storage 已建立獨立核心模組。**')
if '### `storage.js`' not in text:
    text += '''\n### `storage.js`\n- LocalStorage current/legacy load。\n- 壞資料 recovery copy 與 recoveryIssue。\n- 最多 5 份 snapshot。\n- save/persist，render callback 由 App 注入。\n- 對應測試：`tests/core/storage-characterization.test.js`。\n'''
core_readme.write_text(text, encoding='utf-8')

doc = Path('docs/REFACTOR.md')
text = doc.read_text(encoding='utf-8')
if '- [x] `js/core/storage.js`' not in text:
    marker='## Phase 3：Core'
    idx=text.find(marker)
    if idx>=0:
        pos=text.find('\n',idx)+1
        text=text[:pos]+'\n- [x] `js/core/migration.js`：schema migration 已抽離並有 characterization tests\n- [x] `js/core/storage.js`：load/recovery/snapshot/save 已抽離並有 characterization tests\n\n'+text[pos:]
        doc.write_text(text,encoding='utf-8')

print('Phase 3b storage refactor prepared')
