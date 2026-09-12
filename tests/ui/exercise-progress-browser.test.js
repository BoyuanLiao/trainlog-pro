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
  {id:'pulldown',name:'高位下拉',equipmentName:'Lat Pulldown',muscle:'背',lastDate:'2026-09-09',attentionPriority:4}
];

let view=browser.buildViewModel(items,{query:'',muscle:'',recentLimit:3,attentionLimit:2});
assert.deepStrictEqual(Array.from(view.recent,x=>x.id),['press','leg','row'],'recent items must be newest first');
assert.deepStrictEqual(Array.from(view.attention,x=>x.id),['press','pulldown'],'attention items must be priority sorted');
assert.deepStrictEqual(Array.from(view.muscles),['胸','背','腿'],'muscle list should use stable training order');

view=browser.buildViewModel(items,{query:'hammer',muscle:''});
assert.deepStrictEqual(Array.from(view.filtered,x=>x.id),['row'],'search must match equipment names');
view=browser.buildViewModel(items,{query:'',muscle:'背'});
assert.deepStrictEqual(Array.from(view.filtered,x=>x.id),['row','pulldown'],'muscle filter must narrow the list while keeping recency order');

const index=fs.readFileSync('index.html','utf8');
assert(index.includes('id="analysisExerciseSearch"'),'exercise analysis needs a search input');
assert(index.includes('id="analysisExerciseRecent"'),'exercise analysis needs recent exercises');
assert(index.includes('id="analysisExerciseMuscles"'),'exercise analysis needs muscle filters');
assert(index.includes('id="analysisExerciseAttention"'),'exercise analysis needs attention cards');
assert(index.includes('id="analysisExerciseList"'),'exercise analysis needs a browsable exercise list');
assert(/<select[^>]+id="analysisExercise"[^>]+hidden/.test(index),'legacy analysisExercise select must remain hidden for cache compatibility');
assert(!index.includes('<label>選擇做過的動作</label>'),'visible dropdown UI must be removed');

console.log('exercise progress browser contract passed');
