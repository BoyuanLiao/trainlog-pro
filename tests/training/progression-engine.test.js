const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const ctx=vm.createContext({console,Math,Date,JSON});
vm.runInContext('globalThis.window=globalThis',ctx);
vm.runInContext(fs.readFileSync('js/training/progression.js','utf8'),ctx);
const engine=ctx.TrainLogTrainingProgression;

const ex={id:'bench',name:'Bench',type:'weight_reps',repMin:8,repMax:12,intMin:2,increment:2.5};
const opts={
  intensity:'RIR',
  inputUnitForExercise:e=>e.inputUnit==='lb'?'lb':'kg',
  incrementForUnit:(exercise,unit)=>unit==='lb'?5:(exercise.increment||2.5),
  cleanNumber:v=>String(Math.round(Number(v)*10)/10)
};
function s({weight=50,reps=10,rir='',rpe='',kind='working',completed=true,leftWeight=0,rightWeight=0,leftReps=0,rightReps=0,seconds=0}={}){
  return {weight,reps,rir,rpe,kind,completed,leftWeight,rightWeight,leftReps,rightReps,seconds};
}
function e(id,sets,type='weight_reps',extra={}){return {exerciseId:id,type,inputUnit:'kg',sets,...extra}}
function w(date,exercise){return {id:'w_'+date,date,status:'completed',exercises:[exercise]}}

let r=engine.recommend(ex,[],opts);
assert.equal(r.state,'new');assert.equal(r.action,'new');assert.equal(r.sessionsUsed,0);

r=engine.recommend(ex,[w('2026-09-01',e('bench',[s({reps:9,rir:2}),s({reps:10,rir:2})]))],opts);
assert.equal(r.state,'same');assert.equal(r.action,'add_reps');assert.equal(r.sessionsUsed,1);

r=engine.recommend(ex,[w('2026-09-01',e('bench',[s({reps:12,rir:2}),s({reps:12,rir:3})]))],opts);
assert.equal(r.state,'up');assert.equal(r.action,'increase_load');

r=engine.recommend(ex,[w('2026-09-01',e('bench',[s({reps:6,rir:1}),s({reps:9,rir:2})]))],opts);
assert.equal(r.state,'down');assert.equal(r.action,'reduce_load');

const stagnant=[
  w('2026-09-01',e('bench',[s({weight:50,reps:10,rir:2}),s({weight:50,reps:10,rir:2})])),
  w('2026-09-05',e('bench',[s({weight:50,reps:10,rir:2}),s({weight:50,reps:10,rir:2})])),
  w('2026-09-10',e('bench',[s({weight:50,reps:10,rir:2}),s({weight:50,reps:10,rir:2})]))
];
r=engine.recommend(ex,stagnant,opts);
assert.equal(r.state,'same');assert.equal(r.action,'plateau');assert.equal(r.plateau,true);assert.equal(r.sessionsUsed,3);
assert.ok(r.text.includes('最近 3 次'));

const progressing=[
  w('2026-09-01',e('bench',[s({weight:50,reps:8,rir:2}),s({weight:50,reps:8,rir:2})])),
  w('2026-09-05',e('bench',[s({weight:50,reps:9,rir:2}),s({weight:50,reps:9,rir:2})])),
  w('2026-09-10',e('bench',[s({weight:50,reps:10,rir:2}),s({weight:50,reps:10,rir:2})]))
];
r=engine.recommend(ex,progressing,opts);
assert.equal(r.action,'add_reps');assert.equal(r.plateau,false);

const newestTop=[...progressing,w('2026-09-12',e('bench',[s({weight:50,reps:12,rir:2}),s({weight:50,reps:12,rir:2})]))];
r=engine.recommend(ex,newestTop,opts);
assert.equal(r.action,'increase_load');assert.equal(r.state,'up');assert.equal(r.sessionsUsed,4);

const hardStagnant=[
  w('2026-09-01',e('bench',[s({weight:50,reps:8,rir:0}),s({weight:50,reps:8,rir:0})])),
  w('2026-09-05',e('bench',[s({weight:50,reps:8,rir:0}),s({weight:50,reps:8,rir:0})])),
  w('2026-09-10',e('bench',[s({weight:50,reps:8,rir:0}),s({weight:50,reps:8,rir:0})]))
];
r=engine.recommend(ex,hardStagnant,opts);
assert.equal(r.action,'plateau');assert.equal(r.hardTrend,true);assert.ok(r.text.includes('恢復')||r.text.includes('降重'));

const unilateral={id:'split',name:'Split squat',type:'unilateral',repMin:8,repMax:12,intMin:2,increment:2.5};
r=engine.recommend(unilateral,[w('2026-09-10',e('split',[
  s({reps:0,leftWeight:20,rightWeight:20,leftReps:12,rightReps:12,rir:2}),
  s({reps:0,leftWeight:20,rightWeight:20,leftReps:12,rightReps:12,rir:2})
],'unilateral'))],opts);
assert.equal(r.action,'increase_load','unilateral progression uses the limiting side reps');

const hist=engine.historyForExercise('bench',[
  w('2026-09-01',e('bench',[s()])),w('2026-09-03',e('bench',[s()])),w('2026-09-02',e('bench',[s()])),
  w('2026-09-05',e('bench',[s()])),w('2026-09-04',e('bench',[s()])),w('2026-09-06',e('bench',[s()])),
  w('2026-09-07',e('other',[s()]))
],5);
assert.deepEqual(JSON.parse(JSON.stringify(hist.map(x=>x.date))),['2026-09-06','2026-09-05','2026-09-04','2026-09-03','2026-09-02']);

const duration={id:'plank',name:'Plank',type:'duration',repMin:30,repMax:60,increment:5};
r=engine.recommend(duration,[w('2026-09-10',e('plank',[s({seconds:65,reps:0}),s({seconds:60,reps:0})],'duration'))],opts);
assert.equal(r.action,'increase_time');assert.equal(r.state,'up');

console.log('progression engine: passed');
