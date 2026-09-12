from pathlib import Path
import re

core = r'''/**
 * TrainLog Pro schema migration core.
 * No DOM / LocalStorage access. App-specific primitives are injected.
 */
(() => {
  'use strict';

  function create(options = {}) {
    const CURRENT_SCHEMA = options.currentSchema;
    const SYSTEM_EXERCISES = options.systemExercises || [];
    const uid = options.uid;
    const isoToday = options.today;
    const toKg = options.toKg;
    const normalizeWeightUnit = options.normalizeWeightUnit;
    const n = options.num;

    if (!Number.isFinite(Number(CURRENT_SCHEMA))) throw new Error('currentSchema is required');
    if (typeof uid !== 'function' || typeof isoToday !== 'function' || typeof toKg !== 'function' || typeof normalizeWeightUnit !== 'function' || typeof n !== 'function') {
      throw new Error('TrainLogMigration.create missing required dependency');
    }

    function defaultLibrary() { return SYSTEM_EXERCISES.map(x => JSON.parse(JSON.stringify(x))); }
    function mergeSystemExercises(existing) {
      const map = new Map(SYSTEM_EXERCISES.map(x => [x.id, JSON.parse(JSON.stringify(x))]));
      (existing || []).forEach(x => {
        if (map.has(x.id)) {
          const s = map.get(x.id);
          map.set(x.id, {...s,...x,system:true,nameEn:x.nameEn||s.nameEn,pattern:x.pattern||s.pattern,equipmentId:x.equipmentId||s.equipmentId,descZh:x.descZh||s.descZh,descEn:x.descEn||s.descEn,youtubeZh:x.youtubeZh||s.youtubeZh,youtubeEn:x.youtubeEn||s.youtubeEn,alternatives:(x.alternatives&&x.alternatives.length)?x.alternatives:s.alternatives});
        } else map.set(x.id,{...x,system:false});
      });
      return [...map.values()];
    }
    function defaultTemplates() { return []; }
    function freshData() { return {
      schemaVersion:CURRENT_SCHEMA,
      settings:{unit:'kg',intensity:'RIR',defaultRest:90,weeklySessions:3,weeklyCardio:60,weekStart:1,includeWarmup:false,show1RM:true,uiLevel:'standard',trainingGoal:'general',sessionMinutes:60,experienceLevel:'beginner',equipmentPreference:'machine',blockWeeks:6,priorityMuscles:[],availableWeekdays:[],allowConsecutiveDays:false,preferredGymId:'',preferencesSetupCompleted:false,tutorialCompleted:false,workoutTutorialCompleted:false,pageTutorials:{home:false,trainLanding:false,workout:false,records:false,analysis:false,settings:false},trainingNotes:true,trainingAutoLoad:true,trainingIntervalTimer:true,restTimerPosition:'top',restTimerSound:true,trainingDrawerTabTop:8,analysisRange:'30',analysisTab:'overview',weeklyMuscleGoals:{胸:6,背:6,腿:8,肩膀:4,二頭:4,三頭:4,腹部:4}},
      gyms:[],equipment:[],exerciseLibrary:defaultLibrary(),templates:defaultTemplates(),workouts:[],activeWorkout:null,currentPlan:null,todayAdjustment:null,bodyStatus:[],trash:[],snapshots:[],strengthGoals:[]
    }; }
    function guessType(e){if(e.durationMinutes||e.distanceKm)return'cardio';if(e.name&&/平板|plank|wall sit|dead hang/i.test(e.name))return'duration';return'weight_reps'}
    function findOrCreateExercise(name,muscle,type,library){
      const nm=name||'未命名動作',lib=library||[];let ex=lib.find(x=>x.name===nm||(x.aliases||[]).includes(nm));if(ex)return ex.id;
      const id=uid('legacy');lib.push({id,name:nm,aliases:[],muscle:muscle||'其他',type:type||'weight_reps',increment:2.5,targetSets:3,repMin:8,repMax:12,intMin:2,intMax:3,rest:90,notes:'從舊版資料自動建立',equipmentId:'',gymId:'',alternatives:[]});return id;
    }
    function migrate(raw){
      if(!raw||typeof raw!=='object')return freshData();
      if(Array.isArray(raw)){raw={schemaVersion:1,workouts:raw}}
      if(raw.records && !raw.workouts)raw.workouts=raw.records;
      const legacyUnit=normalizeWeightUnit(raw.settings?.unit||'kg');
      const needsWeightNormalization=n(raw.schemaVersion)<12&&legacyUnit==='lb';
      const migrateWeight=v=>needsWeightNormalization?toKg(v,'lb'):n(v);
      const out=freshData();
      out.settings={...out.settings,...(raw.settings||{})};
      if(raw.settings?.tutorialCompleted==null && n(raw.schemaVersion)>0)out.settings.tutorialCompleted=true;
      if(raw.settings?.workoutTutorialCompleted==null && n(raw.schemaVersion)>0)out.settings.workoutTutorialCompleted=true;
      if(raw.settings?.pageTutorials==null && n(raw.schemaVersion)>0)out.settings.pageTutorials={home:true,trainLanding:true,workout:true,records:true,analysis:true,settings:true};
      out.settings.pageTutorials={home:false,trainLanding:false,workout:false,records:false,analysis:false,settings:false,...(out.settings.pageTutorials||{})};
      out.gyms=Array.isArray(raw.gyms)?raw.gyms:[];
      out.equipment=Array.isArray(raw.equipment)?raw.equipment:[];
      out.templates=Array.isArray(raw.templates)&&raw.templates.length?raw.templates:out.templates;
      out.exerciseLibrary=mergeSystemExercises(Array.isArray(raw.exerciseLibrary)?raw.exerciseLibrary:[]);
      out.workouts=(raw.workouts||[]).map(w=>({
        id:w.id||uid('w'),date:w.date||isoToday(),name:w.name||'未命名訓練',duration:n(w.duration),status:w.status||'completed',startedAt:w.startedAt||'',endedAt:w.endedAt||'',
        notes:w.notes||'',programDayMeta:w.programDayMeta||null,coachRecommendation:w.coachRecommendation||null,gymId:w.gymId||'',gymNameSnapshot:w.gymNameSnapshot||'',deload:!!w.deload,preStatus:w.preStatus||{},pain:w.pain||'',bodyStatusSnapshot:w.bodyStatusSnapshot||null,
        exercises:(w.exercises||[]).map(e=>({exerciseId:e.exerciseId||findOrCreateExercise(e.name,e.muscle,e.type,out.exerciseLibrary),nameSnapshot:e.nameSnapshot||e.name||'動作',muscle:e.muscle||'其他',type:e.type||guessType(e),equipmentId:e.equipmentId||'',notes:e.notes||'',inputUnit:normalizeWeightUnit(e.inputUnit||legacyUnit),sets:(e.sets||[]).map(s=>({id:s.id||uid('s'),kind:s.kind||'working',weight:migrateWeight(s.weight),reps:n(s.reps),rir:s.rir===''?'':n(s.rir),rpe:s.rpe===''?'':n(s.rpe),seconds:n(s.seconds),leftWeight:migrateWeight(s.leftWeight),rightWeight:migrateWeight(s.rightWeight),leftReps:n(s.leftReps),rightReps:n(s.rightReps),completed:s.completed!==false})),cardio:e.cardio||{minutes:n(e.durationMinutes),distanceKm:n(e.distanceKm),speed:n(e.speed),incline:n(e.incline),pace:e.pace||''}}))
      }));
      out.workouts.forEach(w=>{if(!w.gymNameSnapshot&&w.gymId){const g=out.gyms.find(x=>x.id===w.gymId);if(g)w.gymNameSnapshot=g.name||''}});
      out.activeWorkout=raw.activeWorkout||null;
      if(out.activeWorkout){(out.activeWorkout.exercises||[]).forEach(e=>{e.inputUnit=normalizeWeightUnit(e.inputUnit||legacyUnit);if(needsWeightNormalization)(e.sets||[]).forEach(s=>{s.weight=toKg(s.weight,'lb');s.leftWeight=toKg(s.leftWeight,'lb');s.rightWeight=toKg(s.rightWeight,'lb')})})}
      out.currentPlan=raw.currentPlan&&typeof raw.currentPlan==='object'?raw.currentPlan:null;
      out.todayAdjustment=raw.todayAdjustment&&typeof raw.todayAdjustment==='object'?raw.todayAdjustment:null;
      if(out.activeWorkout){out.activeWorkout.gymNameSnapshot=out.activeWorkout.gymNameSnapshot||'';if(!out.activeWorkout.gymNameSnapshot&&out.activeWorkout.gymId){const g=out.gyms.find(x=>x.id===out.activeWorkout.gymId);if(g)out.activeWorkout.gymNameSnapshot=g.name||''}}
      out.bodyStatus=Array.isArray(raw.bodyStatus)?raw.bodyStatus.map(s=>({date:s.date||isoToday(),entries:Array.isArray(s.entries)?s.entries:[],note:s.note||'',updatedAt:s.updatedAt||''})):[];
      out.trash=Array.isArray(raw.trash)?raw.trash:[];out.snapshots=Array.isArray(raw.snapshots)?raw.snapshots:[];
      out.strengthGoals=Array.isArray(raw.strengthGoals)?raw.strengthGoals.map(g=>({...g,weight:migrateWeight(g.weight)})):[];
      out.schemaVersion=CURRENT_SCHEMA;return out;
    }
    return Object.freeze({defaultLibrary,mergeSystemExercises,defaultTemplates,freshData,migrate,guessType,findOrCreateExercise});
  }
  window.TrainLogMigration=Object.freeze({create});
})();
'''
Path('js/core/migration.js').write_text(core, encoding='utf-8')

app_path=Path('js/app.js')
app=app_path.read_text(encoding='utf-8')

def function_span(source,name):
    m=re.search(r'(?m)^\s*function\s+'+re.escape(name)+r'\s*\(',source)
    if not m: raise RuntimeError(f'missing {name}')
    brace=source.find('{',m.end()); depth=0; state='normal'; escaped=False; i=brace
    while i<len(source):
        ch=source[i]; nxt=source[i+1] if i+1<len(source) else ''
        if state=='line':
            if ch=='\n': state='normal'
            i+=1; continue
        if state=='block':
            if ch=='*' and nxt=='/': state='normal'; i+=2
            else: i+=1
            continue
        if state in ('single','double','template'):
            if escaped: escaped=False; i+=1; continue
            if ch=='\\': escaped=True; i+=1; continue
            if (state=='single' and ch=="'") or (state=='double' and ch=='"') or (state=='template' and ch=='`'): state='normal'
            i+=1; continue
        if ch=='/' and nxt=='/': state='line'; i+=2; continue
        if ch=='/' and nxt=='*': state='block'; i+=2; continue
        if ch=="'": state='single'; i+=1; continue
        if ch=='"': state='double'; i+=1; continue
        if ch=='`': state='template'; i+=1; continue
        if ch=='{': depth+=1
        elif ch=='}':
            depth-=1
            if depth==0:
                end=i+1
                while end<len(source) and source[end] in ' \t\r': end+=1
                if end<len(source) and source[end]=='\n': end+=1
                return m.start(),end
        i+=1
    raise RuntimeError(f'unclosed {name}')

names=['defaultLibrary','mergeSystemExercises','defaultTemplates','freshData','migrate','guessType','findOrCreateExercise']
spans=[(*function_span(app,nm),nm) for nm in names]
for start,end,nm in sorted(spans, reverse=True): app=app[:start]+app[end:]
anchor="document.addEventListener('click',e=>{const b=e.target.closest?.('[data-info]');if(b){e.preventDefault();e.stopPropagation();openGlossary(b.dataset.info)}});\n"
if anchor not in app: raise RuntimeError('migration insertion anchor missing')
bridge="""
const migrationCore=window.TrainLogMigration.create({currentSchema:CURRENT_SCHEMA,systemExercises:SYSTEM_EXERCISES,uid,today:isoToday,toKg,normalizeWeightUnit,num:n});
function defaultLibrary(){return migrationCore.defaultLibrary()}
function mergeSystemExercises(existing){return migrationCore.mergeSystemExercises(existing)}
function defaultTemplates(){return migrationCore.defaultTemplates()}
function freshData(){return migrationCore.freshData()}
function migrate(raw){return migrationCore.migrate(raw)}
function guessType(e){return migrationCore.guessType(e)}
function findOrCreateExercise(name,muscle,type,library){return migrationCore.findOrCreateExercise(name,muscle,type,library)}
"""
app=app.replace(anchor,anchor+'\n'+bridge,1)
app_path.write_text(app,encoding='utf-8')

index_path=Path('index.html'); index=index_path.read_text(encoding='utf-8')
if 'js/core/migration.js' not in index:
    app_tag=re.search(r'(?P<indent>^[ \t]*)<script[^>]*src=["\']js/app\.js(?P<query>\?[^"\']*)?["\'][^>]*></script>',index,re.M)
    if not app_tag: raise RuntimeError('app.js tag missing')
    indent=app_tag.group('indent'); query=app_tag.group('query') or ''
    index=index[:app_tag.start()]+f'{indent}<script src="js/core/migration.js{query}"></script>\n'+index[app_tag.start():]
    index_path.write_text(index,encoding='utf-8')

test_path=Path('tests/core/migration-characterization.test.js')
test=test_path.read_text(encoding='utf-8')
start=test.index("const app = fs.readFileSync('js/app.js', 'utf8');")
end=test.index('function approx(actual, expected, eps=1e-6) {')
replacement="""const exercises = fs.readFileSync('js/data/exercises.js', 'utf8');
const migrationModule = fs.readFileSync('js/core/migration.js', 'utf8');
const ctx = vm.createContext({ console, structuredClone, Date, Math, JSON, Map, Set, window:{} });
vm.runInContext(exercises, ctx);
vm.runInContext(migrationModule, ctx);
vm.runInContext(`
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const normalizeWeightUnit=u=>u==='lb'?'lb':'kg';
const LB_PER_KG=2.2046226218;
const toKg=(v,unit='kg')=>normalizeWeightUnit(unit)==='lb'?n(v)/LB_PER_KG:n(v);
let uidSeq=0; const uid=(p='id')=>p+'_test_'+(++uidSeq);
const migrationCore=window.TrainLogMigration.create({currentSchema:18,systemExercises:SYSTEM_EXERCISES,uid,today:()=> '2026-09-13',toKg,normalizeWeightUnit,num:n});
`,ctx);
const migrate=vm.runInContext('migrationCore.migrate',ctx);
const freshData=vm.runInContext('migrationCore.freshData',ctx);
const systemCount=vm.runInContext('SYSTEM_EXERCISES.length',ctx);
const chestId=vm.runInContext("SYSTEM_EXERCISES.find(x=>x.id==='ex_chestpress').id",ctx);

"""
test=test[:start]+replacement+test[end:]
test_path.write_text(test,encoding='utf-8')

Path('js/core/README.md').write_text('''# `js/core/`\n\n跨功能核心能力；不得依賴頁面 render。\n\n## `migration.js`\n狀態：**已實作（Phase 3a）**。\n\n提供 `window.TrainLogMigration.create(options)`，由 `app.js` 注入 schema、system exercises、uid、日期與重量轉換等 primitive。負責 fresh defaults、system exercise merge、legacy records/workouts migration、schema < 12 lb→kg normalization、tutorial defaults、active workout / strength goals 與 legacy unknown exercise migration。\n\n### 安全規則\n- 不讀 DOM / LocalStorage / mutable `data`。\n- 修改 migration 前後都跑 `node tests/core/migration-characterization.test.js`。\n- schema 行為變更必須同步 fixture。\n\n## 尚未拆出\n- `storage.js`：`loadData / save / snapshot / recovery` 仍在 `app.js`。\n- `utils.js`：日期、數值等共用 helper 仍待後續整理。\n''',encoding='utf-8')
