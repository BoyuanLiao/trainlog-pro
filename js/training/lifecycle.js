/** TrainLog Pro active-workout lifecycle state transforms. */
(()=>{
  'use strict';

  const clone=value=>JSON.parse(JSON.stringify(value));
  const num=value=>{const x=Number(value);return Number.isFinite(x)?x:0};
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,num(value)));

  function createBlankWorkout({id,date,startedAt}){
    return {
      id,date,name:'自由訓練',duration:0,status:'active',startedAt,endedAt:'',notes:'',
      gymId:'',gymNameSnapshot:'',deload:false,preStatus:{},pain:'',exercises:[]
    };
  }

  function createTemplateWorkout(template,{id,date,startedAt,resolveExercise,makeSessionExercise}){
    if(!template)return null;
    const resolve=typeof resolveExercise==='function'?resolveExercise:()=>null;
    const make=typeof makeSessionExercise==='function'?makeSessionExercise:()=>null;
    return {
      id,date,name:template.name,duration:0,status:'active',startedAt,endedAt:'',notes:'',
      programDayMeta:template.dayMeta?clone(template.dayMeta):null,
      gymId:'',gymNameSnapshot:'',deload:false,preStatus:{},pain:'',
      exercises:(template.items||[]).map(item=>{
        const exercise=resolve(item.exerciseId);
        return exercise?make({...exercise,...item},date):null;
      }).filter(Boolean)
    };
  }

  function finalizeWorkout(workout,{endedAt,bodyStatusSnapshot}){
    const completed=clone(workout);
    const started=completed.startedAt?new Date(completed.startedAt):null;
    completed.endedAt=endedAt;
    completed.status='completed';
    completed.duration=completed.duration||Math.max(1,Math.round((new Date(endedAt)-started)/60000));
    completed.bodyStatusSnapshot=clone(bodyStatusSnapshot);
    return completed;
  }

  function finalizeHistoryEdit(workout,editingId){
    const updated=clone(workout);
    delete updated.editingWorkoutId;
    updated.id=editingId;
    updated.status='completed';
    updated.duration=clamp(updated.duration,0,1440);
    return updated;
  }

  function sortWorkouts(workouts){
    return [...(workouts||[])].sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||'')));
  }

  function appendCompletedWorkout(workouts,completed){
    return sortWorkouts([...(workouts||[]),clone(completed)]);
  }

  window.TrainLogTrainingLifecycle=Object.freeze({
    createBlankWorkout,
    createTemplateWorkout,
    finalizeWorkout,
    finalizeHistoryEdit,
    sortWorkouts,
    appendCompletedWorkout
  });
})();
