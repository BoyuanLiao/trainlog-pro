/** TrainLog Pro smart progression engine. */
(()=>{
  'use strict';

  const n=value=>{const x=Number(value);return Number.isFinite(x)?x:0};
  const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
  const range=values=>values.length?Math.max(...values)-Math.min(...values):0;
  const est1rm=(weight,reps)=>{weight=n(weight);reps=n(reps);return weight>0&&reps>0?weight*(1+reps/30):0};

  function historyForExercise(exerciseId,workouts,limit=5){
    return [...(workouts||[])]
      .filter(w=>(w?.exercises||[]).some(e=>e.exerciseId===exerciseId))
      .sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||'')))
      .slice(0,Math.max(1,n(limit)||5))
      .map(w=>({date:w.date,workout:w,exercise:(w.exercises||[]).find(e=>e.exerciseId===exerciseId)}));
  }

  function completedWorkingSets(exercise){
    return (exercise?.sets||[]).filter(set=>set?.completed&&set.kind!=='warmup');
  }

  function setRep(set,type){
    if(type==='unilateral'){
      const left=n(set?.leftReps),right=n(set?.rightReps);
      if(left>0&&right>0)return Math.min(left,right);
      return Math.max(left,right);
    }
    return n(set?.reps);
  }

  function setWeight(set,type){
    if(type==='unilateral'){
      const left=n(set?.leftWeight),right=n(set?.rightWeight);
      if(left>0&&right>0)return Math.min(left,right);
      return Math.max(left,right);
    }
    return n(set?.weight);
  }

  function strengthSummary(exercise,exerciseMeta,intensity='RIR'){
    const type=exerciseMeta?.type||exercise?.type||'weight_reps';
    const sets=completedWorkingSets(exercise)
      .map(set=>({
        set,
        reps:setRep(set,type),
        weight:setWeight(set,type),
        rir:set?.rir===''||set?.rir==null?null:n(set.rir),
        rpe:set?.rpe===''||set?.rpe==null?null:n(set.rpe)
      }))
      .filter(row=>row.reps>0);
    if(!sets.length)return null;

    const repMin=n(exerciseMeta?.repMin)||8;
    const repMax=n(exerciseMeta?.repMax)||12;
    const intMin=n(exerciseMeta?.intMin)||2;
    const allTop=sets.every(row=>row.reps>=repMax);
    const minRep=Math.min(...sets.map(row=>row.reps));
    const intensityOK=sets.every(row=>intensity==='RIR'
      ?(row.rir==null||row.rir>=intMin)
      :(row.rpe==null||row.rpe<=8.5));
    const maxWeight=Math.max(...sets.map(row=>row.weight));
    const avgReps=mean(sets.map(row=>row.reps));
    const bestE1rm=Math.max(0,...sets.map(row=>est1rm(row.weight,row.reps)));
    const rirValues=sets.map(row=>row.rir).filter(v=>v!=null);
    const rpeValues=sets.map(row=>row.rpe).filter(v=>v!=null);

    return {
      sets,
      repMin,
      repMax,
      allTop,
      minRep,
      intensityOK,
      maxWeight,
      avgReps,
      bestE1rm,
      avgRir:rirValues.length?mean(rirValues):null,
      avgRpe:rpeValues.length?mean(rpeValues):null
    };
  }

  function durationSummary(exercise){
    const sets=completedWorkingSets(exercise);
    if(!sets.length)return null;
    return {avgSeconds:mean(sets.map(set=>n(set.seconds))),sets};
  }

  function plateauSignal(summaries,intensity='RIR'){
    const recent=(summaries||[]).filter(Boolean).slice(0,3);
    if(recent.length<3)return {plateau:false,hardTrend:false};

    const weights=recent.map(x=>x.maxWeight);
    const reps=recent.map(x=>x.avgReps);
    const e1rms=recent.map(x=>x.bestE1rm).filter(v=>v>0);
    const weightScale=Math.max(1,...weights);
    const weightStable=range(weights)<=Math.max(.5,weightScale*.01);
    const repsStable=range(reps)<=.5;
    const e1rmStable=e1rms.length<3||range(e1rms)<=Math.max(.5,Math.max(...e1rms)*.015);
    const plateau=weightStable&&repsStable&&e1rmStable;

    let hardTrend=false;
    if(intensity==='RIR'){
      const vals=recent.map(x=>x.avgRir).filter(v=>v!=null);
      hardTrend=vals.length>=2&&mean(vals)<=1;
    }else{
      const vals=recent.map(x=>x.avgRpe).filter(v=>v!=null);
      hardTrend=vals.length>=2&&mean(vals)>=9;
    }
    return {plateau,hardTrend};
  }

  function recommend(exerciseMeta,workouts,options={}){
    if(!exerciseMeta)return null;
    const history=historyForExercise(exerciseMeta.id,workouts,options.limit||5);
    if(!history.length){
      return {state:'new',action:'new',plateau:false,hardTrend:false,sessionsUsed:0,text:'第一次紀錄，先以保留 2–3 下餘裕找到工作重量。'};
    }

    const latest=history[0].exercise;
    const inputUnit=(typeof options.inputUnitForExercise==='function'?options.inputUnitForExercise(latest):latest?.inputUnit)||'kg';
    const clean=typeof options.cleanNumber==='function'?options.cleanNumber:(value=>String(Math.round(n(value)*10)/10));
    const intensity=options.intensity==='RPE'?'RPE':'RIR';
    const completed=completedWorkingSets(latest);
    if(!completed.length)return null;

    if(exerciseMeta.type==='duration'){
      const summary=durationSummary(latest);
      if(!summary)return null;
      if(summary.avgSeconds>=n(exerciseMeta.repMax)){
        return {state:'up',action:'increase_time',plateau:false,hardTrend:false,sessionsUsed:history.length,
          text:`上次平均 ${Math.round(summary.avgSeconds)} 秒，已達目標上限，可嘗試每組增加約 ${exerciseMeta.increment||5} 秒。`};
      }
      return {state:'same',action:'maintain',plateau:false,hardTrend:false,sessionsUsed:history.length,
        text:`上次平均 ${Math.round(summary.avgSeconds)} 秒，先維持並逐步接近 ${exerciseMeta.repMax} 秒。`};
    }

    if(exerciseMeta.type==='cardio'){
      return {state:'same',action:'maintain',plateau:false,hardTrend:false,sessionsUsed:history.length,
        text:'有氧建議優先穩定時間與感受，再逐步增加時間、距離或坡度。'};
    }

    const latestSummary=strengthSummary(latest,exerciseMeta,intensity);
    if(!latestSummary)return null;

    if(latestSummary.allTop&&latestSummary.intensityOK){
      const inc=typeof options.incrementForUnit==='function'
        ?options.incrementForUnit(exerciseMeta,inputUnit)
        :(exerciseMeta.increment||2.5);
      return {state:'up',action:'increase_load',plateau:false,hardTrend:false,sessionsUsed:history.length,
        text:`上次所有正式組達 ${exerciseMeta.repMax} 下且強度可控，建議下次嘗試增加約 ${clean(inc)} ${inputUnit}。`};
    }

    if(latestSummary.minRep<(n(exerciseMeta.repMin)||8)-1){
      return {state:'down',action:'reduce_load',plateau:false,hardTrend:false,sessionsUsed:history.length,
        text:`上次有組數低於目標範圍，建議維持或小幅降重，優先完成 ${exerciseMeta.repMin}–${exerciseMeta.repMax} 下。`};
    }

    const summaries=history.map(item=>strengthSummary(item.exercise,exerciseMeta,intensity)).filter(Boolean);
    const trend=plateauSignal(summaries,intensity);
    if(trend.plateau){
      return {state:'same',action:'plateau',plateau:true,hardTrend:trend.hardTrend,sessionsUsed:history.length,
        text:trend.hardTrend
          ?`最近 3 次在相近重量與次數停滯，而且主觀強度偏高；先檢查恢復狀況，必要時小幅降重或安排較輕的一次。`
          :`最近 3 次在相近重量與次數沒有明顯提升，可能進入平台期；先維持重量，嘗試增加 1 下、改善動作品質或調整組間休息。`};
    }

    return {state:'same',action:'add_reps',plateau:false,hardTrend:false,sessionsUsed:history.length,
      text:`上次仍在 ${exerciseMeta.repMin}–${exerciseMeta.repMax} 下範圍內，建議維持重量並增加完成次數。`};
  }

  window.TrainLogTrainingProgression=Object.freeze({
    historyForExercise,
    completedWorkingSets,
    strengthSummary,
    durationSummary,
    plateauSignal,
    recommend
  });
})();
