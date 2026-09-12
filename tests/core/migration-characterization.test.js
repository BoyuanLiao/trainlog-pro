const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const exercises = fs.readFileSync('js/data/exercises.js', 'utf8');
const migrationModule = fs.readFileSync('js/core/migration.js', 'utf8');
const ctx = vm.createContext({ console, structuredClone, Date, Math, JSON, Map, Set, window:{} });
vm.runInContext(exercises, ctx);
vm.runInContext(migrationModule, ctx);
vm.runInContext(`
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const normalizeWeightUnit=u=>u==='lb'?'lb':'kg';
const LB_PER_KG=2.2046226218;
const toKg=(v,unit='kg')=>normalizeWeightUnit(unit)==='lb'?n(v)/LB_PER_KG:n(v);
let uidSeq=0; const uid=(p='id')=>p+'_test_'+(++uidSeq);
const migrationCore=window.TrainLogMigration.create({currentSchema:18,systemExercises:SYSTEM_EXERCISES,uid,today:()=> '2026-09-13',toKg,normalizeWeightUnit,num:n});
`,ctx);
const migrate=vm.runInContext('migrationCore.migrate',ctx);
const freshData=vm.runInContext('migrationCore.freshData',ctx);
const systemCount=vm.runInContext('SYSTEM_EXERCISES.length',ctx);
const chestId=vm.runInContext("SYSTEM_EXERCISES.find(x=>x.id==='ex_chestpress').id",ctx);

function approx(actual, expected, eps=1e-6) {
  assert(Math.abs(actual - expected) <= eps, `expected ${actual} ≈ ${expected}`);
}

{
  const d = freshData();
  assert.equal(d.schemaVersion, 18);
  assert.equal(d.settings.unit, 'kg');
  assert.equal(d.settings.analysisRange, '30');
  assert.equal(d.settings.analysisTab, 'overview');
  assert.equal(d.exerciseLibrary.length, systemCount);
  assert.deepEqual(Array.from(d.workouts), []);
  assert.deepEqual(Array.from(d.snapshots), []);
}

{
  const out = migrate([{ date:'2025-01-02', name:'Legacy', exercises:[] }]);
  assert.equal(out.schemaVersion, 18);
  assert.equal(out.workouts.length, 1);
  assert.equal(out.workouts[0].name, 'Legacy');
}

{
  const out = migrate({ schemaVersion: 5, records:[{date:'2025-02-03', exercises:[]}] });
  assert.equal(out.workouts.length, 1);
  assert.equal(out.workouts[0].date, '2025-02-03');
}

{
  const out = migrate({
    schemaVersion:11,
    settings:{unit:'lb'},
    workouts:[{date:'2025-03-01',exercises:[{exerciseId:chestId,name:'胸推',muscle:'胸',type:'weight_reps',sets:[{weight:220,reps:5,leftWeight:110,rightWeight:110,completed:true}]}]}],
    activeWorkout:{exercises:[{inputUnit:'lb',sets:[{weight:220,leftWeight:110,rightWeight:110}]}]},
    strengthGoals:[{exerciseId:chestId,weight:220}]
  });
  approx(out.workouts[0].exercises[0].sets[0].weight, 220/2.2046226218);
  approx(out.activeWorkout.exercises[0].sets[0].weight, 220/2.2046226218);
  approx(out.strengthGoals[0].weight, 220/2.2046226218);
  assert.equal(out.settings.unit, 'lb');
}

{
  const out = migrate({
    schemaVersion:12,
    settings:{unit:'lb'},
    workouts:[{date:'2025-03-02',exercises:[{exerciseId:chestId,type:'weight_reps',sets:[{weight:100,reps:5,completed:true}]}]}]
  });
  assert.equal(out.workouts[0].exercises[0].sets[0].weight, 100);
}

{
  const out = migrate({schemaVersion:5,settings:{},workouts:[]});
  assert.equal(out.settings.tutorialCompleted, true);
  assert.equal(out.settings.workoutTutorialCompleted, true);
  assert.deepEqual(JSON.parse(JSON.stringify(out.settings.pageTutorials)), {home:true,trainLanding:true,workout:true,records:true,analysis:true,settings:true});
}

{
  const out = migrate({schemaVersion:18,settings:{pageTutorials:{home:true}},workouts:[]});
  assert.equal(out.settings.pageTutorials.home, true);
  assert.equal(out.settings.pageTutorials.analysis, false);
  assert.equal(out.settings.pageTutorials.settings, false);
}

{
  const out = migrate({schemaVersion:18,exerciseLibrary:[{id:'ex_chestpress',name:'我的胸推名稱',system:true,nameEn:'',pattern:'',equipmentId:''}],workouts:[]});
  const ex = out.exerciseLibrary.find(x=>x.id==='ex_chestpress');
  assert.equal(ex.name, '我的胸推名稱');
  assert.ok(ex.nameEn);
  assert.ok(ex.pattern);
  assert.ok(ex.equipmentId);
}

{
  const out = migrate({schemaVersion:5,workouts:[{date:'2025-04-01',exercises:[{name:'自訂老動作',muscle:'背',type:'weight_reps',sets:[]}]}]});
  const id = out.workouts[0].exercises[0].exerciseId;
  const ex = out.exerciseLibrary.find(x=>x.id===id);
  assert(ex);
  assert.equal(ex.name, '自訂老動作');
}

{
  const out = migrate({schemaVersion:18,bodyStatus:[{date:'2025-01-01',entries:[{k:'sleep'}]}],trash:[{id:'x'}],snapshots:[{id:'s',payload:{a:1}}],workouts:[]});
  assert.equal(out.bodyStatus.length,1);
  assert.equal(out.trash.length,1);
  assert.equal(out.snapshots.length,1);
  assert.equal(out.schemaVersion,18);
}

console.log('migration characterization: 10 cases passed');
