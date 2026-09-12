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
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const LB_PER_KG=2.2046226218;
const fromKg=(v,unit='kg')=>unit==='lb'?n(v)*LB_PER_KG:n(v);
const cleanWeightNumber=v=>{const x=Math.round(n(v)*10)/10;return Number.isInteger(x)?String(x):x.toFixed(1)};
let exMeta=null;
let data={settings:{intensity:'RIR'},workouts:[]};
function getExercise(id){return exMeta&&exMeta.id===id?exMeta:null}
function getLastExerciseRecord(exId,beforeDate='9999-12-31'){
  const ws=[...data.workouts].filter(w=>w.date<beforeDate).sort((a,b)=>b.date.localeCompare(a.date));
  for(const w of ws){const e=(w.exercises||[]).find(x=>x.exerciseId===exId);if(e)return{workout:w,exercise:e}}
  return null;
}
function exerciseInputUnit(e){return e?.inputUnit==='lb'?'lb':'kg'}
function machineIncrementForUnit(ex,unit){const base=Math.max(.1,n(ex?.increment)||2.5);if(unit==='lb')return Math.max(5,Math.round(fromKg(base,'lb')/5)*5);return Math.round(base*10)/10}
let trainingProgression=null;
globalThis.window=globalThis;
`,ctx);
if(fs.existsSync('js/training/progression.js')){
  vm.runInContext(fs.readFileSync('js/training/progression.js','utf8'),ctx);
  vm.runInContext('trainingProgression=window.TrainLogTrainingProgression',ctx);
}
vm.runInContext(functionSource('progressionAdvice'),ctx);
const run=code=>vm.runInContext(code,ctx);

function setCase(ex,sessions=[],intensity='RIR'){
  ctx.caseEx=ex?JSON.parse(JSON.stringify(ex)):null;
  ctx.caseSessions=JSON.parse(JSON.stringify(sessions));
  ctx.caseIntensity=intensity;
  run(`exMeta=caseEx;data={settings:{intensity:caseIntensity},workouts:caseSessions}`);
}
function workout(date,exercise){return {id:'w_'+date,date,status:'completed',exercises:[exercise]}}
function strengthExercise(id,sets,inputUnit='kg',type='weight_reps'){return {exerciseId:id,type,inputUnit,sets}}
function set({weight=50,reps=10,rir='',rpe='',kind='working',completed=true,leftWeight=0,rightWeight=0,leftReps=0,rightReps=0,seconds=0}={}){
  return {weight,reps,rir,rpe,kind,completed,leftWeight,rightWeight,leftReps,rightReps,seconds};
}

setCase(null,[]);
assert.equal(run("progressionAdvice('missing')"),null);

const base={id:'bench',name:'Bench',type:'weight_reps',repMin:8,repMax:12,intMin:2,increment:2.5};
setCase(base,[]);
let r=run("progressionAdvice('bench')");
assert.equal(r.state,'new');assert.ok(r.text.includes('第一次紀錄'));

setCase(base,[workout('2026-09-12',strengthExercise('bench',[set({reps:12,rir:2}),set({reps:12,rir:3})]))]);
r=run("progressionAdvice('bench')");assert.equal(r.state,'up');assert.ok(r.text.includes('建議下次嘗試增加'));

setCase(base,[workout('2026-09-12',strengthExercise('bench',[set({reps:12,rir:1}),set({reps:12,rir:3})]))]);
r=run("progressionAdvice('bench')");assert.equal(r.state,'same');

setCase(base,[workout('2026-09-12',strengthExercise('bench',[set({reps:6,rir:1}),set({reps:9,rir:2})]))]);
r=run("progressionAdvice('bench')");assert.equal(r.state,'down');assert.ok(r.text.includes('低於目標範圍'));

setCase(base,[workout('2026-09-12',strengthExercise('bench',[set({reps:9,rir:2}),set({reps:10,rir:2})]))]);
r=run("progressionAdvice('bench')");assert.equal(r.state,'same');assert.ok(r.text.includes('維持重量'));

setCase(base,[workout('2026-09-12',strengthExercise('bench',[
  set({reps:12,rir:3,kind:'warmup'}),set({reps:12,rir:3,completed:false}),set({reps:9,rir:2})
]))]);
r=run("progressionAdvice('bench')");assert.equal(r.state,'same');

setCase(base,[workout('2026-09-12',strengthExercise('bench',[set({reps:12,rpe:8.5}),set({reps:12,rpe:8})]))],'RPE');
r=run("progressionAdvice('bench')");assert.equal(r.state,'up');
setCase(base,[workout('2026-09-12',strengthExercise('bench',[set({reps:12,rpe:9}),set({reps:12,rpe:8})]))],'RPE');
r=run("progressionAdvice('bench')");assert.equal(r.state,'same');

const duration={id:'plank',name:'Plank',type:'duration',repMin:30,repMax:60,increment:5};
setCase(duration,[workout('2026-09-12',strengthExercise('plank',[set({seconds:60,reps:0}),set({seconds:65,reps:0})],'kg','duration'))]);
r=run("progressionAdvice('plank')");assert.equal(r.state,'up');assert.ok(r.text.includes('已達目標上限'));
setCase(duration,[workout('2026-09-12',strengthExercise('plank',[set({seconds:40,reps:0}),set({seconds:50,reps:0})],'kg','duration'))]);
r=run("progressionAdvice('plank')");assert.equal(r.state,'same');

const cardio={id:'run',name:'Run',type:'cardio',repMin:0,repMax:0};
setCase(cardio,[workout('2026-09-12',{exerciseId:'run',type:'cardio',inputUnit:'kg',sets:[],cardio:{minutes:30}})]);
assert.equal(run("progressionAdvice('run')"),null,'current cardio path returns null when no sets exist');

console.log('progression characterization: passed');
