/** TrainLog Pro progression presentation helpers. Pure and locale-agnostic. */
(()=>{
  'use strict';

  const ACTIONS=Object.freeze({
    new:{labelKey:'progression.action.newLabel',tone:'neutral',priority:5,reasonKey:'progression.action.newReason'},
    increase_load:{labelKey:'progression.action.increaseLoadLabel',tone:'good',priority:0,reasonKey:'progression.action.increaseLoadReason'},
    increase_time:{labelKey:'progression.action.increaseTimeLabel',tone:'good',priority:0,reasonKey:'progression.action.increaseTimeReason'},
    add_reps:{labelKey:'progression.action.addRepsLabel',tone:'good',priority:1,reasonKey:'progression.action.addRepsReason'},
    plateau:{labelKey:'progression.action.plateauLabel',tone:'warn',priority:2,reasonKey:'progression.action.plateauReason'},
    reduce_load:{labelKey:'progression.action.reduceLoadLabel',tone:'warn',priority:3,reasonKey:'progression.action.reduceLoadReason'},
    maintain:{labelKey:'progression.action.maintainLabel',tone:'neutral',priority:4,reasonKey:'progression.action.maintainReason'}
  });
  const identity=(key)=>key;

  function normalizeAction(advice={}){
    if(advice.action&&ACTIONS[advice.action])return advice.action;
    if(advice.state==='up')return 'increase_load';
    if(advice.state==='down')return 'reduce_load';
    if(advice.state==='new')return 'new';
    return 'maintain';
  }

  function evidenceLabel(sessionsUsed,translate=identity){
    const count=Math.max(0,Math.floor(Number(sessionsUsed)||0));
    if(count<=0)return translate('progression.evidenceNone',{});
    if(count===1)return translate('progression.evidenceOne',{});
    return translate('progression.evidenceRecent',{count:Math.min(count,5)});
  }

  function reasonLabel(advice={},translate=identity){
    const action=normalizeAction(advice);
    if(action==='plateau'&&advice.hardTrend)return translate('progression.action.plateauHardReason',{});
    return translate(ACTIONS[action].reasonKey,{});
  }

  function formatAdvice(advice={},translate=identity){
    const action=normalizeAction(advice);
    const meta=ACTIONS[action];
    return {
      action,
      label:translate(meta.labelKey,{}),
      tone:meta.tone,
      priority:meta.priority,
      evidence:evidenceLabel(advice.sessionsUsed,translate),
      reason:reasonLabel(advice,translate),
      text:advice.messageKey?translate(advice.messageKey,advice.messageParams||{}):String(advice.text||''),
      sessionsUsed:Math.max(0,Math.floor(Number(advice.sessionsUsed)||0)),
      plateau:!!advice.plateau,
      hardTrend:!!advice.hardTrend
    };
  }

  function priority(advice={}){return ACTIONS[normalizeAction(advice)].priority}

  window.TrainLogProgressionView=Object.freeze({normalizeAction,evidenceLabel,reasonLabel,formatAdvice,priority});
})();