/**
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
