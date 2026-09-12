/** TrainLog Pro pure training metrics. */
(()=>{
  'use strict';
  const n=window.TrainLogUtils.n;
  const est1rm=window.TrainLogUtils.est1rm;

  function workoutVolume(workout,{includeWarmup=false}={}){
    let sum=0;
    (workout?.exercises||[]).forEach(e=>{
      if(!['weight_reps','bodyweight','unilateral'].includes(e.type))return;
      (e.sets||[]).forEach(s=>{
        if(!s.completed)return;
        if(!includeWarmup&&s.kind==='warmup')return;
        if(e.type==='unilateral')sum+=n(s.leftWeight)*n(s.leftReps)+n(s.rightWeight)*n(s.rightReps);
        else sum+=n(s.weight)*n(s.reps);
      });
    });
    return sum;
  }

  function effectiveSets(workout,muscle){
    let count=0;
    (workout?.exercises||[]).forEach(e=>{
      if(muscle&&e.muscle!==muscle)return;
      (e.sets||[]).forEach(s=>{if(s.completed&&s.kind!=='warmup')count++});
    });
    return count;
  }

  function cardioMinutes(workout){
    let minutes=0;
    (workout?.exercises||[]).forEach(e=>{if(e.type==='cardio')minutes+=n(e.cardio?.minutes)});
    return minutes;
  }

  function durationSeconds(workout,muscle){
    let seconds=0;
    (workout?.exercises||[]).forEach(e=>{
      if(e.type==='duration'&&(!muscle||e.muscle===muscle)){
        (e.sets||[]).forEach(s=>{if(s.completed)seconds+=n(s.seconds)});
      }
    });
    return seconds;
  }

  function bestSetForExercise(exerciseId,workouts=[]){
    let best=null;
    workouts.forEach(w=>(w.exercises||[]).filter(e=>e.exerciseId===exerciseId).forEach(e=>(e.sets||[]).forEach(s=>{
      if(!s.completed||e.type==='duration'||e.type==='cardio')return;
      const weight=e.type==='unilateral'?Math.max(n(s.leftWeight),n(s.rightWeight)):n(s.weight);
      const reps=e.type==='unilateral'?Math.max(n(s.leftReps),n(s.rightReps)):n(s.reps);
      const score=est1rm(weight,reps);
      if(!best||score>best.score)best={weight,reps,score,date:w.date,kind:s.kind};
    })));
    return best;
  }

  window.TrainLogTrainingMetrics=Object.freeze({workoutVolume,effectiveSets,cardioMinutes,durationSeconds,bestSetForExercise});
})();
