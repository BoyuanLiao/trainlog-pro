const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const app=fs.readFileSync('js/app.js','utf8');

function statementSource(prefix){
  const start=app.indexOf(prefix);
  if(start<0)throw new Error('Missing '+prefix);
  let i=start,state='normal',escaped=false,depthParen=0,depthBrace=0,depthBracket=0;
  for(;i<app.length;i++){
    const ch=app[i],next=app[i+1]||'';
    if(state==='line'){if(ch==='\n')state='normal';continue}
    if(state==='block'){if(ch==='*'&&next==='/'){state='normal';i++}continue}
    if(state==='single'||state==='double'||state==='template'){
      if(escaped){escaped=false;continue}
      if(ch==='\\'){escaped=true;continue}
      if((state==='single'&&ch==="'")||(state==='double'&&ch==='"')||(state==='template'&&ch==='`'))state='normal';
      continue
    }
    if(ch==='/'&&next==='/'){state='line';i++;continue}
    if(ch==='/'&&next==='*'){state='block';i++;continue}
    if(ch==="'"){state='single';continue}
    if(ch==='"'){state='double';continue}
    if(ch==='`'){state='template';continue}
    if(ch==='(')depthParen++; else if(ch===')')depthParen--;
    else if(ch==='{')depthBrace++; else if(ch==='}')depthBrace--;
    else if(ch==='[')depthBracket++; else if(ch===']')depthBracket--;
    else if(ch===';'&&depthParen===0&&depthBrace===0&&depthBracket===0)return app.slice(start,i+1);
  }
  throw new Error('Unclosed '+prefix);
}
function functionSource(name){
  const re=new RegExp('function\\s+'+name+'\\s*\\('),m=re.exec(app);if(!m)throw new Error('Missing '+name);
  const start=m.index,brace=app.indexOf('{',m.index+m[0].length);let depth=0,state='normal',escaped=false;
  for(let i=brace;i<app.length;i++){
    const ch=app[i],next=app[i+1]||'';
    if(state==='line'){if(ch==='\n')state='normal';continue}
    if(state==='block'){if(ch==='*'&&next==='/'){state='normal';i++}continue}
    if(state==='single'||state==='double'||state==='template'){
      if(escaped){escaped=false;continue} if(ch==='\\'){escaped=true;continue}
      if((state==='single'&&ch==="'")||(state==='double'&&ch==='"')||(state==='template'&&ch==='`'))state='normal';continue
    }
    if(ch==='/'&&next==='/'){state='line';i++;continue} if(ch==='/'&&next==='*'){state='block';i++;continue}
    if(ch==="'"){state='single';continue} if(ch==='"'){state='double';continue} if(ch==='`'){state='template';continue}
    if(ch==='{')depth++; if(ch==='}'&&--depth===0)return app.slice(start,i+1);
  }
  throw new Error('Unclosed '+name);
}

const ctx=vm.createContext({Date,Math,Number,String,console});
for(const prefix of [
  'const n=', 'const clamp=', 'const isoToday=', 'const parseDate=', 'const isoDate=', 'const daysBetween=', 'const monthKey=', 'const fmtDate=',
  'const LB_PER_KG=', 'const normalizeWeightUnit=', 'const toKg=', 'const fromKg='
]) vm.runInContext(statementSource(prefix),ctx);
vm.runInContext(functionSource('cleanWeightNumber'),ctx);
vm.runInContext(functionSource('est1rm'),ctx);

const get=name=>vm.runInContext(name,ctx);
const n=get('n'),clamp=get('clamp'),parseDate=get('parseDate'),isoDate=get('isoDate'),daysBetween=get('daysBetween'),fmtDate=get('fmtDate');
const normalizeWeightUnit=get('normalizeWeightUnit'),toKg=get('toKg'),fromKg=get('fromKg'),cleanWeightNumber=get('cleanWeightNumber'),est1rm=get('est1rm');
const LB_PER_KG=get('LB_PER_KG');
const approx=(a,b,e=1e-9)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);

assert.equal(n('12.5'),12.5);assert.equal(n('x'),0);assert.equal(n(Infinity),0);assert.equal(n(null),0);
assert.equal(clamp(5,0,10),5);assert.equal(clamp(-2,0,10),0);assert.equal(clamp(12,0,10),10);assert.equal(clamp('x',1,3),1);
assert.equal(isoDate(parseDate('2026-09-13')),'2026-09-13');assert.equal(daysBetween('2026-09-01','2026-09-13'),12);assert.equal(daysBetween('2026-09-13','2026-09-01'),-12);
assert.equal(fmtDate('2026-09-03'),'9/3');assert.equal(fmtDate(''),'');
assert.equal(normalizeWeightUnit('lb'),'lb');assert.equal(normalizeWeightUnit('kg'),'kg');assert.equal(normalizeWeightUnit('LB'),'kg');
approx(toKg(220,'lb'),220/LB_PER_KG);approx(fromKg(100,'lb'),100*LB_PER_KG);assert.equal(toKg(100,'kg'),100);assert.equal(fromKg(100,'kg'),100);
assert.equal(cleanWeightNumber(10),'10');assert.equal(cleanWeightNumber(10.04),'10');assert.equal(cleanWeightNumber(10.05),'10.1');assert.equal(cleanWeightNumber('x'),'0');
assert.equal(est1rm(100,0),0);assert.equal(est1rm(100,10),100*(1+10/30));assert.equal(est1rm(60,5),70);
console.log('utils characterization: 24 assertions passed');
