from pathlib import Path
import re

app_path=Path('js/app.js')
app=app_path.read_text(encoding='utf-8')

def function_span(source,name):
    m=re.search(r'(?m)^\s*function\s+'+re.escape(name)+r'\s*\(',source)
    if not m: raise RuntimeError(f'missing {name}')
    brace=source.find('{',m.end()); depth=0; state='normal'; escaped=False; i=brace
    while i<len(source):
        ch=source[i]; nxt=source[i+1] if i+1<len(source) else ''
        if state=='line':
            if ch=='\n': state='normal'
            i+=1; continue
        if state=='block':
            if ch=='*' and nxt=='/': state='normal'; i+=2
            else: i+=1
            continue
        if state in ('single','double','template'):
            if escaped: escaped=False; i+=1; continue
            if ch=='\\': escaped=True; i+=1; continue
            if (state=='single' and ch=="'") or (state=='double' and ch=='"') or (state=='template' and ch=='`'): state='normal'
            i+=1; continue
        if ch=='/' and nxt=='/': state='line'; i+=2; continue
        if ch=='/' and nxt=='*': state='block'; i+=2; continue
        if ch=="'": state='single'; i+=1; continue
        if ch=='"': state='double'; i+=1; continue
        if ch=='`': state='template'; i+=1; continue
        if ch=='{': depth+=1
        elif ch=='}':
            depth-=1
            if depth==0:
                end=i+1
                while end<len(source) and source[end] in ' \t\r': end+=1
                if end<len(source) and source[end]=='\n': end+=1
                return m.start(),end
        i+=1
    raise RuntimeError(f'unclosed {name}')

names=['workoutVolume','effectiveSets','cardioMinutes','durationSeconds','bestSetForExercise']
spans=[(*function_span(app,nm),nm) for nm in names]
for start,end,nm in sorted(spans, reverse=True):
    app=app[:start]+app[end:]

anchor="function save(reason='',takeSnapshot=false){return storageCore.save(data,reason,takeSnapshot,renderAll)}\n"
if anchor not in app: raise RuntimeError('wrapper anchor missing')
bridge="""const trainingMetrics=window.TrainLogTrainingMetrics;
function workoutVolume(w){return trainingMetrics.workoutVolume(w,{includeWarmup:!!data.settings.includeWarmup})}
function effectiveSets(w,muscle){return trainingMetrics.effectiveSets(w,muscle)}
function cardioMinutes(w){return trainingMetrics.cardioMinutes(w)}
function durationSeconds(w,muscle){return trainingMetrics.durationSeconds(w,muscle)}
function bestSetForExercise(exId,workouts=data.workouts){return trainingMetrics.bestSetForExercise(exId,workouts)}
"""
app=app.replace(anchor,anchor+bridge,1)
app_path.write_text(app,encoding='utf-8')

index_path=Path('index.html')
index=index_path.read_text(encoding='utf-8')
if 'js/training/metrics.js' not in index:
    app_tag=re.search(r'(?P<indent>^[ \t]*)<script[^>]*src=["\']js/app\.js(?P<query>\?[^"\']*)?["\'][^>]*></script>',index,re.M)
    if not app_tag: raise RuntimeError('app.js tag missing')
    indent=app_tag.group('indent'); query=app_tag.group('query') or ''
    index=index[:app_tag.start()]+f'{indent}<script src="js/training/metrics.js{query}"></script>\n'+index[app_tag.start():]
    index_path.write_text(index,encoding='utf-8')

# Switch characterization test from app extraction to module verification.
test_path=Path('tests/training/metrics-characterization.test.js')
t=test_path.read_text(encoding='utf-8')
start=t.index("const app=fs.readFileSync('js/app.js','utf8');")
marker="const workout={exercises:["
end=t.index(marker)
replacement="""const utils=fs.readFileSync('js/core/utils.js','utf8');
const metrics=fs.readFileSync('js/training/metrics.js','utf8');
const ctx=vm.createContext({console,Math,Date,window:{}});
vm.runInContext(utils,ctx);
vm.runInContext(metrics,ctx);
vm.runInContext(\"const n=window.TrainLogUtils.n; const est1rm=window.TrainLogUtils.est1rm; const trainingMetrics=window.TrainLogTrainingMetrics; let data={settings:{includeWarmup:false},workouts:[]}; function workoutVolume(w){return trainingMetrics.workoutVolume(w,{includeWarmup:!!data.settings.includeWarmup})} function effectiveSets(w,muscle){return trainingMetrics.effectiveSets(w,muscle)} function cardioMinutes(w){return trainingMetrics.cardioMinutes(w)} function durationSeconds(w,muscle){return trainingMetrics.durationSeconds(w,muscle)} function bestSetForExercise(exId,workouts=data.workouts){return trainingMetrics.bestSetForExercise(exId,workouts)}\",ctx);
const run=code=>vm.runInContext(code,ctx);

"""
t=t[:start]+replacement+t[end:]
test_path.write_text(t,encoding='utf-8')

readme=Path('js/training/README.md').read_text(encoding='utf-8')
readme=readme.replace('狀態：**重構骨架，訓練流程目前仍在 `app.js`。**','狀態：**Phase 4 已開始；純訓練統計已從 `app.js` 抽離。**')
if '- `metrics.js`：純訓練統計' not in readme:
    readme=readme.replace('未來負責：\n','目前模組：\n- `metrics.js`：純訓練統計（volume、effective sets、cardio/duration、best set）。\n\n未來負責：\n')
Path('js/training/README.md').write_text(readme,encoding='utf-8')

ref=Path('docs/REFACTOR.md').read_text(encoding='utf-8')
if 'Phase 4a' not in ref:
    ref += '\n\n### Phase 4a — Training metrics\n- ✅ `js/training/metrics.js`：workoutVolume / effectiveSets / cardioMinutes / durationSeconds / bestSetForExercise\n- ✅ 實作前後 characterization tests\n- 下一步：Active Workout lifecycle 與 Progression Engine 前置資料整理。\n'
Path('docs/REFACTOR.md').write_text(ref,encoding='utf-8')
