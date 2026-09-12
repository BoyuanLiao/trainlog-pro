/** TrainLog Pro set/exercise mutation helpers. */
(()=>{
  'use strict';
  const n=value=>{const x=Number(value);return Number.isFinite(x)?x:0};
  const COPY_KEYS=['weight','reps','seconds','leftWeight','rightWeight','leftReps','rightReps'];

  function createSetFromPrevious(prev={},id=''){
    return {
      id,
      kind:'working',
      weight:n(prev.weight),
      reps:n(prev.reps),
      rir:'',
      rpe:'',
      seconds:n(prev.seconds),
      leftWeight:n(prev.leftWeight),
      rightWeight:n(prev.rightWeight),
      leftReps:n(prev.leftReps),
      rightReps:n(prev.rightReps),
      completed:false
    };
  }

  function addSet(exercise,{id}={}){
    if(!exercise)return null;
    if(!Array.isArray(exercise.sets))exercise.sets=[];
    const set=createSetFromPrevious(exercise.sets[exercise.sets.length-1]||{},id||'');
    exercise.sets.push(set);
    return set;
  }

  function removeSet(exercise,index){
    if(!exercise||!Array.isArray(exercise.sets))return null;
    return exercise.sets.splice(Number(index),1)[0]||null;
  }

  function applyDelta(set,key,delta){
    if(!set)return null;
    set[key]=Math.max(0,n(set[key])+n(delta));
    return set[key];
  }

  function applyWeightDelta(set,deltaKg){
    if(!set)return null;
    set.weight=Math.max(0,n(set.weight)+n(deltaKg));
    return set.weight;
  }

  function copyPreviousSet(exercise,index){
    index=Number(index);
    if(!exercise||!Array.isArray(exercise.sets)||index<1)return false;
    const prev=exercise.sets[index-1],cur=exercise.sets[index];
    if(!prev||!cur)return false;
    COPY_KEYS.forEach(key=>{cur[key]=prev[key]});
    return true;
  }

  function toggleCompleted(exercise,index){
    const set=exercise?.sets?.[Number(index)];
    if(!set)return false;
    set.completed=!set.completed;
    return set.completed;
  }

  function setKind(exercise,index,kind){
    const set=exercise?.sets?.[Number(index)];
    if(!set)return false;
    set.kind=kind;
    return true;
  }

  function applySimpleEffort(exercise,index,feel){
    const set=exercise?.sets?.[Number(index)];
    if(!set)return false;
    set.rir=feel==='easy'?4:feel==='ok'?2:0;
    set.rpe='';
    return true;
  }

  function removeExercise(exercises,index){
    if(!Array.isArray(exercises))return null;
    return exercises.splice(Number(index),1)[0]||null;
  }

  window.TrainLogTrainingMutations=Object.freeze({
    createSetFromPrevious,
    addSet,
    removeSet,
    applyDelta,
    applyWeightDelta,
    copyPreviousSet,
    toggleCompleted,
    setKind,
    applySimpleEffort,
    removeExercise
  });
})();
