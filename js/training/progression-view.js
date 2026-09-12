/** TrainLog Pro progression presentation helpers. */
(()=>{
  'use strict';

  const ACTIONS=Object.freeze({
    new:{label:'建立基準',tone:'neutral',priority:5,reason:'先建立可比較的工作重量與次數'},
    increase_load:{label:'↑ 建議加重',tone:'good',priority:0,reason:'已達目標上限且強度可控'},
    increase_time:{label:'↑ 增加時間',tone:'good',priority:0,reason:'已達目前時間目標上限'},
    add_reps:{label:'＋ 增加次數',tone:'good',priority:1,reason:'重量先維持，優先累積次數'},
    plateau:{label:'↔ 可能平台期',tone:'warn',priority:2,reason:'近期進步幅度偏低'},
    reduce_load:{label:'↓ 調整負重',tone:'warn',priority:3,reason:'有組數低於目標範圍'},
    maintain:{label:'＝ 維持',tone:'neutral',priority:4,reason:'維持目前安排並持續累積紀錄'}
  });

  function normalizeAction(advice={}){
    if(advice.action&&ACTIONS[advice.action])return advice.action;
    if(advice.state==='up')return 'increase_load';
    if(advice.state==='down')return 'reduce_load';
    if(advice.state==='new')return 'new';
    return 'maintain';
  }

  function evidenceLabel(sessionsUsed){
    const count=Math.max(0,Math.floor(Number(sessionsUsed)||0));
    if(count<=0)return '尚無歷史紀錄';
    if(count===1)return '依上次紀錄';
    return `參考最近 ${Math.min(count,5)} 次紀錄`;
  }

  function reasonLabel(advice={}){
    const action=normalizeAction(advice);
    if(action==='plateau'&&advice.hardTrend)return '平台期訊號 + 強度偏高';
    return ACTIONS[action].reason;
  }

  function formatAdvice(advice={}){
    const action=normalizeAction(advice);
    const meta=ACTIONS[action];
    return {
      action,
      label:meta.label,
      tone:meta.tone,
      priority:meta.priority,
      evidence:evidenceLabel(advice.sessionsUsed),
      reason:reasonLabel(advice),
      text:String(advice.text||''),
      sessionsUsed:Math.max(0,Math.floor(Number(advice.sessionsUsed)||0)),
      plateau:!!advice.plateau,
      hardTrend:!!advice.hardTrend
    };
  }

  function priority(advice={}){
    return formatAdvice(advice).priority;
  }

  window.TrainLogProgressionView=Object.freeze({
    normalizeAction,
    evidenceLabel,
    reasonLabel,
    formatAdvice,
    priority
  });
})();
