(()=>{'use strict';
const APP_KEY='trainlogProData';
const APP_VERSION='2.11.0';
const CURRENT_SCHEMA=19;
const MUSCLES=['胸','背','腿','肩膀','二頭','三頭','腹部','有氧','其他'];
const MUSCLE_I18N={'胸':'domain.muscle.chest','背':'domain.muscle.back','腿':'domain.muscle.legs','肩膀':'domain.muscle.shoulders','二頭':'domain.muscle.biceps','三頭':'domain.muscle.triceps','腹部':'domain.muscle.core','有氧':'domain.muscle.cardio','其他':'domain.muscle.other'};
const TYPES=[
  ['weight_reps','domain.type.weightReps'],['duration','domain.type.duration'],['cardio','domain.type.cardio'],['bodyweight','domain.type.bodyweight'],['unilateral','domain.type.unilateral']
];
const KINDS=[['warmup','domain.kind.warmup'],['working','domain.kind.working'],['drop','domain.kind.drop'],['failure','domain.kind.failure'],['backoff','domain.kind.backoff']];
const WEEKDAY_KEYS=['domain.weekday.sun','domain.weekday.mon','domain.weekday.tue','domain.weekday.wed','domain.weekday.thu','domain.weekday.fri','domain.weekday.sat'];
const PPL={胸:'Push',肩膀:'Push',三頭:'Push',背:'Pull',二頭:'Pull',腿:'Legs',腹部:'Core',有氧:'Cardio',其他:'Other'};
const PATTERN_INFO={horizontal_push:'horizontal_push',horizontal_pull:'horizontal_pull',vertical_push:'vertical_push',vertical_pull:'vertical_pull',knee_dominant:'knee_dominant',hip_extension:'hip_extension',knee_flexion:'knee_flexion',knee_extension:'knee_extension',shoulder_abduction:'shoulder_abduction',elbow_flexion:'elbow_flexion',elbow_extension:'elbow_extension',core_flexion:'core_flexion',rotation:'rotation'};

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const i18n=window.TrainLogI18n;
const tr=(key,vars)=>i18n.t(key,vars);
const uid=(p='id')=>p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function displayMuscle(value){const key=MUSCLE_I18N[value];return key?tr(key):String(value??'')}
function displayType(value){const row=TYPES.find(x=>x[0]===value);return row?tr(row[1]):String(value??'')}
function displayKind(value){const row=KINDS.find(x=>x[0]===value);return row?tr(row[1]):String(value??'')}
const {n,clamp,isoToday,parseDate,isoDate,daysBetween,monthKey,fmtDate,LB_PER_KG,normalizeWeightUnit,toKg,fromKg,cleanWeightNumber,est1rm}=window.TrainLogUtils;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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
 return i18n.formatNumber(Math.round(shown))+' '+unit
};
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function openModal(title,html,onReady){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modalWrap').classList.add('show');document.body.style.overflow='hidden';if(onReady)onReady()}
function closeModal(){$('#modalWrap').classList.remove('show');document.body.style.overflow=''}
$('#modalClose').onclick=closeModal;$('#modalWrap').addEventListener('click',e=>{if(e.target===$('#modalWrap'))closeModal()});
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-info]');if(b){e.preventDefault();e.stopPropagation();openGlossary(b.dataset.info)}});


const migrationCore=window.TrainLogMigration.create({currentSchema:CURRENT_SCHEMA,systemExercises:SYSTEM_EXERCISES,uid,today:isoToday,toKg,normalizeWeightUnit,num:n});
function defaultLibrary(){return migrationCore.defaultLibrary()}
function mergeSystemExercises(existing){return migrationCore.mergeSystemExercises(existing)}
function defaultTemplates(){return migrationCore.defaultTemplates()}
function freshData(){return migrationCore.freshData()}
function migrate(raw){return migrationCore.migrate(raw)}
function guessType(e){return migrationCore.guessType(e)}
function findOrCreateExercise(name,muscle,type,library){return migrationCore.findOrCreateExercise(name,muscle,type,library)}
let recoveryIssue=null;
const storageCore=window.TrainLogStorage.create({appKey:APP_KEY,legacyKey:'fitnessRecordsV1',storage:localStorage,migrate,freshData,uid,defaultSnapshotReason:()=>tr('reasons.autoSnapshot')});
function loadData(){const result=storageCore.loadData();recoveryIssue=result.recoveryIssue;return result.data}
let data=loadData();
i18n.setLocale(data.settings.locale||i18n.DEFAULT_LOCALE);
function registerTrainLogServiceWorker(){
 navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`).catch(()=>{});
}
if('serviceWorker' in navigator)window.addEventListener('load',registerTrainLogServiceWorker,{once:true});
function renderRecoveryBanner(){
 const box=document.getElementById('dataRecoveryBanner');if(!box||!recoveryIssue)return;
 box.innerHTML=`<div class="card warnbox"><b>${esc(tr('dynamic.recoveryTitle'))}</b><div class="small" style="margin-top:6px;line-height:1.55">${esc(tr('dynamic.recoveryCopy'))}</div><div class="actions" style="margin-top:10px"><button class="btn small warn" id="downloadRecoveryData">${esc(tr('dynamic.recoveryDownload'))}</button><button class="btn small ghost" id="dismissRecoveryData">${esc(tr('dynamic.recoveryHide'))}</button></div></div>`;
 const dl=document.getElementById('downloadRecoveryData');if(dl)dl.onclick=()=>download(`trainlog-pro-recovery-${isoToday()}.json`,recoveryIssue.raw,'application/json');
 const dismiss=document.getElementById('dismissRecoveryData');if(dismiss)dismiss.onclick=()=>{box.innerHTML=''};
}
setTimeout(renderRecoveryBanner,0);
function snapshot(reason){return storageCore.snapshot(data,reason)}
function save(reason='',takeSnapshot=false){return storageCore.save(data,reason,takeSnapshot,renderAll)}
const trainingMetrics=window.TrainLogTrainingMetrics;
const trainingLifecycle=window.TrainLogTrainingLifecycle;
const trainingMutations=window.TrainLogTrainingMutations;
const trainingProgression=window.TrainLogTrainingProgression;
const trainingProgressionView=window.TrainLogProgressionView;
const trainingProgressionActions=window.TrainLogProgressionActions;
const exerciseProgressBrowser=window.TrainLogExerciseProgressBrowser;
function workoutVolume(w){return trainingMetrics.workoutVolume(w,{includeWarmup:!!data.settings.includeWarmup})}
function effectiveSets(w,muscle){return trainingMetrics.effectiveSets(w,muscle)}
function cardioMinutes(w){return trainingMetrics.cardioMinutes(w)}
function durationSeconds(w,muscle){return trainingMetrics.durationSeconds(w,muscle)}
function bestSetForExercise(exId,workouts=data.workouts){return trainingMetrics.bestSetForExercise(exId,workouts)}
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
 if(showToast)toast(added?tr('feedback.gymsImported',{count:added}):tr('feedback.noNewGyms'));
 return added
}
function showGymUsage(id){
 const g=data.gyms.find(x=>x.id===id);if(!g)return;
 const info=gymUsageInfo(g);
 openModal(g.name,`<div class="card"><div class="grid3"><div class="stat"><b>${info.workouts.length}</b><span>${esc(tr('gym.workoutRecords'))}</span></div><div class="stat"><b>${info.equipment.length}</b><span>${esc(tr('gym.recognizedEquipment'))}</span></div><div class="stat"><b>${info.lastDate?fmtDate(info.lastDate):'—'}</b><span>${esc(tr('gym.lastUsed'))}</span></div></div></div>
 <div class="section">${esc(tr('gym.recognizedSection'))}</div>
 <div class="card">${info.equipment.length?`<div class="tagrow">${info.equipment.map(e=>`<span class="tag">${esc(e.name)}</span>`).join('')}</div>`:`<div class="empty">${esc(tr('gym.noRecognized'))}</div>`}<div class="gym-auto-note">${esc(tr('gym.autoNote'))}</div></div>`)
}
function renderGymSettings(){
 const box=$('#gymList');if(!box)return;
 box.innerHTML=data.gyms.length?data.gyms.map(g=>{
   const info=gymUsageInfo(g),preview=info.equipment.slice(0,6),more=Math.max(0,info.equipment.length-preview.length);
   return `<div class="gym-card">
    <div class="gym-head"><div><div class="gym-name">${esc(g.name)}</div><div class="gym-meta">${info.workouts.length?`${tr('gym.sessions',{count:info.workouts.length})}${info.lastDate?` · ${tr('gym.recent',{date:fmtDate(info.lastDate)})}`:''}`:tr('gym.noHistory')} · ${tr('gym.usedEquipment',{count:info.equipment.length})}</div></div></div>
    ${preview.length?`<div class="gym-equipment">${preview.map(e=>`<span class="tag">${esc(e.name)}</span>`).join('')}${more?`<span class="tag">＋${more}</span>`:''}</div>`:`<div class="gym-auto-note">${esc(tr('gym.emptyHint'))}</div>`}
    <div class="gym-actions"><button class="btn small ghost" data-gym-usage="${g.id}">${esc(tr('gym.viewUsage'))}</button><button class="btn small danger" data-delgym="${g.id}">${esc(tr('gym.delete'))}</button></div>
   </div>`
 }).join(''):`<div class="empty">${esc(tr('gym.none'))}</div>`;
 $$('[data-gym-usage]').forEach(b=>b.onclick=()=>showGymUsage(b.dataset.gymUsage));
 $$('[data-delgym]').forEach(b=>b.onclick=()=>{
   const g=data.gyms.find(x=>x.id===b.dataset.delgym);if(!g)return;
   const info=gymUsageInfo(g);
   if(!confirm(info.workouts.length?tr('gym.deleteWithHistory',{name:g.name}):tr('gym.deleteSimple',{name:g.name})))return;
   data.workouts.forEach(w=>{if(w.gymId===g.id){w.gymNameSnapshot=w.gymNameSnapshot||g.name;w.gymId=''}});
   if(data.activeWorkout?.gymId===g.id){data.activeWorkout.gymNameSnapshot=data.activeWorkout.gymNameSnapshot||g.name;data.activeWorkout.gymId=''}
   data.gyms=data.gyms.filter(x=>x.id!==g.id);save(tr('reasons.deleteGym'),true)
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
   if(!data.workouts.length)return tr('analysisDynamic.noTrainingData');
   const first=[...data.workouts].sort((a,b)=>a.date.localeCompare(b.date))[0]?.date||isoToday();
   return `${fmtDate(first)} – ${fmtDate(isoToday())}`;
 }
 return `${fmtDate(rollingStart(days))} – ${fmtDate(isoToday())}`;
}
function completedWorkingSets(ex){return window.TrainLogAnalysis.completedWorkingSets(ex)}
function exerciseAnalysisBasis(exRecord){
 const lib=getExercise(exRecord?.exerciseId)||{};
 const eq=SYSTEM_EQUIPMENT.find(x=>x.id===(lib.equipmentId||exRecord?.equipmentId));
 return {lib,eq,pattern:lib.pattern||eq?.pattern||'',primary:lib.muscle||exRecord?.muscle||'其他'}
}
function exerciseStimulusProfile(exRecord){return window.TrainLogAnalysis.exerciseStimulusProfile(exRecord,{analysisBasis:exerciseAnalysisBasis})}
function stimulusMap(workouts){
 return window.TrainLogAnalysis.stimulusMap(workouts,{
  profileForExercise:exerciseStimulusProfile,
  sourceForExercise:e=>{
   const basis=exerciseAnalysisBasis(e);
   return{key:e.exerciseId||e.nameSnapshot||'unknown',name:e.nameSnapshot||basis.lib.name||tr('analysisDynamic.exerciseFallback'),pattern:basis.pattern,equipment:basis.eq?.nameZh||''}
  }
 })
}
function formalSetCount(workouts){return (workouts||[]).reduce((sum,w)=>sum+effectiveSets(w),0)}
function effortStats(workouts){return window.TrainLogAnalysis.effortStats(workouts)}
function movementStats(workouts){return window.TrainLogAnalysis.movementStats(workouts,{patternForExercise:e=>exerciseAnalysisBasis(e).pattern})}
function consistencyStats(workouts,days){return window.TrainLogAnalysis.consistencyStats(workouts,days,{today:isoToday,daysBetween,rollingStart,weekKeyForDate:date=>isoDate(weekStartDate(parseDate(date)))})}
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
function localizedMessage(value){return value?.messageKey?tr(value.messageKey,value.messageParams||{}):String(value?.text||'')}
function comparePct(cur,prev){return window.TrainLogProgress.comparePct(cur,prev)}
function compareBadge(cur,prev){
 const c=comparePct(cur,prev);if(!c)return'';
 const arrow=c.dir==='up'?'↑':c.dir==='down'?'↓':'→';
 return `<span class="compare-badge ${c.dir}">${arrow} ${esc(c.messageKey?localizedMessage(c):c.text)}</span>`
}
function analysisConfidence(workouts){return window.TrainLogAnalysis.analysisConfidence(workouts,{formalSetCount,patternForExercise:e=>exerciseAnalysisBasis(e).pattern})}
function exerciseSessionMetrics(exId){
 const sessions=[];
 [...data.workouts].sort((a,b)=>a.date.localeCompare(b.date)).forEach(w=>{
   const e=(w.exercises||[]).find(x=>x.exerciseId===exId);if(!e)return;
   if(e.type==='cardio'){
     const c=e.cardio||{};
     sessions.push({date:w.date,type:'cardio',minutes:n(c.minutes),distance:n(c.distanceKm),speed:n(c.speed),volume:0,rir:null,rpe:null,label:tr('analysisDynamic.cardioSession',{minutes:n(c.minutes),distance:n(c.distanceKm)?` · ${n(c.distanceKm)} km`:''})});
     return
   }
   const sets=(e.sets||[]).filter(s=>s.completed&&s.kind!=='warmup');
   if(!sets.length)return;
   if(e.type==='duration'){
     const bestSeconds=Math.max(0,...sets.map(s=>n(s.seconds))),totalSeconds=sets.reduce((a,s)=>a+n(s.seconds),0);
     sessions.push({date:w.date,type:'duration',bestSeconds,totalSeconds,volume:totalSeconds,rir:null,rpe:null,label:tr('analysisDynamic.durationBest',{seconds:bestSeconds})});return
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
   sessions.push({date:w.date,type:e.type,maxWeight,maxReps,bestE1rm,bestSet,volume,repByWeight,rir:avg(rirs),rpe:avg(rpes),sets:sets.length,label:bestSet?`${fmtWeightNumber(bestSet.weight)}${data.settings.unit}×${bestSet.reps}`:tr('analysisDynamic.setsCount',{count:sets.length})})
 });
 return sessions
}
function progressSignals(prev,cur){return window.TrainLogProgress.progressSignals(prev,cur)}
function overloadSummary(exId){return window.TrainLogProgress.overloadSummaryFromSessions(exerciseSessionMetrics(exId))}
function plateauDetail(exId){return window.TrainLogProgress.plateauFromSessions(exerciseSessionMetrics(exId))}
function movementMatrixHtml(moves){
 const cell=p=>`<div class="pattern-cell"><b>${n(moves[p]||0)}</b><span>${esc(patternDisplayName(p))}</span></div>`;
 const groups=[
  ['analysisDynamic.groupHorizontal', ['horizontal_push','horizontal_pull']],
  ['analysisDynamic.groupVertical', ['vertical_push','vertical_pull']],
  ['analysisDynamic.groupKnee', ['knee_dominant','knee_flexion']],
  ['analysisDynamic.groupHip', ['hip_extension','hip_abduction']],
  ['analysisDynamic.groupArms', ['elbow_flexion','elbow_extension']],
  ['analysisDynamic.groupCore', ['core_stability','rotation']]
 ];
 const coverage=['horizontal_push','horizontal_pull','vertical_push','vertical_pull','knee_dominant','knee_flexion','hip_extension','core_stability'];
 return `<div class="pattern-matrix">${groups.map(([name,ps])=>`<div class="pattern-group"><div class="pattern-group-title">${esc(tr(name))}</div><div class="pattern-pair">${ps.map(cell).join('')}</div></div>`).join('')}</div>
 <div class="coverage-tags">${coverage.map(p=>`<span class="coverage-tag ${n(moves[p])>0?'hit':''}">${n(moves[p])>0?'✓':'—'} ${esc(patternDisplayName(p))}</span>`).join('')}</div>
 <div class="analysis-note">${esc(tr("residual.r8b7fede0"))}</div>`
}
function persistentMovementBias(){
 const days=28,end=isoToday(),pairs=[
  {a:'horizontal_push',b:'horizontal_pull',aNameKey:'analysisDynamic.horizontalPush',bNameKey:'analysisDynamic.horizontalPull'},
  {a:'vertical_push',b:'vertical_pull',aNameKey:'analysisDynamic.verticalPush',bNameKey:'analysisDynamic.verticalPull'},
  {a:'knee_dominant',b:'knee_flexion',aNameKey:'analysisDynamic.kneeDominant',bNameKey:'analysisDynamic.kneeFlexion'}
 ];
 for(const pair of pairs){
   let aWins=0,bWins=0,usable=0,totalA=0,totalB=0;
   for(let i=0;i<4;i++){
     const bucketEnd=shiftIso(end,-i*7),bucketStart=shiftIso(bucketEnd,-6);
     const ws=data.workouts.filter(w=>w.date>=bucketStart&&w.date<=bucketEnd),m=movementStats(ws),a=n(m[pair.a]),b=n(m[pair.b]);
     totalA+=a;totalB+=b;if(a+b<4)continue;usable++;
     if(a>b*1.4&&a-b>=2)aWins++;else if(b>a*1.4&&b-a>=2)bWins++
   }
   if(usable>=3&&aWins>=3){const programId=pair.a==='horizontal_push'?'p_posture_pushpull_2':pair.a==='vertical_push'?'p_posture_verticalpull_2':pair.a==='knee_dominant'?'p_posture_posteriorchain_2':'';const a=tr(pair.aNameKey),b=tr(pair.bNameKey);return{title:tr('analysisDynamic.biasTitle',{a,b}),desc:tr('analysisDynamic.biasDesc',{wins:aWins,a,b}),kind:'watch',programId}};
   if(usable>=3&&bWins>=3){const a=tr(pair.bNameKey),b=tr(pair.aNameKey);return{title:tr('analysisDynamic.biasTitle',{a,b}),desc:tr('analysisDynamic.biasDesc',{wins:bWins,a,b}),kind:'watch'}}
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
   const lib=getExercise(id),name=lib?.name||(data.workouts.flatMap(w=>w.exercises||[]).find(e=>e.exerciseId===id)?.nameSnapshot)||tr('analysisDynamic.exerciseFallback');
   const score=signals.length+(prev.bestE1rm&&cur.bestE1rm?Math.max(0,(cur.bestE1rm-prev.bestE1rm)/prev.bestE1rm)*10:0);
   if(!best||score>best.score)best={id,name,signals,score,cur,prev}
 });
 return best
}
function buildAnalysisHighlights(ws,prevWs,days,confidence,cons){
 const out=[];
 if(confidence.level==='insufficient'){
   out.push({kind:'info',title:tr('analysisDynamic.insufficientTitle'),desc:tr('analysisDynamic.insufficientDesc',{workouts:confidence.workouts,sets:confidence.formal})})
 }
 const prog=strongestRecentExerciseProgress(ws);
 if(prog)out.push({kind:'good',title:tr('analysisDynamic.progressTitle',{name:prog.name}),desc:tr('analysisDynamic.progressDesc',{signals:prog.signals.slice(0,3).map(localizedMessage).join('、')})});
 const bias=persistentMovementBias();if(bias&&confidence.level!=='insufficient')out.push(bias);
 if(cons.totalWeeks>=2&&cons.weeks===cons.totalWeeks&&ws.length>=2)out.push({kind:'good',title:tr('analysisDynamic.consistencyTitle'),desc:tr('analysisDynamic.consistencyDesc',{weeks:cons.totalWeeks,average:cons.avgPerWeek.toFixed(1)})});
 if(days!=='all'&&prevWs.length){
   const curVol=ws.reduce((a,w)=>a+workoutVolume(w),0),prevVol=prevWs.reduce((a,w)=>a+workoutVolume(w),0),c=comparePct(curVol,prevVol);
   if(c&&c.pct!=null&&Math.abs(c.pct)>=20){const direction=tr(c.pct>0?'analysisDynamic.increase':'analysisDynamic.decrease');out.push({kind:'info',title:tr('analysisDynamic.volumeChangeTitle',{direction}),desc:tr('analysisDynamic.volumeChangeDesc',{current:fmtKg(curVol),previous:fmtKg(prevVol),percent:Math.abs(Math.round(c.pct))})})}
 }
 const effort=effortStats(ws),rate=effort.total?(effort.high+effort.mid+effort.low)/effort.total:0;
 if(effort.total>=8&&rate<.5)out.push({kind:'info',title:tr('analysisDynamic.effortSparseTitle'),desc:tr('analysisDynamic.effortSparseDesc',{percent:Math.round(rate*100)})});
 if(!out.length)out.push({kind:'info',title:tr('analysisDynamic.collectMoreTitle'),desc:tr('analysisDynamic.collectMoreDesc')});
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
 const ex=getExercise(exId);if(!ex)return null;
 return trainingProgression.recommend(ex,data.workouts,{
   intensity:data.settings.intensity,
   inputUnitForExercise:exerciseInputUnit,
   incrementForUnit:machineIncrementForUnit,
   cleanNumber:cleanWeightNumber,
   limit:5
 })
}
function progressionDisplay(adv){return adv?trainingProgressionView.formatAdvice(adv,(key,vars)=>tr(key,vars)):null}
function progressionToneClass(view){return view?.tone==='good'?'good':view?.tone==='warn'?'warn':''}
function progressionApplyLabel(adv,ex,e){
 if(!adv||!trainingProgressionActions.canApply(adv))return'';
 if(adv.action==='add_reps')return tr('analysisDynamic.applyReps');
 if(adv.action==='increase_time')return tr('analysisDynamic.applyTime',{seconds:n(ex?.increment)||5});
 const unit=exerciseInputUnit(e),inc=machineIncrementForUnit(ex,unit),sign=adv.action==='reduce_load'?'−':'+';
 return tr('analysisDynamic.applyWeight',{sign,increment:cleanWeightNumber(inc),unit})
}
function plateau(exId){
 const pts=[];[...data.workouts].sort((a,b)=>a.date.localeCompare(b.date)).forEach(w=>{const e=(w.exercises||[]).find(x=>x.exerciseId===exId);if(!e)return;let best=0;(e.sets||[]).forEach(s=>{if(!s.completed)return;best=Math.max(best,est1rm(n(s.weight),n(s.reps)))});if(best)pts.push({date:w.date,v:best})});
 if(pts.length<5)return false;const last=pts.slice(-5),min=Math.min(...last.map(x=>x.v)),max=Math.max(...last.map(x=>x.v));return min>0&&(max-min)/min<0.02
}
function validateWorkout(w){
 const issues=[];(w.exercises||[]).forEach(e=>{
   (e.sets||[]).forEach(s=>{
    const maxW=1000;
    if(n(s.weight)>maxW||n(s.leftWeight)>maxW||n(s.rightWeight)>maxW)issues.push(tr('analysisDynamic.highWeight',{name:e.nameSnapshot}));
    if(n(s.reps)>300||n(s.leftReps)>300||n(s.rightReps)>300)issues.push(tr('analysisDynamic.highReps',{name:e.nameSnapshot}));
    if(n(s.seconds)>7200)issues.push(tr('analysisDynamic.longSet',{name:e.nameSnapshot}));
   });
   if(n(e.cardio?.minutes)>600)issues.push(tr('analysisDynamic.longCardio',{name:e.nameSnapshot}));
   if(n(e.cardio?.distanceKm)>500)issues.push(tr('analysisDynamic.largeDistance',{name:e.nameSnapshot}));
   if(n(e.cardio?.incline)>40)issues.push(tr('analysisDynamic.largeIncline',{name:e.nameSnapshot}));
 });return issues
}

const APP_COACH_STEPS=[
 {selector:'#quickStart',titleKey:'tutorialCopy.s01Title',copyKey:'tutorialCopy.s01Copy'},
 {selector:'.nav button[data-page="trainPage"]',titleKey:'tutorialCopy.s02Title',copyKey:'tutorialCopy.s02Copy'},
 {selector:'.nav button[data-page="recordsPage"]',titleKey:'tutorialCopy.s03Title',copyKey:'tutorialCopy.s03Copy'},
 {selector:'.nav button[data-page="analysisPage"]',titleKey:'tutorialCopy.s04Title',copyKey:'tutorialCopy.s04Copy'},
 {selector:'.nav button[data-page="settingsPage"]',titleKey:'tutorialCopy.s05Title',copyKey:'tutorialCopy.s05Copy'}
];

const PAGE_COACH_STEPS={
 home:[
  {selector:'#homeSuggestion',titleKey:'tutorialCopy.s06Title',copyKey:'tutorialCopy.s06Copy'},
  {selector:'#quickStart',titleKey:'tutorialCopy.s07Title',copyKey:'tutorialCopy.s07Copy'},
  {selector:'#recentProgress',titleKey:'tutorialCopy.s08Title',copyKey:'tutorialCopy.s08Copy'},
  {selector:'#recentWorkouts',titleKey:'tutorialCopy.s09Title',copyKey:'tutorialCopy.s09Copy'}
 ],
 trainLanding:[
  {selector:'#trainLanding .hero',titleKey:'tutorialCopy.s10Title',copyKey:'tutorialCopy.s10Copy'},
  {selector:'#trainStartBtn',titleKey:'tutorialCopy.s11Title',copyKey:'tutorialCopy.s11Copy'},
  {selector:'#browseProgramsBtn',titleKey:'tutorialCopy.s12Title',copyKey:'tutorialCopy.s12Copy'},
  {selector:'#trainCoachPicks',titleKey:'tutorialCopy.s13Title',copyKey:'tutorialCopy.s13Copy'}
 ],
 workout:[
  {selector:'#sessionExercises > *',titleKey:'tutorialCopy.s14Title',copyKey:'tutorialCopy.s14Copy'},
  {selector:'#activeWorkout [data-demo]',titleKey:'tutorialCopy.s15Title',copyKey:'tutorialCopy.s15Copy'},
  {selector:'#activeWorkout [data-unit]',titleKey:'tutorialCopy.s16Title',copyKey:'tutorialCopy.s16Copy'},
  {selector:'#activeWorkout [data-set="weight"]',titleKey:'tutorialCopy.s17Title',copyKey:'tutorialCopy.s17Copy'},
  {selector:'#activeWorkout [data-set="reps"]',titleKey:'tutorialCopy.s18Title',copyKey:'tutorialCopy.s18Copy'},
  {selector:'#activeWorkout .advanced-set-quick',titleKey:'tutorialCopy.s19Title',copyKey:'tutorialCopy.s19Copy'},
  {selector:'#activeWorkout [data-complete]',titleKey:'tutorialCopy.s20Title',copyKey:'tutorialCopy.s20Copy'},
  {selector:'.rest-quick-card',titleKey:'tutorialCopy.s21Title',copyKey:'tutorialCopy.s21Copy'},
  {selector:'#openTrainingTools',titleKey:'tutorialCopy.s22Title',copyKey:'tutorialCopy.s22Copy'},
  {selector:'#finishWorkout',titleKey:'tutorialCopy.s23Title',copyKey:'tutorialCopy.s23Copy'}
 ],
 records:[
  {selector:'#recordsPage .section',titleKey:'tutorialCopy.s24Title',copyKey:'tutorialCopy.s24Copy'},
  {selector:'#recordsPage .calendar',titleKey:'tutorialCopy.s25Title',copyKey:'tutorialCopy.s25Copy'},
  {selector:'#recordsPage .record',titleKey:'tutorialCopy.s26Title',copyKey:'tutorialCopy.s26Copy'},
 ],
 analysis:[
  {selector:'#analysisPage select',titleKey:'tutorialCopy.s27Title',copyKey:'tutorialCopy.s27Copy'},
  {selector:'#analysisPage .card',titleKey:'tutorialCopy.s28Title',copyKey:'tutorialCopy.s28Copy'},
  {selector:'#analysisPage',titleKey:'tutorialCopy.s29Title',copyKey:'tutorialCopy.s29Copy'}
 ],
 settings:[
  {selector:'#settingsPage .settings-hub-card:nth-of-type(1), #settingsPage .card:nth-of-type(1)',titleKey:'tutorialCopy.s30Title',copyKey:'tutorialCopy.s30Copy'},
  {selector:'#settingsPage .settings-hub-card:nth-of-type(2), #settingsPage .card:nth-of-type(2)',titleKey:'tutorialCopy.s31Title',copyKey:'tutorialCopy.s31Copy'},
  {selector:'#settingsPage .settings-hub-card:nth-of-type(3), #settingsPage .card:nth-of-type(3)',titleKey:'tutorialCopy.s32Title',copyKey:'tutorialCopy.s32Copy'},
  {selector:'#settingsPage .settings-hub-card:nth-of-type(4), #settingsPage .card:nth-of-type(4)',titleKey:'tutorialCopy.s33Title',copyKey:'tutorialCopy.s33Copy'},
  {selector:'#settingsPage .settings-hub-card:nth-of-type(5), #settingsPage .card:nth-of-type(5)',titleKey:'tutorialCopy.s34Title',copyKey:'tutorialCopy.s34Copy'},
  {selector:'#settingsPage .settings-hub-card:nth-of-type(6), #settingsPage .card:nth-of-type(6)',titleKey:'tutorialCopy.s35Title',copyKey:'tutorialCopy.s35Copy'},
  {selector:'#openTutorialFromSettings',titleKey:'tutorialCopy.s36Title',copyKey:'tutorialCopy.s36Copy'}
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
 $('#coachStepLabel').textContent=tr('finalUi.coachStep',{current:coachIndex+1,total:steps.length});
 $('#coachTitle').textContent=tr(s.titleKey);$('#coachCopy').textContent=tr(s.copyKey);
 $('#coachProgress').innerHTML=steps.map((_,i)=>`<i class="${i<=coachIndex?'on':''}"></i>`).join('');
 $('#coachPrev').style.visibility=coachIndex===0?'hidden':'visible';
 $('#coachNext').textContent=coachIndex===steps.length-1?(coachTour.kind==='app'?tr('finalUi.coachStartSetup'):tr('finalUi.coachFinish')):tr('finalUi.coachNext');
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
 $('#firstPriorityMuscles').innerHTML=MUSCLES.filter(m=>!['有氧','其他'].includes(m)).map(m=>`<button type="button" data-first-muscle="${esc(m)}" class="${selected.has(m)?'on':''}">${esc(displayMuscle(m))}</button>`).join('');
 $$('[data-first-muscle]').forEach(b=>b.onclick=()=>{
   const m=b.dataset.firstMuscle;
   if(selected.has(m))selected.delete(m);
   else{
     if(selected.size>=2){toast(tr('messages.priorityMax'));return}
     selected.add(m)
   }
   b.classList.toggle('on',selected.has(m))
 });
 $('#firstSetupSave').onclick=()=>{
   const goal=$('#firstTrainingGoal').value,days=n($('#firstWeeklySessions').value),mins=n($('#firstSessionMinutes').value),exp=$('#firstExperience').value,equip=$('#firstEquipmentPreference').value;
   if(!goal||!days||!mins||!exp||!equip){toast(tr('messages.setupRequired'));return}
   data.settings.trainingGoal=goal;
   data.settings.weeklySessions=days;
   data.settings.sessionMinutes=mins;
   data.settings.experienceLevel=exp;
   data.settings.equipmentPreference=equip;
   data.settings.priorityMuscles=[...selected];
   data.settings.preferencesSetupCompleted=true;
   localStorage.setItem(APP_KEY,JSON.stringify(data));
   wrap.classList.remove('show');document.body.style.overflow='';
   renderAll();setTimeout(()=>maybeStartPageTutorial('homePage'),350);toast(tr('feedback.setupSaved'))
 }
}
function renderAll(){
 i18n.setLocale(data.settings.locale||i18n.DEFAULT_LOCALE);
 i18n.apply(document);
 applyUiLevel();
 $('#todayText').textContent=i18n.formatDate(new Date(),{year:'numeric',month:'long',day:'numeric',weekday:'short'});
 renderResume();renderHome();renderTrain();renderRecords();renderAnalysis();renderSettings();renderFirstTutorial();renderFirstSetup();
 if(data.settings.tutorialCompleted===true&&data.settings.preferencesSetupCompleted===true){const active=$('.page.active');if(active)setTimeout(()=>maybeStartPageTutorial(active.id),180)};
}
function renderResume(){
 const b=$('#resumeBanner');if(!data.activeWorkout){b.innerHTML='';return}
 b.innerHTML=`<div class="banner"><b>${esc(tr('dynamic.resumeTitle'))}</b> ${esc(data.activeWorkout.name)} · ${esc(data.activeWorkout.date)}
 <div class="actions" style="margin-top:7px"><button class="btn small primary" id="resumeBtn">${esc(tr('dynamic.resume'))}</button><button class="btn small danger" id="discardActive">${esc(tr('dynamic.discard'))}</button></div></div>`;
 $('#resumeBtn').onclick=()=>goPage('trainPage');$('#discardActive').onclick=()=>{if(confirm(tr('dialogs.discardResume'))){data.activeWorkout=null;save(tr('reasons.discardWorkout'),true)}}
}
const COACH_GOALS={
 general:{labelKey:'coachMeta.goal.general',terms:['一般健身','建立習慣','基礎肌力','全身','體能'],cats:['完全新手','全身訓練']},
 hypertrophy:{labelKey:'coachMeta.goal.hypertrophy',terms:['增肌'],cats:['全身訓練','Upper / Lower','PPL','部位強化']},
 strength:{labelKey:'coachMeta.goal.strength',terms:['肌力','力量','基礎肌力'],cats:['全身訓練','Upper / Lower','PPL']},
 fat_loss:{labelKey:'coachMeta.goal.fatLoss',terms:['心肺','有氧','體能','一般健身','時間效率'],cats:['混合／有氧','時間效率','全身訓練']},
 posture:{labelKey:'coachMeta.goal.posture',terms:['體態','平衡','補強','舒緩','控制','上背','後鏈'],cats:['體態舒緩／平衡補強']},
 recovery:{labelKey:'coachMeta.goal.recovery',terms:['恢復','輕量','Deload','活動'],cats:['恢復／減量']}
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
 normal:{labelKey:'coachMeta.adjustment.normalLabel',descKey:'coachMeta.adjustment.normalDesc'},
 short:{labelKey:'coachMeta.adjustment.shortLabel',descKey:'coachMeta.adjustment.shortDesc'},
 easy:{labelKey:'coachMeta.adjustment.easyLabel',descKey:'coachMeta.adjustment.easyDesc'},
 fresh:{labelKey:'coachMeta.adjustment.freshLabel',descKey:'coachMeta.adjustment.freshDesc'},
 focus:{labelKey:'coachMeta.adjustment.focusLabel',descKey:'coachMeta.adjustment.focusDesc'}
};
function coachGoal(){return COACH_GOALS[data.settings.trainingGoal]?data.settings.trainingGoal:'general'}
function coachGoalLabel(goal=coachGoal()){return tr(COACH_GOALS[goal]?.labelKey||COACH_GOALS.general.labelKey)}
function todayAdjustmentLabel(mode){return tr(TODAY_ADJUSTMENTS[mode]?.labelKey||TODAY_ADJUSTMENTS.normal.labelKey)}
function todayAdjustmentDesc(mode){return tr(TODAY_ADJUSTMENTS[mode]?.descKey||TODAY_ADJUSTMENTS.normal.descKey)}
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
 if(n(p.duration)>mins+30)limits.push(`單次約 ${esc(tr('finalUi.minutes',{count:p.duration}))}，明顯超過可用 ${mins} 分`);
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
 const info=recommendationGymInfo();if(!info||(!info.equipment.length&&info.workouts.length<2))return{score:10,status:'unknown',direct:0,substitute:0,total:0,text:tr('coachReasons.equipmentUnknown')};
 const available=new Set(info.equipment.map(x=>x.id)),required=[];for(const w of p.workouts||[])for(const it of w.items||[]){const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(ex?.equipmentId&&!required.some(x=>x.exerciseId===ex.id))required.push(ex)}
 if(!required.length)return{score:15,status:'known',direct:0,substitute:0,total:0,text:tr('coachReasons.equipmentNone')};
 let direct=0,substitute=0;for(const ex of required){if(available.has(ex.equipmentId)){direct++;continue}const ok=(ex.alternatives||[]).some(id=>{const a=getExercise(id)||SYSTEM_EXERCISES.find(x=>x.id===id);return a?.equipmentId&&available.has(a.equipmentId)});if(ok)substitute++}
 const ratio=(direct+substitute*.7)/required.length,score=Math.round(15*ratio),substituteText=substitute?tr('coachReasons.equipmentSubstitute',{count:substitute}):'';return{score,status:'known',direct,substitute,total:required.length,text:tr('coachReasons.equipmentCoverage',{gym:info.g.name,direct,total:required.length,substitute:substituteText})}
}
function priorityMuscleScore(p){
 const pri=priorityMuscles();if(!pri.length)return{score:8,text:tr('coachReasons.priorityNone')};const prof=programMuscleProfile(p),vals=pri.map(m=>n(prof[m]));const avg=vals.reduce((a,b)=>a+b,0)/vals.length,score=Math.max(2,Math.min(10,Math.round(avg>=8?10:avg>=5?8:avg>=3?6:4)));return{score,text:tr('coachReasons.priorityCoverage',{muscles:pri.map(displayMuscle).join('、'),values:vals.map((v,i)=>`${displayMuscle(pri[i])} ${fmtStim(v)}`).join('、')})}
}
function buildCoachContext(){const ws=workoutsLastDays(28);return{ws,stimulus:ws.length>=2?stimulusMap(ws):{},movement:ws.length>=2?movementStats(ws):{},progressing:progressingExerciseIds()}}
function recentVolumeNeedScore(p,ctx){
 const ws=ctx?.ws||workoutsLastDays(28);if(ws.length<2)return{score:7,text:tr('coachReasons.volumeNeutral')};const cur=ctx?.stimulus||stimulusMap(ws),prof=programMuscleProfile(p),goals=data.settings.weeklyMuscleGoals||{},needs=[];
 for(const m of MUSCLES.filter(x=>!['有氧','其他'].includes(x))){const goal=n(goals[m]);if(!goal)continue;const avg=n(cur[m]?.total)/4,gap=Math.max(0,goal-avg);if(gap>=1.5)needs.push({m,gap,program:n(prof[m])})}
 if(!needs.length)return{score:8,text:tr('coachReasons.volumeOkay')};const covered=needs.filter(x=>x.program>=Math.min(x.gap,3)).length,score=Math.max(3,Math.min(10,Math.round(4+6*covered/needs.length)));return{score,text:tr('coachReasons.volumeNeed',{items:needs.slice(0,3).map(x=>tr('coachReasons.volumeNeedItem',{muscle:displayMuscle(x.m),sets:fmtStim(x.gap)})).join('、')})}
}
function movementNeedScore(p,ctx){
 const ws=ctx?.ws||workoutsLastDays(28);if(ws.length<2)return{score:4,text:tr('coachReasons.movementNeutral')};const r=ctx?.movement||movementStats(ws),pp=programPatternProfile(p),need=[];
 const hp=n(r.horizontal_push),hr=n(r.horizontal_pull),vp=n(r.vertical_push),vr=n(r.vertical_pull),kd=n(r.knee_dominant)+n(r.knee_extension),post=n(r.knee_flexion)+n(r.hip_extension);
 if(hp>hr*1.4+2)need.push('horizontal_pull');if(hr>hp*1.8+4)need.push('horizontal_push');if(vp>vr*1.4+2)need.push('vertical_pull');if(vr>vp*2+4)need.push('vertical_push');if(kd>post*1.5+3)need.push('knee_flexion','hip_extension');if(post>kd*1.8+4)need.push('knee_dominant');
 const uniq=[...new Set(need)];if(!uniq.length)return{score:5,text:tr('coachReasons.movementOkay')};const covered=uniq.filter(x=>n(pp[x])>0).length;return{score:Math.max(1,Math.round(5*covered/uniq.length)),text:tr('coachReasons.movementNeed',{patterns:uniq.map(patternDisplayName).join('、')})}
}
function progressingExerciseIds(){
 const ids=new Set();for(const ex of data.exerciseLibrary){const pts=[];[...data.workouts].sort((a,b)=>a.date.localeCompare(b.date)).forEach(w=>{const e=(w.exercises||[]).find(x=>x.exerciseId===ex.id);if(!e)return;let best=0;(e.sets||[]).forEach(s=>{if(s.completed&&n(s.reps)>0)best=Math.max(best,est1rm(n(s.weight),n(s.reps)))});if(best)pts.push(best)});if(pts.length>=2&&pts.at(-1)>pts.at(-2)*1.01)ids.add(ex.id)}return ids
}
function continuityScore(p,ctx){const prog=ctx?.progressing||progressingExerciseIds();if(!prog.size)return{score:4,text:tr('coachReasons.continuityNone')};const ids=programExerciseIds(p),kept=[...prog].filter(x=>ids.has(x));return{score:Math.min(5,2+Math.min(3,kept.length)),text:kept.length?tr('coachReasons.continuityKept',{count:kept.length}):tr('coachReasons.continuityLow')}}
function scheduleScore(p){
 const weekly=Math.min(7,Math.max(1,n(data.settings.weeklySessions)||3)),mins=n(data.settings.sessionMinutes)||60;let daysScore=n(p.daysPerWeek)===weekly?10:n(p.daysPerWeek)===weekly-1?7:4;const td=Math.abs(n(p.duration)-mins),timeScore=td<=5?5:td<=15?4:td<=25?2:1;return{score:daysScore+timeScore,text:tr('coachReasons.schedule',{days:`${tr('finalUi.daysPerWeek',{count:p.daysPerWeek})} · ${tr('coachUi.aboutMinutes',{minutes:p.duration})}`,targetDays:tr('finalUi.daysPerWeek',{count:weekly}),targetMinutes:tr('coachUi.aboutMinutes',{minutes:mins})})}
}
function preferenceScore(p){const pref=data.settings.equipmentPreference||'machine';if(pref==='machine')return{score:p.equipmentMode==='全機械'?5:p.equipmentMode==='機械＋滑輪'?4:2,text:p.equipmentMode==='全機械'?tr('coachReasons.preferenceMatch'):tr('coachReasons.preferenceMode',{mode:p.equipmentMode})};return{score:['全機械','機械＋滑輪'].includes(p.equipmentMode)?5:3,text:tr('coachReasons.preferenceMode',{mode:p.equipmentMode})}}
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
 const p=SYSTEM_PROGRAMS.find(x=>x.id===programId);if(!p)return;if(data.currentPlan&&data.currentPlan.programId!==programId&&!confirm(tr('dialogs.replacePlan',{current:currentPlanProgram()?.nameZh||tr('finalUi.trainingPlan'),next:p.nameZh})))return;
 const rec=coachProgramScore(p,coachGoal());data.currentPlan={id:uid('plan'),programId:p.id,startedDate:isoToday(),blockWeeks:n(data.settings.blockWeeks)||6,goal:coachGoal(),scoreAtStart:rec.score,createdAt:new Date().toISOString(),source:from};data.todayAdjustment={date:isoToday(),mode:'normal',focusMuscle:''};save(tr('reasons.setCurrentPlan'),true);toast(tr('feedback.planSet',{weeks:data.currentPlan.blockWeeks,name:p.nameZh}))
}
function endCurrentPlan(){if(!data.currentPlan)return;if(confirm(tr('dialogs.endPlan'))){data.currentPlan=null;data.todayAdjustment=null;save(tr('reasons.endCurrentPlan'),true);toast(tr('feedback.planEnded'))}}
function todayAdjustment(){const t=data.todayAdjustment;if(t?.date===isoToday()&&TODAY_ADJUSTMENTS[t.mode])return t;return{date:isoToday(),mode:'normal',focusMuscle:''}}
function setTodayAdjustment(mode,focusMuscle=''){if(!TODAY_ADJUSTMENTS[mode])mode='normal';data.todayAdjustment={date:isoToday(),mode,focusMuscle:focusMuscle||''};localStorage.setItem(APP_KEY,JSON.stringify(data));renderHome();toast(tr('feedback.todayAdjustment',{label:todayAdjustmentLabel(mode)}))}
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
function coachExerciseListHtml(items,p){return `<div class="coach-exercises">${items.map((it,i)=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(!ex)return'';const sets=n(it.targetSets)||n(ex.targetSets)||3;let note='';if(it.bodySubstituteFrom)note=`<div class="coach-ex-extra substitute">${esc(tr('coachReasons.bodyReplace',{name:it.bodySubstituteFrom}))}</div>`;else if(it.todayFocus)note='<div class="coach-ex-extra focus">${esc(tr("residual.r6521b0be"))}</div>';else if(it.todayEasy)note='<div class="coach-ex-extra easy">${esc(tr("residual.r615f61be"))}</div>';else if(it.coachSupplement)note='<div class="coach-ex-extra">${esc(tr("residual.r361a5fb3"))}</div>';return `<div class="coach-ex-row"><span class="coach-ex-num">${i+1}</span><div><div class="coach-ex-name">${esc(ex.name)}</div><div class="coach-ex-en">${esc(ex.nameEn||'')}</div>${note}</div><span class="tag">${esc(ex.type==='cardio'?tr('coachReasons.cardio'):tr('coachReasons.sets',{count:sets}))}</span></div>`}).join('')}</div>`}
function recommendationBreakdownHtml(r){const d=r.dimensions,names={goal:'目標',schedule:'時間安排',equipment:'器材',experience:'經驗',priority:'優先部位',volume:'近期訓練量',movement:'動作模式',continuity:'動作延續',preference:'偏好'},max={goal:25,schedule:15,equipment:15,experience:10,priority:10,volume:10,movement:5,continuity:5,preference:5};return `<div class="recommend-score-grid ui-advanced-only">${Object.entries(d).map(([k,v])=>`<div class="recommend-score-cell"><b>${v}/${max[k]}</b><span>${names[k]}</span></div>`).join('')}</div>${!r.hard.ok?`<div class="recommend-limit">限制：${esc(r.hard.limits.join('；'))}</div>`:''}`}
function currentPlanRecommendation(){const p=currentPlanProgram();if(!p)return null;const r=coachProgramScore(p,data.currentPlan?.goal||coachGoal());r.dayIndex=coachProgramDayIndex(p);return r}
function todayAdjustHtml(){const a=todayAdjustment();return `<div class="today-adjust-grid">${Object.entries(TODAY_ADJUSTMENTS).map(([k,v])=>`<button type="button" data-today-adjust="${k}" class="${a.mode===k?'on':''}">${v.label}</button>`).join('')}<button type="button" data-today-body-status>${esc(tr("residual.r01ec088f"))}</button></div>${a.mode==='focus'?`<div class="today-focus-grid">${MUSCLES.filter(m=>!['有氧','其他'].includes(m)).map(m=>`<button type="button" data-today-focus="${m}" class="${a.focusMuscle===m?'on':''}">${esc(displayMuscle(m))}</button>`).join('')}</div>`:''}<div class="adjust-note">${esc(todayAdjustmentDesc(a.mode))}${(todayBodyStatus().entries||[]).length?tr('coachMeta.bodyStatusExtra'):''}</div>`}
function coachHomeHtml(){
 const body=bodyStatusCardHtml(isoToday()),cp=data.currentPlan,p=currentPlanProgram();
 if(!cp||!p){const recs=coachRecommendations(coachGoal(),3),r=recs[0];if(!r)return `${body}<div class="card empty">${esc(tr("residual.r8dcf0f9a"))}</div>`;return `${body}<div class="section">${esc(tr("residual.r0ae2028e"))}</div><div class="card coach-primary"><div class="coach-kicker">${esc(tr("residual.r795da869"))}</div><div class="coach-title">建議先從：${esc(r.p.nameZh)}</div><div class="tagrow" style="margin-top:8px"><span class="tag">長期目標：${esc(coachGoalLabel())}</span><span class="tag">${esc(tr('finalUi.daysPerWeek',{count:r.p.daysPerWeek}))}</span><span class="tag">${esc(tr('coachUi.aboutMinutes',{minutes:r.p.duration}))}</span><span class="tag">${coachMatchLabel(r.score)}<span class="ui-advanced-only"> ${r.score}/100</span></span></div><div class="coach-reasons">${r.reasons.map(x=>`<div class="coach-reason">${esc(x)}</div>`).join('')}</div>${recommendationBreakdownHtml(r)}<div class="actions" style="margin-top:11px"><button class="btn primary" data-plan-adopt="${esc(r.p.id)}">採用 ${esc(tr('finalUi.weekCount',{count:n(data.settings.blockWeeks)||6}))}計畫</button><button class="btn ghost" id="homeReevaluatePlan">${esc(tr("residual.rac0fcbd0"))}</button></div></div><div class="section">${esc(tr("residual.r715b1c13"))}</div><div class="card empty">${esc(tr("residual.r0c231e77"))}</div>`}
 const week=currentPlanWeek(),block=n(cp.blockWeeks)||6,r=currentPlanRecommendation(),built=coachDayBuild(r),day=built.day,progress=Math.min(100,Math.round(week/block*100)),active=!!data.activeWorkout,expired=week>block;
 return `${body}<div class="section">${esc(tr("residual.r0ae2028e"))}</div><div class="card current-plan-card"><div class="record-head"><div><div class="plan-week">第 ${Math.min(week,block)} / ${block} 週${expired?' · 已到重新評估時間':''}</div><div class="current-plan-title">${esc(p.nameZh)}</div><div class="record-meta">長期目標：${esc(coachGoalLabel(cp.goal))} · ${esc(tr('finalUi.daysPerWeek',{count:p.daysPerWeek}))} · 約 ${esc(tr('finalUi.minutes',{count:p.duration}))}</div></div><span class="tag">${coachMatchLabel(r.score)}<span class="ui-advanced-only"> ${r.score}/100</span></span></div><div class="plan-progress"><i style="width:${progress}%"></i></div><div class="actions" style="margin-top:10px"><button class="btn small ghost" id="homeReevaluatePlan">${esc(tr("residual.rabcd84e7"))}</button><button class="btn small ghost" data-coach-preview="${esc(p.id)}">${esc(tr("residual.r73d10828"))}</button><button class="btn small danger" id="homeEndPlan">${esc(tr("residual.rf68c4539"))}</button></div></div><div class="section">${esc(tr("residual.r734e7187"))}</div><div class="card coach-primary"><div class="coach-kicker">${esc(todayAdjustmentLabel(built.adjustment.mode))}${(todayBodyStatus().entries||[]).length?' · 已納入今日身體狀況':''}</div><div class="coach-title">${esc(day.nameZh)}｜${esc(day.dayMeta?.dayTitle||p.nameZh)}</div><div class="tagrow" style="margin-top:8px"><span class="tag">${built.items.length} 個動作</span><span class="tag">原計畫約 ${esc(tr('finalUi.minutes',{count:p.duration}))}</span>${priorityMuscles().length?`<span class="tag">優先：${esc(priorityMuscles().join('、'))}</span>`:''}</div>${coachExerciseListHtml(built.items,p)}<div class="actions" style="margin-top:11px"><button class="btn primary" id="homeCoachStart">${active?'繼續目前訓練':'開始今天訓練'}</button></div></div><div class="section">${esc(tr("residual.r1a342c1b"))}</div><div class="card">${todayAdjustHtml()}<div class="small" style="margin-top:9px">${esc(tr("residual.r008ded82"))}</div></div>`
}
function openPlanReevaluation(){const rs=coachRecommendations(coachGoal(),5);openModal(tr('modal.reevaluatePlan'),`<div class="card"><b>${esc(tr("residual.r4191493c"))}</b><div class="small" style="margin-top:5px">${esc(coachGoalLabel())} · ${esc(tr('finalUi.daysPerWeek',{count:n(data.settings.weeklySessions)||3}))} · ${esc(tr('finalUi.minutes',{count:n(data.settings.sessionMinutes)||60}))} · ${esc(tr('finalUi.weekCount',{count:n(data.settings.blockWeeks)||6}))}${priorityMuscles().length?tr('finalUi.priorityInline',{muscles:priorityMuscles().map(displayMuscle).join('、')}):''}</div><div class="small" style="margin-top:5px">${esc(tr("residual.r871527c1"))}</div></div>${rs.map((r,i)=>`<div class="card"><div class="record-head"><div><div class="coach-match">${i+1}. ${coachMatchLabel(r.score)}<span class="ui-advanced-only"> · ${r.score}/100</span></div><div class="coach-alt-title">${esc(r.p.nameZh)}</div><div class="coach-alt-meta">${esc(tr('finalUi.daysPerWeek',{count:r.p.daysPerWeek}))} · ${esc(tr('coachUi.aboutMinutes',{minutes:r.p.duration}))} · ${esc(r.p.goal)}</div></div></div><div class="coach-reasons">${r.reasons.map(x=>`<div class="coach-reason">${esc(x)}</div>`).join('')}</div>${recommendationBreakdownHtml(r)}<div class="actions" style="margin-top:8px"><button class="btn small ghost" data-coach-preview="${esc(r.p.id)}">${esc(tr("residual.r9caf61f6"))}</button><button class="btn small primary" data-plan-adopt="${esc(r.p.id)}">${esc(tr("residual.rd692f32a"))}</button></div></div>`).join('')}`,()=>{bindCoachUI($('#modalBody'))})}
function bindCoachUI(scope=document){
 scope.querySelectorAll?.('[data-coach-preview]').forEach(b=>b.onclick=()=>showSystemProgramDetail(b.dataset.coachPreview));scope.querySelectorAll?.('[data-plan-adopt]').forEach(b=>b.onclick=()=>{const id=b.dataset.planAdopt;closeModal();adoptCurrentPlan(id)});scope.querySelectorAll?.('[data-today-adjust]').forEach(b=>b.onclick=()=>setTodayAdjustment(b.dataset.todayAdjust,todayAdjustment().focusMuscle));scope.querySelectorAll?.('[data-today-focus]').forEach(b=>b.onclick=()=>setTodayAdjustment('focus',b.dataset.todayFocus));scope.querySelectorAll?.('[data-today-body-status]').forEach(b=>b.onclick=()=>openBodyStatusModal(isoToday()));
 const ree=scope.querySelector?.('#homeReevaluatePlan');if(ree)ree.onclick=openPlanReevaluation;const end=scope.querySelector?.('#homeEndPlan');if(end)end.onclick=endCurrentPlan;const start=scope.querySelector?.('#homeCoachStart');if(start)start.onclick=()=>{if(data.activeWorkout){goPage('trainPage');return}const r=currentPlanRecommendation();if(r)startCoachRecommendedDay(r)}
}
function startCoachRecommendedDay(rec){
 if(data.activeWorkout&&!confirm(tr('dialogs.replaceActiveForPlan')))return;const built=coachDayBuild(rec),p=built.p,day=built.day,date=isoToday(),adj=built.adjustment;
 const exercises=built.items.map(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(!ex)return null;const se=makeSessionExercise({...ex,...it},date);if(it.todayEasy&&(se.sets||[]).length){se.sets=se.sets.slice(0,Math.max(1,n(it.targetSets)||2))}if(ex.type==='cardio'){const base=n(se.cardio?.minutes)||20;se.cardio.minutes=adj.mode==='easy'?Math.min(15,base):adj.mode==='short'?Math.min(10,base):base}return se}).filter(Boolean);
 data.activeWorkout={id:uid('w'),date,name:`${p.nameZh}｜${day.nameZh}`,duration:0,status:'active',startedAt:new Date().toISOString(),endedAt:'',notes:tr('coachMeta.workoutNotes',{program:p.nameZh,goal:coachGoalLabel(data.currentPlan?.goal),adjustment:todayAdjustmentLabel(adj.mode)}),programDayMeta:{...(day.dayMeta||{}),trainingGoal:coachGoalLabel(data.currentPlan?.goal),coachNote:tr('coachMeta.coachNote',{weeks:n(data.currentPlan?.blockWeeks)||6,adjustment:todayAdjustmentLabel(adj.mode)})},gymId:data.settings.preferredGymId||'',gymNameSnapshot:data.gyms.find(g=>g.id===data.settings.preferredGymId)?.name||'',deload:p.progression==='deload'||adj.mode==='easy',preStatus:{},pain:'',coachRecommendation:{programId:p.id,goal:data.currentPlan?.goal||coachGoal(),score:rec.score,dayIndex:rec.dayIndex,planInstanceId:data.currentPlan?.id||'',todayMode:adj.mode},exercises};save(tr('reasons.startCurrentPlanDay'),true);goPage('trainPage')
}
function goalProgramRecommendationsHtml(){
 const cp=currentPlanProgram(),rs=coachRecommendations(coachGoal(),3);return `${cp?`<div class="card current-plan-card"><div class="record-head"><div><b>目前 ${n(data.currentPlan.blockWeeks)||6} 週計畫：${esc(cp.nameZh)}</b><div class="record-meta">第 ${Math.min(currentPlanWeek(),n(data.currentPlan.blockWeeks)||6)} 週 · 長期目標 ${esc(coachGoalLabel(data.currentPlan.goal))}</div></div><button class="btn small ghost" data-plan-reevaluate>${esc(tr("residual.r255f1025"))}</button></div></div>`:''}<div class="card"><div class="record-head"><div><b>${esc(tr("residual.rda966763"))}</b><div class="record-meta">${esc(tr("residual.r24c32392"))}</div></div><span class="tag">${esc(coachGoalLabel())}</span></div><div class="coach-alt-grid" style="margin-top:9px">${rs.map(r=>`<div class="coach-alt-card"><div class="coach-match">${coachMatchLabel(r.score)}<span class="ui-advanced-only"> · ${r.score}/100</span></div><div class="coach-alt-title">${esc(r.p.nameZh)}</div><div class="coach-alt-meta">${esc(tr('finalUi.daysPerWeek',{count:r.p.daysPerWeek}))} · ${esc(tr('coachUi.aboutMinutes',{minutes:r.p.duration}))}</div><div class="actions" style="margin-top:7px"><button class="btn small ghost" data-program-detail="${esc(r.p.id)}">${esc(tr("residual.r9caf61f6"))}</button><button class="btn small primary" data-plan-adopt="${esc(r.p.id)}">${esc(tr("residual.rd692f32a"))}</button></div></div>`).join('')}</div></div>`
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
function renderSelfCheck(results){const box=$('#selfCheckResult');if(!box)return;if(!results){box.innerHTML='';return}const ok=results.every(x=>x.ok);box.innerHTML=`<div class="${ok?'good':'warn'}" style="margin-top:9px;font-weight:900">${ok?tr('finalUi.selfCheckOk'):tr('finalUi.selfCheckWarn')}</div><div class="selfcheck-list">${results.map(r=>`<div class="selfcheck-item ${r.ok?'ok':'bad'}">${r.ok?'✓':'⚠'} ${esc(r.label)}${r.detail?`<div class="small" style="margin-top:2px">${esc(r.detail)}</div>`:''}</div>`).join('')}</div>`}
function renderHome(){
 const week=workoutsThisWeek(),recent30=workoutsLastDays(30);
 $('#homeSuggestion').innerHTML=coachHomeHtml();bindBodyStatusButtons($('#homeSuggestion'));bindCoachUI($('#homeSuggestion'));
 const target=n(data.settings.weeklySessions)||3,cardioGoal=n(data.settings.weeklyCardio)||0,weekCardio=week.reduce((a,w)=>a+cardioMinutes(w),0);
 $('#homeKpis').innerHTML=`
 <div class="stat"><b>${week.length} / ${target}</b><span>${esc(tr('dynamic.weeklyTraining'))}</span></div>
 <div class="stat"><b>${Math.round(weekCardio)} / ${cardioGoal}</b><span>${esc(tr('dynamic.cardioMinutes'))}</span></div>
 <div class="stat"><b>${fmtKg(recent30.reduce((a,w)=>a+workoutVolume(w),0))}</b><span>${esc(tr('dynamic.recent30Volume'))}<br><small>${rangeDateLabel(30)}</small></span></div>`;
 const load=recentMuscleLoad(7),goals=data.settings.weeklyMuscleGoals||{};
 $('#weeklyMuscles').innerHTML=MUSCLES.filter(m=>m!=='有氧'&&m!=='其他').map(m=>{const goal=n(goals[m])||0,val=n(load[m]),pct=goal?Math.min(100,val/goal*100):0;return `<div class="barline"><div class="topline"><b>${esc(displayMuscle(m))}</b><span>${esc(tr('finalUi.groupsValue',{value:`${val} / ${goal||'—'}`}))}</span></div><div class="progress"><i style="width:${pct}%"></i></div></div>`}).join('');
 const prog=[];data.exerciseLibrary.filter(ex=>['weight_reps','bodyweight','unilateral','duration'].includes(ex.type)).forEach(ex=>{const adv=progressionAdvice(ex.id);const best=bestSetForExercise(ex.id);if(best&&adv)prog.push({ex,adv,best})});prog.sort((a,b)=>b.best.date.localeCompare(a.best.date));
 $('#recentProgress').innerHTML=prog.length?prog.slice(0,3).map(p=>{const view=progressionDisplay(p.adv);return `<div class="record"><div class="record-head"><div><div class="record-title">${esc(p.ex.name)}</div><div class="record-meta">${esc(tr('finalUi.recentEvidence',{date:p.best.date,evidence:view.evidence}))}</div></div><span class="pill ${progressionToneClass(view)}">${esc(view.label)}</span></div><div class="small" style="margin-top:8px;font-weight:800">${esc(tr('finalUi.judgement',{reason:view.reason}))}</div><div class="small" style="margin-top:4px">${esc(view.text)}</div></div>`}).join(''):'<div class="card empty">${esc(tr("residual.r24cff772"))}</div>';
 const goalHtml=(data.strengthGoals||[]).map(g=>{const ex=getExercise(g.exerciseId),best=bestSetForExercise(g.exerciseId),cur=best?best.weight:0,pct=g.weight?Math.min(100,cur/g.weight*100):0;return `<div class="record"><div class="record-head"><div><b>目標：${esc(ex?.name||tr('analysisDynamic.exerciseFallback'))}</b><div class="record-meta">目前最佳重量 ${fmtWeight(cur)} · ${esc(tr('finalUi.target',{weight:fmtWeight(g.weight),reps:g.reps}))}</div></div><span>${Math.round(pct)}%</span></div><div class="progress"><i style="width:${pct}%"></i></div></div>`}).join('');if(goalHtml)$('#recentProgress').insertAdjacentHTML('beforeend',goalHtml);
 $('#recentWorkouts').innerHTML=data.workouts.length?data.workouts.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4).map(workoutCardHtml).join(''):`<div class="card empty">${esc(tr('dynamic.noCompletedWorkout'))}</div>`;$$('#recentWorkouts [data-open]').forEach(b=>b.onclick=()=>editWorkout(b.dataset.open))
}
function suggestTemplate(){const r=coachRecommendations(coachGoal(),1)[0];if(r)return{title:r.p.nameZh,reason:r.reasons.join(' · '),templateId:'',systemProgramId:r.p.id};return{title:tr('homeUi.freeTraining'),reason:tr('homeUi.noSystemProgram'),templateId:'',systemProgramId:''}}
function workoutCardHtml(w){
 const sets=effectiveSets(w),vol=workoutVolume(w),prs=countPRsInWorkout(w);
 return `<div class="record"><div class="record-head"><div><div class="record-title">${esc(w.name)} ${w.deload?'<span class="pill">Deload</span>':''}</div><div class="record-meta">${esc(w.date)} · ${n(w.duration)} 分 · ${sets} ${esc(tr('dynamic.completedSets'))}</div></div><button class="btn small ghost" data-open="${esc(w.id)}">${esc(tr("residual.r4642d168"))}</button></div><div class="tagrow" style="margin-top:8px"><span class="tag">${fmtKg(vol)}</span><span class="tag">有氧 ${Math.round(cardioMinutes(w))} 分</span>${prs?`<span class="tag">PR ${prs}</span>`:''}</div></div>`
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
 openModal(tr('modal.exerciseDemo'),`<div class="card">
   <div class="record-title">${esc(ex.name)}</div>
   <div class="small">${esc(ex.nameEn||'')}</div>
   ${window.TrainLogMotion3DHtml?window.TrainLogMotion3DHtml(ex.id,ex.pattern,ex.name,ex.nameEn||'',eq?.nameEn||''):''}
   <div class="tagrow" style="margin-top:8px"><span class="tag">${esc(displayMuscle(ex.muscle||'其他'))}</span><span class="tag">${esc(pattern)}</span><span class="tag">${esc(prescription)}</span></div>
   ${eq?`<div class="small" style="margin-top:8px"><b>${esc(tr("residual.r765d952b"))}</b>${esc(eq.nameZh)} / ${esc(eq.nameEn)}</div>`:''}
   <div class="exercise-demo-copy" style="margin-top:11px">${esc(ex.descZh||ex.notes||'目前沒有額外動作說明。')}</div>
   ${ex.notes?`<div class="exercise-demo-note"><b>${esc(tr("residual.r73fcb017"))}</b>${esc(ex.notes)}</div>`:''}
 </div>
 <div class="actions">
   <button class="btn primary" id="demoYtZh">${esc(tr("residual.ra086a676"))}</button>
   <button class="btn ghost" id="demoYtEn">▶ English Proper Form</button>
   <button class="btn ghost" id="demoFullInfo">${esc(tr("residual.r4bc21e71"))}</button>
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
     <span class="tag">${esc(displayMuscle(e.muscle))}</span>
   </div>
   <div class="exercise-picker-meta">${esc(displayType(e.type))}${e.pattern?` · ${esc(patternDisplayName(e.pattern))}`:''}${eq?` · ${esc(eq.nameZh)}`:''}</div>
   <div class="exercise-picker-actions">
     <button class="btn primary" type="button" data-pick="${esc(e.id)}">${esc(tr("residual.rd91a8af4"))}</button>
     <button class="btn ghost" type="button" data-pick-info="${esc(e.id)}">${esc(tr('trainingUi.info'))}</button>
   </div>
 </div>`
}
const BODY_AREAS=[
 ['neck','domain.bodyArea.neck'],['shoulder_l','domain.bodyArea.shoulderL'],['shoulder_r','domain.bodyArea.shoulderR'],['chest','domain.bodyArea.chest'],['upper_back','domain.bodyArea.upperBack'],['lower_back','domain.bodyArea.lowerBack'],
 ['elbow_l','domain.bodyArea.elbowL'],['elbow_r','domain.bodyArea.elbowR'],['wrist_l','domain.bodyArea.wristL'],['wrist_r','domain.bodyArea.wristR'],['core','domain.bodyArea.core'],['hip_l','domain.bodyArea.hipL'],
 ['hip_r','domain.bodyArea.hipR'],['thigh_front','domain.bodyArea.thighFront'],['thigh_back','domain.bodyArea.thighBack'],['knee_l','domain.bodyArea.kneeL'],['knee_r','domain.bodyArea.kneeR'],['calf','domain.bodyArea.calf'],
 ['ankle_l','domain.bodyArea.ankleL'],['ankle_r','domain.bodyArea.ankleR']
];
const BODY_STATUS_TYPES={
 soreness:{labelKey:'domain.bodyType.soreness',shortKey:'domain.bodyType.sorenessShort',cls:'soreness'},
 tight:{labelKey:'domain.bodyType.tight',shortKey:'domain.bodyType.tightShort',cls:'tight'},
 pain:{labelKey:'domain.bodyType.pain',shortKey:'domain.bodyType.painShort',cls:'pain'}
};
const BODY_LEVELS={1:'domain.bodyLevel.mild',2:'domain.bodyLevel.medium',3:'domain.bodyLevel.strong'};
function bodyAreaName(id){const key=BODY_AREAS.find(x=>x[0]===id)?.[1];return key?tr(key):id}
function bodyTypeLabel(type){return tr((BODY_STATUS_TYPES[type]||BODY_STATUS_TYPES.soreness).labelKey)}
function bodyTypeShort(type){return tr((BODY_STATUS_TYPES[type]||BODY_STATUS_TYPES.soreness).shortKey)}
function bodyLevelName(level){const key=BODY_LEVELS[n(level)];return key?tr(key):''}
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
 const es=status?.entries||[];if(!es.length)return tr('bodyStatus.noneSummary');
 const important=es.filter(x=>x.type==='pain'||n(x.level)>=3).length;
 return `${tr('bodyStatus.summaryMarked',{count:es.length})}${important?tr('bodyStatus.summaryImportant',{count:important}):''}`
}
function bodyStatusTagsHtml(status){
 return (status?.entries||[]).map(e=>{const t=BODY_STATUS_TYPES[e.type]||BODY_STATUS_TYPES.soreness;return `<span class="body-status-tag ${t.cls}">${esc(bodyAreaName(e.area))} · ${esc(bodyTypeShort(e.type))} · ${esc(bodyLevelName(e.level))}</span>`}).join('')
}
function openBodyStatusModal(date=isoToday()){
 const current=JSON.parse(JSON.stringify(todayBodyStatus(date))),draft={...current,entries:[...(current.entries||[])]};
 let area=BODY_AREAS[0][0],type='soreness',level=1;
 const renderEntries=()=>{
   const box=$('#bodyStatusEntries');if(!box)return;
   box.innerHTML=draft.entries.length?draft.entries.map((e,i)=>{const t=BODY_STATUS_TYPES[e.type]||BODY_STATUS_TYPES.soreness;return `<div class="body-status-entry"><div class="body-status-entry-copy"><div class="body-status-entry-title">${esc(bodyAreaName(e.area))}</div><div class="body-status-entry-meta">${esc(bodyTypeLabel(e.type))} · ${esc(bodyLevelName(e.level))}</div></div><button class="btn small danger" data-body-remove="${i}" type="button">×</button></div>`}).join(''):`<div class="empty">${esc(tr('bodyStatus.noneToday'))}</div>`;
   $$('[data-body-remove]').forEach(b=>b.onclick=()=>{draft.entries.splice(n(b.dataset.bodyRemove),1);renderEntries()})
 };
 openModal(tr('modal.bodyStatus'),`<div class="card">
   <div class="small">${esc(tr('bodyStatus.intro'))}</div>
   <div class="section" style="margin-top:13px">${esc(tr('bodyStatus.areaStep'))}</div>
   <div class="body-area-grid">${BODY_AREAS.map((a,i)=>`<button type="button" class="body-area-btn ${i===0?'on':''}" data-body-area="${a[0]}" >${esc(bodyAreaName(a[0]))}</button>`).join('')}</div>
   <div class="section">${esc(tr('bodyStatus.feelingStep'))}</div>
   <div class="body-status-seg"><button type="button" class="on" data-body-type="soreness">${esc(tr('bodyStatus.soreness'))}</button><button type="button" data-body-type="tight">${esc(tr('bodyStatus.tight'))}</button><button type="button" data-body-type="pain">${esc(tr('bodyStatus.pain'))}</button></div>
   <div class="section">${esc(tr('bodyStatus.levelStep'))}</div>
   <div class="body-status-seg"><button type="button" class="on" data-body-level="1">${esc(tr('bodyStatus.mild'))}</button><button type="button" data-body-level="2">${esc(tr('bodyStatus.medium'))}</button><button type="button" data-body-level="3">${esc(tr('bodyStatus.strong'))}</button></div>
   <button class="btn primary" type="button" id="bodyStatusAdd" style="margin-top:10px;width:100%">${esc(tr('bodyStatus.addArea'))}</button>
 </div>
 <div class="section">${esc(tr('bodyStatus.markedToday'))}</div><div class="card" id="bodyStatusEntries"></div>
 <div class="field"><label>${esc(tr('bodyStatus.note'))}</label><textarea id="bodyStatusNote" placeholder="${esc(tr('bodyStatus.notePlaceholder'))}">${esc(draft.note||'')}</textarea></div>
 <div class="warnbox"><b>${esc(tr('bodyStatus.warningTitle'))}</b><div class="small" style="margin-top:4px">${esc(tr('bodyStatus.warning'))}</div></div>
 <div class="actions" style="margin-top:10px"><button class="btn primary" id="bodyStatusSave">${esc(tr('bodyStatus.save'))}</button><button class="btn ghost" id="bodyStatusClear">${esc(tr('bodyStatus.clear'))}</button></div>`,()=>{
   renderEntries();
   $$('[data-body-area]').forEach(b=>b.onclick=()=>{area=b.dataset.bodyArea;$$('[data-body-area]').forEach(x=>x.classList.toggle('on',x===b))});
   $$('[data-body-type]').forEach(b=>b.onclick=()=>{type=b.dataset.bodyType;$$('[data-body-type]').forEach(x=>x.classList.toggle('on',x===b))});
   $$('[data-body-level]').forEach(b=>b.onclick=()=>{level=n(b.dataset.bodyLevel);$$('[data-body-level]').forEach(x=>x.classList.toggle('on',x===b))});
   $('#bodyStatusAdd').onclick=()=>{
     const existing=draft.entries.find(x=>x.area===area);
     if(existing){existing.type=type;existing.level=level}else draft.entries.push({area,type,level});
     renderEntries()
   };
   $('#bodyStatusSave').onclick=()=>{draft.note=$('#bodyStatusNote').value.trim();saveBodyStatus(draft);closeModal();toast(tr('feedback.bodySaved'))};
   $('#bodyStatusClear').onclick=()=>{draft.entries=[];draft.note='';saveBodyStatus(draft);closeModal();toast(tr('feedback.bodyClear'))}
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
 return{hits,strong:hits.some(x=>x.type==='pain'||n(x.level)>=3),text:hits.map(x=>`${bodyAreaName(x.area)} ${bodyTypeShort(x.type)}${bodyLevelName(x.level)?`（${bodyLevelName(x.level)}）`:''}`).join('、')}
}
function bodyStatusCardHtml(date=isoToday()){
 const s=todayBodyStatus(date);
 return `<div class="card body-status-card"><div class="body-status-head"><div><div class="body-status-title">${esc(tr('bodyStatus.today'))}</div><div class="body-status-summary">${esc(bodyStatusSummary(s))}</div></div><button class="btn small ghost" type="button" data-open-body-status="${esc(date)}">${(s.entries||[]).length?tr('bodyStatus.edit'):tr('bodyStatus.setup')}</button></div>${(s.entries||[]).length?`<div class="body-status-tags">${bodyStatusTagsHtml(s)}</div>`:''}${s.note?`<div class="small" style="margin-top:8px">${esc(tr('bodyStatus.notePrefix'))}${esc(s.note)}</div>`:''}</div>`
}
function bindBodyStatusButtons(scope=document){
 scope.querySelectorAll?.('[data-open-body-status]').forEach(b=>b.onclick=()=>openBodyStatusModal(b.dataset.openBodyStatus||isoToday()))
}
const UI_LEVELS={
 simple:{nameKey:'domain.uiLevel.simpleName',shortKey:'domain.uiLevel.simpleShort',descKey:'domain.uiLevel.simpleDesc'},
 standard:{nameKey:'domain.uiLevel.standardName',shortKey:'domain.uiLevel.standardShort',descKey:'domain.uiLevel.standardDesc'},
 advanced:{nameKey:'domain.uiLevel.advancedName',shortKey:'domain.uiLevel.advancedShort',descKey:'domain.uiLevel.advancedDesc'}
};
function uiLevel(){return data.settings.uiLevel||'standard'}
function uiLevelName(level=uiLevel()){return tr(UI_LEVELS[level]?.nameKey||'domain.uiLevel.standardName')}
function uiLevelShort(level=uiLevel()){return tr(UI_LEVELS[level]?.shortKey||'domain.uiLevel.standardShort')}
function uiLevelDesc(level=uiLevel()){return tr(UI_LEVELS[level]?.descKey||'domain.uiLevel.standardDesc')}
function applyUiLevel(){
 const level=uiLevel();document.body.dataset.uiLevel=level;
 const badge=$('#uiLevelHeaderBadge');if(badge)badge.textContent=tr('finalUi.uiLevelMode',{level:uiLevelName(level)})
}
function syncUiLevelControls(scope=document){
 const cur=uiLevel();
 scope.querySelectorAll?.('[data-ui-level]').forEach(b=>b.classList.toggle('on',b.dataset.uiLevel===cur));
 scope.querySelectorAll?.('.ui-level-hint').forEach(h=>h.textContent=uiLevelDesc(cur))
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
 toast(tr('feedback.uiLevelChanged',{level:uiLevelName(level)}))
}
function uiLevelSwitchHtml(){
 const cur=uiLevel();
 return `<div class="ui-level-switch">${Object.entries(UI_LEVELS).map(([key,v])=>`<button type="button" class="${cur===key?'on':''}" data-ui-level="${key}">${v.name}<small>${v.short}</small></button>`).join('')}</div><div class="ui-level-hint">${esc(uiLevelDesc(cur))}</div>`
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
 openModal(tr('modal.loadHistory'),rows.length?rows.map(w=>`<div class="drawer-history-row">
   <div class="record-head"><div><b>${esc(w.name)}</b><div class="record-meta">${esc(w.date)} · ${tr('drawer.historyExerciseCount',{count:(w.exercises||[]).length})}</div></div></div>
   <div class="drawer-history-actions"><button class="btn ghost" data-history-add="${w.id}">${esc(tr('drawer.historyAdd'))}</button><button class="btn primary" data-history-replace="${w.id}">${esc(tr('drawer.historyReplace'))}</button></div>
 </div>`).join(''):`<div class="empty">${esc(tr('drawer.historyEmpty'))}</div>`,()=>{
   $$('[data-history-add]').forEach(b=>b.onclick=()=>{const w=data.workouts.find(x=>x.id===b.dataset.historyAdd);if(!w)return;data.activeWorkout.exercises.push(...(w.exercises||[]).map(sessionExerciseFromHistory));saveActiveOnly(true);closeModal();toast(tr('feedback.historyAdded'))});
   $$('[data-history-replace]').forEach(b=>b.onclick=()=>{const w=data.workouts.find(x=>x.id===b.dataset.historyReplace);if(!w)return;if(data.activeWorkout.exercises.length&&!confirm(tr('dialogs.replaceHistory')))return;data.activeWorkout.exercises=(w.exercises||[]).map(sessionExerciseFromHistory);saveActiveOnly(true);closeModal();toast(tr('feedback.historyReplaced'))})
 })
}
function saveActiveAsTemplate(){
 const w=data.activeWorkout;if(!w)return;closeTrainingDrawer();
 openModal(tr('modal.newTrainingPlan'),`<div class="card"><div class="field"><label>${esc(tr('trainingUi.workoutName'))}</label><input id="drawerTplName" value="${esc(w.name||tr('drawer.defaultTemplateName'))}"></div><div class="small">${esc(tr('drawer.templateHint',{count:w.exercises.length}))}</div><button class="btn primary" id="drawerTplSave" style="margin-top:12px">${esc(tr('drawer.saveTemplate'))}</button></div>`,()=>$('#drawerTplSave').onclick=()=>{
   const name=$('#drawerTplName').value.trim()||tr('drawer.defaultTemplateName');
   data.templates.push({id:uid('tpl'),name,nameEn:'',items:w.exercises.map(e=>({exerciseId:e.exerciseId,targetSets:Math.max(1,(e.sets||[]).length||n(getExercise(e.exerciseId)?.targetSets)||3)}))});
   save(tr('reasons.createPlanFromWorkout'),true);closeModal();toast(tr('feedback.planCreated'))
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
 box.innerHTML=`<div class="drawer-section-title" style="margin-top:8px">${esc(tr('drawer.displayLevel'))}</div>
 <div class="card" style="padding:10px">${uiLevelSwitchHtml()}</div>
 <div class="drawer-menu">
   <button class="drawer-row" id="drawerEditList"><span class="drawer-row-icon">☷</span><span class="drawer-row-copy"><span class="drawer-row-title">${esc(tr('drawer.editList'))}</span><span class="drawer-row-desc">${esc(tr('drawer.editListDesc'))}</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row" id="drawerAddExercise"><span class="drawer-row-icon">＋</span><span class="drawer-row-copy"><span class="drawer-row-title">${esc(tr('drawer.addExercise'))}</span><span class="drawer-row-desc">${esc(tr('drawer.addExerciseDesc'))}</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row" id="drawerBodyStatus"><span class="drawer-row-icon">♡</span><span class="drawer-row-copy"><span class="drawer-row-title">${esc(tr('drawer.bodyStatus'))}</span><span class="drawer-row-desc">${esc(bodyStatusSummary(todayBodyStatus(w.date)))}</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row" id="drawerAddPlan"><span class="drawer-row-icon">▱</span><span class="drawer-row-copy"><span class="drawer-row-title">${esc(tr('drawer.addPlan'))}</span><span class="drawer-row-desc">${esc(tr('drawer.addPlanDesc'))}</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row" id="drawerLoadHistory"><span class="drawer-row-icon">↶</span><span class="drawer-row-copy"><span class="drawer-row-title">${esc(tr('drawer.loadHistory'))}</span><span class="drawer-row-desc">${esc(tr('drawer.loadHistoryDesc'))}</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row" id="drawerCollapseAll"><span class="drawer-row-icon">▤</span><span class="drawer-row-copy"><span class="drawer-row-title">${allCollapsed?tr('drawer.expandAll'):tr('drawer.collapseAll')}</span><span class="drawer-row-desc">${esc(tr('drawer.collapseDesc'))}</span></span><span class="drawer-row-arrow">›</span></button>
   <button class="drawer-row danger" id="drawerDeleteWorkout"><span class="drawer-row-icon">⌫</span><span class="drawer-row-copy"><span class="drawer-row-title">${w.editingWorkoutId?tr('drawer.cancelEdit'):tr('drawer.discardWorkout')}</span></span><span class="drawer-row-arrow">›</span></button>
 </div>
 <div class="drawer-section-title">${esc(tr('drawer.trainingSettings'))}</div>
 <div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">${esc(tr('drawer.tabPosition'))}</div><div class="drawer-setting-desc">${esc(tr('drawer.tabPositionDesc'))}</div></div><button class="btn small ghost" id="drawerResetTabPosition" type="button">${esc(tr('drawer.resetTop'))}</button></div>
   <div class="drawer-setting" style="display:block"><div class="drawer-setting-copy"><div class="drawer-setting-title">${esc(tr('drawer.inputUnit'))}</div><div class="drawer-setting-desc">${esc(tr('drawer.inputUnitDesc'))}</div></div><div class="drawer-unit-actions"><button class="btn ghost" id="drawerAllKg" type="button">${esc(tr('drawer.allKg'))}</button><button class="btn ghost" id="drawerAllLb" type="button">${esc(tr('drawer.allLb'))}</button></div></div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">${esc(tr('drawer.timerPosition'))}</div><div class="drawer-setting-desc">${esc(tr('drawer.timerPositionDesc'))}</div></div><div class="drawer-radio"><label><input type="radio" name="drawerTimerPos" value="top" ${data.settings.restTimerPosition!=='floating'?'checked':''}>${esc(tr('drawer.top'))}</label><label><input type="radio" name="drawerTimerPos" value="floating" ${data.settings.restTimerPosition==='floating'?'checked':''}>${esc(tr("residual.r26b86665"))}</label></div></div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">${esc(tr('drawer.notes'))}</div><div class="drawer-setting-desc">${esc(tr('drawer.notesDesc'))}</div></div><label class="drawer-toggle"><input id="drawerNotes" type="checkbox" ${data.settings.trainingNotes!==false?'checked':''}><span></span></label></div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">${esc(tr('drawer.autoLoad'))}</div><div class="drawer-setting-desc">${esc(tr('drawer.autoLoadDesc'))}</div></div><label class="drawer-toggle"><input id="drawerAutoLoad" type="checkbox" ${data.settings.trainingAutoLoad!==false?'checked':''}><span></span></label></div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">${esc(tr('drawer.intervalTimer'))}</div><div class="drawer-setting-desc">${esc(tr('drawer.intervalTimerDesc'))}</div></div><label class="drawer-toggle"><input id="drawerIntervalTimer" type="checkbox" ${data.settings.trainingIntervalTimer!==false?'checked':''}><span></span></label></div>
   <div class="drawer-setting"><div class="drawer-setting-copy"><div class="drawer-setting-title">${esc(tr('drawer.sound'))}</div><div class="drawer-setting-desc">${esc(tr('drawer.soundDesc'))}</div></div><label class="drawer-toggle"><input id="drawerRestSound" type="checkbox" ${data.settings.restTimerSound!==false?'checked':''}><span></span></label></div>
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
 $('#drawerResetTabPosition').onclick=()=>{data.settings.trainingDrawerTabTop=8;localStorage.setItem(APP_KEY,JSON.stringify(data));applyTrainingDrawerTabPosition();toast(tr('feedback.drawerReset'))};
 $('#drawerAllKg').onclick=()=>{(w.exercises||[]).forEach(e=>{if(!['cardio','duration'].includes(e.type))e.inputUnit='kg'});saveActiveOnly(true);renderTrainingDrawer();toast(tr('feedback.allKg'))};
 $('#drawerAllLb').onclick=()=>{(w.exercises||[]).forEach(e=>{if(!['cardio','duration'].includes(e.type))e.inputUnit='lb'});saveActiveOnly(true);renderTrainingDrawer();toast(tr('feedback.allLb'))};
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
 $('#trainLanding').innerHTML=data.activeWorkout?'':`${bodyStatusCardHtml(isoToday())}<div class="card"><div class="hero"><div><h2>${esc(tr('trainingUi.startToday'))}</h2><p>${esc(tr('trainingUi.landingHint',{count:SYSTEM_PROGRAMS.length}))}</p></div><div class="actions"><button class="btn primary" id="trainStartBtn">${esc(tr('trainingUi.myTemplates'))}</button><button class="btn ghost" id="browseProgramsBtn">${esc(tr('trainingUi.systemPrograms'))}</button></div></div></div><div class="section">${esc(tr('trainingUi.longTermPlan'))}</div><div id="trainCoachPicks">${goalProgramRecommendationsHtml()}</div>`;
 if(!data.activeWorkout){$('#activeWorkout').innerHTML='';renderTrainingDrawerVisibility();bindBodyStatusButtons($('#trainLanding'));bindProgramCards($('#trainCoachPicks'));const b=$('#trainStartBtn');if(b)b.onclick=openStartModal;const bp=$('#browseProgramsBtn');if(bp)bp.onclick=()=>{goPage('settingsPage');setTimeout(()=>$('#programSearch')?.focus(),50)};return}
 const w=data.activeWorkout;
 const pre=w.preStatus||{};
 const isHistoryEdit=!!w.editingWorkoutId;
 const dayStatus=todayBodyStatus(w.date),dayStrong=(dayStatus.entries||[]).some(x=>x.type==='pain'||n(x.level)>=3);
 let html=`${(dayStatus.entries||[]).length?`<div class="body-status-banner ${dayStrong?'strong':''}"><div class="record-head"><div><div class="body-status-banner-title">${esc(tr('trainingUi.bodyMarked'))}</div><div class="body-status-banner-copy">${esc(tr('trainingUi.bodyMarkedHint',{summary:bodyStatusSummary(dayStatus)}))}</div></div><button class="btn small ghost" type="button" data-open-body-status="${esc(w.date)}">${esc(tr('trainingUi.viewEdit'))}</button></div><div class="body-status-tags">${bodyStatusTagsHtml(dayStatus)}</div></div>`:''}<div class="card">
  ${isHistoryEdit?`<div class="banner"><b>${esc(tr('trainingUi.editingHistory'))}</b><br>${esc(tr('trainingUi.editingHistoryHint'))}</div>`:''}
  <div class="record-head"><div><div class="record-title" style="font-size:19px">${esc(w.name)}</div><div class="record-meta">${esc(w.date)} · ${isHistoryEdit?tr('trainingUi.historyMode'):tr('trainingUi.autosaving')} · <span id="uiLevelHeaderBadge" class="ui-mode-current">${esc(uiLevelName())}${esc(tr('trainingUi.modeSuffix'))}</span></div></div><div class="actions"><button class="btn small ghost" id="editSessionMeta">${esc(tr('trainingUi.settings'))}</button><button class="btn small primary" id="openTrainingTools">${esc(tr('trainingUi.tools'))}</button></div></div>
  <div class="tagrow" style="margin-top:9px"><span class="tag">${tr('trainingUi.energy',{value:pre.energy||'—'})}</span><span class="tag">${tr('trainingUi.sleep',{value:pre.sleep||'—'})}</span><span class="tag">${tr('trainingUi.fatigue',{value:pre.fatigue||'—'})}</span>${w.deload?'<span class="tag">Deload</span>':''}</div>
  ${w.programDayMeta?`<div class="day-focus-live"><div class="small">${esc(tr('trainingUi.todayFocus'))}</div><div class="record-title" style="margin-top:3px">${esc(w.programDayMeta.dayTitle||'')}</div><div class="small" style="margin-top:5px;line-height:1.55">${esc(w.programDayMeta.focusSummary||'')}</div><div class="tagrow" style="margin-top:7px">${(w.programDayMeta.primaryMuscles||[]).length?`<span class="tag">${esc(tr('trainingUi.primary',{value:w.programDayMeta.primaryMuscles.join('・')}))}</span>`:''}${w.programDayMeta.intensityLevel?`<span class="tag">${esc(tr('trainingUi.intensity',{value:w.programDayMeta.intensityLevel}))}</span>`:''}${w.programDayMeta.estimatedMinutes?`<span class="tag">${esc(tr('trainingUi.aboutMinutes',{value:n(w.programDayMeta.estimatedMinutes)}))}</span>`:''}</div>${w.programDayMeta.coachNote?`<div class="small" style="margin-top:7px"><b>${esc(tr('trainingUi.tip'))}</b>${esc(w.programDayMeta.coachNote)}</div>`:''}</div>`:''}
  ${w.pain?`<div class="warnbox" style="margin-top:10px">${esc(tr('trainingUi.pain',{value:w.pain}))}</div>`:''}
 </div>`;
 html+=`<div class="card rest-quick-card"><div class="record-head"><div><b>${esc(tr('trainingUi.restTimer'))}</b><div class="record-meta">${esc(tr('trainingUi.restTimerHint'))}</div></div><button class="btn small ghost" id="timerShow">${esc(tr('trainingUi.show'))}</button></div><div class="quick"><button class="btn ghost" data-timer="60">${esc(tr("residual.r662d6fcb"))}</button><button class="btn ghost" data-timer="90">${esc(tr("residual.r003c623a"))}</button><button class="btn ghost" data-timer="120">${esc(tr("residual.rdd566a34"))}</button><button class="btn ghost" data-timer="180">${esc(tr("residual.r4d35ed32"))}</button></div></div>`;
 html+=`<div id="sessionExercises">${(w.exercises||[]).map((e,i)=>sessionExerciseHtml(e,i)).join('')}</div>`;
 html+=`<div class="actions"><button class="btn ghost" id="sessionAddEx">${esc(tr('trainingUi.addExercise'))}</button><button class="btn ghost" id="sessionReorder">${esc(tr('trainingUi.reorder'))}</button></div>
 <div class="sticky-actions"><div class="actions"><button class="btn good" id="finishWorkout">${isHistoryEdit?tr('trainingUi.saveEdit'):tr('trainingUi.finishWorkout')}</button><button class="btn danger" id="cancelWorkout">${isHistoryEdit?tr('trainingUi.cancelEdit'):tr('trainingUi.discard')}</button></div></div>`;
 $('#activeWorkout').innerHTML=html;
 bindSessionEvents();bindBodyStatusButtons($('#activeWorkout'));renderTimer();renderTrainingDrawerVisibility();maybeStartWorkoutTutorial()
}
function sessionExerciseHtml(e,idx){
 const ex=getExercise(e.exerciseId)||{name:e.nameSnapshot,muscle:e.muscle,type:e.type,rest:data.settings.defaultRest,notes:''};
 const bodyMatch=bodyStatusExerciseMatch(ex,data.activeWorkout.date);
 const last=getLastExerciseRecord(e.exerciseId,wDateBefore(data.activeWorkout.date));
 const adv=progressionAdvice(e.exerciseId),advView=progressionDisplay(adv);
 let body='';
 if(e.type==='cardio'){
   body=`<div class="grid2"><div class="field"><label>${esc(tr('trainingUi.minutes'))}</label><input data-cardio="minutes" data-e="${idx}" type="number" min="0" value="${n(e.cardio?.minutes)}"></div><div class="field"><label>${esc(tr('trainingUi.distance'))}</label><input data-cardio="distanceKm" data-e="${idx}" type="number" step=".01" min="0" value="${n(e.cardio?.distanceKm)}"></div><div class="field"><label>${esc(tr('trainingUi.speed'))}</label><input data-cardio="speed" data-e="${idx}" type="number" step=".1" min="0" value="${n(e.cardio?.speed)}"></div><div class="field"><label>${esc(tr('trainingUi.incline'))}</label><input data-cardio="incline" data-e="${idx}" type="number" step=".1" min="0" value="${n(e.cardio?.incline)}"></div></div>`
 }else{
   body=(e.sets||[]).map((s,si)=>setRowHtml(e,s,idx,si)).join('')+`<button class="btn small ghost" data-addset="${idx}">${esc(tr('trainingUi.addSet'))}</button>`
 }
 const lastText=last?lastExerciseSummary(last.exercise):tr('trainingUi.noPrevious');
 const showNotes=data.settings.trainingNotes!==false,inputUnit=exerciseInputUnit(e);
 const unitTools=!['cardio','duration'].includes(e.type)?`<div class="exercise-unit-line"><span class="exercise-unit-label">${esc(tr('trainingUi.machineUnit'))}</span><span class="exercise-unit-toggle"><button type="button" class="${inputUnit==='kg'?'on':''}" data-ex-unit="${idx},kg">kg</button><button type="button" class="${inputUnit==='lb'?'on':''}" data-ex-unit="${idx},lb">lb</button></span><span class="exercise-unit-note">${inputUnit==='lb'?`<b>lb</b> ${esc(tr('finalUi.lbStorageDetail'))}`:`<b>kg</b> ${esc(tr('finalUi.kgStorageDetail'))}`}</span></div>`:'';
 return `<div class="workout-ex ${e.uiCollapsed?'collapsed':''}" data-exblock="${idx}">
  <div class="workout-ex-head"><div><div class="exercise-title-line"><div class="record-title">${idx+1}. ${esc(ex.name||e.nameSnapshot)} <span class="pill">${esc(displayMuscle(e.muscle))}</span></div><div class="exercise-title-tools"><button class="btn ghost" type="button" data-ex-info="${idx}" aria-label="${esc(tr('trainingUi.viewInfo'))}">${esc(tr('trainingUi.info'))}</button></div></div>${unitTools}<div class="record-meta">${esc(tr('trainingUi.previous',{value:lastText}))}</div>${bodyMatch?`<div class="exercise-body-warning ${bodyMatch.strong?'strong':''}">${esc(tr('trainingUi.bodyRelated',{value:bodyMatch.text}))}${bodyMatch.strong?tr('trainingUi.bodyStrong'):tr('trainingUi.bodyMild')}</div>`:''}${advView?`<div class="small ${progressionToneClass(advView)}" style="margin-top:5px;line-height:1.55"><b>${esc(advView.label)}</b> · ${esc(advView.reason)}<br>${esc(advView.text)}<br><span class="record-meta">${esc(advView.evidence)}</span>${trainingProgressionActions.canApply(adv)?`<div style="margin-top:7px"><button class="btn small primary" type="button" data-apply-progression="${idx}">${esc(progressionApplyLabel(adv,ex,e))}</button></div>`:''}</div>`:''}${showNotes&&ex.notes?`<div class="small" style="margin-top:5px">${esc(tr('trainingUi.equipmentNote'))}${esc(ex.notes)}</div>`:''}</div>
  <div class="actions"><button class="btn small ghost exercise-collapse-btn" data-collapseex="${idx}" aria-label="${e.uiCollapsed?tr('trainingUi.expand'):tr('trainingUi.collapse')}">${e.uiCollapsed?'⌄':'⌃'}</button><button class="btn small ghost" data-replace="${idx}">${esc(tr('trainingUi.replace'))}</button><button class="btn small danger" data-removeex="${idx}">${esc(tr('trainingUi.remove'))}</button></div></div>
  <div class="workout-ex-body">${body}${showNotes?`<div class="field" style="margin-top:9px"><label>${esc(tr('trainingUi.exerciseNote'))}</label><input data-exnote="${idx}" value="${esc(e.notes||'')}" placeholder="${esc(tr('trainingUi.exerciseNotePlaceholder'))}"></div>`:''}</div>
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
   return `<select data-set="rpe" data-e="${eIdx}" data-s="${sIdx}" class="rircell" aria-label="${esc(tr("residual.r352c4fe3"))}"><option value="">${esc(tr("residual.r36f23581"))}</option>${[6,6.5,7,7.5,8,8.5,9,9.5,10].map(v=>`<option value="${v}" ${String(s.rpe)===String(v)?'selected':''}>RPE ${v}</option>`).join('')}</select>`
 }
 return `<select data-set="rir" data-e="${eIdx}" data-s="${sIdx}" class="rircell" aria-label="${esc(tr("residual.rcfbc5e68"))}"><option value="">${esc(tr("residual.rd15abcf5"))}</option>${[0,1,2,3,4,5].map(v=>`<option value="${v}" ${String(s.rir)===String(v)?'selected':''}>RIR ${v}</option>`).join('')}</select>`
}
function setRowHtml(e,s,ei,si){
 const kcls='kind-'+(s.kind||'working'),done=s.completed?'setdone':'',unit=exerciseInputUnit(e),inc=machineIncrementForUnit(getExercise(e.exerciseId),unit),bigInc=unit==='lb'?Math.max(10,inc*2):Math.max(5,inc*2);
 if(e.type==='duration')return `<div class="setrow duration ${kcls} ${done}"><div class="setnum">${si+1}</div><label class="set-field"><span class="set-field-label">${esc(tr('trainingUi.seconds'))}</span><input data-set="seconds" data-e="${ei}" data-s="${si}" type="number" min="0" value="${n(s.seconds)}" placeholder="${esc(tr("residual.r577b1035"))}"></label>${intensitySelect(s,ei,si)}<button class="btn icon danger delcell" data-delset="${ei},${si}">−</button></div>`;
 if(e.type==='unilateral')return `<div class="setrow unilateral ${kcls} ${done}"><div class="setnum">${si+1}</div><label class="set-field"><span class="set-field-label">${esc(tr('trainingUi.leftWeight',{unit}))}</span><input data-set="leftWeight" data-e="${ei}" data-s="${si}" type="number" step=".1" value="${fmtWeightNumber(s.leftWeight,unit)}" placeholder="${esc(tr("finalUi.leftWeightPlaceholder",{unit}))}"></label><label class="set-field"><span class="set-field-label">${esc(tr('trainingUi.leftReps'))}</span><input data-set="leftReps" data-e="${ei}" data-s="${si}" type="number" value="${n(s.leftReps)}" placeholder="${esc(tr("residual.r79126c28"))}"></label><label class="set-field"><span class="set-field-label">${esc(tr('trainingUi.rightWeight',{unit}))}</span><input data-set="rightWeight" data-e="${ei}" data-s="${si}" type="number" step=".1" value="${fmtWeightNumber(s.rightWeight,unit)}" placeholder="${esc(tr("finalUi.rightWeightPlaceholder",{unit}))}"></label>${intensitySelect(s,ei,si)}<button class="btn icon danger delcell" data-delset="${ei},${si}">−</button><div class="small" style="grid-column:2/-1"><label class="set-field" style="width:110px;display:inline-grid"><span class="set-field-label">${esc(tr('trainingUi.rightReps'))}</span><input data-set="rightReps" data-e="${ei}" data-s="${si}" type="number" value="${n(s.rightReps)}"></label> <span class="weight-unit-suffix">${tr('trainingUi.weightInput',{unit})}</span></div></div>`;
 const weightVal=fmtWeightNumber(s.weight,unit);
 return `<div class="setrow ${kcls} ${done}"><div class="setnum">${si+1}</div><label class="set-field"><span class="set-field-label">${e.type==='bodyweight'?tr('trainingUi.assistWeight'):tr('trainingUi.weight')}（${unit}）</span><input data-set="weight" data-e="${ei}" data-s="${si}" type="number" step=".1" value="${weightVal}" placeholder="${unit}"></label><label class="set-field"><span class="set-field-label">${esc(tr('trainingUi.reps'))}</span><input data-set="reps" data-e="${ei}" data-s="${si}" type="number" min="0" value="${n(s.reps)}" placeholder="${esc(tr("residual.r308b9ffc"))}"></label>${intensitySelect(s,ei,si)}<button class="btn icon danger delcell" data-delset="${ei},${si}">−</button>
 <div class="quick advanced-set-quick" style="grid-column:2/-1"><button class="btn ghost" data-weight-delta="${ei},${si},${-bigInc}">−${cleanWeightNumber(bigInc)}${unit}</button><button class="btn ghost" data-weight-delta="${ei},${si},${-inc}">−${cleanWeightNumber(inc)}${unit}</button><button class="btn ghost" data-weight-delta="${ei},${si},${inc}">+${cleanWeightNumber(inc)}${unit}</button><button class="btn ghost" data-weight-delta="${ei},${si},${bigInc}">+${cleanWeightNumber(bigInc)}${unit}</button><button class="btn ghost" data-delta="${ei},${si},reps,-1">${esc(tr('trainingUi.repsMinus'))}</button><button class="btn ghost" data-delta="${ei},${si},reps,1">${esc(tr('trainingUi.repsPlus'))}</button><button class="btn ghost" data-copy="${ei},${si}">${esc(tr('trainingUi.copyPrevious'))}</button><button class="btn ${s.completed?'good':'primary'}" data-complete="${ei},${si}">${s.completed?tr('trainingUi.completed'):tr('trainingUi.completeSet')}</button>${s.completed?`<div class="simple-effort ui-simple-only"><button class="btn ghost" type="button" data-simple-effort="${ei},${si},easy">${esc(tr('trainingUi.tooEasy'))}</button><button class="btn ghost" type="button" data-simple-effort="${ei},${si},ok">${esc(tr('trainingUi.justRight'))}</button><button class="btn ghost" type="button" data-simple-effort="${ei},${si},hard">${esc(tr('trainingUi.tooHard'))}</button></div>`:''}<select class="set-kind-advanced ui-advanced-only" data-kind="${ei},${si}" style="width:auto;min-height:34px;padding:5px 7px;font-size:11px" aria-label="${esc(tr('trainingUi.setKind'))}">${KINDS.map(([v,l])=>`<option value="${v}" ${s.kind===v?'selected':''}>${esc(tr(l))}</option>`).join('')}</select></div></div>`
}
function bindSessionEvents(){
 $$('#activeWorkout [data-set]').forEach(el=>el.addEventListener('change',()=>{const ei=n(el.dataset.e),si=n(el.dataset.s),key=el.dataset.set,ex=data.activeWorkout.exercises[ei],set=ex.sets[si],weightKeys=['weight','leftWeight','rightWeight'];set[key]=el.value===''?'':(weightKeys.includes(key)?toKg(el.value,exerciseInputUnit(ex)):n(el.value));saveActiveOnly()}));
 $$('#activeWorkout [data-cardio]').forEach(el=>el.addEventListener('change',()=>{data.activeWorkout.exercises[n(el.dataset.e)].cardio[el.dataset.cardio]=n(el.value);saveActiveOnly()}));
 $$('#activeWorkout [data-exnote]').forEach(el=>el.addEventListener('change',()=>{data.activeWorkout.exercises[n(el.dataset.exnote)].notes=el.value;saveActiveOnly()}));
 $$('#activeWorkout [data-addset]').forEach(b=>b.onclick=()=>{const e=data.activeWorkout.exercises[n(b.dataset.addset)];trainingMutations.addSet(e,{id:uid('s')});saveActiveOnly(true)});
 $$('#activeWorkout [data-delset]').forEach(b=>b.onclick=()=>{const [ei,si]=b.dataset.delset.split(',').map(Number);trainingMutations.removeSet(data.activeWorkout.exercises[ei],si);saveActiveOnly(true)});
 $$('#activeWorkout [data-delta]').forEach(b=>b.onclick=()=>{const [ei,si,key,delta]=b.dataset.delta.split(',');trainingMutations.applyDelta(data.activeWorkout.exercises[n(ei)].sets[n(si)],key,delta);saveActiveOnly(true)});
 $$('#activeWorkout [data-weight-delta]').forEach(b=>b.onclick=()=>{const [ei,si,delta]=b.dataset.weightDelta.split(','),ex=data.activeWorkout.exercises[n(ei)],s=ex.sets[n(si)];trainingMutations.applyWeightDelta(s,toKg(delta,exerciseInputUnit(ex)));saveActiveOnly(true)});
 $$('#activeWorkout [data-ex-unit]').forEach(b=>b.onclick=()=>{const [ei,unit]=b.dataset.exUnit.split(','),ex=data.activeWorkout.exercises[n(ei)];ex.inputUnit=normalizeWeightUnit(unit);saveActiveOnly(true);toast(tr('feedback.exerciseUnit',{unit:ex.inputUnit}))});

 $$('#activeWorkout [data-copy]').forEach(b=>b.onclick=()=>{const [ei,si]=b.dataset.copy.split(',').map(Number);trainingMutations.copyPreviousSet(data.activeWorkout.exercises[ei],si);saveActiveOnly(true)});
 $$('#activeWorkout [data-complete]').forEach(b=>b.onclick=()=>{const [ei,si]=b.dataset.complete.split(',').map(Number),e=data.activeWorkout.exercises[ei],completed=trainingMutations.toggleCompleted(e,si);saveActiveOnly(true);if(completed&&data.settings.trainingIntervalTimer!==false){const ex=getExercise(e.exerciseId),nextNo=si+2;startTimer(n(ex?.rest)||n(data.settings.defaultRest)||90,tr('trainingUi.nextSet',{name:ex?.name||e.nameSnapshot,number:nextNo}))}});
 $$('#activeWorkout [data-kind]').forEach(el=>el.onchange=()=>{const [ei,si]=el.dataset.kind.split(',').map(Number);trainingMutations.setKind(data.activeWorkout.exercises[ei],si,el.value);saveActiveOnly(true)});
 $$('#activeWorkout [data-simple-effort]').forEach(b=>b.onclick=()=>{const [ei,si,feel]=b.dataset.simpleEffort.split(',');trainingMutations.applySimpleEffort(data.activeWorkout.exercises[n(ei)],n(si),feel);saveActiveOnly(true);toast(feel==='easy'?tr('feedback.effortEasy'):feel==='ok'?tr('feedback.effortOk'):tr('feedback.effortHard'))});
 $$('#activeWorkout [data-removeex]').forEach(b=>b.onclick=()=>{if(confirm(tr('dialogs.removeExercise'))){trainingMutations.removeExercise(data.activeWorkout.exercises,n(b.dataset.removeex));saveActiveOnly(true)}});
 $$('#activeWorkout [data-apply-progression]').forEach(b=>b.onclick=()=>{const ei=n(b.dataset.applyProgression),e=data.activeWorkout.exercises[ei],ex=getExercise(e?.exerciseId),adv=e?progressionAdvice(e.exerciseId):null;if(!e||!ex||!adv||!trainingProgressionActions.canApply(adv))return;if(!confirm(tr('dialogs.applyProgression')))return;const unit=exerciseInputUnit(e),inc=machineIncrementForUnit(ex,unit),result=trainingProgressionActions.applyAdvice(e,adv,{weightDeltaKg:toKg(inc,unit),repDelta:1,secondsDelta:n(ex.increment)||5});if(!result.applied){toast(tr('feedback.noProgressionTarget'));return}saveActiveOnly(true);toast(tr('feedback.progressionApplied',{count:result.changedSets})) });
 $$('#activeWorkout [data-replace]').forEach(b=>b.onclick=()=>openReplaceModal(n(b.dataset.replace)));
 $$('#activeWorkout [data-ex-info]').forEach(b=>b.onclick=()=>{const e=data.activeWorkout.exercises[n(b.dataset.exInfo)],ex=getExercise(e?.exerciseId);if(ex)showExerciseDetail(ex.id)});
 $('#sessionAddEx').onclick=()=>openExercisePicker(ex=>{const added=makeSessionExercise(ex,data.activeWorkout.date);data.activeWorkout.exercises.push(added);saveActiveOnly(true)});
 $('#sessionReorder').onclick=openReorderModal;
 $('#editSessionMeta').onclick=openSessionMeta;
 $('#openTrainingTools').onclick=openTrainingDrawer;
 $$('#activeWorkout [data-collapseex]').forEach(b=>b.onclick=()=>{const e=data.activeWorkout.exercises[n(b.dataset.collapseex)];e.uiCollapsed=!e.uiCollapsed;saveActiveOnly(true)});
 $('#finishWorkout').onclick=finishWorkout;
 $('#cancelWorkout').onclick=()=>{const editing=!!data.activeWorkout?.editingWorkoutId;const msg=editing?tr('dialogs.cancelEdit'):tr('dialogs.discardWorkout');if(confirm(msg)){data.activeWorkout=null;save(editing?tr('finalUi.saveCancelEdit'):tr('reasons.discardWorkout'),true);toast(editing?tr('feedback.editCancelled'):tr('feedback.workoutDiscarded'))}}
 $$('#activeWorkout [data-timer]').forEach(b=>b.onclick=()=>startTimer(n(b.dataset.timer),tr('trainingUi.manualRest')));const ts=$('#timerShow');if(ts)ts.onclick=()=>{timerHidden=false;if(!timerEnd)startTimer(n(data.settings.defaultRest)||90,tr('trainingUi.manualRest'));else renderTimer()};
}
function saveActiveOnly(rerender=false){localStorage.setItem(APP_KEY,JSON.stringify(data));if(rerender)renderTrain()}
let timerEnd=0,timerTotal=0,timerInterval=null,timerHidden=false,timerFinished=false,timerLabel=tr('trainingUi.defaultNext'),restAudioCtx=null;
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
function startTimer(sec,label=tr('trainingUi.defaultNext')){
 sec=Math.max(1,n(sec)||90);if(timerInterval)clearInterval(timerInterval);
 timerTotal=sec;timerEnd=Date.now()+sec*1000;timerLabel=label;timerHidden=data.settings.restTimerPosition==='floating';timerFinished=false;
 timerInterval=setInterval(renderTimer,250);renderTimer()
}
function stopTimer(showToast=true){
 if(timerInterval)clearInterval(timerInterval);timerInterval=null;timerEnd=0;timerTotal=0;timerFinished=false;timerHidden=false;renderTimer();if(showToast)toast(tr('feedback.restSkipped'))
}
function adjustTimer(delta){
 if(!timerEnd)return;
 if(timerFinished&&delta>0){timerFinished=false;timerTotal=Math.max(10,n(delta));timerEnd=Date.now()+timerTotal*1000;timerInterval=setInterval(renderTimer,250)}
 else{timerEnd+=n(delta)*1000;if(timerEnd<=Date.now()){timerEnd=Date.now();finishTimer()}else if(timerFinished){timerFinished=false;timerInterval=setInterval(renderTimer,250)}}
 renderTimer()
}
function finishTimer(){
 if(timerFinished)return;timerFinished=true;if(timerInterval)clearInterval(timerInterval);timerInterval=null;playRestSound();toast(tr('feedback.restFinished'));renderTimer()
}
function renderTimer(){
 const overlay=$('#restOverlay'),fab=$('#restFab'),time=$('#restOverlayTime'),fabTime=$('#restFabTime'),fill=$('#restOverlayFill'),sub=$('#restOverlaySub'),skip=$('#restSkipBtn');
 if(!overlay||!fab)return;
 if(!timerEnd){overlay.classList.add('rest-hidden');fab.classList.remove('show','done');return}
 const remain=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));
 if(remain<=0&&!timerFinished){finishTimer();return}
 time.textContent=timerFinished?tr('trainingUi.timeUp'):formatTimer(remain);time.classList.toggle('done',timerFinished);
 fabTime.textContent=timerFinished?tr('trainingUi.timeUp'):formatTimer(remain);sub.textContent=timerLabel||tr('trainingUi.defaultNext');
 const elapsed=Math.max(0,timerTotal-remain),pct=timerTotal?Math.min(100,elapsed/timerTotal*100):100;fill.style.width=pct+'%';
 overlay.classList.toggle('rest-hidden',timerHidden);fab.classList.toggle('show',timerHidden);fab.classList.toggle('done',timerFinished);
 if(skip)skip.textContent=timerFinished?tr('trainingUi.close'):tr('trainingUi.skip')
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
 const tpl=data.templates.map(t=>`<button class="btn ghost" data-starttpl="${esc(t.id)}" style="width:100%;margin-bottom:8px;text-align:left">${esc(t.name)}<div class="small">${tr('drawer.historyExerciseCount',{count:t.items.length})}</div></button>`).join('');
 openModal(tr('modal.startWorkout'),`<div class="field"><label>${esc(tr('trainingUi.todayDate'))}</label><input type="date" id="startDate" value="${isoToday()}"></div><div class="field"><label>${esc(tr('trainingUi.templates'))}</label>${tpl||`<div class="empty">${esc(tr('trainingUi.noTemplates'))}</div>`}</div><div class="actions"><button class="btn primary" id="startBlank">${esc(tr('trainingUi.blankWorkout'))}</button><button class="btn ghost" id="startBrowseSystem">${esc(tr('trainingUi.browsePrograms'))}</button></div>`,()=>{
   $$('[data-starttpl]').forEach(b=>b.onclick=()=>{const d=$('#startDate').value;closeModal();startTemplate(b.dataset.starttpl,d)});
   $('#startBlank').onclick=()=>{const d=$('#startDate').value;closeModal();startBlank(d)};$('#startBrowseSystem').onclick=()=>{closeModal();goPage('settingsPage');setTimeout(()=>$('#programSearch')?.focus(),50)}
 })
}
function startTemplate(id,date=isoToday()){
 if(data.activeWorkout){goPage('trainPage');return}
 const t=data.templates.find(x=>x.id===id);if(!t)return;
 data.activeWorkout=trainingLifecycle.createTemplateWorkout(t,{id:uid('w'),date,startedAt:new Date().toISOString(),resolveExercise:getExercise,makeSessionExercise});
 save(tr('reasons.startWorkout'),true);openSessionMeta(true);goPage('trainPage')
}
function startBlank(date=isoToday()){
 data.activeWorkout=trainingLifecycle.createBlankWorkout({id:uid('w'),date,startedAt:new Date().toISOString(),name:tr('homeUi.freeTraining')});
 save(tr('reasons.startWorkout'),true);openSessionMeta(true);goPage('trainPage')
}
function openSessionMeta(first=false){
 const w=data.activeWorkout,p=w.preStatus||{};
 openModal(first?tr('modal.preWorkout'):tr('modal.workoutSettings'),`<div class="grid2">
 <div class="field"><label>${esc(tr('trainingUi.workoutName'))}</label><input id="smName" value="${esc(w.name)}"></div><div class="field"><label>${esc(tr('trainingUi.date'))}</label><input type="date" id="smDate" value="${esc(w.date)}"></div>
 <div class="field"><label>${esc(tr('trainingUi.duration'))}</label><input type="number" id="smDuration" min="0" max="1440" value="${n(w.duration)}"></div>
 <div class="field"><label>${esc(tr('trainingUi.energyInput'))}</label><input type="number" id="smEnergy" min="1" max="5" value="${p.energy||''}"></div><div class="field"><label>${esc(tr('trainingUi.sleepInput'))}</label><input type="number" id="smSleep" min="1" max="5" value="${p.sleep||''}"></div>
 <div class="field"><label>${esc(tr('trainingUi.fatigueInput'))}</label><input type="number" id="smFatigue" min="1" max="5" value="${p.fatigue||''}"></div><div class="field"><label>${esc(tr('trainingUi.gym'))}</label><input id="smGymName" list="smGymOptions" value="${esc(workoutGymName(w))}" placeholder="${esc(tr('trainingUi.gymPlaceholder'))}"><datalist id="smGymOptions">${data.gyms.map(g=>`<option value="${esc(g.name)}"></option>`).join('')}</datalist><div class="hint">${esc(tr('trainingUi.gymHint'))}</div></div></div>
 <div class="field"><label>${esc(tr('trainingUi.painInput'))}</label><input id="smPain" value="${esc(w.pain||'')}" placeholder="${esc(tr('trainingUi.painPlaceholder'))}"></div>
 <div class="inline-check"><input type="checkbox" id="smDeload" ${w.deload?'checked':''}><label for="smDeload">${esc(tr('trainingUi.deload'))}</label></div>
 <button class="btn primary" id="smSave" style="margin-top:12px">${esc(tr('trainingUi.save'))}</button>`,()=>{$('#smSave').onclick=()=>{w.name=$('#smName').value.trim()||tr('trainingUi.unnamed');w.date=$('#smDate').value||isoToday();w.duration=clamp($('#smDuration').value,0,1440);const gym=ensureGymByName($('#smGymName').value);w.gymId=gym?.id||'';w.gymNameSnapshot=gym?.name||'';w.pain=$('#smPain').value.trim();w.deload=$('#smDeload').checked;w.preStatus={energy:clamp($('#smEnergy').value,0,5)||'',sleep:clamp($('#smSleep').value,0,5)||'',fatigue:clamp($('#smFatigue').value,0,5)||''};saveActiveOnly();closeModal();renderTrain()}})
}
function finishWorkout(){
 const w=data.activeWorkout;if(!w)return;const issues=validateWorkout(w);if(issues.length&&!confirm(tr('trainingUi.inputWarning',{issues:issues.slice(0,5).join('\n')})))return;
 const editingId=w.editingWorkoutId||'';
 if(editingId){
   const idx=data.workouts.findIndex(x=>x.id===editingId);if(idx<0){alert(tr('trainingUi.missingOriginal'));return}
   snapshot(tr('reasons.beforeHistoryEdit'));
   const updated=trainingLifecycle.finalizeHistoryEdit(w,editingId);
   const next=[...data.workouts];next[idx]=updated;data.workouts=trainingLifecycle.sortWorkouts(next);
   data.activeWorkout=null;
   save(tr('reasons.editWorkoutContent'),false);
   const summary=tr('trainingUi.summary',{exercises:updated.exercises.length,sets:effectiveSets(updated),volume:fmtKg(workoutVolume(updated)),cardio:Math.round(cardioMinutes(updated))});
   openModal(tr('modal.savedEdit'),`<div class="card"><div class="record-title">${esc(updated.name)}</div><div class="small" style="margin-top:7px">${esc(summary)}</div></div><button class="btn primary" id="doneClose">${esc(tr('trainingUi.done'))}</button>`,()=>$('#doneClose').onclick=()=>{closeModal();goPage('recordsPage')});
   return;
 }
 const completed=trainingLifecycle.finalizeWorkout(w,{endedAt:new Date().toISOString(),bodyStatusSnapshot:todayBodyStatus(w.date)});
 data.workouts=trainingLifecycle.appendCompletedWorkout(data.workouts,completed);data.activeWorkout=null;save(tr('reasons.finishWorkout'),true);
 const prs=countPRsInWorkout(completed),summary=tr('trainingUi.summary',{exercises:completed.exercises.length,sets:effectiveSets(completed),volume:fmtKg(workoutVolume(completed)),cardio:Math.round(cardioMinutes(completed))})+(prs?tr('trainingUi.summaryPr',{count:prs}):'');
 openModal(tr('modal.workoutDone'),`<div class="card"><div class="record-title">${esc(completed.name)}</div><div class="small" style="margin-top:7px">${esc(summary)}</div></div><button class="btn primary" id="doneClose">${esc(tr('trainingUi.done'))}</button>`,()=>$('#doneClose').onclick=()=>{closeModal();goPage('homePage')})
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
 }).join('')||'<div class="empty">${esc(tr("residual.r6723d7f4"))}<br><span class="small">${esc(tr("residual.r8d120204"))}</span></div>';

 const scopeLabel=()=>{
   if(state.scope==='recent')return tr('dynamic.pickerRecent');
   if(state.scope==='mine')return tr('dynamic.pickerMine');
   if(state.scope==='gym')return tr('finalUi.currentGym',{gym:activeGym?' · '+activeGym.name:''});
   if(state.scope==='equipment')return tr('dynamic.pickerEquipment');
   return''
 };
 const renderSummary=()=>{
   const tags=[];
   if(state.q)tags.push(`搜尋：${state.q}`);
   if(state.scope!=='all')tags.push(scopeLabel());
   state.muscles.forEach(m=>tags.push(m));
   if(state.resistance!=='all')tags.push(state.resistance==='none'?'無器材':(resistanceLabels[state.resistance]||state.resistance));
   const results=sortedResults();
   $('#pickCount').textContent=tr('dynamic.pickerCount',{count:results.length});
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
 openModal(tr('modal.chooseExercise'),`<div class="exercise-filter-bar">
   <div class="field" style="margin-bottom:0"><label>${esc(tr('dynamic.pickerSearchLabel'))}</label><input id="pickSearch" placeholder="${esc(tr("residual.rabb3a213"))}"></div>
   <div class="exercise-filter-quick" id="pickerQuick">
     <button type="button" class="on" data-picker-scope="all">${esc(tr('dynamic.pickerAll'))}</button>
     <button type="button" data-picker-scope="recent">${esc(tr('dynamic.pickerRecent'))}</button>
     <button type="button" data-picker-scope="mine">${esc(tr('dynamic.pickerMine'))}</button>
     <button type="button" data-picker-scope="gym" ${activeGym&&gymEquipment.size?'':'disabled'}>${esc(gymLabel)}</button>
     <button type="button" data-picker-scope="equipment" ${ownedEquipment.size?'':'disabled'}>${esc(tr('dynamic.pickerEquipment'))}</button>
   </div>
   <div>
     <div class="small" style="margin-bottom:5px">${esc(tr('dynamic.pickerMuscle'))}</div>
     <div class="exercise-muscle-chips" id="pickerMuscles">${MUSCLES.filter(m=>m!=='其他').map(m=>`<button type="button" data-picker-muscle="${esc(m)}">${esc(displayMuscle(m))}</button>`).join('')}</div>
   </div>
   <div class="exercise-filter-row">
     <div class="field" style="margin:0"><label>${esc(tr('dynamic.pickerResistance'))}</label><select id="pickResistance">
       <option value="all">${esc(tr("residual.r9ad046b6"))}</option>
       ${resistanceOptions.map(r=>`<option value="${esc(r)}">${esc(resistanceLabels[r]||r)}</option>`).join('')}
       <option value="none">${esc(tr("residual.rb78e2039"))}</option>
     </select></div>
     <button class="btn ghost exercise-filter-clear" type="button" id="pickClear">${esc(tr('dynamic.pickerClear'))}</button>
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
 openModal(tr('modal.replaceExercise'),list.map(x=>`<button class="btn ghost" data-rp="${x.id}" style="width:100%;margin-bottom:7px;text-align:left">${esc(x.name)}<div class="small">${esc(displayMuscle(x.muscle))}</div></button>`).join('')||'<div class="empty">${esc(tr("residual.re7cda89f"))}</div>',()=>$$('[data-rp]').forEach(b=>b.onclick=()=>{const replacement=makeSessionExercise(getExercise(b.dataset.rp),data.activeWorkout.date);data.activeWorkout.exercises[idx]=replacement;saveActiveOnly(true);closeModal()}))
}
function openReorderModal(){
 const w=data.activeWorkout;if(!w)return;
 const original=[...w.exercises];
 const rows=original.map((e,i)=>`<div class="reorder-item" data-reorder-key="${i}">
   <button class="reorder-handle" type="button" data-reorder-handle aria-label="${esc(tr("finalUi.dragAria",{name:e.nameSnapshot}))}">☷</button>
   <div class="reorder-copy"><div class="reorder-name"><span data-reorder-number>${i+1}</span>. ${esc(e.nameSnapshot)}</div><div class="reorder-meta">${esc(tr("residual.r20ebbb88"))}</div></div>
 </div>`).join('');
 openModal(tr('modal.reorderExercise'),`<div class="reorder-help">${esc(tr("residual.r9f34cb04"))}</div><div class="reorder-list" id="reorderList">${rows}</div><button class="btn primary" id="reorderDone" type="button" style="width:100%;margin-top:12px">${esc(tr('trainingUi.done'))}</button>`,()=>{
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
       toast(tr('feedback.orderUpdated'))
     };
     h.addEventListener('pointerup',finish);
     h.addEventListener('pointercancel',finish)
   });
   $('#reorderDone').onclick=()=>{persistOrder();clearDragState();closeModal();renderTrain()}
 })
}

function renderRecords(){
 const mus=$('#recordMuscle');if(!mus.options.length)mus.innerHTML=`<option value="">${esc(tr('dynamic.allMuscles'))}</option>`+MUSCLES.map(m=>`<option value="${esc(m)}">${esc(displayMuscle(m))}</option>`).join('');
 if(!$('#recordMonth').value)$('#recordMonth').value=monthKey();
 const mk=$('#recordMonth').value,filter=$('#recordMuscle').value;
 renderCalendar(mk);
 const filtered=data.workouts.filter(w=>w.date.startsWith(mk)&&(!filter||(w.exercises||[]).some(e=>e.muscle===filter))).sort((a,b)=>b.date.localeCompare(a.date));
 $('#recordList').innerHTML=filtered.length?filtered.map(workoutCardHtml).join(''):`<div class="card empty">${esc(tr('messages.recordsEmpty'))}</div>`;
 $$('#recordList [data-open]').forEach(b=>b.onclick=()=>editWorkout(b.dataset.open));
 $('#trashList').innerHTML=data.trash.length?data.trash.map(t=>`<div class="record"><div class="record-head"><div><b>${esc(t.item.name)}</b><div class="record-meta">${esc(tr('dynamic.deletedAt'))} ${i18n.formatDate(new Date(t.deletedAt),{dateStyle:'short',timeStyle:'short'})}</div></div><div class="actions"><button class="btn small good" data-restore="${t.id}">${esc(tr('dynamic.restore'))}</button><button class="btn small danger" data-purge="${t.id}">${esc(tr('dynamic.purge'))}</button></div></div></div>`).join(''):`<div class="card empty">${esc(tr('recordsUi.trashEmpty'))}</div>`;
 $$('[data-restore]').forEach(b=>b.onclick=()=>{const t=data.trash.find(x=>x.id===b.dataset.restore);if(t){data.workouts.push(t.item);data.trash=data.trash.filter(x=>x.id!==t.id);save(tr('reasons.restoreRecord'),true);toast(tr('feedback.recordRestored'))}})
 $$('[data-purge]').forEach(b=>b.onclick=()=>{if(confirm(tr('dialogs.purgeRecord'))){data.trash=data.trash.filter(x=>x.id!==b.dataset.purge);save(tr('reasons.purgeRecord'),true)}})
}
function renderCalendar(mk){
 const [y,m]=mk.split('-').map(Number),first=new Date(y,m-1,1),last=new Date(y,m,0),heads=[tr('recordsUi.weekdaySun'),tr('recordsUi.weekdayMon'),tr('recordsUi.weekdayTue'),tr('recordsUi.weekdayWed'),tr('recordsUi.weekdayThu'),tr('recordsUi.weekdayFri'),tr('recordsUi.weekdaySat')];let html=heads.map(h=>`<div class="calhead">${h}</div>`).join('');
 for(let i=0;i<first.getDay();i++)html+='<div></div>';
 for(let d=1;d<=last.getDate();d++){const iso=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,ws=data.workouts.filter(w=>w.date===iso),has=ws.length,sets=has?effectiveSets({exercises:ws.flatMap(w=>w.exercises)}):0;html+=`<button class="calday ${iso===isoToday()?'today':''} ${has?'has':''}" data-day="${iso}" aria-label="${has?tr('recordsUi.calendarAria',{date:iso,workouts:ws.length,sets}):tr('recordsUi.calendarNone',{date:iso})}"><b>${d}</b>${has?`<span>${tr('recordsUi.calendarSummary',{workouts:ws.length,sets})}</span><span class="cal-status">${esc(tr('recordsUi.calendarDone'))}</span>`:`<span class="cal-empty">—</span>`}</button>`}$('#calendar').innerHTML=html;$$('#calendar [data-day]').forEach(b=>b.onclick=()=>{const ws=data.workouts.filter(w=>w.date===b.dataset.day);if(ws.length)editWorkout(ws[0].id)})
}
function beginHistoryEdit(id){
 const original=data.workouts.find(x=>x.id===id);if(!original)return;
 if(data.activeWorkout){
   alert(tr('recordsUi.editBlocked'));
   return;
 }
 data.activeWorkout=JSON.parse(JSON.stringify(original));
 data.activeWorkout.editingWorkoutId=id;
 data.activeWorkout.status='active';
 localStorage.setItem(APP_KEY,JSON.stringify(data));
 closeModal();
 goPage('trainPage');
 toast(tr('recordsUi.fullEditEntered'));
}
function editWorkout(id){
 const w=data.workouts.find(x=>x.id===id);if(!w)return;
 openModal(tr('modal.editRecord'),`<div class="card"><div class="field"><label>${esc(tr('recordsUi.name'))}</label><input id="ewName" value="${esc(w.name)}"></div><div class="grid2"><div class="field"><label>${esc(tr('trainingUi.date'))}</label><input id="ewDate" type="date" value="${w.date}"></div><div class="field"><label>${esc(tr('recordsUi.minutes'))}</label><input id="ewDuration" type="number" min="0" max="1440" value="${n(w.duration)}"></div></div><div class="field"><label>${esc(tr('trainingUi.gym'))}</label><input id="ewGymName" list="ewGymOptions" value="${esc(workoutGymName(w))}" placeholder="${esc(tr('recordsUi.gymPlaceholder'))}"><datalist id="ewGymOptions">${data.gyms.map(g=>`<option value="${esc(g.name)}"></option>`).join('')}</datalist><div class="hint">${esc(tr('recordsUi.gymHint'))}</div></div><div class="inline-check"><input id="ewDeload" type="checkbox" ${w.deload?'checked':''}><label for="ewDeload">Deload</label></div><div class="field" style="margin-top:9px"><label>${esc(tr('recordsUi.notes'))}</label><textarea id="ewNotes">${esc(w.notes||'')}</textarea></div></div>
 <div>${w.exercises.map(e=>`<div class="record"><b>${esc(e.nameSnapshot)}</b><div class="small">${esc(displayMuscle(e.muscle))} · ${esc(lastExerciseSummary(e))}</div></div>`).join('')}</div>
 <div class="actions"><button class="btn primary" id="ewFullEdit">${esc(tr('recordsUi.fullEdit'))}</button><button class="btn ghost" id="ewSave">${esc(tr('recordsUi.saveBasic'))}</button><button class="btn ghost" id="ewCopy">${esc(tr('recordsUi.copyToday'))}</button><button class="btn danger" id="ewDelete">${esc(tr('recordsUi.moveTrash'))}</button></div>`,()=>{
   $('#ewFullEdit').onclick=()=>beginHistoryEdit(id);
   $('#ewSave').onclick=()=>{snapshot(tr('reasons.beforeBasicHistoryEdit'));w.name=$('#ewName').value.trim()||w.name;w.date=$('#ewDate').value;w.duration=clamp($('#ewDuration').value,0,1440);const gym=ensureGymByName($('#ewGymName').value);w.gymId=gym?.id||'';w.gymNameSnapshot=gym?.name||'';w.deload=$('#ewDeload').checked;w.notes=$('#ewNotes').value;save(tr('reasons.editRecord'),false);closeModal();toast(tr('feedback.recordSaved'))};
   $('#ewCopy').onclick=()=>{if(data.activeWorkout&&!confirm(tr('dialogs.overwriteActive')))return;data.activeWorkout=JSON.parse(JSON.stringify(w));data.activeWorkout.id=uid('w');data.activeWorkout.date=isoToday();data.activeWorkout.status='active';data.activeWorkout.startedAt=new Date().toISOString();data.activeWorkout.endedAt='';data.activeWorkout.exercises.forEach(e=>e.sets.forEach(s=>s.completed=false));save(tr('reasons.copyWorkout'),true);closeModal();goPage('trainPage')};
   $('#ewDelete').onclick=()=>{data.trash.unshift({id:uid('trash'),deletedAt:new Date().toISOString(),item:JSON.parse(JSON.stringify(w))});data.workouts=data.workouts.filter(x=>x.id!==w.id);save(tr('reasons.deleteRecord'),true);closeModal();toast(tr('feedback.recordTrashed'))}
 })
}
function manualEntry(){
 if(data.activeWorkout&&!confirm(tr('dialogs.replaceForManual')))return;
 openModal(tr('modal.manualEntry'),`<div class="grid2"><div class="field"><label>${esc(tr('trainingUi.date'))}</label><input type="date" id="meDate" value="${isoToday()}"></div><div class="field"><label>${esc(tr('recordsUi.name'))}</label><input id="meName" value="${esc(tr('dynamic.manualName'))}"></div><div class="field"><label>${esc(tr('dynamic.actualMinutes'))}</label><input type="number" id="meDur" value="60" min="0" max="1440"></div><div class="field"><label>${esc(tr('recordsUi.deload'))}</label><select id="meDeload"><option value="0">${esc(tr('recordsUi.no'))}</option><option value="1">${esc(tr('recordsUi.yes'))}</option></select></div></div><p class="small">${esc(tr('recordsUi.manualHint'))}</p><button class="btn primary" id="meCreate">${esc(tr('dynamic.createManual'))}</button>`,()=>{
   $('#meCreate').onclick=()=>{data.activeWorkout={id:uid('w'),date:$('#meDate').value||isoToday(),name:$('#meName').value.trim()||tr('dynamic.manualName'),duration:clamp($('#meDur').value,0,1440),status:'active',startedAt:new Date().toISOString(),endedAt:'',notes:'',gymId:'',gymNameSnapshot:'',deload:$('#meDeload').value==='1',preStatus:{},pain:'',manual:true,exercises:[]};save(tr('reasons.startManual'),true);closeModal();goPage('trainPage');toast(tr('feedback.manualStarted'))}
 })
}

let analysisRange=['7','30','90','all'].includes(String(data.settings.analysisRange))?String(data.settings.analysisRange):'30';
function selectedAnalysisWorkouts(){
 return analysisRange==='all'?data.workouts:workoutsLastDays(n(analysisRange))
}
function showMuscleStimulusDetail(muscle,workouts){
 const s=stimulusMap(workouts)[muscle]||{direct:0,indirect:0,total:0,sources:{}};
 const rows=Object.values(s.sources).sort((a,b)=>b.total-a.total);
 openModal(tr('finalUi.muscleStimulusDetail',{muscle}),`<div class="card">
   <div class="grid3"><div class="stat"><b>${fmtStim(s.total)}</b><span>${esc(tr("residual.rc8493e92"))}</span></div><div class="stat"><b>${fmtStim(s.direct)}</b><span>${esc(tr("residual.r3c8539f2"))}</span></div><div class="stat"><b>${fmtStim(s.indirect)}</b><span>${esc(tr("residual.r8ab76d45"))}</span></div></div>
   <div class="analysis-note">${esc(tr("residual.r7f5c3e15"))}</div>
 </div>
 <div class="card">${rows.length?rows.map(r=>`<div class="source-row"><div class="record-head"><div><b>${esc(r.name)}</b><div class="record-meta">${r.pattern?esc(patternDisplayName(r.pattern)):''}${r.equipment?` · ${esc(r.equipment)}`:''}</div></div><b>${fmtStim(r.total)}</b></div><div class="tagrow" style="margin-top:6px">${r.direct?`<span class="tag">直接 ${fmtStim(r.direct)}</span>`:''}${r.indirect?`<span class="tag">間接 ${fmtStim(r.indirect)}</span>`:''}</div></div>`).join(''):'<div class="empty">${esc(tr("residual.rc23e28d1"))}</div>'}</div>`);
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
    root.innerHTML=`<div class="empty">${esc(tr('dynamic.periodTrainingEmpty'))}</div>`;return
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
    '<div class="analysis-note">${esc(tr("residual.rd484f477"))}</div>';
}

function renderAnalysisMuscleTargets(ws,days){
  const root=$('#analysisMuscleTargets');if(!root)return;
  const goals=data.settings.weeklyMuscleGoals||{},weeks=analysisRangeWeeks(days,ws),stim=stimulusMap(ws||[]);
  const muscles=MUSCLES.filter(m=>!['有氧','其他'].includes(m));
  if(!ws?.length){
    root.innerHTML=`<div class="empty">${esc(tr('dynamic.muscleTargetEmpty'))}</div>`;return
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
      <div class="topline"><b>${esc(displayMuscle(m))}</b><span>${fmtStim(actual)} / ${goal?fmtStim(goal):'—'} 組／週</span></div>
      ${goal?`<div class="progress"><i style="width:${pct}%"></i></div>`:''}
      <span class="compare-badge ${cls}">${esc(status)}</span>
    </div>`
  }).join('')+
  '<div class="analysis-note">${esc(tr("residual.r8e8d434c"))}</div>';
}

function renderAnalysisMovementGaps(ws,days){
  const root=$('#analysisMovementGaps');if(!root)return;
  const major=['horizontal_push','horizontal_pull','vertical_push','vertical_pull','knee_dominant','hip_extension','knee_flexion','knee_extension'];
  const stats=movementStats(ws||[]),weeks=analysisRangeWeeks(days,ws);
  const rows=major.map(k=>({key:k,sets:n(stats[k]),perWeek:n(stats[k])/weeks}));
  const max=Math.max(0,...rows.map(x=>x.sets));
  if(!max){
    root.innerHTML=`<div class="empty">${esc(tr('dynamic.movementEmpty'))}</div>`;return
  }
  const gaps=rows.filter(x=>x.sets===0||(max>=4&&x.sets<max*.25))
    .sort((a,b)=>a.sets-b.sets).slice(0,4);
  root.innerHTML=`<div class="analysis-pattern-chips">${rows.map(x=>`<span class="tag">${esc(patternDisplayName(x.key))} · ${esc(tr('finalUi.setsPerWeek',{count:fmtStim(x.perWeek)}))}</span>`).join('')}</div>`+
    (gaps.length?`<div class="analysis-gap-list">${gaps.map(x=>`<div class="analysis-gap-item"><b>${esc(patternDisplayName(x.key))}</b><span>${x.sets===0?'本期沒有紀錄':'相對於本期其他主要模式較少'}</span></div>`).join('')}</div>`:'<div class="good" style="margin-top:10px;font-weight:850">${esc(tr("residual.r2803e06c"))}</div>')+
    '<div class="analysis-note">${esc(tr("residual.rd2b26b9d"))}</div>';
}

function renderAnalysisProgressOpportunities(ws){
  const root=$('#analysisProgressOpportunities');if(!root)return;
  const ids=analysisExerciseIds(ws);
  const items=ids.map(id=>{
    const ex=getExercise(id),adv=progressionAdvice(id);
    if(!ex||!adv)return null;
    const view=progressionDisplay(adv),plateau=plateauDetail(id),best=bestSetForExercise(id);
    return {id,ex,adv,view,plateau,best,order:view.priority+(plateau?.state==='slow'&&adv.action!=='increase_load'?.25:0)}
  }).filter(Boolean).sort((a,b)=>a.order-b.order||(b.best?.date||'').localeCompare(a.best?.date||'')).slice(0,5);
  if(!items.length){
    root.innerHTML=`<div class="card empty">${esc(tr('dynamic.nextStepEmpty'))}</div>`;return
  }
  root.innerHTML=`<div class="analysis-opportunity-grid">${items.map(x=>`<div class="card analysis-opportunity">
    <div class="record-head"><div><div class="record-title">${esc(x.ex.name)}</div><div class="record-meta">${x.best?.date?`最近最佳：${esc(x.best.date)} · `:''}${esc(x.view.evidence)}</div></div><span class="pill ${progressionToneClass(x.view)}">${esc(x.view.label)}</span></div>
    <div class="small" style="margin-top:8px;font-weight:800">判斷依據：${esc(x.view.reason)}</div>
    <div class="small" style="margin-top:4px;line-height:1.55">${esc(x.view.text||'維持目前安排並持續紀錄。')}</div>
    ${x.adv.action==='plateau'?`<div class="analysis-note">${x.adv.hardTrend?'最近 3 次趨勢接近平台，而且主觀強度也偏高。':'最近 3 次可比較紀錄的重量、次數與估算強度變化都很小。'}</div>`:x.plateau?.state==='slow'?`<div class="analysis-note">${esc(tr("residual.r32169939"))}</div>`:''}
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
  </div>`).join('')}</div><div class="analysis-note">${esc(tr("residual.r2cce1f14"))}</div>`:
  '<div class="empty">${esc(tr("residual.r76745630"))}</div>';
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
 $('#analysisPeriod').textContent=tr('analysisUi.period',{current:rangeDateLabel(days)})+(days!=='all'?tr('analysisUi.previous',{previous:previousPeriodLabel(days)}):'');
 $$('[data-analysis-range]').forEach(b=>b.classList.toggle('on',b.dataset.analysisRange===analysisRange));

 const effortRecorded=effort.high+effort.mid+effort.low;
 $('#analysisConfidence').innerHTML=`<div class="analysis-confidence"><div class="confidence-main"><span class="confidence-dot ${confidence.level}"></span><div><div class="confidence-title">${tr('analysisUi.confidence',{label:confidence.labelKey?tr(confidence.labelKey):confidence.label})} ${infoButton('analysis_confidence')}</div><div class="confidence-meta">${tr('analysisUi.confidenceMeta',{workouts:confidence.workouts,sets:confidence.formal,effort:effort.total?Math.round(effortRecorded/effort.total*100):0,pattern:Math.round(confidence.patternRate*100)})}</div></div></div></div>`;

 const highlights=buildAnalysisHighlights(ws,prevWs,days,confidence,cons);
 $('#analysisHighlights').innerHTML=highlights.map((h,i)=>`<div class="analysis-highlight ${h.kind||'info'}"><div class="rank">${i+1}</div><div><div class="highlight-title">${esc(h.title)}</div><div class="highlight-desc">${esc(h.desc)}</div>${h.programId?`<button class="btn small ghost" style="margin-top:7px" data-analysis-program="${esc(h.programId)}">${esc(tr('analysisUi.viewProgram'))}</button>`:''}</div></div>`).join('');
 $$('[data-analysis-program]').forEach(b=>b.onclick=()=>showSystemProgramDetail(b.dataset.analysisProgram));

 const cmp=(cur,prev)=>days==='all'?'':compareBadge(cur,prev);
 $('#analysisKpis').innerHTML=`
   <div class="stat"><b>${ws.length}</b><span>${esc(tr('analysisUi.workoutCount'))}</span>${cmp(ws.length,prevWs.length)}</div>
   <div class="stat"><b>${Math.round(totalMinutes)} 分</b><span>${esc(tr('analysisUi.trainingTime'))}</span>${cmp(totalMinutes,prevMinutes)}</div>
   <div class="stat"><b>${formal}</b><span>${esc(tr('analysisUi.formalSets'))} ${infoButton('effective_sets')}</span>${cmp(formal,prevFormal)}</div>
   <div class="stat"><b>${fmtKg(volume)}</b><span>${esc(tr('analysisUi.volume'))}</span>${cmp(volume,prevVolume)}</div>
   <div class="stat"><b>${cardio} 分</b><span>${esc(tr('analysisUi.cardioTime'))}</span>${cmp(cardio,prevCardio)}</div>`;

 const fourWeek=stimulusMap(workoutsLastDays(28));
 const muscles=MUSCLES.filter(m=>!['有氧','其他'].includes(m));
 const maxStim=Math.max(1,...muscles.map(m=>n(stim[m]?.total)));
 $('#muscleAnalysis').innerHTML=muscles.map(m=>{
   const x=stim[m]||{direct:0,indirect:0,total:0},px=prevStim[m]||{total:0};
   const avg=n(fourWeek[m]?.total)/4;
   return `<div class="stim-row">
     <div class="stim-main"><div><div class="stim-name">${esc(displayMuscle(m))}</div><button class="stim-detail-btn" type="button" data-muscle-stim="${esc(m)}">${esc(tr('analysisUi.viewSource'))}</button></div><div class="stim-total">${tr('analysisUi.sets',{count:fmtStim(x.total)})}</div></div>
     <div class="stim-meta"><span class="tag stim-direct">${tr('analysisUi.direct',{count:fmtStim(x.direct)})}</span><span class="tag stim-indirect">${tr('analysisUi.indirect',{count:fmtStim(x.indirect)})}</span><span class="tag">${tr('analysisUi.fourWeekAvg',{count:fmtStim(avg)})}</span>${days!=='all'?compareBadge(x.total,px.total):''}</div>
     <div class="progress"><i style="width:${Math.min(100,n(x.total)/maxStim*100)}%"></i></div>
   </div>`
 }).join('')+`<div class="analysis-note">${esc(tr('analysisUi.stimulusNote'))}</div>`;
 $$('[data-muscle-stim]').forEach(b=>b.onclick=()=>showMuscleStimulusDetail(b.dataset.muscleStim,ws));

 const recorded=effort.high+effort.mid+effort.low;
 const pct=v=>recorded?Math.round(v/recorded*100):0;
 $('#effortAnalysis').innerHTML=recorded?`
   <div class="effort-grid">
     <div class="effort-box"><b>${effort.high}</b><span>${esc(tr('analysisUi.nearFailure'))}<br>${pct(effort.high)}%</span></div>
     <div class="effort-box"><b>${effort.mid}</b><span>${esc(tr('analysisUi.midHigh'))}<br>${pct(effort.mid)}%</span></div>
     <div class="effort-box"><b>${effort.low}</b><span>${esc(tr('analysisUi.moreReserve'))}<br>${pct(effort.low)}%</span></div>
   </div>
   <div class="analysis-note">${esc(tr('analysisUi.effortNote'))}${effort.missing?tr('analysisUi.missingEffort',{count:effort.missing}):''}</div>`:
   `<div class="empty">${esc(tr('dynamic.noRirRpe'))}</div>`;

 $('#pplAnalysis').innerHTML=Object.keys(moves).length?movementMatrixHtml(moves):`<div class="empty">${esc(tr('dynamic.noMovement'))}</div>`;

 $('#consistencyAnalysis').innerHTML=ws.length?`
   <div class="consistency-grid">
     <div class="stat"><b>${cons.days}</b><span>${esc(tr('dynamic.trainingDays'))}</span></div>
     <div class="stat"><b>${cons.avgPerWeek.toFixed(1)}</b><span>${esc(tr('dynamic.avgPerWeek'))}</span></div>
     <div class="stat"><b>${cons.weeks} / ${cons.totalWeeks}</b><span>${esc(tr('dynamic.trainingWeeks'))}</span></div>
     <div class="stat"><b>${cons.longestGap ?? '—'} 天</b><span>${esc(tr('dynamic.longestGap'))}</span></div>
   </div>
   <div class="analysis-note">${esc(tr('analysisUi.consistencyNote'))}</div>`:
   `<div class="empty">${esc(tr('analysisUi.noTraining'))}</div>`;

 const performed=analysisPerformedExercises();
 renderAnalysisExerciseBrowser(performed)
}
let analysisExerciseBrowserQuery='';
let analysisExerciseBrowserMuscle='';
let analysisExerciseBrowserExpanded=false;

function analysisPerformedExercises(){
 const performedMap=new Map();
 data.workouts.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach(w=>{
   (w.exercises||[]).forEach(e=>{
     if(!e.exerciseId||performedMap.has(e.exerciseId))return;
     const lib=getExercise(e.exerciseId)||{};
     const equipmentId=e.equipmentId||lib.equipmentId||'';
     const sysEq=SYSTEM_EQUIPMENT.find(x=>x.id===equipmentId);
     const myEq=data.equipment.find(x=>x.id===equipmentId);
     const equipmentName=sysEq?.nameZh||myEq?.name||'';
     performedMap.set(e.exerciseId,{id:e.exerciseId,name:e.nameSnapshot||lib.name||tr('dynamic.performedExerciseFallback'),muscle:e.muscle||lib.muscle||'其他',equipmentName,lastDate:w.date});
   })
 });
 const attentionWeight={reduce_load:50,plateau:40,increase_load:30,add_reps:20,increase_time:20};
 return [...performedMap.values()].sort((a,b)=>b.lastDate.localeCompare(a.lastDate)||a.name.localeCompare(b.name,'zh-Hant')).map(item=>{
   const sessions=exerciseSessionMetrics(item.id),last=sessions.at(-1);
   const adv=progressionAdvice(item.id),view=progressionDisplay(adv);
   return {...item,lastSummary:last?.label||'',action:adv?.action||'',statusLabel:view?.label||'',statusTone:view?.tone||'',statusReason:view?.reason||'',attentionPriority:(attentionWeight[adv?.action]||0)+(Number(view?.priority)||0)/10}
 })
}

function analysisExerciseStatusClass(item){return item?.statusTone==='good'?'good':item?.statusTone==='warn'?'warn':item?.statusTone==='accent'?'accent':''}

function analysisExerciseBrowserCard(item,compact=false){
 const selected=$('#analysisExercise')?.value===item.id;
 const status=item.statusLabel?`<span class="exercise-card-status ${analysisExerciseStatusClass(item)}">${esc(item.statusLabel)}</span>`:'';
 if(compact)return `<button type="button" class="exercise-recent-card ${selected?'on':''}" data-analysis-exercise-id="${item.id}"><span class="exercise-card-name">${esc(item.name)}</span><span class="exercise-card-meta">${esc(displayMuscle(item.muscle))}${item.lastSummary?` · ${esc(item.lastSummary)}`:''}</span>${status}</button>`;
 return `<button type="button" class="exercise-progress-card ${selected?'on':''}" data-analysis-exercise-id="${item.id}"><span class="exercise-progress-main"><span class="exercise-card-name">${esc(item.name)}</span><span class="exercise-card-meta">${esc(displayMuscle(item.muscle))}${item.equipmentName?` · ${esc(item.equipmentName)}`:''}<br>${tr('analysisUi.recentPrefix')}${fmtDate(item.lastDate)}${item.lastSummary?` · ${esc(item.lastSummary)}`:''}</span></span><span class="exercise-progress-side">${status}</span>${item.statusReason?`<span class="exercise-progress-reason">${esc(item.statusReason)}</span>`:''}</button>`
}

function renderAnalysisExerciseBrowser(items=analysisPerformedExercises()){
 const search=$('#analysisExerciseSearch'),recent=$('#analysisExerciseRecent'),muscles=$('#analysisExerciseMuscles'),attention=$('#analysisExerciseAttention'),list=$('#analysisExerciseList'),count=$('#analysisExerciseCount'),sel=$('#analysisExercise');
 if(!search||!recent||!muscles||!attention||!list||!sel)return;
 const previous=sel.value;
 sel.innerHTML='<option value=""></option>'+items.map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join('');
 sel.value=items.some(item=>item.id===previous)?previous:(items[0]?.id||'');
 search.value=analysisExerciseBrowserQuery;
 const view=exerciseProgressBrowser.buildViewModel(items,{query:analysisExerciseBrowserQuery,muscle:analysisExerciseBrowserMuscle,recentLimit:6,attentionLimit:4,listLimit:6,showAll:analysisExerciseBrowserExpanded});
 recent.innerHTML=view.recent.length?view.recent.map(item=>analysisExerciseBrowserCard(item,true)).join(''):`<div class="exercise-browser-empty" style="grid-column:1/-1">${esc(tr('dynamic.noExerciseHistory'))}</div>`;
 muscles.innerHTML=[`<button type="button" class="${analysisExerciseBrowserMuscle?'':'on'}" data-analysis-muscle="">${esc(tr('dynamic.pickerAll'))}</button>`,...view.muscles.map(m=>`<button type="button" class="${analysisExerciseBrowserMuscle===m?'on':''}" data-analysis-muscle="${esc(m)}">${esc(displayMuscle(m))}</button>`)].join('');
 attention.innerHTML=view.attention.length?view.attention.map(item=>analysisExerciseBrowserCard(item)).join(''):`<div class="exercise-browser-empty">${esc(tr('dynamic.noAttention'))}</div>`;
 list.innerHTML=view.filtered.length?view.visible.map(item=>analysisExerciseBrowserCard(item)).join('')+(view.hiddenCount?`<div class="actions" style="justify-content:center;margin-top:9px"><button type="button" class="btn small ghost" data-analysis-show-more>${tr('analysisUi.showMore',{count:view.hiddenCount})}</button></div>`:''):`<div class="exercise-browser-empty">${esc(tr('analysisUi.noFilteredExercise'))}</div>`;
 if(count)count.textContent=view.hiddenCount?tr('analysisUi.showing',{visible:view.visible.length,total:view.filtered.length}):`${view.filtered.length} / ${items.length}`;
 search.oninput=()=>{analysisExerciseBrowserQuery=search.value;analysisExerciseBrowserExpanded=false;renderAnalysisExerciseBrowser(items)};
 $$('[data-analysis-muscle]').forEach(button=>button.onclick=()=>{analysisExerciseBrowserMuscle=button.dataset.analysisMuscle||'';analysisExerciseBrowserExpanded=false;renderAnalysisExerciseBrowser(items)});
 const showMore=$('[data-analysis-show-more]');if(showMore)showMore.onclick=()=>{analysisExerciseBrowserExpanded=true;renderAnalysisExerciseBrowser(items)};
 $$('[data-analysis-exercise-id]').forEach(button=>button.onclick=()=>{sel.value=button.dataset.analysisExerciseId;renderAnalysisExerciseBrowser(items);requestAnimationFrame(()=>$('#exerciseAnalysis')?.scrollIntoView({behavior:'smooth',block:'start'}))});
 renderExerciseAnalysis(sel.value)
}

function renderExerciseAnalysis(id){
 const box=$('#exerciseAnalysis');
 if(!id){box.innerHTML=`<div class="empty">${esc(tr('dynamic.selectExercise'))}</div>`;return}
 const lib=getExercise(id),sessions=exerciseSessionMetrics(id),histEx=data.workouts.flatMap(w=>w.exercises||[]).find(e=>e.exerciseId===id),name=lib?.name||histEx?.nameSnapshot||tr('dynamic.performedExerciseFallback');
 if(!sessions.length){box.innerHTML=`<div class="empty">${esc(tr('dynamic.noAnalyzable'))}</div>`;return}
 const type=sessions.at(-1).type,over=overloadSummary(id),plat=plateauDetail(id),last=sessions.at(-1),prev=sessions.at(-2);
 const lastSignals=prev?progressSignals(prev,last):[];
 let pts=[],summary='',history='';
 if(type==='cardio'){
   pts=sessions.map(s=>({date:s.date,v:s.distance||s.minutes,label:s.label}));
   const maxMin=Math.max(...sessions.map(s=>s.minutes)),maxDist=Math.max(...sessions.map(s=>s.distance));
   summary=`<div class="progress-summary"><div class="progress-card"><b>${maxMin} 分</b><span>${esc(tr('analysisUi.bestDuration'))}</span></div><div class="progress-card"><b>${fmtStim(maxDist)} km</b><span>${esc(tr('analysisUi.bestDistance'))}</span></div></div>`;
   history=sessions.slice(-6).reverse().map(s=>`<div class="progress-session"><div class="progress-session-date">${fmtDate(s.date)}</div><div class="progress-session-main">${esc(s.label)}${s.speed?` · ${fmtStim(s.speed)} km/h`:''}</div></div>`).join('')
 }else if(type==='duration'){
   pts=sessions.map(s=>({date:s.date,v:s.bestSeconds,label:tr('finalUi.durationSeconds',{seconds:s.bestSeconds})}));
   const bestSec=Math.max(...sessions.map(s=>s.bestSeconds)),bestTotal=Math.max(...sessions.map(s=>s.totalSeconds));
   summary=`<div class="progress-summary"><div class="progress-card"><b>${bestSec} 秒</b><span>${esc(tr('analysisUi.bestSetTime'))}</span></div><div class="progress-card"><b>${bestTotal} 秒</b><span>${esc(tr('analysisUi.bestTotalTime'))}</span></div></div>`;
   history=sessions.slice(-6).reverse().map(s=>`<div class="progress-session"><div class="progress-session-date">${fmtDate(s.date)}</div><div class="progress-session-main">最佳 ${s.bestSeconds} 秒 · 總計 ${s.totalSeconds} 秒</div></div>`).join('')
 }else{
   pts=sessions.map(s=>({date:s.date,v:s.bestE1rm||s.maxWeight,label:s.label}));
   const best=bestSetForExercise(id),maxWeight=Math.max(...sessions.map(s=>s.maxWeight)),maxReps=Math.max(...sessions.map(s=>s.maxReps)),maxSessionVolume=Math.max(...sessions.map(s=>s.volume));
   const latestRir=last.rir!=null?last.rir.toFixed(1):'—',latestRpe=last.rpe!=null?last.rpe.toFixed(1):'—';
   summary=`<div class="progress-summary">
     <div class="progress-card"><b>${best?`${fmtWeight(best.weight)} × ${best.reps}`:'—'}</b><span>${esc(tr('analysisUi.historyBestSet'))}</span></div>
     <div class="progress-card"><b>${data.settings.show1RM&&best?fmtWeight(best.score||0):'—'}</b><span>${esc(tr('analysisUi.estimated1rm'))}</span></div>
     <div class="progress-card"><b>${fmtWeight(maxWeight)}</b><span>${esc(tr('analysisUi.maxWeight'))}</span></div>
     <div class="progress-card"><b>${maxReps}</b><span>${esc(tr('analysisUi.maxReps'))}</span></div>
     <div class="progress-card"><b>${fmtKg(maxSessionVolume)}</b><span>${esc(tr('analysisUi.maxVolume'))}</span></div>
     <div class="progress-card"><b>${data.settings.intensity==='RIR'?latestRir:latestRpe}</b><span>${tr('analysisUi.recentAverage',{kind:data.settings.intensity})}</span></div>
   </div>`;
   history=sessions.slice(-6).reverse().map(s=>`<div class="progress-session"><div class="progress-session-date">${fmtDate(s.date)}</div><div class="progress-session-main"><b>${esc(s.label)}</b>${s.bestE1rm?` · 估算一次最大重量約 ${fmtWeight(s.bestE1rm)}`:''}${s.rir!=null?` · RIR ${s.rir.toFixed(1)}`:''}${s.rpe!=null?` · RPE ${s.rpe.toFixed(1)}`:''} · ${s.sets||0} 組</div></div>`).join('')
 }
 const overloadText=over.transitions?`最近 ${over.transitions+1} 次中，有 ${over.count} 次相較前一次出現進步訊號。`:'至少需要兩次紀錄才能比較。';
 const platBox=plat.state==='slow'?`<div class="warnbox" style="margin-top:9px"><b>${esc(tr('analysisUi.progressSlow'))} ${infoButton('plateau_detection')}</b><div class="small" style="margin-top:4px">${esc(localizedMessage(plat))}</div></div>`:
   plat.state==='progress'?`<div class="goodbox" style="margin-top:9px"><b>${esc(tr('analysisUi.progressing'))}</b><div class="small" style="margin-top:4px">${esc(plat.text)}</div></div>`:'';
 box.innerHTML=`<div class="record-title">${esc(name)}</div>
   ${summary}
   <div class="section" style="margin-top:12px">${esc(tr('dynamic.recentVsPrevious'))}</div>
   ${prev?`<div class="signal-list">${lastSignals.length?lastSignals.map(s=>`<span class="signal good">✓ ${esc(localizedMessage(s))}</span>`).join(''):`<span class="signal">${esc(tr('dynamic.noProgressSignal'))}</span>`}</div>`:`<div class="analysis-note">${esc(tr('dynamic.onlyOneRecord'))}</div>`}
   <div class="analysis-note">${esc(overloadText)} ${infoButton('progressive_overload_detection')}</div>
   ${platBox}
   ${sparkline(pts)}
   <div class="section">${esc(tr('dynamic.recentRecords'))}</div><div class="progress-session-list">${history}</div>`
}
function sparkline(pts){
 if(!pts.length)return'<div class="empty">${esc(tr("residual.r97a2dbc7"))}</div>';const arr=pts.slice(-12),vals=arr.map(p=>p.v),min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;const points=arr.map((p,i)=>`${10+i*(280/Math.max(1,arr.length-1))},${105-(p.v-min)/range*85}`).join(' ');return `<svg class="spark" viewBox="0 0 300 120" role="img" aria-label="${esc(tr("residual.re9d8257e"))}"><line x1="10" y1="105" x2="290" y2="105" stroke="#40515c"/><polyline fill="none" stroke="#69c4ff" stroke-width="3" points="${points}"/>${arr.map((p,i)=>`<circle cx="${10+i*(280/Math.max(1,arr.length-1))}" cy="${105-(p.v-min)/range*85}" r="4" fill="#f4f7f8"/>`).join('')}</svg>`
}


function infoButton(id,label='i'){return GLOSSARY[id]?`<button class="info-btn" type="button" data-info="${esc(id)}" aria-label="${esc(tr("finalUi.infoAria",{name:GLOSSARY[id].zh}))}">${label}</button>`:''}
function openGlossary(id){
 const g=GLOSSARY[id];if(!g)return;
 openModal(`${g.zh}｜${g.en}`,`<div class="card bilingual"><b>${esc(g.short)}</b><div style="margin-top:10px">${esc(g.detail)}</div>${g.example?`<div class="en-copy"><b>${esc(tr("residual.r5ac84af9"))}</b><div>${esc(g.example)}</div></div>`:''}</div>`);
}
function youtubeSearch(q){
 if(!q)return;const url='https://www.youtube.com/results?search_query='+encodeURIComponent(q);window.open(url,'_blank','noopener,noreferrer');
}
function systemProgramCardHtml(p){
 const progInfo=p.progression==='double_progression'?`${esc('雙進階法')} ${infoButton('double_progression')}`:p.progression==='deload'?`${esc('Deload')} ${infoButton('deload')}`:`${esc('漸進超負荷')} ${infoButton('progressive_overload')}`;
 return `<div class="sys-card"><div class="record-head"><div><div class="sys-title">${esc(p.nameZh)}</div><div class="sys-en">${esc(p.nameEn)}</div></div><span class="source-pill">SYSTEM</span></div>
 <div class="tagrow" style="margin-top:8px"><span class="tag">${esc(p.category)}</span><span class="tag">${esc(p.level)}</span><span class="tag">${esc(tr('finalUi.daysPerWeek',{count:p.daysPerWeek}))}</span><span class="tag">約 ${esc(tr('finalUi.minutes',{count:p.duration}))}</span><span class="tag">${esc(p.equipmentMode)}</span><span class="tag">目的：${esc(p.goal)}</span></div>
 <div class="sys-desc">${esc(p.descZh)}</div>${p.postureSupport?`<div class="small" style="margin-top:7px;color:var(--accent2)">體態舒緩／平衡補強 ${infoButton('posture_support')}</div>`:''}<div class="small" style="margin-top:7px">${progInfo} · RIR ${esc(p.rir)} ${infoButton('rir')}</div>
 <div class="actions" style="margin-top:10px"><button class="btn small primary" data-program-detail="${esc(p.id)}">${esc(tr("residual.r9caf61f6"))}</button><button class="btn small ghost" data-program-import="${esc(p.id)}">${esc(tr("residual.r08c92473"))}</button></div></div>`;
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
   <details class="program-day-why"><summary>${esc(tr("residual.ra0a7cbfe"))}</summary><div class="why-body">${esc(m.why||'')} ${m.coachNote?`<div style="margin-top:6px"><b>${esc(tr("residual.r06749c0c"))}</b>${esc(m.coachNote)}</div>`:''}</div></details>
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
 const days=(p.workouts||[]).map((w,i)=>`<div class="program-day">${programDayFocusHtml(w)}<ul>${(w.items||[]).map(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);if(!ex)return'';const sets=n(it.targetSets)||n(ex.targetSets)||3,lo=it.repMin??ex.repMin,hi=it.repMax??ex.repMax;return `<li><b>${esc(ex.name)}</b> <span class="muted">${esc(ex.nameEn||'')}</span><br>${programPrescription(ex,it,p)}</li>`}).join('')}</ul><div class="actions" style="margin-top:8px"><button class="btn small good" data-start-program-day="${esc(p.id)},${i}">${esc(tr('finalUi.startProgramDay',{name:w.nameZh}))}</button></div></div>`).join('');
 const progId=p.progression==='double_progression'?'double_progression':p.progression==='deload'?'deload':'progressive_overload';
 openModal(p.nameZh,`<div class="card"><div class="sys-en">${esc(p.nameEn)}</div><div class="tagrow" style="margin-top:9px"><span class="tag">${esc(p.level)}</span><span class="tag">${esc(tr('finalUi.daysPerWeek',{count:p.daysPerWeek}))}</span><span class="tag">${esc(tr('finalUi.minutes',{count:p.duration}))}</span><span class="tag">${esc(p.goal)}</span><span class="tag">${esc(p.equipmentMode)}</span></div><div class="sys-desc">${esc(p.descZh)}</div><div class="sys-desc">${esc(p.descEn)}</div>${p.postureSupport?`<div class="warnbox" style="margin-top:10px"><b>${esc(tr('finalUi.supportUse'))} ${infoButton('posture_support')}</b><div class="small" style="margin-top:4px">${esc(p.supportNote||tr('finalUi.supportFallback'))}</div></div>`:''}<div class="hr"></div><div class="small"><b>${esc(tr("residual.r28102a2d"))}</b>${esc(GLOSSARY[progId]?.zh||p.progression)} ${infoButton(progId)}　<b>${esc(tr("residual.rc1960c98"))}</b>${esc(p.rir)} ${infoButton('rir')}</div><div class="small" style="margin-top:7px"><b>${esc(tr("residual.r63314331"))}</b>${esc(programSetSummary(p))}</div></div>
 <div class="program-days">${days}</div><div class="actions" style="margin-top:12px"><button class="btn primary" id="programSetPlan">設為目前 ${esc(tr('finalUi.weekCount',{count:n(data.settings.blockWeeks)||6}))}計畫</button><button class="btn ghost" id="programImportNow">${esc(tr("residual.r08c92473"))}</button><button class="btn good" id="programStartNow">${esc(tr("residual.r68a96e5e"))}</button></div>`,()=>{
   $('#programSetPlan').onclick=()=>{closeModal();adoptCurrentPlan(id,'program_detail')};
   $('#programImportNow').onclick=()=>importSystemProgram(id,true);
   $('#programStartNow').onclick=()=>startSystemProgramDay(id,0);
   $$('[data-start-program-day]').forEach(b=>b.onclick=()=>{const [pid,di]=b.dataset.startProgramDay.split(',');startSystemProgramDay(pid,n(di))});
 });
}
function importSystemProgram(id,keepModal=false){
 const p=SYSTEM_PROGRAMS.find(x=>x.id===id);if(!p)return;
 const existing=data.templates.filter(t=>t.sourceProgramId===id);
 if(existing.length&&!confirm(tr('dialogs.duplicateProgram',{name:p.nameZh,count:existing.length})))return;
 const stamp=Date.now().toString(36);
 p.workouts.forEach((w,i)=>{
   data.templates.push({id:`tpl_${p.id}_${stamp}_${i}`,name:`${p.nameZh}｜${w.nameZh}`,nameEn:`${p.nameEn} | ${w.nameEn}`,sourceProgramId:p.id,sourceVersion:p.version,dayMeta:JSON.parse(JSON.stringify(w.dayMeta||{})),items:JSON.parse(JSON.stringify(w.items))});
 });
 save(tr('reasons.importSystemProgram'),true);toast(tr('feedback.systemProgramAdded',{count:p.workouts.length}));
 if(keepModal)closeModal();
}
function startSystemProgramDay(id,dayIndex=0){
 if(data.activeWorkout&&!confirm(tr('dialogs.replaceForSystemProgram')))return;
 const p=SYSTEM_PROGRAMS.find(x=>x.id===id),w=p?.workouts?.[dayIndex];if(!p||!w)return;
 data.activeWorkout={id:uid('w'),date:isoToday(),name:`${p.nameZh}｜${w.nameZh}`,duration:0,status:'active',startedAt:new Date().toISOString(),endedAt:'',notes:tr('finalUi.systemProgramNote',{name:p.nameZh}),programDayMeta:JSON.parse(JSON.stringify(w.dayMeta||{})),gymId:'',gymNameSnapshot:'',deload:p.progression==='deload',preStatus:{},pain:'',exercises:w.items.map(it=>{const ex=getExercise(it.exerciseId)||SYSTEM_EXERCISES.find(x=>x.id===it.exerciseId);return ex?makeSessionExercise({...ex,...it},isoToday()):null}).filter(Boolean)};
 closeModal();save(tr('reasons.startSystemProgram'),true);goPage('trainPage');
}
let programDisplayLimit=18;
function renderSystemPrograms(){
 const box=$('#systemProgramList');if(!box)return;
 const q=($('#programSearch')?.value||'').trim().toLowerCase(),cat=$('#programCategory')?.value||'',days=$('#programDays')?.value||'',level=$('#programLevel')?.value||'',dur=n($('#programDuration')?.value),eq=$('#programEquip')?.value||'',goal=$('#programGoal')?.value||'';
 const items=SYSTEM_PROGRAMS.filter(p=>{
   const text=(p.nameZh+' '+p.nameEn+' '+p.category+' '+p.goal+' '+p.descZh+' '+(p.tags||[]).join(' ')).toLowerCase();
   return(!q||text.includes(q))&&(!cat||p.category===cat)&&(!days||String(p.daysPerWeek)===days)&&(!level||p.level===level)&&(!dur||p.duration<=dur)&&(!eq||p.equipmentMode===eq)&&(!goal||programGoalFit(p,goal)>=25);
 });
 $('#programCount').textContent=tr('finalUi.programCount',{visible:items.length,total:SYSTEM_PROGRAMS.length});
 const shown=items.slice(0,programDisplayLimit);box.innerHTML=shown.length?shown.map(systemProgramCardHtml).join(''):'<div class="card empty">${esc(tr("residual.rb428b5cd"))}</div>';
 if(items.length>shown.length)box.innerHTML+=`<button class="btn ghost" id="programMore" style="width:100%">${esc(tr('finalUi.moreRemaining',{count:items.length-shown.length}))}</button>`;
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
 return `<div class="eq-card"><div class="record-head"><div><div class="eq-name">${esc(e.nameZh)}</div><div class="eq-en">${esc(e.nameEn)}</div></div><span class="source-pill">SYSTEM</span></div><div class="tagrow" style="margin-top:7px"><span class="tag">${esc(e.category)}</span><span class="tag">${esc(resistanceLabel(e.resistance))} ${gi?infoButton(gi):''}</span><span class="tag">${esc(e.primary)}</span>${brands.length?`<span class="tag">${brands.length} 品牌支援</span>`:''}${mapped?`<span class="tag">${mapped} 型號對應</span>`:''}</div><div class="eq-desc">${esc(e.descZh)}</div><div class="actions" style="margin-top:9px"><button class="btn small primary" data-eq-detail="${esc(e.id)}">${esc(tr("residual.re08de36e"))}</button><button class="btn small ghost" data-eq-yt="${esc(e.id)}">▶ YouTube</button><button class="btn small ghost" data-eq-add="${esc(e.id)}">${esc(tr("residual.r90bb911b"))}</button></div></div>`;
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
 const compat=supportedBrandsForEquipment(e),brandHtml=`<div class="hr"></div><b>${esc(tr("residual.r0551e82b"))}</b><div class="tagrow" style="margin-top:7px">${compat.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>${(e.brandModels||[]).length?`<div class="small" style="margin-top:8px">${esc(tr("residual.r383bdbd4"))}</div><div class="tagrow" style="margin-top:6px">${e.brandModels.map(x=>`<span class="tag">${esc(x.brand)} · ${esc(x.series)} · ${esc(x.model)} · ${esc(x.name)}</span>`).join('')}</div>`:''}<div class="small" style="margin-top:8px;line-height:1.5">${esc(tr("residual.r24ceac7d"))}</div>`;
 openModal(e.nameZh,`<div class="card bilingual"><div class="sys-en">${esc(e.nameEn)}</div><div class="tagrow" style="margin-top:9px"><span class="tag">${esc(e.category)}</span><span class="tag">${esc(resistanceLabel(e.resistance))} ${gi?infoButton(gi):''}</span><span class="tag">${esc(e.primary)}</span>${pi?`<span class="tag">${esc(GLOSSARY[pi]?.zh||e.pattern)} ${infoButton(pi)}</span>`:''}</div>${equipmentMotion}<div style="margin-top:12px"><b>${esc(tr("residual.rcdef0b51"))}</b><div>${esc(e.descZh)}</div>${e.setupZh?`<div style="margin-top:9px"><b>${esc(tr("residual.r6c0aadff"))}</b><div>${esc(e.setupZh)}</div></div>`:''}${e.mistakesZh?`<div style="margin-top:9px"><b>${esc(tr("residual.r55abeaaf"))}</b><div>${esc(e.mistakesZh)}</div></div>`:''}${brandHtml}</div><div class="en-copy"><b>English Description</b><div>${esc(e.descEn)}</div></div></div><div class="actions"><button class="btn primary" id="eqYtZh">${esc(tr("residual.r9fe64d55"))}</button><button class="btn ghost" id="eqYtEn">${esc(tr('finalUi.englishTutorial'))}</button><button class="btn ghost" id="eqAddMine">${esc(tr("residual.rf55882eb"))}</button></div>`,()=>{
   $('#eqYtZh').onclick=()=>youtubeSearch(e.youtubeZh);$('#eqYtEn').onclick=()=>youtubeSearch(e.youtubeEn);$('#eqAddMine').onclick=()=>addSystemEquipmentToMine(id);
 });
}
function addSystemEquipmentToMine(id){
 const e=SYSTEM_EQUIPMENT.find(x=>x.id===id);if(!e)return;
 const brands=supportedBrandsForEquipment(e),models=e.brandModels||[];
 openModal(tr('modal.addMyEquipment'),`<div class="card">
   <div class="record-title">${esc(e.nameZh)}</div><div class="small">${esc(e.nameEn)}</div>
   <div class="field" style="margin-top:12px"><label>${esc(tr("residual.r89f4b900"))}</label><select id="mineEqBrand"><option value="">${esc(tr("residual.r6a86e0bc"))}</option>${brands.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')}</select></div>
   <div class="field"><label>${esc(tr("residual.r3e8ae372"))}</label><input id="mineEqModel" list="mineEqModelList" placeholder="${esc(tr("residual.rdb963856"))}"><datalist id="mineEqModelList">${models.map(x=>`<option value="${esc(x.model==='—'?x.name:x.model)}">${esc(x.series+' · '+x.name)}</option>`).join('')}</datalist><div class="hint">${esc(tr("residual.re8ecbf5b"))}</div></div>
   <div class="field"><label>${esc(tr("residual.r8e6698e2"))}</label><input id="mineEqName" placeholder="${esc(e.nameZh)}"></div>
   <button class="btn primary" id="mineEqSave">${esc(tr("residual.rf55882eb"))}</button>
 </div>`,()=>{
   const brandSel=$('#mineEqBrand'),modelInput=$('#mineEqModel');
   brandSel.onchange=()=>{
     const ms=brandModelsFor(e,brandSel.value);
     $('#mineEqModelList').innerHTML=ms.map(x=>`<option value="${esc(x.model==='—'?x.name:x.model)}">${esc(x.series+' · '+x.name)}</option>`).join('')
   };
   $('#mineEqSave').onclick=()=>{
     const brand=brandSel.value,model=modelInput.value.trim(),custom=$('#mineEqName').value.trim();
     const same=data.equipment.some(x=>x.systemEquipmentId===id&&(x.brand||'')===brand&&(x.model||'')===model);
     if(same){toast(tr('feedback.equipmentExists'));return}
     const mapped=models.find(x=>x.brand===brand&&(x.model===model||x.name===model));
     data.equipment.push({id:uid('eq'),name:custom||e.nameZh,nameEn:e.nameEn,systemEquipmentId:id,category:e.category,brand,model,series:mapped?.series||'',modelName:mapped?.name||'',weightUnit:'kg'});
     save(tr('reasons.addMyEquipment'),true);closeModal();toast(tr('feedback.equipmentAdded'))
   }
 })
}
let equipmentDisplayLimit=24;
function renderSystemEquipment(){
 const box=$('#systemEquipmentList');if(!box)return;const q=($('#systemEqSearch')?.value||'').trim().toLowerCase(),cat=$('#systemEqCategory')?.value||'',res=$('#systemEqResistance')?.value||'',brand=$('#systemEqBrand')?.value||'';
 const items=SYSTEM_EQUIPMENT.filter(e=>{const brandText=(e.brandModels||[]).map(x=>`${x.brand} ${x.series} ${x.model} ${x.name}`).join(' '),compat=(e.brandCompat||[]).join(' ');const txt=(e.nameZh+' '+e.nameEn+' '+(e.aliases||[]).join(' ')+' '+e.category+' '+e.primary+' '+e.descZh+' '+brandText+' '+compat).toLowerCase();const brandOk=!brand||supportedBrandsForEquipment(e).includes(brand);return(!q||txt.includes(q))&&(!cat||e.category===cat)&&(!res||e.resistance===res)&&brandOk});
 $('#equipmentCount').textContent=tr('finalUi.equipmentCount',{visible:items.length,total:SYSTEM_EQUIPMENT.length});
 const shown=items.slice(0,equipmentDisplayLimit);box.innerHTML=shown.length?shown.map(systemEquipmentCardHtml).join(''):'<div class="card empty">${esc(tr("residual.rffa4d0bf"))}</div>';
 if(items.length>shown.length)box.innerHTML+=`<button class="btn ghost" id="equipmentMore" style="width:100%">${esc(tr('finalUi.moreRemaining',{count:items.length-shown.length}))}</button>`;
 bindEquipmentCards(box);const more=$('#equipmentMore');if(more)more.onclick=()=>{equipmentDisplayLimit+=24;renderSystemEquipment()};
}
function showExerciseDetail(id){
 const e=getExercise(id);if(!e)return;const eq=SYSTEM_EQUIPMENT.find(x=>x.id===e.equipmentId),pi=PATTERN_INFO[e.pattern]||'',profile=exerciseStimulusProfile({exerciseId:e.id,muscle:e.muscle,type:e.type,equipmentId:e.equipmentId,sets:[{completed:true,kind:'working'}]});
 openModal(e.name,`<div class="card bilingual"><div class="sys-en">${esc(e.nameEn||'')}</div>${window.TrainLogMotion3DHtml?window.TrainLogMotion3DHtml(e.id,e.pattern,e.name,e.nameEn||'',eq?.nameEn||''):''}<div class="tagrow" style="margin-top:8px"><span class="tag">${esc(displayMuscle(e.muscle))}</span><span class="tag">${esc(displayType(e.type))}</span>${pi?`<span class="tag">${esc(GLOSSARY[pi]?.zh||e.pattern)} ${infoButton(pi)}</span>`:''}</div>${profile.length?`<div class="tagrow" style="margin-top:8px">${profile.map(x=>`<span class="tag">${esc(displayMuscle(x.muscle))} × ${fmtStim(x.weight)}</span>`).join('')} ${infoButton('stimulus_sets')}</div>`:''}<div style="margin-top:10px">${esc(e.descZh||e.notes||'')}</div><div class="en-copy">${esc(e.descEn||'')}</div>${eq?`<div class="hr"></div><b>${esc(tr("residual.r70e81c1a"))}</b><div>${esc(eq.nameZh)} <span class="muted">${esc(eq.nameEn)}</span></div>`:''}<div class="hr"></div><div><b>${esc(tr("residual.r054f2cc7"))}</b>${esc(tr('finalUi.exercisePrescription',{sets:e.targetSets,range:`${e.repMin}${e.repMax!==e.repMin?'–'+e.repMax:''}`,rir:`${e.intMin}–${e.intMax}`,rest:e.rest}))} ${infoButton('rir')}</div>${e.notes?`<div style="margin-top:8px"><b>${esc(tr("residual.r8c678e38"))}</b>${esc(e.notes)}</div>`:''}</div><div class="actions"><button class="btn primary" id="exYtZh">${esc(tr("residual.r9fe64d55"))}</button><button class="btn ghost" id="exYtEn">${esc(tr('finalUi.englishTutorial'))}</button>${e.system?`<button class="btn ghost" id="exCopy">${esc(tr("residual.r6751a035"))}</button>`:''}</div>`,()=>{
   $('#exYtZh').onclick=()=>youtubeSearch(e.youtubeZh||`${e.name} 正確姿勢 教學`);$('#exYtEn').onclick=()=>youtubeSearch(e.youtubeEn||`${e.nameEn||e.name} proper form tutorial`);
   const copy=$('#exCopy');if(copy)copy.onclick=()=>copySystemExercise(id);
 });
}
function copySystemExercise(id){
 const e=getExercise(id);if(!e)return;const c=JSON.parse(JSON.stringify(e));c.id=uid('ex');c.system=false;c.name=e.name+tr('finalUi.myCopySuffix');data.exerciseLibrary.push(c);save(tr('reasons.copySystemExercise'),true);closeModal();toast(tr('feedback.exerciseCopied'));
}
function renderGlossaryIndex(){
 const box=$('#glossaryIndex');if(!box)return;const q=($('#glossarySearch')?.value||'').trim().toLowerCase();
 const items=Object.entries(GLOSSARY).filter(([id,g])=>(id+' '+g.zh+' '+g.en+' '+g.short).toLowerCase().includes(q));
 box.innerHTML=items.map(([id,g])=>`<button class="glossary-chip" type="button" data-info="${esc(id)}"><b>${esc(g.zh)}</b><span>${esc(g.en)}</span></button>`).join('');
}
function initSystemLibraryFilters(){
 const pc=$('#programCategory'),pl=$('#programLevel'),ec=$('#systemEqCategory'),er=$('#systemEqResistance');
 if(pc&&!pc.options.length)pc.innerHTML='<option value="">${esc(tr("residual.r932057bd"))}</option>'+[...new Set(SYSTEM_PROGRAMS.map(p=>p.category))].map(x=>`<option>${esc(x)}</option>`).join('');
 if(pl&&!pl.options.length)pl.innerHTML='<option value="">${esc(tr("residual.r524e385d"))}</option>'+[...new Set(SYSTEM_PROGRAMS.map(p=>p.level))].map(x=>`<option>${esc(x)}</option>`).join('');
 if(ec&&!ec.options.length)ec.innerHTML='<option value="">${esc(tr("residual.r932057bd"))}</option>'+[...new Set(SYSTEM_EQUIPMENT.map(e=>e.category))].map(x=>`<option>${esc(x)}</option>`).join('');
 if(er&&!er.options.length)er.innerHTML='<option value="">${esc(tr("residual.r9b735996"))}</option>'+[...new Set(SYSTEM_EQUIPMENT.map(e=>e.resistance))].map(x=>`<option value="${esc(x)}">${esc(resistanceLabel(x))}</option>`).join('');
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
 if(hp)hp.textContent=tr('finalUi.programsTotal',{count:SYSTEM_PROGRAMS.length});
 if(ht)ht.textContent=tr('finalUi.templatesTotal',{count:data.templates.length});
 if(he)he.textContent=tr('finalUi.systemEquipmentTotal',{count:SYSTEM_EQUIPMENT.length});
 if(hx)hx.textContent=tr('finalUi.exerciseTotal',{count:data.exerciseLibrary.length});
 if(hg)hg.textContent=tr('finalUi.gymsTotal',{count:data.gyms.length});
 if(hme)hme.textContent=tr('finalUi.myEquipmentTotal',{count:data.equipment.length});
 $('#templateList').innerHTML=data.templates.length?data.templates.map(t=>`<div class="template-item"><div class="record-head"><div><b>${esc(t.name)}</b> ${t.sourceProgramId?'<span class="source-pill">FROM SYSTEM</span>':''}<div class="record-meta">${tr('drawer.historyExerciseCount',{count:t.items.length})}${t.nameEn?' · '+esc(t.nameEn):''}</div></div><div class="actions"><button class="btn small ghost" data-edit-tpl="${t.id}">${esc(tr("residual.r4642d168"))}</button><button class="btn small danger" data-del-tpl="${t.id}">${esc(tr('gym.delete'))}</button></div></div>${t.dayMeta?.focusSummary?`<div class="small" style="margin-top:7px"><b>${esc(t.dayMeta.dayTitle||tr('finalUi.focusFallback'))}</b> · ${esc(t.dayMeta.focusSummary)}</div>`:''}<div class="tagrow" style="margin-top:8px">${t.items.map(i=>`<span class="tag">${esc(getExercise(i.exerciseId)?.name||tr('finalUi.deletedExercise'))}</span>`).join('')}</div></div>`).join(''):'<div class="card empty">${esc(tr("residual.r1a327ebb"))}</div>';
 $$('[data-edit-tpl]').forEach(b=>b.onclick=()=>editTemplate(b.dataset.editTpl));$$('[data-del-tpl]').forEach(b=>b.onclick=()=>{if(confirm(tr('dialogs.deleteTemplate'))){data.templates=data.templates.filter(t=>t.id!==b.dataset.delTpl);save(tr('reasons.deleteTemplate'),true)}});
 renderLibrary();
 renderGymSettings();
 $('#equipmentList').innerHTML=data.equipment.length?data.equipment.map(e=>`<div class="snapshot-item"><div class="snapshot-copy"><div class="snapshot-time">${esc(e.name)}</div><div class="snapshot-reason">${e.brand?esc(e.brand):esc(tr('finalUi.unspecifiedBrand'))}${e.model?` · ${esc(e.model)}`:''}${e.series?` · ${esc(e.series)}`:''} · ${esc(tr('finalUi.weightMark'))} ${normalizeWeightUnit(e.weightUnit||'kg')}</div></div><div class="actions"><button class="btn small ghost" data-eq-unit="${e.id}">${normalizeWeightUnit(e.weightUnit||'kg')} ↔</button><button class="btn small danger" data-deleq="${e.id}">${esc(tr('gym.delete'))}</button></div></div>`).join(''):'<div class="empty">${esc(tr("residual.raf76980d"))}</div>';
 $$('[data-eq-unit]').forEach(b=>b.onclick=()=>{const e=data.equipment.find(x=>x.id===b.dataset.eqUnit);if(!e)return;e.weightUnit=normalizeWeightUnit(e.weightUnit)==='kg'?'lb':'kg';save(tr('reasons.changeEquipmentUnit'),false);toast(tr('feedback.equipmentUnit',{unit:e.weightUnit}))});
 $$('[data-deleq]').forEach(b=>b.onclick=()=>{data.equipment=data.equipment.filter(e=>e.id!==b.dataset.deleq);save(tr('reasons.deleteEquipment'),true)});
 $('#setTrainingGoal').value=coachGoal();$('#setSessionMinutes').value=String(n(data.settings.sessionMinutes)||60);$('#setExperienceLevel').value=data.settings.experienceLevel||'beginner';$('#setEquipmentPreference').value=data.settings.equipmentPreference||'machine';$('#setBlockWeeks').value=String(n(data.settings.blockWeeks)||6);$('#setPreferredGym').innerHTML='<option value="">${esc(tr("residual.recc7c9f4"))}</option>'+data.gyms.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');$('#setPreferredGym').value=data.settings.preferredGymId||'';$('#priorityMuscleOptions').innerHTML=MUSCLES.filter(m=>!['有氧','其他'].includes(m)).map(m=>`<label><input type="checkbox" data-priority-muscle="${m}" ${priorityMuscles().includes(m)?'checked':''}>${esc(displayMuscle(m))}</label>`).join('');const wd=WEEKDAY_KEYS.map(k=>tr(k)),avs=availableWeekdays();$('#availableWeekdayOptions').innerHTML=wd.map((x,i)=>`<label><input type="checkbox" data-available-weekday="${i}" ${avs.includes(i)?'checked':''}>${esc(tr('finalUi.weekday',{day:x}))}</label>`).join('');$('#setAllowConsecutiveDays').checked=!!data.settings.allowConsecutiveDays;$('#setUnit').value=data.settings.unit;$('#setIntensity').value=data.settings.intensity;$('#setRest').value=data.settings.defaultRest;$('#setWeeklySessions').value=data.settings.weeklySessions;$('#setCardioGoal').value=data.settings.weeklyCardio;$('#setWeekStart').value=String(data.settings.weekStart);$('#setWarmup').checked=!!data.settings.includeWarmup;$('#set1rm').checked=!!data.settings.show1RM;
 $('#setUiLevel').value=uiLevel();const tutBtn=$('#openTutorialFromSettings');if(tutBtn)tutBtn.onclick=openTutorialAgain;$('#setRestTimerPosition').value=data.settings.restTimerPosition||'top';$('#setTrainingNotes').checked=data.settings.trainingNotes!==false;$('#setTrainingAutoLoad').checked=data.settings.trainingAutoLoad!==false;$('#setTrainingIntervalTimer').checked=data.settings.trainingIntervalTimer!==false;$('#setRestTimerSound').checked=data.settings.restTimerSound!==false;
 $('#muscleGoalInputs').innerHTML=MUSCLES.filter(m=>!['有氧','其他'].includes(m)).map(m=>`<div class="field"><label>${esc(displayMuscle(m))}</label><input type="number" min="0" max="50" data-mgoal="${m}" value="${n((data.settings.weeklyMuscleGoals||{})[m])}"></div>`).join('');
 $('#strengthGoalList').innerHTML=(data.strengthGoals||[]).length?data.strengthGoals.map(g=>`<div class="record"><div class="record-head"><div><b>${esc(getExercise(g.exerciseId)?.name||tr('finalUi.deletedExercise'))}</b><div class="record-meta">${esc(tr('finalUi.target',{weight:fmtWeight(g.weight),reps:g.reps}))}</div></div><button class="btn small danger" data-delgoal="${g.id}">${esc(tr('gym.delete'))}</button></div></div>`).join(''):'<div class="small">${esc(tr("residual.r00862c41"))}</div>';
 $$('[data-delgoal]').forEach(b=>b.onclick=()=>{data.strengthGoals=data.strengthGoals.filter(g=>g.id!==b.dataset.delgoal);save(tr('reasons.deleteStrengthGoal'),true)});
 $('#snapshotList').innerHTML=data.snapshots.length?data.snapshots.map(s=>`<div class="snapshot-item"><div class="snapshot-copy"><div class="snapshot-time">${new Date(s.at).toLocaleString('zh-TW')}</div><div class="snapshot-reason">${esc(s.reason||tr('finalUi.autoBackup'))}</div></div><button class="btn small ghost" data-restore-snap="${s.id}">${esc(tr("residual.rf1b5cda4"))}</button></div>`).join(''):'<div class="empty">${esc(tr("residual.r4cdd5477"))}</div>';
 $$('[data-restore-snap]').forEach(b=>b.onclick=()=>{const s=data.snapshots.find(x=>x.id===b.dataset.restoreSnap);if(s&&confirm(tr('dialogs.restoreSnapshot'))){snapshot(tr('reasons.beforeRestore'));const snaps=data.snapshots;data=migrate(JSON.parse(JSON.stringify(s.payload)));data.snapshots=snaps;save(tr('reasons.restoreSnapshot'),false);toast(tr('feedback.snapshotRestored'))}})
}
function renderLibrary(){
 const q=($('#libSearch')?.value||'').toLowerCase();
 const items=data.exerciseLibrary.filter(e=>(e.name+' '+(e.nameEn||'')+' '+(e.aliases||[]).join(' ')).toLowerCase().includes(q)).sort((a,b)=>Number(!!a.system)-Number(!!b.system)||a.name.localeCompare(b.name,'zh-Hant'));
 const shown=items.slice(0,80);
 $('#libraryList').innerHTML=shown.map(e=>`<div class="library-item"><div class="record-head"><div><b>${esc(e.name)}</b> ${e.system?'<span class="source-pill">SYSTEM</span>':'<span class="source-pill">MY</span>'}<div class="eq-en">${esc(e.nameEn||'')}</div><div class="record-meta">${esc((e.aliases||[]).join(' / '))}</div></div><div class="actions">${e.system?`<button class="btn small primary" data-viewlib="${e.id}">${esc(tr("residual.rbb048236"))}</button><button class="btn small ghost" data-copylib="${e.id}">${esc(tr("residual.r80173301"))}</button>`:`<button class="btn small ghost" data-editlib="${e.id}">${esc(tr("residual.r4642d168"))}</button><button class="btn small danger" data-dellib="${e.id}">${esc(tr('gym.delete'))}</button>`}</div></div><div class="tagrow" style="margin-top:8px"><span class="tag">${esc(displayMuscle(e.muscle))}</span><span class="tag">${esc(displayType(e.type))}</span><span class="tag">${esc(tr('finalUi.setRest',{sets:e.targetSets,min:e.repMin,max:e.repMax}))}</span><span class="tag">${esc(tr('finalUi.restSeconds',{seconds:e.rest}))}</span>${e.pattern&&GLOSSARY[PATTERN_INFO[e.pattern]]?`<span class="tag">${esc(GLOSSARY[PATTERN_INFO[e.pattern]].zh)} ${infoButton(PATTERN_INFO[e.pattern])}</span>`:''}</div></div>`).join('')+(items.length>shown.length?`<div class="card small">${esc(tr('finalUi.libraryShown',{count:shown.length}))}</div>`:'');
 $$('[data-viewlib]').forEach(b=>b.onclick=()=>showExerciseDetail(b.dataset.viewlib));$$('[data-copylib]').forEach(b=>b.onclick=()=>copySystemExercise(b.dataset.copylib));
 $$('[data-editlib]').forEach(b=>b.onclick=()=>editExerciseLib(b.dataset.editlib));$$('[data-dellib]').forEach(b=>b.onclick=()=>{if(data.templates.some(t=>t.items.some(i=>i.exerciseId===b.dataset.dellib))){alert(tr('finalUi.exerciseInUse'));return}if(confirm(tr('dialogs.deleteCustomExercise'))){data.exerciseLibrary=data.exerciseLibrary.filter(e=>e.id!==b.dataset.dellib);save(tr('reasons.deleteExercise'),true)}})
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
 toast(tr('feedback.exerciseApplied',{name:ex.name}))
}
function renderMachineLookupResults(query){
 const box=$('#machineLookupResults');if(!box)return;
 const q=String(query||'').trim();
 if(q.length<2){box.innerHTML='<div class="machine-lookup-empty">${esc(tr("finalUi.machineMinPrefix"))}<b>Lat Pulldown</b>、<b>Inner / Outer Thigh</b>、<b>Pullover</b>${esc(tr("residual.rba70ff76"))}</div>';return}
 const hits=machineLookupCandidates(q);
 if(!hits.length){box.innerHTML='<div class="machine-lookup-empty">${esc(tr("finalUi.machineNoMatchPrefix"))}<b>Leg Extension</b>${esc(tr("residual.r2d32bcaa"))}</div>';return}
 box.innerHTML=hits.map(({eq,match,actions})=>{
   const brands=[...new Set((eq.brandModels||[]).map(x=>x.brand).filter(Boolean))];
   const matched=`${match.kind} · ${match.label}${match.text?`：「${match.text}」`:''}`;
   return `<div class="machine-match">
     <div class="machine-match-head"><div><div class="machine-match-title">${esc(eq.nameZh)}</div><div class="machine-match-en">${esc(eq.nameEn)}</div></div><span class="tag">${esc(eq.category)}</span></div>
     <div class="machine-match-source">${esc(matched)}</div>
     <div class="tagrow" style="margin-top:6px"><span class="tag">${esc(eq.primary)}</span>${eq.pattern?`<span class="tag">${esc(patternDisplayName(eq.pattern))}</span>`:''}${brands.slice(0,4).map(b=>`<span class="tag">${esc(b)}</span>`).join('')}</div>
     <div class="machine-actions">${actions.length?actions.map(ex=>`<div class="machine-action">
       <div class="machine-action-head"><div><div class="machine-action-name">${esc(ex.name)}</div><div class="machine-action-en">${esc(ex.nameEn||'')}</div></div><span class="tag">${esc(displayMuscle(ex.muscle||''))}</span></div>
       <div class="machine-action-desc">${esc(ex.descZh||ex.notes||'')}</div>
       <div class="tagrow" style="margin-top:6px">${ex.pattern?`<span class="tag">${esc(patternDisplayName(ex.pattern))}</span>`:''}<span class="tag">${esc(displayType(ex.type))}</span></div>
       <div class="actions"><button class="btn small primary" type="button" data-machine-use="${esc(ex.id)}">${esc(tr("residual.r77d6a59f"))}</button><button class="btn small ghost" type="button" data-machine-yt="${esc(ex.id)}">${esc(tr("residual.r8037f993"))}</button></div>
     </div>`).join(''):`<div class="machine-lookup-empty">${esc(tr("residual.rfb80dd12"))}</div>`}</div>
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
   <div class="machine-lookup-head"><div class="machine-lookup-icon">⌕</div><div><div class="machine-lookup-title">${esc(tr("residual.r7fc64b2d"))}</div><div class="machine-lookup-desc">${esc(tr("residual.rf3182a51"))}</div></div></div>
   <div class="machine-lookup-row"><input id="machineLabelLookup" autocomplete="off" placeholder="${esc(tr("residual.rb9b67e56"))}"><button class="btn ghost" type="button" id="machineLookupBtn">${esc(tr("residual.r3626353a"))}</button></div>
   <div id="machineLookupResults" class="machine-lookup-results"></div>
 </div>`:'';
 openModal(id?tr('modal.editExercise'):tr('modal.newExercise'),`${lookupHtml}<div class="grid2"><div class="field"><label>${esc(tr("residual.r01e08503"))}</label><input id="elName" value="${esc(e.name)}"></div><div class="field"><label>${esc(tr("residual.r4be1c58f"))}</label><input id="elNameEn" value="${esc(e.nameEn||'')}"></div><div class="field"><label>${esc(tr("residual.r45b03e28"))}</label><input id="elAliases" value="${esc((e.aliases||[]).join(','))}"></div><div class="field"><label>${esc(tr("residual.rcf870e5d"))}</label><select id="elMuscle">${MUSCLES.map(m=>`<option value="${esc(m)}" ${e.muscle===m?'selected':''}>${esc(displayMuscle(m))}</option>`).join('')}</select></div><div class="field"><label>${esc(tr("residual.re4e4a53e"))}</label><select id="elType">${TYPES.map(([v,l])=>`<option value="${v}" ${e.type===v?'selected':''}>${esc(tr(l))}</option>`).join('')}</select></div><div class="field"><label>${esc(tr("residual.r147f7ce4"))}</label><input type="number" id="elSets" value="${e.targetSets}"></div><div class="field"><label>${esc(tr("residual.rf2afec20"))}</label><input type="number" id="elMin" value="${e.repMin}"></div><div class="field"><label>${esc(tr("residual.rb8ab8369"))}</label><input type="number" id="elMax" value="${e.repMax}"></div><div class="field"><label>${esc(tr("residual.r4a5eb0dc"))}</label><input type="number" step=".1" id="elInc" value="${e.increment}"></div><div class="field"><label>${esc(tr("residual.rd7d43a1b"))}</label><input type="number" id="elRest" value="${e.rest}"></div><div class="field"><label>${esc(tr("residual.ra373bd05"))}</label><select id="elEq"><option value="">${esc(tr("residual.r6a86e0bc"))}</option><optgroup label="${esc(tr('finalUi.systemEquipmentGroup'))}">${SYSTEM_EQUIPMENT.map(x=>`<option value="${x.id}" ${e.equipmentId===x.id?'selected':''}>${esc(x.nameZh)} / ${esc(x.nameEn)}</option>`).join('')}</optgroup><optgroup label="${esc(tr('finalUi.myEquipmentGroup'))}">${data.equipment.map(x=>`<option value="${x.id}" ${e.equipmentId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</optgroup></select></div>
 <div class="field"><label>${esc(tr("finalUi.movementMode"))} <button class="info-btn" type="button" data-info="movement_balance">i</button></label><select id="elPattern"><option value="">${esc(tr("residual.r233b6987"))}</option>${Object.keys(STIMULUS_BY_PATTERN).map(p=>`<option value="${p}" ${e.pattern===p?'selected':''}>${esc(patternDisplayName(p))}</option>`).join('')}</select></div></div>
 <div class="field"><label>${esc(tr("residual.r6984f9b9"))}</label><textarea id="elNotes">${esc(e.notes||'')}</textarea></div><div class="field"><label>${esc(tr("residual.re49d0e8e"))}</label><div class="chipselect">${data.exerciseLibrary.filter(x=>x.id!==e.id).map(x=>`<button type="button" data-alt="${x.id}" class="${(e.alternatives||[]).includes(x.id)?'on':''}">${esc(x.name)}</button>`).join('')}</div></div><button class="btn primary" id="elSave">${esc(tr("residual.r31f4512e"))}</button>`,()=>{
   if(!id)initMachineLabelLookup();
   $$('[data-alt]').forEach(b=>b.onclick=()=>b.classList.toggle('on'));
   $('#elSave').onclick=()=>{const name=$('#elName').value.trim();if(!name){toast(tr('feedback.exerciseNameRequired'));return}e.name=name;e.nameEn=$('#elNameEn').value.trim();e.aliases=$('#elAliases').value.split(',').map(x=>x.trim()).filter(Boolean);e.muscle=$('#elMuscle').value;e.type=$('#elType').value;e.targetSets=clamp($('#elSets').value,1,20);e.repMin=clamp($('#elMin').value,0,1000);e.repMax=Math.max(e.repMin,clamp($('#elMax').value,0,2000));e.increment=clamp($('#elInc').value,0,500);e.rest=clamp($('#elRest').value,0,900);e.equipmentId=$('#elEq').value;e.pattern=$('#elPattern').value||SYSTEM_EQUIPMENT.find(x=>x.id===e.equipmentId)?.pattern||'';e.notes=$('#elNotes').value;e.alternatives=$$('[data-alt].on').map(b=>b.dataset.alt);if(!id)data.exerciseLibrary.push(e);save(id?tr('finalUi.saveEditExercise'):tr('finalUi.saveAddExercise'),true);closeModal();toast(tr('finalUi.saved'))}
 })
}
function editTemplate(id=''){
 const original=id?data.templates.find(x=>x.id===id):null;
 let working=JSON.parse(JSON.stringify(original||{id:uid('tpl'),name:tr('finalUi.newTemplate'),items:[]}));
 const showEditor=()=>{
   const itemHtml=()=>working.items.map((it,i)=>`<div class="record"><div class="record-head"><b>${i+1}. ${esc(getExercise(it.exerciseId)?.name||'已刪除')}</b><div class="actions"><button class="btn small ghost" data-tu="${i}">↑</button><button class="btn small ghost" data-td="${i}">↓</button><button class="btn small danger" data-tr="${i}">${esc(tr("residual.r2f5b553d"))}</button></div></div></div>`).join('')||'<div class="empty">${esc(tr("residual.r745e433f"))}</div>';
   const bindRows=()=>{
     const box=$('#tplItems');if(!box)return;box.innerHTML=itemHtml();
     $$('[data-tr]').forEach(b=>b.onclick=()=>{working.items.splice(n(b.dataset.tr),1);bindRows()});
     $$('[data-tu]').forEach(b=>b.onclick=()=>{const i=n(b.dataset.tu);if(i>0)[working.items[i-1],working.items[i]]=[working.items[i],working.items[i-1]];bindRows()});
     $$('[data-td]').forEach(b=>b.onclick=()=>{const i=n(b.dataset.td);if(i<working.items.length-1)[working.items[i+1],working.items[i]]=[working.items[i],working.items[i+1]];bindRows()})
   };
   openModal(id?tr('modal.editTemplate'):tr('modal.newTemplate'),`<div class="field"><label>${esc(tr('trainingUi.workoutName'))}</label><input id="tplName" value="${esc(working.name)}"></div><div id="tplItems"></div><div class="actions"><button class="btn ghost" id="tplAdd">${esc(tr('trainingUi.addExercise'))}</button><button class="btn primary" id="tplSave">${esc(tr("residual.r2f106cd5"))}</button></div>`,()=>{
     bindRows();
     $('#tplAdd').onclick=()=>{working.name=$('#tplName').value.trim()||working.name||'新課表';openExercisePicker(ex=>{working.items.push({exerciseId:ex.id});showEditor()})};
     $('#tplSave').onclick=()=>{working.name=$('#tplName').value.trim()||tr('finalUi.unnamedTemplate');if(id){const i=data.templates.findIndex(x=>x.id===id);if(i>=0)data.templates[i]=working}else data.templates.push(working);save(id?tr('finalUi.saveEditTemplate'):tr('finalUi.saveAddTemplate'),true);closeModal();toast(tr('feedback.templateSaved'))}
   })
 };
 showEditor()
}

function download(name,text,type){const blob=new Blob([text],{type}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function buildBackupPayload(){return{...JSON.parse(JSON.stringify(data)),backupMeta:{format:'trainlog-pro-full-backup',version:1,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),includes:['訓練紀錄','目前訓練計畫','訓練偏好與目標','我的課表','自訂動作','健身房與器材','進行中的訓練','身體狀態','力量目標','回收筒','自動備份紀錄']},app:'TrainLog Pro'}}
function exportJSON(){download('trainlog-pro-'+isoToday()+'.json',JSON.stringify(buildBackupPayload(),null,2),'application/json');toast(tr('feedback.backupDownloaded'))}
function mergeById(a,b){const m=new Map((a||[]).map(x=>[x.id,x]));(b||[]).forEach(x=>m.set(x.id,x));return[...m.values()]}
function mergeSnapshots(a,b){const m=new Map();[...(a||[]),...(b||[])].forEach(x=>{if(x?.id&&!m.has(x.id))m.set(x.id,x)});return[...m.values()].sort((x,y)=>String(y.at||'').localeCompare(String(x.at||''))).slice(0,5)}
function mergeBodyStatus(a,b){const m=new Map((a||[]).map(x=>[x.date,x]));(b||[]).forEach(x=>{if(x?.date)m.set(x.date,x)});return[...m.values()].sort((x,y)=>String(y.date||'').localeCompare(String(x.date||'')))}
function importSummaryHtml(migrated,type,newCount,dup,source=null){
 const raw=source&&typeof source==='object'?source:{};
 const hasSettings=type==='json'&&!!raw.settings&&typeof raw.settings==='object',hasPlan=type==='json'&&!!raw.currentPlan,hasActive=type==='json'&&!!raw.activeWorkout;
 return `<div class="card"><div class="grid3"><div class="stat"><b>${migrated.workouts.length}</b><span>${esc(tr('gym.workoutRecords'))}</span></div><div class="stat"><b>${newCount}</b><span>${esc(tr("residual.r0ad79527"))}</span></div><div class="stat"><b>${dup}</b><span>${esc(tr("residual.r4151912e"))}</span></div></div><div class="tagrow" style="margin-top:12px"><span class="tag">我的課表 ${migrated.templates.length}</span><span class="tag">健身房 ${migrated.gyms.length}</span><span class="tag">我的器材 ${migrated.equipment.length}</span><span class="tag">身體狀態 ${migrated.bodyStatus.length}</span><span class="tag">力量目標 ${migrated.strengthGoals.length}</span>${hasSettings?'<span class="tag good">${esc(tr("residual.re4d4e06b"))}</span>':''}${hasPlan?'<span class="tag good">${esc(tr("residual.reaf857cc"))}</span>':''}${hasActive?'<span class="tag">${esc(tr("residual.r7692195b"))}</span>':''}</div>${type==='csv'?'<div class="small" style="margin-top:10px">${esc(tr("residual.r5e7f5add"))}</div>':'<div class="small" style="margin-top:10px">${esc(tr("residual.rb074f245"))}</div>'}</div>`
}
function previewImport(incoming,type,fileName){
 const migrated=migrate(incoming),existing=new Map(data.workouts.map(w=>[w.id,w])),newCount=migrated.workouts.filter(w=>!existing.has(w.id)).length,dup=migrated.workouts.length-newCount;
 const modeOptions=type==='json'?`<option value="restore">${esc(tr("residual.r54649a64"))}</option><option value="merge">${esc(tr("residual.r828f27b9"))}</option><option value="skip">${esc(tr("residual.r65015b25"))}</option>`:`<option value="merge">${esc(tr("residual.r23627781"))}</option><option value="skip">${esc(tr("residual.r383678cd"))}</option>`;
 openModal(tr('modal.importPreview'),`<div class="card"><b>${esc(fileName)}</b><div class="small" style="margin-top:7px">${esc(tr('finalUi.compatibleBackup',{type:type==='json'?tr('finalUi.backupTypeFull'):tr('finalUi.backupTypeTable')}))}</div></div>${importSummaryHtml(migrated,type,newCount,dup,incoming)}<div class="field"><label>${esc(tr("residual.r355ebb85"))}</label><select id="impMode">${modeOptions}</select><div class="hint">${esc(tr("residual.rf191fe9c"))}</div></div><button class="btn primary" id="impConfirm">${esc(tr("residual.r320fc068"))}</button>`,()=>$('#impConfirm').onclick=()=>{
   const mode=$('#impMode').value;snapshot(tr('reasons.beforeImport'));const beforeSnapshots=[...(data.snapshots||[])];
   if(mode==='restore'&&type==='json'){
     const importedSnapshots=[...(migrated.snapshots||[])];data=migrated;data.snapshots=mergeSnapshots(beforeSnapshots,importedSnapshots);
   }else{
     const map=new Map(data.workouts.map(w=>[w.id,w]));migrated.workouts.forEach(w=>{if(mode==='merge'||!map.has(w.id))map.set(w.id,w)});data.workouts=[...map.values()];
     data.exerciseLibrary=mergeById(data.exerciseLibrary,migrated.exerciseLibrary);data.templates=mergeById(data.templates,migrated.templates);data.gyms=mergeById(data.gyms,migrated.gyms);data.equipment=mergeById(data.equipment,migrated.equipment);data.bodyStatus=mergeBodyStatus(data.bodyStatus,migrated.bodyStatus);data.strengthGoals=mergeById(data.strengthGoals,migrated.strengthGoals);data.snapshots=beforeSnapshots;
   }
   syncGymsFromHistory(false);save(tr('reasons.importData'),false);closeModal();toast(mode==='restore'?tr('feedback.importRestored'):tr('feedback.importMerged'))
 })
}
function csvEscape(v){return'"'+String(v??'').replace(/"/g,'""')+'"'}
function exportCSV(){
 const rows=[['workoutId','date','workoutName','duration','deload','gymName','exerciseId','exerciseName','muscle','type','equipmentId','inputUnit','setIndex','kind','weightKg','reps','rir','rpe','seconds','leftWeightKg','leftReps','rightWeightKg','rightReps','cardioMinutes','distanceKm','speed','incline','notes']];
 data.workouts.forEach(w=>(w.exercises||[]).forEach(e=>{const gymName=workoutGymName(w),eqId=e.equipmentId||getExercise(e.exerciseId)?.equipmentId||'',inputUnit=exerciseInputUnit(e);if(e.type==='cardio')rows.push([w.id,w.date,w.name,w.duration,w.deload,gymName,e.exerciseId,e.nameSnapshot,e.muscle,e.type,eqId,inputUnit,1,'working','','','','','','','','','','',e.cardio?.minutes,e.cardio?.distanceKm,e.cardio?.speed,e.cardio?.incline,w.notes]);else(e.sets||[]).forEach((s,i)=>rows.push([w.id,w.date,w.name,w.duration,w.deload,gymName,e.exerciseId,e.nameSnapshot,e.muscle,e.type,eqId,inputUnit,i+1,s.kind,s.weight,s.reps,s.rir,s.rpe,s.seconds,s.leftWeight,s.leftReps,s.rightWeight,s.rightReps,'','','','',w.notes]))}));
 const csv='\ufeff'+rows.map(r=>r.map(csvEscape).join(',')).join('\n');download('trainlog-pro-'+isoToday()+'.csv',csv,'text/csv;charset=utf-8');toast(tr('feedback.csvExported'))
}
function parseCSV(text){
 const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(c!=='\r')cell+=c}}row.push(cell);if(row.some(x=>x!==''))rows.push(row);return rows
}
function csvToData(text){
 const rows=parseCSV(text.replace(/^\ufeff/,''));if(rows.length<2)throw Error('empty');const h=rows[0],ix=k=>h.indexOf(k);const wm=new Map();
 rows.slice(1).forEach(r=>{const id=r[ix('workoutId')]||uid('w');if(!wm.has(id))wm.set(id,{id,date:r[ix('date')]||isoToday(),name:r[ix('workoutName')]||tr('finalUi.csvImport'),duration:n(r[ix('duration')]),status:'completed',startedAt:'',endedAt:'',notes:r[ix('notes')]||'',gymId:'',gymNameSnapshot:ix('gymName')>=0?(r[ix('gymName')]||''):'',deload:r[ix('deload')]==='true',preStatus:{},pain:'',exercises:[]});const w=wm.get(id),eid=r[ix('exerciseId')]||uid('excsv'),name=r[ix('exerciseName')]||tr('analysisDynamic.exerciseFallback'),type=r[ix('type')]||'weight_reps',inputUnit=ix('inputUnit')>=0?normalizeWeightUnit(r[ix('inputUnit')]):'kg';let e=w.exercises.find(x=>x.exerciseId===eid);if(!e){e={exerciseId:eid,nameSnapshot:name,muscle:r[ix('muscle')]||'其他',type,equipmentId:ix('equipmentId')>=0?(r[ix('equipmentId')]||''):'',notes:'',inputUnit,sets:[],cardio:{minutes:0,distanceKm:0,speed:0,incline:0,pace:''}};w.exercises.push(e)}if(type==='cardio'){e.cardio={minutes:n(r[ix('cardioMinutes')]),distanceKm:n(r[ix('distanceKm')]),speed:n(r[ix('speed')]),incline:n(r[ix('incline')]),pace:''}}else{const wIdx=ix('weightKg')>=0?ix('weightKg'):ix('weight'),lwIdx=ix('leftWeightKg')>=0?ix('leftWeightKg'):ix('leftWeight'),rwIdx=ix('rightWeightKg')>=0?ix('rightWeightKg'):ix('rightWeight');e.sets.push({id:uid('s'),kind:r[ix('kind')]||'working',weight:n(r[wIdx]),reps:n(r[ix('reps')]),rir:r[ix('rir')]||'',rpe:r[ix('rpe')]||'',seconds:n(r[ix('seconds')]),leftWeight:n(r[lwIdx]),leftReps:n(r[ix('leftReps')]),rightWeight:n(r[rwIdx]),rightReps:n(r[ix('rightReps')]),completed:true})}});
 return{schemaVersion:CURRENT_SCHEMA,workouts:[...wm.values()],exerciseLibrary:data.exerciseLibrary,templates:[],gyms:[],equipment:[],settings:data.settings,bodyStatus:[],trash:[],snapshots:[],strengthGoals:[]}
}

function goPage(id){$$('.page').forEach(p=>p.classList.toggle('active',p.id===id));$$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));if(id==='settingsPage')showSettingsView('hub');window.scrollTo({top:0,behavior:'smooth'});renderAll();setTimeout(()=>maybeStartPageTutorial(id),80)}
$$('.nav button').forEach(b=>b.onclick=()=>goPage(b.dataset.page));
initRestTimerUI();initTrainingDrawer();
$('#quickStart').onclick=()=>data.activeWorkout?goPage('trainPage'):openStartModal();$('#quickManual').onclick=manualEntry;
$('#recordMonth').onchange=renderRecords;$('#recordMuscle').onchange=renderRecords;
function shiftMonth(delta){const [y,m]=$('#recordMonth').value.split('-').map(Number),d=new Date(y,m-1+delta,1);$('#recordMonth').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');renderRecords()}
$('#prevMonth').onclick=()=>shiftMonth(-1);$('#nextMonth').onclick=()=>shiftMonth(1);$('#thisMonth').onclick=()=>{$('#recordMonth').value=monthKey();renderRecords()};
const analysisExerciseCompat=$('#analysisExercise');if(analysisExerciseCompat)analysisExerciseCompat.onchange=e=>renderExerciseAnalysis(e.target.value);
$$('[data-analysis-range]').forEach(b=>b.onclick=()=>{const next=['7','30','90','all'].includes(b.dataset.analysisRange)?b.dataset.analysisRange:'30';analysisRange=next;data.settings.analysisRange=next;try{localStorage.setItem(APP_KEY,JSON.stringify(data))}catch{}renderAnalysis()});
$('#addTemplateBtn').onclick=()=>editTemplate();$('#addExerciseLibBtn').onclick=()=>editExerciseLib();$('#libSearch').oninput=renderLibrary;
$$('[data-settings-view]').forEach(b=>b.onclick=()=>showSettingsView(b.dataset.settingsView));
$$('.settings-back').forEach(b=>b.onclick=()=>showSettingsView('hub'));
['programSearch','programCategory','programDays','programLevel','programDuration','programEquip','programGoal'].forEach(id=>{const el=$('#'+id);if(el)el.addEventListener(id==='programSearch'?'input':'change',()=>{programDisplayLimit=18;renderSystemPrograms()})});
['systemEqSearch','systemEqCategory','systemEqResistance','systemEqBrand'].forEach(id=>{const el=$('#'+id);if(el)el.addEventListener(id==='systemEqSearch'?'input':'change',()=>{equipmentDisplayLimit=24;renderSystemEquipment()})});
const gs=$('#glossarySearch');if(gs)gs.oninput=renderGlossaryIndex;
$('#addGym').onclick=()=>{const name=prompt(tr('prompts.gymName'));if(!name?.trim())return;const existed=gymByName(name);if(existed){toast(tr('feedback.gymExists'));return}ensureGymByName(name);save(tr('reasons.addGym'),true)};
$('#syncGymsFromHistory').onclick=()=>{const added=syncGymsFromHistory(false);if(added)save(tr('reasons.syncGyms'),true);else toast(tr('finalUi.noNewGym'))};
$('#addEquipment').onclick=()=>{openModal(tr('modal.newMyEquipment'),`<div class="card">
 <div class="field"><label>${esc(tr("residual.r5a66610b"))}</label><input id="manualEqName" placeholder="${esc(tr("residual.r0ccc5e3e"))}"></div>
 <div class="field"><label>${esc(tr("residual.r89f4b900"))}</label><input id="manualEqBrand" list="manualEqBrands" placeholder="Life Fitness、Hammer Strength..."><datalist id="manualEqBrands">${EQUIPMENT_BRANDS.map(b=>`<option value="${esc(b)}"></option>`).join('')}</datalist></div>
 <div class="field"><label>${esc(tr("residual.r421a2a37"))}</label><input id="manualEqModel" placeholder="${esc(tr("residual.r461d0c6d"))}"></div>
 <button class="btn primary" id="manualEqSave">${esc(tr('trainingUi.save'))}</button></div>`,()=>$('#manualEqSave').onclick=()=>{
   const name=$('#manualEqName').value.trim();if(!name){toast(tr('feedback.equipmentNameRequired'));return}
   data.equipment.push({id:uid('eq'),name,brand:$('#manualEqBrand').value.trim(),model:$('#manualEqModel').value.trim()});
   save(tr('reasons.addEquipment'),true);closeModal()
 })};
$('#addStrengthGoal').onclick=()=>{const unit=normalizeWeightUnit(data.settings.unit);openModal(tr('modal.newStrengthGoal'),`<div class="field"><label>${esc(tr("residual.re93ee504"))}</label><select id="sgEx">${data.exerciseLibrary.filter(e=>['weight_reps','bodyweight','unilateral'].includes(e.type)).map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div><div class="grid2"><div class="field"><label>${esc(tr('finalUi.targetWeight',{unit}))}</label><input id="sgW" type="number" step=".1"><div class="hint">${esc(tr("residual.r19b89a0e"))}</div></div><div class="field"><label>${esc(tr("residual.rdc36d1d9"))}</label><input id="sgR" type="number" value="10"></div></div><button class="btn primary" id="sgSave">${esc(tr('trainingUi.save'))}</button>`,()=>$('#sgSave').onclick=()=>{data.strengthGoals.push({id:uid('goal'),exerciseId:$('#sgEx').value,weight:toKg(clamp($('#sgW').value,0,5000),unit),reps:clamp($('#sgR').value,1,300)});save(tr('reasons.addStrengthGoal'),true);closeModal();toast(tr('feedback.strengthGoalAdded'))})};
$('#saveSettings').onclick=()=>{const hadPlan=!!data.currentPlan;data.settings.preferencesSetupCompleted=true;data.settings.trainingGoal=$('#setTrainingGoal').value;data.settings.sessionMinutes=n($('#setSessionMinutes').value)||60;data.settings.experienceLevel=$('#setExperienceLevel').value;data.settings.equipmentPreference=$('#setEquipmentPreference').value;data.settings.blockWeeks=n($('#setBlockWeeks').value)||6;data.settings.preferredGymId=$('#setPreferredGym').value||'';data.settings.priorityMuscles=$$('[data-priority-muscle]:checked').map(x=>x.dataset.priorityMuscle);data.settings.availableWeekdays=$$('[data-available-weekday]:checked').map(x=>n(x.dataset.availableWeekday));data.settings.allowConsecutiveDays=$('#setAllowConsecutiveDays').checked;data.settings.unit=$('#setUnit').value;data.settings.intensity=$('#setIntensity').value;data.settings.defaultRest=clamp($('#setRest').value,15,900);data.settings.weeklySessions=clamp($('#setWeeklySessions').value,1,14);data.settings.weeklyCardio=clamp($('#setCardioGoal').value,0,2000);data.settings.weekStart=n($('#setWeekStart').value);data.settings.includeWarmup=$('#setWarmup').checked;data.settings.show1RM=$('#set1rm').checked;data.settings.uiLevel=$('#setUiLevel').value;data.settings.restTimerPosition=$('#setRestTimerPosition').value;data.settings.trainingNotes=$('#setTrainingNotes').checked;data.settings.trainingAutoLoad=$('#setTrainingAutoLoad').checked;data.settings.trainingIntervalTimer=$('#setTrainingIntervalTimer').checked;data.settings.restTimerSound=$('#setRestTimerSound').checked;data.settings.weeklyMuscleGoals=data.settings.weeklyMuscleGoals||{};$$('[data-mgoal]').forEach(i=>data.settings.weeklyMuscleGoals[i.dataset.mgoal]=clamp(i.value,0,50));save(tr('reasons.changeSettings'),true);toast(hadPlan?tr('feedback.settingsSavedPlan'):tr('feedback.settingsSaved'))};
$('#runSelfCheck').onclick=()=>renderSelfCheck(runAppSelfCheck());$('#exportJson').onclick=exportJSON;$('#exportCsv').onclick=exportCSV;
$('#importJson').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{previewImport(JSON.parse(await f.text()),'json',f.name)}catch{alert(tr('finalUi.invalidJson'))}e.target.value=''};
$('#importCsv').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{previewImport(csvToData(await f.text()),'csv',f.name)}catch(err){alert(tr('finalUi.invalidCsv'))}e.target.value=''};
$('#clearAll').onclick=()=>{if(confirm(tr('dialogs.clearAll'))){localStorage.removeItem(APP_KEY);data=freshData();save(tr('reasons.reinitialize'),false);toast(tr('feedback.allCleared'))}};

$('#recordMonth').value=monthKey();
renderAll();
})();
