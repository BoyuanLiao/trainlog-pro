'use strict';

const assert=require('assert');
const {createBrowserContext,loadBrowserScript}=require('../helpers/load-browser-script');

const ctx=createBrowserContext();
loadBrowserScript(ctx,'js/analysis/progress.js');
const {comparePct,progressSignals,overloadSummaryFromSessions,plateauFromSessions}=ctx.TrainLogProgress;
const plain=value=>JSON.parse(JSON.stringify(value));

// comparePct
assert.strictEqual(comparePct(0,0),null);
assert.deepStrictEqual(plain(comparePct(10,0)),{pct:null,dir:'up',messageKey:'analysisProgress.previousZero',messageParams:{}});
assert.strictEqual(comparePct(120,100).dir,'up');
assert.strictEqual(comparePct(120,100).text,'+20%');
assert.strictEqual(comparePct(80,100).dir,'down');
assert.strictEqual(comparePct(99.4,100).dir,'same');
assert.strictEqual(comparePct('bad',100).pct,-100);

// incompatible/missing sessions must not invent progress.
assert.deepStrictEqual(plain(progressSignals(null,{type:'weight_reps'})),[]);
assert.deepStrictEqual(plain(progressSignals({type:'cardio'},{type:'weight_reps'})),[]);

// Strength progress signals.
{
  const prev={type:'weight_reps',maxWeight:50,repByWeight:{50:8},bestE1rm:63,volume:1000,rir:1};
  const cur={type:'weight_reps',maxWeight:52.5,repByWeight:{50:9,52.5:8},bestE1rm:67,volume:1100,rir:1};
  const keys=progressSignals(prev,cur).map(x=>x.key);
  assert(keys.includes('weight'));
  assert(keys.includes('reps'));
  assert(keys.includes('e1rm'));
  assert(keys.includes('volume'));
}
{
  const rirKeys=progressSignals(
    {type:'weight_reps',maxWeight:50,repByWeight:{50:8},bestE1rm:100,volume:1000,rir:1},
    {type:'weight_reps',maxWeight:50,repByWeight:{50:8},bestE1rm:101,volume:1000,rir:2}
  ).map(x=>x.key);
  assert(rirKeys.includes('effort'),'higher RIR at similar performance is progress');

  const rpeKeys=progressSignals(
    {type:'weight_reps',maxWeight:50,repByWeight:{50:8},bestE1rm:100,volume:1000,rpe:9},
    {type:'weight_reps',maxWeight:50,repByWeight:{50:8},bestE1rm:101,volume:1000,rpe:8}
  ).map(x=>x.key);
  assert(rpeKeys.includes('effort'),'lower RPE at similar performance is progress');
}

// Thresholds should not trigger on noise.
assert.deepStrictEqual(plain(progressSignals(
  {type:'weight_reps',maxWeight:50,repByWeight:{50:8},bestE1rm:100,volume:1000},
  {type:'weight_reps',maxWeight:50,repByWeight:{50:8},bestE1rm:101.4,volume:1029}
)),[]);

// Cardio and duration use their own signals.
assert.deepStrictEqual(
  Array.from(progressSignals(
    {type:'cardio',minutes:20,distance:3,speed:8},
    {type:'cardio',minutes:23,distance:3.2,speed:8.3}
  ),x=>x.key),
  ['time','distance','speed']
);
assert.deepStrictEqual(
  Array.from(progressSignals({type:'duration',maxSeconds:60},{type:'duration',maxSeconds:63}),x=>x.key),
  ['time']
);

// overloadSummary only compares the most recent five sessions.
{
  const sessions=[
    {date:'1',type:'weight_reps',maxWeight:10,repByWeight:{10:5},bestE1rm:12,volume:50},
    {date:'2',type:'weight_reps',maxWeight:11,repByWeight:{11:5},bestE1rm:13,volume:55},
    {date:'3',type:'weight_reps',maxWeight:11,repByWeight:{11:6},bestE1rm:13.2,volume:66},
    {date:'4',type:'weight_reps',maxWeight:12,repByWeight:{12:6},bestE1rm:14.4,volume:72},
    {date:'5',type:'weight_reps',maxWeight:12,repByWeight:{12:7},bestE1rm:14.8,volume:84},
    {date:'6',type:'weight_reps',maxWeight:13,repByWeight:{13:7},bestE1rm:16,volume:91}
  ];
  const result=overloadSummaryFromSessions(sessions);
  assert.strictEqual(result.transitions,4);
  assert.strictEqual(result.sessions,sessions);
  assert(result.count>=1);
  assert(result.lastSignals.length>=1);
}
assert.strictEqual(overloadSummaryFromSessions([]).lastSignals.length,0);

// Plateau states.
assert.strictEqual(plateauFromSessions([]).state,'insufficient');
{
  const flat=[1,2,3,4].map(i=>({
    date:String(i),type:'weight_reps',maxWeight:50,repByWeight:{50:8},
    bestE1rm:63.3,volume:1000,rir:2
  }));
  assert.strictEqual(plateauFromSessions(flat).state,'slow');
}
{
  const improving=[1,2,3,4].map((i,idx)=>({
    date:String(i),type:'weight_reps',maxWeight:50+idx*2.5,repByWeight:{},
    bestE1rm:60+idx*4,volume:1000+idx*100,rir:2
  }));
  assert.strictEqual(plateauFromSessions(improving).state,'progress');
}
{
  const mixed=[
    {type:'cardio',minutes:30},
    {type:'duration',maxSeconds:60},
    ...[1,2,3].map(i=>({type:'weight_reps',bestE1rm:60,volume:1000,repByWeight:{50:8},maxWeight:50,date:String(i)}))
  ];
  assert.strictEqual(plateauFromSessions(mixed).state,'insufficient','cardio/duration must not satisfy strength plateau sample size');
}

console.log('analysis progress: comprehensive cases passed');
