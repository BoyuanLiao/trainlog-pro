'use strict';

const assert=require('assert');
const {createBrowserContext,loadBrowserScript}=require('../helpers/load-browser-script');

const ctx=createBrowserContext();
loadBrowserScript(ctx,'js/analysis/training-metrics.js');
const A=ctx.TrainLogAnalysis;

const set=(overrides={})=>({completed:true,kind:'working',rir:'',rpe:'',...overrides});

// completedWorkingSets: all completed non-warmup sets count, regardless of special kind.
assert.strictEqual(A.completedWorkingSets({sets:[
  set(),set({kind:'drop'}),set({kind:'failure'}),set({kind:'backoff'}),
  set({kind:'warmup'}),set({completed:false})
]}),4);
assert.strictEqual(A.completedWorkingSets(null),0);

// effortStats thresholds, missing data, RIR precedence and cardio exclusion.
{
  const workouts=[{exercises:[
    {type:'weight_reps',sets:[
      set({rir:0}),set({rir:2}),set({rir:4}),set(),set({completed:false,rir:0}),
      set({kind:'warmup',rir:0}),set({rir:2,rpe:10})
    ]},
    {type:'weight_reps',sets:[set({rpe:9}),set({rpe:8}),set({rpe:6})]},
    {type:'cardio',sets:[set({rpe:10})]}
  ]}];
  assert.deepStrictEqual(A.effortStats(workouts),{high:2,mid:3,low:2,missing:1,total:8});
}

// analysisConfidence levels and rates.
{
  const mkWorkout=(count,{effort=true}={})=>({exercises:[{
    type:'weight_reps',pattern:'horizontal_push',
    sets:Array.from({length:count},()=>set(effort?{rir:2}:{rir:'',rpe:''}))
  }]});
  const patternForExercise=e=>e.pattern||'';

  const insufficient=A.analysisConfidence([mkWorkout(5)],{
    formalSetCount:()=>5,patternForExercise
  });
  assert.strictEqual(insufficient.level,'insufficient');

  const medium=A.analysisConfidence(Array.from({length:3},()=>mkWorkout(5,{effort:false})),{
    formalSetCount:()=>15,patternForExercise
  });
  assert.strictEqual(medium.level,'medium');
  assert.strictEqual(medium.patternRate,1);

  const high=A.analysisConfidence(Array.from({length:6},()=>mkWorkout(5)),{
    formalSetCount:()=>30,patternForExercise
  });
  assert.strictEqual(high.level,'high');
  assert.strictEqual(high.effortRate,1);

  const low=A.analysisConfidence(Array.from({length:2},()=>mkWorkout(5)),{
    formalSetCount:()=>10,patternForExercise:()=> ''
  });
  assert.strictEqual(low.level,'low');
  assert.strictEqual(low.patternRate,0);
}

// stimulusMap direct/indirect aggregation, filtering and source aggregation.
{
  const workouts=[{exercises:[
    {exerciseId:'press',nameSnapshot:'胸推',sets:[set(),set()]},
    {exerciseId:'fly',nameSnapshot:'夾胸',sets:[set(),set(),set()]},
    {exerciseId:'noise',nameSnapshot:'不應計入',sets:[set()]},
    {exerciseId:'empty',nameSnapshot:'未完成',sets:[set({completed:false})]}
  ]}];
  const profiles={
    press:[{muscle:'胸',weight:1},{muscle:'三頭',weight:.5},{muscle:'肩膀',weight:.5}],
    fly:[{muscle:'胸',weight:1},{muscle:'肩膀',weight:.25}],
    noise:[{muscle:'有氧',weight:1},{muscle:'其他',weight:1},{muscle:'胸',weight:0},{muscle:'背',weight:-1}]
  };
  const result=A.stimulusMap(workouts,{
    profileForExercise:e=>profiles[e.exerciseId]||[],
    sourceForExercise:e=>({key:e.exerciseId,name:e.nameSnapshot,pattern:e.exerciseId,equipment:'器械'})
  });
  assert.strictEqual(result.胸.direct,5);
  assert.strictEqual(result.胸.indirect,0);
  assert.strictEqual(result.胸.total,5);
  assert.strictEqual(result.三頭.indirect,1);
  assert.strictEqual(result.肩膀.total,1.75);
  assert.strictEqual(result.胸.sources.press.total,2);
  assert.strictEqual(result.胸.sources.fly.total,3);
  assert.strictEqual(result.胸.sources.press.pattern,'press');
  assert.strictEqual(result.胸.sources.press.equipment,'器械');
  assert.strictEqual(result.有氧,undefined);
  assert.strictEqual(result.其他,undefined);
  assert.strictEqual(result.背,undefined);
}

// Source fallback and repeated exercise aggregation must be stable.
{
  const workouts=[
    {exercises:[{exerciseId:'row',nameSnapshot:'划船',sets:[set(),set()]}]},
    {exercises:[{exerciseId:'row',nameSnapshot:'划船',sets:[set()]}]}
  ];
  const result=A.stimulusMap(workouts,{profileForExercise:()=>[{muscle:'背',weight:1}]});
  assert.strictEqual(result.背.total,3);
  assert.strictEqual(result.背.sources.row.total,3);
  assert.strictEqual(result.背.sources.row.name,'划船');
}

// movementStats ignores non-training patterns and incomplete/warmup work.
{
  const workouts=[{exercises:[
    {pattern:'horizontal_push',sets:[set(),set(),set({kind:'warmup'}),set({completed:false})]},
    {pattern:'mobility',sets:[set()]},
    {pattern:'scapular_control',sets:[set()]},
    {pattern:'cardio',sets:[set()]}
  ]}];
  assert.deepStrictEqual(
    A.movementStats(workouts,{patternForExercise:e=>e.pattern}),
    {horizontal_push:2}
  );
}

// consistencyStats.
{
  const dayDiff=(a,b)=>Math.round((new Date(b+'T00:00:00Z')-new Date(a+'T00:00:00Z'))/86400000);
  const workouts=[{date:'2026-09-01'},{date:'2026-09-03'},{date:'2026-09-10'}];
  const opts={
    today:'2026-09-14',
    daysBetween:dayDiff,
    weekKeyForDate:d=>d<'2026-09-08'?'w1':'w2',
    rollingStart:()=> '2026-09-01'
  };
  const s=A.consistencyStats(workouts,14,opts);
  assert.strictEqual(s.days,3);
  assert.strictEqual(s.avgPerWeek,1.5);
  assert.strictEqual(s.weeks,2);
  assert.strictEqual(s.totalWeeks,2);
  assert.strictEqual(s.longestGap,6);

  const all=A.consistencyStats(workouts,'all',opts);
  assert.strictEqual(all.totalWeeks,2);
  assert.strictEqual(all.avgPerWeek,1.5);

  assert.deepStrictEqual(A.consistencyStats([],14,opts),{
    days:0,avgPerWeek:0,weeks:0,totalWeeks:2,longestGap:null
  });
}

// exerciseStimulusProfile: custom definitions, pattern defaults and safe exclusions.
assert.deepStrictEqual(A.exerciseStimulusProfile({type:'cardio',muscle:'有氧'}),[]);
assert.deepStrictEqual(A.exerciseStimulusProfile({type:'weight_reps',muscle:'胸'},{
  analysisBasis:()=>({lib:{stimulus:[{muscle:'胸',weight:1},{muscle:'三頭',weight:.5},{muscle:'背',weight:0}]},pattern:'',primary:'胸'})
}),[{muscle:'胸',weight:1},{muscle:'三頭',weight:.5}]);
assert.deepStrictEqual(A.exerciseStimulusProfile({type:'weight_reps',muscle:'胸'},{
  analysisBasis:()=>({lib:{},pattern:'mobility',primary:'胸'})
}),[]);
assert.deepStrictEqual(A.exerciseStimulusProfile({type:'weight_reps',muscle:'胸'},{
  analysisBasis:()=>({lib:{},pattern:'horizontal_push',primary:'胸'})
}),[
  {muscle:'胸',weight:1},{muscle:'三頭',weight:.5},{muscle:'肩膀',weight:.5}
]);
assert.deepStrictEqual(A.exerciseStimulusProfile({type:'weight_reps',muscle:'其他'},{
  analysisBasis:()=>({lib:{},pattern:'unknown',primary:'二頭'})
}),[{muscle:'二頭',weight:1}]);
assert.deepStrictEqual(A.exerciseStimulusProfile({type:'weight_reps',muscle:'腿'},{
  analysisBasis:()=>({lib:{},pattern:'horizontal_push',primary:'腿'})
})[0],{muscle:'腿',weight:1});

console.log('analysis training metrics: comprehensive cases passed');
