/** TrainLog Pro progression recommendation application helpers. */
(()=>{
  'use strict';

  const ACTIONS=new Set(['increase_load','add_reps','reduce_load','increase_time']);
  const n=value=>{const x=Number(value);return Number.isFinite(x)?x:0};

  function canApply(advice={}){
    return ACTIONS.has(advice?.action);
  }

  function isPendingWorkingSet(set){
    return !!set&&!set.completed&&(set.kind||'working')==='working';
  }

  function changePositiveField(set,key,delta){
    const current=n(set?.[key]);
    if(current<=0||!delta)return false;
    const next=Math.max(0,current+delta);
    if(next===current)return false;
    set[key]=next;
    return true;
  }

  function applyAdvice(exercise,advice={},options={}){
    const action=advice?.action||'';
    if(!exercise||!Array.isArray(exercise.sets)||!canApply(advice)){
      return {applied:false,action,changedSets:0};
    }

    let changedSets=0;
    const type=exercise.type||'weight_reps';
    const weightDelta=Math.abs(n(options.weightDeltaKg));
    const repDelta=Math.abs(n(options.repDelta||1));
    const secondsDelta=Math.abs(n(options.secondsDelta));

    exercise.sets.forEach(set=>{
      if(!isPendingWorkingSet(set))return;
      let changed=false;

      if(action==='increase_load'||action==='reduce_load'){
        if(weightDelta<=0)return;
        const delta=action==='reduce_load'?-weightDelta:weightDelta;
        if(type==='unilateral'){
          changed=changePositiveField(set,'leftWeight',delta)||changed;
          changed=changePositiveField(set,'rightWeight',delta)||changed;
        }else{
          changed=changePositiveField(set,'weight',delta)||changed;
        }
      }else if(action==='add_reps'){
        if(repDelta<=0)return;
        if(type==='unilateral'){
          changed=changePositiveField(set,'leftReps',repDelta)||changed;
          changed=changePositiveField(set,'rightReps',repDelta)||changed;
        }else{
          changed=changePositiveField(set,'reps',repDelta)||changed;
        }
      }else if(action==='increase_time'){
        if(secondsDelta<=0)return;
        changed=changePositiveField(set,'seconds',secondsDelta)||changed;
      }

      if(changed)changedSets++;
    });

    return {applied:changedSets>0,action,changedSets};
  }

  window.TrainLogProgressionActions=Object.freeze({
    canApply,
    isPendingWorkingSet,
    applyAdvice
  });
})();
