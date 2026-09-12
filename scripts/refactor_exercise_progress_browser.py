from pathlib import Path
import re

index_path=Path('index.html')
app_path=Path('js/app.js')
index=index_path.read_text(encoding='utf-8')
app=app_path.read_text(encoding='utf-8')

# Version/cache bump first so HTML/JS mismatches do not break startup.
index=index.replace('v2.10.2','v2.10.3')
app=app.replace("const APP_VERSION='2.10.2';","const APP_VERSION='2.10.3';")

css_anchor='<link rel="stylesheet" href="css/app.css?v=2.10.3">\n'
css_line='<link rel="stylesheet" href="css/exercise-progress-browser.css?v=2.10.3">\n'
if css_line not in index:
    if css_anchor not in index: raise SystemExit('css anchor not found')
    index=index.replace(css_anchor,css_anchor+css_line,1)

old_panel='''    <div class="analysis-panel hidden" data-analysis-panel="exercise">\n      <div class="section">動作進步與個人最佳（PR） <button class="info-btn" type="button" data-info="pr" aria-label="PR 說明">i</button></div>\n      <div class="card"><div class="field"><label>選擇做過的動作</label><select id="analysisExercise"></select><div class="hint">只列出訓練紀錄中實際做過的動作，最近做過的會排在前面。</div></div><div id="exerciseAnalysis"></div></div>\n    </div>'''
new_panel='''    <div class="analysis-panel hidden" data-analysis-panel="exercise">\n      <div class="section">動作進步與個人最佳（PR） <button class="info-btn" type="button" data-info="pr" aria-label="PR 說明">i</button></div>\n      <div class="card exercise-progress-browser">\n        <div class="field">\n          <label for="analysisExerciseSearch">搜尋做過的動作</label>\n          <input id="analysisExerciseSearch" type="search" placeholder="搜尋動作、器械或肌群..." autocomplete="off">\n          <div class="hint">不用下拉選單；可以從最近做過、肌群或值得關注的動作直接進入分析。</div>\n        </div>\n        <select id="analysisExercise" hidden aria-hidden="true" tabindex="-1"></select>\n        <div class="exercise-browser-block">\n          <div class="exercise-browser-title"><span>最近做過</span><span>快速切換</span></div>\n          <div id="analysisExerciseRecent" class="exercise-recent-grid"></div>\n        </div>\n        <div class="exercise-browser-block">\n          <div class="exercise-browser-title"><span>依肌群</span><span>篩選全部動作</span></div>\n          <div id="analysisExerciseMuscles" class="exercise-muscle-filters"></div>\n        </div>\n        <div class="exercise-browser-block">\n          <div class="exercise-browser-title"><span>值得關注</span><span>依進步建議排序</span></div>\n          <div id="analysisExerciseAttention" class="exercise-attention-grid"></div>\n        </div>\n        <div class="exercise-browser-block">\n          <div class="exercise-browser-title"><span>全部做過的動作</span><span id="analysisExerciseCount" class="exercise-browser-count"></span></div>\n          <div id="analysisExerciseList" class="exercise-browser-list"></div>\n        </div>\n      </div>\n      <div class="section exercise-detail-section">動作詳細分析</div>\n      <div class="card"><div id="exerciseAnalysis"></div></div>\n    </div>'''
if old_panel not in index: raise SystemExit('old exercise analysis panel not found')
index=index.replace(old_panel,new_panel,1)

script_anchor='<script src="js/training/progression-view.js?v=2.10.3"></script>\n'
script_line='<script src="js/ui/exercise-progress-browser.js?v=2.10.3"></script>\n'
if script_line not in index:
    if script_anchor not in index: raise SystemExit('script anchor not found')
    index=index.replace(script_anchor,script_anchor+script_line,1)

binding_anchor='const trainingProgressionActions=window.TrainLogProgressionActions;\n'
if 'const exerciseProgressBrowser=window.TrainLogExerciseProgressBrowser;' not in app:
    if binding_anchor not in app: raise SystemExit('browser binding anchor not found')
    app=app.replace(binding_anchor,binding_anchor+'const exerciseProgressBrowser=window.TrainLogExerciseProgressBrowser;\n',1)

old_block_pattern=re.compile(r" const sel=\$\('#analysisExercise'\),prev=sel\.value;\n const performedMap=new Map\(\);\n.*? renderExerciseAnalysis\(sel\.value\)\n}",re.S)
replacement=" const performed=analysisPerformedExercises();\n renderAnalysisExerciseBrowser(performed)\n}"
app,count=old_block_pattern.subn(replacement,app,count=1)
if count!=1: raise SystemExit(f'expected one old performed selector block, got {count}')

helper='''\nlet analysisExerciseBrowserQuery='';\nlet analysisExerciseBrowserMuscle='';\n\nfunction analysisPerformedExercises(){\n const performedMap=new Map();\n data.workouts.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach(w=>{\n   (w.exercises||[]).forEach(e=>{\n     if(!e.exerciseId||performedMap.has(e.exerciseId))return;\n     const lib=getExercise(e.exerciseId)||{};\n     const equipmentId=e.equipmentId||lib.equipmentId||'';\n     const sysEq=SYSTEM_EQUIPMENT.find(x=>x.id===equipmentId);\n     const myEq=data.equipment.find(x=>x.id===equipmentId);\n     const equipmentName=sysEq?.nameZh||myEq?.name||'';\n     performedMap.set(e.exerciseId,{\n       id:e.exerciseId,\n       name:e.nameSnapshot||lib.name||'已做過的動作',\n       muscle:e.muscle||lib.muscle||'其他',\n       equipmentName,\n       lastDate:w.date\n     });\n   })\n });\n const attentionWeight={reduce_load:50,plateau:40,increase_load:30,add_reps:20,increase_time:20};\n return [...performedMap.values()]\n   .sort((a,b)=>b.lastDate.localeCompare(a.lastDate)||a.name.localeCompare(b.name,'zh-Hant'))\n   .map(item=>{\n     const sessions=exerciseSessionMetrics(item.id),last=sessions.at(-1);\n     const adv=progressionAdvice(item.id),view=progressionDisplay(adv);\n     return {...item,\n       lastSummary:last?.label||'',\n       action:adv?.action||'',\n       statusLabel:view?.label||'',\n       statusTone:view?.tone||'',\n       statusReason:view?.reason||'',\n       attentionPriority:(attentionWeight[adv?.action]||0)+(Number(view?.priority)||0)/10\n     }\n   })\n}\n\nfunction analysisExerciseStatusClass(item){\n return item?.statusTone==='good'?'good':item?.statusTone==='warn'?'warn':item?.statusTone==='accent'?'accent':''\n}\n\nfunction analysisExerciseBrowserCard(item,compact=false){\n const selected=$('#analysisExercise')?.value===item.id;\n const status=item.statusLabel?`<span class="exercise-card-status ${analysisExerciseStatusClass(item)}">${esc(item.statusLabel)}</span>`:'';\n if(compact){\n   return `<button type="button" class="exercise-recent-card ${selected?'on':''}" data-analysis-exercise-id="${item.id}"><span class="exercise-card-name">${esc(item.name)}</span><span class="exercise-card-meta">${esc(item.muscle)}${item.lastSummary?` · ${esc(item.lastSummary)}`:''}</span>${status}</button>`\n }\n return `<button type="button" class="exercise-progress-card ${selected?'on':''}" data-analysis-exercise-id="${item.id}"><span class="exercise-progress-main"><span class="exercise-card-name">${esc(item.name)}</span><span class="exercise-card-meta">${esc(item.muscle)}${item.equipmentName?` · ${esc(item.equipmentName)}`:''}<br>最近 ${fmtDate(item.lastDate)}${item.lastSummary?` · ${esc(item.lastSummary)}`:''}</span></span><span class="exercise-progress-side">${status}</span>${item.statusReason?`<span class="exercise-progress-reason">${esc(item.statusReason)}</span>`:''}</button>`\n}\n\nfunction renderAnalysisExerciseBrowser(items=analysisPerformedExercises()){\n const search=$('#analysisExerciseSearch'),recent=$('#analysisExerciseRecent'),muscles=$('#analysisExerciseMuscles'),attention=$('#analysisExerciseAttention'),list=$('#analysisExerciseList'),count=$('#analysisExerciseCount'),sel=$('#analysisExercise');\n if(!search||!recent||!muscles||!attention||!list||!sel)return;\n const previous=sel.value;\n sel.innerHTML='<option value=""></option>'+items.map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join('');\n sel.value=items.some(item=>item.id===previous)?previous:(items[0]?.id||'');\n search.value=analysisExerciseBrowserQuery;\n const view=exerciseProgressBrowser.buildViewModel(items,{query:analysisExerciseBrowserQuery,muscle:analysisExerciseBrowserMuscle,recentLimit:6,attentionLimit:4});\n recent.innerHTML=view.recent.length?view.recent.map(item=>analysisExerciseBrowserCard(item,true)).join(''):'<div class="exercise-browser-empty" style="grid-column:1/-1">還沒有已完成的動作紀錄。</div>';\n muscles.innerHTML=[`<button type="button" class="${analysisExerciseBrowserMuscle?'':'on'}" data-analysis-muscle="">全部</button>`,...view.muscles.map(m=>`<button type="button" class="${analysisExerciseBrowserMuscle===m?'on':''}" data-analysis-muscle="${esc(m)}">${esc(m)}</button>`)].join('');\n attention.innerHTML=view.attention.length?view.attention.map(item=>analysisExerciseBrowserCard(item)).join(''):'<div class="exercise-browser-empty">目前沒有特別需要處理的進步訊號，照原計畫持續記錄即可。</div>';\n list.innerHTML=view.filtered.length?view.filtered.map(item=>analysisExerciseBrowserCard(item)).join(''):'<div class="exercise-browser-empty">找不到符合搜尋或肌群條件的動作。</div>';\n if(count)count.textContent=`${view.filtered.length} / ${items.length}`;\n search.oninput=()=>{analysisExerciseBrowserQuery=search.value;renderAnalysisExerciseBrowser(items)};\n $$('[data-analysis-muscle]').forEach(button=>button.onclick=()=>{analysisExerciseBrowserMuscle=button.dataset.analysisMuscle||'';renderAnalysisExerciseBrowser(items)});\n $$('[data-analysis-exercise-id]').forEach(button=>button.onclick=()=>{sel.value=button.dataset.analysisExerciseId;renderAnalysisExerciseBrowser(items);requestAnimationFrame(()=>$('#exerciseAnalysis')?.scrollIntoView({behavior:'smooth',block:'start'}))});\n renderExerciseAnalysis(sel.value)\n}\n\n'''
marker='function renderExerciseAnalysis(id){'
if helper.strip() not in app:
    if marker not in app: raise SystemExit('renderExerciseAnalysis marker not found')
    app=app.replace(marker,helper+marker,1)

old_event="$('#analysisExercise').onchange=e=>renderExerciseAnalysis(e.target.value);"
new_event="const analysisExerciseCompat=$('#analysisExercise');if(analysisExerciseCompat)analysisExerciseCompat.onchange=e=>renderExerciseAnalysis(e.target.value);"
if old_event in app:
    app=app.replace(old_event,new_event,1)
elif new_event not in app:
    raise SystemExit('analysisExercise event binding not found')

index_path.write_text(index,encoding='utf-8')
app_path.write_text(app,encoding='utf-8')
