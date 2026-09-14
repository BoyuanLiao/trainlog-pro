from pathlib import Path

index_path=Path('index.html')
app_path=Path('js/app.js')
module_path=Path('js/ui/exercise-progress-browser.js')

index=index_path.read_text(encoding='utf-8')
app=app_path.read_text(encoding='utf-8')
module=module_path.read_text(encoding='utf-8')

# Fresh asset key for the UI behavior change.
index=index.replace('v2.10.3','v2.10.4').replace('?v=2.10.3','?v=2.10.4')
app=app.replace("const APP_VERSION='2.10.3';","const APP_VERSION='2.10.4';")

old_module="""    const attentionLimit=Math.max(1,Number(options.attentionLimit)||4);\n    const recent=sortedByRecent(items);\n    const filtered=recent.filter(item=>matches(item,query,muscle));\n    const attention=recent\n      .filter(item=>Number(item.attentionPriority)>0)\n      .sort((a,b)=>Number(b.attentionPriority)-Number(a.attentionPriority)||String(b.lastDate||'').localeCompare(String(a.lastDate||'')))\n      .slice(0,attentionLimit);\n\n    return {\n      recent:recent.slice(0,recentLimit),\n      attention,\n      filtered,\n      muscles:muscles(items)\n    };"""
new_module="""    const attentionLimit=Math.max(1,Number(options.attentionLimit)||4);\n    const listLimit=Math.max(1,Number(options.listLimit)||6);\n    const recent=sortedByRecent(items);\n    const filtered=recent.filter(item=>matches(item,query,muscle));\n    const hasActiveFilter=Boolean(text(query)||muscle);\n    const showAll=options.showAll===true||hasActiveFilter;\n    const visible=showAll?filtered:filtered.slice(0,listLimit);\n    const attention=recent\n      .filter(item=>Number(item.attentionPriority)>0)\n      .sort((a,b)=>Number(b.attentionPriority)-Number(a.attentionPriority)||String(b.lastDate||'').localeCompare(String(a.lastDate||'')))\n      .slice(0,attentionLimit);\n\n    return {\n      recent:recent.slice(0,recentLimit),\n      attention,\n      filtered,\n      visible,\n      hiddenCount:Math.max(0,filtered.length-visible.length),\n      showAll,\n      hasActiveFilter,\n      muscles:muscles(items)\n    };"""
if old_module not in module:
    raise SystemExit('module anchor not found')
module=module.replace(old_module,new_module,1)

old_state="""let analysisExerciseBrowserQuery='';\nlet analysisExerciseBrowserMuscle='';"""
new_state="""let analysisExerciseBrowserQuery='';\nlet analysisExerciseBrowserMuscle='';\nlet analysisExerciseBrowserExpanded=false;"""
if old_state not in app:
    raise SystemExit('browser state anchor not found')
app=app.replace(old_state,new_state,1)

old_build=""" const view=exerciseProgressBrowser.buildViewModel(items,{query:analysisExerciseBrowserQuery,muscle:analysisExerciseBrowserMuscle,recentLimit:6,attentionLimit:4});"""
new_build=""" const view=exerciseProgressBrowser.buildViewModel(items,{query:analysisExerciseBrowserQuery,muscle:analysisExerciseBrowserMuscle,recentLimit:6,attentionLimit:4,listLimit:6,showAll:analysisExerciseBrowserExpanded});"""
if old_build not in app:
    raise SystemExit('view model anchor not found')
app=app.replace(old_build,new_build,1)

old_list=""" list.innerHTML=view.filtered.length?view.filtered.map(item=>analysisExerciseBrowserCard(item)).join(''):'<div class=\"exercise-browser-empty\">找不到符合搜尋或肌群條件的動作。</div>';\n if(count)count.textContent=`${view.filtered.length} / ${items.length}`;\n search.oninput=()=>{analysisExerciseBrowserQuery=search.value;renderAnalysisExerciseBrowser(items)};\n $$('[data-analysis-muscle]').forEach(button=>button.onclick=()=>{analysisExerciseBrowserMuscle=button.dataset.analysisMuscle||'';renderAnalysisExerciseBrowser(items)});\n $$('[data-analysis-exercise-id]').forEach(button=>button.onclick=()=>{sel.value=button.dataset.analysisExerciseId;renderAnalysisExerciseBrowser(items);requestAnimationFrame(()=>$('#exerciseAnalysis')?.scrollIntoView({behavior:'smooth',block:'start'}))});"""
new_list=""" list.innerHTML=view.filtered.length?view.visible.map(item=>analysisExerciseBrowserCard(item)).join('')+(view.hiddenCount?`<div class=\"actions\" style=\"justify-content:center;margin-top:9px\"><button type=\"button\" class=\"btn small ghost\" data-analysis-show-more>顯示更多（還有 ${view.hiddenCount} 個）</button></div>`:''):'<div class=\"exercise-browser-empty\">找不到符合搜尋或肌群條件的動作。</div>';\n if(count)count.textContent=view.hiddenCount?`顯示 ${view.visible.length} / ${view.filtered.length}`:`${view.filtered.length} / ${items.length}`;\n search.oninput=()=>{analysisExerciseBrowserQuery=search.value;analysisExerciseBrowserExpanded=false;renderAnalysisExerciseBrowser(items)};\n $$('[data-analysis-muscle]').forEach(button=>button.onclick=()=>{analysisExerciseBrowserMuscle=button.dataset.analysisMuscle||'';analysisExerciseBrowserExpanded=false;renderAnalysisExerciseBrowser(items)});\n const showMore=$('[data-analysis-show-more]');if(showMore)showMore.onclick=()=>{analysisExerciseBrowserExpanded=true;renderAnalysisExerciseBrowser(items)};\n $$('[data-analysis-exercise-id]').forEach(button=>button.onclick=()=>{sel.value=button.dataset.analysisExerciseId;renderAnalysisExerciseBrowser(items);requestAnimationFrame(()=>$('#exerciseAnalysis')?.scrollIntoView({behavior:'smooth',block:'start'}))});"""
if old_list not in app:
    raise SystemExit('exercise list render anchor not found')
app=app.replace(old_list,new_list,1)

index_path.write_text(index,encoding='utf-8')
app_path.write_text(app,encoding='utf-8')
module_path.write_text(module,encoding='utf-8')
