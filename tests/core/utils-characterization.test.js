const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('js/core/utils.js','utf8');
const ctx=vm.createContext({Date,Math,Number,String,console,window:{}});
vm.runInContext(source,ctx);
const get=name=>vm.runInContext('window.TrainLogUtils.'+name,ctx);
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
