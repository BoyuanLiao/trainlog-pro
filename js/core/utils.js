/**
 * TrainLog Pro shared pure utilities.
 * No DOM, LocalStorage, or mutable app-state access.
 */
(() => {
  'use strict';
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,n(v)));
  const isoToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const parseDate=s=>{const [y,m,d]=(s||'').split('-').map(Number);return new Date(y,m-1,d)};
  const isoDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const daysBetween=(a,b)=>Math.round((parseDate(b)-parseDate(a))/86400000);
  const monthKey=()=>isoToday().slice(0,7);
  const fmtDate=s=>s?`${Number(s.slice(5,7))}/${Number(s.slice(8,10))}`:'';
  const LB_PER_KG=2.2046226218;
  const normalizeWeightUnit=u=>u==='lb'?'lb':'kg';
  const toKg=(v,unit='kg')=>normalizeWeightUnit(unit)==='lb'?n(v)/LB_PER_KG:n(v);
  const fromKg=(v,unit='kg')=>normalizeWeightUnit(unit)==='lb'?n(v)*LB_PER_KG:n(v);
  function cleanWeightNumber(v){
    const x=Math.round(n(v)*10)/10;
    return Number.isInteger(x)?String(x):x.toFixed(1);
  }
  function est1rm(weight,reps){return reps>0?weight*(1+reps/30):0}

  window.TrainLogUtils=Object.freeze({
    n,clamp,isoToday,parseDate,isoDate,daysBetween,monthKey,fmtDate,
    LB_PER_KG,normalizeWeightUnit,toKg,fromKg,cleanWeightNumber,est1rm
  });
})();
