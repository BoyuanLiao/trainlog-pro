const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('js/training/progression-view.js','utf8');
const ctx=vm.createContext({window:{},console});
vm.runInContext(source,ctx);
const view=ctx.window.TrainLogProgressionView;
assert.ok(view,'TrainLogProgressionView must be exported');

const dict={
 'progression.action.newLabel':'建立基準','progression.action.newReason':'先建立可比較的工作重量與次數',
 'progression.action.increaseLoadLabel':'↑ 建議加重','progression.action.increaseLoadReason':'已達目標上限且強度可控',
 'progression.action.increaseTimeLabel':'↑ 增加時間','progression.action.increaseTimeReason':'已達目前時間目標上限',
 'progression.action.addRepsLabel':'＋ 增加次數','progression.action.addRepsReason':'重量先維持，優先累積次數',
 'progression.action.plateauLabel':'↔ 可能平台期','progression.action.plateauReason':'近期進步幅度偏低',
 'progression.action.reduceLoadLabel':'↓ 調整負重','progression.action.reduceLoadReason':'有組數低於目標範圍',
 'progression.action.maintainLabel':'＝ 維持','progression.action.maintainReason':'維持目前安排並持續累積紀錄',
 'progression.action.plateauHardReason':'平台期訊號 + 強度偏高',
 'progression.evidenceNone':'尚無歷史紀錄','progression.evidenceOne':'依上次紀錄','progression.evidenceRecent':'參考最近 {count} 次紀錄',
 'test.text':'測試說明'
};
const tr=(key,vars={})=>String(dict[key]||key).replace(/\{(\w+)\}/g,(m,k)=>Object.hasOwn(vars,k)?String(vars[k]):m);

const cases=[
 ['new','建立基準','neutral'],['increase_load','↑ 建議加重','good'],['increase_time','↑ 增加時間','good'],
 ['add_reps','＋ 增加次數','good'],['reduce_load','↓ 調整負重','warn'],['plateau','↔ 可能平台期','warn'],['maintain','＝ 維持','neutral']
];
for(const [action,label,tone] of cases){
 const formatted=view.formatAdvice({action,state:'same',sessionsUsed:3,messageKey:'test.text',messageParams:{}},tr);
 assert.equal(formatted.label,label);assert.equal(formatted.tone,tone);assert.equal(formatted.evidence,'參考最近 3 次紀錄');assert.equal(formatted.text,'測試說明');
}
assert.equal(view.formatAdvice({action:'maintain',sessionsUsed:1},tr).evidence,'依上次紀錄');
assert.equal(view.formatAdvice({action:'new',sessionsUsed:0},tr).evidence,'尚無歷史紀錄');
assert.equal(view.formatAdvice({action:'plateau',sessionsUsed:5,hardTrend:true},tr).reason,'平台期訊號 + 強度偏高');
assert.equal(view.formatAdvice({action:'plateau',sessionsUsed:4},tr).reason,'近期進步幅度偏低');
assert.equal(view.priority({action:'increase_load'}),0);
assert.equal(view.priority({action:'maintain'}),4);
console.log('progression UI formatter: passed');