const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

function loadModule(){
  const file=path.join(__dirname,'../../js/training/progression-actions.js');
  const source=fs.readFileSync(file,'utf8');
  const window={};
  vm.runInNewContext(source,{window,console},{filename:file});
  return window.TrainLogProgressionActions;
}

const actions=loadModule();
assert(actions,'TrainLogProgressionActions should be exported');

function clone(value){return JSON.parse(JSON.stringify(value))}
function baseExercise(type='weight_reps'){
  return {
    type,
    sets:[
      {id:'warm',kind:'warmup',weight:20,reps:10,seconds:30,completed:false},
      {id:'done',kind:'working',weight:50,reps:8,seconds:40,completed:true},
      {id:'work',kind:'working',weight:50,reps:8,seconds:40,completed:false,rir:2,note:'keep'},
      {id:'drop',kind:'drop',weight:40,reps:10,seconds:30,completed:false}
    ]
  };
}

// 1. Only concrete progression actions are auto-applicable.
assert.equal(actions.canApply({action:'increase_load'}),true);
assert.equal(actions.canApply({action:'add_reps'}),true);
assert.equal(actions.canApply({action:'reduce_load'}),true);
assert.equal(actions.canApply({action:'increase_time'}),true);
assert.equal(actions.canApply({action:'plateau'}),false);
assert.equal(actions.canApply({action:'maintain'}),false);
assert.equal(actions.canApply({action:'new'}),false);

// 2. Increase load only touches incomplete primary working sets.
{
  const ex=baseExercise();
  const result=actions.applyAdvice(ex,{action:'increase_load'},{weightDeltaKg:2.5});
  assert.equal(result.applied,true);
  assert.equal(result.changedSets,1);
  assert.equal(ex.sets[0].weight,20);
  assert.equal(ex.sets[1].weight,50);
  assert.equal(ex.sets[2].weight,52.5);
  assert.equal(ex.sets[3].weight,40);
  assert.equal(ex.sets[2].rir,2);
  assert.equal(ex.sets[2].note,'keep');
}

// 3. Reduce load uses an absolute delta and never goes below zero.
{
  const ex=baseExercise();
  ex.sets[2].weight=1;
  const result=actions.applyAdvice(ex,{action:'reduce_load'},{weightDeltaKg:2.5});
  assert.equal(result.changedSets,1);
  assert.equal(ex.sets[2].weight,0);
}

// 4. Add reps increments only non-empty pending working targets.
{
  const ex=baseExercise();
  ex.sets.push({id:'blank',kind:'working',weight:50,reps:0,completed:false});
  const result=actions.applyAdvice(ex,{action:'add_reps'},{repDelta:1});
  assert.equal(result.changedSets,1);
  assert.equal(ex.sets[2].reps,9);
  assert.equal(ex.sets[4].reps,0);
}

// 5. Duration progression adds time only to incomplete working sets with a value.
{
  const ex=baseExercise('duration');
  ex.sets[2].seconds=45;
  ex.sets.push({id:'blank',kind:'working',seconds:0,completed:false});
  const result=actions.applyAdvice(ex,{action:'increase_time'},{secondsDelta:5});
  assert.equal(result.changedSets,1);
  assert.equal(ex.sets[2].seconds,50);
  assert.equal(ex.sets[4].seconds,0);
}

// 6. Unilateral load applies symmetrically while preserving empty sides.
{
  const ex={type:'unilateral',sets:[
    {id:'u1',kind:'working',leftWeight:20,rightWeight:22.5,leftReps:10,rightReps:10,completed:false},
    {id:'u2',kind:'working',leftWeight:0,rightWeight:15,leftReps:0,rightReps:8,completed:false},
    {id:'u3',kind:'working',leftWeight:20,rightWeight:20,leftReps:8,rightReps:8,completed:true}
  ]};
  const result=actions.applyAdvice(ex,{action:'increase_load'},{weightDeltaKg:2.5});
  assert.equal(result.changedSets,2);
  assert.equal(ex.sets[0].leftWeight,22.5);
  assert.equal(ex.sets[0].rightWeight,25);
  assert.equal(ex.sets[1].leftWeight,0);
  assert.equal(ex.sets[1].rightWeight,17.5);
  assert.equal(ex.sets[2].leftWeight,20);
}

// 7. Unilateral rep progression updates populated sides only.
{
  const ex={type:'unilateral',sets:[
    {id:'u1',kind:'working',leftReps:8,rightReps:9,completed:false},
    {id:'u2',kind:'working',leftReps:0,rightReps:7,completed:false}
  ]};
  const result=actions.applyAdvice(ex,{action:'add_reps'},{repDelta:1});
  assert.equal(result.changedSets,2);
  assert.equal(ex.sets[0].leftReps,9);
  assert.equal(ex.sets[0].rightReps,10);
  assert.equal(ex.sets[1].leftReps,0);
  assert.equal(ex.sets[1].rightReps,8);
}

// 8. Unsupported advice is a no-op.
{
  const ex=baseExercise();
  const before=clone(ex);
  const result=actions.applyAdvice(ex,{action:'plateau'},{weightDeltaKg:2.5});
  assert.equal(result.applied,false);
  assert.equal(result.changedSets,0);
  assert.deepStrictEqual(ex,before);
}

// 9. Missing exercise is safe.
{
  const result=actions.applyAdvice(null,{action:'increase_load'},{weightDeltaKg:2.5});
  assert.equal(result.applied,false);
  assert.equal(result.changedSets,0);
}

console.log('progression actions: passed');
