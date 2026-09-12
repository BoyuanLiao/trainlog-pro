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
    "const trainingProgressionView=window.TrainLogProgressionView;\n",
    "const trainingProgressionView=window.TrainLogProgressionView;\nconst trainingProgressionActions=window.TrainLogProgressionActions;\n",
    'progression actions binding'
)

app=replace_once(
    app,
    "function progressionDisplay(adv){return adv?trainingProgressionView.formatAdvice(adv):null}\nfunction progressionToneClass(view){return view?.tone==='good'?'good':view?.tone==='warn'?'warn':''}\n",
    "function progressionDisplay(adv){return adv?trainingProgressionView.formatAdvice(adv):null}\nfunction progressionToneClass(view){return view?.tone==='good'?'good':view?.tone==='warn'?'warn':''}\nfunction progressionApplyLabel(adv,ex,e){\n if(!adv||!trainingProgressionActions.canApply(adv))return'';\n if(adv.action==='add_reps')return'套用：未完成正式組每組 +1 下';\n if(adv.action==='increase_time')return`套用：未完成正式組每組 +${n(ex?.increment)||5} 秒`;\n const unit=exerciseInputUnit(e),inc=machineIncrementForUnit(ex,unit),sign=adv.action==='reduce_load'?'−':'+';\n return`套用：未完成正式組 ${sign}${cleanWeightNumber(inc)} ${unit}`\n}\n",
    'progression apply label helper'
)

old_adv="${advView?`<div class=\"small ${progressionToneClass(advView)}\" style=\"margin-top:5px;line-height:1.55\"><b>${esc(advView.label)}</b> · ${esc(advView.reason)}<br>${esc(advView.text)}<br><span class=\"record-meta\">${esc(advView.evidence)}</span></div>`:''}"
new_adv="${advView?`<div class=\"small ${progressionToneClass(advView)}\" style=\"margin-top:5px;line-height:1.55\"><b>${esc(advView.label)}</b> · ${esc(advView.reason)}<br>${esc(advView.text)}<br><span class=\"record-meta\">${esc(advView.evidence)}</span>${trainingProgressionActions.canApply(adv)?`<div style=\"margin-top:7px\"><button class=\"btn small primary\" type=\"button\" data-apply-progression=\"${idx}\">${esc(progressionApplyLabel(adv,ex,e))}</button></div>`:''}</div>`:''}"
app=replace_once(app,old_adv,new_adv,'session progression advice UI')

handler_anchor=" $$('#activeWorkout [data-removeex]').forEach(b=>b.onclick=()=>{if(confirm('移除此動作？')){trainingMutations.removeExercise(data.activeWorkout.exercises,n(b.dataset.removeex));saveActiveOnly(true)}});\n"
handler=handler_anchor+" $$('#activeWorkout [data-apply-progression]').forEach(b=>b.onclick=()=>{const ei=n(b.dataset.applyProgression),e=data.activeWorkout.exercises[ei],ex=getExercise(e?.exerciseId),adv=e?progressionAdvice(e.exerciseId):null;if(!e||!ex||!adv||!trainingProgressionActions.canApply(adv))return;if(!confirm('將這項建議套用到所有未完成的正式組？已完成組、暖身組與 Drop / Failure / Back-off 不會修改。'))return;const unit=exerciseInputUnit(e),inc=machineIncrementForUnit(ex,unit),result=trainingProgressionActions.applyAdvice(e,adv,{weightDeltaKg:toKg(inc,unit),repDelta:1,secondsDelta:n(ex.increment)||5});if(!result.applied){toast('沒有可套用的未完成正式組');return}saveActiveOnly(true);toast(`已套用到 ${result.changedSets} 組`) });\n"
app=replace_once(app,handler_anchor,handler,'progression apply event')
APP.write_text(app,encoding='utf-8')

index=INDEX.read_text(encoding='utf-8')
if 'js/training/progression-actions.js' not in index:
    index=replace_once(
        index,
        '<script src="js/training/progression.js?v=2.10.1"></script>\n<script src="js/training/progression-view.js?v=2.10.1"></script>\n',
        '<script src="js/training/progression.js?v=2.10.1"></script>\n<script src="js/training/progression-actions.js?v=2.10.1"></script>\n<script src="js/training/progression-view.js?v=2.10.1"></script>\n',
        'index progression scripts'
    )
INDEX.write_text(index,encoding='utf-8')

readme=README.read_text(encoding='utf-8')
if '`progression-actions.js`' not in readme:
    readme += '\n## Phase 4f\n\n- `progression-actions.js`：把可執行的 progression action 套到 Active Workout 未完成的 working sets。\n- 只自動套用 `increase_load`、`add_reps`、`reduce_load`、`increase_time`。\n- 暖身、已完成組、Drop / Failure / Back-off 不會被自動修改。\n- `plateau` / `maintain` / `new` 保持建議文字，不自動改訓練資料。\n'
README.write_text(readme,encoding='utf-8')

ref=REFACTOR.read_text(encoding='utf-8')
if '### Phase 4f' not in ref:
    ref += '\n\n### Phase 4f — Apply progression actions\n- [x] 先用 `tests/training/progression-actions.test.js` 鎖住資料 mutation contract。\n- [x] `js/training/progression-actions.js` 僅修改未完成 working sets。\n- [x] Active Workout 提供明確的「套用建議」按鈕與二次確認。\n- [x] kg / lb 顯示增量會在 UI adapter 轉回 kg 標準值後才寫入資料。\n'
REFACTOR.write_text(ref,encoding='utf-8')
