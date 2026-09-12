/** TrainLog Pro progress / plateau analysis. Pure logic only. */
(()=>{
  'use strict';
  const num=v=>{const x=Number(v);return Number.isFinite(x)?x:0};

  function comparePct(cur,prev){
    cur=num(cur);prev=num(prev);
    if(prev===0)return cur===0?null:{pct:null,dir:'up',text:'前期 0'};
    const pct=(cur-prev)/Math.abs(prev)*100;
    return{pct,dir:Math.abs(pct)<1?'same':pct>0?'up':'down',text:`${pct>0?'+':''}${Math.round(pct)}%`};
  }

  function progressSignals(prev,cur){
    const signals=[];
    if(!prev||!cur||prev.type!==cur.type)return signals;
    if(cur.type==='cardio'){
      if(num(cur.minutes)>num(prev.minutes)+2)signals.push({key:'time',text:'有氧時間增加'});
      if(num(cur.distance)>num(prev.distance)+.1)signals.push({key:'distance',text:'距離增加'});
      if(num(cur.speed)>num(prev.speed)+.2)signals.push({key:'speed',text:'速度增加'});
      return signals;
    }
    if(cur.type==='duration'){
      if(num(cur.maxSeconds)>num(prev.maxSeconds)+2)signals.push({key:'time',text:'持續時間增加'});
      return signals;
    }
    if(num(cur.maxWeight)>num(prev.maxWeight)+.001)signals.push({key:'weight',text:'重量增加'});
    const curRep=cur.repByWeight||{},prevRep=prev.repByWeight||{};
    const common=Object.keys(curRep).filter(k=>Object.prototype.hasOwnProperty.call(prevRep,k));
    if(common.some(k=>num(curRep[k])>num(prevRep[k])))signals.push({key:'reps',text:'同重量次數增加'});
    if(num(prev.bestE1rm)>0&&num(cur.bestE1rm)>num(prev.bestE1rm)*1.015)signals.push({key:'e1rm',text:'估算力量提高'});
    if(num(prev.volume)>0&&num(cur.volume)>num(prev.volume)*1.03)signals.push({key:'volume',text:'完成量增加'});
    const similarPerf=num(prev.bestE1rm)>0&&Math.abs(num(cur.bestE1rm)-num(prev.bestE1rm))/num(prev.bestE1rm)<=.02;
    if(similarPerf&&prev.rir!=null&&cur.rir!=null&&num(cur.rir)-num(prev.rir)>=.8)signals.push({key:'effort',text:'相近表現更有餘裕'});
    if(similarPerf&&prev.rpe!=null&&cur.rpe!=null&&num(prev.rpe)-num(cur.rpe)>=.8)signals.push({key:'effort',text:'相近表現更輕鬆'});
    return signals;
  }

  function overloadSummaryFromSessions(sessions){
    const ss=sessions||[];
    if(ss.length<2)return{count:0,transitions:0,lastSignals:[],sessions:ss};
    const recent=ss.slice(-5),transitions=[];let count=0;
    for(let i=1;i<recent.length;i++){
      const signals=progressSignals(recent[i-1],recent[i]);
      if(signals.length)count++;
      transitions.push({date:recent[i].date,signals});
    }
    return{count,transitions:Math.max(0,recent.length-1),lastSignals:transitions.at(-1)?.signals||[],sessions:ss};
  }

  function plateauFromSessions(sessions){
    const ss=(sessions||[]).filter(s=>!['cardio','duration'].includes(s.type));
    if(ss.length<4)return{state:'insufficient',text:'至少需要 4 次可比較的訓練才能判斷進步是否趨緩。'};
    const last=ss.slice(-5),first=last[0],end=last.at(-1),signals=[];
    for(let i=1;i<last.length;i++)signals.push(...progressSignals(last[i-1],last[i]));
    const strong=new Set(signals.map(x=>x.key));
    const e1rmGain=num(first.bestE1rm)>0?(num(end.bestE1rm)-num(first.bestE1rm))/num(first.bestE1rm):0;
    const volumeGain=num(first.volume)>0?(num(end.volume)-num(first.volume))/num(first.volume):0;
    const improving=strong.has('weight')||strong.has('reps')||e1rmGain>.02||volumeGain>.05||strong.has('effort');
    if(improving)return{state:'progress',text:'最近幾次仍有重量、次數、估算力量、完成量或主觀餘裕的進步訊號。'};
    return{state:'slow',text:`最近 ${last.length} 次在重量、次數、估算力量與完成量上都沒有明顯改善，近期進步趨勢可能趨緩。`};
  }

  window.TrainLogProgress=Object.freeze({comparePct,progressSignals,overloadSummaryFromSessions,plateauFromSessions});
})();
