from pathlib import Path
import re

index_path=Path('index.html')
app_path=Path('js/app.js')
index=index_path.read_text(encoding='utf-8')
app=app_path.read_text(encoding='utf-8')

index=index.replace('v2.10.2','v2.10.3')
app=app.replace("const APP_VERSION='2.10.2';","const APP_VERSION='2.10.3';")

css_tag='<link rel="stylesheet" href="css/exercise-progress-browser.css?v=2.10.3">'
if css_tag not in index:
    anchor='<link rel="stylesheet" href="css/app.css?v=2.10.3">'
    if anchor not in index: raise SystemExit('app css tag not found')
    index=index.replace(anchor,anchor+'\n'+css_tag,1)

script_tag='<script src="js/ui/exercise-progress-browser.js?v=2.10.3"></script>'
if script_tag not in index:
    anchor='<script src="js/training/progression-view.js?v=2.10.3"></script>'
    if anchor not in index: raise SystemExit('progression view script tag not found')
    index=index.replace(anchor,anchor+'\n'+script_tag,1)

new_panel='''    <div class="analysis-panel hidden" data-analysis-panel="exercise">
      <div class="section">動作進步與個人最佳（PR） <button class="info-btn" type="button" data-info="pr" aria-label="PR 說明">i</button></div>
      <div class="card exercise-progress-browser">
        <div class="field">
          <label for="analysisExerciseSearch">搜尋做過的動作</label>
          <input id="analysisExerciseSearch" type="search" placeholder="搜尋動作、器械或肌群..." autocomplete="off">
          <div class="hint">不用下拉選單；可以從最近做過、肌群或值得關注的動作直接進入分析。</div>
        </div>
        <select id="analysisExercise" hidden aria-hidden="true" tabindex="-1"></select>
        <div class="exercise-browser-block">
          <div class="exercise-browser-title"><span>最近做過</span><span>快速切換</span></div>
          <div id="analysisExerciseRecent" class="exercise-recent-grid"></div>
        </div>
        <div class="exercise-browser-block">
          <div class="exercise-browser-title"><span>依肌群</span><span>篩選全部動作</span></div>
          <div id="analysisExerciseMuscles" class="exercise-muscle-filters"></div>
        </div>
        <div class="exercise-browser-block">
          <div class="exercise-browser-title"><span>值得關注</span><span>依進步建議排序</span></div>
          <div id="analysisExerciseAttention" class="exercise-attention-grid"></div>
        </div>
        <div class="exercise-browser-block">
          <div class="exercise-browser-title"><span>全部做過的動作</span><span id="analysisExerciseCount" class="exercise-browser-count"></span></div>
          <div id="analysisExerciseList" class="exercise-browser-list"></div>
        </div>
      </div>
      <div class="section exercise-detail-section">動作詳細分析</div>
      <div class="card"><div id="exerciseAnalysis"></div></div>
    </div>

'''
panel_pattern=re.compile(r'    <div class="analysis-panel hidden" data-analysis-panel="exercise">.*?(?=    <div class="analysis-panel hidden" data-analysis-panel="load">)',re.S)
index,count=panel_pattern.subn(new_panel,index,count=1)
if count!=1: raise SystemExit(f'expected one exercise panel, got {count}')

binding='const trainingProgressionActions=window.TrainLogProgressionActions;'
extra='const exerciseProgressBrowser=window.TrainLogExerciseProgressBrowser;'
if extra not in app:
    if binding not in app: raise SystemExit('progression actions binding not found')
    app=app.replace(binding,binding+'\n'+extra,1)

old_selector=re.compile(r" const sel=\$\('#analysisExercise'\),prev=sel\.value;.*? renderExerciseAnalysis\(sel\.value\)\n}",re.S)
app,count=old_selector.subn(" const performed=analysisPerformedExercises();\n renderAnalysisExerciseBrowser(performed)\n}",app,count=1)
if count!=1: raise SystemExit(f'expected one legacy exercise selector block, got {count}')

helper='''let analysisExerciseBrowserQuery='';
let analysisExerciseBrowserMuscle='';

function analysisPerformedExercises(){
 const performedMap=new Map();
 data.workouts.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach(w=>{
   (w.exercises||[]).forEach(e=>{
     if(!e.exerciseId||performedMap.has(e.exerciseId))return;
     const lib=getExercise(e.exerciseId)||{};
     const equipmentId=e.equipmentId||lib.equipmentId||'';
     const sysEq=SYSTEM_EQUIPMENT.find(x=>x.id===equipmentId);
     const myEq=data.equipment.find(x=>x.id===equipmentId);
     const equipmentName=sysEq?.nameZh||myEq?.name||'';
     performedMap.set(e.exerciseId,{id:e.exerciseId,name:e.nameSnapshot||lib.name||'已做過的動作',muscle:e.muscle||lib.muscle||'其他',equipmentName,lastDate:w.date});
   })
 });
 const attentionWeight={reduce_load:50,plateau:40,increase_load:30,add_reps:20,increase_time:20};
 return [...performedMap.values()].sort((a,b)=>b.lastDate.localeCompare(a.lastDate)||a.name.localeCompare(b.name,'zh-Hant')).map(item=>{
   const sessions=exerciseSessionMetrics(item.id),last=sessions.at(-1);
   const adv=progressionAdvice(item.id),view=progressionDisplay(adv);
   return {...item,lastSummary:last?.label||'',action:adv?.action||'',statusLabel:view?.label||'',statusTone:view?.tone||'',statusReason:view?.reason||'',attentionPriority:(attentionWeight[adv?.action]||0)+(Number(view?.priority)||0)/10}
 })
}

function analysisExerciseStatusClass(item){return item?.statusTone==='good'?'good':item?.statusTone==='warn'?'warn':item?.statusTone==='accent'?'accent':''}

function analysisExerciseBrowserCard(item,compact=false){
 const selected=$('#analysisExercise')?.value===item.id;
 const status=item.statusLabel?`<span class="exercise-card-status ${analysisExerciseStatusClass(item)}">${esc(item.statusLabel)}</span>`:'';
 if(compact)return `<button type="button" class="exercise-recent-card ${selected?'on':''}" data-analysis-exercise-id="${item.id}"><span class="exercise-card-name">${esc(item.name)}</span><span class="exercise-card-meta">${esc(item.muscle)}${item.lastSummary?` · ${esc(item.lastSummary)}`:''}</span>${status}</button>`;
 return `<button type="button" class="exercise-progress-card ${selected?'on':''}" data-analysis-exercise-id="${item.id}"><span class="exercise-progress-main"><span class="exercise-card-name">${esc(item.name)}</span><span class="exercise-card-meta">${esc(item.muscle)}${item.equipmentName?` · ${esc(item.equipmentName)}`:''}<br>最近 ${fmtDate(item.lastDate)}${item.lastSummary?` · ${esc(item.lastSummary)}`:''}</span></span><span class="exercise-progress-side">${status}</span>${item.statusReason?`<span class="exercise-progress-reason">${esc(item.statusReason)}</span>`:''}</button>`
}

function renderAnalysisExerciseBrowser(items=analysisPerformedExercises()){
 const search=$('#analysisExerciseSearch'),recent=$('#analysisExerciseRecent'),muscles=$('#analysisExerciseMuscles'),attention=$('#analysisExerciseAttention'),list=$('#analysisExerciseList'),count=$('#analysisExerciseCount'),sel=$('#analysisExercise');
 if(!search||!recent||!muscles||!attention||!list||!sel)return;
 const previous=sel.value;
 sel.innerHTML='<option value=""></option>'+items.map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join('');
 sel.value=items.some(item=>item.id===previous)?previous:(items[0]?.id||'');
 search.value=analysisExerciseBrowserQuery;
 const view=exerciseProgressBrowser.buildViewModel(items,{query:analysisExerciseBrowserQuery,muscle:analysisExerciseBrowserMuscle,recentLimit:6,attentionLimit:4});
 recent.innerHTML=view.recent.length?view.recent.map(item=>analysisExerciseBrowserCard(item,true)).join(''):'<div class="exercise-browser-empty" style="grid-column:1/-1">還沒有已完成的動作紀錄。</div>';
 muscles.innerHTML=[`<button type="button" class="${analysisExerciseBrowserMuscle?'':'on'}" data-analysis-muscle="">全部</button>`,...view.muscles.map(m=>`<button type="button" class="${analysisExerciseBrowserMuscle===m?'on':''}" data-analysis-muscle="${esc(m)}">${esc(m)}</button>`)].join('');
 attention.innerHTML=view.attention.length?view.attention.map(item=>analysisExerciseBrowserCard(item)).join(''):'<div class="exercise-browser-empty">目前沒有特別需要處理的進步訊號，照原計畫持續記錄即可。</div>';
 list.innerHTML=view.filtered.length?view.filtered.map(item=>analysisExerciseBrowserCard(item)).join(''):'<div class="exercise-browser-empty">找不到符合搜尋或肌群條件的動作。</div>';
 if(count)count.textContent=`${view.filtered.length} / ${items.length}`;
 search.oninput=()=>{analysisExerciseBrowserQuery=search.value;renderAnalysisExerciseBrowser(items)};
 $$('[data-analysis-muscle]').forEach(button=>button.onclick=()=>{analysisExerciseBrowserMuscle=button.dataset.analysisMuscle||'';renderAnalysisExerciseBrowser(items)});
 $$('[data-analysis-exercise-id]').forEach(button=>button.onclick=()=>{sel.value=button.dataset.analysisExerciseId;renderAnalysisExerciseBrowser(items);requestAnimationFrame(()=>$('#exerciseAnalysis')?.scrollIntoView({behavior:'smooth',block:'start'}))});
 renderExerciseAnalysis(sel.value)
}

'''
marker='function renderExerciseAnalysis(id){'
if helper not in app:
    if marker not in app: raise SystemExit('renderExerciseAnalysis marker not found')
    app=app.replace(marker,helper+marker,1)

old_event="$('#analysisExercise').onchange=e=>renderExerciseAnalysis(e.target.value);"
new_event="const analysisExerciseCompat=$('#analysisExercise');if(analysisExerciseCompat)analysisExerciseCompat.onchange=e=>renderExerciseAnalysis(e.target.value);"
if old_event in app: app=app.replace(old_event,new_event,1)
elif new_event not in app: raise SystemExit('analysis exercise event binding not found')

index_path.write_text(index,encoding='utf-8')
app_path.write_text(app,encoding='utf-8')
