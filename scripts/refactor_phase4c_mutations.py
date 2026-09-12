from pathlib import Path

APP=Path('js/app.js')
INDEX=Path('index.html')
TRAINING_README=Path('js/training/README.md')
REFACTOR=Path('docs/REFACTOR.md')

app=APP.read_text(encoding='utf-8')

def replace_once(text,old,new,label):
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    return text.replace(old,new,1)

app=replace_once(
    app,
    "const trainingLifecycle=window.TrainLogTrainingLifecycle;\n",
    "const trainingLifecycle=window.TrainLogTrainingLifecycle;\nconst trainingMutations=window.TrainLogTrainingMutations;\n",
    'training mutation module binding'
)

replacements={
    'data-addset': " $$('#activeWorkout [data-addset]').forEach(b=>b.onclick=()=>{const e=data.activeWorkout.exercises[n(b.dataset.addset)];trainingMutations.addSet(e,{id:uid('s')});saveActiveOnly(true)});",
    'data-delset': " $$('#activeWorkout [data-delset]').forEach(b=>b.onclick=()=>{const [ei,si]=b.dataset.delset.split(',').map(Number);trainingMutations.removeSet(data.activeWorkout.exercises[ei],si);saveActiveOnly(true)});",
    'data-delta': " $$('#activeWorkout [data-delta]').forEach(b=>b.onclick=()=>{const [ei,si,key,delta]=b.dataset.delta.split(',');trainingMutations.applyDelta(data.activeWorkout.exercises[n(ei)].sets[n(si)],key,delta);saveActiveOnly(true)});",
    'data-weight-delta': " $$('#activeWorkout [data-weight-delta]').forEach(b=>b.onclick=()=>{const [ei,si,delta]=b.dataset.weightDelta.split(','),ex=data.activeWorkout.exercises[n(ei)],s=ex.sets[n(si)];trainingMutations.applyWeightDelta(s,toKg(delta,exerciseInputUnit(ex)));saveActiveOnly(true)});",
    'data-copy': " $$('#activeWorkout [data-copy]').forEach(b=>b.onclick=()=>{const [ei,si]=b.dataset.copy.split(',').map(Number);trainingMutations.copyPreviousSet(data.activeWorkout.exercises[ei],si);saveActiveOnly(true)});",
    'data-complete': " $$('#activeWorkout [data-complete]').forEach(b=>b.onclick=()=>{const [ei,si]=b.dataset.complete.split(',').map(Number),e=data.activeWorkout.exercises[ei],completed=trainingMutations.toggleCompleted(e,si);saveActiveOnly(true);if(completed&&data.settings.trainingIntervalTimer!==false){const ex=getExercise(e.exerciseId),nextNo=si+2;startTimer(n(ex?.rest)||n(data.settings.defaultRest)||90,`${ex?.name||e.nameSnapshot} · 準備第 ${nextNo} 組`)}});",
    'data-kind': " $$('#activeWorkout [data-kind]').forEach(el=>el.onchange=()=>{const [ei,si]=el.dataset.kind.split(',').map(Number);trainingMutations.setKind(data.activeWorkout.exercises[ei],si,el.value);saveActiveOnly(true)});",
    'data-simple-effort': " $$('#activeWorkout [data-simple-effort]').forEach(b=>b.onclick=()=>{const [ei,si,feel]=b.dataset.simpleEffort.split(',');trainingMutations.applySimpleEffort(data.activeWorkout.exercises[n(ei)],n(si),feel);saveActiveOnly(true);toast(feel==='easy'?'已記錄：太輕鬆':feel==='ok'?'已記錄：剛剛好':'已記錄：太吃力')});",
    'data-removeex': " $$('#activeWorkout [data-removeex]').forEach(b=>b.onclick=()=>{if(confirm('移除此動作？')){trainingMutations.removeExercise(data.activeWorkout.exercises,n(b.dataset.removeex));saveActiveOnly(true)}});",
}

lines=app.splitlines()
for marker,newline in replacements.items():
    matches=[i for i,line in enumerate(lines) if f'[{marker}]' in line and "$$('#activeWorkout" in line]
    if len(matches)!=1:
        raise SystemExit(f'expected one handler for {marker}, got {len(matches)}')
    lines[matches[0]]=newline
app='\n'.join(lines)+'\n'
APP.write_text(app,encoding='utf-8')

index=INDEX.read_text(encoding='utf-8')
if 'js/training/mutations.js' not in index:
    index=replace_once(
        index,
        '<script src="js/training/lifecycle.js?v=2.10.0"></script>\n',
        '<script src="js/training/lifecycle.js?v=2.10.0"></script>\n<script src="js/training/mutations.js?v=2.10.0"></script>\n',
        'index lifecycle script'
    )
INDEX.write_text(index,encoding='utf-8')

readme=TRAINING_README.read_text(encoding='utf-8')
if '- `mutations.js`' not in readme:
    readme=readme.replace(
        '- `metrics.js`：純訓練統計（volume、effective sets、cardio/duration、best set）。\n',
        '- `metrics.js`：純訓練統計（volume、effective sets、cardio/duration、best set）。\n- `lifecycle.js`：Active Workout 建立與完成狀態轉換。\n- `mutations.js`：set / exercise 資料變更（新增、刪除、複製、完成、組別、簡易強度）。\n'
    )
    readme += '\n## Phase 4c\n\n- `mutations.js` 不處理 DOM、save、confirm、timer 或 toast。\n- `app.js` 保留 UI event binding 與副作用，只把資料 mutation 委派給 module。\n- `tests/training/mutations-characterization.test.js` 會在抽離前後驗證同一組行為。\n'
TRAINING_README.write_text(readme,encoding='utf-8')

ref=REFACTOR.read_text(encoding='utf-8')
if '### Phase 4c' not in ref:
    ref += '\n\n### Phase 4c — Set / Exercise mutation\n- [x] 新增 `tests/training/mutations-characterization.test.js` 鎖住既有 handler 行為。\n- [x] `js/training/mutations.js`：新增／刪除／複製 set、delta、完成狀態、kind、simple effort、移除動作。\n- [x] save / confirm / rest timer / toast 保持在 `app.js`。\n- 下一步：Progression Engine 前置資料模型與建議規則。\n'
REFACTOR.write_text(ref,encoding='utf-8')
