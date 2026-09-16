const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/analysis/training-metrics.js','utf8'),context,{filename:'training-metrics.js'});
const analysis=context.window.TrainLogAnalysis;
assert(analysis,'TrainLogAnalysis must be exported');

const done=(id,kind='working')=>({id,kind,completed:true});
const workouts=[{
  date:'2026-09-16',
  exercises:[
    {exerciseId:'press',nameSnapshot:'胸推機',type:'weight_reps',sets:[done('p0','warmup'),done('p1'),done('p2'),{id:'p3',kind:'working',completed:false}]},
    {exerciseId:'fly',nameSnapshot:'夾胸機',type:'weight_reps',sets:[done('f1'),done('f2'),done('f3')]},
    {exerciseId:'ignored',nameSnapshot:'其他動作',type:'weight_reps',sets:[done('i1')]}
  ]
}];

const profiles={
  press:[{muscle:'胸',weight:1},{muscle:'三頭',weight:.5},{muscle:'肩膀',weight:.25}],
  fly:[{muscle:'胸',weight:1},{muscle:'肩膀',weight:.25}],
  ignored:[{muscle:'其他',weight:1},{muscle:'有氧',weight:1}]
};
const sourceForExercise=exercise=>({
  key:exercise.exerciseId,
  name:exercise.nameSnapshot,
  pattern:exercise.exerciseId==='press'?'horizontal_push':'shoulder_horizontal_adduction',
  equipment:exercise.exerciseId==='press'?'胸推機':'夾胸機'
});
const plain=value=>JSON.parse(JSON.stringify(value));
const result=plain(analysis.stimulusMap(workouts,{profileForExercise:e=>profiles[e.exerciseId]||[],sourceForExercise}));

assert.deepStrictEqual(result.胸,{
  direct:5,indirect:0,total:5,
  sources:{
    press:{name:'胸推機',direct:2,indirect:0,total:2,pattern:'horizontal_push',equipment:'胸推機'},
    fly:{name:'夾胸機',direct:3,indirect:0,total:3,pattern:'shoulder_horizontal_adduction',equipment:'夾胸機'}
  }
},'primary muscle stimulus must preserve direct/indirect/total and per-exercise sources');
assert.deepStrictEqual(result.三頭,{
  direct:0,indirect:1,total:1,
  sources:{press:{name:'胸推機',direct:0,indirect:1,total:1,pattern:'horizontal_push',equipment:'胸推機'}}
},'secondary 0.5 stimulus must be counted as indirect sets');
assert.deepStrictEqual(result.肩膀,{
  direct:0,indirect:1.25,total:1.25,
  sources:{
    press:{name:'胸推機',direct:0,indirect:.5,total:.5,pattern:'horizontal_push',equipment:'胸推機'},
    fly:{name:'夾胸機',direct:0,indirect:.75,total:.75,pattern:'shoulder_horizontal_adduction',equipment:'夾胸機'}
  }
},'fractional indirect stimulus must aggregate without losing precision');
assert.strictEqual(result.其他,undefined,'other must not appear in muscle stimulus totals');
assert.strictEqual(result.有氧,undefined,'cardio must not appear in muscle stimulus totals');

const threshold=plain(analysis.stimulusMap([{exercises:[{exerciseId:'t',nameSnapshot:'門檻',sets:[done('t1')]}]}],{
  profileForExercise:()=>[{muscle:'胸',weight:.999}]
}));
assert.strictEqual(threshold.胸.direct,.999,'legacy >= .999 threshold must classify stimulus as direct');
assert.strictEqual(threshold.胸.indirect,0);
assert.ok(threshold.胸.sources.t,'source fallback must work without sourceForExercise');

console.log('muscle stimulus map regression: structured counts restored');
