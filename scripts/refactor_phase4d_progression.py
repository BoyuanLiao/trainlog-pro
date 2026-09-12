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

def replace_function(text,name,new_source):
    marker=f'function {name}('
    start=text.find(marker)
    if start<0:
        raise SystemExit(f'missing function: {name}')
    brace=text.find('{',start)
    if brace<0:
        raise SystemExit(f'missing function body: {name}')
    depth=0
    state='normal'
    escaped=False
    i=brace
    while i<len(text):
        ch=text[i]
        nx=text[i+1] if i+1<len(text) else ''
        if state=='line':
            if ch=='\n': state='normal'
        elif state=='block':
            if ch=='*' and nx=='/':
                state='normal'; i+=1
        elif state in ('single','double','template'):
            if escaped:
                escaped=False
            elif ch=='\\':
                escaped=True
            elif (state=='single' and ch=="'") or (state=='double' and ch=='"') or (state=='template' and ch=='`'):
                state='normal'
        else:
            if ch=='/' and nx=='/': state='line'; i+=1
            elif ch=='/' and nx=='*': state='block'; i+=1
            elif ch=="'": state='single'
            elif ch=='"': state='double'
            elif ch=='`': state='template'
            elif ch=='{': depth+=1
            elif ch=='}':
                depth-=1
                if depth==0:
                    return text[:start]+new_source+text[i+1:]
        i+=1
    raise SystemExit(f'unclosed function: {name}')

if 'const trainingProgression=window.TrainLogTrainingProgression;' not in app:
    app=replace_once(
        app,
        'const trainingMutations=window.TrainLogTrainingMutations;\n',
        'const trainingMutations=window.TrainLogTrainingMutations;\nconst trainingProgression=window.TrainLogTrainingProgression;\n',
        'training progression binding'
    )

app=replace_function(app,'progressionAdvice',"""function progressionAdvice(exId){
 const ex=getExercise(exId);if(!ex)return null;
 return trainingProgression.recommend(ex,data.workouts,{
   intensity:data.settings.intensity,
   inputUnitForExercise:exerciseInputUnit,
   incrementForUnit:machineIncrementForUnit,
   cleanNumber:cleanWeightNumber,
   limit:5
 })
}""")
APP.write_text(app,encoding='utf-8')

index=INDEX.read_text(encoding='utf-8')
if 'js/training/progression.js' not in index:
    index=replace_once(
        index,
        '<script src="js/training/mutations.js?v=2.10.0"></script>\n',
        '<script src="js/training/mutations.js?v=2.10.0"></script>\n<script src="js/training/progression.js?v=2.10.0"></script>\n',
        'index mutations script'
    )
INDEX.write_text(index,encoding='utf-8')

readme=TRAINING_README.read_text(encoding='utf-8')
if '- `progression.js`' not in readme:
    readme=readme.replace(
        '- `mutations.js`：set / exercise 資料變更（新增、刪除、複製、完成、組別、簡易強度）。\n',
        '- `mutations.js`：set / exercise 資料變更（新增、刪除、複製、完成、組別、簡易強度）。\n- `progression.js`：最近 3–5 次同動作紀錄的 Smart Progression Engine。\n'
    )
    readme += '''\n## Phase 4d\n\n- `progression.js` 讀取最多最近 5 次同動作紀錄。\n- action：`new` / `increase_load` / `add_reps` / `reduce_load` / `plateau` / `maintain` / `increase_time`。\n- 單次紀錄的加重／維持／降重規則優先保持既有行為。\n- 至少 3 次可比較紀錄才啟用 plateau 趨勢判定。\n- 支援 unilateral，以左右側較弱一側的 reps / weight 作為進階判斷基準。\n- UI render、文字樣式與 app state 仍由 `app.js` 處理。\n'''
TRAINING_README.write_text(readme,encoding='utf-8')

ref=REFACTOR.read_text(encoding='utf-8')
if '### Phase 4d' not in ref:
    ref += '''\n\n### Phase 4d — Smart Progression Engine 基礎層\n- [x] 先以 characterization tests 鎖住既有 `progressionAdvice()` 單次紀錄行為。\n- [x] 先建立 engine fixtures，再實作 `js/training/progression.js`。\n- [x] 最近最多 5 次紀錄；至少 3 次才做 plateau 趨勢判定。\n- [x] action：加重、增加次數、降重、平台期、維持、增加時間。\n- [x] unilateral 使用較弱側作為進階基準。\n- [x] `app.js` 的 `progressionAdvice()` 改為薄 wrapper。\n- 下一步：把 progression action 顯示成更清楚的 UI 標籤與理由／信心來源。\n'''
REFACTOR.write_text(ref,encoding='utf-8')
