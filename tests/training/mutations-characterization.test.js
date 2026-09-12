const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const app=fs.readFileSync('js/app.js','utf8');
function functionSource(name){
  const re=new RegExp('function\\s+'+name+'\\s*\\(');const m=re.exec(app);if(!m)throw new Error('Missing '+name);
  const start=m.index,brace=app.indexOf('{',m.index+m[0].length);let depth=0,state='normal',escaped=false;
  for(let i=brace;i<app.length;i++){
    const ch=app[i],nx=app[i+1]||'';
    if(state==='line'){if(ch==='\n')state='normal';continue}
    if(state==='block'){if(ch==='*'&&nx==='/'){state='normal';i++;}continue}
    if(['single','double','template'].includes(state)){
      if(escaped){escaped=false;continue}if(ch==='\\'){escaped=true;continue}
      if((state==='single'&&ch==="'")||(state==='double'&&ch==='"')||(state==='template'&&ch==='`'))state='normal';continue;
    }
    if(ch==='/'&&nx==='/'){state='line';i++;continue}if(ch==='/'&&nx==='*'){state='block';i++;continue}
    if(ch==="'"){state='single';continue}if(ch==='"'){state='double';continue}if(ch==='`'){state='template';continue}
    if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0)return app.slice(start,i+1)}
  }
  throw new Error('Unclosed '+name);
}

const ctx=vm.createContext({console,Math,Date,JSON});
vm.runInContext(`
let uidSeq=0;
const uid=p=>p+'_test_'+(++uidSeq);
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const normalizeWeightUnit=u=>u==='lb'?'lb':'kg';
const toKg=(v,unit='kg')=>unit==='lb'?n(v)/2.2046226218:n(v);
let selectorMap={};
const $$=s=>selectorMap[s]||[];
const $=s=>({onclick:null});
let saveCalls=0,timers=[],toasts=[],confirmResult=true;
function saveActiveOnly(){saveCalls++}
function exerciseInputUnit(e){return normalizeWeightUnit(e?.inputUnit||'kg')}
function getExercise(){return {name:'Bench',rest:120}}
function startTimer(sec,label){timers.push([sec,label])}
function toast(msg){toasts.push(msg)}
function confirm(){return confirmResult}
function openReplaceModal(){}
function showExerciseDetail(){}
function openExercisePicker(){}
function makeSessionExercise(){return {}}
function openReorderModal(){}
function openSessionMeta(){}
function openTrainingDrawer(){}
function renderTimer(){}
function renderTrainingDrawerVisibility(){}
function maybeStartWorkoutTutorial(){}
function finishWorkout(){}
let timerHidden=false,timerEnd=0;
let data={settings:{trainingIntervalTimer:true,defaultRest:90},activeWorkout:{exercises:[]}};
`,ctx);
vm.runInContext(functionSource('bindSessionEvents'),ctx);
const run=code=>vm.runInContext(code,ctx);
function bindOne(selector,dataset){
  ctx.button={dataset:{...dataset}};
  run(`selectorMap={};selectorMap[${JSON.stringify(selector)}]=[button];bindSessionEvents()`);
  return ctx.button;
}
function setExercise(ex){ctx.ex=JSON.parse(JSON.stringify(ex));run('data.activeWorkout={exercises:[ex]};saveCalls=0;timers=[];toasts=[]')}

setExercise({exerciseId:'ex1',type:'unilateral',sets:[{id:'old',kind:'failure',weight:50,reps:7,rir:1,rpe:9,seconds:20,leftWeight:20,rightWeight:22,leftReps:10,rightReps:8,completed:true}]});
let b=bindOne('#activeWorkout [data-addset]',{addset:'0'});b.onclick();
let added=run('data.activeWorkout.exercises[0].sets[1]');
assert.ok(added.id.startsWith('s_test_'));
assert.equal(added.kind,'working');assert.equal(added.weight,50);assert.equal(added.reps,7);assert.equal(added.seconds,20);
assert.equal(added.leftWeight,20);assert.equal(added.rightWeight,22);assert.equal(added.leftReps,10);assert.equal(added.rightReps,8);
assert.equal(added.rir,'');assert.equal(added.rpe,'');assert.equal(added.completed,false);assert.equal(run('saveCalls'),1);

setExercise({sets:[{id:'a'},{id:'b'},{id:'c'}]});
b=bindOne('#activeWorkout [data-delset]',{delset:'0,1'});b.onclick();
assert.deepEqual(JSON.parse(JSON.stringify(run('data.activeWorkout.exercises[0].sets.map(x=>x.id)'))),['a','c']);

setExercise({sets:[{reps:1}]});
b=bindOne('#activeWorkout [data-delta]',{delta:'0,0,reps,-5'});b.onclick();assert.equal(run('data.activeWorkout.exercises[0].sets[0].reps'),0);
b=bindOne('#activeWorkout [data-delta]',{delta:'0,0,reps,3'});b.onclick();assert.equal(run('data.activeWorkout.exercises[0].sets[0].reps'),3);

setExercise({inputUnit:'lb',sets:[{weight:10}]});
b=bindOne('#activeWorkout [data-weight-delta]',{weightDelta:'0,0,5'});b.onclick();
assert.ok(Math.abs(run('data.activeWorkout.exercises[0].sets[0].weight')-(10+5/2.2046226218))<1e-9);

setExercise({sets:[
 {id:'p',kind:'failure',weight:70,reps:9,seconds:33,leftWeight:15,rightWeight:16,leftReps:11,rightReps:10,rir:1,rpe:9,completed:true},
 {id:'c',kind:'working',weight:1,reps:1,seconds:1,leftWeight:1,rightWeight:1,leftReps:1,rightReps:1,rir:4,rpe:'',completed:false}
]});
b=bindOne('#activeWorkout [data-copy]',{copy:'0,1'});b.onclick();
let copied=run('data.activeWorkout.exercises[0].sets[1]');
for(const k of ['weight','reps','seconds','leftWeight','rightWeight','leftReps','rightReps'])assert.equal(copied[k],run(`data.activeWorkout.exercises[0].sets[0].${k}`));
assert.equal(copied.id,'c');assert.equal(copied.kind,'working');assert.equal(copied.rir,4);assert.equal(copied.completed,false);

setExercise({exerciseId:'ex1',nameSnapshot:'Bench',sets:[{completed:false}]});
b=bindOne('#activeWorkout [data-complete]',{complete:'0,0'});b.onclick();
assert.equal(run('data.activeWorkout.exercises[0].sets[0].completed'),true);
assert.equal(run('timers.length'),1);assert.equal(run('timers[0][0]'),120);assert.ok(run('timers[0][1]').includes('準備第 2 組'));
b=bindOne('#activeWorkout [data-complete]',{complete:'0,0'});b.onclick();
assert.equal(run('data.activeWorkout.exercises[0].sets[0].completed'),false);assert.equal(run('timers.length'),1,'un-completing does not start another timer');

setExercise({sets:[{kind:'working'}]});ctx.kindSelect={dataset:{kind:'0,0'},value:'drop'};run(`selectorMap={};selectorMap['#activeWorkout [data-kind]']=[kindSelect];bindSessionEvents()`);ctx.kindSelect.onchange();
assert.equal(run('data.activeWorkout.exercises[0].sets[0].kind'),'drop');

for(const [feel,rir] of [['easy',4],['ok',2],['hard',0]]){
  setExercise({sets:[{rir:'',rpe:8}]});b=bindOne('#activeWorkout [data-simple-effort]',{simpleEffort:`0,0,${feel}`});b.onclick();
  assert.equal(run('data.activeWorkout.exercises[0].sets[0].rir'),rir);assert.equal(run("data.activeWorkout.exercises[0].sets[0].rpe"),'');
}

run(`data.activeWorkout={exercises:[{id:'a'},{id:'b'}]};confirmResult=true;saveCalls=0`);
b=bindOne('#activeWorkout [data-removeex]',{removeex:'0'});b.onclick();
assert.deepEqual(JSON.parse(JSON.stringify(run('data.activeWorkout.exercises.map(x=>x.id)'))),['b']);assert.equal(run('saveCalls'),1);
run(`data.activeWorkout={exercises:[{id:'a'},{id:'b'}]};confirmResult=false;saveCalls=0`);
b=bindOne('#activeWorkout [data-removeex]',{removeex:'0'});b.onclick();
assert.deepEqual(JSON.parse(JSON.stringify(run('data.activeWorkout.exercises.map(x=>x.id)'))),['a','b']);assert.equal(run('saveCalls'),0);

console.log('training mutations characterization: passed');
