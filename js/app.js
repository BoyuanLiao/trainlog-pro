(()=>{'use strict';
const APP_KEY='trainlogProData';
const APP_VERSION='2.10.1';
const CURRENT_SCHEMA=18;
const MUSCLES=['胸','背','腿','肩膀','二頭','三頭','腹部','有氧','其他'];
const TYPES=[
  ['weight_reps','重量 × 次數'],['duration','計時'],['cardio','有氧'],['bodyweight','體重型'],['unilateral','單側']
];
const KINDS=[['warmup','暖身'],['working','正式'],['drop','Drop'],['failure','Failure'],['backoff','Back-off']];
const PPL={胸:'Push',肩膀:'Push',三頭:'Push',背:'Pull',二頭:'Pull',腿:'Legs',腹部:'Core',有氧:'Cardio',其他:'Other'};
const PATTERN_INFO={horizontal_push:'horizontal_push',horizontal_pull:'horizontal_pull',vertical_push:'vertical_push',vertical_pull:'vertical_pull',knee_dominant:'knee_dominant',hip_extension:'hip_extension',knee_flexion:'knee_flexion',knee_extension:'knee_extension',shoulder_abduction:'shoulder_abduction',elbow_flexion:'elbow_flexion',elbow_extension:'elbow_extension',core_flexion:'core_flexion',rotation:'rotation'};

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=(p='id')=>p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,n(v)));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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
function fmtWeightNumber(weightKg,unit=(data?.settings?.unit||'kg')){return cleanWeightNumber(fromKg(weightKg,unit))}
function fmtWeight(weightKg,unit=(data?.settings?.unit||'kg')){return `${fmtWeightNumber(weightKg,unit)} ${normalizeWeightUnit(unit)}`}
function exerciseInputUnit(e){return normalizeWeightUnit(e?.inputUnit||data?.settings?.unit||'kg')}
function machineIncrementForUnit(ex,unit){
 const base=Math.max(.1,n(ex?.increment)||2.5);
 if(unit==='lb')return Math.max(5,Math.round(fromKg(base,'lb')/5)*5);
 return Math.round(base*10)/10
}
const fmtKg=x=>{
 const unit=normalizeWeightUnit(data?.settings?.unit||'kg');
 const shown=fromKg(x,unit);
 return Math.round(shown).toLocaleString('zh-TW')+' '+unit
};
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function openModal(title,html,onReady){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modalWrap').classList.add('show');document.body.style.overflow='hidden';if(onReady)onReady()}
function closeModal(){$('#modalWrap').classList.remove('show');document.body.style.overflow=''}
$('#modalClose').onclick=closeModal;$('#modalWrap').addEventListener('click',e=>{if(e.target===$('#modalWrap'))closeModal()});
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-info]');if(b){e.preventDefault();e.stopPropagation();openGlossary(b.dataset.info)}});

function defaultLibrary(){ return SYSTEM_EXERCISES.map(x=>JSON.parse(JSON.stringify(x))); }
function mergeSystemExercises(existing){
 const map=new Map(SYSTEM_EXERCISES.map(x=>[x.id,JSON.parse(JSON.stringify(x))]));
 (existing||[]).forEach(x=>{
   if(map.has(x.id)){const s=map.get(x.id);map.set(x.id,{...s,...x,system:true,nameEn:x.nameEn||s.nameEn,pattern:x.pattern||s.pattern,equipmentId:x.equipmentId||s.equipmentId,descZh:x.descZh||s.descZh,descEn:x.descEn||s.descEn,youtubeZh:x.youtubeZh||s.youtubeZh,youtubeEn:x.youtubeEn||s.youtubeEn,alternatives:(x.alternatives&&x.alternatives.length)?x.alternatives:s.alternatives});}
   else map.set(x.id,{...x,system:false});
 });
 return [...map.values()];
}
function defaultTemplates(){ return []; }
function freshData(){return{
 schemaVersion:CURRENT_SCHEMA,
 settings:{unit:'kg',intensity:'RIR',defaultRest:90,weeklySessions:3,weeklyCardio:60,weekStart:1,includeWarmup:false,show1RM:true,uiLevel:'standard',trainingGoal:'general',sessionMinutes:60,experienceLevel:'beginner',equipmentPreference:'machine',blockWeeks:6,priorityMuscles:[],availableWeekdays:[],allowConsecutiveDays:false,preferredGymId:'',preferencesSetupCompleted:false,tutorialCompleted:false,workoutTutorialCompleted:false,pageTutorials:{home:false,trainLanding:false,workout:false,records:false,analysis:false,settings:false},trainingNotes:true,trainingAutoLoad:true,trainingIntervalTimer:true,restTimerPosition:'top',restTimerSound:true,trainingDrawerTabTop:8,analysisRange:'30',analysisTab:'overview',weeklyMuscleGoals:{胸:6,背:6,腿:8,肩膀:4,二頭:4,三頭:4,腹部:4}},
 gyms:[],equipment:[],exerciseLibrary:defaultLibrary(),templates:defaultTemplates(),workouts:[],activeWorkout:null,currentPlan:null,todayAdjustment:null,bodyStatus:[],trash:[],snapshots:[],strengthGoals:[]
}}
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
   exercises:(w.exercises||[]).map(e=>({
     exerciseId:e.exerciseId||findOrCreateExercise(e.name,e.muscle,e.type,out.exerciseLibrary),
     nameSnapshot:e.nameSnapshot||e.name||'動作',muscle:e.muscle||'其他',type:e.type||guessType(e),
     equipmentId:e.equipmentId||'',notes:e.notes||'',inputUnit:normalizeWeightUnit(e.inputUnit||legacyUnit),
     sets:(e.sets||[]).map(s=>({id:s.id||uid('s'),kind:s.kind||'working',weight:migrateWeight(s.weight),reps:n(s.reps),rir:s.rir===''?'':n(s.rir),rpe:s.rpe===''?'':n(s.rpe),seconds:n(s.seconds),leftWeight:migrateWeight(s.leftWeight),rightWeight:migrateWeight(s.rightWeight),leftReps:n(s.leftReps),rightReps:n(s.rightReps),completed:s.completed!==false})),
     cardio:e.cardio||{minutes:n(e.durationMinutes),distanceKm:n(e.distanceKm),speed:n(e.speed),incline:n(e.incline),pace:e.pace||''}
   }))
 }));
 out.workouts.forEach(w=>{if(!w.gymNameSnapshot&&w.gymId){const g=out.gyms.find(x=>x.id===w.gymId);if(g)w.gymNameSnapshot=g.name||''}});
 out.activeWorkout=raw.activeWorkout||null;
 if(out.activeWorkout){
   (out.activeWorkout.exercises||[]).forEach(e=>{
     e.inputUnit=normalizeWeightUnit(e.inputUnit||legacyUnit);
     if(needsWeightNormalization)(e.sets||[]).forEach(s=>{s.weight=toKg(s.weight,'lb');s.leftWeight=toKg(s.leftWeight,'lb');s.rightWeight=toKg(s.rightWeight,'lb')})
   })
 }
 out.currentPlan=raw.currentPlan&&typeof raw.currentPlan==='object'?raw.currentPlan:null;
 out.todayAdjustment=raw.todayAdjustment&&typeof raw.todayAdjustment==='object'?raw.todayAdjustment:null;
 if(out.activeWorkout){
   out.activeWorkout.gymNameSnapshot=out.activeWorkout.gymNameSnapshot||'';
   if(!out.activeWorkout.gymNameSnapshot&&out.activeWorkout.gymId){const g=out.gyms.find(x=>x.id===out.activeWorkout.gymId);if(g)out.activeWorkout.gymNameSnapshot=g.name||''}
 }
 out.bodyStatus=Array.isArray(raw.bodyStatus)?raw.bodyStatus.map(s=>({date:s.date||isoToday(),entries:Array.isArray(s.entries)?s.entries:[],note:s.note||'',updatedAt:s.updatedAt||''})):[];
 out.trash=Array.isArray(raw.trash)?raw.trash:[];out.snapshots=Array.isArray(raw.snapshots)?raw.snapshots:[];
 out.strengthGoals=Array.isArray(raw.strengthGoals)?raw.strengthGoals.map(g=>({...g,weight:migrateWeight(g.weight)})):[];
 out.schemaVersion=CURRENT_SCHEMA;return out;
}
function guessType(e){if(e.durationMinutes||e.distanceKm)return'cardio';if(e.name&&/平板|plank|wall sit|dead hang/i.test(e.name))return'duration';return'weight_reps'}
function findOrCreateExercise(name,muscle,type,library){
 const nm=name||'未命名動作',lib=library||[];let ex=lib.find(x=>x.name===nm||(x.aliases||[]).includes(nm));if(ex)return ex.id;
 const id=uid('legacy');lib.push({id,name:nm,aliases:[],muscle:muscle||'其他',type:type||'weight_reps',increment:2.5,targetSets:3,repMin:8,repMax:12,intMin:2,intMax:3,rest:90,notes:'從舊版資料自動建立',equipmentId:'',gymId:'',alternatives:[]});return id;
}
let recoveryIssue=null;
function loadData(){
 const cur=localStorage.getItem(APP_KEY);
 if(cur){
  try{return migrate(JSON.parse(cur))}
  catch(err){
   try{
    const recoveryKey=APP_KEY+'_recovery_latest';
    localStorage.setItem(recoveryKey,cur);
    recoveryIssue={key:recoveryKey,raw:cur,at:new Date().toISOString(),message:String(err?.message||err||'JSON parse error')};
   }catch{recoveryIssue={key:'',raw:cur,at:new Date().toISOString(),message:String(err?.message||err||'JSON parse error')}}
   return freshData()
  }
 }
 try{
  const legacy=localStorage.getItem('fitnessRecordsV1');
  if(legacy){const d=migrate({schemaVersion:1,records:JSON.parse(legacy)});localStorage.setItem(APP_KEY,JSON.stringify(d));return d}
 }catch(err){
  try{localStorage.setItem('fitnessRecordsV1_recovery_latest',localStorage.getItem('fitnessRecordsV1')||'')}catch{}
 }
 return freshData()
}
let data=loadData();
function registerTrainLogServiceWorker(){
 navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`).catch(()=>{});
}
if('serviceWorker' in navigator)window.addEventListener('load',registerTrainLogServiceWorker,{once:true});
function renderRecoveryBanner(){
 const box=document.getElementById('dataRecoveryBanner');if(!box||!recoveryIssue)return;
 box.innerHTML=`<div class="card warnbox"><b>⚠ 偵測到本機資料異常</b><div class="small" style="margin-top:6px;line-height:1.55">原始 LocalStorage 內容已先保留為救援副本，App 暫時以空白資料啟動。建議先下載原始資料，再進行匯入或其他操作。</div><div class="actions" style="margin-top:10px"><button class="btn small warn" id="downloadRecoveryData">下載原始救援資料</button><button class="btn small ghost" id="dismissRecoveryData">先隱藏</button></div></div>`;
 const dl=document.getElementById('downloadRecoveryData');if(dl)dl.onclick=()=>download(`trainlog-pro-recovery-${isoToday()}.json`,recoveryIssue.raw,'application/json');
 const dismiss=document.getElementById('dismissRecoveryData');if(dismiss)dismiss.onclick=()=>{box.innerHTML=''};
}
setTimeout(renderRecoveryBanner,0);

function snapshot(reason){
 const copy=JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(data).filter(([key])=>key!=='snapshots'))));
 const snaps=(data.snapshots||[]).filter(s=>s&&s.payload);
 snaps.unshift({id:uid('snap'),at:new Date().toISOString(),reason,payload:copy});
 data.snapshots=snaps.slice(0,5);
}
function save(reason='',takeSnapshot=false){if(takeSnapshot)snapshot(reason||'自動快照');localStorage.setItem(APP_KEY,JSON.stringify(data));renderAll()}
function workoutVolume(w){let sum=0;(w.exercises||[]).forEach(e=>{if(!['weight_reps','bodyweight','unilateral'].includes(e.type))return;(e.sets||[]).forEach(s=>{if(!s.completed)return;if(!data.settings.includeWarmup&&s.kind==='warmup')return;if(e.type==='unilateral')sum+=(n(s.leftWeight)*n(s.leftReps)+n(s.rightWeight)*n(s.rightReps));else sum+=n(s.weight)*n(s.reps)})});return sum}
function effectiveSets(w,muscle){let c=0;(w.exercises||[]).forEach(e=>{if(muscle&&e.muscle!==muscle)return;(e.sets||[]).forEach(s=>{if(s.completed&&s.kind!=='warmup')c++})});return c}
function cardioMinutes(w){let m=0;(w.exercises||[]).forEach(e=>{if(e.type==='cardio')m+=n(e.cardio?.minutes)});return m}
function durationSeconds(w,muscle){let s=0;(w.exercises||[]).forEach(e=>{if(e.type==='duration'&&(!muscle||e.muscle===muscle))(e.sets||[]).forEach(x=>{if(x.completed)s+=n(x.seconds)})});return s}
function est1rm(weight,reps){return reps>0?weight*(1+reps/30):0}
function bestSetForExercise(exId,workouts=data.workouts){
 let best=null;workouts.forEach(w=>(w.exercises||[]).filter(e=>e.exerciseId===exId).forEach(e=>(e.sets||[]).forEach(s=>{
   if(!s.completed||e.type==='duration'||e.type==='cardio')return;
   const weight=e.type==='unilateral'?Math.max(n(s.leftWeight),n(s.rightWeight)):n(s.weight);
   const reps=e.type==='unilateral'?Math.max(n(s.leftReps),n(s.rightReps)):n(s.reps);const score=est1rm(weight,reps);
   if(!best||score>best.score)best={weight,reps,score,date:w.date,kind:s.kind}
 })));return best
}
function getExercise(id){return data.exerciseLibrary.find(e=>e.id===id)}
function normGymName(name){return String(name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('zh-TW')}
function gymByName(name){const key=normGymName(name);return key?data.gyms.find(g=>normGymName(g.name)===key):null}
function ensureGymByName(name){
 const clean=String(name||'').trim().replace(/\s+/g,' ');if(!clean)return null;
 const old=gymByName(clean);if(old)return old;
 const g={id:uid('gym'),name:clean,createdFrom:'workout'};data.gyms.push(g);return g
}
function workoutGymName(w){
 if(!w)return'';
 return w.gymNameSnapshot||data.gyms.find(g=>g.id===w.gymId)?.name||''
}
function equipmentNameById(id){
 if(!id)return'';
 const sys=SYSTEM_EQUIPMENT.find(x=>x.id===id);if(sys)return sys.nameZh;
 const mine=data.equipment.find(x=>x.id===id);return mine?.name||''
}
function gymUsageInfo(g){
 const key=normGymName(g?.name);
 const workouts=data.workouts.filter(w=>w.gymId===g.id||(key&&normGymName(workoutGymName(w))===key));
 const equipment=new Map();
 workouts.forEach(w=>(w.exercises||[]).forEach(e=>{
   const lib=getExercise(e.exerciseId);
   const eqId=e.equipmentId||lib?.equipmentId||'';
   const name=equipmentNameById(eqId);
   if(eqId&&name&&!equipment.has(eqId))equipment.set(eqId,{id:eqId,name});
 }));
 const dates=workouts.map(w=>w.date).filter(Boolean).sort();
 return{workouts,equipment:[...equipment.values()],lastDate:dates.at(-1)||''}
}
function syncGymsFromHistory(showToast=true){
 let added=0;
 data.workouts.forEach(w=>{
   const name=String(w.gymNameSnapshot||'').trim();if(!name)return;
   let g=gymByName(name);
   if(!g){g={id:uid('gym'),name,createdFrom:'history'};data.gyms.push(g);added++}
   if(!w.gymId)w.gymId=g.id;
 });
 if(showToast)toast(added?`已從訓練紀錄帶入 ${added} 間健身房`:'訓練紀錄中沒有新的健身房');
 return added
}
function showGymUsage(id){
 const g=data.gyms.find(x=>x.id===id);if(!g)return;
 const info=gymUsageInfo(g);
 openModal(g.name,`<div class="card"><div class="grid3"><div class="stat"><b>${info.workouts.length}</b><span>訓練紀錄</span></div><div class="stat"><b>${info.equipment.length}</b><span>辨識器械</span></div><div class="stat"><b>${info.lastDate?fmtDate(info.lastDate):'—'}</b><span>最近使用</span></div></div></div>
 <div class="section">從紀錄辨識到的器械</div>
 <div class="card">${info.equipment.length?`<div class="tagrow">${info.equipment.map(e=>`<span class="tag">${esc(e.name)}</span>`).join('')}</div>`:'<div class="empty">目前沒有可辨識的器械紀錄。</div>'}<div class="gym-auto-note">器械清單是由這間健身房的訓練紀錄自動整理，不會把跑步、平板撐等沒有器械的動作硬加入。</div></div>`)
}
function renderGymSettings(){
 const box=$('#gymList');if(!box)return;
 box.innerHTML=data.gyms.length?data.gyms.map(g=>{
   const info=gymUsageInfo(g),preview=info.equipment.slice(0,6),more=Math.max(0,info.equipment.length-preview.length);
   return `<div class="gym-card">
    <div class="gym-head"><div><div class="gym-name">${esc(g.name)}</div><div class="gym-meta">${info.workouts.length?`${info.workouts.length} 次訓練${info.lastDate?` · 最近 ${fmtDate(info.lastDate)}`:''}`:'尚無訓練紀錄'} · ${info.equipment.length} 種已使用器械</div></div></div>
    ${preview.length?`<div class="gym-equipment">${preview.map(e=>`<span class="tag">${esc(e.name)}</span>`).join('')}${more?`<span class="tag">＋${more}</span>`:''}</div>`:'<div class="gym-auto-note">完成指定這間健身房的訓練後，器械會自動出現在這裡。</div>'}
    <div class="gym-actions"><button class="btn small ghost" data-gym-usage="${g.id}">查看紀錄整理</button><button class="btn small danger" data-delgym="${g.id}">刪除</button></div>
   </div>`
 }).join(''):'<div class="empty">尚未建立健身房。可以直接在訓練時輸入名稱，或從既有訓練紀錄帶入。</div>';
 $$('[data-gym-usage]').forEach(b=>b.onclick=()=>showGymUsage(b.dataset.gymUsage));
 $$('[data-delgym]').forEach(b=>b.onclick=()=>{
   const g=data.gyms.find(x=>x.id===b.dataset.delgym);if(!g)return;
   const info=gymUsageInfo(g);
   if(!confirm(info.workouts.length?`刪除「${g.name}」？歷史訓練仍會保留健身房名稱。`:`刪除「${g.name}」？`))return;
   data.workouts.forEach(w=>{if(w.gymId===g.id){w.gymNameSnapshot=w.gymNameSnapshot||g.name;w.gymId=''}});
   if(data.activeWorkout?.gymId===g.id){data.activeWorkout.gymNameSnapshot=data.activeWorkout.gymNameSnapshot||g.name;data.activeWorkout.gymId=''}
   data.gyms=data.gyms.filter(x=>x.id!==g.id);save('刪除健身房',true)
 })
}
function getLastExerciseRecord(exId,beforeDate='9999-12-31'){
 const ws=[...data.workouts].filter(w=>w.date<beforeDate).sort((a,b)=>b.date.localeCompare(a.date));
 for(const w of ws){const e=(w.exercises||[]).find(x=>x.exerciseId===exId);if(e)return{workout:w,exercise:e}}return null
}
function weekStartDate(date=new Date()){
 const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()),start=n(data.settings.weekStart),day=d.getDay(),diff=(day-start+7)%7;d.setDate(d.getDate()-diff);return d
}
function workoutsThisWeek(){const s=isoDate(weekStartDate());const e=new Date(weekStartDate());e.setDate(e.getDate()+6);const end=isoDate(e);return data.workouts.filter(w=>w.date>=s&&w.date<=end)}
function rollingStart(days){
 const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(Math.max(1,n(days))-1));return isoDate(d)
}
function workoutsLastDays(days){const s=rollingStart(days);return data.workouts.filter(w=>w.date>=s&&w.date<=isoToday())}
function rangeDateLabel(days){
 if(days==='all'){
   if(!data.workouts.length)return'尚無訓練資料';
   const first=[...data.workouts].sort((a,b)=>a.date.localeCompare(b.date))[0]?.date||isoToday();
   return `${fmtDate(first)} – ${fmtDate(isoToday())}`;
 }
 return `${fmtDate(rollingStart(days))} – ${fmtDate(isoToday())}`;
}
function completedWorkingSets(ex){
 return (ex?.sets||[]).filter(s=>s.completed&&s.kind!=='warmup').length
}
const STIMULUS_BY_PATTERN={
 horizontal_push:[['胸',1],['三頭',.5],['肩膀',.5]],
 shoulder_horizontal_adduction:[['胸',1],['肩膀',.25]],
 vertical_push:[['肩膀',1],['三頭',.5]],
 horizontal_pull:[['背',1],['二頭',.5],['肩膀',.25]],
 vertical_pull:[['背',1],['二頭',.5]],
 shoulder_extension:[['背',1],['二頭',.25]],
 shoulder_abduction:[['肩膀',1]],
 elbow_flexion:[['二頭',1]],
 elbow_extension:[['三頭',1]],
 knee_dominant:[['腿',1]],
 knee_extension:[['腿',1]],
 knee_flexion:[['腿',1]],
 hip_extension:[['腿',1]],
 hip_abduction:[['腿',1]],
 hip_adduction:[['腿',1]],
 plantar_flexion:[['腿',1]],
 core_flexion:[['腹部',1]],
 core_stability:[['腹部',1]],
 rotation:[['腹部',1]]
};
function exerciseAnalysisBasis(exRecord){
 const lib=getExercise(exRecord?.exerciseId)||{};
 const eq=SYSTEM_EQUIPMENT.find(x=>x.id===(lib.equipmentId||exRecord?.equipmentId));
 return {lib,eq,pattern:lib.pattern||eq?.pattern||'',primary:lib.muscle||exRecord?.muscle||'其他'}
}
function exerciseStimulusProfile(exRecord){
 if(!exRecord||exRecord.type==='cardio')return[];
 const {lib,pattern,primary}=exerciseAnalysisBasis(exRecord);
 if(Array.isArray(lib.stimulus)&&lib.stimulus.length)return lib.stimulus.map(x=>({muscle:x.muscle,weight:n(x.weight)})).filter(x=>x.muscle&&x.weight>0);
 if(['mobility','scapular_control'].includes(pattern))return[];
 const base=(STIMULUS_BY_PATTERN[pattern]||[]).map(([muscle,weight])=>({muscle,weight}));
 if(!base.length&&primary&&!['有氧','其他'].includes(primary))return[{muscle:primary,weight:1}];
 if(primary&&!['有氧','其他'].includes(primary)&&!base.some(x=>x.muscle===primary))base.unshift({muscle:primary,weight:1});
 return base
}
function stimulusMap(workouts){
 const out={};
 (workouts||[]).forEach(w=>(w.exercises||[]).forEach(e=>{
   const sets=completedWorkingSets(e);if(!sets)return;
   const basis=exerciseAnalysisBasis(e),profile=exerciseStimulusProfile(e);
   profile.forEach(c=>{
     const m=c.muscle;if(!m||m==='有氧'||m==='其他')return;
     if(!out[m])out[m]={direct:0,indirect:0,total:0,sources:{}};
     const direct=c.weight>=.999,amount=sets*c.weight;
     if(direct)out[m].direct+=amount;else out[m].indirect+=amount;
     out[m].total+=amount;
     const key=e.exerciseId||e.nameSnapshot||'unknown';
     if(!out[m].sources[key])out[m].sources[key]={name:e.nameSnapshot||basis.lib.name||'動作',direct:0,indirect:0,total:0,pattern:basis.pattern,equipment:basis.eq?.nameZh||''};
     if(direct)out[m].sources[key].direct+=amount;else out[m].sources[key].indirect+=amount;
     out[m].sources[key].total+=amount;
   })
 }));
 return out
}
function formalSetCount(workouts){return (workouts||[]).reduce((sum,w)=>sum+effectiveSets(w),0)}
function effortStats(workouts){
 const o={high:0,mid:0,low:0,missing:0,total:0};
 (workouts||[]).forEach(w=>(w.exercises||[]).forEach(e=>(e.sets||[]).forEach(s=>{
   if(!s.completed||s.kind==='warmup'||e.type==='cardio')return;o.total++;
   const hasRir=s.rir!==''&&s.rir!=null,hasRpe=s.rpe!==''&&s.rpe!=null;
   if(!hasRir&&!hasRpe){o.missing++;return}
   if(hasRir){const v=n(s.rir);if(v<=1)o.high++;else if(v<=3)o.mid++;else o.low++}
   else{const v=n(s.rpe);if(v>=9)o.high++;else if(v>=7)o.mid++;else o.low++}
 })));
 return o
}
function movementStats(workouts){
 const out={};
 (workouts||[]).forEach(w=>(w.exercises||[]).forEach(e=>{
   const sets=completedWorkingSets(e);if(!sets)return;
   const p=exerciseAnalysisBasis(e).pattern;if(!p||['cardio','mobility','scapular_control'].includes(p))return;
   out[p]=(out[p]||0)+sets
 }));
 return out
}
function consistencyStats(workouts,days){
 if(!workouts.length)return{days:0,avgPerWeek:0,weeks:0,totalWeeks:days==='all'?0:Math.max(1,Math.ceil(n(days)/7)),longestGap:null};
 const uniq=[...new Set(workouts.map(w=>w.date))].sort();
 let spanDays=n(days);
 if(days==='all')spanDays=Math.max(1,daysBetween(uniq[0],isoToday())+1);
 const weekKeys=new Set(workouts.map(w=>{
   const d=parseDate(w.date),s=weekStartDate(d);return isoDate(s)
 }));
 let longest=0;
 const boundaries=[days==='all'?uniq[0]:rollingStart(days),...uniq,isoToday()].sort();
 const uniqueBounds=[...new Set(boundaries)];
 for(let i=1;i<uniqueBounds.length;i++)longest=Math.max(longest,Math.max(0,daysBetween(uniqueBounds[i-1],uniqueBounds[i])-1));
 return{days:uniq.length,avgPerWeek:workouts.length/(spanDays/7),weeks:weekKeys.size,totalWeeks:Math.max(1,Math.ceil(spanDays/7)),longestGap:longest}
}
function fmtStim(v){const x=Math.round(n(v)*100)/100;return Number.isInteger(x)?String(x):x.toFixed(x*10===Math.round(x*10)?1:2).replace(/0+$/,'').replace(/\.$/,'')}
function shiftIso(iso,days){const d=parseDate(iso);d.setDate(d.getDate()+days);return isoDate(d)}
function previousPeriodWorkouts(days){
 if(days==='all')return[];
 const d=Math.max(1,n(days)),curStart=rollingStart(d),prevEnd=shiftIso(curStart,-1),prevStart=shiftIso(prevEnd,-(d-1));
 return data.workouts.filter(w=>w.date>=prevStart&&w.date<=prevEnd)
}
function previousPeriodLabel(days){
 if(days==='all')return'';
 const d=Math.max(1,n(days)),curStart=rollingStart(d),prevEnd=shiftIso(curStart,-1),prevStart=shiftIso(prevEnd,-(d-1));
 return `${fmtDate(prevStart)} – ${fmtDate(prevEnd)}`
}
function comparePct(cur,prev){
 cur=n(cur);prev=n(prev);
 if(prev===0)return cur===0?null:{pct:null,dir:'up',text:'前期 0'};
 const pct=(cur-prev)/Math.abs(prev)*100;
 return{pct,dir:Math.abs(pct)<1?'same':pct>0?'up':'down',text:`${pct>0?'+':''}${Math.round(pct)}%`}
}
function compareBadge(cur,prev){
 const c=comparePct(cur,prev);if(!c)return'';
 const arrow=c.dir==='up'?'↑':c.dir==='down'?'↓':'→';
 return `<span class="compare-badge ${c.dir}">${arrow} ${esc(c.text)}</span>`
}
function analysisConfidence(workouts){
 const formal=formalSetCount(workouts),eff=effortStats(workouts);
 let exTotal=0,recognized=0;
 (workouts||[]).forEach(w=>(w.exercises||[]).forEach(e=>{
   const sets=completedWorkingSets(e);if(!sets||e.type==='cardio')return;
   exTotal+=sets;if(exerciseAnalysisBasis(e).pattern)recognized+=sets
 }));
 const effortRecorded=eff.high+eff.mid+eff.low;
 const effortRate=eff.total?effortRecorded/eff.total:0;
 const patternRate=exTotal?recognized/exTotal:0;
 let level='low',label='低';
 if(workouts.length<2||formal<6){level='insufficient';label='資料不足'}
 else if(workouts.length>=6&&formal>=30&&effortRate>=.6&&patternRate>=.75){level='high';label='高'}
 else if(workouts.length>=3&&formal>=15&&patternRate>=.5){level='medium';label='中'}
 return{level,label,formal,workouts:workouts.length,effortRate,patternRate}
}
function exerciseSessionMetrics(exId){
 const sessions=[];
 [...data.workouts].sort((a,b)=>a.date.localeCompare(b.date)).forEach(w=>{
   const e=(w.exercises||[]).find(x=>x.exerciseId===exId);if(!e)return;
   if(e.type==='cardio'){
     const c=e.cardio||{};
     sessions.push({date:w.date,type:'cardio',minutes:n(c.minutes),distance:n(c.distanceKm),speed:n(c.speed),volume:0,rir:null,rpe:null,label:`${n(c.minutes)} 分${n(c.distanceKm)?` · ${n(c.distanceKm)} km`:''}`});
     return
   }
   const sets=(e.sets||[]).filter(s=>s.completed&&s.kind!=='warmup');
   if(!sets.length)return;
   if(e.type==='duration'){
     const bestSeconds=Math.max(0,...sets.map(s=>n(s.seconds))),totalSeconds=sets.reduce((a,s)=>a+n(s.seconds),0);
     sessions.push({date:w.date,type:'duration',bestSeconds,totalSeconds,volume:totalSeconds,rir:null,rpe:null,label:`最佳 ${bestSeconds} 秒`});return
   }
   let maxWeight=0,maxReps=0,bestE1rm=0,bestSet=null,volume=0;
   const repByWeight={};const rirs=[],rpes=[];
   sets.forEach(s=>{
     let weight=n(s.weight),reps=n(s.reps);
     if(e.type==='unilateral'){
       const sides=[[n(s.leftWeight),n(s.leftReps)],[n(s.rightWeight),n(s.rightReps)]].filter(x=>x[1]>0);
       sides.forEach(([sw,sr])=>{maxWeight=Math.max(maxWeight,sw);maxReps=Math.max(maxReps,sr);repByWeight[sw]=Math.max(repByWeight[sw]||0,sr);const sc=est1rm(sw,sr);if(sc>bestE1rm){bestE1rm=sc;bestSet={weight:sw,reps:sr,rir:s.rir,rpe:s.rpe}};volume+=sw*sr})
     }else{
       maxWeight=Math.max(maxWeight,weight);maxReps=Math.max(maxReps,reps);repByWeight[weight]=Math.max(repByWeight[weight]||0,reps);
       const sc=est1rm(weight,reps);if(sc>bestE1rm){bestE1rm=sc;bestSet={weight,reps,rir:s.rir,rpe:s.rpe}};volume+=weight*reps
     }
     if(s.rir!==''&&s.rir!=null)rirs.push(n(s.rir));
     if(s.rpe!==''&&s.rpe!=null)rpes.push(n(s.rpe))
   });
   const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
   sessions.push({date:w.date,type:e.type,maxWeight,maxReps,bestE1rm,bestSet,volume,repByWeight,rir:avg(rirs),rpe:avg(rpes),sets:sets.length,label:bestSet?`${fmtWeightNumber(bestSet.weight)}${data.settings.unit}×${bestSet.reps}`:`${sets.length} 組`})
 });
 return sessions
}
function progressSignals(prev,cur){
 const signals=[];if(!prev||!cur||prev.type!==cur.type)return signals;
 if(cur.type==='cardio'){
   if(cur.minutes>prev.minutes+2)signals.push({key:'time',text:'有氧時間增加'});
   if(cur.distance>prev.distance+.1)signals.push({key:'distance',text:'距離增加'});
   if(cur.speed>prev.speed+.2)signals.push({key:'speed',text:'速度增加'});
   return signals
 }
 if(cur.type==='duration'){
   if(cur.bestSeconds>prev.bestSeconds+2)signals.push({key:'duration',text:'最佳時間增加'});
   if(cur.totalSeconds>prev.totalSeconds*1.03)signals.push({key:'volume',text:'總持續時間增加'});
   return signals
 }
 if(cur.maxWeight>prev.maxWeight+.001)signals.push({key:'weight',text:'重量增加'});
 const common=Object.keys(cur.repByWeight||{}).filter(k=>Object.prototype.hasOwnProperty.call(prev.repByWeight||{},k));
 if(common.some(k=>n(cur.repByWeight[k])>n(prev.repByWeight[k])))signals.push({key:'reps',text:'同重量次數增加'});
 if(prev.bestE1rm>0&&cur.bestE1rm>prev.bestE1rm*1.015)signals.push({key:'e1rm',text:'估算力量提高'});
 if(prev.volume>0&&cur.volume>prev.volume*1.03)signals.push({key:'volume',text:'完成量增加'});
 const similarPerf=prev.bestE1rm>0&&Math.abs(cur.bestE1rm-prev.bestE1rm)/prev.bestE1rm<=.02;
 if(similarPerf&&prev.rir!=null&&cur.rir!=null&&cur.rir-prev.rir>=.8)signals.push({key:'effort',text:'相近表現更有餘裕'});
 if(similarPerf&&prev.rpe!=null&&cur.rpe!=null&&prev.rpe-cur.rpe>=.8)signals.push({key:'effort',text:'相近表現更輕鬆'});
 return signals
}
function overloadSummary(exId){
 const ss=exerciseSessionMetrics(exId);if(ss.length<2)return{count:0,transitions:0,lastSignals:[],sessions:ss};
 const recent=ss.slice(-5);let count=0;const transitions=[];
 for(let i=1;i<recent.length;i++){const sig=progressSignals(recent[i-1],recent[i]);if(sig.length)count++;transitions.push({date:recent[i].date,signals:sig})}
 return{count,transitions:Math.max(0,recent.length-1),lastSignals:transitions.at(-1)?.signals||[],sessions:ss}
}
function plateauDetail(exId){
 const ss=exerciseSessionMetrics(exId).filter(s=>!['cardio','duration'].includes(s.type));
 if(ss.length<4)return{state:'insufficient',text:'至少需要 4 次可比較的訓練才能判斷進步是否趨緩。'};
 const last=ss.slice(-5),first=last[0],end=last.at(-1);
 const anySignals=[];for(let i=1;i<last.length;i++)anySignals.push(...progressSignals(last[i-1],last[i]));
 const strong=new Set(anySignals.map(x=>x.key));
 const e1rmGain=first.bestE1rm>0?(end.bestE1rm-first.bestE1rm)/first.bestE1rm:0;
 const weightGain=end.maxWeight-first.maxWeight;
 const volumeGain=first.volume>0?(end.volume-first.volume)/first.volume:0;
 const improving=strong.has('weight')||strong.has('reps')||e1rmGain>.02||volumeGain>.05||strong.has('effort');
 if(improving)return{state:'progress',text:'最近幾次仍有重量、次數、估算力量、完成量或主觀餘裕的進步訊號。'};
 return{state:'slow',text:`最近 ${last.length} 次在重量、次數、估算力量與完成量上都沒有明顯改善，近期進步趨勢可能趨緩。`}
}
function movementMatrixHtml(moves){
 const cell=p=>`<div class="pattern-cell"><b>${n(moves[p]||0)}</b><span>${esc(patternDisplayName(p))}</span></div>`;
 const groups=[
  ['上半身｜水平', ['horizontal_push','horizontal_pull']],
  ['上半身｜垂直', ['vertical_push','vertical_pull']],
  ['下半身｜膝部', ['knee_dominant','knee_flexion']],
  ['下半身｜髖部', ['hip_extension','hip_abduction']],
  ['手臂', ['elbow_flexion','elbow_extension']],
  ['核心', ['core_stability','rotation']]
 ];
 const coverage=['horizontal_push','horizontal_pull','vertical_push','vertical_pull','knee_dominant','knee_flexion','hip_extension','core_stability'];
 return `<div class="pattern-matrix">${groups.map(([name,ps])=>`<div class="pattern-group"><div class="pattern-group-title">${name}</div><div class="pattern-pair">${ps.map(cell).join('')}</div></div>`).join('')}</div>
 <div class="coverage-tags">${coverage.map(p=>`<span class="coverage-tag ${n(moves[p])>0?'hit':''}">${n(moves[p])>0?'✓':'—'} ${esc(patternDisplayName(p))}</span>`).join('')}</div>
 <div class="analysis-note">這裡呈現近期訓練分布與覆蓋情況，不假設 Push / Pull 或不同腿部模式必須符合固定比例。</div>`
}
function persistentMovementBias(){
 const days=28,end=isoToday(),pairs=[
  {a:'horizontal_push',b:'horizontal_pull',aName:'水平推',bName:'水平拉'},
  {a:'vertical_push',b:'vertical_pull',aName:'垂直推',bName:'垂直拉'},
  {a:'knee_dominant',b:'knee_flexion',aName:'膝主導',bName:'膝屈曲'}
 ];
 for(const pair of pairs){
   let aWins=0,bWins=0,usable=0,totalA=0,totalB=0;
   for(let i=0;i<4;i++){
     const bucketEnd=shiftIso(end,-i*7),bucketStart=shiftIso(bucketEnd,-6);
     const ws=data.workouts.filter(w=>w.date>=bucketStart&&w.date<=bucketEnd),m=movementStats(ws),a=n(m[pair.a]),b=n(m[pair.b]);
     totalA+=a;totalB+=b;if(a+b<4)continue;usable++;
     if(a>b*1.4&&a-b>=2)aWins++;else if(b>a*1.4&&b-a>=2)bWins++
   }
   if(usable>=3&&aWins>=3){const programId=pair.a==='horizontal_push'?'p_posture_pushpull_2':pair.a==='vertical_push'?'p_posture_verticalpull_2':pair.a==='knee_dominant'?'p_posture_posteriorchain_2':'';return{title:`${pair.aName}持續多於${pair.bName}`,desc:`最近 4 個七天區間中，有 ${aWins} 個區間的${pair.aName}正式組明顯較多。這代表近期訓練分布偏向${pair.aName}，不是姿勢或肌力失衡診斷。`,kind:'watch',programId}};
   if(usable>=3&&bWins>=3)return{title:`${pair.bName}持續多於${pair.aName}`,desc:`最近 4 個七天區間中，有 ${bWins} 個區間的${pair.bName}正式組明顯較多。這代表近期訓練分布偏向${pair.bName}，不是姿勢或肌力失衡診斷。`,kind:'watch'}
 }
 return null
}
function strongestRecentExerciseProgress(workouts){
 const ids=[];(workouts||[]).forEach(w=>(w.exercises||[]).forEach(e=>{if(e.exerciseId&&!ids.includes(e.exerciseId))ids.push(e.exerciseId)}));
 let best=null;
 ids.forEach(id=>{
   const ss=exerciseSessionMetrics(id);if(ss.length<2)return;
   const cur=ss.at(-1),prev=ss.at(-2);if(!workouts.some(w=>w.date===cur.date))return;
   const signals=progressSignals(prev,cur);if(!signals.length)return;
   const lib=getExercise(id),name=lib?.name||(data.workouts.flatMap(w=>w.exercises||[]).find(e=>e.exerciseId===id)?.nameSnapshot)||'動作';
   const score=signals.length+(prev.bestE1rm&&cur.bestE1rm?Math.max(0,(cur.bestE1rm-prev.bestE1rm)/prev.bestE1rm)*10:0);
   if(!best||score>best.score)best={id,name,signals,score,cur,prev}
 });
 return best
}
function buildAnalysisHighlights(ws,prevWs,days,confidence,cons){
 const out=[];
 if(confidence.level==='insufficient'){
   out.push({kind:'info',title:'目前資料還不夠多',desc:`這個期間只有 ${confidence.workouts} 次訓練、${confidence.formal} 個正式組。系統會先顯示紀錄，不急著判斷長期趨勢。`})
 }
 const prog=strongestRecentExerciseProgress(ws);
 if(prog)out.push({kind:'good',title:`${prog.name} 出現進步訊號`,desc:`和上一次相比：${prog.signals.slice(0,3).map(x=>x.text).join('、')}。`});
 const bias=persistentMovementBias();if(bias&&confidence.level!=='insufficient')out.push(bias);
 if(cons.totalWeeks>=2&&cons.weeks===cons.totalWeeks&&ws.length>=2)out.push({kind:'good',title:'近期訓練保持連續',desc:`統計期間涵蓋的 ${cons.totalWeeks} 個週區間都有訓練紀錄，平均約 ${cons.avgPerWeek.toFixed(1)} 次／週。`});
 if(days!=='all'&&prevWs.length){
   const curVol=ws.reduce((a,w)=>a+workoutVolume(w),0),prevVol=prevWs.reduce((a,w)=>a+workoutVolume(w),0),c=comparePct(curVol,prevVol);
   if(c&&c.pct!=null&&Math.abs(c.pct)>=20)out.push({kind:'info',title:`訓練量較前一期${c.pct>0?'增加':'減少'}`,desc:`目前期間為 ${fmtKg(curVol)}，前一期為 ${fmtKg(prevVol)}，變化約 ${Math.abs(Math.round(c.pct))}%。這只是量的變化，不自動代表好或壞。`})
 }
 const effort=effortStats(ws),rate=effort.total?(effort.high+effort.mid+effort.low)/effort.total:0;
 if(effort.total>=8&&rate<.5)out.push({kind:'info',title:'RIR / RPE 紀錄較少',desc:`目前只有約 ${Math.round(rate*100)}% 的正式組有強度紀錄，補上 RIR / RPE 後，進步與疲勞分析會更可靠。`});
 if(!out.length)out.push({kind:'info',title:'先累積更多可比較紀錄',desc:'目前沒有明顯需要優先提醒的變化。持續記錄重量、次數與 RIR / RPE，之後會更容易看出趨勢。'});
 return out.slice(0,3)
}
function recentMuscleLoad(days=7){
 const start=new Date();start.setDate(start.getDate()-(days-1));const s=isoDate(start),map={};
 data.workouts.filter(w=>w.date>=s).forEach(w=>(w.exercises||[]).forEach(e=>{map[e.muscle]=(map[e.muscle]||0)+effectiveSets({exercises:[e]})}));
 return map
}
function latestMuscleDate(m){
 let d='';data.workouts.forEach(w=>{if((w.exercises||[]).some(e=>e.muscle===m)&&w.date>d)d=w.date});return d
}
function progressionAdvice(exId){
 const ex=getExercise(exId);if(!ex)return null;const rec=getLastExerciseRecord(exId);if(!rec)return{state:'new',text:'第一次紀錄，先以保留 2–3 下餘裕找到工作重量。'};
 const inputUnit=exerciseInputUnit(rec.exercise);
 const sets=(rec.exercise.sets||[]).filter(s=>s.completed&&s.kind!=='warmup');if(!sets.length)return null;
 if(ex.type==='duration'){const avg=sets.reduce((a,s)=>a+n(s.seconds),0)/sets.length;if(avg>=ex.repMax)return{state:'up',text:`上次平均 ${Math.round(avg)} 秒，已達目標上限，可嘗試每組增加約 ${ex.increment||5} 秒。`};return{state:'same',text:`上次平均 ${Math.round(avg)} 秒，先維持並逐步接近 ${ex.repMax} 秒。`}}
 if(ex.type==='cardio')return{state:'same',text:'有氧建議優先穩定時間與感受，再逐步增加時間、距離或坡度。'};
 const working=sets.filter(s=>n(s.reps)>0);if(!working.length)return null;
 const allTop=working.every(s=>n(s.reps)>=n(ex.repMax||12));
 const intensityOK=working.every(s=>data.settings.intensity==='RIR'?(s.rir===''||n(s.rir)>=n(ex.intMin||2)):(s.rpe===''||n(s.rpe)<=8.5));
 const minRep=Math.min(...working.map(s=>n(s.reps)));
 if(allTop&&intensityOK){const inc=machineIncrementForUnit(ex,inputUnit);return{state:'up',text:`上次所有正式組達 ${ex.repMax} 下且強度可控，建議下次嘗試增加約 ${cleanWeightNumber(inc)} ${inputUnit}。`}};
 if(minRep<(ex.repMin||8)-1)return{state:'down',text:`上次有組數低於目標範圍，建議維持或小幅降重，優先完成 ${ex.repMin}–${ex.repMax} 下。`};
 return{state:'same',text:`上次仍在 ${ex.repMin}–${ex.repMax} 下範圍內，建議維持重量並增加完成次數。`}
}
function plateau(exId){
 const pts=[];[...data.workouts].sort((a,b)=>a.date.localeCompare(b.date)).forEach(w=>{const e=(w.exercises||[]).find(x=>x.exerciseId===exId);if(!e)return;let best=0;(e.sets||[]).forEach(s=>{if(!s.completed)return;best=Math.max(best,est1rm(n(s.weight),n(s.reps)))});if(best)pts.push({date:w.date,v:best})});
 if(pts.length<5)return false;const last=pts.slice(-5),min=Math.min(...last.map(x=>x.v)),max=Math.max(...last.map(x=>x.v));return min>0&&(max-min)/min<0.02
}
function validateWorkout(w){
 const issues=[];(w.exercises||[]).forEach(e=>{
   (e.sets||[]).forEach(s=>{
    const maxW=1000;
    if(n(s.weight)>maxW||n(s.leftWeight)>maxW||n(s.rightWeight)>maxW)issues.push(`${e.nameSnapshot} 有非常高的重量`);
    if(n(s.reps)>300||n(s.leftReps)>300||n(s.rightReps)>300)issues.push(`${e.nameSnapshot} 有異常高的次數`);
    if(n(s.seconds)>7200)issues.push(`${e.nameSnapshot} 單組時間超過 2 小時`);
   });
   if(n(e.cardio?.minutes)>600)issues.push(`${e.nameSnapshot} 有氧時間超過 10 小時`);
   if(n(e.cardio?.distanceKm)>500)issues.push(`${e.nameSnapshot} 距離看起來異常`);
   if(n(e.cardio?.incline)>40)issues.push(`${e.nameSnapshot} 坡度看起來異常`);
 });return issues
}

const APP_COACH_STEPS=[
 {selector:'#quickStart',title:'開始訓練',copy:'要開始今天的訓練，直接點右上角「開始訓練」。'},
 {selector:'.nav button[data-page="trainPage"]',title:'訓練頁',copy:'選課表、開始空白訓練，以及進行中的重量與次數記錄都在這裡。'},
 {selector:'.nav button[data-page="recordsPage"]',title:'訓練紀錄',copy:'完成訓練後，到「紀錄」查看過去每次實際完成的內容。'},
 {selector:'.nav button[data-page="analysisPage"]',title:'分析',copy:'累積一些訓練後，可以在「分析」查看進步、PR 與長期趨勢。'},
 {selector:'.nav button[data-page="settingsPage"]',title:'設定',copy:'課表、器械、健身房、訓練偏好與備份都集中在設定裡。'}
];

const PAGE_COACH_STEPS={
 home:[
  {selector:'#homeSuggestion',title:'今天建議',copy:'這裡會顯示今天最適合進行的訓練安排，以及目前計畫的下一個訓練日。'},
  {selector:'#quickStart',title:'直接開始',copy:'確認今天的安排後，從這裡直接進入訓練。'},
  {selector:'#recentProgress',title:'最近進步',copy:'有新的重量、次數或 PR 時，可以從這裡快速看到近期變化。'},
  {selector:'#recentWorkouts',title:'最近訓練',copy:'想確認上次做了什麼，可以從這裡快速回顧最近紀錄。'}
 ],
 trainLanding:[
  {selector:'#trainLanding .hero',title:'開始今天的訓練',copy:'還沒有進行中的訓練時，這裡是訓練頁的主要入口。'},
  {selector:'#trainStartBtn',title:'我的模板',copy:'使用你已經儲存的訓練模板快速開始。'},
  {selector:'#browseProgramsBtn',title:'系統課表庫',copy:'想換課表時，可以從這裡瀏覽系統提供的訓練計畫。'},
  {selector:'#trainCoachPicks',title:'目前計畫與推薦',copy:'長期課表與適合你的推薦會集中顯示在這裡。'}
 ],
 workout:[
  {selector:'#sessionExercises > *',title:'動作卡',copy:'每張卡片代表一個動作；動作名稱、上次紀錄、重量、次數與組數都集中在這裡。'},
  {selector:'#activeWorkout [data-demo]',title:'動作說明',copy:'不熟悉動作時，從「說明」查看操作提示與 YouTube 示範。'},
  {selector:'#activeWorkout [data-unit]',title:'kg / lb',copy:'器械標示 kg 就用 kg，標示 lb 就切換成 lb；App 會自動換算保存。'},
  {selector:'#activeWorkout [data-set="weight"]',title:'輸入重量',copy:'把這一組實際使用的重量填在這裡。'},
  {selector:'#activeWorkout [data-set="reps"]',title:'輸入次數',copy:'做完後，把這組實際完成的次數填在這裡。'},
  {selector:'#activeWorkout .advanced-set-quick',title:'快速調整',copy:'可以快速加減重量、增減次數，或直接複製上一組。'},
  {selector:'#activeWorkout [data-complete]',title:'完成這組',copy:'確認重量與次數後按「完成這組」；只有完成的組數才會進入主要紀錄。'},
  {selector:'.rest-quick-card',title:'休息計時器',copy:'完成一組後可以使用休息倒數，也能快速選 60、90、120 或 180 秒。'},
  {selector:'#openTrainingTools',title:'訓練工具',copy:'從這裡新增動作、調整順序、收起動作卡，或切換顯示層次。'},
  {selector:'#finishWorkout',title:'完成訓練',copy:'全部做完後，點這裡儲存本次訓練，之後就能在紀錄與分析查看結果。'}
 ],
 records:[
  {selector:'#recordsPage .section',title:'訓練紀錄',copy:'這一頁集中保存每一次已完成或手動補登的訓練。'},
  {selector:'#recordsPage .calendar',title:'日期與月份',copy:'有訓練的日期會特別標示，可以用日期快速找到過去紀錄。'},
  {selector:'#recordsPage .record',title:'紀錄清單',copy:'點開一筆紀錄，可以查看當天所有動作、重量、次數與組數。'},
  {selector:'#manualFromRecords',title:'手動補登',copy:'忘記當場記錄時，可以用「補登」把一整場訓練補回來。'}
 ],
 analysis:[
  {selector:'#analysisPage select',title:'分析期間',copy:'先選 7 天、30 天、90 天或全部，再看你想比較的時間範圍。'},
  {selector:'#analysisPage .card',title:'本期重點',copy:'先看上方重點摘要；App 會整理目前最值得注意的進步與變化。'},
  {selector:'#analysisPage',title:'分析內容',copy:'往下可以查看肌群刺激、動作模式、進步與 PR 等長期趨勢。'}
 ],
 settings:[
  {selector:'#settingsPage .settings-hub-card:nth-of-type(1), #settingsPage .card:nth-of-type(1)',title:'課表與訓練計畫',copy:'管理系統課表、自己的課表與目前訓練計畫。'},
  {selector:'#settingsPage .settings-hub-card:nth-of-type(2), #settingsPage .card:nth-of-type(2)',title:'動作與器械',copy:'查找系統動作、器械，以及建立自己的動作。'},
  {selector:'#settingsPage .settings-hub-card:nth-of-type(3), #settingsPage .card:nth-of-type(3)',title:'健身房與我的器材',copy:'建立不同健身房，並記住你常用的器械。'},
  {selector:'#settingsPage .settings-hub-card:nth-of-type(4), #settingsPage .card:nth-of-type(4)',title:'訓練偏好與目標',copy:'調整訓練目標、每週天數、時間與器材偏好。'},
  {selector:'#settingsPage .settings-hub-card:nth-of-type(5), #settingsPage .card:nth-of-type(5)',title:'健身術語與說明',copy:'看不懂 RIR、RPE、e1RM 等術語時，可以從這裡查詢。'},
  {selector:'#settingsPage .settings-hub-card:nth-of-type(6), #settingsPage .card:nth-of-type(6)',title:'資料與備份',copy:'匯入、匯出與建立本機備份都放在這裡。'},
  {selector:'#openTutorialFromSettings',title:'重新查看教學',copy:'之後忘記某個功能時，可以從設定最下面重新啟動操作教學。'}
 ]
};

let coachTour=null,coachIndex=0,coachResizeBound=false;

function coachNavigatePage(id){
 $$('.page').forEach(p=>p.classList.toggle('active',p.id===id));
 $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
 window.scrollTo({top:0,behavior:'auto'})
}
function coachTarget(step){
 if(!step)return null;
 for(const selector of String(step.selector||'').split(',').map(x=>x.trim()).filter(Boolean)){
   const el=document.querySelector(selector);
   if(el)return el
 }
 return null
}
function visibleCoachSteps(steps){return steps.filter(s=>coachTarget(s))}
function positionCoach(){
 const overlay=$('#coachOverlay'),hi=$('#coachHighlight'),card=$('#coachCard');
 if(!overlay?.classList.contains('show')||!coachTour)return;
 const steps=visibleCoachSteps(coachTour.steps),s=steps[coachIndex],target=coachTarget(s);
 if(!target)return;
 const r=target.getBoundingClientRect(),pad=6;
 hi.style.left=Math.max(4,r.left-pad)+'px';
 hi.style.top=Math.max(4,r.top-pad)+'px';
 hi.style.width=Math.max(30,Math.min(innerWidth-8,r.width+pad*2))+'px';
 hi.style.height=Math.max(30,r.height+pad*2)+'px';
 const cardW=Math.min(innerWidth-24,360),estimatedH=205;
 let top,left=Math.min(Math.max(12,r.left),innerWidth-cardW-12),placement='below';
 if(r.bottom+estimatedH+20<innerHeight){top=r.bottom+16;placement='below'}
 else{top=Math.max(12,r.top-estimatedH-16);placement='above'}
 card.style.left=left+'px';card.style.top=top+'px';
 card.classList.toggle('below',placement==='below');card.classList.toggle('above',placement==='above')
}
function renderCoachStep(){
 if(!coachTour)return;
 const steps=visibleCoachSteps(coachTour.steps);
 if(!steps.length){finishCoachTour();return}
 coachIndex=Math.max(0,Math.min(coachIndex,steps.length-1));
 const s=steps[coachIndex],target=coachTarget(s);
 if(!target){coachIndex++;renderCoachStep();return}
 target.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
 $('#coachStepLabel').textContent=`操作教學 ${coachIndex+1} / ${steps.length}`;
 $('#coachTitle').textContent=s.title;$('#coachCopy').textContent=s.copy;
 $('#coachProgress').innerHTML=steps.map((_,i)=>`<i class="${i<=coachIndex?'on':''}"></i>`).join('');
 $('#coachPrev').style.visibility=coachIndex===0?'hidden':'visible';
 $('#coachNext').textContent=coachIndex===steps.length-1?(coachTour.kind==='app'?'開始設定':'完成教學'):'下一步';
 setTimeout(positionCoach,220)
}
function startCoachTour(kind='app',steps=null,pageKey=null){
 const useSteps=steps||(kind==='app'?APP_COACH_STEPS:[]);
 if(kind==='app')coachNavigatePage('homePage');
 coachTour={kind,steps:useSteps,pageKey};coachIndex=0;
 const overlay=$('#coachOverlay');if(!overlay)return;
 overlay.classList.add('show');document.body.style.overflow='';
 $('#coachPrev').onclick=()=>{if(coachIndex>0){coachIndex--;renderCoachStep()}};
 $('#coachNext').onclick=()=>{
   const count=visibleCoachSteps(coachTour.steps).length;
   if(coachIndex<count-1){coachIndex++;renderCoachStep()}else finishCoachTour()
 };
 $('#coachSkip').onclick=finishCoachTour;
 if(!coachResizeBound){
   coachResizeBound=true;
   window.addEventListener('resize',positionCoach,{passive:true});
   window.addEventListener('scroll',positionCoach,{passive:true})
 }
 renderCoachStep()
}
function finishCoachTour(){
 if(!coachTour)return;
 const {kind,pageKey}=coachTour;
 $('#coachOverlay')?.classList.remove('show');
 if(kind==='app')data.settings.tutorialCompleted=true;
 if(pageKey){
   data.settings.pageTutorials=data.settings.pageTutorials||{};
   data.settings.pageTutorials[pageKey]=true;
   if(pageKey==='workout')data.settings.workoutTutorialCompleted=true
 }
 localStorage.setItem(APP_KEY,JSON.stringify(data));
 coachTour=null;coachIndex=0;document.body.style.overflow='';
 if(kind==='app')renderAll()
}
function renderFirstTutorial(){
 if(data.settings.tutorialCompleted===true||coachTour)return;
 setTimeout(()=>startCoachTour('app'),120)
}
function maybeStartPageTutorial(pageId){
 if(coachTour||data.settings.tutorialCompleted!==true||data.settings.preferencesSetupCompleted!==true)return;
 data.settings.pageTutorials=data.settings.pageTutorials||{};
 let key=null,steps=null;
 if(pageId==='homePage'){key='home';steps=PAGE_COACH_STEPS.home}
 if(pageId==='trainPage'&&!data.activeWorkout){key='trainLanding';steps=PAGE_COACH_STEPS.trainLanding}
 if(pageId==='trainPage'&&data.activeWorkout){key='workout';steps=PAGE_COACH_STEPS.workout}
 if(pageId==='recordsPage'){key='records';steps=PAGE_COACH_STEPS.records}
 if(pageId==='analysisPage'){key='analysis';steps=PAGE_COACH_STEPS.analysis}
 if(pageId==='settingsPage'&&currentSettingsView==='hub'){key='settings';steps=PAGE_COACH_STEPS.settings}
 if(!key||data.settings.pageTutorials[key]===true)return;
 setTimeout(()=>{if(!coachTour)startCoachTour('page',steps,key)},250)
}
function maybeStartWorkoutTutorial(){maybeStartPageTutorial('trainPage')}
function openTutorialAgain(){
 data.settings.tutorialCompleted=false;
 data.settings.workoutTutorialCompleted=false;
 data.settings.pageTutorials={home:false,trainLanding:false,workout:false,records:false,analysis:false,settings:false};
 localStorage.setItem(APP_KEY,JSON.stringify(data));
 closeTrainingDrawer();
 startCoachTour('app')
}

function renderFirstSetup(){
 const wrap=$('#firstSetupWrap');if(!wrap)return;
 const pending=data.settings.tutorialCompleted===true&&data.settings.preferencesSetupCompleted!==true;
 wrap.classList.toggle('show',pending);
 if(!pending)return;
 document.body.style.overflow='hidden';
 const selected=new Set(Array.isArray(data.settings.priorityMuscles)?data.settings.priorityMuscles.slice(0,2):[]);
 $('#firstPriorityMuscles').innerHTML=MUSCLES.filter(m=>!['有氧','其他'].includes(m)).map(m=>`<button type="button" data-first-muscle="${esc(m)}" class="${selected.has(m)?'on':''}">${esc(m)}</button>`).join('');
 $$('[data-first-muscle]').forEach(b=>b.onclick=()=>{
   const m=b.dataset.firstMuscle;
   if(selected.has(m))selected.delete(m);
   else{
     if(selected.size>=2){toast('優先加強部位最多選 2 個');return}
     selected.add(m)
   }
   b.classList.toggle('on',selected.has(m))
 });
 $('#firstSetupSave').onclick=()=>{
   const goal=$('#firstTrainingGoal').value,days=n($('#firstWeeklySessions').value),mins=n($('#firstSessionMinutes').value),exp=$('#firstExperience').value,equip=$('#firstEquipmentPreference').value;
   if(!goal||!days||!mins||!exp||!equip){toast('請先完成所有必填項目');return}
   data.settings.trainingGoal=goal;
   data.settings.weeklySessions=days;
   data.settings.sessionMinutes=mins;
   data.settings.experienceLevel=exp;
   data.settings.equipmentPreference=equip;
   data.settings.priorityMuscles=[...selected];
   data.settings.preferencesSetupCompleted=true;
   localStorage.setItem(APP_KEY,JSON.stringify(data));
   wrap.classList.remove('show');document.body.style.overflow='';
   renderAll();setTimeout(()=>maybeStartPageTutorial('homePage'),350);toast('訓練偏好與目標已設定完成')
 }
}
function renderAll(){
 applyUiLevel();
 $('#todayText').textContent=new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date());
 renderResume();renderHome();renderTrain();renderRecords();renderAnalysis();renderSettings();renderFirstTutorial();renderFirstSetup();
 if(data.settings.tutorialCompleted===true&&data.settings.preferencesSetupCompleted===true){const active=$('.page.active');if(active)setTimeout(()=>maybeStartPageTutorial(active.id),180)};
}
function renderResume(){
 const b=$('#resumeBanner');if(!data.activeWorkout){b.innerHTML='';return}
 b.innerHTML=`<div class="banner"><b>你有尚未完成的訓練：</b> ${esc(data.activeWorkout.name)} · ${esc(data.activeWorkout.date)}
 <div class="actions" style="margin-top:7px"><button class="btn small primary" id="resumeBtn">繼續</button><button class="btn small danger" id="discardActive">放棄</button></div></div>`;
 $('#resumeBtn').onclick=()=>goPage('trainPage');$('#discardActive').onclick=()=>{if(confirm('確定放棄這次尚未完成的訓練？')){data.activeWorkout=null;save('放棄訓練',true)}}
}
const COACH_GOALS={
 general:{label:'一般健康／建立習慣',terms:['一般健身','建立習慣','基礎肌力','全身','體能'],cats:['完全新手','全身訓練']},
 hypertrophy:{label:'增肌',terms:['增肌'],cats:['全身訓練','Upper / Lower','PPL','部位強化']},
 strength:{label:'增加肌力',terms:['肌力','力量','基礎肌力'],cats:['全身訓練','Upper / Lower','PPL']},
 fat_loss:{label:'減脂／體能',terms:['心肺','有氧','體能','一般健身','時間效率'],cats:['混合／有氧','時間效率','全身訓練']},
 posture:{label:'體態平衡／舒緩',terms:['體態','平衡','補強','舒緩','控制','上背','後鏈'],cats:['體態舒緩／平衡補強']},
 recovery:{label:'恢復／輕量',terms:['恢復','輕量','Deload','活動'],cats:['恢復／減量']}
};
const COACH_SUPPLEMENTS={
 general:['ex_legpress','ex_chestpress','ex_latpull','ex_row','ex_legcurl','ex_shoulder','ex_abcrunch','ex_treadmill'],
 hypertrophy:['ex_legpress','ex_chestpress','ex_latpull','ex_row','ex_legcurl','ex_legext','ex_lateral','ex_biceps','ex_triceps','ex_abcrunch'],
 strength:['ex_legpress','ex_hacksquat','ex_chestpress','ex_latpull','ex_row','ex_shoulder','ex_legcurl','ex_abcrunch'],
 fat_loss:['ex_legpress','ex_chestpress','ex_latpull','ex_row','ex_legcurl','ex_abcrunch','ex_treadmill','ex_elliptical','ex_stair'],
 posture:['ex_facepull','ex_row','ex_latpull','ex_rearpec','ex_wallslide','ex_deadbug','ex_birddog','ex_glutebridge_bw'],
 recovery:['ex_treadmill','ex_elliptical','ex_wallslide','ex_deadbug','ex_birddog','ex_glutebridge_bw','ex_pecstretch','ex_thoracic_ext','ex_hipflexor_stretch']
};
const TODAY_ADJUSTMENTS={
 normal:{label:'照原計畫',desc:'依目前 4–8 週計畫照常訓練。'},
 short:{label:'只有 30 分鐘',desc:'只保留今天最重要的動作，長期計畫不變。'},
 easy:{label:'今天比較累',desc:'減少部分組數與輔助動作，不把單日疲勞當成永久課表變更。'},
 fresh:{label:'今天狀態很好',desc:'維持原計畫；是否加重仍依實際完成次數與 RIR／RPE 判斷。'},
 focus:{label:'想多練一個部位',desc:'時間允許時加一個指定部位的輔助動作，只影響今天。'}
};
function coachGoal(){return COACH_GOALS[data.settings.trainingGoal]?data.settings.trainingGoal:'general'}
function coachGoalLabel(goal=coachGoal()){return COACH_GOALS[goal]?.label||COACH_GOALS.general.label}
function coachTargetExerciseCount(goal=coachGoal(),minutes=n(data.settings.sessionMinutes)||60){
 if(goal==='recovery')return minutes<=30?4:5;if(goal==='posture')return minutes<=30?5:6;
 if(minutes<=30)return 5;if(minutes<=45)return 6;if(minutes<=60)return 7;return 8
}
function priorityMuscles(){return Array.isArray(data.settings.priorityMuscles)?data.settings.priorityMuscles.filter(m=>MUSCLES.includes(m)&&!['有氧','其他'].includes(m)):[]}
function availableWeekdays(){return Array.isArray(data.settings.availableWeekdays)?data.settings.availableWeekdays.map(n).filter(x=>x>=0&&x<=6):[]}
function programGoalFit(p,goal=coachGoal()){
 const g=COACH_GOALS[goal]||COACH_GOALS.general,text=(`${p.nameZh} ${p.category} ${p.goal} ${p.descZh} ${(p.tags||[]).join(' ')}`).toLowerCase();
 let score=0;if(g.cats.includes(p.category))score+=24;const hits=g.terms.filter(t=>text.includes(t.toLowerCase())).length;score+=Math.min(30,hits*12);
 if(goal==='hypertrophy'&&String(p.goal).includes('增肌'))score+=18;if(goal==='strength'&&(/肌力|力量/.test(p.goal)))score+=18;if(goal==='fat_loss'&&(/心肺|有氧|體能/.test(p.goal+' '+p.category)))score+=18;if(goal==='posture'&&p.postureSupport)score+=24;if(goal==='recovery'&&p.category==='恢復／減量')score+=26;
 return Math.min(55,score)
}
function programExperienceScore(p){
 const level=String(p.level||''),exp=data.settings.experienceLevel||'beginner';
 if(exp==='beginner')return level.includes('新手')?10:level.includes('所有程度')?8:level.includes('初中階')?6:2;
 if(exp==='regular')return level.includes('初中階')||level.includes('新手～一般')?10:level==='中階'?8:9;
 return level==='中階'?10:level.includes('初中階')?9:8
}
function maxNonConsecutiveAvailable(days){
 const a=[...new Set(days)].sort((x,y)=>x-y);if(!a.length)return 7;let best=0,last=-9;for(const d of a){if(d-last>1){best++;last=d}}return best
}
function programHardFit(p){
 const limits=[],weekly=Math.min(7,Math.max(1,n(data.settings.weeklySessions)||3)),mins=n(data.settings.sessionMinutes)||60,days=availableWeekdays();
 if(n(p.daysPerWeek)>weekly)limits.push(`需要 ${p.daysPerWeek} 天，但目前每週目標只有 ${weekly} 天`);
 if(n(p.duration)>mins+30)limits.push(`單次約 ${p.duration} 分，明顯超過可用 ${mins} 分`);
 if(days.length&&n(p.daysPerWeek)>days.length)limits.push(`可訓練星期只有 ${days.length} 天`);
 if(days.length&&!data.settings.allowConsecutiveDays&&n(p.daysPerWeek)>maxNonConsecutiveAvailable(days))limits.push('目前可用星期無法避免連續重訓日');
 if((data.settings.experienceLevel||'beginner')==='beginner'&&p.level==='中階')limits.push('目前經驗設定為完全新手，先不推薦純中階課表');
 return{ok:!limits.length,limits}
}
function programMuscleProfile(p){
 const out={};(p.workouts||[]).forEach(w=>(w.items||[]).forEach(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(!ex)return;const sets=n(it.targetSets)||n(ex.targetSets)||3;exerciseStimulusProfile({exerciseId:ex.id,muscle:ex.muscle,type:ex.type,equipmentId:ex.equipmentId}).forEach(s=>{out[s.muscle]=(out[s.muscle]||0)+sets*n(s.weight)})}));return out
}
function programPatternProfile(p){const out={};(p.workouts||[]).forEach(w=>(w.items||[]).forEach(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(!ex||!ex.pattern||['cardio','mobility','scapular_control'].includes(ex.pattern))return;out[ex.pattern]=(out[ex.pattern]||0)+(n(it.targetSets)||n(ex.targetSets)||3)}));return out}
function programExerciseIds(p){return new Set((p.workouts||[]).flatMap(w=>(w.items||[]).map(i=>i.exerciseId)))}
function recommendationGymInfo(){const id=data.settings.preferredGymId||'';if(!id)return null;const g=data.gyms.find(x=>x.id===id);if(!g)return null;return{g,...gymUsageInfo(g)}}
function programEquipmentCoverage(p){
 const info=recommendationGymInfo();if(!info||(!info.equipment.length&&info.workouts.length<2))return{score:10,status:'unknown',direct:0,substitute:0,total:0,text:'健身房器材資料不足，暫不因器材扣分'};
 const available=new Set(info.equipment.map(x=>x.id)),required=[];for(const w of p.workouts||[])for(const it of w.items||[]){const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(ex?.equipmentId&&!required.some(x=>x.exerciseId===ex.id))required.push(ex)}
 if(!required.length)return{score:15,status:'known',direct:0,substitute:0,total:0,text:'此課表幾乎不依賴固定器械'};
 let direct=0,substitute=0;for(const ex of required){if(available.has(ex.equipmentId)){direct++;continue}const ok=(ex.alternatives||[]).some(id=>{const a=getExercise(id)||SYSTEM_EXERCISES.find(x=>x.id===id);return a?.equipmentId&&available.has(a.equipmentId)});if(ok)substitute++}
 const ratio=(direct+substitute*.7)/required.length,score=Math.round(15*ratio);return{score,status:'known',direct,substitute,total:required.length,text:`${info.g.name}：直接可用 ${direct}/${required.length}${substitute?`，另有 ${substitute} 個可替代`:''}`}
}
function priorityMuscleScore(p){
 const pri=priorityMuscles();if(!pri.length)return{score:8,text:'未指定優先部位，以全身平衡為主'};const prof=programMuscleProfile(p),vals=pri.map(m=>n(prof[m]));const avg=vals.reduce((a,b)=>a+b,0)/vals.length,score=Math.max(2,Math.min(10,Math.round(avg>=8?10:avg>=5?8:avg>=3?6:4)));return{score,text:`優先部位 ${pri.join('、')}：課表每週估算刺激 ${vals.map((v,i)=>`${pri[i]} ${fmtStim(v)}`).join('、')}`}
}
function buildCoachContext(){const ws=workoutsLastDays(28);return{ws,stimulus:ws.length>=2?stimulusMap(ws):{},movement:ws.length>=2?movementStats(ws):{},progressing:progressingExerciseIds()}}
function recentVolumeNeedScore(p,ctx){
 const ws=ctx?.ws||workoutsLastDays(28);if(ws.length<2)return{score:7,text:'近 28 天資料較少，訓練量需求採中性評分'};const cur=ctx?.stimulus||stimulusMap(ws),prof=programMuscleProfile(p),goals=data.settings.weeklyMuscleGoals||{},needs=[];
 for(const m of MUSCLES.filter(x=>!['有氧','其他'].includes(x))){const goal=n(goals[m]);if(!goal)continue;const avg=n(cur[m]?.total)/4,gap=Math.max(0,goal-avg);if(gap>=1.5)needs.push({m,gap,program:n(prof[m])})}
 if(!needs.length)return{score:8,text:'近期各主要肌群沒有明顯低於目前週目標'};const covered=needs.filter(x=>x.program>=Math.min(x.gap,3)).length,score=Math.max(3,Math.min(10,Math.round(4+6*covered/needs.length)));return{score,text:`近期較需要補足：${needs.slice(0,3).map(x=>`${x.m} 約差 ${fmtStim(x.gap)} 組/週`).join('、')}`}
}
function movementNeedScore(p,ctx){
 const ws=ctx?.ws||workoutsLastDays(28);if(ws.length<2)return{score:4,text:'動作模式資料較少，採中性評分'};const r=ctx?.movement||movementStats(ws),pp=programPatternProfile(p),need=[];
 const hp=n(r.horizontal_push),hr=n(r.horizontal_pull),vp=n(r.vertical_push),vr=n(r.vertical_pull),kd=n(r.knee_dominant)+n(r.knee_extension),post=n(r.knee_flexion)+n(r.hip_extension);
 if(hp>hr*1.4+2)need.push('horizontal_pull');if(hr>hp*1.8+4)need.push('horizontal_push');if(vp>vr*1.4+2)need.push('vertical_pull');if(vr>vp*2+4)need.push('vertical_push');if(kd>post*1.5+3)need.push('knee_flexion','hip_extension');if(post>kd*1.8+4)need.push('knee_dominant');
 const uniq=[...new Set(need)];if(!uniq.length)return{score:5,text:'近期動作模式沒有明顯單向偏多'};const covered=uniq.filter(x=>n(pp[x])>0).length;return{score:Math.max(1,Math.round(5*covered/uniq.length)),text:`近期可補強：${uniq.map(patternDisplayName).join('、')}`}
}
function progressingExerciseIds(){
 const ids=new Set();for(const ex of data.exerciseLibrary){const pts=[];[...data.workouts].sort((a,b)=>a.date.localeCompare(b.date)).forEach(w=>{const e=(w.exercises||[]).find(x=>x.exerciseId===ex.id);if(!e)return;let best=0;(e.sets||[]).forEach(s=>{if(s.completed&&n(s.reps)>0)best=Math.max(best,est1rm(n(s.weight),n(s.reps)))});if(best)pts.push(best)});if(pts.length>=2&&pts.at(-1)>pts.at(-2)*1.01)ids.add(ex.id)}return ids
}
function continuityScore(p,ctx){const prog=ctx?.progressing||progressingExerciseIds();if(!prog.size)return{score:4,text:'目前沒有足夠的近期進步序列可比較'};const ids=programExerciseIds(p),kept=[...prog].filter(x=>ids.has(x));return{score:Math.min(5,2+Math.min(3,kept.length)),text:kept.length?`保留 ${kept.length} 個近期仍在進步的動作`:'近期進步中的動作與此課表重疊較少'}}
function scheduleScore(p){
 const weekly=Math.min(7,Math.max(1,n(data.settings.weeklySessions)||3)),mins=n(data.settings.sessionMinutes)||60;let daysScore=n(p.daysPerWeek)===weekly?10:n(p.daysPerWeek)===weekly-1?7:4;const td=Math.abs(n(p.duration)-mins),timeScore=td<=5?5:td<=15?4:td<=25?2:1;return{score:daysScore+timeScore,text:`${p.daysPerWeek} 日/週 · 約 ${p.duration} 分鐘；設定為 ${weekly} 日/週 · ${mins} 分鐘`}
}
function preferenceScore(p){const pref=data.settings.equipmentPreference||'machine';if(pref==='machine')return{score:p.equipmentMode==='全機械'?5:p.equipmentMode==='機械＋滑輪'?4:2,text:p.equipmentMode==='全機械'?'符合器械為主偏好':`課表形式：${p.equipmentMode}`};return{score:['全機械','機械＋滑輪'].includes(p.equipmentMode)?5:3,text:`課表形式：${p.equipmentMode}`}}
function coachProgramScore(p,goal=coachGoal(),ctx=null){
 const c=ctx||buildCoachContext(),hard=programHardFit(p),goalRaw=programGoalFit(p,goal),goalScore=Math.max(0,Math.min(25,Math.round(goalRaw/55*25))),sched=scheduleScore(p),equip=programEquipmentCoverage(p),exp=programExperienceScore(p),pri=priorityMuscleScore(p),vol=recentVolumeNeedScore(p,c),move=movementNeedScore(p,c),cont=continuityScore(p,c),pref=preferenceScore(p);
 const dimensions={goal:goalScore,schedule:sched.score,equipment:equip.score,experience:exp,priority:pri.score,volume:vol.score,movement:move.score,continuity:cont.score,preference:pref.score};const rawScore=Object.values(dimensions).reduce((a,b)=>a+n(b),0),score=Math.max(0,Math.min(100,Math.round(rawScore)));
 const reasons=[];if(goalScore>=18)reasons.push(`長期目標符合「${coachGoalLabel(goal)}」`);if(sched.score>=13)reasons.push('每週天數與單次時間相符');if(pri.score>=8&&priorityMuscles().length)reasons.push(`有照顧優先部位：${priorityMuscles().join('、')}`);if(equip.status==='known'&&equip.score>=11)reasons.push(equip.text);if(cont.score>=4&&c.progressing.size)reasons.push(cont.text);if(vol.score>=8&&data.workouts.length>=2)reasons.push(vol.text);
 return{p,score,rawScore,reasons:reasons.slice(0,5),hard,dimensions,detail:{schedule:sched,equipment:equip,priority:pri,volume:vol,movement:move,continuity:cont,preference:pref},dayIndex:coachProgramDayIndex(p)}
}
function coachRecommendations(goal=coachGoal(),limit=5){
 const ctx=buildCoachContext(),all=SYSTEM_PROGRAMS.map(p=>coachProgramScore(p,goal,ctx)).filter(x=>x.p.workouts?.length),eligible=all.filter(x=>x.hard.ok).sort((a,b)=>b.score-a.score||a.p.duration-b.p.duration),pool=eligible.length?eligible:all.sort((a,b)=>(a.hard.limits.length-b.hard.limits.length)||b.score-a.score),out=[],cats=new Set();
 for(const r of pool){if(out.length>=limit)break;if(out.length<3&&cats.has(r.p.category)&&pool.some(x=>!cats.has(x.p.category)&&x.score>=r.score-6))continue;out.push(r);cats.add(r.p.category)}return out.length?out:pool.slice(0,limit)
}
function coachMatchLabel(score){return score>=88?'非常適合':score>=76?'很適合':score>=62?'適合':'可考慮'}
function coachProgramDayIndex(p){
 const cp=data.currentPlan;if(cp?.programId===p.id){const done=data.workouts.filter(w=>w.coachRecommendation?.planInstanceId===cp.id).length;return done%(p.workouts?.length||1)}
 const done=data.workouts.filter(w=>String(w.notes||'').includes(`系統課表： ${p.nameZh}`)||String(w.notes||'').includes(`教練推薦： ${p.nameZh}`)).length;return done%(p.workouts?.length||1)
}
function currentPlanProgram(){return data.currentPlan?SYSTEM_PROGRAMS.find(p=>p.id===data.currentPlan.programId)||null:null}
function currentPlanWeek(){if(!data.currentPlan?.startedDate)return 1;return Math.max(1,Math.floor(Math.max(0,daysBetween(data.currentPlan.startedDate,isoToday()))/7)+1)}
function adoptCurrentPlan(programId,from='recommendation'){
 const p=SYSTEM_PROGRAMS.find(x=>x.id===programId);if(!p)return;if(data.currentPlan&&data.currentPlan.programId!==programId&&!confirm(`目前已有「${currentPlanProgram()?.nameZh||'訓練計畫'}」。要改成「${p.nameZh}」嗎？`))return;
 const rec=coachProgramScore(p,coachGoal());data.currentPlan={id:uid('plan'),programId:p.id,startedDate:isoToday(),blockWeeks:n(data.settings.blockWeeks)||6,goal:coachGoal(),scoreAtStart:rec.score,createdAt:new Date().toISOString(),source:from};data.todayAdjustment={date:isoToday(),mode:'normal',focusMuscle:''};save('設定目前訓練計畫',true);toast(`已設定 ${data.currentPlan.blockWeeks} 週計畫：${p.nameZh}`)
}
function endCurrentPlan(){if(!data.currentPlan)return;if(confirm('結束目前訓練計畫？歷史訓練紀錄不會刪除。')){data.currentPlan=null;data.todayAdjustment=null;save('結束目前訓練計畫',true);toast('已結束目前計畫')}}
function todayAdjustment(){const t=data.todayAdjustment;if(t?.date===isoToday()&&TODAY_ADJUSTMENTS[t.mode])return t;return{date:isoToday(),mode:'normal',focusMuscle:''}}
function setTodayAdjustment(mode,focusMuscle=''){if(!TODAY_ADJUSTMENTS[mode])mode='normal';data.todayAdjustment={date:isoToday(),mode,focusMuscle:focusMuscle||''};localStorage.setItem(APP_KEY,JSON.stringify(data));renderHome();toast(`今天：${TODAY_ADJUSTMENTS[mode].label}`)}
function programDayBodyPenalty(day){let penalty=0;(day?.items||[]).forEach(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId),m=bodyStatusExerciseMatch(ex,isoToday());if(m)penalty+=m.strong?6:2});return penalty}
function bodySafeAlternative(ex,used){for(const id of ex?.alternatives||[]){if(used.has(id))continue;const a=getExercise(id)||SYSTEM_EXERCISES.find(x=>x.id===id);if(a&&!bodyStatusExerciseMatch(a,isoToday())?.strong)return a}return null}
function applyBodyStatusToItems(items){
 const used=new Set(items.map(x=>x.exerciseId)),out=[];for(const it of items){const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(!ex)continue;const bm=bodyStatusExerciseMatch(ex,isoToday());if(!bm?.strong){out.push({...it});continue}const alt=bodySafeAlternative(ex,used);if(alt){out.push({...it,exerciseId:alt.id,bodySubstituteFrom:ex.name});used.add(alt.id)}}return out
}
function coachSupplementItems(p,day,goal=coachGoal(),target=coachTargetExerciseCount(goal),baseItems=null){
 const original=(baseItems||day?.items||[]).map(x=>({...x}));if(original.length>=target)return original.slice(0,target);const used=new Set(original.map(x=>x.exerciseId)),muscles=new Set(original.map(x=>(getExercise(x.exerciseId)||SYSTEM_EXERCISES.find(e=>e.id===x.exerciseId))?.muscle).filter(Boolean)),patterns=new Set(original.map(x=>(getExercise(x.exerciseId)||SYSTEM_EXERCISES.find(e=>e.id===x.exerciseId))?.pattern).filter(Boolean));
 const candidates=(COACH_SUPPLEMENTS[goal]||COACH_SUPPLEMENTS.general).map((id,order)=>{const ex=getExercise(id)||SYSTEM_EXERCISES.find(x=>x.id===id);if(!ex||used.has(id)||bodyStatusExerciseMatch(ex,isoToday())?.strong)return null;let s=50-order+(muscles.has(ex.muscle)?0:8)+(ex.pattern&&!patterns.has(ex.pattern)?6:0);return{ex,s}}).filter(Boolean).sort((a,b)=>b.s-a.s);
 for(const c of candidates){if(original.length>=target)break;original.push({exerciseId:c.ex.id,targetSets:['有氧','腹部'].includes(c.ex.muscle)?2:2,coachSupplement:true});used.add(c.ex.id);muscles.add(c.ex.muscle);if(c.ex.pattern)patterns.add(c.ex.pattern)}return original
}
function addFocusAccessory(items,muscle){if(!muscle)return items;const used=new Set(items.map(x=>x.exerciseId)),cands=data.exerciseLibrary.filter(ex=>ex.muscle===muscle&&!used.has(ex.id)&&!bodyStatusExerciseMatch(ex,isoToday())?.strong&&ex.type!=='cardio').sort((a,b)=>Number(!!b.system)-Number(!!a.system));if(!cands.length)return items;return[...items,{exerciseId:cands[0].id,targetSets:2,todayFocus:true}]}
function coachDayBuild(rec){
 const p=rec.p,day=p.workouts[rec.dayIndex]||p.workouts[0],adj=todayAdjustment(),goal=coachGoal();let items=applyBodyStatusToItems(day.items||[]),target=coachTargetExerciseCount(goal);
 if(adj.mode==='short'){target=coachTargetExerciseCount(goal,30);items=coachSupplementItems(p,day,goal,target,items).slice(0,target)}
 else if(adj.mode==='easy'){target=Math.min(items.length,coachTargetExerciseCount(goal,45));items=items.slice(0,target).map(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);return{...it,targetSets:ex?.type==='cardio'?1:Math.max(1,(n(it.targetSets)||n(ex?.targetSets)||3)-1),todayEasy:true}})}
 else{items=coachSupplementItems(p,day,goal,target,items);if(adj.mode==='focus')items=addFocusAccessory(items,adj.focusMuscle).slice(0,Math.min(8,target+1))}
 return{p,day,items,adjustment:adj}
}
function coachExerciseListHtml(items,p){return `<div class="coach-exercises">${items.map((it,i)=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(!ex)return'';const sets=n(it.targetSets)||n(ex.targetSets)||3;let note='';if(it.bodySubstituteFrom)note=`<div class="coach-ex-extra substitute">因今日身體狀況，由「${esc(it.bodySubstituteFrom)}」替換</div>`;else if(it.todayFocus)note='<div class="coach-ex-extra focus">今天額外加強</div>';else if(it.todayEasy)note='<div class="coach-ex-extra easy">今天減量</div>';else if(it.coachSupplement)note='<div class="coach-ex-extra">依可用時間補入的輔助動作</div>';return `<div class="coach-ex-row"><span class="coach-ex-num">${i+1}</span><div><div class="coach-ex-name">${esc(ex.name)}</div><div class="coach-ex-en">${esc(ex.nameEn||'')}</div>${note}</div><span class="tag">${ex.type==='cardio'?'有氧':sets+' 組'}</span></div>`}).join('')}</div>`}
function recommendationBreakdownHtml(r){const d=r.dimensions,names={goal:'目標',schedule:'時間安排',equipment:'器材',experience:'經驗',priority:'優先部位',volume:'近期訓練量',movement:'動作模式',continuity:'動作延續',preference:'偏好'},max={goal:25,schedule:15,equipment:15,experience:10,priority:10,volume:10,movement:5,continuity:5,preference:5};return `<div class="recommend-score-grid ui-advanced-only">${Object.entries(d).map(([k,v])=>`<div class="recommend-score-cell"><b>${v}/${max[k]}</b><span>${names[k]}</span></div>`).join('')}</div>${!r.hard.ok?`<div class="recommend-limit">限制：${esc(r.hard.limits.join('；'))}</div>`:''}`}
function currentPlanRecommendation(){const p=currentPlanProgram();if(!p)return null;const r=coachProgramScore(p,data.currentPlan?.goal||coachGoal());r.dayIndex=coachProgramDayIndex(p);return r}
function todayAdjustHtml(){const a=todayAdjustment();return `<div class="today-adjust-grid">${Object.entries(TODAY_ADJUSTMENTS).map(([k,v])=>`<button type="button" data-today-adjust="${k}" class="${a.mode===k?'on':''}">${v.label}</button>`).join('')}<button type="button" data-today-body-status>某個部位不舒服</button></div>${a.mode==='focus'?`<div class="today-focus-grid">${MUSCLES.filter(m=>!['有氧','其他'].includes(m)).map(m=>`<button type="button" data-today-focus="${m}" class="${a.focusMuscle===m?'on':''}">${m}</button>`).join('')}</div>`:''}<div class="adjust-note">${esc(TODAY_ADJUSTMENTS[a.mode].desc)}${(todayBodyStatus().entries||[]).length?' 今日身體狀況也會另外套用到動作替換與提醒。':''}</div>`}
function coachHomeHtml(){
 const body=bodyStatusCardHtml(isoToday()),cp=data.currentPlan,p=currentPlanProgram();
 if(!cp||!p){const recs=coachRecommendations(coachGoal(),3),r=recs[0];if(!r)return `${body}<div class="card empty">目前沒有可用的長期課表推薦。</div>`;return `${body}<div class="section">目前訓練計畫</div><div class="card coach-primary"><div class="coach-kicker">尚未選定 4–8 週主計畫</div><div class="coach-title">建議先從：${esc(r.p.nameZh)}</div><div class="tagrow" style="margin-top:8px"><span class="tag">長期目標：${esc(coachGoalLabel())}</span><span class="tag">${r.p.daysPerWeek} 日/週</span><span class="tag">約 ${r.p.duration} 分</span><span class="tag">${coachMatchLabel(r.score)}<span class="ui-advanced-only"> ${r.score}/100</span></span></div><div class="coach-reasons">${r.reasons.map(x=>`<div class="coach-reason">${esc(x)}</div>`).join('')}</div>${recommendationBreakdownHtml(r)}<div class="actions" style="margin-top:11px"><button class="btn primary" data-plan-adopt="${esc(r.p.id)}">採用 ${n(data.settings.blockWeeks)||6} 週計畫</button><button class="btn ghost" id="homeReevaluatePlan">比較推薦課表</button></div></div><div class="section">今天的安排</div><div class="card empty">先選定目前訓練計畫，之後首頁會固定依 A／B／C 順序安排，不會每天重新抽一套課表。</div>`}
 const week=currentPlanWeek(),block=n(cp.blockWeeks)||6,r=currentPlanRecommendation(),built=coachDayBuild(r),day=built.day,progress=Math.min(100,Math.round(week/block*100)),active=!!data.activeWorkout,expired=week>block;
 return `${body}<div class="section">目前訓練計畫</div><div class="card current-plan-card"><div class="record-head"><div><div class="plan-week">第 ${Math.min(week,block)} / ${block} 週${expired?' · 已到重新評估時間':''}</div><div class="current-plan-title">${esc(p.nameZh)}</div><div class="record-meta">長期目標：${esc(COACH_GOALS[cp.goal]?.label||coachGoalLabel())} · ${p.daysPerWeek} 日/週 · 約 ${p.duration} 分</div></div><span class="tag">${coachMatchLabel(r.score)}<span class="ui-advanced-only"> ${r.score}/100</span></span></div><div class="plan-progress"><i style="width:${progress}%"></i></div><div class="actions" style="margin-top:10px"><button class="btn small ghost" id="homeReevaluatePlan">重新評估課表</button><button class="btn small ghost" data-coach-preview="${esc(p.id)}">查看完整計畫</button><button class="btn small danger" id="homeEndPlan">結束計畫</button></div></div><div class="section">今天要做</div><div class="card coach-primary"><div class="coach-kicker">${esc(TODAY_ADJUSTMENTS[built.adjustment.mode].label)}${(todayBodyStatus().entries||[]).length?' · 已納入今日身體狀況':''}</div><div class="coach-title">${esc(day.nameZh)}｜${esc(day.dayMeta?.dayTitle||p.nameZh)}</div><div class="tagrow" style="margin-top:8px"><span class="tag">${built.items.length} 個動作</span><span class="tag">原計畫約 ${p.duration} 分</span>${priorityMuscles().length?`<span class="tag">優先：${esc(priorityMuscles().join('、'))}</span>`:''}</div>${coachExerciseListHtml(built.items,p)}<div class="actions" style="margin-top:11px"><button class="btn primary" id="homeCoachStart">${active?'繼續目前訓練':'開始今天訓練'}</button></div></div><div class="section">今天需要調整嗎？</div><div class="card">${todayAdjustHtml()}<div class="small" style="margin-top:9px">這裡只改今天，不會修改「設定 → 訓練偏好與目標」的長期目標或目前 4–8 週計畫。</div></div>`
}
function openPlanReevaluation(){const rs=coachRecommendations(coachGoal(),5);openModal('重新評估長期課表',`<div class="card"><b>長期條件</b><div class="small" style="margin-top:5px">${esc(coachGoalLabel())} · ${n(data.settings.weeklySessions)||3} 日/週 · ${n(data.settings.sessionMinutes)||60} 分 · ${n(data.settings.blockWeeks)||6} 週${priorityMuscles().length?` · 優先 ${esc(priorityMuscles().join('、'))}`:''}</div><div class="small" style="margin-top:5px">今日疲勞或單日不舒服不會改變這份長期排名。</div></div>${rs.map((r,i)=>`<div class="card"><div class="record-head"><div><div class="coach-match">${i+1}. ${coachMatchLabel(r.score)}<span class="ui-advanced-only"> · ${r.score}/100</span></div><div class="coach-alt-title">${esc(r.p.nameZh)}</div><div class="coach-alt-meta">${r.p.daysPerWeek} 日/週 · 約 ${r.p.duration} 分 · ${esc(r.p.goal)}</div></div></div><div class="coach-reasons">${r.reasons.map(x=>`<div class="coach-reason">${esc(x)}</div>`).join('')}</div>${recommendationBreakdownHtml(r)}<div class="actions" style="margin-top:8px"><button class="btn small ghost" data-coach-preview="${esc(r.p.id)}">預覽</button><button class="btn small primary" data-plan-adopt="${esc(r.p.id)}">設為目前計畫</button></div></div>`).join('')}`,()=>{bindCoachUI($('#modalBody'))})}
function bindCoachUI(scope=document){
 scope.querySelectorAll?.('[data-coach-preview]').forEach(b=>b.onclick=()=>showSystemProgramDetail(b.dataset.coachPreview));scope.querySelectorAll?.('[data-plan-adopt]').forEach(b=>b.onclick=()=>{const id=b.dataset.planAdopt;closeModal();adoptCurrentPlan(id)});scope.querySelectorAll?.('[data-today-adjust]').forEach(b=>b.onclick=()=>setTodayAdjustment(b.dataset.todayAdjust,todayAdjustment().focusMuscle));scope.querySelectorAll?.('[data-today-focus]').forEach(b=>b.onclick=()=>setTodayAdjustment('focus',b.dataset.todayFocus));scope.querySelectorAll?.('[data-today-body-status]').forEach(b=>b.onclick=()=>openBodyStatusModal(isoToday()));
 const ree=scope.querySelector?.('#homeReevaluatePlan');if(ree)ree.onclick=openPlanReevaluation;const end=scope.querySelector?.('#homeEndPlan');if(end)end.onclick=endCurrentPlan;const start=scope.querySelector?.('#homeCoachStart');if(start)start.onclick=()=>{if(data.activeWorkout){goPage('trainPage');return}const r=currentPlanRecommendation();if(r)startCoachRecommendedDay(r)}
}
function startCoachRecommendedDay(rec){
 if(data.activeWorkout&&!confirm('目前已有尚未完成的訓練。要放棄目前訓練並開始今天的計畫嗎？'))return;const built=coachDayBuild(rec),p=built.p,day=built.day,date=isoToday(),adj=built.adjustment;
 const exercises=built.items.map(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(!ex)return null;const se=makeSessionExercise({...ex,...it},date);if(it.todayEasy&&(se.sets||[]).length){se.sets=se.sets.slice(0,Math.max(1,n(it.targetSets)||2))}if(ex.type==='cardio'){const base=n(se.cardio?.minutes)||20;se.cardio.minutes=adj.mode==='easy'?Math.min(15,base):adj.mode==='short'?Math.min(10,base):base}return se}).filter(Boolean);
 data.activeWorkout={id:uid('w'),date,name:`${p.nameZh}｜${day.nameZh}`,duration:0,status:'active',startedAt:new Date().toISOString(),endedAt:'',notes:`目前計畫： ${p.nameZh}｜長期目的：${COACH_GOALS[data.currentPlan?.goal]?.label||coachGoalLabel()}｜今日調整：${TODAY_ADJUSTMENTS[adj.mode].label}`,programDayMeta:{...(day.dayMeta||{}),trainingGoal:COACH_GOALS[data.currentPlan?.goal]?.label||coachGoalLabel(),coachNote:`目前為 ${n(data.currentPlan?.blockWeeks)||6} 週計畫；今日使用「${TODAY_ADJUSTMENTS[adj.mode].label}」。這次調整不會改寫長期設定。`},gymId:data.settings.preferredGymId||'',gymNameSnapshot:data.gyms.find(g=>g.id===data.settings.preferredGymId)?.name||'',deload:p.progression==='deload'||adj.mode==='easy',preStatus:{},pain:'',coachRecommendation:{programId:p.id,goal:data.currentPlan?.goal||coachGoal(),score:rec.score,dayIndex:rec.dayIndex,planInstanceId:data.currentPlan?.id||'',todayMode:adj.mode},exercises};save('開始目前計畫今日訓練',true);goPage('trainPage')
}
function goalProgramRecommendationsHtml(){
 const cp=currentPlanProgram(),rs=coachRecommendations(coachGoal(),3);return `${cp?`<div class="card current-plan-card"><div class="record-head"><div><b>目前 ${n(data.currentPlan.blockWeeks)||6} 週計畫：${esc(cp.nameZh)}</b><div class="record-meta">第 ${Math.min(currentPlanWeek(),n(data.currentPlan.blockWeeks)||6)} 週 · 長期目標 ${esc(COACH_GOALS[data.currentPlan.goal]?.label||coachGoalLabel())}</div></div><button class="btn small ghost" data-plan-reevaluate>重新評估</button></div></div>`:''}<div class="card"><div class="record-head"><div><b>依長期條件推薦</b><div class="record-meta">不使用今天的疲勞／不舒服來永久改變排名</div></div><span class="tag">${esc(coachGoalLabel())}</span></div><div class="coach-alt-grid" style="margin-top:9px">${rs.map(r=>`<div class="coach-alt-card"><div class="coach-match">${coachMatchLabel(r.score)}<span class="ui-advanced-only"> · ${r.score}/100</span></div><div class="coach-alt-title">${esc(r.p.nameZh)}</div><div class="coach-alt-meta">${r.p.daysPerWeek} 日/週 · 約 ${r.p.duration} 分</div><div class="actions" style="margin-top:7px"><button class="btn small ghost" data-program-detail="${esc(r.p.id)}">預覽</button><button class="btn small primary" data-plan-adopt="${esc(r.p.id)}">設為目前計畫</button></div></div>`).join('')}</div></div>`
}
function runAppSelfCheck(){
 const results=[];const add=(ok,label,detail='')=>results.push({ok,label,detail});
 const unique=(arr,key)=>new Set(arr.map(x=>x[key])).size===arr.length;
 add(unique(SYSTEM_PROGRAMS,'id'),'系統課表 ID 沒有重複');add(unique(SYSTEM_EXERCISES,'id'),'系統動作 ID 沒有重複');add(unique(SYSTEM_EQUIPMENT,'id'),'系統器械 ID 沒有重複');
 const exIds=new Set(data.exerciseLibrary.map(x=>x.id));const eqIds=new Set(SYSTEM_EQUIPMENT.map(x=>x.id));
 const badProg=[];SYSTEM_PROGRAMS.forEach(p=>(p.workouts||[]).forEach(w=>(w.items||[]).forEach(it=>{if(!exIds.has(it.exerciseId)&&!SYSTEM_EXERCISES.some(x=>x.id===it.exerciseId))badProg.push(`${p.id}:${it.exerciseId}`)})));add(!badProg.length,'所有系統課表都能找到對應動作',badProg.slice(0,5).join('、'));
 const badTpl=[];(data.templates||[]).forEach(t=>(t.items||[]).forEach(it=>{if(!exIds.has(it.exerciseId))badTpl.push(`${t.name}:${it.exerciseId}`)}));add(!badTpl.length,'我的課表動作引用正常',badTpl.slice(0,5).join('、'));
 const badWorkout=[];(data.workouts||[]).forEach(w=>(w.exercises||[]).forEach(e=>{if(!exIds.has(e.exerciseId))badWorkout.push(`${w.date}:${e.exerciseId}`)}));add(!badWorkout.length,'歷史訓練動作引用正常',badWorkout.slice(0,5).join('、'));
 const badEq=SYSTEM_EXERCISES.filter(e=>e.equipmentId&&!eqIds.has(e.equipmentId));add(!badEq.length,'系統動作的器械關聯正常',badEq.slice(0,5).map(x=>x.id).join('、'));
 const required=['homePage','trainPage','recordsPage','analysisPage','settingsPage','modalWrap','restOverlay','trainingDrawer','settingsPrograms','settingsExercises','settingsGym','settingsTraining','settingsData'];const missing=required.filter(id=>!document.getElementById(id));add(!missing.length,'主要畫面元件存在',missing.join('、'));
 const ids=[...document.querySelectorAll('[id]')].map(x=>x.id),dup=ids.filter((x,i)=>ids.indexOf(x)!==i);add(!dup.length,'目前畫面沒有重複 DOM ID',[...new Set(dup)].join('、'));
 const cp=data.currentPlan,cpOk=!cp||!!SYSTEM_PROGRAMS.find(p=>p.id===cp.programId);add(cpOk,'目前訓練計畫引用正常',cp&&!cpOk?cp.programId:'');const weekdays=availableWeekdays(),weekdayOk=weekdays.every(x=>x>=0&&x<=6)&&new Set(weekdays).size===weekdays.length;add(weekdayOk,'推薦可訓練星期設定正常');const pri=priorityMuscles(),priOk=pri.every(x=>MUSCLES.includes(x));add(priOk,'推薦優先部位設定正常');
 const backupKeys=Object.keys(freshData()).filter(k=>k!=='snapshots'),snapshotKeys=Object.keys(Object.fromEntries(Object.entries(data).filter(([k])=>k!=='snapshots')));const missingBackupKeys=backupKeys.filter(k=>!snapshotKeys);add(!missingBackupKeys.length,'完整備份欄位涵蓋目前資料結構',missingBackupKeys.join('、'));
 return results
}
function renderSelfCheck(results){const box=$('#selfCheckResult');if(!box)return;if(!results){box.innerHTML='';return}const ok=results.every(x=>x.ok);box.innerHTML=`<div class="${ok?'good':'warn'}" style="margin-top:9px;font-weight:900">${ok?'✓ 自我檢查通過':'⚠ 發現需要處理的項目'}</div><div class="selfcheck-list">${results.map(r=>`<div class="selfcheck-item ${r.ok?'ok':'bad'}">${r.ok?'✓':'⚠'} ${esc(r.label)}${r.detail?`<div class="small" style="margin-top:2px">${esc(r.detail)}</div>`:''}</div>`).join('')}</div>`}
function renderHome(){
 const week=workoutsThisWeek(),recent30=workoutsLastDays(30);
 $('#homeSuggestion').innerHTML=coachHomeHtml();bindBodyStatusButtons($('#homeSuggestion'));bindCoachUI($('#homeSuggestion'));
 const target=n(data.settings.weeklySessions)||3,cardioGoal=n(data.settings.weeklyCardio)||0,weekCardio=week.reduce((a,w)=>a+cardioMinutes(w),0);
 $('#homeKpis').innerHTML=`
 <div class="stat"><b>${week.length} / ${target}</b><span>本週訓練</span></div>
 <div class="stat"><b>${Math.round(weekCardio)} / ${cardioGoal}</b><span>有氧分鐘</span></div>
 <div class="stat"><b>${fmtKg(recent30.reduce((a,w)=>a+workoutVolume(w),0))}</b><span>近 30 天訓練量<br><small>${rangeDateLabel(30)}</small></span></div>`;
 const load=recentMuscleLoad(7),goals=data.settings.weeklyMuscleGoals||{};
 $('#weeklyMuscles').innerHTML=MUSCLES.filter(m=>m!=='有氧'&&m!=='其他').map(m=>{const goal=n(goals[m])||0,val=n(load[m]),pct=goal?Math.min(100,val/goal*100):0;return `<div class="barline"><div class="topline"><b>${m}</b><span>${val} / ${goal||'—'} 組</span></div><div class="progress"><i style="width:${pct}%"></i></div></div>`}).join('');
 const prog=[];data.exerciseLibrary.filter(ex=>['weight_reps','bodyweight','unilateral','duration'].includes(ex.type)).forEach(ex=>{const adv=progressionAdvice(ex.id);const best=bestSetForExercise(ex.id);if(best&&adv)prog.push({ex,adv,best})});prog.sort((a,b)=>b.best.date.localeCompare(a.best.date));
 $('#recentProgress').innerHTML=prog.length?prog.slice(0,3).map(p=>`<div class="record"><div class="record-head"><div><div class="record-title">${esc(p.ex.name)}</div><div class="record-meta">最近：${esc(p.best.date)}</div></div><span class="pill ${p.adv.state==='up'?'good':''}">${p.adv.state==='up'?'↑ 建議加重':p.adv.state==='down'?'↓ 考慮降重':'＝ 維持'}</span></div><div class="small" style="margin-top:8px">${esc(p.adv.text)}</div></div>`).join(''):'<div class="card empty">累積幾次訓練後，這裡會顯示進步建議。</div>';
 const goalHtml=(data.strengthGoals||[]).map(g=>{const ex=getExercise(g.exerciseId),best=bestSetForExercise(g.exerciseId),cur=best?best.weight:0,pct=g.weight?Math.min(100,cur/g.weight*100):0;return `<div class="record"><div class="record-head"><div><b>目標：${esc(ex?.name||'動作')}</b><div class="record-meta">目前最佳重量 ${fmtWeight(cur)} · 目標 ${fmtWeight(g.weight)} × ${g.reps}</div></div><span>${Math.round(pct)}%</span></div><div class="progress"><i style="width:${pct}%"></i></div></div>`}).join('');if(goalHtml)$('#recentProgress').insertAdjacentHTML('beforeend',goalHtml);
 $('#recentWorkouts').innerHTML=data.workouts.length?data.workouts.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4).map(workoutCardHtml).join(''):'<div class="card empty">還沒有完成的訓練紀錄。</div>';$$('#recentWorkouts [data-open]').forEach(b=>b.onclick=()=>editWorkout(b.dataset.open))
}
function suggestTemplate(){const r=coachRecommendations(coachGoal(),1)[0];if(r)return{title:r.p.nameZh,reason:r.reasons.join(' · '),templateId:'',systemProgramId:r.p.id};return{title:'自由訓練',reason:'目前沒有可用的系統課表。',templateId:'',systemProgramId:''}}
function workoutCardHtml(w){
 const sets=effectiveSets(w),vol=workoutVolume(w),prs=countPRsInWorkout(w);
 return `<div class="record"><div class="record-head"><div><div class="record-title">${esc(w.name)} ${w.deload?'<span class="pill">Deload</span>':''}</div><div class="record-meta">${esc(w.date)} · ${n(w.duration)} 分 · ${sets} 正式組</div></div><button class="btn small ghost" data-open="${esc(w.id)}">編輯</button></div><div class="tagrow" style="margin-top:8px"><span class="tag">${fmtKg(vol)}</span><span class="tag">有氧 ${Math.round(cardioMinutes(w))} 分</span>${prs?`<span class="tag">PR ${prs}</span>`:''}</div></div>`
}
function countPRsInWorkout(w){
 let count=0;(w.exercises||[]).forEach(e=>{let local=0;(e.sets||[]).forEach(s=>local=Math.max(local,est1rm(n(s.weight),n(s.reps))));if(!local)return;const prior=data.workouts.filter(x=>x.date<w.date);let prev=0;prior.forEach(x=>{const ex=(x.exercises||[]).find(a=>a.exerciseId===e.exerciseId);(ex?.sets||[]).forEach(s=>prev=Math.max(prev,est1rm(n(s.weight),n(s.reps))))});if(local>prev&&prev>0)count++});return count
}

function exerciseYoutubeSearch(ex,lang='zh'){
 if(!ex)return;
 const q=lang==='en'
   ?(ex.youtubeEn||`${ex.nameEn||ex.name} proper form tutorial`)
   :(ex.youtubeZh||`${ex.name} ${ex.nameEn||''} 正確姿勢 動作示範 教學`);
 youtubeSearch(q)
}
function openExerciseDemo(exId){
 const ex=getExercise(exId);if(!ex)return;
 const eq=SYSTEM_EQUIPMENT.find(x=>x.id===ex.equipmentId);
 const pattern=ex.pattern?patternDisplayName(ex.pattern):'未指定';
 const prescription=ex.type==='duration'
   ?`${n(ex.targetSets)||2} 組 · ${n(ex.repMin)||30}${n(ex.repMax)&&n(ex.repMax)!==n(ex.repMin)?'–'+n(ex.repMax):''} 秒`
   :ex.type==='cardio'
   ?'依時間／距離記錄'
   :`${n(ex.targetSets)||3} 組 × ${n(ex.repMin)||8}${n(ex.repMax)&&n(ex.repMax)!==n(ex.repMin)?'–'+n(ex.repMax):''}`;
 openModal('動作示範確認',`<div class="card">
   <div class="record-title">${esc(ex.name)}</div>
   <div class="small">${esc(ex.nameEn||'')}</div>
   ${window.TrainLogMotion3DHtml?window.TrainLogMotion3DHtml(ex.id,ex.pattern,ex.name,ex.nameEn||'',eq?.nameEn||''):''}
   <div class="tagrow" style="margin-top:8px"><span class="tag">${esc(ex.muscle||'其他')}</span><span class="tag">${esc(pattern)}</span><span class="tag">${esc(prescription)}</span></div>
   ${eq?`<div class="small" style="margin-top:8px"><b>對應器械：</b>${esc(eq.nameZh)} / ${esc(eq.nameEn)}</div>`:''}
   <div class="exercise-demo-copy" style="margin-top:11px">${esc(ex.descZh||ex.notes||'目前沒有額外動作說明。')}</div>
   ${ex.notes?`<div class="exercise-demo-note"><b>操作重點：</b>${esc(ex.notes)}</div>`:''}
 </div>
 <div class="actions">
   <button class="btn primary" id="demoYtZh">▶ YouTube 中文示範</button>
   <button class="btn ghost" id="demoYtEn">▶ English Proper Form</button>
   <button class="btn ghost" id="demoFullInfo">ⓘ 完整說明</button>
 </div>`,()=>{
   $('#demoYtZh').onclick=()=>exerciseYoutubeSearch(ex,'zh');
   $('#demoYtEn').onclick=()=>exerciseYoutubeSearch(ex,'en');
   $('#demoFullInfo').onclick=()=>{closeModal();setTimeout(()=>showExerciseDetail(ex.id),30)}
 })
}
function exercisePickerRowHtml(e){
 const eq=SYSTEM_EQUIPMENT.find(x=>x.id===e.equipmentId);
 return `<div class="exercise-picker-row">
   <div class="exercise-picker-main">
     <div><div class="exercise-picker-name">${esc(e.name)}</div><div class="exercise-picker-en">${esc(e.nameEn||'')}</div></div>
     <span class="tag">${esc(e.muscle)}</span>
   </div>
   <div class="exercise-picker-meta">${esc(TYPES.find(t=>t[0]===e.type)?.[1]||e.type)}${e.pattern?` · ${esc(patternDisplayName(e.pattern))}`:''}${eq?` · ${esc(eq.nameZh)}`:''}</div>
   <div class="exercise-picker-actions">
     <button class="btn primary" type="button" data-pick="${esc(e.id)}">＋ 加入這個動作</button>
     <button class="btn ghost" type="button" data-pick-info="${esc(e.id)}">ⓘ 說明</button>
   </div>
 </div>`
}
const BODY_AREAS=[
 ['neck','頸部'],['shoulder_l','左肩'],['shoulder_r','右肩'],['chest','胸部'],['upper_back','上背'],['lower_back','下背'],
 ['elbow_l','左手肘'],['elbow_r','右手肘'],['wrist_l','左手腕'],['wrist_r','右手腕'],['core','腹部／核心'],['hip_l','左髖'],
 ['hip_r','右髖'],['thigh_front','大腿前側'],['thigh_back','大腿後側'],['knee_l','左膝'],['knee_r','右膝'],['calf','小腿'],
 ['ankle_l','左腳踝'],['ankle_r','右腳踝']
];
const BODY_STATUS_TYPES={
 soreness:{label:'肌肉痠痛',short:'痠',cls:'soreness'},
 tight:{label:'緊繃／卡卡',short:'緊',cls:'tight'},
 pain:{label:'疼痛／不舒服',short:'痛／不適',cls:'pain'}
};
const BODY_LEVELS={1:'輕微',2:'中等',3:'明顯'};
function bodyAreaName(id){return BODY_AREAS.find(x=>x[0]===id)?.[1]||id}
function todayBodyStatus(date=isoToday()){
 data.bodyStatus=data.bodyStatus||[];
 return data.bodyStatus.find(x=>x.date===date)||{date,entries:[],note:'',updatedAt:''}
}
function saveBodyStatus(status){
 data.bodyStatus=data.bodyStatus||[];const i=data.bodyStatus.findIndex(x=>x.date===status.date);
 status.updatedAt=new Date().toISOString();
 if(i>=0)data.bodyStatus[i]=status;else data.bodyStatus.push(status);
 data.bodyStatus=data.bodyStatus.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,180);
 localStorage.setItem(APP_KEY,JSON.stringify(data));renderAll()
}
function bodyStatusSummary(status){
 const es=status?.entries||[];if(!es.length)return'今天沒有標記痠痛或不舒服';
 const important=es.filter(x=>x.type==='pain'||n(x.level)>=3).length;
 return `${es.length} 個部位已標記${important?` · ${important} 個需要多注意`:''}`
}
function bodyStatusTagsHtml(status){
 return (status?.entries||[]).map(e=>{const t=BODY_STATUS_TYPES[e.type]||BODY_STATUS_TYPES.soreness;return `<span class="body-status-tag ${t.cls}">${esc(bodyAreaName(e.area))} · ${esc(t.short)} · ${esc(BODY_LEVELS[n(e.level)]||'')}</span>`}).join('')
}
function openBodyStatusModal(date=isoToday()){
 const current=JSON.parse(JSON.stringify(todayBodyStatus(date))),draft={...current,entries:[...(current.entries||[])]};
 let area=BODY_AREAS[0][0],type='soreness',level=1;
 const renderEntries=()=>{
   const box=$('#bodyStatusEntries');if(!box)return;
   box.innerHTML=draft.entries.length?draft.entries.map((e,i)=>{const t=BODY_STATUS_TYPES[e.type]||BODY_STATUS_TYPES.soreness;return `<div class="body-status-entry"><div class="body-status-entry-copy"><div class="body-status-entry-title">${esc(bodyAreaName(e.area))}</div><div class="body-status-entry-meta">${esc(t.label)} · ${esc(BODY_LEVELS[n(e.level)]||'')}</div></div><button class="btn small danger" data-body-remove="${i}" type="button">×</button></div>`}).join(''):'<div class="empty">今天還沒有標記任何部位。</div>';
   $$('[data-body-remove]').forEach(b=>b.onclick=()=>{draft.entries.splice(n(b.dataset.bodyRemove),1);renderEntries()})
 };
 openModal('今日身體狀況',`<div class="card">
   <div class="small">記錄今天哪裡有肌肉痠痛、緊繃或不舒服。這是訓練調整提示，不是受傷診斷。</div>
   <div class="section" style="margin-top:13px">1. 哪個部位？</div>
   <div class="body-area-grid">${BODY_AREAS.map((a,i)=>`<button type="button" class="body-area-btn ${i===0?'on':''}" data-body-area="${a[0]}">${a[1]}</button>`).join('')}</div>
   <div class="section">2. 感覺是？</div>
   <div class="body-status-seg"><button type="button" class="on" data-body-type="soreness">肌肉痠痛</button><button type="button" data-body-type="tight">緊繃／卡卡</button><button type="button" data-body-type="pain">疼痛／不舒服</button></div>
   <div class="section">3. 程度</div>
   <div class="body-status-seg"><button type="button" class="on" data-body-level="1">輕微</button><button type="button" data-body-level="2">中等</button><button type="button" data-body-level="3">明顯</button></div>
   <button class="btn primary" type="button" id="bodyStatusAdd" style="margin-top:10px;width:100%">＋ 加入這個部位</button>
 </div>
 <div class="section">今天已標記</div><div class="card" id="bodyStatusEntries"></div>
 <div class="field"><label>備註（選填）</label><textarea id="bodyStatusNote" placeholder="例如：昨天練腿後大腿痠；右肩抬高手時不舒服">${esc(draft.note||'')}</textarea></div>
 <div class="warnbox"><b>什麼情況不要硬練？</b><div class="small" style="margin-top:4px">若是明顯疼痛、麻木、腫脹、突發無力，或活動明顯受限，不要只靠 App 的補強建議處理；可先停止相關動作並考慮專業評估。</div></div>
 <div class="actions" style="margin-top:10px"><button class="btn primary" id="bodyStatusSave">儲存今天狀況</button><button class="btn ghost" id="bodyStatusClear">今天沒有不適</button></div>`,()=>{
   renderEntries();
   $$('[data-body-area]').forEach(b=>b.onclick=()=>{area=b.dataset.bodyArea;$$('[data-body-area]').forEach(x=>x.classList.toggle('on',x===b))});
   $$('[data-body-type]').forEach(b=>b.onclick=()=>{type=b.dataset.bodyType;$$('[data-body-type]').forEach(x=>x.classList.toggle('on',x===b))});
   $$('[data-body-level]').forEach(b=>b.onclick=()=>{level=n(b.dataset.bodyLevel);$$('[data-body-level]').forEach(x=>x.classList.toggle('on',x===b))});
   $('#bodyStatusAdd').onclick=()=>{
     const existing=draft.entries.find(x=>x.area===area);
     if(existing){existing.type=type;existing.level=level}else draft.entries.push({area,type,level});
     renderEntries()
   };
   $('#bodyStatusSave').onclick=()=>{draft.note=$('#bodyStatusNote').value.trim();saveBodyStatus(draft);closeModal();toast('已儲存今日身體狀況')};
   $('#bodyStatusClear').onclick=()=>{draft.entries=[];draft.note='';saveBodyStatus(draft);closeModal();toast('今天標記為沒有不適')}
 })
}
function bodyStatusExerciseMatch(ex,date=isoToday()){
 const entries=todayBodyStatus(date).entries||[];if(!entries.length||!ex)return null;
 const p=ex.pattern||'',m=ex.muscle||'';
 const upper=['horizontal_push','horizontal_pull','vertical_push','vertical_pull','shoulder_abduction','shoulder_extension','shoulder_horizontal_adduction','elbow_flexion','elbow_extension'];
 const lower=['knee_dominant','knee_extension','knee_flexion','hip_extension','hip_abduction','hip_adduction','plantar_flexion'];
 const relevant=e=>{
   if(e.area==='chest')return m==='胸'||p==='horizontal_push'||p==='shoulder_horizontal_adduction';
   if(['shoulder_l','shoulder_r','neck'].includes(e.area))return m==='肩膀'||upper.includes(p);
   if(e.area==='upper_back')return m==='背'||['horizontal_pull','vertical_pull','shoulder_extension'].includes(p);
   if(e.area==='lower_back')return m==='背'||m==='腹部'||['hip_extension','core_stability','rotation'].includes(p);
   if(['elbow_l','elbow_r','wrist_l','wrist_r'].includes(e.area))return upper.includes(p)||['二頭','三頭'].includes(m);
   if(e.area==='core')return m==='腹部'||['core_stability','core_flexion','rotation'].includes(p);
   if(['hip_l','hip_r','thigh_front','thigh_back','knee_l','knee_r','calf','ankle_l','ankle_r'].includes(e.area))return m==='腿'||lower.includes(p);
   return false
 };
 const hits=entries.filter(relevant);if(!hits.length)return null;
 return{hits,strong:hits.some(x=>x.type==='pain'||n(x.level)>=3),text:hits.map(x=>`${bodyAreaName(x.area)} ${BODY_STATUS_TYPES[x.type]?.short||''}${BODY_LEVELS[n(x.level)]?`（${BODY_LEVELS[n(x.level)]}）`:''}`).join('、')}
}
function bodyStatusCardHtml(date=isoToday()){
 const s=todayBodyStatus(date);
 return `<div class="card body-status-card"><div class="body-status-head"><div><div class="body-status-title">今日身體狀況</div><div class="body-status-summary">${esc(bodyStatusSummary(s))}</div></div><button class="btn small ghost" type="button" data-open-body-status="${esc(date)}">${(s.entries||[]).length?'修改':'設定'}</button></div>${(s.entries||[]).length?`<div class="body-status-tags">${bodyStatusTagsHtml(s)}</div>`:''}${s.note?`<div class="small" style="margin-top:8px">備註：${esc(s.note)}</div>`:''}</div>`
}
function bindBodyStatusButtons(scope=document){
 scope.querySelectorAll?.('[data-open-body-status]').forEach(b=>b.onclick=()=>openBodyStatusModal(b.dataset.openBodyStatus||isoToday()))
}
const UI_LEVELS={
 simple:{name:'簡易',short:'隱藏 RIR',desc:'訓練操作與一般模式相同，只隱藏剩餘次數（RIR／RPE）欄位。'},
 standard:{name:'一般',short:'顯示 RIR',desc:'保留完整的一般訓練操作，並顯示剩餘次數（RIR／RPE）。'},
 advanced:{name:'進階',short:'完整控制',desc:'顯示完整組別、RIR／RPE 與進階分析；中文為主，英文縮寫只作輔助。'}
};
function uiLevel(){return data.settings.uiLevel||'standard'}
function uiLevelName(level=uiLevel()){return UI_LEVELS[level]?.name||'一般'}
function applyUiLevel(){
 const level=uiLevel();document.body.dataset.uiLevel=level;
 const badge=$('#uiLevelHeaderBadge');if(badge)badge.textContent=`${uiLevelName(level)}模式`
}
function syncUiLevelControls(scope=document){
 const cur=uiLevel();
 scope.querySelectorAll?.('[data-ui-level]').forEach(b=>b.classList.toggle('on',b.dataset.uiLevel===cur));
 scope.querySelectorAll?.('.ui-level-hint').forEach(h=>h.textContent=UI_LEVELS[cur]?.desc||'')
}
function setUiLevel(level){
 if(!UI_LEVELS[level])return;
 const drawerWasOpen=$('#trainingDrawer')?.classList.contains('show');
 data.settings.uiLevel=level;localStorage.setItem(APP_KEY,JSON.stringify(data));
 applyUiLevel();
 // 先立即同步按鈕，避免使用者點了但選中狀態仍停在舊模式。
 syncUiLevelControls(document);
 renderAll();
 // renderAll 會重畫訓練內容；若工具抽屜本來開著，再同步重畫抽屜本身。
 if(drawerWasOpen){renderTrainingDrawer();$('#trainingDrawer')?.classList.add('show');$('#trainingDrawerScrim')?.classList.add('show');syncUiLevelControls($('#trainingDrawer'))}
 toast(`已切換為${uiLevelName(level)}模式`)
}
function uiLevelSwitchHtml(){
 const cur=uiLevel();
 return `<div class="ui-level-switch">${Object.entries(UI_LEVELS).map(([key,v])=>`<button type="button" class="${cur===key?'on':''}" data-ui-level="${key}">${v.name}<small>${v.short}</small></button>`).join('')}</div><div class="ui-level-hint">${esc(UI_LEVELS[cur].desc)}</div>`
}
function bindUiLevelSwitch(scope=document){
 syncUiLevelControls(scope);
 scope.querySelectorAll?.('[data-ui-level]').forEach(b=>b.onclick=()=>setUiLevel(b.dataset.uiLevel))
}
function renderTrainingDrawerVisibility(){
 const tab=$('#trainingDrawerTab');if(!tab)return;
 const onTrainingPage=!!$('#trainPage')?.classList.contains('active');
 // 一般訓練與歷史訓練編輯都屬於「目前正在操作的訓練」。
 // 只有離開訓練頁或沒有 activeWorkout 時才隱藏。
 const hasWorkout=!!data.activeWorkout;
 const shouldShow=onTrainingPage&&hasWorkout;
 tab.classList.toggle('show',shouldShow);applyTrainingDrawerTabPosition();
 if(!shouldShow)closeTrainingDrawer()
}
function closeTrainingDrawer(){
 $('#trainingDrawer')?.classList.remove('show');$('#trainingDrawerScrim')?.classList.remove('show');document.body.style.overflow=''
}
function openTrainingDrawer(){
 if(!data.activeWorkout)return;
 renderTrainingDrawer();$('#trainingDrawer').classList.add('show');$('#trainingDrawerScrim').classList.add('show');document.body.style.overflow='hidden'
}
function saveDrawerSetting(key,value,rerender=false){
 data.settings[key]=value;localStorage.setItem(APP_KEY,JSON.stringify(data));if(rerender)renderTrain();renderTrainingDrawer()
}
function sessionExerciseFromHistory(e){
 const ex=getExercise(e.exerciseId);
 if(e.type==='cardio')return{exerciseId:e.exerciseId,nameSnapshot:e.nameSnapshot,muscle:e.muscle,type:e.type,equipmentId:e.equipmentId||ex?.equipmentId||'',notes:'',inputUnit:exerciseInputUnit(e),sets:[],cardio:JSON.parse(JSON.stringify(e.cardio||{minutes:0,distanceKm:0,speed:0,incline:0,pace:''}))};
 return{exerciseId:e.exerciseId,nameSnapshot:e.nameSnapshot,muscle:e.muscle,type:e.type,equipmentId:e.equipmentId||ex?.equipmentId||'',notes:'',inputUnit:exerciseInputUnit(e),sets:(e.sets||[]).filter(s=>s.kind!=='warmup').map(s=>({...JSON.parse(JSON.stringify(s)),id:uid('s'),completed:false})),cardio:{minutes:0,distanceKm:0,speed:0,incline:0,pace:''}}
}
function openLoadHistoryToSession(){
 closeTrainingDrawer();
 const rows=[...data.workouts].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12);
 openModal('載入訓練紀錄',rows.length?rows.map(w=>`<div class="drawer-history-row">
   <div class="record-head"><div><b>${esc(w.name)}</b><div class="record-meta">${esc(w.date)} · ${(w.exercises||[]).length} 個動作</div></div></div>
   <div class="drawer-history-actions"><button class="btn ghost" data-history-add="${w.id}">加入目前清單</button><button class="btn primary" data-history-replace="${w.id}">取代目前清單</button></div>
 </div>`).join(''):'<div class="empty">目前沒有歷史訓練紀錄。</div>',()=>{
   $$('[data-history-add]').forEach(b=>b.onclick=()=>{const w=data.workouts.find(x=>x.id===b.dataset.historyAdd);if(!w)return;data.activeWorkout.exercises.push(...(w.exercises||[]).map(sessionExerciseFromHistory));saveActiveOnly(true);closeModal();toast('已載入紀錄到目前清單')});
   $$('[data-history-replace]').forEach(b=>b.onclick=()=>{const w=data.workouts.find(x=>x.id===b.dataset.historyReplace);if(!w)return;if(data.activeWorkout.exercises.length&&!confirm('取代目前全部動作？已輸入但尚未完成的內容會被移除。'))return;data.activeWorkout.exercises=(w.exercises||[]).map(sessionExerciseFromHistory);saveActiveOnly(true);closeModal();toast('已用歷史紀錄取代目前清單')})
 })
}
function saveActiveAsTemplate(){
 const w=data.activeWorkout;if(!w)return;closeTrainingDrawer();
 openModal('新增訓練計畫',`<div class="card"><div class="field"><label>課表名稱</label><input id="drawerTplName" value="${esc(w.name||'我的訓練計畫')}"></div><div class="small">會把目前 ${w.exercises.length} 個動作與組數存成「我的模板」，不會把已完成狀態存進去。</div><button class="btn primary" id="drawerTplSave" style="margin-top:12px">儲存為我的課表</button></div>`,()=>$('#drawerTplSave').onclick=()=>{
   const name=$('#drawerTplName').value.trim()||'我的訓練計畫';
   data.templates.push({id:uid('tpl'),name,nameEn:'',items:w.exercises.map(e=>({exerciseId:e.exerciseId,targetSets:Math.max(1,(e.sets||[]).length||n(getExercise(e.exerciseId)?.targetSets)||3)}))});
   save('從訓練建立課表',true);closeModal();toast('已新增訓練計畫')
 })
}
function toggleAllExerciseCards(){
 const list=data.activeWorkout?.exercises||[];if(!list.length)return;
 const allCollapsed=list.every(e=>e.uiCollapsed);
 list.forEach(e=>e.uiCollapsed=!allCollapsed);saveActiveOnly(true);renderTrainingDrawer()
}
function renderTrainingDrawer(){
 const w=data.activeWorkout,box=$('#trainingDrawerBody');if(!box||!w)return;
 $('#trainingDrawerDate').textContent=fmtDate(w.date);
 const allCollapsed=(w.exercises||[]).length&&(w.exercises||[]).every(e=>e.uiCollapsed);
 box.innerHTML=`<div class="drawer-section-title" style="margin-top:8px">顯示層次</div>
 <div class="card" style="padding:10px">${uiLevelSwitchHtml()}</div>
 <div class="drawer-menu">
   <button class="drawer-row" id="drawerEditList"><span class="drawer-row-icon">☷</span><span class="drawer-row-copy"><span class="drawer-row-title">編輯運動清單</span><span class="drawer-row-desc">調整動作順序</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row" id="drawerAddExercise"><span class="drawer-row-icon">＋</span><span class="drawer-row-copy"><span class="drawer-row-title">新增動作</span><span class="drawer-row-desc">加入器械或其他訓練動作</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row" id="drawerBodyStatus"><span class="drawer-row-icon">♡</span><span class="drawer-row-copy"><span class="drawer-row-title">今日身體狀況</span><span class="drawer-row-desc">${esc(bodyStatusSummary(todayBodyStatus(w.date)))}</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row" id="drawerAddPlan"><span class="drawer-row-icon">▱</span><span class="drawer-row-copy"><span class="drawer-row-title">新增訓練計畫</span><span class="drawer-row-desc">將目前動作清單存成我的課表</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row" id="drawerLoadHistory"><span class="drawer-row-icon">↶</span><span class="drawer-row-copy"><span class="drawer-row-title">載入紀錄</span><span class="drawer-row-desc">從過去訓練加入或取代目前清單</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row" id="drawerCollapseAll"><span class="drawer-row-icon">▤</span><span class="drawer-row-copy"><span class="drawer-row-title">${allCollapsed?'展開所有運動卡':'收起所有運動卡'}</span><span class="drawer-row-desc">快速縮短訓練畫面</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row danger" id="drawerDeleteWorkout"><span class="drawer-row-icon">⌫</span><span class="drawer-row-copy"><span class="drawer-row-title">${w.editingWorkoutId?'取消編輯紀錄':'刪除／放棄本次訓練'}</span></span><span class="drawer-row-arrow">›</span></button>
 </div>
 <div class="drawer-section-title">訓練設定</div>
 <div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">側邊工具位置</div><div class="drawer-setting-desc">可直接拖曳右側「訓練工具」標籤上下移動；預設在畫面最上方。</div></div><button class="btn small ghost" id="drawerResetTabPosition" type="button">回到最上方</button></div>
   <div class="drawer-setting" style="display:block"><div class="drawer-setting-copy"><div class="drawer-setting-title">本次重量輸入單位</div><div class="drawer-setting-desc">每個動作仍可個別切換。這裡可一次把所有重量型動作改成同一種器械標示單位。</div></div><div class="drawer-unit-actions"><button class="btn ghost" id="drawerAllKg" type="button">全部用 kg 輸入</button><button class="btn ghost" id="drawerAllLb" type="button">全部用 lb 輸入</button></div></div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">計時器位置</div><div class="drawer-setting-desc">開始休息時預設顯示方式</div></div><div class="drawer-radio"><label><input type="radio" name="drawerTimerPos" value="top" ${data.settings.restTimerPosition!=='floating'?'checked':''}>頂部</label><label><input type="radio" name="drawerTimerPos" value="floating" ${data.settings.restTimerPosition==='floating'?'checked':''}>小浮窗</label></div></div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">備註</div><div class="drawer-setting-desc">顯示動作提示與本次動作備註</div></div><label class="drawer-toggle"><input id="drawerNotes" type="checkbox" ${data.settings.trainingNotes!==false?'checked':''}><span></span></label></div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">自動載入</div><div class="drawer-setting-desc">新增動作時載入上次組數／重量／次數</div></div><label class="drawer-toggle"><input id="drawerAutoLoad" type="checkbox" ${data.settings.trainingAutoLoad!==false?'checked':''}><span></span></label></div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">間歇計時器</div><div class="drawer-setting-desc">完成一組後自動開始休息計時</div></div><label class="drawer-toggle"><input id="drawerIntervalTimer" type="checkbox" ${data.settings.trainingIntervalTimer!==false?'checked':''}><span></span></label></div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">時間到提示音</div><div class="drawer-setting-desc">提示音與支援裝置的短震動</div></div><label class="drawer-toggle"><input id="drawerRestSound" type="checkbox" ${data.settings.restTimerSound!==false?'checked':''}><span></span></label></div>
 </div>`;
 bindUiLevelSwitch(box);
 $('#drawerEditList').onclick=()=>{closeTrainingDrawer();openReorderModal()};
 $('#drawerAddExercise').onclick=()=>{closeTrainingDrawer();openExercisePicker(ex=>{data.activeWorkout.exercises.push(makeSessionExercise(ex,data.activeWorkout.date));saveActiveOnly(true)})};
 $('#drawerBodyStatus').onclick=()=>{const d=w.date;closeTrainingDrawer();openBodyStatusModal(d)};
 $('#drawerAddPlan').onclick=saveActiveAsTemplate;
 $('#drawerLoadHistory').onclick=openLoadHistoryToSession;
 $('#drawerCollapseAll').onclick=toggleAllExerciseCards;
 $('#drawerDeleteWorkout').onclick=()=>{closeTrainingDrawer();$('#cancelWorkout')?.click()};
 $$('input[name="drawerTimerPos"]').forEach(x=>x.onchange=()=>saveDrawerSetting('restTimerPosition',x.value));
 $('#drawerResetTabPosition').onclick=()=>{data.settings.trainingDrawerTabTop=8;localStorage.setItem(APP_KEY,JSON.stringify(data));applyTrainingDrawerTabPosition();toast('訓練工具已回到最上方')};
 $('#drawerAllKg').onclick=()=>{(w.exercises||[]).forEach(e=>{if(!['cardio','duration'].includes(e.type))e.inputUnit='kg'});saveActiveOnly(true);renderTrainingDrawer();toast('本次重量型動作已改為 kg 輸入')};
 $('#drawerAllLb').onclick=()=>{(w.exercises||[]).forEach(e=>{if(!['cardio','duration'].includes(e.type))e.inputUnit='lb'});saveActiveOnly(true);renderTrainingDrawer();toast('本次重量型動作已改為 lb 輸入')};
 $('#drawerNotes').onchange=e=>saveDrawerSetting('trainingNotes',e.target.checked,true);
 $('#drawerAutoLoad').onchange=e=>saveDrawerSetting('trainingAutoLoad',e.target.checked);
 $('#drawerIntervalTimer').onchange=e=>saveDrawerSetting('trainingIntervalTimer',e.target.checked);
 $('#drawerRestSound').onchange=e=>saveDrawerSetting('restTimerSound',e.target.checked)
}
function clampTrainingDrawerTabTop(top){
 const tab=$('#trainingDrawerTab'),h=tab?.offsetHeight||82;
 return Math.max(8,Math.min(n(top)||8,Math.max(8,window.innerHeight-h-8)))
}
function applyTrainingDrawerTabPosition(){
 const tab=$('#trainingDrawerTab');if(!tab)return;
 const top=clampTrainingDrawerTabTop(data.settings.trainingDrawerTabTop);
 data.settings.trainingDrawerTabTop=top;tab.style.top=top+'px'
}
function initTrainingDrawer(){
 const tab=$('#trainingDrawerTab'),close=$('#trainingDrawerClose'),scrim=$('#trainingDrawerScrim');if(!tab||tab.dataset.bound)return;
 tab.dataset.bound='1';applyTrainingDrawerTabPosition();
 let pointerId=null,startY=0,startTop=0,dragging=false,suppressClick=false;
 tab.addEventListener('click',e=>{
   if(suppressClick){suppressClick=false;e.preventDefault();return}
   openTrainingDrawer()
 });
 tab.addEventListener('pointerdown',e=>{
   if(e.button!=null&&e.button!==0)return;
   pointerId=e.pointerId;startY=e.clientY;startTop=parseFloat(tab.style.top)||clampTrainingDrawerTabTop(data.settings.trainingDrawerTabTop);
   dragging=false
 });
 tab.addEventListener('pointermove',e=>{
   if(pointerId==null||e.pointerId!==pointerId)return;
   const dy=e.clientY-startY;
   // 手指自然晃動不算拖曳；超過 10px 才開始拖。
   if(!dragging&&Math.abs(dy)<10)return;
   if(!dragging){dragging=true;tab.classList.add('dragging');tab.setPointerCapture?.(pointerId)}
   const top=clampTrainingDrawerTabTop(startTop+dy);tab.style.top=top+'px';e.preventDefault()
 });
 const finishPointer=e=>{
   if(pointerId==null||e.pointerId!==pointerId)return;
   if(dragging){
     const top=clampTrainingDrawerTabTop(parseFloat(tab.style.top)||8);
     tab.style.top=top+'px';data.settings.trainingDrawerTabTop=top;localStorage.setItem(APP_KEY,JSON.stringify(data));
     suppressClick=true;tab.classList.remove('dragging');tab.releasePointerCapture?.(pointerId)
   }
   dragging=false;pointerId=null
 };
 tab.addEventListener('pointerup',finishPointer);
 tab.addEventListener('pointercancel',finishPointer);
 close.onclick=closeTrainingDrawer;scrim.onclick=closeTrainingDrawer;
 window.addEventListener('resize',()=>{applyTrainingDrawerTabPosition()},{passive:true})
}
function renderTrain(){
 $('#trainLanding').innerHTML=data.activeWorkout?'':`${bodyStatusCardHtml(isoToday())}<div class="card"><div class="hero"><div><h2>開始今天的訓練</h2><p>有目前計畫時建議依 A／B／C 順序訓練；也可以從「我的模板」或 ${SYSTEM_PROGRAMS.length} 套系統課表開始。</p></div><div class="actions"><button class="btn primary" id="trainStartBtn">我的模板</button><button class="btn ghost" id="browseProgramsBtn">系統課表庫</button></div></div></div><div class="section">長期課表與目前計畫</div><div id="trainCoachPicks">${goalProgramRecommendationsHtml()}</div>`;
 if(!data.activeWorkout){$('#activeWorkout').innerHTML='';renderTrainingDrawerVisibility();bindBodyStatusButtons($('#trainLanding'));bindProgramCards($('#trainCoachPicks'));const b=$('#trainStartBtn');if(b)b.onclick=openStartModal;const bp=$('#browseProgramsBtn');if(bp)bp.onclick=()=>{goPage('settingsPage');setTimeout(()=>$('#programSearch')?.focus(),50)};return}
 const w=data.activeWorkout;
 const pre=w.preStatus||{};
 const isHistoryEdit=!!w.editingWorkoutId;
 const dayStatus=todayBodyStatus(w.date),dayStrong=(dayStatus.entries||[]).some(x=>x.type==='pain'||n(x.level)>=3);
 let html=`${(dayStatus.entries||[]).length?`<div class="body-status-banner ${dayStrong?'strong':''}"><div class="record-head"><div><div class="body-status-banner-title">今天有身體狀況標記</div><div class="body-status-banner-copy">${esc(bodyStatusSummary(dayStatus))}。相關動作會另外顯示提醒。</div></div><button class="btn small ghost" type="button" data-open-body-status="${esc(w.date)}">查看／修改</button></div><div class="body-status-tags">${bodyStatusTagsHtml(dayStatus)}</div></div>`:''}<div class="card">
  ${isHistoryEdit?'<div class="banner"><b>正在編輯歷史訓練紀錄</b><br>儲存後會更新原紀錄，不會新增一筆重複紀錄。</div>':''}
  <div class="record-head"><div><div class="record-title" style="font-size:19px">${esc(w.name)}</div><div class="record-meta">${esc(w.date)} · ${isHistoryEdit?'歷史紀錄編輯模式':'自動儲存中'} · <span id="uiLevelHeaderBadge" class="ui-mode-current">${esc(uiLevelName())}模式</span></div></div><div class="actions"><button class="btn small ghost" id="editSessionMeta">設定</button><button class="btn small primary" id="openTrainingTools">☰ 工具</button></div></div>
  <div class="tagrow" style="margin-top:9px"><span class="tag">精神 ${pre.energy||'—'}/5</span><span class="tag">睡眠 ${pre.sleep||'—'}/5</span><span class="tag">疲勞 ${pre.fatigue||'—'}/5</span>${w.deload?'<span class="tag">Deload</span>':''}</div>
  ${w.programDayMeta?`<div class="day-focus-live"><div class="small">今日訓練重點</div><div class="record-title" style="margin-top:3px">${esc(w.programDayMeta.dayTitle||'')}</div><div class="small" style="margin-top:5px;line-height:1.55">${esc(w.programDayMeta.focusSummary||'')}</div><div class="tagrow" style="margin-top:7px">${(w.programDayMeta.primaryMuscles||[]).length?`<span class="tag">主要：${esc(w.programDayMeta.primaryMuscles.join('・'))}</span>`:''}${w.programDayMeta.intensityLevel?`<span class="tag">強度：${esc(w.programDayMeta.intensityLevel)}</span>`:''}${w.programDayMeta.estimatedMinutes?`<span class="tag">約 ${n(w.programDayMeta.estimatedMinutes)} 分</span>`:''}</div>${w.programDayMeta.coachNote?`<div class="small" style="margin-top:7px"><b>提示：</b>${esc(w.programDayMeta.coachNote)}</div>`:''}</div>`:''}
  ${w.pain?`<div class="warnbox" style="margin-top:10px">不適紀錄：${esc(w.pain)}</div>`:''}
 </div>`;
 html+=`<div class="card rest-quick-card"><div class="record-head"><div><b>休息計時器</b><div class="record-meta">完成一組後會依該動作休息時間自動顯示在最上層</div></div><button class="btn small ghost" id="timerShow">顯示</button></div><div class="quick"><button class="btn ghost" data-timer="60">60秒</button><button class="btn ghost" data-timer="90">90秒</button><button class="btn ghost" data-timer="120">120秒</button><button class="btn ghost" data-timer="180">180秒</button></div></div>`;
 html+=`<div id="sessionExercises">${(w.exercises||[]).map((e,i)=>sessionExerciseHtml(e,i)).join('')}</div>`;
 html+=`<div class="actions"><button class="btn ghost" id="sessionAddEx">＋ 加動作</button><button class="btn ghost" id="sessionReorder">調整順序</button></div>
 <div class="sticky-actions"><div class="actions"><button class="btn good" id="finishWorkout">${isHistoryEdit?'✓ 儲存修改':'✓ 完成本次訓練'}</button><button class="btn danger" id="cancelWorkout">${isHistoryEdit?'取消編輯':'放棄'}</button></div></div>`;
 $('#activeWorkout').innerHTML=html;
 bindSessionEvents();bindBodyStatusButtons($('#activeWorkout'));renderTimer();renderTrainingDrawerVisibility();maybeStartWorkoutTutorial()
}
function sessionExerciseHtml(e,idx){
 const ex=getExercise(e.exerciseId)||{name:e.nameSnapshot,muscle:e.muscle,type:e.type,rest:data.settings.defaultRest,notes:''};
 const bodyMatch=bodyStatusExerciseMatch(ex,data.activeWorkout.date);
 const last=getLastExerciseRecord(e.exerciseId,wDateBefore(data.activeWorkout.date));
 const adv=progressionAdvice(e.exerciseId);
 let body='';
 if(e.type==='cardio'){
   body=`<div class="grid2"><div class="field"><label>時間（分鐘）</label><input data-cardio="minutes" data-e="${idx}" type="number" min="0" value="${n(e.cardio?.minutes)}"></div><div class="field"><label>距離 km</label><input data-cardio="distanceKm" data-e="${idx}" type="number" step=".01" min="0" value="${n(e.cardio?.distanceKm)}"></div><div class="field"><label>平均速度 km/h</label><input data-cardio="speed" data-e="${idx}" type="number" step=".1" min="0" value="${n(e.cardio?.speed)}"></div><div class="field"><label>坡度 %</label><input data-cardio="incline" data-e="${idx}" type="number" step=".1" min="0" value="${n(e.cardio?.incline)}"></div></div>`
 }else{
   body=(e.sets||[]).map((s,si)=>setRowHtml(e,s,idx,si)).join('')+`<button class="btn small ghost" data-addset="${idx}">＋ 加一組</button>`
 }
 const lastText=last?lastExerciseSummary(last.exercise):'無上次紀錄';
 const showNotes=data.settings.trainingNotes!==false,inputUnit=exerciseInputUnit(e);
 const unitTools=!['cardio','duration'].includes(e.type)?`<div class="exercise-unit-line"><span class="exercise-unit-label">器械重量標示</span><span class="exercise-unit-toggle"><button type="button" class="${inputUnit==='kg'?'on':''}" data-ex-unit="${idx},kg">kg</button><button type="button" class="${inputUnit==='lb'?'on':''}" data-ex-unit="${idx},lb">lb</button></span><span class="exercise-unit-note">${inputUnit==='lb'?'<b>輸入 lb</b>，App 會自動換算成 kg 標準值儲存；例如 100 lb ≈ 45.4 kg。':'<b>輸入 kg</b>，內部直接以 kg 標準值儲存。'}</span></div>`:'';
 return `<div class="workout-ex ${e.uiCollapsed?'collapsed':''}" data-exblock="${idx}">
  <div class="workout-ex-head"><div><div class="exercise-title-line"><div class="record-title">${idx+1}. ${esc(ex.name||e.nameSnapshot)} <span class="pill">${esc(e.muscle)}</span></div><div class="exercise-title-tools"><button class="btn ghost" type="button" data-ex-info="${idx}" aria-label="查看動作說明">ⓘ 說明</button></div></div>${unitTools}<div class="record-meta">上次：${esc(lastText)}</div>${bodyMatch?`<div class="exercise-body-warning ${bodyMatch.strong?'strong':''}">今日相關部位：${esc(bodyMatch.text)}。${bodyMatch.strong?'先不要勉強加重；若動作引發疼痛或活動受限，可停止這個動作。':'先用輕重量暖身，確認活動舒服再決定是否照原計畫。'}</div>`:''}${adv?`<div class="small ${adv.state==='up'?'good':adv.state==='down'?'warn':''}" style="margin-top:5px">${esc(adv.text)}</div>`:''}${showNotes&&ex.notes?`<div class="small" style="margin-top:5px">器材/動作備註：${esc(ex.notes)}</div>`:''}</div>
  <div class="actions"><button class="btn small ghost exercise-collapse-btn" data-collapseex="${idx}" aria-label="${e.uiCollapsed?'展開':'收合'}">${e.uiCollapsed?'⌄':'⌃'}</button><button class="btn small ghost" data-replace="${idx}">替換</button><button class="btn small danger" data-removeex="${idx}">移除</button></div></div>
  <div class="workout-ex-body">${body}${showNotes?`<div class="field" style="margin-top:9px"><label>本次動作備註</label><input data-exnote="${idx}" value="${esc(e.notes||'')}" placeholder="例如：座椅 4、右肩有感"></div>`:''}</div>
 </div>`
}
function wDateBefore(date){const d=parseDate(date);d.setDate(d.getDate()+1);return isoDate(d)}
function lastExerciseSummary(e){
 if(e.type==='cardio')return `${n(e.cardio?.minutes)} 分 · ${n(e.cardio?.distanceKm)} km`;
 if(e.type==='duration')return (e.sets||[]).filter(s=>s.completed).map(s=>`${n(s.seconds)}秒`).join(' / ')||'—';
 const unit=exerciseInputUnit(e);
 if(e.type==='unilateral')return (e.sets||[]).filter(s=>s.completed).map(s=>`L ${fmtWeightNumber(s.leftWeight,unit)}${unit}×${n(s.leftReps)} / R ${fmtWeightNumber(s.rightWeight,unit)}${unit}×${n(s.rightReps)}`).join('；')||'—';
 return (e.sets||[]).filter(s=>s.completed).map(s=>`${fmtWeightNumber(s.weight,unit)}${unit}×${n(s.reps)}`).join(' / ')||'—'
}
function intensitySelect(s,eIdx,sIdx){
 if(data.settings.intensity==='RPE'){
   return `<select data-set="rpe" data-e="${eIdx}" data-s="${sIdx}" class="rircell" aria-label="主觀用力程度 RPE"><option value="">用力程度</option>${[6,6.5,7,7.5,8,8.5,9,9.5,10].map(v=>`<option value="${v}" ${String(s.rpe)===String(v)?'selected':''}>RPE ${v}</option>`).join('')}</select>`
 }
 return `<select data-set="rir" data-e="${eIdx}" data-s="${sIdx}" class="rircell" aria-label="剩餘次數 RIR"><option value="">剩餘次數</option>${[0,1,2,3,4,5].map(v=>`<option value="${v}" ${String(s.rir)===String(v)?'selected':''}>RIR ${v}</option>`).join('')}</select>`
}
function setRowHtml(e,s,ei,si){
 const kcls='kind-'+(s.kind||'working'),done=s.completed?'setdone':'',unit=exerciseInputUnit(e),inc=machineIncrementForUnit(getExercise(e.exerciseId),unit),bigInc=unit==='lb'?Math.max(10,inc*2):Math.max(5,inc*2);
 if(e.type==='duration')return `<div class="setrow duration ${kcls} ${done}"><div class="setnum">${si+1}</div><label class="set-field"><span class="set-field-label">時間（秒）</span><input data-set="seconds" data-e="${ei}" data-s="${si}" type="number" min="0" value="${n(s.seconds)}" placeholder="秒"></label>${intensitySelect(s,ei,si)}<button class="btn icon danger delcell" data-delset="${ei},${si}">−</button></div>`;
 if(e.type==='unilateral')return `<div class="setrow unilateral ${kcls} ${done}"><div class="setnum">${si+1}</div><label class="set-field"><span class="set-field-label">左重量（${unit}）</span><input data-set="leftWeight" data-e="${ei}" data-s="${si}" type="number" step=".1" value="${fmtWeightNumber(s.leftWeight,unit)}" placeholder="左${unit}"></label><label class="set-field"><span class="set-field-label">左次數</span><input data-set="leftReps" data-e="${ei}" data-s="${si}" type="number" value="${n(s.leftReps)}" placeholder="左次"></label><label class="set-field"><span class="set-field-label">右重量（${unit}）</span><input data-set="rightWeight" data-e="${ei}" data-s="${si}" type="number" step=".1" value="${fmtWeightNumber(s.rightWeight,unit)}" placeholder="右${unit}"></label>${intensitySelect(s,ei,si)}<button class="btn icon danger delcell" data-delset="${ei},${si}">−</button><div class="small" style="grid-column:2/-1"><label class="set-field" style="width:110px;display:inline-grid"><span class="set-field-label">右次數</span><input data-set="rightReps" data-e="${ei}" data-s="${si}" type="number" value="${n(s.rightReps)}"></label> <span class="weight-unit-suffix">重量以 ${unit} 輸入</span></div></div>`;
 const weightVal=fmtWeightNumber(s.weight,unit);
 return `<div class="setrow ${kcls} ${done}"><div class="setnum">${si+1}</div><label class="set-field"><span class="set-field-label">${e.type==='bodyweight'?'附加／輔助重量':'重量'}（${unit}）</span><input data-set="weight" data-e="${ei}" data-s="${si}" type="number" step=".1" value="${weightVal}" placeholder="${unit}"></label><label class="set-field"><span class="set-field-label">次數</span><input data-set="reps" data-e="${ei}" data-s="${si}" type="number" min="0" value="${n(s.reps)}" placeholder="次數"></label>${intensitySelect(s,ei,si)}<button class="btn icon danger delcell" data-delset="${ei},${si}">−</button>
 <div class="quick advanced-set-quick" style="grid-column:2/-1"><button class="btn ghost" data-weight-delta="${ei},${si},${-bigInc}">−${cleanWeightNumber(bigInc)}${unit}</button><button class="btn ghost" data-weight-delta="${ei},${si},${-inc}">−${cleanWeightNumber(inc)}${unit}</button><button class="btn ghost" data-weight-delta="${ei},${si},${inc}">+${cleanWeightNumber(inc)}${unit}</button><button class="btn ghost" data-weight-delta="${ei},${si},${bigInc}">+${cleanWeightNumber(bigInc)}${unit}</button><button class="btn ghost" data-delta="${ei},${si},reps,-1">次數−1</button><button class="btn ghost" data-delta="${ei},${si},reps,1">次數+1</button><button class="btn ghost" data-copy="${ei},${si}">同上一組</button><button class="btn ${s.completed?'good':'primary'}" data-complete="${ei},${si}">${s.completed?'已完成':'完成這組'}</button>${s.completed?`<div class="simple-effort ui-simple-only"><button class="btn ghost" type="button" data-simple-effort="${ei},${si},easy">太輕鬆</button><button class="btn ghost" type="button" data-simple-effort="${ei},${si},ok">剛剛好</button><button class="btn ghost" type="button" data-simple-effort="${ei},${si},hard">太吃力</button></div>`:''}<select class="set-kind-advanced ui-advanced-only" data-kind="${ei},${si}" style="width:auto;min-height:34px;padding:5px 7px;font-size:11px" aria-label="訓練組別">${KINDS.map(([v,l])=>`<option value="${v}" ${s.kind===v?'selected':''}>${l}</option>`).join('')}</select></div></div>`
}
function bindSessionEvents(){
 $$('#activeWorkout [data-set]').forEach(el=>el.addEventListener('change',()=>{const ei=n(el.dataset.e),si=n(el.dataset.s),key=el.dataset.set,ex=data.activeWorkout.exercises[ei],set=ex.sets[si],weightKeys=['weight','leftWeight','rightWeight'];set[key]=el.value===''?'':(weightKeys.includes(key)?toKg(el.value,exerciseInputUnit(ex)):n(el.value));saveActiveOnly()}));
 $$('#activeWorkout [data-cardio]').forEach(el=>el.addEventListener('change',()=>{data.activeWorkout.exercises[n(el.dataset.e)].cardio[el.dataset.cardio]=n(el.value);saveActiveOnly()}));
 $$('#activeWorkout [data-exnote]').forEach(el=>el.addEventListener('change',()=>{data.activeWorkout.exercises[n(el.dataset.exnote)].notes=el.value;saveActiveOnly()}));
 $$('#activeWorkout [data-addset]').forEach(b=>b.onclick=()=>{const e=data.activeWorkout.exercises[n(b.dataset.addset)],prev=e.sets[e.sets.length-1]||{};e.sets.push({id:uid('s'),kind:'working',weight:n(prev.weight),reps:n(prev.reps),rir:'',rpe:'',seconds:n(prev.seconds),leftWeight:n(prev.leftWeight),rightWeight:n(prev.rightWeight),leftReps:n(prev.leftReps),rightReps:n(prev.rightReps),completed:false});saveActiveOnly(true)});
 $$('#activeWorkout [data-delset]').forEach(b=>b.onclick=()=>{const [ei,si]=b.dataset.delset.split(',').map(Number);data.activeWorkout.exercises[ei].sets.splice(si,1);saveActiveOnly(true)});
 $$('#activeWorkout [data-delta]').forEach(b=>b.onclick=()=>{const [ei,si,key,delta]=b.dataset.delta.split(',');const s=data.activeWorkout.exercises[n(ei)].sets[n(si)];s[key]=Math.max(0,n(s[key])+n(delta));saveActiveOnly(true)});
 $$('#activeWorkout [data-weight-delta]').forEach(b=>b.onclick=()=>{const [ei,si,delta]=b.dataset.weightDelta.split(','),ex=data.activeWorkout.exercises[n(ei)],s=ex.sets[n(si)];s.weight=Math.max(0,n(s.weight)+toKg(delta,exerciseInputUnit(ex)));saveActiveOnly(true)});
 $$('#activeWorkout [data-ex-unit]').forEach(b=>b.onclick=()=>{const [ei,unit]=b.dataset.exUnit.split(','),ex=data.activeWorkout.exercises[n(ei)];ex.inputUnit=normalizeWeightUnit(unit);saveActiveOnly(true);toast(`這個動作改用 ${ex.inputUnit} 輸入，實際重量會自動換算`)});

 $$('#activeWorkout [data-copy]').forEach(b=>b.onclick=()=>{const [ei,si]=b.dataset.copy.split(',').map(Number);if(si<1)return;const prev=data.activeWorkout.exercises[ei].sets[si-1],cur=data.activeWorkout.exercises[ei].sets[si];['weight','reps','seconds','leftWeight','rightWeight','leftReps','rightReps'].forEach(k=>cur[k]=prev[k]);saveActiveOnly(true)});
 $$('#activeWorkout [data-complete]').forEach(b=>b.onclick=()=>{const [ei,si]=b.dataset.complete.split(',').map(Number),e=data.activeWorkout.exercises[ei],s=e.sets[si];s.completed=!s.completed;saveActiveOnly(true);if(s.completed&&data.settings.trainingIntervalTimer!==false){const ex=getExercise(e.exerciseId),nextNo=si+2;startTimer(n(ex?.rest)||n(data.settings.defaultRest)||90,`${ex?.name||e.nameSnapshot} · 準備第 ${nextNo} 組`)}});
 $$('#activeWorkout [data-kind]').forEach(el=>el.onchange=()=>{const [ei,si]=el.dataset.kind.split(',').map(Number);data.activeWorkout.exercises[ei].sets[si].kind=el.value;saveActiveOnly(true)});
 $$('#activeWorkout [data-simple-effort]').forEach(b=>b.onclick=()=>{const [ei,si,feel]=b.dataset.simpleEffort.split(','),s=data.activeWorkout.exercises[n(ei)].sets[n(si)];s.rir=feel==='easy'?4:feel==='ok'?2:0;s.rpe='';saveActiveOnly(true);toast(feel==='easy'?'已記錄：太輕鬆':feel==='ok'?'已記錄：剛剛好':'已記錄：太吃力')});
 $$('#activeWorkout [data-removeex]').forEach(b=>b.onclick=()=>{if(confirm('移除此動作？')){data.activeWorkout.exercises.splice(n(b.dataset.removeex),1);saveActiveOnly(true)}});
 $$('#activeWorkout [data-replace]').forEach(b=>b.onclick=()=>openReplaceModal(n(b.dataset.replace)));
 $$('#activeWorkout [data-ex-info]').forEach(b=>b.onclick=()=>{const e=data.activeWorkout.exercises[n(b.dataset.exInfo)],ex=getExercise(e?.exerciseId);if(ex)showExerciseDetail(ex.id)});
 $('#sessionAddEx').onclick=()=>openExercisePicker(ex=>{const added=makeSessionExercise(ex,data.activeWorkout.date);data.activeWorkout.exercises.push(added);saveActiveOnly(true)});
 $('#sessionReorder').onclick=openReorderModal;
 $('#editSessionMeta').onclick=openSessionMeta;
 $('#openTrainingTools').onclick=openTrainingDrawer;
 $$('#activeWorkout [data-collapseex]').forEach(b=>b.onclick=()=>{const e=data.activeWorkout.exercises[n(b.dataset.collapseex)];e.uiCollapsed=!e.uiCollapsed;saveActiveOnly(true)});
 $('#finishWorkout').onclick=finishWorkout;
 $('#cancelWorkout').onclick=()=>{const editing=!!data.activeWorkout?.editingWorkoutId;const msg=editing?'確定取消編輯？原本的歷史紀錄不會被更改。':'確定放棄這次訓練？';if(confirm(msg)){data.activeWorkout=null;save(editing?'取消歷史編輯':'放棄訓練',true);toast(editing?'已取消編輯':'已放棄')}}
 $$('#activeWorkout [data-timer]').forEach(b=>b.onclick=()=>startTimer(n(b.dataset.timer),'手動休息計時'));const ts=$('#timerShow');if(ts)ts.onclick=()=>{timerHidden=false;if(!timerEnd)startTimer(n(data.settings.defaultRest)||90,'手動休息計時');else renderTimer()};
}
function saveActiveOnly(rerender=false){localStorage.setItem(APP_KEY,JSON.stringify(data));if(rerender)renderTrain()}
let timerEnd=0,timerTotal=0,timerInterval=null,timerHidden=false,timerFinished=false,timerLabel='準備下一組',restAudioCtx=null;
function formatTimer(sec){sec=Math.max(0,Math.ceil(n(sec)));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function primeRestAudio(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;if(!restAudioCtx)restAudioCtx=new C();if(restAudioCtx.state==='suspended')restAudioCtx.resume()}catch(e){}}
function playRestSound(){
 if(data.settings.restTimerSound===false)return;
 try{
   primeRestAudio();
   if(restAudioCtx){
     const now=restAudioCtx.currentTime;
     // 約 3 秒提示音：每 0.45 秒一個短提示，避免單一長音過於刺耳。
     const tones=[660,880,660,880,660,880,660];
     tones.forEach((freq,i)=>{
       const o=restAudioCtx.createOscillator(),g=restAudioCtx.createGain(),t=now+i*.45;
       o.type='sine';o.frequency.setValueAtTime(freq,t);
       g.gain.setValueAtTime(.0001,t);
       g.gain.exponentialRampToValueAtTime(.16,t+.03);
       g.gain.exponentialRampToValueAtTime(.0001,t+.30);
       o.connect(g);g.connect(restAudioCtx.destination);
       o.start(t);o.stop(t+.32)
     })
   }
   // 約 3 秒震動節奏：震 350ms / 停 150ms，共 6 次。
   if(navigator.vibrate)navigator.vibrate([350,150,350,150,350,150,350,150,350,150,350])
 }catch(e){}
}
function startTimer(sec,label='準備下一組'){
 sec=Math.max(1,n(sec)||90);if(timerInterval)clearInterval(timerInterval);
 timerTotal=sec;timerEnd=Date.now()+sec*1000;timerLabel=label;timerHidden=data.settings.restTimerPosition==='floating';timerFinished=false;
 timerInterval=setInterval(renderTimer,250);renderTimer()
}
function stopTimer(showToast=true){
 if(timerInterval)clearInterval(timerInterval);timerInterval=null;timerEnd=0;timerTotal=0;timerFinished=false;timerHidden=false;renderTimer();if(showToast)toast('已跳過休息')
}
function adjustTimer(delta){
 if(!timerEnd)return;
 if(timerFinished&&delta>0){timerFinished=false;timerTotal=Math.max(10,n(delta));timerEnd=Date.now()+timerTotal*1000;timerInterval=setInterval(renderTimer,250)}
 else{timerEnd+=n(delta)*1000;if(timerEnd<=Date.now()){timerEnd=Date.now();finishTimer()}else if(timerFinished){timerFinished=false;timerInterval=setInterval(renderTimer,250)}}
 renderTimer()
}
function finishTimer(){
 if(timerFinished)return;timerFinished=true;if(timerInterval)clearInterval(timerInterval);timerInterval=null;playRestSound();toast('休息時間到，可以開始下一組');renderTimer()
}
function renderTimer(){
 const overlay=$('#restOverlay'),fab=$('#restFab'),time=$('#restOverlayTime'),fabTime=$('#restFabTime'),fill=$('#restOverlayFill'),sub=$('#restOverlaySub'),skip=$('#restSkipBtn');
 if(!overlay||!fab)return;
 if(!timerEnd){overlay.classList.add('rest-hidden');fab.classList.remove('show','done');return}
 const remain=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));
 if(remain<=0&&!timerFinished){finishTimer();return}
 time.textContent=timerFinished?'時間到':formatTimer(remain);time.classList.toggle('done',timerFinished);
 fabTime.textContent=timerFinished?'時間到':formatTimer(remain);sub.textContent=timerLabel||'準備下一組';
 const elapsed=Math.max(0,timerTotal-remain),pct=timerTotal?Math.min(100,elapsed/timerTotal*100):100;fill.style.width=pct+'%';
 overlay.classList.toggle('rest-hidden',timerHidden);fab.classList.toggle('show',timerHidden);fab.classList.toggle('done',timerFinished);
 if(skip)skip.textContent=timerFinished?'關閉':'跳過'
}
function initRestTimerUI(){
 const hide=$('#restHideBtn'),fab=$('#restFab'),minus=$('#restMinusBtn'),plus=$('#restPlusBtn'),skip=$('#restSkipBtn');
 if(!hide||hide.dataset.bound)return;hide.dataset.bound='1';
 hide.onclick=()=>{timerHidden=true;renderTimer()};
 fab.onclick=()=>{timerHidden=false;renderTimer()};
 minus.onclick=()=>adjustTimer(-10);plus.onclick=()=>adjustTimer(10);
 skip.onclick=()=>stopTimer(!timerFinished)
}
function makeSessionExercise(ex,date){
 const auto=data.settings.trainingAutoLoad!==false,last=auto?getLastExerciseRecord(ex.id,wDateBefore(date)):null,ownedEq=data.equipment.find(q=>q.systemEquipmentId&&q.systemEquipmentId===ex.equipmentId),inputUnit=normalizeWeightUnit(last?.exercise?.inputUnit||ownedEq?.weightUnit||data.settings.unit||'kg');let sets=[];
 if(ex.type==='cardio')return{exerciseId:ex.id,nameSnapshot:ex.name,muscle:ex.muscle,type:ex.type,equipmentId:ex.equipmentId||'',notes:'',inputUnit,sets:[],cardio:{minutes:auto?n(last?.exercise.cardio?.minutes):0,distanceKm:auto?n(last?.exercise.cardio?.distanceKm):0,speed:auto?n(last?.exercise.cardio?.speed):0,incline:auto?n(last?.exercise.cardio?.incline):0,pace:''}};
 const previousSets=last?.exercise.sets?.filter(s=>s.kind!=='warmup')||[];
 const count=auto&&previousSets.length?previousSets.length:(n(ex.targetSets)||3);
 for(let i=0;i<count;i++){const prev=auto?(previousSets[i]||previousSets[0]||{}):{};sets.push({id:uid('s'),kind:'working',weight:auto?n(prev.weight):0,reps:auto&&n(prev.reps)?n(prev.reps):(ex.type==='duration'?0:n(ex.repMin)||8),rir:'',rpe:'',seconds:auto&&n(prev.seconds)?n(prev.seconds):(ex.type==='duration'?n(ex.repMin)||30:0),leftWeight:auto?n(prev.leftWeight):0,rightWeight:auto?n(prev.rightWeight):0,leftReps:auto?n(prev.leftReps):0,rightReps:auto?n(prev.rightReps):0,completed:false})}
 return{exerciseId:ex.id,nameSnapshot:ex.name,muscle:ex.muscle,type:ex.type,equipmentId:ex.equipmentId||'',notes:'',inputUnit,sets,cardio:{minutes:0,distanceKm:0,speed:0,incline:0,pace:''}}
}
function openStartModal(){
 const tpl=data.templates.map(t=>`<button class="btn ghost" data-starttpl="${esc(t.id)}" style="width:100%;margin-bottom:8px;text-align:left">${esc(t.name)}<div class="small">${t.items.length} 個動作</div></button>`).join('');
 openModal('開始訓練',`<div class="field"><label>今天日期</label><input type="date" id="startDate" value="${isoToday()}"></div><div class="field"><label>我的模板</label>${tpl||'<div class="empty">尚無我的模板，可先從系統課表加入。</div>'}</div><div class="actions"><button class="btn primary" id="startBlank">空白訓練</button><button class="btn ghost" id="startBrowseSystem">瀏覽系統課表</button></div>`,()=>{
   $$('[data-starttpl]').forEach(b=>b.onclick=()=>{const d=$('#startDate').value;closeModal();startTemplate(b.dataset.starttpl,d)});
   $('#startBlank').onclick=()=>{const d=$('#startDate').value;closeModal();startBlank(d)};$('#startBrowseSystem').onclick=()=>{closeModal();goPage('settingsPage');setTimeout(()=>$('#programSearch')?.focus(),50)}
 })
}
function startTemplate(id,date=isoToday()){if(data.activeWorkout){goPage('trainPage');return}const t=data.templates.find(x=>x.id===id);if(!t)return;data.activeWorkout={id:uid('w'),date,name:t.name,duration:0,status:'active',startedAt:new Date().toISOString(),endedAt:'',notes:'',programDayMeta:t.dayMeta?JSON.parse(JSON.stringify(t.dayMeta)):null,gymId:'',gymNameSnapshot:'',deload:false,preStatus:{},pain:'',exercises:t.items.map(it=>{const ex=getExercise(it.exerciseId);return ex?makeSessionExercise({...ex,...it},date):null}).filter(Boolean)};save('開始訓練',true);openSessionMeta(true);goPage('trainPage')}
function startBlank(date=isoToday()){data.activeWorkout={id:uid('w'),date,name:'自由訓練',duration:0,status:'active',startedAt:new Date().toISOString(),endedAt:'',notes:'',gymId:'',gymNameSnapshot:'',deload:false,preStatus:{},pain:'',exercises:[]};save('開始訓練',true);openSessionMeta(true);goPage('trainPage')}
function openSessionMeta(first=false){
 const w=data.activeWorkout,p=w.preStatus||{};
 openModal(first?'訓練前狀態':'訓練設定',`<div class="grid2">
 <div class="field"><label>課表名稱</label><input id="smName" value="${esc(w.name)}"></div><div class="field"><label>日期</label><input type="date" id="smDate" value="${esc(w.date)}"></div>
 <div class="field"><label>訓練時間（分鐘）</label><input type="number" id="smDuration" min="0" max="1440" value="${n(w.duration)}"></div>
 <div class="field"><label>精神 1–5</label><input type="number" id="smEnergy" min="1" max="5" value="${p.energy||''}"></div><div class="field"><label>睡眠 1–5</label><input type="number" id="smSleep" min="1" max="5" value="${p.sleep||''}"></div>
 <div class="field"><label>疲勞 1–5</label><input type="number" id="smFatigue" min="1" max="5" value="${p.fatigue||''}"></div><div class="field"><label>健身房</label><input id="smGymName" list="smGymOptions" value="${esc(workoutGymName(w))}" placeholder="選擇或直接輸入新健身房"><datalist id="smGymOptions">${data.gyms.map(g=>`<option value="${esc(g.name)}"></option>`).join('')}</datalist><div class="hint">輸入新的名稱並儲存後，會自動加入健身房設定。</div></div></div>
 <div class="field"><label>疼痛 / 不適</label><input id="smPain" value="${esc(w.pain||'')}" placeholder="例如：右肩前側不適"></div>
 <div class="inline-check"><input type="checkbox" id="smDeload" ${w.deload?'checked':''}><label for="smDeload">這次是 Deload / 減量訓練</label></div>
 <button class="btn primary" id="smSave" style="margin-top:12px">儲存</button>`,()=>{$('#smSave').onclick=()=>{w.name=$('#smName').value.trim()||'未命名訓練';w.date=$('#smDate').value||isoToday();w.duration=clamp($('#smDuration').value,0,1440);const gym=ensureGymByName($('#smGymName').value);w.gymId=gym?.id||'';w.gymNameSnapshot=gym?.name||'';w.pain=$('#smPain').value.trim();w.deload=$('#smDeload').checked;w.preStatus={energy:clamp($('#smEnergy').value,0,5)||'',sleep:clamp($('#smSleep').value,0,5)||'',fatigue:clamp($('#smFatigue').value,0,5)||''};saveActiveOnly();closeModal();renderTrain()}})
}
function finishWorkout(){
 const w=data.activeWorkout;if(!w)return;const issues=validateWorkout(w);if(issues.length&&!confirm('偵測到可能的輸入異常：\n\n'+issues.slice(0,5).join('\n')+'\n\n仍要儲存嗎？'))return;
 const editingId=w.editingWorkoutId||'';
 if(editingId){
   const idx=data.workouts.findIndex(x=>x.id===editingId);if(idx<0){alert('找不到原本的訓練紀錄，無法儲存修改。');return}
   snapshot('歷史訓練編輯前');
   const updated=JSON.parse(JSON.stringify(w));
   delete updated.editingWorkoutId;
   updated.id=editingId;
   updated.status='completed';
   updated.duration=clamp(updated.duration,0,1440);
   data.workouts[idx]=updated;
   data.workouts.sort((a,b)=>b.date.localeCompare(a.date));
   data.activeWorkout=null;
   save('編輯訓練內容',false);
   const summary=`${updated.exercises.length} 個動作 · ${effectiveSets(updated)} 正式組 · ${fmtKg(workoutVolume(updated))} · 有氧 ${Math.round(cardioMinutes(updated))} 分`;
   openModal('修改已儲存',`<div class="card"><div class="record-title">${esc(updated.name)}</div><div class="small" style="margin-top:7px">${esc(summary)}</div></div><button class="btn primary" id="doneClose">完成</button>`,()=>$('#doneClose').onclick=()=>{closeModal();goPage('recordsPage')});
   return;
 }
 const started=w.startedAt?new Date(w.startedAt):null;w.endedAt=new Date().toISOString();w.status='completed';w.duration=w.duration||Math.max(1,Math.round((new Date(w.endedAt)-started)/60000));w.bodyStatusSnapshot=JSON.parse(JSON.stringify(todayBodyStatus(w.date)));data.workouts.push(JSON.parse(JSON.stringify(w)));data.workouts.sort((a,b)=>b.date.localeCompare(a.date));data.activeWorkout=null;save('完成訓練',true);
 const prs=countPRsInWorkout(w),summary=`${w.exercises.length} 個動作 · ${effectiveSets(w)} 正式組 · ${fmtKg(workoutVolume(w))} · 有氧 ${Math.round(cardioMinutes(w))} 分${prs?' · '+prs+' 個 PR':''}`;
 openModal('訓練完成',`<div class="card"><div class="record-title">${esc(w.name)}</div><div class="small" style="margin-top:7px">${esc(summary)}</div></div><button class="btn primary" id="doneClose">完成</button>`,()=>$('#doneClose').onclick=()=>{closeModal();goPage('homePage')})
}
function openExercisePicker(onPick){
 const state={q:'',scope:'all',muscles:new Set(),resistance:'all'};
 const recentMap=new Map();
 [...data.workouts].sort((a,b)=>b.date.localeCompare(a.date)).forEach(w=>(w.exercises||[]).forEach(e=>{if(e.exerciseId&&!recentMap.has(e.exerciseId))recentMap.set(e.exerciseId,w.date)}));

 const activeGym=(()=>{
   const w=data.activeWorkout;if(!w)return null;
   if(w.gymId){const g=data.gyms.find(x=>x.id===w.gymId);if(g)return g}
   return gymByName(w.gymNameSnapshot||'')
 })();
 const gymEquipment=new Set(activeGym?gymUsageInfo(activeGym).equipment.map(x=>x.id):[]);
 const ownedEquipment=new Set();
 (data.equipment||[]).forEach(e=>{if(e.systemEquipmentId)ownedEquipment.add(e.systemEquipmentId);else if(e.id)ownedEquipment.add(e.id)});

 const resistanceLabels={
   selectorized:'插銷式器械',
   plate_loaded:'槓片式器械',
   cable:'滑輪',
   guided_bar:'Smith／導軌槓',
   bodyweight:'徒手',
   bodyweight_assisted:'輔助式徒手',
   cardio:'有氧器材'
 };
 const resistanceOptions=[...new Set(SYSTEM_EQUIPMENT.map(e=>e.resistance).filter(Boolean))];

 const exerciseEquipment=ex=>SYSTEM_EQUIPMENT.find(x=>x.id===ex.equipmentId);
 const isNoEquipment=ex=>!ex.equipmentId||['bodyweight','duration'].includes(ex.type);
 const scopeMatches=ex=>{
   if(state.scope==='recent')return recentMap.has(ex.id);
   if(state.scope==='mine')return ex.system===false;
   if(state.scope==='gym')return isNoEquipment(ex)||gymEquipment.has(ex.equipmentId);
   if(state.scope==='equipment')return isNoEquipment(ex)||ownedEquipment.has(ex.equipmentId);
   return true
 };
 const queryMatches=ex=>{
   if(!state.q)return true;
   const eq=exerciseEquipment(ex);
   const brand=(eq?.brandModels||[]).map(x=>`${x.brand} ${x.series} ${x.model} ${x.name}`).join(' ');
   const txt=`${ex.name} ${ex.nameEn||''} ${(ex.aliases||[]).join(' ')} ${eq?.nameZh||''} ${eq?.nameEn||''} ${(eq?.aliases||[]).join(' ')} ${brand}`.toLowerCase();
   return txt.includes(state.q)
 };
 const muscleMatches=ex=>!state.muscles.size||state.muscles.has(ex.muscle);
 const resistanceMatches=ex=>{
   if(state.resistance==='all')return true;
   const eq=exerciseEquipment(ex);
   if(state.resistance==='none')return isNoEquipment(ex);
   return eq?.resistance===state.resistance
 };
 const sortedResults=()=>{
   const list=data.exerciseLibrary.filter(ex=>queryMatches(ex)&&scopeMatches(ex)&&muscleMatches(ex)&&resistanceMatches(ex));
   return list.sort((a,b)=>{
     if(state.scope==='recent')return (recentMap.get(b.id)||'').localeCompare(recentMap.get(a.id)||'');
     const ac=a.system===false?1:0,bc=b.system===false?1:0;if(ac!==bc)return bc-ac;
     const ar=recentMap.get(a.id)||'',br=recentMap.get(b.id)||'';if(ar!==br)return br.localeCompare(ar);
     return a.name.localeCompare(b.name,'zh-Hant')
   })
 };
 const renderRows=list=>list.map(ex=>{
   const recent=recentMap.get(ex.id);
   const base=exercisePickerRowHtml(ex);
   return recent?base.replace('</div>\n </div>',`<div class="exercise-picker-recent">最近：${esc(recent)}</div></div>\n </div>`):base
 }).join('')||'<div class="empty">找不到符合目前篩選條件的動作。<br><span class="small">可以清除篩選或改用其他搜尋字。</span></div>';

 const scopeLabel=()=>{
   if(state.scope==='recent')return'最近做過';
   if(state.scope==='mine')return'我的動作';
   if(state.scope==='gym')return`目前健身房${activeGym?' · '+activeGym.name:''}`;
   if(state.scope==='equipment')return'我的器材';
   return''
 };
 const renderSummary=()=>{
   const tags=[];
   if(state.q)tags.push(`搜尋：${state.q}`);
   if(state.scope!=='all')tags.push(scopeLabel());
   state.muscles.forEach(m=>tags.push(m));
   if(state.resistance!=='all')tags.push(state.resistance==='none'?'無器材':(resistanceLabels[state.resistance]||state.resistance));
   const results=sortedResults();
   $('#pickCount').textContent=`找到 ${results.length} 個動作`;
   $('#pickTags').innerHTML=tags.map(t=>`<span class="exercise-filter-tag">${esc(t)}</span>`).join('');
   $('#pickClear').style.visibility=tags.length?'visible':'hidden';
   $('#pickList').innerHTML=renderRows(results);
   bindRows();
   syncControls()
 };
 const syncControls=()=>{
   $$('#pickerQuick [data-picker-scope]').forEach(b=>b.classList.toggle('on',b.dataset.pickerScope===state.scope));
   $$('#pickerMuscles [data-picker-muscle]').forEach(b=>b.classList.toggle('on',state.muscles.has(b.dataset.pickerMuscle)));
   const sel=$('#pickResistance');if(sel)sel.value=state.resistance
 };
 const bindRows=()=>{
   $$('#pickList [data-pick]').forEach(b=>b.onclick=()=>{const ex=getExercise(b.dataset.pick);closeModal();onPick(ex)});
   $$('#pickList [data-pick-info]').forEach(b=>b.onclick=()=>{const ex=getExercise(b.dataset.pickInfo);if(ex)showExerciseDetail(ex.id)})
 };

 const gymLabel=activeGym?`目前健身房`:'目前健身房（未設定）';
 openModal('選擇動作',`<div class="exercise-filter-bar">
   <div class="field" style="margin-bottom:0"><label>搜尋動作／英文名稱／器械</label><input id="pickSearch" placeholder="Lat Pulldown、腿推、RSL0314..."></div>
   <div class="exercise-filter-quick" id="pickerQuick">
     <button type="button" class="on" data-picker-scope="all">全部</button>
     <button type="button" data-picker-scope="recent">最近做過</button>
     <button type="button" data-picker-scope="mine">我的動作</button>
     <button type="button" data-picker-scope="gym" ${activeGym&&gymEquipment.size?'':'disabled'}>${esc(gymLabel)}</button>
     <button type="button" data-picker-scope="equipment" ${ownedEquipment.size?'':'disabled'}>我的器材</button>
   </div>
   <div>
     <div class="small" style="margin-bottom:5px">肌群（可多選）</div>
     <div class="exercise-muscle-chips" id="pickerMuscles">${MUSCLES.filter(m=>m!=='其他').map(m=>`<button type="button" data-picker-muscle="${esc(m)}">${esc(m)}</button>`).join('')}</div>
   </div>
   <div class="exercise-filter-row">
     <div class="field" style="margin:0"><label>器材類型</label><select id="pickResistance">
       <option value="all">全部器材類型</option>
       ${resistanceOptions.map(r=>`<option value="${esc(r)}">${esc(resistanceLabels[r]||r)}</option>`).join('')}
       <option value="none">無器材／其他</option>
     </select></div>
     <button class="btn ghost exercise-filter-clear" type="button" id="pickClear">清除篩選</button>
   </div>
   <div class="exercise-filter-summary"><div class="exercise-filter-tags" id="pickTags"></div><div class="exercise-filter-count" id="pickCount"></div></div>
 </div>
 <div id="pickList" class="exercise-picker-list"></div>`,()=>{
   $('#pickSearch').oninput=()=>{state.q=$('#pickSearch').value.trim().toLowerCase();renderSummary()};
   $$('#pickerQuick [data-picker-scope]').forEach(b=>b.onclick=()=>{if(b.disabled)return;state.scope=b.dataset.pickerScope;renderSummary()});
   $$('#pickerMuscles [data-picker-muscle]').forEach(b=>b.onclick=()=>{const m=b.dataset.pickerMuscle;state.muscles.has(m)?state.muscles.delete(m):state.muscles.add(m);renderSummary()});
   $('#pickResistance').onchange=()=>{state.resistance=$('#pickResistance').value;renderSummary()};
   $('#pickClear').onclick=()=>{state.q='';state.scope='all';state.muscles.clear();state.resistance='all';$('#pickSearch').value='';renderSummary()};
   renderSummary()
 })
}
function openReplaceModal(idx){
 const current=data.activeWorkout.exercises[idx],ex=getExercise(current.exerciseId),alts=(ex?.alternatives||[]).map(getExercise).filter(Boolean);
 const list=[...alts,...data.exerciseLibrary.filter(x=>!alts.some(a=>a.id===x.id)&&x.id!==current.exerciseId&&x.muscle===current.muscle)];
 openModal('替換動作',list.map(x=>`<button class="btn ghost" data-rp="${x.id}" style="width:100%;margin-bottom:7px;text-align:left">${esc(x.name)}<div class="small">${esc(x.muscle)}</div></button>`).join('')||'<div class="empty">沒有替代動作</div>',()=>$$('[data-rp]').forEach(b=>b.onclick=()=>{const replacement=makeSessionExercise(getExercise(b.dataset.rp),data.activeWorkout.date);data.activeWorkout.exercises[idx]=replacement;saveActiveOnly(true);closeModal()}))
}
function openReorderModal(){
 const w=data.activeWorkout;if(!w)return;
 const original=[...w.exercises];
 const rows=original.map((e,i)=>`<div class="reorder-item" data-reorder-key="${i}">
   <button class="reorder-handle" type="button" data-reorder-handle aria-label="拖曳 ${esc(e.nameSnapshot)}">☷</button>
   <div class="reorder-copy"><div class="reorder-name"><span data-reorder-number>${i+1}</span>. ${esc(e.nameSnapshot)}</div><div class="reorder-meta">按住左側把手上下拖曳</div></div>
 </div>`).join('');
 openModal('調整動作順序',`<div class="reorder-help">直接拖曳左側 ☷ 把手調整順序。放開後會立即儲存，訓練畫面也會同步更新。</div><div class="reorder-list" id="reorderList">${rows}</div><button class="btn primary" id="reorderDone" type="button" style="width:100%;margin-top:12px">完成</button>`,()=>{
   const list=$('#reorderList');if(!list)return;
   let dragRow=null,pointerId=null,handle=null;
   const renumber=()=>$$('#reorderList [data-reorder-number]').forEach((el,i)=>el.textContent=i+1);
   const clearDragState=()=>{
     $$('#reorderList .reorder-item').forEach(row=>{row.classList.remove('dragging','drag-target');row.style.removeProperty('background');row.style.removeProperty('border-color');row.style.removeProperty('opacity')});
     if(handle&&pointerId!=null){try{handle.releasePointerCapture?.(pointerId)}catch(e){}}
     dragRow=null;pointerId=null;handle=null
   };
   const persistOrder=()=>{
     const order=$$('#reorderList .reorder-item').map(row=>n(row.dataset.reorderKey));
     w.exercises=order.map(i=>original[i]);
     localStorage.setItem(APP_KEY,JSON.stringify(data));
     renderTrain()
   };
   $$('#reorderList [data-reorder-handle]').forEach(h=>{
     h.addEventListener('pointerdown',e=>{
       if(e.button!=null&&e.button!==0)return;
       clearDragState();handle=h;pointerId=e.pointerId;dragRow=h.closest('.reorder-item');
       dragRow?.classList.add('dragging');h.setPointerCapture?.(pointerId);e.preventDefault()
     });
     h.addEventListener('pointermove',e=>{
       if(!dragRow||e.pointerId!==pointerId)return;
       $$('#reorderList .reorder-item').forEach(row=>row.classList.remove('drag-target'));
       const target=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.reorder-item');
       if(!target||target===dragRow||!list.contains(target))return;
       target.classList.add('drag-target');
       const rect=target.getBoundingClientRect();
       if(e.clientY<rect.top+rect.height/2)list.insertBefore(dragRow,target);
       else list.insertBefore(dragRow,target.nextSibling);
       renumber();e.preventDefault()
     });
     const finish=e=>{
       if(!dragRow||e.pointerId!==pointerId)return;
       persistOrder();
       clearDragState();
       renumber();
       toast('動作順序已更新')
     };
     h.addEventListener('pointerup',finish);
     h.addEventListener('pointercancel',finish)
   });
   $('#reorderDone').onclick=()=>{persistOrder();clearDragState();closeModal();renderTrain()}
 })
}

function renderRecords(){
 const mus=$('#recordMuscle');if(!mus.options.length)mus.innerHTML='<option value="">全部肌群</option>'+MUSCLES.map(m=>`<option>${m}</option>`).join('');
 if(!$('#recordMonth').value)$('#recordMonth').value=monthKey();
 const mk=$('#recordMonth').value,filter=$('#recordMuscle').value;
 renderCalendar(mk);
 const filtered=data.workouts.filter(w=>w.date.startsWith(mk)&&(!filter||(w.exercises||[]).some(e=>e.muscle===filter))).sort((a,b)=>b.date.localeCompare(a.date));
 $('#recordList').innerHTML=filtered.length?filtered.map(workoutCardHtml).join(''):'<div class="card empty">這個月份沒有符合條件的紀錄。</div>';
 $$('#recordList [data-open]').forEach(b=>b.onclick=()=>editWorkout(b.dataset.open));
 $('#trashList').innerHTML=data.trash.length?data.trash.map(t=>`<div class="record"><div class="record-head"><div><b>${esc(t.item.name)}</b><div class="record-meta">刪除於 ${new Date(t.deletedAt).toLocaleString('zh-TW')}</div></div><div class="actions"><button class="btn small good" data-restore="${t.id}">復原</button><button class="btn small danger" data-purge="${t.id}">永久刪除</button></div></div></div>`).join(''):'<div class="card empty">回收筒是空的。</div>';
 $$('[data-restore]').forEach(b=>b.onclick=()=>{const t=data.trash.find(x=>x.id===b.dataset.restore);if(t){data.workouts.push(t.item);data.trash=data.trash.filter(x=>x.id!==t.id);save('復原紀錄',true);toast('已復原')}})
 $$('[data-purge]').forEach(b=>b.onclick=()=>{if(confirm('永久刪除後無法復原。確定？')){data.trash=data.trash.filter(x=>x.id!==b.dataset.purge);save('永久刪除',true)}})
}
function renderCalendar(mk){
 const [y,m]=mk.split('-').map(Number),first=new Date(y,m-1,1),last=new Date(y,m,0),heads=['日','一','二','三','四','五','六'];let html=heads.map(h=>`<div class="calhead">${h}</div>`).join('');
 for(let i=0;i<first.getDay();i++)html+='<div></div>';
 for(let d=1;d<=last.getDate();d++){const iso=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,ws=data.workouts.filter(w=>w.date===iso),has=ws.length,sets=has?effectiveSets({exercises:ws.flatMap(w=>w.exercises)}):0;html+=`<button class="calday ${iso===isoToday()?'today':''} ${has?'has':''}" data-day="${iso}" aria-label="${iso} ${has?`有訓練 ${ws.length} 次，共 ${sets} 個正式組`:'無訓練'}"><b>${d}</b>${has?`<span>${ws.length} 次 · ${sets} 組</span><span class="cal-status">✓ 已訓練</span>`:`<span class="cal-empty">—</span>`}</button>`}$('#calendar').innerHTML=html;$$('#calendar [data-day]').forEach(b=>b.onclick=()=>{const ws=data.workouts.filter(w=>w.date===b.dataset.day);if(ws.length)editWorkout(ws[0].id)})
}
function beginHistoryEdit(id){
 const original=data.workouts.find(x=>x.id===id);if(!original)return;
 if(data.activeWorkout){
   alert('目前有尚未完成的訓練。請先完成或放棄目前訓練，再編輯歷史紀錄。');
   return;
 }
 data.activeWorkout=JSON.parse(JSON.stringify(original));
 data.activeWorkout.editingWorkoutId=id;
 data.activeWorkout.status='active';
 localStorage.setItem(APP_KEY,JSON.stringify(data));
 closeModal();
 goPage('trainPage');
 toast('已進入完整編輯模式');
}
function editWorkout(id){
 const w=data.workouts.find(x=>x.id===id);if(!w)return;
 openModal('編輯訓練紀錄',`<div class="card"><div class="field"><label>名稱</label><input id="ewName" value="${esc(w.name)}"></div><div class="grid2"><div class="field"><label>日期</label><input id="ewDate" type="date" value="${w.date}"></div><div class="field"><label>訓練分鐘</label><input id="ewDuration" type="number" min="0" max="1440" value="${n(w.duration)}"></div></div><div class="field"><label>健身房</label><input id="ewGymName" list="ewGymOptions" value="${esc(workoutGymName(w))}" placeholder="選擇或輸入健身房"><datalist id="ewGymOptions">${data.gyms.map(g=>`<option value="${esc(g.name)}"></option>`).join('')}</datalist><div class="hint">舊紀錄補上健身房後，也會自動加入健身房設定。</div></div><div class="inline-check"><input id="ewDeload" type="checkbox" ${w.deload?'checked':''}><label for="ewDeload">Deload</label></div><div class="field" style="margin-top:9px"><label>備註</label><textarea id="ewNotes">${esc(w.notes||'')}</textarea></div></div>
 <div>${w.exercises.map(e=>`<div class="record"><b>${esc(e.nameSnapshot)}</b><div class="small">${esc(e.muscle)} · ${esc(lastExerciseSummary(e))}</div></div>`).join('')}</div>
 <div class="actions"><button class="btn primary" id="ewFullEdit">完整編輯動作／組數</button><button class="btn ghost" id="ewSave">只儲存基本資料</button><button class="btn ghost" id="ewCopy">複製為今天</button><button class="btn danger" id="ewDelete">移到回收筒</button></div>`,()=>{
   $('#ewFullEdit').onclick=()=>beginHistoryEdit(id);
   $('#ewSave').onclick=()=>{snapshot('歷史訓練基本資料編輯前');w.name=$('#ewName').value.trim()||w.name;w.date=$('#ewDate').value;w.duration=clamp($('#ewDuration').value,0,1440);const gym=ensureGymByName($('#ewGymName').value);w.gymId=gym?.id||'';w.gymNameSnapshot=gym?.name||'';w.deload=$('#ewDeload').checked;w.notes=$('#ewNotes').value;save('編輯紀錄',false);closeModal();toast('已儲存')};
   $('#ewCopy').onclick=()=>{if(data.activeWorkout&&!confirm('目前已有尚未完成的訓練，仍要覆蓋嗎？'))return;data.activeWorkout=JSON.parse(JSON.stringify(w));data.activeWorkout.id=uid('w');data.activeWorkout.date=isoToday();data.activeWorkout.status='active';data.activeWorkout.startedAt=new Date().toISOString();data.activeWorkout.endedAt='';data.activeWorkout.exercises.forEach(e=>e.sets.forEach(s=>s.completed=false));save('複製訓練',true);closeModal();goPage('trainPage')};
   $('#ewDelete').onclick=()=>{data.trash.unshift({id:uid('trash'),deletedAt:new Date().toISOString(),item:JSON.parse(JSON.stringify(w))});data.workouts=data.workouts.filter(x=>x.id!==w.id);save('刪除紀錄',true);closeModal();toast('已移到回收筒，可復原')}
 })
}
function manualEntry(){
 if(data.activeWorkout&&!confirm('目前已有尚未完成的訓練。要放棄目前訓練並開始手動補登嗎？'))return;
 openModal('手動補登',`<div class="grid2"><div class="field"><label>日期</label><input type="date" id="meDate" value="${isoToday()}"></div><div class="field"><label>名稱</label><input id="meName" value="手動補登"></div><div class="field"><label>實際訓練分鐘</label><input type="number" id="meDur" value="60" min="0" max="1440"></div><div class="field"><label>Deload</label><select id="meDeload"><option value="0">否</option><option value="1">是</option></select></div></div><p class="small">建立後會進入完整訓練輸入畫面，因此重量×次數、計時、有氧、體重型與單側訓練都能補登。</p><button class="btn primary" id="meCreate">建立補登紀錄</button>`,()=>{
   $('#meCreate').onclick=()=>{data.activeWorkout={id:uid('w'),date:$('#meDate').value||isoToday(),name:$('#meName').value.trim()||'手動補登',duration:clamp($('#meDur').value,0,1440),status:'active',startedAt:new Date().toISOString(),endedAt:'',notes:'',gymId:'',gymNameSnapshot:'',deload:$('#meDeload').value==='1',preStatus:{},pain:'',manual:true,exercises:[]};save('開始手動補登',true);closeModal();goPage('trainPage');toast('請加入動作並輸入歷史資料')}
 })
}

let analysisRange=['7','30','90','all'].includes(String(data.settings.analysisRange))?String(data.settings.analysisRange):'30';
function selectedAnalysisWorkouts(){
 return analysisRange==='all'?data.workouts:workoutsLastDays(n(analysisRange))
}
function showMuscleStimulusDetail(muscle,workouts){
 const s=stimulusMap(workouts)[muscle]||{direct:0,indirect:0,total:0,sources:{}};
 const rows=Object.values(s.sources).sort((a,b)=>b.total-a.total);
 openModal(`${muscle}｜肌群刺激明細`,`<div class="card">
   <div class="grid3"><div class="stat"><b>${fmtStim(s.total)}</b><span>估算刺激組</span></div><div class="stat"><b>${fmtStim(s.direct)}</b><span>直接</span></div><div class="stat"><b>${fmtStim(s.indirect)}</b><span>間接</span></div></div>
   <div class="analysis-note">計算優先順序：實際動作 → 動作模式 → 所使用器械。主要肌群一般計 1.0；協同肌群依動作估算 0.25 或 0.5。這不是精確的生理刺激測量。</div>
 </div>
 <div class="card">${rows.length?rows.map(r=>`<div class="source-row"><div class="record-head"><div><b>${esc(r.name)}</b><div class="record-meta">${r.pattern?esc(patternDisplayName(r.pattern)):''}${r.equipment?` · ${esc(r.equipment)}`:''}</div></div><b>${fmtStim(r.total)}</b></div><div class="tagrow" style="margin-top:6px">${r.direct?`<span class="tag">直接 ${fmtStim(r.direct)}</span>`:''}${r.indirect?`<span class="tag">間接 ${fmtStim(r.indirect)}</span>`:''}</div></div>`).join(''):'<div class="empty">這個期間沒有相關訓練。</div>'}</div>`);
}
// TrainLog Pro v2.10.0 analysis intelligence
let analysisTabState=['overview','muscle','exercise','load'].includes(data.settings.analysisTab)?data.settings.analysisTab:'overview';

function analysisRangeWeeks(days,ws){
  if(String(days)==='all'){
    if(!ws?.length)return 1;
    const times=ws.map(w=>new Date(`${w.date}T12:00:00`).getTime()).filter(Number.isFinite);
    if(!times.length)return 1;
    return Math.max(1,(Math.max(...times)-Math.min(...times))/(7*864e5)+1);
  }
  return Math.max(1,(n(days)||30)/7);
}
function analysisExerciseIds(ws){
  return [...new Set((ws||[]).flatMap(w=>(w.exercises||[]).map(e=>e.exerciseId).filter(Boolean)))];
}
function analysisWeekStart(dateStr){
  const d=new Date(`${dateStr}T12:00:00`);
  if(Number.isNaN(d.getTime()))return dateStr;
  const start=((n(data.settings.weekStart)%7)+7)%7;
  const offset=(d.getDay()-start+7)%7;
  d.setDate(d.getDate()-offset);
  return d.toISOString().slice(0,10);
}
function analysisWeekLabel(start){
  const d=new Date(`${start}T12:00:00`);
  if(Number.isNaN(d.getTime()))return start;
  return `${d.getMonth()+1}/${d.getDate()} 起`;
}
function analysisAverage(values){
  const a=(values||[]).filter(v=>Number.isFinite(v));
  return a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
}
function showAnalysisTab(tab){
  const next=['overview','muscle','exercise','load'].includes(tab)?tab:'overview';
  const changed=data.settings.analysisTab!==next;
  analysisTabState=next;data.settings.analysisTab=next;
  if(changed){try{localStorage.setItem(APP_KEY,JSON.stringify(data))}catch{}}
  $$('#analysisTabs [data-analysis-tab]').forEach(b=>b.classList.toggle('on',b.dataset.analysisTab===analysisTabState));
  $$('[data-analysis-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.analysisPanel!==analysisTabState));
}
function bindAnalysisTabs(){
  const root=$('#analysisTabs');if(!root)return;
  root.querySelectorAll('[data-analysis-tab]').forEach(b=>b.onclick=()=>showAnalysisTab(b.dataset.analysisTab));
  showAnalysisTab(analysisTabState);
}

function renderAnalysisLoadTrend(ws,days){
  const root=$('#analysisLoadTrend');if(!root)return;
  if(!ws?.length){
    root.innerHTML='<div class="empty">這個期間還沒有訓練紀錄。</div>';return
  }
  const byWeek=new Map();
  ws.forEach(w=>{
    const key=analysisWeekStart(w.date);
    if(!byWeek.has(key))byWeek.set(key,{key,workouts:0,sets:0,volume:0,cardio:0,rirs:[]});
    const row=byWeek.get(key);
    row.workouts++;
    row.sets+=effectiveSets(w);
    row.volume+=workoutVolume(w);
    row.cardio+=cardioMinutes(w);
    (w.exercises||[]).forEach(e=>(e.sets||[]).forEach(s=>{
      if(!s.completed||s.kind==='warmup'||s.rir===''||s.rir==null)return;
      const v=Number(s.rir);if(Number.isFinite(v))row.rirs.push(v)
    }));
  });
  const rows=[...byWeek.values()].sort((a,b)=>a.key.localeCompare(b.key)).slice(-6);
  rows.forEach(r=>r.avgRir=analysisAverage(r.rirs));
  const maxSets=Math.max(1,...rows.map(r=>r.sets));
  let summary='再累積幾週資料後，會更容易判斷負荷趨勢。';
  if(rows.length>=4){
    const prev=rows.slice(-4,-2),cur=rows.slice(-2);
    const avg=(a,k)=>a.reduce((s,x)=>s+n(x[k]),0)/Math.max(1,a.length);
    const ps=avg(prev,'sets'),cs=avg(cur,'sets'),pv=avg(prev,'volume'),cv=avg(cur,'volume');
    const setChange=ps?((cs-ps)/ps):0,volChange=pv?((cv-pv)/pv):0;
    if(setChange>.15&&volChange>.15)summary='最近兩週的正式組與訓練量都高於前兩週。';
    else if(setChange<-.15&&volChange<-.15)summary='最近兩週的正式組與訓練量都低於前兩週。';
    else summary='最近四週的整體訓練負荷沒有明顯同方向變化。';
    const pr=analysisAverage(prev.map(x=>x.avgRir)),cr=analysisAverage(cur.map(x=>x.avgRir));
    if(pr!=null&&cr!=null&&cr<pr-.7)summary+=' 同時平均 RIR 較低，主觀餘裕也較少。';
  }
  root.innerHTML=`<div class="analysis-summary-strip">${esc(summary)}</div>`+
    rows.map(r=>`<div class="analysis-week-row">
      <div class="analysis-week-copy"><b>${esc(analysisWeekLabel(r.key))}</b><span>${r.workouts} 次 · ${r.sets} 正式組 · ${fmtKg(r.volume)}${r.avgRir==null?'':` · 平均 RIR ${r.avgRir.toFixed(1)}`}</span></div>
      <div class="analysis-week-bar"><i style="width:${Math.max(4,Math.round(r.sets/maxSets*100))}%"></i></div>
    </div>`).join('')+
    '<div class="analysis-note">這裡呈現紀錄中的訓練負荷趨勢，不把它換算成假的「恢復百分比」。不同器械的重量也不應直接互相比較。</div>';
}

function renderAnalysisMuscleTargets(ws,days){
  const root=$('#analysisMuscleTargets');if(!root)return;
  const goals=data.settings.weeklyMuscleGoals||{},weeks=analysisRangeWeeks(days,ws),stim=stimulusMap(ws||[]);
  const muscles=MUSCLES.filter(m=>!['有氧','其他'].includes(m));
  if(!ws?.length){
    root.innerHTML='<div class="empty">這個期間還沒有足夠紀錄可比較肌群目標。</div>';return
  }
  root.innerHTML=muscles.map(m=>{
    const goal=n(goals[m]),actual=n(stim[m]?.total)/weeks;
    let status='未設定',cls='same';
    if(goal>0){
      const ratio=actual/goal;
      if(ratio<.65){status='低於目前目標';cls='down'}
      else if(ratio>1.35){status='高於目前目標';cls='up'}
      else {status='接近目前目標';cls='same'}
    }
    const pct=goal?Math.min(100,actual/goal*100):0;
    return `<div class="analysis-target-row">
      <div class="topline"><b>${esc(m)}</b><span>${fmtStim(actual)} / ${goal?fmtStim(goal):'—'} 組／週</span></div>
      ${goal?`<div class="progress"><i style="width:${pct}%"></i></div>`:''}
      <span class="compare-badge ${cls}">${esc(status)}</span>
    </div>`
  }).join('')+
  '<div class="analysis-note">「實際」為本期估算肌群刺激換算成每週平均；「目標」來自你的訓練偏好設定。這是依目前計畫比較，不代表生理上的最佳訓練量。</div>';
}

function renderAnalysisMovementGaps(ws,days){
  const root=$('#analysisMovementGaps');if(!root)return;
  const major=['horizontal_push','horizontal_pull','vertical_push','vertical_pull','knee_dominant','hip_extension','knee_flexion','knee_extension'];
  const stats=movementStats(ws||[]),weeks=analysisRangeWeeks(days,ws);
  const rows=major.map(k=>({key:k,sets:n(stats[k]),perWeek:n(stats[k])/weeks}));
  const max=Math.max(0,...rows.map(x=>x.sets));
  if(!max){
    root.innerHTML='<div class="empty">這個期間還沒有可辨識的主要動作模式紀錄。</div>';return
  }
  const gaps=rows.filter(x=>x.sets===0||(max>=4&&x.sets<max*.25))
    .sort((a,b)=>a.sets-b.sets).slice(0,4);
  root.innerHTML=`<div class="analysis-pattern-chips">${rows.map(x=>`<span class="tag">${esc(patternDisplayName(x.key))} · ${fmtStim(x.perWeek)} 組/週</span>`).join('')}</div>`+
    (gaps.length?`<div class="analysis-gap-list">${gaps.map(x=>`<div class="analysis-gap-item"><b>${esc(patternDisplayName(x.key))}</b><span>${x.sets===0?'本期沒有紀錄':'相對於本期其他主要模式較少'}</span></div>`).join('')}</div>`:'<div class="good" style="margin-top:10px;font-weight:850">主要動作模式都有出現，沒有明顯的「未記錄」缺口。</div>')+
    '<div class="analysis-note">缺口只依「本期是否有紀錄」與相對分布提示，不表示每種動作模式都需要相同組數。</div>';
}

function renderAnalysisProgressOpportunities(ws){
  const root=$('#analysisProgressOpportunities');if(!root)return;
  const ids=analysisExerciseIds(ws);
  const rank={up:0,down:1,keep:3};
  const items=ids.map(id=>{
    const ex=getExercise(id),adv=progressionAdvice(id);
    if(!ex||!adv)return null;
    const plateau=plateauDetail(id),best=bestSetForExercise(id);
    let label=adv.state==='up'?'可考慮進階':adv.state==='down'?'先調整負重／難度':'維持並累積';
    if(plateau?.state==='slow'&&adv.state!=='up')label='進步趨勢較慢';
    return {id,ex,adv,plateau,best,label,order:(rank[adv.state]??2)+(plateau?.state==='slow'?.25:0)}
  }).filter(Boolean).sort((a,b)=>a.order-b.order||(b.best?.date||'').localeCompare(a.best?.date||'')).slice(0,5);
  if(!items.length){
    root.innerHTML='<div class="card empty">再累積幾次可比較的訓練後，這裡會整理下一步建議。</div>';return
  }
  root.innerHTML=`<div class="analysis-opportunity-grid">${items.map(x=>`<div class="card analysis-opportunity">
    <div class="record-head"><div><div class="record-title">${esc(x.ex.name)}</div><div class="record-meta">${x.best?.date?`最近最佳：${esc(x.best.date)}`:'依目前紀錄'}</div></div><span class="pill ${x.adv.state==='up'?'good':x.adv.state==='down'?'warn':''}">${esc(x.label)}</span></div>
    <div class="small" style="margin-top:8px;line-height:1.55">${esc(x.adv.text||'維持目前安排並持續紀錄。')}</div>
    ${x.plateau?.state==='slow'?`<div class="analysis-note">近期多次可比較紀錄沒有明顯提升；這是趨勢提示，不代表已確定停滯。</div>`:''}
  </div>`).join('')}</div>`;
}

function analysisPrEvents(ws){
  const periodDates=new Set((ws||[]).map(w=>w.date)),events=[];
  analysisExerciseIds(ws).forEach(id=>{
    const ex=getExercise(id);if(!ex)return;
    const sessions=exerciseSessionMetrics(id).slice().sort((a,b)=>a.date.localeCompare(b.date));
    let bestWeight=0,bestE1rm=0,bestVolume=0,bestSeconds=0,bestDistance=0,started=false;
    sessions.forEach(s=>{
      const oldW=bestWeight,oldE=bestE1rm,oldV=bestVolume,oldSeconds=bestSeconds,oldDistance=bestDistance;
      const w=n(s.maxWeight),e=n(s.bestE1rm),v=n(s.volume),seconds=n(s.bestSeconds),distance=n(s.distance);
      let event=null;
      if(started&&periodDates.has(s.date)){
        if(s.type==='duration'&&seconds>oldSeconds)event={kind:'時間 PR',value:`${Math.round(seconds)} 秒`};
        else if(s.type==='cardio'&&distance>0&&oldDistance>0&&distance>oldDistance*1.01)event={kind:'距離 PR',value:`${distance.toFixed(2).replace(/\.00$/,'')} km`};
        else if(!['duration','cardio'].includes(s.type)&&w>oldW+.0001)event={kind:'重量 PR',value:fmtWeight(w)};
        else if(!['duration','cardio'].includes(s.type)&&e>0&&oldE>0&&e>oldE*1.01)event={kind:'估算力量 PR',value:`e1RM ${fmtWeight(e)}`};
        else if(!['duration','cardio'].includes(s.type)&&v>0&&oldV>0&&v>oldV*1.05)event={kind:'單次完成量 PR',value:fmtKg(v)};
      }
      bestWeight=Math.max(bestWeight,w);bestE1rm=Math.max(bestE1rm,e);bestVolume=Math.max(bestVolume,v);bestSeconds=Math.max(bestSeconds,seconds);bestDistance=Math.max(bestDistance,distance);
      if(w>0||e>0||v>0||seconds>0||distance>0)started=true;
      if(event)events.push({date:s.date,name:ex.name,...event})
    })
  });
  return events.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
}
function renderAnalysisPrTimeline(ws){
  const root=$('#analysisPrTimeline');if(!root)return;
  const events=analysisPrEvents(ws);
  root.innerHTML=events.length?`<div class="analysis-pr-list">${events.map(e=>`<div class="analysis-pr-item">
    <div class="analysis-pr-dot">★</div><div><b>${esc(e.name)}</b><div class="record-meta">${esc(e.date)} · ${esc(e.kind)}</div><div class="analysis-pr-value">${esc(e.value)}</div></div>
  </div>`).join('')}</div><div class="analysis-note">e1RM 為公式估算，只適合同一動作、相似器械下觀察自己的長期趨勢。</div>`:
  '<div class="empty">這個期間還沒有新的可辨識 PR；第一次紀錄會作為基準，不會直接算成 PR。</div>';
}
function renderV210Analysis(ws,days){
  renderAnalysisLoadTrend(ws,days);
  renderAnalysisMuscleTargets(ws,days);
  renderAnalysisMovementGaps(ws,days);
  renderAnalysisProgressOpportunities(ws);
  renderAnalysisPrTimeline(ws);
}

function renderAnalysis(){
 const __v210days=analysisRange==='all'?'all':n(analysisRange);renderV210Analysis(selectedAnalysisWorkouts(),__v210days);bindAnalysisTabs();
 const ws=selectedAnalysisWorkouts(),days=analysisRange==='all'?'all':n(analysisRange),prevWs=previousPeriodWorkouts(days);
 const stim=stimulusMap(ws),prevStim=stimulusMap(prevWs),effort=effortStats(ws),moves=movementStats(ws),cons=consistencyStats(ws,days),confidence=analysisConfidence(ws);
 const totalMinutes=ws.reduce((a,w)=>a+n(w.duration),0),volume=ws.reduce((a,w)=>a+workoutVolume(w),0),formal=formalSetCount(ws),cardio=Math.round(ws.reduce((a,w)=>a+cardioMinutes(w),0));
 const prevMinutes=prevWs.reduce((a,w)=>a+n(w.duration),0),prevVolume=prevWs.reduce((a,w)=>a+workoutVolume(w),0),prevFormal=formalSetCount(prevWs),prevCardio=Math.round(prevWs.reduce((a,w)=>a+cardioMinutes(w),0));
 $('#analysisPeriod').textContent=`統計期間：${rangeDateLabel(days)}${days!=='all'?` · 前一期 ${previousPeriodLabel(days)}`:''}`;
 $$('[data-analysis-range]').forEach(b=>b.classList.toggle('on',b.dataset.analysisRange===analysisRange));

 const effortRecorded=effort.high+effort.mid+effort.low;
 $('#analysisConfidence').innerHTML=`<div class="analysis-confidence"><div class="confidence-main"><span class="confidence-dot ${confidence.level}"></span><div><div class="confidence-title">分析可信度：${confidence.label} ${infoButton('analysis_confidence')}</div><div class="confidence-meta">${confidence.workouts} 次訓練 · ${confidence.formal} 正式組 · 強度紀錄 ${effort.total?Math.round(effortRecorded/effort.total*100):0}% · 動作模式辨識 ${Math.round(confidence.patternRate*100)}%</div></div></div></div>`;

 const highlights=buildAnalysisHighlights(ws,prevWs,days,confidence,cons);
 $('#analysisHighlights').innerHTML=highlights.map((h,i)=>`<div class="analysis-highlight ${h.kind||'info'}"><div class="rank">${i+1}</div><div><div class="highlight-title">${esc(h.title)}</div><div class="highlight-desc">${esc(h.desc)}</div>${h.programId?`<button class="btn small ghost" style="margin-top:7px" data-analysis-program="${esc(h.programId)}">查看補強課表</button>`:''}</div></div>`).join('');
 $$('[data-analysis-program]').forEach(b=>b.onclick=()=>showSystemProgramDetail(b.dataset.analysisProgram));

 const cmp=(cur,prev)=>days==='all'?'':compareBadge(cur,prev);
 $('#analysisKpis').innerHTML=`
   <div class="stat"><b>${ws.length}</b><span>訓練次數</span>${cmp(ws.length,prevWs.length)}</div>
   <div class="stat"><b>${Math.round(totalMinutes)} 分</b><span>訓練時間</span>${cmp(totalMinutes,prevMinutes)}</div>
   <div class="stat"><b>${formal}</b><span>正式組 ${infoButton('effective_sets')}</span>${cmp(formal,prevFormal)}</div>
   <div class="stat"><b>${fmtKg(volume)}</b><span>訓練量</span>${cmp(volume,prevVolume)}</div>
   <div class="stat"><b>${cardio} 分</b><span>有氧時間</span>${cmp(cardio,prevCardio)}</div>`;

 const fourWeek=stimulusMap(workoutsLastDays(28));
 const muscles=MUSCLES.filter(m=>!['有氧','其他'].includes(m));
 const maxStim=Math.max(1,...muscles.map(m=>n(stim[m]?.total)));
 $('#muscleAnalysis').innerHTML=muscles.map(m=>{
   const x=stim[m]||{direct:0,indirect:0,total:0},px=prevStim[m]||{total:0};
   const avg=n(fourWeek[m]?.total)/4;
   return `<div class="stim-row">
     <div class="stim-main"><div><div class="stim-name">${esc(m)}</div><button class="stim-detail-btn" type="button" data-muscle-stim="${esc(m)}">查看來源 ›</button></div><div class="stim-total">${fmtStim(x.total)} 組</div></div>
     <div class="stim-meta"><span class="tag stim-direct">直接 ${fmtStim(x.direct)}</span><span class="tag stim-indirect">間接 ${fmtStim(x.indirect)}</span><span class="tag">近 4 週平均 ${fmtStim(avg)} / 週</span>${days!=='all'?compareBadge(x.total,px.total):''}</div>
     <div class="progress"><i style="width:${Math.min(100,n(x.total)/maxStim*100)}%"></i></div>
   </div>`
 }).join('')+`<div class="analysis-note">「刺激組」是估算值。點「查看來源」可以確認哪些動作被算成直接或間接刺激。</div>`;
 $$('[data-muscle-stim]').forEach(b=>b.onclick=()=>showMuscleStimulusDetail(b.dataset.muscleStim,ws));

 const recorded=effort.high+effort.mid+effort.low;
 const pct=v=>recorded?Math.round(v/recorded*100):0;
 $('#effortAnalysis').innerHTML=recorded?`
   <div class="effort-grid">
     <div class="effort-box"><b>${effort.high}</b><span>接近力竭<br>${pct(effort.high)}%</span></div>
     <div class="effort-box"><b>${effort.mid}</b><span>中等偏高<br>${pct(effort.mid)}%</span></div>
     <div class="effort-box"><b>${effort.low}</b><span>保留較多<br>${pct(effort.low)}%</span></div>
   </div>
   <div class="analysis-note">依已記錄 RIR / RPE 的正式組整理。${effort.missing?`另有 ${effort.missing} 組未記錄強度。`:''}</div>`:
   `<div class="empty">這個期間還沒有 RIR / RPE 紀錄。</div>`;

 $('#pplAnalysis').innerHTML=Object.keys(moves).length?movementMatrixHtml(moves):`<div class="empty">這個期間還沒有可辨識的動作模式。</div>`;

 $('#consistencyAnalysis').innerHTML=ws.length?`
   <div class="consistency-grid">
     <div class="stat"><b>${cons.days}</b><span>有訓練的日期</span></div>
     <div class="stat"><b>${cons.avgPerWeek.toFixed(1)}</b><span>平均次數／週</span></div>
     <div class="stat"><b>${cons.weeks} / ${cons.totalWeeks}</b><span>有訓練的週</span></div>
     <div class="stat"><b>${cons.longestGap ?? '—'} 天</b><span>最長未訓練間隔</span></div>
   </div>
   <div class="analysis-note">這裡只描述訓練規律性，不代表恢復程度或健康評分。</div>`:
   `<div class="empty">這個期間沒有訓練紀錄。</div>`;

 const sel=$('#analysisExercise'),prev=sel.value;
 const performedMap=new Map();
 data.workouts.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach(w=>{
   (w.exercises||[]).forEach(e=>{
     if(!e.exerciseId||performedMap.has(e.exerciseId))return;
     const lib=getExercise(e.exerciseId)||{};
     const equipmentId=e.equipmentId||lib.equipmentId||'';
     const sysEq=SYSTEM_EQUIPMENT.find(x=>x.id===equipmentId);
     const myEq=data.equipment.find(x=>x.id===equipmentId);
     const equipmentName=sysEq?.nameZh||myEq?.name||'';
     performedMap.set(e.exerciseId,{id:e.exerciseId,name:e.nameSnapshot||lib.name||'已做過的動作',equipmentName,lastDate:w.date});
   })
 });
 const performed=[...performedMap.values()].sort((a,b)=>b.lastDate.localeCompare(a.lastDate)||a.name.localeCompare(b.name,'zh-Hant'));
 sel.innerHTML='<option value="">'+(performed.length?'選擇做過的動作':'尚無已訓練動作')+'</option>'+
   performed.map(e=>`<option value="${e.id}">${esc(e.name)}${e.equipmentName&&e.equipmentName!==e.name?`｜${esc(e.equipmentName)}`:''}</option>`).join('');
 if(performed.some(e=>e.id===prev))sel.value=prev;else sel.value='';
 renderExerciseAnalysis(sel.value)
}
function renderExerciseAnalysis(id){
 const box=$('#exerciseAnalysis');
 if(!id){box.innerHTML='<div class="empty">選擇一個動作查看歷史、進步訊號與 PR。</div>';return}
 const lib=getExercise(id),sessions=exerciseSessionMetrics(id),histEx=data.workouts.flatMap(w=>w.exercises||[]).find(e=>e.exerciseId===id),name=lib?.name||histEx?.nameSnapshot||'已做過的動作';
 if(!sessions.length){box.innerHTML='<div class="empty">目前沒有可分析的紀錄。</div>';return}
 const type=sessions.at(-1).type,over=overloadSummary(id),plat=plateauDetail(id),last=sessions.at(-1),prev=sessions.at(-2);
 const lastSignals=prev?progressSignals(prev,last):[];
 let pts=[],summary='',history='';
 if(type==='cardio'){
   pts=sessions.map(s=>({date:s.date,v:s.distance||s.minutes,label:s.label}));
   const maxMin=Math.max(...sessions.map(s=>s.minutes)),maxDist=Math.max(...sessions.map(s=>s.distance));
   summary=`<div class="progress-summary"><div class="progress-card"><b>${maxMin} 分</b><span>最長時間</span></div><div class="progress-card"><b>${fmtStim(maxDist)} km</b><span>最長距離</span></div></div>`;
   history=sessions.slice(-6).reverse().map(s=>`<div class="progress-session"><div class="progress-session-date">${fmtDate(s.date)}</div><div class="progress-session-main">${esc(s.label)}${s.speed?` · ${fmtStim(s.speed)} km/h`:''}</div></div>`).join('')
 }else if(type==='duration'){
   pts=sessions.map(s=>({date:s.date,v:s.bestSeconds,label:`${s.bestSeconds} 秒`}));
   const bestSec=Math.max(...sessions.map(s=>s.bestSeconds)),bestTotal=Math.max(...sessions.map(s=>s.totalSeconds));
   summary=`<div class="progress-summary"><div class="progress-card"><b>${bestSec} 秒</b><span>最佳單組</span></div><div class="progress-card"><b>${bestTotal} 秒</b><span>單次最高總時間</span></div></div>`;
   history=sessions.slice(-6).reverse().map(s=>`<div class="progress-session"><div class="progress-session-date">${fmtDate(s.date)}</div><div class="progress-session-main">最佳 ${s.bestSeconds} 秒 · 總計 ${s.totalSeconds} 秒</div></div>`).join('')
 }else{
   pts=sessions.map(s=>({date:s.date,v:s.bestE1rm||s.maxWeight,label:s.label}));
   const best=bestSetForExercise(id),maxWeight=Math.max(...sessions.map(s=>s.maxWeight)),maxReps=Math.max(...sessions.map(s=>s.maxReps)),maxSessionVolume=Math.max(...sessions.map(s=>s.volume));
   const latestRir=last.rir!=null?last.rir.toFixed(1):'—',latestRpe=last.rpe!=null?last.rpe.toFixed(1):'—';
   summary=`<div class="progress-summary">
     <div class="progress-card"><b>${best?`${fmtWeight(best.weight)} × ${best.reps}`:'—'}</b><span>歷史最佳組</span></div>
     <div class="progress-card"><b>${data.settings.show1RM&&best?fmtWeight(best.score||0):'—'}</b><span>估算一次最大重量（e1RM）趨勢</span></div>
     <div class="progress-card"><b>${fmtWeight(maxWeight)}</b><span>最高重量</span></div>
     <div class="progress-card"><b>${maxReps}</b><span>單組最多次數</span></div>
     <div class="progress-card"><b>${fmtKg(maxSessionVolume)}</b><span>單次最高完成量</span></div>
     <div class="progress-card"><b>${data.settings.intensity==='RIR'?latestRir:latestRpe}</b><span>最近平均 ${data.settings.intensity}</span></div>
   </div>`;
   history=sessions.slice(-6).reverse().map(s=>`<div class="progress-session"><div class="progress-session-date">${fmtDate(s.date)}</div><div class="progress-session-main"><b>${esc(s.label)}</b>${s.bestE1rm?` · 估算一次最大重量約 ${fmtWeight(s.bestE1rm)}`:''}${s.rir!=null?` · RIR ${s.rir.toFixed(1)}`:''}${s.rpe!=null?` · RPE ${s.rpe.toFixed(1)}`:''} · ${s.sets||0} 組</div></div>`).join('')
 }
 const overloadText=over.transitions?`最近 ${over.transitions+1} 次中，有 ${over.count} 次相較前一次出現進步訊號。`:'至少需要兩次紀錄才能比較。';
 const platBox=plat.state==='slow'?`<div class="warnbox" style="margin-top:9px"><b>進步趨勢可能趨緩 ${infoButton('plateau_detection')}</b><div class="small" style="margin-top:4px">${esc(plat.text)}</div></div>`:
   plat.state==='progress'?`<div class="goodbox" style="margin-top:9px"><b>近期仍有進步訊號</b><div class="small" style="margin-top:4px">${esc(plat.text)}</div></div>`:'';
 box.innerHTML=`<div class="record-title">${esc(name)}</div>
   ${summary}
   <div class="section" style="margin-top:12px">最近一次 vs 上一次</div>
   ${prev?`<div class="signal-list">${lastSignals.length?lastSignals.map(s=>`<span class="signal good">✓ ${esc(s.text)}</span>`).join(''):'<span class="signal">目前沒有明顯進步訊號</span>'}</div>`:'<div class="analysis-note">只有一次紀錄，暫時無法比較。</div>'}
   <div class="analysis-note">${esc(overloadText)} ${infoButton('progressive_overload_detection')}</div>
   ${platBox}
   ${sparkline(pts)}
   <div class="section">最近紀錄</div><div class="progress-session-list">${history}</div>`
}
function sparkline(pts){
 if(!pts.length)return'<div class="empty">還沒有歷史資料</div>';const arr=pts.slice(-12),vals=arr.map(p=>p.v),min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;const points=arr.map((p,i)=>`${10+i*(280/Math.max(1,arr.length-1))},${105-(p.v-min)/range*85}`).join(' ');return `<svg class="spark" viewBox="0 0 300 120" role="img" aria-label="進步趨勢"><line x1="10" y1="105" x2="290" y2="105" stroke="#40515c"/><polyline fill="none" stroke="#69c4ff" stroke-width="3" points="${points}"/>${arr.map((p,i)=>`<circle cx="${10+i*(280/Math.max(1,arr.length-1))}" cy="${105-(p.v-min)/range*85}" r="4" fill="#f4f7f8"/>`).join('')}</svg>`
}


function infoButton(id,label='i'){return GLOSSARY[id]?`<button class="info-btn" type="button" data-info="${esc(id)}" aria-label="${esc(GLOSSARY[id].zh)}說明">${label}</button>`:''}
function openGlossary(id){
 const g=GLOSSARY[id];if(!g)return;
 openModal(`${g.zh}｜${g.en}`,`<div class="card bilingual"><b>${esc(g.short)}</b><div style="margin-top:10px">${esc(g.detail)}</div>${g.example?`<div class="en-copy"><b>Example / 範例</b><div>${esc(g.example)}</div></div>`:''}</div>`);
}
function youtubeSearch(q){
 if(!q)return;const url='https://www.youtube.com/results?search_query='+encodeURIComponent(q);window.open(url,'_blank','noopener,noreferrer');
}
function systemProgramCardHtml(p){
 const progInfo=p.progression==='double_progression'?`${esc('雙進階法')} ${infoButton('double_progression')}`:p.progression==='deload'?`${esc('Deload')} ${infoButton('deload')}`:`${esc('漸進超負荷')} ${infoButton('progressive_overload')}`;
 return `<div class="sys-card"><div class="record-head"><div><div class="sys-title">${esc(p.nameZh)}</div><div class="sys-en">${esc(p.nameEn)}</div></div><span class="source-pill">SYSTEM</span></div>
 <div class="tagrow" style="margin-top:8px"><span class="tag">${esc(p.category)}</span><span class="tag">${esc(p.level)}</span><span class="tag">${p.daysPerWeek} 日/週</span><span class="tag">約 ${p.duration} 分</span><span class="tag">${esc(p.equipmentMode)}</span><span class="tag">目的：${esc(p.goal)}</span></div>
 <div class="sys-desc">${esc(p.descZh)}</div>${p.postureSupport?`<div class="small" style="margin-top:7px;color:var(--accent2)">體態舒緩／平衡補強 ${infoButton('posture_support')}</div>`:''}<div class="small" style="margin-top:7px">${progInfo} · RIR ${esc(p.rir)} ${infoButton('rir')}</div>
 <div class="actions" style="margin-top:10px"><button class="btn small primary" data-program-detail="${esc(p.id)}">預覽</button><button class="btn small ghost" data-program-import="${esc(p.id)}">加入我的模板</button></div></div>`;
}
function bindProgramCards(scope=document){
 const root=typeof scope==='string'?$(scope):scope;if(!root)return;
 root.querySelectorAll('[data-program-detail]').forEach(b=>b.onclick=()=>showSystemProgramDetail(b.dataset.programDetail));
 root.querySelectorAll('[data-program-import]').forEach(b=>b.onclick=()=>importSystemProgram(b.dataset.programImport));
 root.querySelectorAll('[data-plan-adopt]').forEach(b=>b.onclick=()=>adoptCurrentPlan(b.dataset.planAdopt,'program_library'));
 root.querySelectorAll('[data-plan-reevaluate]').forEach(b=>b.onclick=openPlanReevaluation);
}
function programSetSummary(p){
 const map={};(p.workouts||[]).forEach(w=>(w.items||[]).forEach(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(!ex)return;const sets=n(it.targetSets)||n(ex.targetSets)||3;map[ex.muscle]=(map[ex.muscle]||0)+sets}));
 return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([m,s])=>`${m} ${s}組`).join(' · ');
}
function programDayMeta(w){
 return w?.dayMeta||{dayTitle:w?.nameZh||'訓練日',dayTitleEn:w?.nameEn||'',focusSummary:'',primaryMuscles:[],secondaryMuscles:[],movementPatterns:[],estimatedMinutes:0,intensityLevel:'',trainingGoal:'',coachNote:'',why:''};
}
function patternDisplayName(id){
 const g=GLOSSARY[PATTERN_INFO[id]||id];
 if(g)return g.zh;
 return {cardio:'有氧',core_stability:'核心穩定',hip_abduction:'髖外展',hip_adduction:'髖內收',plantar_flexion:'小腿蹠屈',shoulder_horizontal_adduction:'水平內收',shoulder_extension:'肩伸展',scapular_control:'肩胛控制',mobility:'活動度／舒緩'}[id]||id;
}
function programDayFocusHtml(w){
 const m=programDayMeta(w);
 const prim=(m.primaryMuscles||[]).join('・'),sec=(m.secondaryMuscles||[]).join('・');
 const pats=(m.movementPatterns||[]).slice(0,3).map(patternDisplayName).join('・');
 return `<div class="program-day-focus">
   <div class="small">${esc(w.nameZh)}｜${esc(w.nameEn)}</div>
   <div class="program-day-focus-title">${esc(m.dayTitle||w.nameZh)}</div>
   ${m.dayTitleEn?`<div class="program-day-focus-en">${esc(m.dayTitleEn)}</div>`:''}
   <div class="program-day-focus-summary">${esc(m.focusSummary||'')}</div>
   <div class="program-day-meta">
     ${prim?`<span class="tag">主要：${esc(prim)}</span>`:''}
     ${sec?`<span class="tag">輔助：${esc(sec)}</span>`:''}
     ${m.intensityLevel?`<span class="tag">強度：${esc(m.intensityLevel)}</span>`:''}
     ${m.estimatedMinutes?`<span class="tag">約 ${n(m.estimatedMinutes)} 分</span>`:''}
     ${pats?`<span class="tag">模式：${esc(pats)}</span>`:''}
   </div>
   <details class="program-day-why"><summary>ⓘ 為什麼這樣安排</summary><div class="why-body">${esc(m.why||'')} ${m.coachNote?`<div style="margin-top:6px"><b>教練提示：</b>${esc(m.coachNote)}</div>`:''}</div></details>
 </div>`;
}
function programPrescription(ex,it,p){
 const sets=n(it.targetSets)||n(ex.targetSets)||3,lo=it.repMin??ex.repMin,hi=it.repMax??ex.repMax,rir=it.intMin??ex.intMin??p.rir;
 if(ex.type==='cardio')return `${n(it.minutes)||20} 分鐘`;
 if(ex.type==='duration')return `${sets} × ${lo||30}${hi&&hi!==lo?'–'+hi:''} 秒`;
 if(ex.type==='unilateral')return `${sets} × ${lo||8}${hi&&hi!==lo?'–'+hi:''} / 側 · RIR ${rir}`;
 if(ex.type==='bodyweight')return `${sets} × ${lo||8}${hi&&hi!==lo?'–'+hi:''}${rir?` · RIR ${rir}`:''}`;
 return `${sets} × ${lo||8}${hi&&hi!==lo?'–'+hi:''} · RIR ${rir}`;
}
function showSystemProgramDetail(id){
 const p=SYSTEM_PROGRAMS.find(x=>x.id===id);if(!p)return;
 const days=(p.workouts||[]).map((w,i)=>`<div class="program-day">${programDayFocusHtml(w)}<ul>${(w.items||[]).map(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(!ex)return'';const sets=n(it.targetSets)||n(ex.targetSets)||3,lo=it.repMin??ex.repMin,hi=it.repMax??ex.repMax;return `<li><b>${esc(ex.name)}</b> <span class="muted">${esc(ex.nameEn||'')}</span><br>${programPrescription(ex,it,p)}</li>`}).join('')}</ul><div class="actions" style="margin-top:8px"><button class="btn small good" data-start-program-day="${esc(p.id)},${i}">開始 ${esc(w.nameZh)}</button></div></div>`).join('');
 const progId=p.progression==='double_progression'?'double_progression':p.progression==='deload'?'deload':'progressive_overload';
 openModal(p.nameZh,`<div class="card"><div class="sys-en">${esc(p.nameEn)}</div><div class="tagrow" style="margin-top:9px"><span class="tag">${esc(p.level)}</span><span class="tag">${p.daysPerWeek} 日/週</span><span class="tag">${p.duration} 分</span><span class="tag">${esc(p.goal)}</span><span class="tag">${esc(p.equipmentMode)}</span></div><div class="sys-desc">${esc(p.descZh)}</div><div class="sys-desc">${esc(p.descEn)}</div>${p.postureSupport?`<div class="warnbox" style="margin-top:10px"><b>使用說明 ${infoButton('posture_support')}</b><div class="small" style="margin-top:4px">${esc(p.supportNote||'此課表為健身補強，不是醫療診斷或治療。')}</div></div>`:''}<div class="hr"></div><div class="small"><b>進階方式：</b>${esc(GLOSSARY[progId]?.zh||p.progression)} ${infoButton(progId)}　<b>建議 RIR：</b>${esc(p.rir)} ${infoButton('rir')}</div><div class="small" style="margin-top:7px"><b>整個 Program 組數概覽：</b>${esc(programSetSummary(p))}</div></div>
 <div class="program-days">${days}</div><div class="actions" style="margin-top:12px"><button class="btn primary" id="programSetPlan">設為目前 ${n(data.settings.blockWeeks)||6} 週計畫</button><button class="btn ghost" id="programImportNow">加入我的模板</button><button class="btn good" id="programStartNow">只開始 Day A</button></div>`,()=>{
   $('#programSetPlan').onclick=()=>{closeModal();adoptCurrentPlan(id,'program_detail')};
   $('#programImportNow').onclick=()=>importSystemProgram(id,true);
   $('#programStartNow').onclick=()=>startSystemProgramDay(id,0);
   $$('[data-start-program-day]').forEach(b=>b.onclick=()=>{const [pid,di]=b.dataset.startProgramDay.split(',');startSystemProgramDay(pid,n(di))});
 });
}
function importSystemProgram(id,keepModal=false){
 const p=SYSTEM_PROGRAMS.find(x=>x.id===id);if(!p)return;
 const existing=data.templates.filter(t=>t.sourceProgramId===id);
 if(existing.length&&!confirm(`「${p.nameZh}」已經加入過 ${existing.length} 個模板，仍要再建立一份副本嗎？`))return;
 const stamp=Date.now().toString(36);
 p.workouts.forEach((w,i)=>{
   data.templates.push({id:`tpl_${p.id}_${stamp}_${i}`,name:`${p.nameZh}｜${w.nameZh}`,nameEn:`${p.nameEn} | ${w.nameEn}`,sourceProgramId:p.id,sourceVersion:p.version,dayMeta:JSON.parse(JSON.stringify(w.dayMeta||{})),items:JSON.parse(JSON.stringify(w.items))});
 });
 save('加入系統 Program',true);toast(`已加入 ${p.workouts.length} 個「我的模板」`);
 if(keepModal)closeModal();
}
function startSystemProgramDay(id,dayIndex=0){
 if(data.activeWorkout&&!confirm('目前已有尚未完成的訓練。要放棄目前訓練並開始系統課表嗎？'))return;
 const p=SYSTEM_PROGRAMS.find(x=>x.id===id),w=p?.workouts?.[dayIndex];if(!p||!w)return;
 data.activeWorkout={id:uid('w'),date:isoToday(),name:`${p.nameZh}｜${w.nameZh}`,duration:0,status:'active',startedAt:new Date().toISOString(),endedAt:'',notes:`系統課表： ${p.nameZh}`,programDayMeta:JSON.parse(JSON.stringify(w.dayMeta||{})),gymId:'',gymNameSnapshot:'',deload:p.progression==='deload',preStatus:{},pain:'',exercises:w.items.map(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);return ex?makeSessionExercise({...ex,...it},isoToday()):null}).filter(Boolean)};
 closeModal();save('開始系統課表',true);goPage('trainPage');
}
let programDisplayLimit=18;
function renderSystemPrograms(){
 const box=$('#systemProgramList');if(!box)return;
 const q=($('#programSearch')?.value||'').trim().toLowerCase(),cat=$('#programCategory')?.value||'',days=$('#programDays')?.value||'',level=$('#programLevel')?.value||'',dur=n($('#programDuration')?.value),eq=$('#programEquip')?.value||'',goal=$('#programGoal')?.value||'';
 const items=SYSTEM_PROGRAMS.filter(p=>{
   const text=(p.nameZh+' '+p.nameEn+' '+p.category+' '+p.goal+' '+p.descZh+' '+(p.tags||[]).join(' ')).toLowerCase();
   return(!q||text.includes(q))&&(!cat||p.category===cat)&&(!days||String(p.daysPerWeek)===days)&&(!level||p.level===level)&&(!dur||p.duration<=dur)&&(!eq||p.equipmentMode===eq)&&(!goal||programGoalFit(p,goal)>=25);
 });
 $('#programCount').textContent=`${items.length} / ${SYSTEM_PROGRAMS.length} 套`;
 const shown=items.slice(0,programDisplayLimit);box.innerHTML=shown.length?shown.map(systemProgramCardHtml).join(''):'<div class="card empty">沒有符合條件的系統課表。</div>';
 if(items.length>shown.length)box.innerHTML+=`<button class="btn ghost" id="programMore" style="width:100%">顯示更多（剩 ${items.length-shown.length}）</button>`;
 bindProgramCards(box);const more=$('#programMore');if(more)more.onclick=()=>{programDisplayLimit+=18;renderSystemPrograms()};
}
const EQUIPMENT_BRANDS=['Precor','Life Fitness','Hammer Strength','Gymleco','Panatta','gym80'];
function supportedBrandsForEquipment(e){
 return [...new Set([...(e?.brandCompat||[]),...(e?.brandModels||[]).map(x=>x.brand)])].filter(Boolean)
}
function brandModelsFor(e,brand=''){
 return (e?.brandModels||[]).filter(x=>!brand||x.brand===brand)
}
function resistanceLabel(r){
 return {selectorized:'插銷式',plate_loaded:'槓片式',cable:'滑輪',bodyweight_assisted:'體重輔助',cardio:'有氧',guided_bar:'導軌式',bodyweight:'體重'}[r]||r;
}
function resistanceGlossary(r){return {selectorized:'selectorized',plate_loaded:'plate_loaded',cable:'cable',bodyweight_assisted:'bodyweight_assisted',guided_bar:'guided_bar'}[r]||''}
function systemEquipmentCardHtml(e){
 const gi=resistanceGlossary(e.resistance),pi=PATTERN_INFO[e.pattern]||'';
 const brands=supportedBrandsForEquipment(e),mapped=(e.brandModels||[]).length;
 return `<div class="eq-card"><div class="record-head"><div><div class="eq-name">${esc(e.nameZh)}</div><div class="eq-en">${esc(e.nameEn)}</div></div><span class="source-pill">SYSTEM</span></div><div class="tagrow" style="margin-top:7px"><span class="tag">${esc(e.category)}</span><span class="tag">${esc(resistanceLabel(e.resistance))} ${gi?infoButton(gi):''}</span><span class="tag">${esc(e.primary)}</span>${brands.length?`<span class="tag">${brands.length} 品牌支援</span>`:''}${mapped?`<span class="tag">${mapped} 型號對應</span>`:''}</div><div class="eq-desc">${esc(e.descZh)}</div><div class="actions" style="margin-top:9px"><button class="btn small primary" data-eq-detail="${esc(e.id)}">詳細說明</button><button class="btn small ghost" data-eq-yt="${esc(e.id)}">▶ YouTube</button><button class="btn small ghost" data-eq-add="${esc(e.id)}">＋ 我的器材</button></div></div>`;
}
function bindEquipmentCards(scope=document){
 const root=typeof scope==='string'?$(scope):scope;if(!root)return;
 root.querySelectorAll('[data-eq-detail]').forEach(b=>b.onclick=()=>showSystemEquipmentDetail(b.dataset.eqDetail));
 root.querySelectorAll('[data-eq-yt]').forEach(b=>b.onclick=()=>{const e=SYSTEM_EQUIPMENT.find(x=>x.id===b.dataset.eqYt);if(e)youtubeSearch(e.youtubeZh)});
 root.querySelectorAll('[data-eq-add]').forEach(b=>b.onclick=()=>addSystemEquipmentToMine(b.dataset.eqAdd));
}
function showSystemEquipmentDetail(id){
 const e=SYSTEM_EQUIPMENT.find(x=>x.id===id);if(!e)return;const gi=resistanceGlossary(e.resistance),pi=PATTERN_INFO[e.pattern]||'';
 const equipmentMotion=typeof window.TrainLogMotion3DHtml==='function'?window.TrainLogMotion3DHtml(e.id,e.pattern,e.nameZh,e.nameEn,e.nameEn):'';
 const compat=supportedBrandsForEquipment(e),brandHtml=`<div class="hr"></div><b>品牌支援</b><div class="tagrow" style="margin-top:7px">${compat.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>${(e.brandModels||[]).length?`<div class="small" style="margin-top:8px">已收錄的系列／型號：</div><div class="tagrow" style="margin-top:6px">${e.brandModels.map(x=>`<span class="tag">${esc(x.brand)} · ${esc(x.series)} · ${esc(x.model)} · ${esc(x.name)}</span>`).join('')}</div>`:''}<div class="small" style="margin-top:8px;line-height:1.5">沒有列出的舊型號或特殊版本，仍可用此通用器械建立「我的器材」，自行填入品牌與型號。</div>`;
 openModal(e.nameZh,`<div class="card bilingual"><div class="sys-en">${esc(e.nameEn)}</div><div class="tagrow" style="margin-top:9px"><span class="tag">${esc(e.category)}</span><span class="tag">${esc(resistanceLabel(e.resistance))} ${gi?infoButton(gi):''}</span><span class="tag">${esc(e.primary)}</span>${pi?`<span class="tag">${esc(GLOSSARY[pi]?.zh||e.pattern)} ${infoButton(pi)}</span>`:''}</div>${equipmentMotion}<div style="margin-top:12px"><b>中文說明</b><div>${esc(e.descZh)}</div>${e.setupZh?`<div style="margin-top:9px"><b>機器設定／操作</b><div>${esc(e.setupZh)}</div></div>`:''}${e.mistakesZh?`<div style="margin-top:9px"><b>常見錯誤</b><div>${esc(e.mistakesZh)}</div></div>`:''}${brandHtml}</div><div class="en-copy"><b>English Description</b><div>${esc(e.descEn)}</div></div></div><div class="actions"><button class="btn primary" id="eqYtZh">▶ YouTube 中文搜尋</button><button class="btn ghost" id="eqYtEn">▶ English Tutorial</button><button class="btn ghost" id="eqAddMine">加入我的器材</button></div>`,()=>{
   $('#eqYtZh').onclick=()=>youtubeSearch(e.youtubeZh);$('#eqYtEn').onclick=()=>youtubeSearch(e.youtubeEn);$('#eqAddMine').onclick=()=>addSystemEquipmentToMine(id);
 });
}
function addSystemEquipmentToMine(id){
 const e=SYSTEM_EQUIPMENT.find(x=>x.id===id);if(!e)return;
 const brands=supportedBrandsForEquipment(e),models=e.brandModels||[];
 openModal('加入我的器材',`<div class="card">
   <div class="record-title">${esc(e.nameZh)}</div><div class="small">${esc(e.nameEn)}</div>
   <div class="field" style="margin-top:12px"><label>品牌</label><select id="mineEqBrand"><option value="">未指定</option>${brands.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')}</select></div>
   <div class="field"><label>系列／型號</label><input id="mineEqModel" list="mineEqModelList" placeholder="例如 SS-CP、1MTH033、3001"><datalist id="mineEqModelList">${models.map(x=>`<option value="${esc(x.model==='—'?x.name:x.model)}">${esc(x.series+' · '+x.name)}</option>`).join('')}</datalist><div class="hint">如果型號不在清單，可以直接輸入機器上的型號或產品名稱。</div></div>
   <div class="field"><label>自訂顯示名稱（選填）</label><input id="mineEqName" placeholder="${esc(e.nameZh)}"></div>
   <button class="btn primary" id="mineEqSave">加入我的器材</button>
 </div>`,()=>{
   const brandSel=$('#mineEqBrand'),modelInput=$('#mineEqModel');
   brandSel.onchange=()=>{
     const ms=brandModelsFor(e,brandSel.value);
     $('#mineEqModelList').innerHTML=ms.map(x=>`<option value="${esc(x.model==='—'?x.name:x.model)}">${esc(x.series+' · '+x.name)}</option>`).join('')
   };
   $('#mineEqSave').onclick=()=>{
     const brand=brandSel.value,model=modelInput.value.trim(),custom=$('#mineEqName').value.trim();
     const same=data.equipment.some(x=>x.systemEquipmentId===id&&(x.brand||'')===brand&&(x.model||'')===model);
     if(same){toast('相同品牌／型號已在「我的器材」');return}
     const mapped=models.find(x=>x.brand===brand&&(x.model===model||x.name===model));
     data.equipment.push({id:uid('eq'),name:custom||e.nameZh,nameEn:e.nameEn,systemEquipmentId:id,category:e.category,brand,model,series:mapped?.series||'',modelName:mapped?.name||'',weightUnit:'kg'});
     save('加入我的器材',true);closeModal();toast('已加入我的器材')
   }
 })
}
let equipmentDisplayLimit=24;
function renderSystemEquipment(){
 const box=$('#systemEquipmentList');if(!box)return;const q=($('#systemEqSearch')?.value||'').trim().toLowerCase(),cat=$('#systemEqCategory')?.value||'',res=$('#systemEqResistance')?.value||'',brand=$('#systemEqBrand')?.value||'';
 const items=SYSTEM_EQUIPMENT.filter(e=>{const brandText=(e.brandModels||[]).map(x=>`${x.brand} ${x.series} ${x.model} ${x.name}`).join(' '),compat=(e.brandCompat||[]).join(' ');const txt=(e.nameZh+' '+e.nameEn+' '+(e.aliases||[]).join(' ')+' '+e.category+' '+e.primary+' '+e.descZh+' '+brandText+' '+compat).toLowerCase();const brandOk=!brand||supportedBrandsForEquipment(e).includes(brand);return(!q||txt.includes(q))&&(!cat||e.category===cat)&&(!res||e.resistance===res)&&brandOk});
 $('#equipmentCount').textContent=`${items.length} / ${SYSTEM_EQUIPMENT.length} 種`;
 const shown=items.slice(0,equipmentDisplayLimit);box.innerHTML=shown.length?shown.map(systemEquipmentCardHtml).join(''):'<div class="card empty">沒有符合條件的器械。</div>';
 if(items.length>shown.length)box.innerHTML+=`<button class="btn ghost" id="equipmentMore" style="width:100%">顯示更多（剩 ${items.length-shown.length}）</button>`;
 bindEquipmentCards(box);const more=$('#equipmentMore');if(more)more.onclick=()=>{equipmentDisplayLimit+=24;renderSystemEquipment()};
}
function showExerciseDetail(id){
 const e=getExercise(id);if(!e)return;const eq=SYSTEM_EQUIPMENT.find(x=>x.id===e.equipmentId),pi=PATTERN_INFO[e.pattern]||'',profile=exerciseStimulusProfile({exerciseId:e.id,muscle:e.muscle,type:e.type,equipmentId:e.equipmentId,sets:[{completed:true,kind:'working'}]});
 openModal(e.name,`<div class="card bilingual"><div class="sys-en">${esc(e.nameEn||'')}</div>${window.TrainLogMotion3DHtml?window.TrainLogMotion3DHtml(e.id,e.pattern,e.name,e.nameEn||'',eq?.nameEn||''):''}<div class="tagrow" style="margin-top:8px"><span class="tag">${esc(e.muscle)}</span><span class="tag">${esc(TYPES.find(t=>t[0]===e.type)?.[1]||e.type)}</span>${pi?`<span class="tag">${esc(GLOSSARY[pi]?.zh||e.pattern)} ${infoButton(pi)}</span>`:''}</div>${profile.length?`<div class="tagrow" style="margin-top:8px">${profile.map(x=>`<span class="tag">${esc(x.muscle)} × ${fmtStim(x.weight)}</span>`).join('')} ${infoButton('stimulus_sets')}</div>`:''}<div style="margin-top:10px">${esc(e.descZh||e.notes||'')}</div><div class="en-copy">${esc(e.descEn||'')}</div>${eq?`<div class="hr"></div><b>使用器械</b><div>${esc(eq.nameZh)} <span class="muted">${esc(eq.nameEn)}</span></div>`:''}<div class="hr"></div><div><b>建議：</b>${e.targetSets} 組 × ${e.repMin}${e.repMax!==e.repMin?'–'+e.repMax:''} · RIR ${e.intMin}–${e.intMax} ${infoButton('rir')} · 休息 ${e.rest} 秒</div>${e.notes?`<div style="margin-top:8px"><b>動作提示：</b>${esc(e.notes)}</div>`:''}</div><div class="actions"><button class="btn primary" id="exYtZh">▶ YouTube 中文搜尋</button><button class="btn ghost" id="exYtEn">▶ English Tutorial</button>${e.system?`<button class="btn ghost" id="exCopy">複製為我的動作</button>`:''}</div>`,()=>{
   $('#exYtZh').onclick=()=>youtubeSearch(e.youtubeZh||`${e.name} 正確姿勢 教學`);$('#exYtEn').onclick=()=>youtubeSearch(e.youtubeEn||`${e.nameEn||e.name} proper form tutorial`);
   const copy=$('#exCopy');if(copy)copy.onclick=()=>copySystemExercise(id);
 });
}
function copySystemExercise(id){
 const e=getExercise(id);if(!e)return;const c=JSON.parse(JSON.stringify(e));c.id=uid('ex');c.system=false;c.name=e.name+'（我的）';data.exerciseLibrary.push(c);save('複製系統動作',true);closeModal();toast('已複製為我的動作');
}
function renderGlossaryIndex(){
 const box=$('#glossaryIndex');if(!box)return;const q=($('#glossarySearch')?.value||'').trim().toLowerCase();
 const items=Object.entries(GLOSSARY).filter(([id,g])=>(id+' '+g.zh+' '+g.en+' '+g.short).toLowerCase().includes(q));
 box.innerHTML=items.map(([id,g])=>`<button class="glossary-chip" type="button" data-info="${esc(id)}"><b>${esc(g.zh)}</b><span>${esc(g.en)}</span></button>`).join('');
}
function initSystemLibraryFilters(){
 const pc=$('#programCategory'),pl=$('#programLevel'),ec=$('#systemEqCategory'),er=$('#systemEqResistance');
 if(pc&&!pc.options.length)pc.innerHTML='<option value="">全部分類</option>'+[...new Set(SYSTEM_PROGRAMS.map(p=>p.category))].map(x=>`<option>${esc(x)}</option>`).join('');
 if(pl&&!pl.options.length)pl.innerHTML='<option value="">不限程度</option>'+[...new Set(SYSTEM_PROGRAMS.map(p=>p.level))].map(x=>`<option>${esc(x)}</option>`).join('');
 if(ec&&!ec.options.length)ec.innerHTML='<option value="">全部分類</option>'+[...new Set(SYSTEM_EQUIPMENT.map(e=>e.category))].map(x=>`<option>${esc(x)}</option>`).join('');
 if(er&&!er.options.length)er.innerHTML='<option value="">全部形式</option>'+[...new Set(SYSTEM_EQUIPMENT.map(e=>e.resistance))].map(x=>`<option value="${esc(x)}">${esc(resistanceLabel(x))}</option>`).join('');
}

let currentSettingsView='hub';
function showSettingsView(view='hub'){
 currentSettingsView=view;
 const map={hub:'#settingsHub',programs:'#settingsPrograms',exercises:'#settingsExercises',gym:'#settingsGym',training:'#settingsTraining',glossary:'#settingsGlossary',data:'#settingsData'};
 Object.values(map).forEach(sel=>{const el=$(sel);if(el)el.classList.add('hidden')});
 const target=$(map[view]||map.hub);if(target)target.classList.remove('hidden');
 window.scrollTo({top:0,behavior:'smooth'});
}
function renderSettings(){
 initSystemLibraryFilters();renderSystemPrograms();renderSystemEquipment();renderGlossaryIndex();const gpr=$('#goalProgramRecommendations');if(gpr){gpr.innerHTML=goalProgramRecommendationsHtml();bindProgramCards(gpr)};
 const hp=$('#hubProgramSummary'),ht=$('#hubTemplateSummary'),he=$('#hubEquipmentSummary'),hx=$('#hubExerciseSummary'),hg=$('#hubGymSummary'),hme=$('#hubMyEquipmentSummary');
 if(hp)hp.textContent=`${SYSTEM_PROGRAMS.length} 套系統課表`;
 if(ht)ht.textContent=`${data.templates.length} 個我的模板`;
 if(he)he.textContent=`${SYSTEM_EQUIPMENT.length} 種系統器械`;
 if(hx)hx.textContent=`${data.exerciseLibrary.length} 個動作`;
 if(hg)hg.textContent=`${data.gyms.length} 間健身房`;
 if(hme)hme.textContent=`${data.equipment.length} 台我的器材`;
 $('#templateList').innerHTML=data.templates.length?data.templates.map(t=>`<div class="template-item"><div class="record-head"><div><b>${esc(t.name)}</b> ${t.sourceProgramId?'<span class="source-pill">FROM SYSTEM</span>':''}<div class="record-meta">${t.items.length} 個動作${t.nameEn?' · '+esc(t.nameEn):''}</div></div><div class="actions"><button class="btn small ghost" data-edit-tpl="${t.id}">編輯</button><button class="btn small danger" data-del-tpl="${t.id}">刪除</button></div></div>${t.dayMeta?.focusSummary?`<div class="small" style="margin-top:7px"><b>${esc(t.dayMeta.dayTitle||'訓練重點')}</b> · ${esc(t.dayMeta.focusSummary)}</div>`:''}<div class="tagrow" style="margin-top:8px">${t.items.map(i=>`<span class="tag">${esc(getExercise(i.exerciseId)?.name||'已刪除動作')}</span>`).join('')}</div></div>`).join(''):'<div class="card empty">尚無「我的模板」。可從上方系統課表加入，或自己建立。</div>';
 $$('[data-edit-tpl]').forEach(b=>b.onclick=()=>editTemplate(b.dataset.editTpl));$$('[data-del-tpl]').forEach(b=>b.onclick=()=>{if(confirm('刪除此課表？')){data.templates=data.templates.filter(t=>t.id!==b.dataset.delTpl);save('刪除課表',true)}});
 renderLibrary();
 renderGymSettings();
 $('#equipmentList').innerHTML=data.equipment.length?data.equipment.map(e=>`<div class="snapshot-item"><div class="snapshot-copy"><div class="snapshot-time">${esc(e.name)}</div><div class="snapshot-reason">${e.brand?esc(e.brand):'未指定品牌'}${e.model?` · ${esc(e.model)}`:''}${e.series?` · ${esc(e.series)}`:''} · 重量標示 ${normalizeWeightUnit(e.weightUnit||'kg')}</div></div><div class="actions"><button class="btn small ghost" data-eq-unit="${e.id}">${normalizeWeightUnit(e.weightUnit||'kg')} ↔</button><button class="btn small danger" data-deleq="${e.id}">刪除</button></div></div>`).join(''):'<div class="empty">尚未建立自己的器材。</div>';
 $$('[data-eq-unit]').forEach(b=>b.onclick=()=>{const e=data.equipment.find(x=>x.id===b.dataset.eqUnit);if(!e)return;e.weightUnit=normalizeWeightUnit(e.weightUnit)==='kg'?'lb':'kg';save('修改器材重量單位',false);toast(`器材重量標示改為 ${e.weightUnit}`)});
 $$('[data-deleq]').forEach(b=>b.onclick=()=>{data.equipment=data.equipment.filter(e=>e.id!==b.dataset.deleq);save('刪除器材',true)});
 $('#setTrainingGoal').value=coachGoal();$('#setSessionMinutes').value=String(n(data.settings.sessionMinutes)||60);$('#setExperienceLevel').value=data.settings.experienceLevel||'beginner';$('#setEquipmentPreference').value=data.settings.equipmentPreference||'machine';$('#setBlockWeeks').value=String(n(data.settings.blockWeeks)||6);$('#setPreferredGym').innerHTML='<option value="">不指定／資料不足時不評分器材</option>'+data.gyms.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');$('#setPreferredGym').value=data.settings.preferredGymId||'';$('#priorityMuscleOptions').innerHTML=MUSCLES.filter(m=>!['有氧','其他'].includes(m)).map(m=>`<label><input type="checkbox" data-priority-muscle="${m}" ${priorityMuscles().includes(m)?'checked':''}>${m}</label>`).join('');const wd=['日','一','二','三','四','五','六'],avs=availableWeekdays();$('#availableWeekdayOptions').innerHTML=wd.map((x,i)=>`<label><input type="checkbox" data-available-weekday="${i}" ${avs.includes(i)?'checked':''}>週${x}</label>`).join('');$('#setAllowConsecutiveDays').checked=!!data.settings.allowConsecutiveDays;$('#setUnit').value=data.settings.unit;$('#setIntensity').value=data.settings.intensity;$('#setRest').value=data.settings.defaultRest;$('#setWeeklySessions').value=data.settings.weeklySessions;$('#setCardioGoal').value=data.settings.weeklyCardio;$('#setWeekStart').value=String(data.settings.weekStart);$('#setWarmup').checked=!!data.settings.includeWarmup;$('#set1rm').checked=!!data.settings.show1RM;
 $('#setUiLevel').value=uiLevel();const tutBtn=$('#openTutorialFromSettings');if(tutBtn)tutBtn.onclick=openTutorialAgain;$('#setRestTimerPosition').value=data.settings.restTimerPosition||'top';$('#setTrainingNotes').checked=data.settings.trainingNotes!==false;$('#setTrainingAutoLoad').checked=data.settings.trainingAutoLoad!==false;$('#setTrainingIntervalTimer').checked=data.settings.trainingIntervalTimer!==false;$('#setRestTimerSound').checked=data.settings.restTimerSound!==false;
 $('#muscleGoalInputs').innerHTML=MUSCLES.filter(m=>!['有氧','其他'].includes(m)).map(m=>`<div class="field"><label>${m}</label><input type="number" min="0" max="50" data-mgoal="${m}" value="${n((data.settings.weeklyMuscleGoals||{})[m])}"></div>`).join('');
 $('#strengthGoalList').innerHTML=(data.strengthGoals||[]).length?data.strengthGoals.map(g=>`<div class="record"><div class="record-head"><div><b>${esc(getExercise(g.exerciseId)?.name||'已刪除動作')}</b><div class="record-meta">目標 ${fmtWeight(g.weight)} × ${g.reps}</div></div><button class="btn small danger" data-delgoal="${g.id}">刪除</button></div></div>`).join(''):'<div class="small">尚未設定力量目標</div>';
 $$('[data-delgoal]').forEach(b=>b.onclick=()=>{data.strengthGoals=data.strengthGoals.filter(g=>g.id!==b.dataset.delgoal);save('刪除力量目標',true)});
 $('#snapshotList').innerHTML=data.snapshots.length?data.snapshots.map(s=>`<div class="snapshot-item"><div class="snapshot-copy"><div class="snapshot-time">${new Date(s.at).toLocaleString('zh-TW')}</div><div class="snapshot-reason">${esc(s.reason||'自動備份')}</div></div><button class="btn small ghost" data-restore-snap="${s.id}">恢復</button></div>`).join(''):'<div class="empty">尚無自動備份紀錄</div>';
 $$('[data-restore-snap]').forEach(b=>b.onclick=()=>{const s=data.snapshots.find(x=>x.id===b.dataset.restoreSnap);if(s&&confirm('恢復此快照？目前資料會先另存一份快照。')){snapshot('恢復前');const snaps=data.snapshots;data=migrate(JSON.parse(JSON.stringify(s.payload)));data.snapshots=snaps;save('恢復快照',false);toast('已恢復快照')}})
}
function renderLibrary(){
 const q=($('#libSearch')?.value||'').toLowerCase();
 const items=data.exerciseLibrary.filter(e=>(e.name+' '+(e.nameEn||'')+' '+(e.aliases||[]).join(' ')).toLowerCase().includes(q)).sort((a,b)=>Number(!!a.system)-Number(!!b.system)||a.name.localeCompare(b.name,'zh-Hant'));
 const shown=items.slice(0,80);
 $('#libraryList').innerHTML=shown.map(e=>`<div class="library-item"><div class="record-head"><div><b>${esc(e.name)}</b> ${e.system?'<span class="source-pill">SYSTEM</span>':'<span class="source-pill">MY</span>'}<div class="eq-en">${esc(e.nameEn||'')}</div><div class="record-meta">${esc((e.aliases||[]).join(' / '))}</div></div><div class="actions">${e.system?`<button class="btn small primary" data-viewlib="${e.id}">詳細</button><button class="btn small ghost" data-copylib="${e.id}">複製</button>`:`<button class="btn small ghost" data-editlib="${e.id}">編輯</button><button class="btn small danger" data-dellib="${e.id}">刪除</button>`}</div></div><div class="tagrow" style="margin-top:8px"><span class="tag">${esc(e.muscle)}</span><span class="tag">${esc(TYPES.find(t=>t[0]===e.type)?.[1]||e.type)}</span><span class="tag">${e.targetSets} 組 · ${e.repMin}–${e.repMax}</span><span class="tag">休 ${e.rest}s</span>${e.pattern&&GLOSSARY[PATTERN_INFO[e.pattern]]?`<span class="tag">${esc(GLOSSARY[PATTERN_INFO[e.pattern]].zh)} ${infoButton(PATTERN_INFO[e.pattern])}</span>`:''}</div></div>`).join('')+(items.length>shown.length?`<div class="card small">目前顯示前 ${shown.length} 個；可用搜尋快速找到其他系統動作。</div>`:'');
 $$('[data-viewlib]').forEach(b=>b.onclick=()=>showExerciseDetail(b.dataset.viewlib));$$('[data-copylib]').forEach(b=>b.onclick=()=>copySystemExercise(b.dataset.copylib));
 $$('[data-editlib]').forEach(b=>b.onclick=()=>editExerciseLib(b.dataset.editlib));$$('[data-dellib]').forEach(b=>b.onclick=()=>{if(data.templates.some(t=>t.items.some(i=>i.exerciseId===b.dataset.dellib))){alert('此動作仍被課表使用，請先從課表移除。');return}if(confirm('刪除此自訂動作？歷史紀錄仍會保留名稱快照。')){data.exerciseLibrary=data.exerciseLibrary.filter(e=>e.id!==b.dataset.dellib);save('刪除動作',true)}})
}
function normalizeMachineLookupText(v){
 return String(v||'').toLowerCase()
   .replace(/&/g,' and ')
   .replace(/[／/\\|,_\-–—()[\]{}:;]+/g,' ')
   .replace(/\s+/g,' ').trim()
}
function machineLookupCandidates(query,limit=6){
 const raw=String(query||'').trim(),q=normalizeMachineLookupText(raw);
 if(q.length<2)return[];
 const qTokens=q.split(' ').filter(Boolean);
 const out=[];
 SYSTEM_EQUIPMENT.forEach(eq=>{
   const sources=[];
   const addSource=(text,label,weight=0)=>{
     const norm=normalizeMachineLookupText(text);if(!norm)return;
     let score=0,kind='關鍵字相符';
     if(norm===q){score=120+weight;kind='英文名稱相符'}
     else if(norm.startsWith(q)||q.startsWith(norm)){score=95+weight;kind='名稱高度相符'}
     else if(norm.includes(q)){score=82+weight;kind='名稱包含'}
     else{
       const hit=qTokens.filter(t=>norm.includes(t)).length;
       if(hit===qTokens.length&&hit){score=62+hit*5+weight;kind='關鍵字相符'}
       else if(hit>=Math.max(1,Math.ceil(qTokens.length*.7))){score=38+hit*4+weight;kind='部分關鍵字相符'}
     }
     if(score)sources.push({score,kind,label,text})
   };
   addSource(eq.nameEn,'器械英文名稱',8);addSource(eq.nameZh,'器械中文名稱',2);
   (eq.aliases||[]).forEach(a=>addSource(a,'別名',4));
   (eq.brandModels||[]).forEach(m=>{
     addSource(m.model,`${m.brand} 型號`,24);
     addSource(m.name,`${m.brand} 產品名稱`,18);
     addSource(`${m.brand} ${m.model}`,`${m.brand} 品牌＋型號`,28);
     addSource(`${m.brand} ${m.name}`,`${m.brand} 品牌＋產品名`,20);
     addSource(`${m.series} ${m.model} ${m.name}`,`${m.brand} 系列／型號`,16)
   });
   if(!sources.length)return;
   sources.sort((a,b)=>b.score-a.score);
   const best=sources[0],actions=SYSTEM_EXERCISES.filter(ex=>ex.equipmentId===eq.id);
   out.push({eq,score:best.score,match:best,actions})
 });
 return out.sort((a,b)=>b.score-a.score||b.actions.length-a.actions.length||a.eq.nameEn.localeCompare(b.eq.nameEn)).slice(0,limit)
}
function applyLookupExerciseToEditor(exId){
 const ex=SYSTEM_EXERCISES.find(x=>x.id===exId);if(!ex)return;
 const set=(id,val)=>{const el=$(id);if(el)el.value=val??''};
 set('#elName',ex.name);set('#elNameEn',ex.nameEn||'');
 set('#elAliases',(ex.aliases||[]).join(', '));set('#elMuscle',ex.muscle||'其他');
 set('#elType',ex.type||'weight_reps');set('#elSets',ex.targetSets??3);
 set('#elMin',ex.repMin??8);set('#elMax',ex.repMax??12);set('#elInc',ex.increment??2.5);
 set('#elRest',ex.rest??90);set('#elEq',ex.equipmentId||'');set('#elPattern',ex.pattern||'');
 set('#elNotes',ex.notes||ex.descZh||'');
 toast(`已套用「${ex.name}」，確認後可再修改`)
}
function renderMachineLookupResults(query){
 const box=$('#machineLookupResults');if(!box)return;
 const q=String(query||'').trim();
 if(q.length<2){box.innerHTML='<div class="machine-lookup-empty">輸入至少 2 個字元，例如 <b>Lat Pulldown</b>、<b>Inner / Outer Thigh</b>、<b>Pullover</b>，也可以輸入品牌型號。</div>';return}
 const hits=machineLookupCandidates(q);
 if(!hits.length){box.innerHTML='<div class="machine-lookup-empty">目前找不到相符器械。你仍可以建立自訂動作；也可以嘗試只輸入銘牌上的核心英文，例如 <b>Leg Extension</b>，不要輸入警告文字或整段操作說明。</div>';return}
 box.innerHTML=hits.map(({eq,match,actions})=>{
   const brands=[...new Set((eq.brandModels||[]).map(x=>x.brand).filter(Boolean))];
   const matched=`${match.kind} · ${match.label}${match.text?`：「${match.text}」`:''}`;
   return `<div class="machine-match">
     <div class="machine-match-head"><div><div class="machine-match-title">${esc(eq.nameZh)}</div><div class="machine-match-en">${esc(eq.nameEn)}</div></div><span class="tag">${esc(eq.category)}</span></div>
     <div class="machine-match-source">${esc(matched)}</div>
     <div class="tagrow" style="margin-top:6px"><span class="tag">${esc(eq.primary)}</span>${eq.pattern?`<span class="tag">${esc(patternDisplayName(eq.pattern))}</span>`:''}${brands.slice(0,4).map(b=>`<span class="tag">${esc(b)}</span>`).join('')}</div>
     <div class="machine-actions">${actions.length?actions.map(ex=>`<div class="machine-action">
       <div class="machine-action-head"><div><div class="machine-action-name">${esc(ex.name)}</div><div class="machine-action-en">${esc(ex.nameEn||'')}</div></div><span class="tag">${esc(ex.muscle||'')}</span></div>
       <div class="machine-action-desc">${esc(ex.descZh||ex.notes||'')}</div>
       <div class="tagrow" style="margin-top:6px">${ex.pattern?`<span class="tag">${esc(patternDisplayName(ex.pattern))}</span>`:''}<span class="tag">${esc(TYPES.find(t=>t[0]===ex.type)?.[1]||ex.type)}</span></div>
       <div class="actions"><button class="btn small primary" type="button" data-machine-use="${esc(ex.id)}">套用這個動作</button><button class="btn small ghost" type="button" data-machine-yt="${esc(ex.id)}">▶ 查看教學搜尋</button></div>
     </div>`).join(''):`<div class="machine-lookup-empty">器械已辨識，但目前沒有專屬系統動作；可選擇這台器械後自行建立動作。</div>`}</div>
   </div>`
 }).join('');
 $$('[data-machine-use]').forEach(b=>b.onclick=()=>applyLookupExerciseToEditor(b.dataset.machineUse));
 $$('[data-machine-yt]').forEach(b=>b.onclick=()=>{const ex=SYSTEM_EXERCISES.find(x=>x.id===b.dataset.machineYt);if(ex)youtubeSearch(ex.youtubeEn||`${ex.nameEn||ex.name} proper form tutorial`)})
}
function initMachineLabelLookup(){
 const input=$('#machineLabelLookup'),btn=$('#machineLookupBtn');if(!input||!btn)return;
 const run=()=>renderMachineLookupResults(input.value);
 btn.onclick=run;input.addEventListener('input',()=>{if(input.value.trim().length>=3)run();else renderMachineLookupResults(input.value)});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run()}});
 renderMachineLookupResults('')
}
function editExerciseLib(id=''){
 if(id&&getExercise(id)?.system){showExerciseDetail(id);return}
 const e=id?getExercise(id):{id:uid('ex'),name:'',nameEn:'',aliases:[],system:false,muscle:'胸',type:'weight_reps',increment:2.5,targetSets:3,repMin:8,repMax:12,intMin:2,intMax:3,rest:90,notes:'',equipmentId:'',gymId:'',alternatives:[]};
 const lookupHtml=!id?`<div class="machine-lookup">
   <div class="machine-lookup-head"><div class="machine-lookup-icon">⌕</div><div><div class="machine-lookup-title">先用器械上的英文名稱確認動作</div><div class="machine-lookup-desc">照銘牌輸入英文名稱、品牌產品名或型號。系統會顯示可能的中文器械、對應動作、肌群與動作模式，確認後再套用。</div></div></div>
   <div class="machine-lookup-row"><input id="machineLabelLookup" autocomplete="off" placeholder="例如 Inner / Outer Thigh、Lat Pulldown、1MTH039"><button class="btn ghost" type="button" id="machineLookupBtn">查找</button></div>
   <div id="machineLookupResults" class="machine-lookup-results"></div>
 </div>`:'';
 openModal(id?'編輯動作':'新增動作',`${lookupHtml}<div class="grid2"><div class="field"><label>中文名稱</label><input id="elName" value="${esc(e.name)}"></div><div class="field"><label>英文名稱</label><input id="elNameEn" value="${esc(e.nameEn||'')}"></div><div class="field"><label>別名（逗號分隔）</label><input id="elAliases" value="${esc((e.aliases||[]).join(','))}"></div><div class="field"><label>肌群</label><select id="elMuscle">${MUSCLES.map(m=>`<option ${e.muscle===m?'selected':''}>${m}</option>`).join('')}</select></div><div class="field"><label>類型</label><select id="elType">${TYPES.map(([v,l])=>`<option value="${v}" ${e.type===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label>目標組數</label><input type="number" id="elSets" value="${e.targetSets}"></div><div class="field"><label>次數/秒數下限</label><input type="number" id="elMin" value="${e.repMin}"></div><div class="field"><label>次數/秒數上限</label><input type="number" id="elMax" value="${e.repMax}"></div><div class="field"><label>建議增量</label><input type="number" step=".1" id="elInc" value="${e.increment}"></div><div class="field"><label>休息秒數</label><input type="number" id="elRest" value="${e.rest}"></div><div class="field"><label>器材</label><select id="elEq"><option value="">未指定</option><optgroup label="系統器械">${SYSTEM_EQUIPMENT.map(x=>`<option value="${x.id}" ${e.equipmentId===x.id?'selected':''}>${esc(x.nameZh)} / ${esc(x.nameEn)}</option>`).join('')}</optgroup><optgroup label="我的器材">${data.equipment.map(x=>`<option value="${x.id}" ${e.equipmentId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</optgroup></select></div>
 <div class="field"><label>動作模式 <button class="info-btn" type="button" data-info="movement_balance">i</button></label><select id="elPattern"><option value="">自動判斷 / 未指定</option>${Object.keys(STIMULUS_BY_PATTERN).map(p=>`<option value="${p}" ${e.pattern===p?'selected':''}>${esc(patternDisplayName(p))}</option>`).join('')}</select></div></div>
 <div class="field"><label>永久備註 / 機台設定</label><textarea id="elNotes">${esc(e.notes||'')}</textarea></div><div class="field"><label>替代動作</label><div class="chipselect">${data.exerciseLibrary.filter(x=>x.id!==e.id).map(x=>`<button type="button" data-alt="${x.id}" class="${(e.alternatives||[]).includes(x.id)?'on':''}">${esc(x.name)}</button>`).join('')}</div></div><button class="btn primary" id="elSave">儲存動作</button>`,()=>{
   if(!id)initMachineLabelLookup();
   $$('[data-alt]').forEach(b=>b.onclick=()=>b.classList.toggle('on'));
   $('#elSave').onclick=()=>{const name=$('#elName').value.trim();if(!name){toast('請輸入動作名稱');return}e.name=name;e.nameEn=$('#elNameEn').value.trim();e.aliases=$('#elAliases').value.split(',').map(x=>x.trim()).filter(Boolean);e.muscle=$('#elMuscle').value;e.type=$('#elType').value;e.targetSets=clamp($('#elSets').value,1,20);e.repMin=clamp($('#elMin').value,0,1000);e.repMax=Math.max(e.repMin,clamp($('#elMax').value,0,2000));e.increment=clamp($('#elInc').value,0,500);e.rest=clamp($('#elRest').value,0,900);e.equipmentId=$('#elEq').value;e.pattern=$('#elPattern').value||SYSTEM_EQUIPMENT.find(x=>x.id===e.equipmentId)?.pattern||'';e.notes=$('#elNotes').value;e.alternatives=$$('[data-alt].on').map(b=>b.dataset.alt);if(!id)data.exerciseLibrary.push(e);save(id?'編輯動作':'新增動作',true);closeModal();toast('已儲存')}
 })
}
function editTemplate(id=''){
 const original=id?data.templates.find(x=>x.id===id):null;
 let working=JSON.parse(JSON.stringify(original||{id:uid('tpl'),name:'新課表',items:[]}));
 const showEditor=()=>{
   const itemHtml=()=>working.items.map((it,i)=>`<div class="record"><div class="record-head"><b>${i+1}. ${esc(getExercise(it.exerciseId)?.name||'已刪除')}</b><div class="actions"><button class="btn small ghost" data-tu="${i}">↑</button><button class="btn small ghost" data-td="${i}">↓</button><button class="btn small danger" data-tr="${i}">刪</button></div></div></div>`).join('')||'<div class="empty">尚未加入動作。</div>';
   const bindRows=()=>{
     const box=$('#tplItems');if(!box)return;box.innerHTML=itemHtml();
     $$('[data-tr]').forEach(b=>b.onclick=()=>{working.items.splice(n(b.dataset.tr),1);bindRows()});
     $$('[data-tu]').forEach(b=>b.onclick=()=>{const i=n(b.dataset.tu);if(i>0)[working.items[i-1],working.items[i]]=[working.items[i],working.items[i-1]];bindRows()});
     $$('[data-td]').forEach(b=>b.onclick=()=>{const i=n(b.dataset.td);if(i<working.items.length-1)[working.items[i+1],working.items[i]]=[working.items[i],working.items[i+1]];bindRows()})
   };
   openModal(id?'編輯課表':'新增課表',`<div class="field"><label>課表名稱</label><input id="tplName" value="${esc(working.name)}"></div><div id="tplItems"></div><div class="actions"><button class="btn ghost" id="tplAdd">＋ 加動作</button><button class="btn primary" id="tplSave">儲存課表</button></div>`,()=>{
     bindRows();
     $('#tplAdd').onclick=()=>{working.name=$('#tplName').value.trim()||working.name||'新課表';openExercisePicker(ex=>{working.items.push({exerciseId:ex.id});showEditor()})};
     $('#tplSave').onclick=()=>{working.name=$('#tplName').value.trim()||'未命名課表';if(id){const i=data.templates.findIndex(x=>x.id===id);if(i>=0)data.templates[i]=working}else data.templates.push(working);save(id?'編輯課表':'新增課表',true);closeModal();toast('已儲存課表')}
   })
 };
 showEditor()
}

function download(name,text,type){const blob=new Blob([text],{type}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function buildBackupPayload(){return{...JSON.parse(JSON.stringify(data)),backupMeta:{format:'trainlog-pro-full-backup',version:1,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),includes:['訓練紀錄','目前訓練計畫','訓練偏好與目標','我的課表','自訂動作','健身房與器材','進行中的訓練','身體狀態','力量目標','回收筒','自動備份紀錄']},app:'TrainLog Pro'}}
function exportJSON(){download('trainlog-pro-'+isoToday()+'.json',JSON.stringify(buildBackupPayload(),null,2),'application/json');toast('完整備份已下載')}
function mergeById(a,b){const m=new Map((a||[]).map(x=>[x.id,x]));(b||[]).forEach(x=>m.set(x.id,x));return[...m.values()]}
function mergeSnapshots(a,b){const m=new Map();[...(a||[]),...(b||[])].forEach(x=>{if(x?.id&&!m.has(x.id))m.set(x.id,x)});return[...m.values()].sort((x,y)=>String(y.at||'').localeCompare(String(x.at||''))).slice(0,5)}
function mergeBodyStatus(a,b){const m=new Map((a||[]).map(x=>[x.date,x]));(b||[]).forEach(x=>{if(x?.date)m.set(x.date,x)});return[...m.values()].sort((x,y)=>String(y.date||'').localeCompare(String(x.date||'')))}
function importSummaryHtml(migrated,type,newCount,dup,source=null){
 const raw=source&&typeof source==='object'?source:{};
 const hasSettings=type==='json'&&!!raw.settings&&typeof raw.settings==='object',hasPlan=type==='json'&&!!raw.currentPlan,hasActive=type==='json'&&!!raw.activeWorkout;
 return `<div class="card"><div class="grid3"><div class="stat"><b>${migrated.workouts.length}</b><span>訓練紀錄</span></div><div class="stat"><b>${newCount}</b><span>新增紀錄</span></div><div class="stat"><b>${dup}</b><span>相同 ID</span></div></div><div class="tagrow" style="margin-top:12px"><span class="tag">我的課表 ${migrated.templates.length}</span><span class="tag">健身房 ${migrated.gyms.length}</span><span class="tag">我的器材 ${migrated.equipment.length}</span><span class="tag">身體狀態 ${migrated.bodyStatus.length}</span><span class="tag">力量目標 ${migrated.strengthGoals.length}</span>${hasSettings?'<span class="tag good">訓練偏好 ✓</span>':''}${hasPlan?'<span class="tag good">目前計畫 ✓</span>':''}${hasActive?'<span class="tag">未完成訓練 ✓</span>':''}</div>${type==='csv'?'<div class="small" style="margin-top:10px">CSV 只包含訓練表格資料，不會覆蓋訓練偏好、目前計畫或 App 設定。</div>':'<div class="small" style="margin-top:10px">完整 JSON 備份可恢復訓練偏好、目前計畫、器材、課表與其他個人資料。</div>'}</div>`
}
function previewImport(incoming,type,fileName){
 const migrated=migrate(incoming),existing=new Map(data.workouts.map(w=>[w.id,w])),newCount=migrated.workouts.filter(w=>!existing.has(w.id)).length,dup=migrated.workouts.length-newCount;
 const modeOptions=type==='json'?`<option value="restore">完整還原備份（包含偏好、目前計畫與其他設定）</option><option value="merge">只合併訓練資料，不修改目前設定</option><option value="skip">只加入新的訓練資料，略過相同 ID</option>`:`<option value="merge">合併 CSV 訓練資料</option><option value="skip">只加入新的 CSV 訓練資料</option>`;
 openModal('匯入預覽',`<div class="card"><b>${esc(fileName)}</b><div class="small" style="margin-top:7px">已偵測到可相容的${type==='json'?'完整備份':'表格資料'}</div></div>${importSummaryHtml(migrated,type,newCount,dup,incoming)}<div class="field"><label>匯入方式</label><select id="impMode">${modeOptions}</select><div class="hint">完整還原會先自動保存目前狀態，之後仍可從自動備份紀錄恢復。</div></div><button class="btn primary" id="impConfirm">確認匯入</button>`,()=>$('#impConfirm').onclick=()=>{
   const mode=$('#impMode').value;snapshot('匯入前');const beforeSnapshots=[...(data.snapshots||[])];
   if(mode==='restore'&&type==='json'){
     const importedSnapshots=[...(migrated.snapshots||[])];data=migrated;data.snapshots=mergeSnapshots(beforeSnapshots,importedSnapshots);
   }else{
     const map=new Map(data.workouts.map(w=>[w.id,w]));migrated.workouts.forEach(w=>{if(mode==='merge'||!map.has(w.id))map.set(w.id,w)});data.workouts=[...map.values()];
     data.exerciseLibrary=mergeById(data.exerciseLibrary,migrated.exerciseLibrary);data.templates=mergeById(data.templates,migrated.templates);data.gyms=mergeById(data.gyms,migrated.gyms);data.equipment=mergeById(data.equipment,migrated.equipment);data.bodyStatus=mergeBodyStatus(data.bodyStatus,migrated.bodyStatus);data.strengthGoals=mergeById(data.strengthGoals,migrated.strengthGoals);data.snapshots=beforeSnapshots;
   }
   syncGymsFromHistory(false);save('匯入資料',false);closeModal();toast(mode==='restore'?'完整備份已恢復':'訓練資料已合併')
 })
}
function csvEscape(v){return'"'+String(v??'').replace(/"/g,'""')+'"'}
function exportCSV(){
 const rows=[['workoutId','date','workoutName','duration','deload','gymName','exerciseId','exerciseName','muscle','type','equipmentId','inputUnit','setIndex','kind','weightKg','reps','rir','rpe','seconds','leftWeightKg','leftReps','rightWeightKg','rightReps','cardioMinutes','distanceKm','speed','incline','notes']];
 data.workouts.forEach(w=>(w.exercises||[]).forEach(e=>{const gymName=workoutGymName(w),eqId=e.equipmentId||getExercise(e.exerciseId)?.equipmentId||'',inputUnit=exerciseInputUnit(e);if(e.type==='cardio')rows.push([w.id,w.date,w.name,w.duration,w.deload,gymName,e.exerciseId,e.nameSnapshot,e.muscle,e.type,eqId,inputUnit,1,'working','','','','','','','','','','',e.cardio?.minutes,e.cardio?.distanceKm,e.cardio?.speed,e.cardio?.incline,w.notes]);else(e.sets||[]).forEach((s,i)=>rows.push([w.id,w.date,w.name,w.duration,w.deload,gymName,e.exerciseId,e.nameSnapshot,e.muscle,e.type,eqId,inputUnit,i+1,s.kind,s.weight,s.reps,s.rir,s.rpe,s.seconds,s.leftWeight,s.leftReps,s.rightWeight,s.rightReps,'','','','',w.notes]))}));
 const csv='\ufeff'+rows.map(r=>r.map(csvEscape).join(',')).join('\n');download('trainlog-pro-'+isoToday()+'.csv',csv,'text/csv;charset=utf-8');toast('CSV 已匯出')
}
function parseCSV(text){
 const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(c!=='\r')cell+=c}}row.push(cell);if(row.some(x=>x!==''))rows.push(row);return rows
}
function csvToData(text){
 const rows=parseCSV(text.replace(/^\ufeff/,''));if(rows.length<2)throw Error('empty');const h=rows[0],ix=k=>h.indexOf(k);const wm=new Map();
 rows.slice(1).forEach(r=>{const id=r[ix('workoutId')]||uid('w');if(!wm.has(id))wm.set(id,{id,date:r[ix('date')]||isoToday(),name:r[ix('workoutName')]||'CSV 匯入',duration:n(r[ix('duration')]),status:'completed',startedAt:'',endedAt:'',notes:r[ix('notes')]||'',gymId:'',gymNameSnapshot:ix('gymName')>=0?(r[ix('gymName')]||''):'',deload:r[ix('deload')]==='true',preStatus:{},pain:'',exercises:[]});const w=wm.get(id),eid=r[ix('exerciseId')]||uid('excsv'),name=r[ix('exerciseName')]||'動作',type=r[ix('type')]||'weight_reps',inputUnit=ix('inputUnit')>=0?normalizeWeightUnit(r[ix('inputUnit')]):'kg';let e=w.exercises.find(x=>x.exerciseId===eid);if(!e){e={exerciseId:eid,nameSnapshot:name,muscle:r[ix('muscle')]||'其他',type,equipmentId:ix('equipmentId')>=0?(r[ix('equipmentId')]||''):'',notes:'',inputUnit,sets:[],cardio:{minutes:0,distanceKm:0,speed:0,incline:0,pace:''}};w.exercises.push(e)}if(type==='cardio'){e.cardio={minutes:n(r[ix('cardioMinutes')]),distanceKm:n(r[ix('distanceKm')]),speed:n(r[ix('speed')]),incline:n(r[ix('incline')]),pace:''}}else{const wIdx=ix('weightKg')>=0?ix('weightKg'):ix('weight'),lwIdx=ix('leftWeightKg')>=0?ix('leftWeightKg'):ix('leftWeight'),rwIdx=ix('rightWeightKg')>=0?ix('rightWeightKg'):ix('rightWeight');e.sets.push({id:uid('s'),kind:r[ix('kind')]||'working',weight:n(r[wIdx]),reps:n(r[ix('reps')]),rir:r[ix('rir')]||'',rpe:r[ix('rpe')]||'',seconds:n(r[ix('seconds')]),leftWeight:n(r[lwIdx]),leftReps:n(r[ix('leftReps')]),rightWeight:n(r[rwIdx]),rightReps:n(r[ix('rightReps')]),completed:true})}});
 return{schemaVersion:CURRENT_SCHEMA,workouts:[...wm.values()],exerciseLibrary:data.exerciseLibrary,templates:[],gyms:[],equipment:[],settings:data.settings,bodyStatus:[],trash:[],snapshots:[],strengthGoals:[]}
}

function goPage(id){$$('.page').forEach(p=>p.classList.toggle('active',p.id===id));$$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));if(id==='settingsPage')showSettingsView('hub');window.scrollTo({top:0,behavior:'smooth'});renderAll();setTimeout(()=>maybeStartPageTutorial(id),80)}
$$('.nav button').forEach(b=>b.onclick=()=>goPage(b.dataset.page));
initRestTimerUI();initTrainingDrawer();
$('#quickStart').onclick=()=>data.activeWorkout?goPage('trainPage'):openStartModal();$('#quickManual').onclick=manualEntry;$('#manualFromRecords').onclick=manualEntry;
$('#recordMonth').onchange=renderRecords;$('#recordMuscle').onchange=renderRecords;
function shiftMonth(delta){const [y,m]=$('#recordMonth').value.split('-').map(Number),d=new Date(y,m-1+delta,1);$('#recordMonth').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');renderRecords()}
$('#prevMonth').onclick=()=>shiftMonth(-1);$('#nextMonth').onclick=()=>shiftMonth(1);$('#thisMonth').onclick=()=>{$('#recordMonth').value=monthKey();renderRecords()};
$('#analysisExercise').onchange=e=>renderExerciseAnalysis(e.target.value);
$$('[data-analysis-range]').forEach(b=>b.onclick=()=>{const next=['7','30','90','all'].includes(b.dataset.analysisRange)?b.dataset.analysisRange:'30';analysisRange=next;data.settings.analysisRange=next;try{localStorage.setItem(APP_KEY,JSON.stringify(data))}catch{}renderAnalysis()});
$('#addTemplateBtn').onclick=()=>editTemplate();$('#addExerciseLibBtn').onclick=()=>editExerciseLib();$('#libSearch').oninput=renderLibrary;
$$('[data-settings-view]').forEach(b=>b.onclick=()=>showSettingsView(b.dataset.settingsView));
$$('.settings-back').forEach(b=>b.onclick=()=>showSettingsView('hub'));
['programSearch','programCategory','programDays','programLevel','programDuration','programEquip','programGoal'].forEach(id=>{const el=$('#'+id);if(el)el.addEventListener(id==='programSearch'?'input':'change',()=>{programDisplayLimit=18;renderSystemPrograms()})});
['systemEqSearch','systemEqCategory','systemEqResistance','systemEqBrand'].forEach(id=>{const el=$('#'+id);if(el)el.addEventListener(id==='systemEqSearch'?'input':'change',()=>{equipmentDisplayLimit=24;renderSystemEquipment()})});
const gs=$('#glossarySearch');if(gs)gs.oninput=renderGlossaryIndex;
$('#addGym').onclick=()=>{const name=prompt('健身房名稱');if(!name?.trim())return;const existed=gymByName(name);if(existed){toast('這間健身房已經存在');return}ensureGymByName(name);save('新增健身房',true)};
$('#syncGymsFromHistory').onclick=()=>{const added=syncGymsFromHistory(false);if(added)save('從訓練紀錄帶入健身房',true);else toast('訓練紀錄中沒有新的健身房')};
$('#addEquipment').onclick=()=>{openModal('新增我的器材',`<div class="card">
 <div class="field"><label>器材名稱</label><input id="manualEqName" placeholder="例如 Chest Press"></div>
 <div class="field"><label>品牌</label><input id="manualEqBrand" list="manualEqBrands" placeholder="Life Fitness、Hammer Strength..."><datalist id="manualEqBrands">${EQUIPMENT_BRANDS.map(b=>`<option value="${esc(b)}"></option>`).join('')}</datalist></div>
 <div class="field"><label>型號（選填）</label><input id="manualEqModel" placeholder="例如 SS-CP、3001"></div>
 <button class="btn primary" id="manualEqSave">儲存</button></div>`,()=>$('#manualEqSave').onclick=()=>{
   const name=$('#manualEqName').value.trim();if(!name){toast('請輸入器材名稱');return}
   data.equipment.push({id:uid('eq'),name,brand:$('#manualEqBrand').value.trim(),model:$('#manualEqModel').value.trim()});
   save('新增器材',true);closeModal()
 })};
$('#addStrengthGoal').onclick=()=>{const unit=normalizeWeightUnit(data.settings.unit);openModal('新增力量目標',`<div class="field"><label>動作</label><select id="sgEx">${data.exerciseLibrary.filter(e=>['weight_reps','bodyweight','unilateral'].includes(e.type)).map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div><div class="grid2"><div class="field"><label>目標重量（${unit}）</label><input id="sgW" type="number" step=".1"><div class="hint">會自動換算成 kg 標準值儲存。</div></div><div class="field"><label>目標次數</label><input id="sgR" type="number" value="10"></div></div><button class="btn primary" id="sgSave">儲存</button>`,()=>$('#sgSave').onclick=()=>{data.strengthGoals.push({id:uid('goal'),exerciseId:$('#sgEx').value,weight:toKg(clamp($('#sgW').value,0,5000),unit),reps:clamp($('#sgR').value,1,300)});save('新增力量目標',true);closeModal();toast('已新增目標')})};
$('#saveSettings').onclick=()=>{const hadPlan=!!data.currentPlan;data.settings.preferencesSetupCompleted=true;data.settings.trainingGoal=$('#setTrainingGoal').value;data.settings.sessionMinutes=n($('#setSessionMinutes').value)||60;data.settings.experienceLevel=$('#setExperienceLevel').value;data.settings.equipmentPreference=$('#setEquipmentPreference').value;data.settings.blockWeeks=n($('#setBlockWeeks').value)||6;data.settings.preferredGymId=$('#setPreferredGym').value||'';data.settings.priorityMuscles=$$('[data-priority-muscle]:checked').map(x=>x.dataset.priorityMuscle);data.settings.availableWeekdays=$$('[data-available-weekday]:checked').map(x=>n(x.dataset.availableWeekday));data.settings.allowConsecutiveDays=$('#setAllowConsecutiveDays').checked;data.settings.unit=$('#setUnit').value;data.settings.intensity=$('#setIntensity').value;data.settings.defaultRest=clamp($('#setRest').value,15,900);data.settings.weeklySessions=clamp($('#setWeeklySessions').value,1,14);data.settings.weeklyCardio=clamp($('#setCardioGoal').value,0,2000);data.settings.weekStart=n($('#setWeekStart').value);data.settings.includeWarmup=$('#setWarmup').checked;data.settings.show1RM=$('#set1rm').checked;data.settings.uiLevel=$('#setUiLevel').value;data.settings.restTimerPosition=$('#setRestTimerPosition').value;data.settings.trainingNotes=$('#setTrainingNotes').checked;data.settings.trainingAutoLoad=$('#setTrainingAutoLoad').checked;data.settings.trainingIntervalTimer=$('#setTrainingIntervalTimer').checked;data.settings.restTimerSound=$('#setRestTimerSound').checked;data.settings.weeklyMuscleGoals=data.settings.weeklyMuscleGoals||{};$$('[data-mgoal]').forEach(i=>data.settings.weeklyMuscleGoals[i.dataset.mgoal]=clamp(i.value,0,50));save('修改設定',true);toast(hadPlan?'設定已儲存；目前計畫不會自動更換，可按重新評估':'設定已儲存')};
$('#runSelfCheck').onclick=()=>renderSelfCheck(runAppSelfCheck());$('#exportJson').onclick=exportJSON;$('#exportCsv').onclick=exportCSV;
$('#importJson').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{previewImport(JSON.parse(await f.text()),'json',f.name)}catch{alert('JSON 格式不正確')}e.target.value=''};
$('#importCsv').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{previewImport(csvToData(await f.text()),'csv',f.name)}catch(err){alert('CSV 格式不正確，請使用本 App 匯出的 CSV 格式。')}e.target.value=''};
$('#clearAll').onclick=()=>{if(confirm('確定清除全部資料？建議先下載完整備份。')){localStorage.removeItem(APP_KEY);data=freshData();save('重新初始化',false);toast('已清除')}};

$('#recordMonth').value=monthKey();
renderAll();
})();
