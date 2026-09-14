const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

assert(fs.existsSync('js/ui/exercise-progress-browser.js'),'exercise progress browser module must exist');

const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ui/exercise-progress-browser.js','utf8'),context,{filename:'exercise-progress-browser.js'});
const browser=context.window.TrainLogExerciseProgressBrowser;
assert(browser,'TrainLogExerciseProgressBrowser must be exported');

const items=[
  {id:'row',name:'坐姿划船',equipmentName:'Hammer Strength Row',muscle:'背',lastDate:'2026-09-10',attentionPriority:2},
  {id:'press',name:'胸推機',equipmentName:'Chest Press',muscle:'胸',lastDate:'2026-09-12',attentionPriority:5},
  {id:'leg',name:'腿推機',equipmentName:'Leg Press',muscle:'腿',lastDate:'2026-09-11',attentionPriority:0},
  {id:'pulldown',name:'高位下拉',equipmentName:'Lat Pulldown',muscle:'背',lastDate:'2026-09-09',attentionPriority:4},
  {id:'shoulder',name:'肩推機',equipmentName:'Shoulder Press',muscle:'肩膀',lastDate:'2026-09-08',attentionPriority:1},
  {id:'curl',name:'二頭彎舉',equipmentName:'Biceps Curl',muscle:'二頭',lastDate:'2026-09-07',attentionPriority:0},
  {id:'extension',name:'三頭伸展',equipmentName:'Triceps Extension',muscle:'三頭',lastDate:'2026-09-06',attentionPriority:0},
  {id:'crunch',name:'腹部捲曲',equipmentName:'Abdominal Crunch',muscle:'腹部',lastDate:'2026-09-05',attentionPriority:0}
];

let view=browser.buildViewModel(items,{query:'',muscle:'',recentLimit:3,attentionLimit:2,listLimit:6});
assert.deepStrictEqual(Array.from(view.recent,x=>x.id),['press','leg','row'],'recent items must be newest first');
assert.deepStrictEqual(Array.from(view.attention,x=>x.id),['press','pulldown'],'attention items must be priority sorted');
assert.deepStrictEqual(Array.from(view.muscles),['胸','背','腿','肩膀','二頭','三頭','腹部'],'muscle list should use stable training order');
assert.deepStrictEqual(Array.from(view.visible,x=>x.id),['press','leg','row','pulldown','shoulder','curl'],'default full list should be limited to six items');
assert.strictEqual(view.hiddenCount,2,'default list should report remaining hidden items');
assert.strictEqual(view.showAll,false,'default unfiltered list should remain collapsed');

view=browser.buildViewModel(items,{query:'press',muscle:'',listLimit:6});
assert.deepStrictEqual(Array.from(view.visible,x=>x.id),['press','shoulder'],'search must show every matched result, not truncate matches');
assert.strictEqual(view.hiddenCount,0,'search results should not be hidden behind show-more');
assert.strictEqual(view.showAll,true,'active search should expand matching results');

view=browser.buildViewModel(items,{query:'',muscle:'背',listLimit:6});
assert.deepStrictEqual(Array.from(view.visible,x=>x.id),['row','pulldown'],'muscle filter must show all matching items');
assert.strictEqual(view.showAll,true,'muscle filter should expand matching results');

view=browser.buildViewModel(items,{query:'',muscle:'',listLimit:6,showAll:true});
assert.strictEqual(view.visible.length,8,'explicit showAll should expose the complete list');
assert.strictEqual(view.hiddenCount,0,'expanded list should have no hidden count');

const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('js/app.js','utf8');
assert(index.includes('id="analysisExerciseSearch"'),'exercise analysis needs a search input');
assert(index.includes('id="analysisExerciseRecent"'),'exercise analysis needs recent exercises');
assert(index.includes('id="analysisExerciseMuscles"'),'exercise analysis needs muscle filters');
assert(index.includes('id="analysisExerciseAttention"'),'exercise analysis needs attention cards');
assert(index.includes('id="analysisExerciseList"'),'exercise analysis needs a browsable exercise list');
assert(/<select[^>]+id="analysisExercise"[^>]+hidden/.test(index),'legacy analysisExercise select must remain hidden for cache compatibility');
assert(!index.includes('<label>選擇做過的動作</label>'),'visible dropdown UI must be removed');
assert(app.includes('data-analysis-show-more'),'collapsed exercise list needs a show-more control');

console.log('exercise progress browser contract passed');
