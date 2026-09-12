/** TrainLog Pro exercise progress browser helpers. */
(()=>{
  'use strict';

  const DEFAULT_MUSCLE_ORDER=['胸','背','腿','肩膀','二頭','三頭','腹部','有氧','其他'];
  const text=value=>String(value??'').trim().toLocaleLowerCase('zh-TW');

  function sortedByRecent(items=[]){
    return [...items].sort((a,b)=>String(b.lastDate||'').localeCompare(String(a.lastDate||''))||String(a.name||'').localeCompare(String(b.name||''),'zh-Hant'));
  }

  function muscles(items=[],order=DEFAULT_MUSCLE_ORDER){
    const found=new Set(items.map(item=>item.muscle).filter(Boolean));
    const stable=order.filter(name=>found.has(name));
    const extras=[...found].filter(name=>!order.includes(name)).sort((a,b)=>String(a).localeCompare(String(b),'zh-Hant'));
    return [...stable,...extras];
  }

  function matches(item,query='',muscle=''){
    if(muscle&&item?.muscle!==muscle)return false;
    const q=text(query);
    if(!q)return true;
    const hay=[item?.name,item?.equipmentName,item?.muscle,item?.statusLabel,item?.lastSummary].map(text).join(' ');
    return hay.includes(q);
  }

  function buildViewModel(items=[],options={}){
    const query=options.query||'';
    const muscle=options.muscle||'';
    const recentLimit=Math.max(1,Number(options.recentLimit)||6);
    const attentionLimit=Math.max(1,Number(options.attentionLimit)||4);
    const recent=sortedByRecent(items);
    const filtered=recent.filter(item=>matches(item,query,muscle));
    const attention=recent
      .filter(item=>Number(item.attentionPriority)>0)
      .sort((a,b)=>Number(b.attentionPriority)-Number(a.attentionPriority)||String(b.lastDate||'').localeCompare(String(a.lastDate||'')))
      .slice(0,attentionLimit);

    return {
      recent:recent.slice(0,recentLimit),
      attention,
      filtered,
      muscles:muscles(items)
    };
  }

  window.TrainLogExerciseProgressBrowser=Object.freeze({
    sortedByRecent,
    muscles,
    matches,
    buildViewModel
  });
})();
