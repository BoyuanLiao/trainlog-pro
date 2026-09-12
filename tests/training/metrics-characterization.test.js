const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const utils=fs.readFileSync('js/core/utils.js','utf8');
const metrics=fs.readFileSync('js/training/metrics.js','utf8');
const ctx=vm.createContext({console,Math,Date,window:{}});
vm.runInContext(utils,ctx);
vm.runInContext(metrics,ctx);
vm.runInContext("const n=window.TrainLogUtils.n; const est1rm=window.TrainLogUtils.est1rm; const trainingMetrics=window.TrainLogTrainingMetrics; let data={settings:{includeWarmup:false},workouts:[]}; function workoutVolume(w){return trainingMetrics.workoutVolume(w,{includeWarmup:!!data.settings.includeWarmup})} function effectiveSets(w,muscle){return trainingMetrics.effectiveSets(w,muscle)} function cardioMinutes(w){return trainingMetrics.cardioMinutes(w)} function durationSeconds(w,muscle){return trainingMetrics.durationSeconds(w,muscle)} function bestSetForExercise(exId,workouts=data.workouts){return trainingMetrics.bestSetForExercise(exId,workouts)}",ctx);
const run=code=>vm.runInContext(code,ctx);

const workout={exercises:[
 {exerciseId:'chest',muscle:'胸',type:'weight_reps',sets:[{kind:'warmup',weight:20,reps:10,completed:true},{kind:'working',weight:50,reps:10,completed:true},{kind:'working',weight:60,reps:5,completed:false}]},
 {exerciseId:'uni',muscle:'背',type:'unilateral',sets:[{kind:'working',leftWeight:20,leftReps:10,rightWeight:22,rightReps:8,completed:true}]},
 {exerciseId:'cardio',muscle:'有氧',type:'cardio',cardio:{minutes:25}},
 {exerciseId:'plank',muscle:'腹部',type:'duration',sets:[{kind:'working',seconds:45,completed:true},{kind:'working',seconds:30,completed:false}]}
]};
run('data.settings.includeWarmup=false');ctx.workout=workout;
assert.equal(run('workoutVolume(workout)'),20*10+22*8+50*10,'volume excludes incomplete and warmup when setting false');
run('data.settings.includeWarmup=true');
assert.equal(run('workoutVolume(workout)'),20*10+22*8+50*10+20*10,'volume includes warmup when enabled');
assert.equal(run("effectiveSets(workout)"),3,'effective sets excludes warmup but counts completed strength+duration');
assert.equal(run("effectiveSets(workout,'胸')"),1,'muscle filter');
assert.equal(run('cardioMinutes(workout)'),25,'cardio minutes');
assert.equal(run("durationSeconds(workout)"),45,'duration seconds completed only');
assert.equal(run("durationSeconds(workout,'胸')"),0,'duration muscle filter');
assert.equal(run('est1rm(100,10)'),100*(1+10/30),'e1rm formula');
assert.equal(run('est1rm(100,0)'),0,'e1rm zero reps');

ctx.workouts=[
 {date:'2026-01-01',exercises:[{exerciseId:'chest',type:'weight_reps',sets:[{kind:'working',weight:80,reps:10,completed:true},{kind:'working',weight:90,reps:3,completed:true}]}]},
 {date:'2026-01-10',exercises:[{exerciseId:'chest',type:'weight_reps',sets:[{kind:'working',weight:85,reps:8,completed:true}]}]},
 {date:'2026-01-12',exercises:[{exerciseId:'chest',type:'cardio',sets:[{weight:999,reps:99,completed:true}]}]},
 {date:'2026-01-15',exercises:[{exerciseId:'uni2',type:'unilateral',sets:[{kind:'working',leftWeight:30,leftReps:10,rightWeight:32,rightReps:8,completed:true}]}]}
];
run('data.workouts=workouts');
const best=run("bestSetForExercise('chest')");
assert.equal(best.weight,85);assert.equal(best.reps,8);assert.equal(best.date,'2026-01-10');
const uni=run("bestSetForExercise('uni2')");
assert.equal(uni.weight,32);assert.equal(uni.reps,10,'legacy unilateral behavior uses max weight and max reps independently');
assert.equal(run("bestSetForExercise('missing')"),null);
console.log('training metrics characterization: passed');
