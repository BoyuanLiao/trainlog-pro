'use strict';

const assert=require('assert');
const {createBrowserContext,loadBrowserScript}=require('../helpers/load-browser-script');

const ctx=createBrowserContext();
loadBrowserScript(ctx,'js/core/utils.js');
loadBrowserScript(ctx,'js/training/metrics.js');
loadBrowserScript(ctx,'js/training/lifecycle.js');
loadBrowserScript(ctx,'js/training/mutations.js');

const M=ctx.TrainLogTrainingMetrics;
const L=ctx.TrainLogTrainingLifecycle;
const U=ctx.TrainLogTrainingMutations;

const workout=L.createBlankWorkout({
  id:'w1',
  date:'2026-09-20',
  startedAt:'2026-09-20T10:00:00.000Z'
});
assert.strictEqual(workout.status,'active');
assert.deepStrictEqual(workout.exercises,[]);

const exercise={
  exerciseId:'chest',
  muscle:'胸',
  type:'weight_reps',
  sets:[{
    id:'s1',kind:'working',weight:50,reps:10,rir:2,rpe:'',seconds:0,
    leftWeight:0,rightWeight:0,leftReps:0,rightReps:0,completed:true
  }]
};
workout.exercises.push(exercise);

const second=U.addSet(exercise,{id:'s2'});
assert.strictEqual(second.weight,50);
assert.strictEqual(second.reps,10);
assert.strictEqual(second.completed,false);
assert.strictEqual(U.applyWeightDelta(second,5),55);
assert.strictEqual(U.applyDelta(second,'reps',1),11);
assert.strictEqual(U.toggleCompleted(exercise,1),true);

assert.strictEqual(M.effectiveSets(workout,'胸'),2);
assert.strictEqual(M.workoutVolume(workout),50*10+55*11);

const completed=L.finalizeWorkout(workout,{
  endedAt:'2026-09-20T10:30:00.000Z',
  bodyStatusSnapshot:{energy:'ok'}
});
assert.strictEqual(completed.status,'completed');
assert.strictEqual(completed.duration,30);
assert.deepStrictEqual(completed.bodyStatusSnapshot,{energy:'ok'});
assert.strictEqual(workout.status,'active','finalization must not mutate active workout');

const history=L.appendCompletedWorkout([
  {id:'older',date:'2026-09-18',status:'completed',exercises:[]}
],completed);
assert.deepStrictEqual(history.map(x=>x.id),['w1','older']);

console.log('integration training flow: create -> mutate -> measure -> finalize -> history passed');
