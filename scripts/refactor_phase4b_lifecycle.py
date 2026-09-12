from pathlib import Path
import re

APP = Path('js/app.js')
INDEX = Path('index.html')
JS_README = Path('js/README.md')
TRAINING_README = Path('js/training/README.md')
REFACTOR = Path('docs/REFACTOR.md')

app = APP.read_text(encoding='utf-8')

def function_span(source, name):
    m = re.search(r'(?m)^\s*function\s+' + re.escape(name) + r'\s*\(', source)
    if not m:
        raise RuntimeError(f'missing function {name}')
    brace = source.find('{', m.end())
    depth = 0
    state = 'normal'
    escaped = False
    i = brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ''
        if state == 'line':
            if ch == '\n': state = 'normal'
            i += 1; continue
        if state == 'block':
            if ch == '*' and nxt == '/': state = 'normal'; i += 2
            else: i += 1
            continue
        if state in ('single', 'double', 'template'):
            if escaped: escaped = False; i += 1; continue
            if ch == '\\': escaped = True; i += 1; continue
            if (state == 'single' and ch == "'") or (state == 'double' and ch == '"') or (state == 'template' and ch == '`'):
                state = 'normal'
            i += 1; continue
        if ch == '/' and nxt == '/': state = 'line'; i += 2; continue
        if ch == '/' and nxt == '*': state = 'block'; i += 2; continue
        if ch == "'": state = 'single'; i += 1; continue
        if ch == '"': state = 'double'; i += 1; continue
        if ch == '`': state = 'template'; i += 1; continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(source) and source[end] in ' \t\r': end += 1
                if end < len(source) and source[end] == '\n': end += 1
                return m.start(), end
        i += 1
    raise RuntimeError(f'unclosed function {name}')

def replace_function(source, name, replacement):
    start, end = function_span(source, name)
    return source[:start] + replacement.rstrip() + '\n' + source[end:]

if 'const trainingLifecycle=window.TrainLogTrainingLifecycle;' not in app:
    anchor = 'const trainingMetrics=window.TrainLogTrainingMetrics;\n'
    if anchor not in app:
        raise RuntimeError('training metrics anchor missing')
    app = app.replace(anchor, anchor + 'const trainingLifecycle=window.TrainLogTrainingLifecycle;\n', 1)

app = replace_function(app, 'startTemplate', r'''function startTemplate(id,date=isoToday()){
 if(data.activeWorkout){goPage('trainPage');return}
 const t=data.templates.find(x=>x.id===id);if(!t)return;
 data.activeWorkout=trainingLifecycle.createTemplateWorkout(t,{id:uid('w'),date,startedAt:new Date().toISOString(),resolveExercise:getExercise,makeSessionExercise});
 save('開始訓練',true);openSessionMeta(true);goPage('trainPage')
}''')

app = replace_function(app, 'startBlank', r'''function startBlank(date=isoToday()){
 data.activeWorkout=trainingLifecycle.createBlankWorkout({id:uid('w'),date,startedAt:new Date().toISOString()});
 save('開始訓練',true);openSessionMeta(true);goPage('trainPage')
}''')

app = replace_function(app, 'finishWorkout', r'''function finishWorkout(){
 const w=data.activeWorkout;if(!w)return;const issues=validateWorkout(w);if(issues.length&&!confirm('偵測到可能的輸入異常：\n\n'+issues.slice(0,5).join('\n')+'\n\n仍要儲存嗎？'))return;
 const editingId=w.editingWorkoutId||'';
 if(editingId){
   const idx=data.workouts.findIndex(x=>x.id===editingId);if(idx<0){alert('找不到原本的訓練紀錄，無法儲存修改。');return}
   snapshot('歷史訓練編輯前');
   const updated=trainingLifecycle.finalizeHistoryEdit(w,editingId);
   const next=[...data.workouts];next[idx]=updated;data.workouts=trainingLifecycle.sortWorkouts(next);
   data.activeWorkout=null;
   save('編輯訓練內容',false);
   const summary=`${updated.exercises.length} 個動作 · ${effectiveSets(updated)} 正式組 · ${fmtKg(workoutVolume(updated))} · 有氧 ${Math.round(cardioMinutes(updated))} 分`;
   openModal('修改已儲存',`<div class="card"><div class="record-title">${esc(updated.name)}</div><div class="small" style="margin-top:7px">${esc(summary)}</div></div><button class="btn primary" id="doneClose">完成</button>`,()=>$('#doneClose').onclick=()=>{closeModal();goPage('recordsPage')});
   return;
 }
 const completed=trainingLifecycle.finalizeWorkout(w,{endedAt:new Date().toISOString(),bodyStatusSnapshot:todayBodyStatus(w.date)});
 data.workouts=trainingLifecycle.appendCompletedWorkout(data.workouts,completed);data.activeWorkout=null;save('完成訓練',true);
 const prs=countPRsInWorkout(completed),summary=`${completed.exercises.length} 個動作 · ${effectiveSets(completed)} 正式組 · ${fmtKg(workoutVolume(completed))} · 有氧 ${Math.round(cardioMinutes(completed))} 分${prs?' · '+prs+' 個 PR':''}`;
 openModal('訓練完成',`<div class="card"><div class="record-title">${esc(completed.name)}</div><div class="small" style="margin-top:7px">${esc(summary)}</div></div><button class="btn primary" id="doneClose">完成</button>`,()=>$('#doneClose').onclick=()=>{closeModal();goPage('homePage')})
}''')

APP.write_text(app, encoding='utf-8')

index = INDEX.read_text(encoding='utf-8')
if 'js/training/lifecycle.js' not in index:
    app_tag = re.search(r'(?P<indent>^[ \t]*)<script[^>]*src=["\']js/app\.js(?P<query>\?[^"\']*)?["\'][^>]*></script>', index, re.M)
    if not app_tag:
        raise RuntimeError('app.js script tag missing')
    indent = app_tag.group('indent')
    query = app_tag.group('query') or ''
    lifecycle_tag = f'{indent}<script src="js/training/lifecycle.js{query}"></script>\n'
    index = index[:app_tag.start()] + lifecycle_tag + index[app_tag.start():]
    INDEX.write_text(index, encoding='utf-8')

js_readme = JS_README.read_text(encoding='utf-8')
old_order = '''1. `motion-gifs.js`
2. `data/glossary.js`
3. `data/equipment.js`
4. `data/exercises.js`
5. `data/programs.js`
6. `analysis/training-metrics.js`
7. `app.js`'''
new_order = '''1. `motion-gifs.js`
2. `data/glossary.js`
3. `data/equipment.js`
4. `data/exercises.js`
5. `data/programs.js`
6. `analysis/training-metrics.js`
7. `analysis/progress.js`
8. `core/utils.js`
9. `core/migration.js`
10. `core/storage.js`
11. `training/metrics.js`
12. `training/lifecycle.js`
13. `app.js`'''
if old_order in js_readme:
    js_readme = js_readme.replace(old_order, new_order, 1)
if '### `training/`' not in js_readme:
    insert = '''\n### `training/`\n訓練流程中的可測試狀態與計算。\n\n目前：\n- `metrics.js`：訓練量、正式組、有氧分鐘、計時秒數、最佳組\n- `lifecycle.js`：Active Workout 建立／完成／歷史編輯完成等純狀態轉換\n\n'''
    js_readme = js_readme.replace('### `motion-gifs.js`', insert + '### `motion-gifs.js`', 1)
JS_README.write_text(js_readme, encoding='utf-8')

training_readme = TRAINING_README.read_text(encoding='utf-8')
training_readme = training_readme.replace('狀態：**重構骨架，訓練流程目前仍在 `app.js`。**', '狀態：**Phase 4 進行中；純計算與第一批 Active Workout lifecycle 已抽離。**')
phase = '''\n## 已完成\n\n- `metrics.js`：訓練量、正式組、有氧／計時與最佳組純計算。\n- `lifecycle.js`：空白／模板 Active Workout 建立、一般完成、歷史編輯完成、日期排序。\n- `tests/training/metrics-characterization.test.js`\n- `tests/training/lifecycle-characterization.test.js`\n\n目前 UI confirm / modal / save 副作用仍留在 `app.js`，由 wrapper 呼叫 pure lifecycle。\n'''
if '## 已完成' not in training_readme:
    training_readme += phase
TRAINING_README.write_text(training_readme, encoding='utf-8')

refactor = REFACTOR.read_text(encoding='utf-8')
phase4b = '''\n### Phase 4b — Active Workout lifecycle\n- ✅ `js/training/lifecycle.js`：空白／模板建立、一般完成、歷史編輯完成、workout 日期排序\n- ✅ `app.js` 保留 UI / confirm / save wrapper，不讓 lifecycle module 直接碰 DOM 或 LocalStorage\n- ✅ 實作前後 lifecycle characterization tests\n- 下一步：set 操作與 Active Workout mutation，再銜接 Smart Progression Engine。\n'''
if '### Phase 4b — Active Workout lifecycle' not in refactor:
    refactor += phase4b
REFACTOR.write_text(refactor, encoding='utf-8')
