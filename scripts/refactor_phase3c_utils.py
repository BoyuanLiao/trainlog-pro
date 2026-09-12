from pathlib import Path

UTILS = r'''/**
 * TrainLog Pro shared pure utilities.
 * No DOM, LocalStorage, or mutable app-state access.
 */
(() => {
  'use strict';
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,n(v)));
  const isoToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const parseDate=s=>{const [y,m,d]=(s||'').split('-').map(Number);return new Date(y,m-1,d)};
  const isoDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const daysBetween=(a,b)=>Math.round((parseDate(b)-parseDate(a))/86400000);
  const monthKey=()=>isoToday().slice(0,7);
  const fmtDate=s=>s?`${Number(s.slice(5,7))}/${Number(s.slice(8,10))}`:'';
  const LB_PER_KG=2.2046226218;
  const normalizeWeightUnit=u=>u==='lb'?'lb':'kg';
  const toKg=(v,unit='kg')=>normalizeWeightUnit(unit)==='lb'?n(v)/LB_PER_KG:n(v);
  const fromKg=(v,unit='kg')=>normalizeWeightUnit(unit)==='lb'?n(v)*LB_PER_KG:n(v);
  function cleanWeightNumber(v){
    const x=Math.round(n(v)*10)/10;
    return Number.isInteger(x)?String(x):x.toFixed(1);
  }
  function est1rm(weight,reps){return reps>0?weight*(1+reps/30):0}

  window.TrainLogUtils=Object.freeze({
    n,clamp,isoToday,parseDate,isoDate,daysBetween,monthKey,fmtDate,
    LB_PER_KG,normalizeWeightUnit,toKg,fromKg,cleanWeightNumber,est1rm
  });
})();
'''

root=Path('.')
(root/'js/core/utils.js').write_text(UTILS,encoding='utf-8')

app_path=root/'js/app.js'
app=app_path.read_text(encoding='utf-8')
old="""const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,n(v)));
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[m]));
const isoToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const parseDate=s=>{const [y,m,d]=(s||'').split('-').map(Number);return new Date(y,m-1,d)};
const isoDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const daysBetween=(a,b)=>Math.round((parseDate(b)-parseDate(a))/86400000);
const monthKey=()=>isoToday().slice(0,7);
const fmtDate=s=>s?`${Number(s.slice(5,7))}/${Number(s.slice(8,10))}`:'';
const LB_PER_KG=2.2046226218;
const normalizeWeightUnit=u=>u==='lb'?'lb':'kg';
const toKg=(v,unit='kg')=>normalizeWeightUnit(unit)==='lb'?n(v)/LB_PER_KG:n(v);
const fromKg=(v,unit='kg')=>normalizeWeightUnit(unit)==='lb'?n(v)*LB_PER_KG:n(v);
function cleanWeightNumber(v){
 const x=Math.round(n(v)*10)/10;
 return Number.isInteger(x)?String(x):x.toFixed(1)
}
"""
new="""const {n,clamp,isoToday,parseDate,isoDate,daysBetween,monthKey,fmtDate,LB_PER_KG,normalizeWeightUnit,toKg,fromKg,cleanWeightNumber,est1rm}=window.TrainLogUtils;
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[m]));
"""
if old not in app: raise RuntimeError('top utility block not found')
app=app.replace(old,new,1)
est="function est1rm(weight,reps){return reps>0?weight*(1+reps/30):0}\n"
if est not in app: raise RuntimeError('est1rm not found')
app=app.replace(est,'',1)
app_path.write_text(app,encoding='utf-8')

index_path=root/'index.html'
index=index_path.read_text(encoding='utf-8')
if 'js/core/utils.js' not in index:
    anchor='<script src="js/core/migration.js?v=2.10.0"></script>'
    if anchor not in index: raise RuntimeError('migration script tag not found')
    index=index.replace(anchor,'<script src="js/core/utils.js?v=2.10.0"></script>\n'+anchor,1)
    index_path.write_text(index,encoding='utf-8')

test_path=root/'tests/core/utils-characterization.test.js'
test=test_path.read_text(encoding='utf-8')
start=test.index("const app=fs.readFileSync('js/app.js','utf8');")
end=test.index("const get=name=>vm.runInContext(name,ctx);")
replacement="""const source=fs.readFileSync('js/core/utils.js','utf8');
const ctx=vm.createContext({Date,Math,Number,String,console,window:{}});
vm.runInContext(source,ctx);
const get=name=>vm.runInContext('window.TrainLogUtils.'+name,ctx);
"""
test=test[:start]+replacement+test[end+len("const get=name=>vm.runInContext(name,ctx);\n"):]
test_path.write_text(test,encoding='utf-8')

core_readme=root/'js/core/README.md'
text=core_readme.read_text(encoding='utf-8')
text=text.replace('`utils.js`：日期、數值、字串、DOM 無關共用函式','`utils.js`：日期、數值、重量單位與 e1RM 等 DOM 無關純函式（Phase 3c 已抽離）')
text=text.replace('狀態：**重構骨架，程式目前尚未從 `app.js` 搬入。**','狀態：**Phase 3 進行中；migration、storage、utils 已抽離。**')
if 'tests/core/utils-characterization.test.js' not in text:
    text += '\n## Phase 3c 測試\n- `tests/core/utils-characterization.test.js`：鎖定數值、日期、kg/lb、重量格式與 e1RM 行為。\n- 重構流程固定為：實作前測試 → 搬移 → 同一組測試再次驗證。\n'
core_readme.write_text(text,encoding='utf-8')

refactor=root/'docs/REFACTOR.md'
text=refactor.read_text(encoding='utf-8')
if 'Phase 3c' not in text:
    text += '\n### Phase 3c — Core utils（已完成）\n- `js/core/utils.js`：共用純函式。\n- `tests/core/utils-characterization.test.js`：重構前後 characterization tests。\n'
refactor.write_text(text,encoding='utf-8')
