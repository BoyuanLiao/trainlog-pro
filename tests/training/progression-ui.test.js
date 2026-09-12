const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('js/training/progression-view.js','utf8');
const ctx=vm.createContext({window:{},console});
vm.runInContext(source,ctx);
const view=ctx.window.TrainLogProgressionView;
assert.ok(view,'TrainLogProgressionView must be exported');

const cases=[
  ['new','建立基準','neutral'],
  ['increase_load','↑ 建議加重','good'],
  ['increase_time','↑ 增加時間','good'],
  ['add_reps','＋ 增加次數','good'],
  ['reduce_load','↓ 調整負重','warn'],
  ['plateau','↔ 可能平台期','warn'],
  ['maintain','＝ 維持','neutral']
];
for(const [action,label,tone] of cases){
  const formatted=view.formatAdvice({action,state:'same',sessionsUsed:3,text:'測試說明'});
  assert.equal(formatted.label,label,action+' label');
  assert.equal(formatted.tone,tone,action+' tone');
  assert.equal(formatted.evidence,'參考最近 3 次紀錄',action+' evidence');
  assert.equal(formatted.text,'測試說明');
}

assert.equal(view.formatAdvice({action:'maintain',sessionsUsed:1,text:'x'}).evidence,'依上次紀錄');
assert.equal(view.formatAdvice({action:'new',sessionsUsed:0,text:'x'}).evidence,'尚無歷史紀錄');
assert.equal(view.formatAdvice({action:'plateau',sessionsUsed:5,hardTrend:true,text:'x'}).reason,'平台期訊號 + 強度偏高');
assert.equal(view.formatAdvice({action:'plateau',sessionsUsed:4,hardTrend:false,text:'x'}).reason,'近期進步幅度偏低');
assert.equal(view.formatAdvice({action:'increase_load',sessionsUsed:2,text:'x'}).reason,'已達目標上限且強度可控');
assert.equal(view.formatAdvice({action:'add_reps',sessionsUsed:2,text:'x'}).reason,'重量先維持，優先累積次數');
assert.equal(view.formatAdvice({action:'reduce_load',sessionsUsed:2,text:'x'}).reason,'有組數低於目標範圍');

const fallback=view.formatAdvice({state:'up',sessionsUsed:2,text:'fallback'});
assert.equal(fallback.label,'↑ 建議加重');
assert.equal(fallback.tone,'good');
assert.equal(fallback.evidence,'參考最近 2 次紀錄');

assert.equal(view.priority({action:'increase_load'}),0);
assert.equal(view.priority({action:'add_reps'}),1);
assert.equal(view.priority({action:'plateau'}),2);
assert.equal(view.priority({action:'reduce_load'}),3);
assert.equal(view.priority({action:'maintain'}),4);

console.log('progression UI formatter: passed');
