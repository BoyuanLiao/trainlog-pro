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
    if(state==='block'){if(ch==='*'&&nx==='/'){state='normal';i++}continue}
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

const calls=[];
const ctx=vm.createContext({console,Math,Date,JSON});
vm.runInContext(`
let uidSeq=0;
const uid=p=>p+'_test_'+(++uidSeq);
const isoToday=()=> '2026-09-13';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
let data={templates:[],workouts:[],activeWorkout:null};
const calls=[];
function save(reason,snapshot){calls.push(['save',reason,snapshot])}
function openSessionMeta(first){calls.push(['meta',first])}
function goPage(page){calls.push(['page',page])}
function getExercise(id){return {id,name:'Exercise '+id,muscle:'胸',type:'weight_reps'}}
function makeSessionExercise(ex,date){return {exerciseId:ex.id,nameSnapshot:ex.name,muscle:ex.muscle,type:ex.type,dateMade:date,sets:[]}}
function validateWorkout(){return []}
function confirm(){return true}
function alert(msg){calls.push(['alert',msg])}
function snapshot(reason){calls.push(['snapshot',reason])}
function todayBodyStatus(date){return {date,entries:[{type:'note',level:1}]}}
function effectiveSets(){return 0}
function fmtKg(){return '0 kg'}
function workoutVolume(){return 0}
function cardioMinutes(){return 0}
function countPRsInWorkout(){return 0}
function esc(v){return String(v??'')}
function openModal(title){calls.push(['modal',title])}
`,ctx);
for(const name of ['startBlank','startTemplate','finishWorkout'])vm.runInContext(functionSource(name),ctx);
const run=code=>vm.runInContext(code,ctx);

run("startBlank('2026-09-10')");
let blank=run('data.activeWorkout');
assert.equal(blank.date,'2026-09-10');
assert.equal(blank.name,'自由訓練');
assert.equal(blank.status,'active');
assert.equal(blank.endedAt,'');
assert.deepEqual(JSON.parse(JSON.stringify(blank.exercises)),[]);
assert.ok(blank.startedAt);
assert.equal(run("calls.some(x=>x[0]==='save'&&x[1]==='開始訓練'&&x[2]===true)"),true);
assert.equal(run("calls.some(x=>x[0]==='meta'&&x[1]===true)"),true);
assert.equal(run("calls.some(x=>x[0]==='page'&&x[1]==='trainPage')"),true);

run(`data.activeWorkout=null;calls.length=0;data.templates=[{id:'tpl1',name:'Push Day',dayMeta:{focus:'push'},items:[{exerciseId:'ex1'}]}]`);
run("startTemplate('tpl1','2026-09-11')");
let templated=run('data.activeWorkout');
assert.equal(templated.name,'Push Day');
assert.equal(templated.date,'2026-09-11');
assert.equal(templated.status,'active');
assert.equal(templated.exercises.length,1);
assert.equal(templated.exercises[0].dateMade,'2026-09-11');
assert.equal(templated.programDayMeta.focus,'push');
run("data.templates[0].dayMeta.focus='changed'");
assert.equal(run('data.activeWorkout.programDayMeta.focus'),'push','template metadata must be cloned');

run("calls.length=0;data.activeWorkout={id:'existing',date:'2026-09-12',name:'Existing',status:'active',exercises:[]}");
run("startTemplate('tpl1','2026-09-13')");
assert.equal(run('data.activeWorkout.id'),'existing','existing active workout is not overwritten by template start');
assert.equal(run("calls.filter(x=>x[0]==='save').length"),0);
assert.equal(run("calls.some(x=>x[0]==='page'&&x[1]==='trainPage')"),true);

run(`calls.length=0;data.workouts=[{id:'old',date:'2026-09-01'}];data.activeWorkout={id:'new',date:'2026-09-13',name:'Workout',duration:0,status:'active',startedAt:new Date(Date.now()-31*60000).toISOString(),endedAt:'',notes:'',exercises:[]}`);
run('finishWorkout()');
assert.equal(run('data.activeWorkout'),null);
assert.equal(run('data.workouts.length'),2);
assert.equal(run("data.workouts.find(x=>x.id==='new').status"),'completed');
assert.ok(run("data.workouts.find(x=>x.id==='new').endedAt"));
assert.ok(run("data.workouts.find(x=>x.id==='new').duration")>=30);
assert.equal(run("data.workouts.find(x=>x.id==='new').bodyStatusSnapshot.entries.length"),1);
assert.equal(run("calls.some(x=>x[0]==='save'&&x[1]==='完成訓練'&&x[2]===true)"),true);
assert.equal(run("data.workouts[0].id"),'new','completed workouts remain date-desc sorted');

run(`calls.length=0;data.workouts=[{id:'edit1',date:'2026-08-01',name:'Original',duration:50,status:'completed',exercises:[]},{id:'newer',date:'2026-09-01',name:'Newer',duration:20,status:'completed',exercises:[]}];data.activeWorkout={id:'copy',editingWorkoutId:'edit1',date:'2026-09-05',name:'Edited',duration:2000,status:'active',startedAt:'',endedAt:'',exercises:[]}`);
run('finishWorkout()');
assert.equal(run('data.activeWorkout'),null);
assert.equal(run('data.workouts.length'),2,'history edit replaces rather than appends');
assert.equal(run("data.workouts.find(x=>x.id==='edit1').name"),'Edited');
assert.equal(run("data.workouts.find(x=>x.id==='edit1').status"),'completed');
assert.equal(run("data.workouts.find(x=>x.id==='edit1').duration"),1440,'history edit clamps duration');
assert.equal(run("'editingWorkoutId' in data.workouts.find(x=>x.id==='edit1')"),false);
assert.equal(run("calls.some(x=>x[0]==='snapshot'&&x[1]==='歷史訓練編輯前')"),true);
assert.equal(run("calls.some(x=>x[0]==='save'&&x[1]==='編輯訓練內容'&&x[2]===false)"),true);

console.log('training lifecycle characterization: passed');
