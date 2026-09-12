from pathlib import Path

APP=Path('js/app.js')
INDEX=Path('index.html')
README=Path('js/training/README.md')
REFACTOR=Path('docs/REFACTOR.md')

app=APP.read_text(encoding='utf-8')

def replace_once(text,old,new,label):
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    return text.replace(old,new,1)

app=replace_once(
    app,
    "const trainingProgression=window.TrainLogTrainingProgression;\n",
    "const trainingProgression=window.TrainLogTrainingProgression;\nconst trainingProgressionView=window.TrainLogProgressionView;\n",
    'progression view binding'
)

app=replace_once(
    app,
    "   limit:5\n })\n}\nfunction plateau(exId){",
    "   limit:5\n })\n}\nfunction progressionDisplay(adv){return adv?trainingProgressionView.formatAdvice(adv):null}\nfunction progressionToneClass(view){return view?.tone==='good'?'good':view?.tone==='warn'?'warn':''}\nfunction plateau(exId){",
    'progression display helper'
)

old_home=" $('#recentProgress').innerHTML=prog.length?prog.slice(0,3).map(p=>`<div class=\"record\"><div class=\"record-head\"><div><div class=\"record-title\">${esc(p.ex.name)}</div><div class=\"record-meta\">最近：${esc(p.best.date)}</div></div><span class=\"pill ${p.adv.state==='up'?'good':''}\">${p.adv.state==='up'?'↑ 建議加重':p.adv.state==='down'?'↓ 考慮降重':'＝ 維持'}</span></div><div class=\"small\" style=\"margin-top:8px\">${esc(p.adv.text)}</div></div>`).join(''):'<div class=\"card empty\">累積幾次訓練後，這裡會顯示進步建議。</div>';"
new_home=" $('#recentProgress').innerHTML=prog.length?prog.slice(0,3).map(p=>{const view=progressionDisplay(p.adv);return `<div class=\"record\"><div class=\"record-head\"><div><div class=\"record-title\">${esc(p.ex.name)}</div><div class=\"record-meta\">最近：${esc(p.best.date)} · ${esc(view.evidence)}</div></div><span class=\"pill ${progressionToneClass(view)}\">${esc(view.label)}</span></div><div class=\"small\" style=\"margin-top:8px;font-weight:800\">判斷：${esc(view.reason)}</div><div class=\"small\" style=\"margin-top:4px\">${esc(view.text)}</div></div>`}).join(''):'<div class=\"card empty\">累積幾次訓練後，這裡會顯示進步建議。</div>';"
app=replace_once(app,old_home,new_home,'home progression cards')

app=replace_once(
    app,
    " const adv=progressionAdvice(e.exerciseId);\n let body='';",
    " const adv=progressionAdvice(e.exerciseId),advView=progressionDisplay(adv);\n let body='';",
    'session progression view'
)

old_session="${adv?`<div class=\"small ${adv.state==='up'?'good':adv.state==='down'?'warn':''}\" style=\"margin-top:5px\">${esc(adv.text)}</div>`:''}"
new_session="${advView?`<div class=\"small ${progressionToneClass(advView)}\" style=\"margin-top:5px;line-height:1.55\"><b>${esc(advView.label)}</b> · ${esc(advView.reason)}<br>${esc(advView.text)}<br><span class=\"record-meta\">${esc(advView.evidence)}</span></div>`:''}"
app=replace_once(app,old_session,new_session,'session progression explanation')

old_analysis="""  const rank={up:0,down:1,keep:3};
  const items=ids.map(id=>{
    const ex=getExercise(id),adv=progressionAdvice(id);
    if(!ex||!adv)return null;
    const plateau=plateauDetail(id),best=bestSetForExercise(id);
    let label=adv.state==='up'?'可考慮進階':adv.state==='down'?'先調整負重／難度':'維持並累積';
    if(plateau?.state==='slow'&&adv.state!=='up')label='進步趨勢較慢';
    return {id,ex,adv,plateau,best,label,order:(rank[adv.state]??2)+(plateau?.state==='slow'?.25:0)}
  }).filter(Boolean).sort((a,b)=>a.order-b.order||(b.best?.date||'').localeCompare(a.best?.date||'')).slice(0,5);"""
new_analysis="""  const items=ids.map(id=>{
    const ex=getExercise(id),adv=progressionAdvice(id);
    if(!ex||!adv)return null;
    const view=progressionDisplay(adv),plateau=plateauDetail(id),best=bestSetForExercise(id);
    return {id,ex,adv,view,plateau,best,order:view.priority+(plateau?.state==='slow'&&adv.action!=='increase_load'?.25:0)}
  }).filter(Boolean).sort((a,b)=>a.order-b.order||(b.best?.date||'').localeCompare(a.best?.date||'')).slice(0,5);"""
app=replace_once(app,old_analysis,new_analysis,'analysis progression ranking')

old_analysis_html="""  root.innerHTML=`<div class=\"analysis-opportunity-grid\">${items.map(x=>`<div class=\"card analysis-opportunity\">
    <div class=\"record-head\"><div><div class=\"record-title\">${esc(x.ex.name)}</div><div class=\"record-meta\">${x.best?.date?`最近最佳：${esc(x.best.date)}`:'依目前紀錄'}</div></div><span class=\"pill ${x.adv.state==='up'?'good':x.adv.state==='down'?'warn':''}\">${esc(x.label)}</span></div>
    <div class=\"small\" style=\"margin-top:8px;line-height:1.55\">${esc(x.adv.text||'維持目前安排並持續紀錄。')}</div>
    ${x.plateau?.state==='slow'?`<div class=\"analysis-note\">近期多次可比較紀錄沒有明顯提升；這是趨勢提示，不代表已確定停滯。</div>`:''}
  </div>`).join('')}</div>`;"""
new_analysis_html="""  root.innerHTML=`<div class=\"analysis-opportunity-grid\">${items.map(x=>`<div class=\"card analysis-opportunity\">
    <div class=\"record-head\"><div><div class=\"record-title\">${esc(x.ex.name)}</div><div class=\"record-meta\">${x.best?.date?`最近最佳：${esc(x.best.date)} · `:''}${esc(x.view.evidence)}</div></div><span class=\"pill ${progressionToneClass(x.view)}\">${esc(x.view.label)}</span></div>
    <div class=\"small\" style=\"margin-top:8px;font-weight:800\">判斷依據：${esc(x.view.reason)}</div>
    <div class=\"small\" style=\"margin-top:4px;line-height:1.55\">${esc(x.view.text||'維持目前安排並持續紀錄。')}</div>
    ${x.adv.action==='plateau'?`<div class=\"analysis-note\">${x.adv.hardTrend?'最近 3 次趨勢接近平台，而且主觀強度也偏高。':'最近 3 次可比較紀錄的重量、次數與估算強度變化都很小。'}</div>`:x.plateau?.state==='slow'?`<div class=\"analysis-note\">較長期趨勢的進步幅度偏低；這是趨勢提示，不代表已確定停滯。</div>`:''}
  </div>`).join('')}</div>`;"""
app=replace_once(app,old_analysis_html,new_analysis_html,'analysis progression cards')

APP.write_text(app,encoding='utf-8')

index=INDEX.read_text(encoding='utf-8')
if 'js/training/progression-view.js' not in index:
    index=replace_once(
        index,
        '<script src="js/training/progression.js?v=2.10.0"></script>\n',
        '<script src="js/training/progression.js?v=2.10.0"></script>\n<script src="js/training/progression-view.js?v=2.10.0"></script>\n',
        'progression view script'
    )
INDEX.write_text(index,encoding='utf-8')

readme=README.read_text(encoding='utf-8')
if '- `progression-view.js`' not in readme:
    readme += '\n## Phase 4e — Progression UI / Explainability\n\n- `progression-view.js`：把 engine action 統一轉成顯示標籤、tone、判斷原因與證據範圍。\n- 首頁、訓練動作卡、分析頁共用同一 formatter。\n- UI 明確顯示「增加次數／加重／降重／平台期／維持」與「參考最近 N 次紀錄」。\n- presentation module 不碰 DOM；HTML 組裝仍留在 `app.js`。\n'
README.write_text(readme,encoding='utf-8')

ref=REFACTOR.read_text(encoding='utf-8')
if '### Phase 4e' not in ref:
    ref += '\n\n### Phase 4e — Progression UI / Explainability\n- [x] 先建立 `tests/training/progression-ui.test.js` formatter contract。\n- [x] `js/training/progression-view.js` 統一 action label / tone / reason / evidence。\n- [x] 首頁、Active Workout、分析頁共用 formatter。\n- [x] 顯示 engine 使用的最近紀錄數與平台期／高強度訊號。\n'
REFACTOR.write_text(ref,encoding='utf-8')
