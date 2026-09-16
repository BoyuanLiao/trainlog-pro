from pathlib import Path

analysis_path=Path('js/analysis/training-metrics.js')
app_path=Path('js/app.js')
index_path=Path('index.html')

analysis=analysis_path.read_text(encoding='utf-8')
app=app_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')

start=analysis.index('  function stimulusMap(workouts, options = {}) {')
end=analysis.index('\n  function movementStats',start)
replacement="""  function stimulusMap(workouts, options = {}) {
    const profileForExercise = typeof options.profileForExercise === 'function'
      ? options.profileForExercise
      : () => [];
    const sourceForExercise = typeof options.sourceForExercise === 'function'
      ? options.sourceForExercise
      : () => null;
    const out = {};
    (workouts || []).forEach(workout => (workout.exercises || []).forEach(exercise => {
      const sets = completedWorkingSets(exercise);
      if (!sets) return;
      const source = sourceForExercise(exercise) || {};
      (profileForExercise(exercise) || []).forEach(item => {
        const muscle = item?.muscle;
        const weight = num(item?.weight);
        if (!muscle || muscle === '有氧' || muscle === '其他' || weight <= 0) return;
        if (!out[muscle]) out[muscle] = { direct: 0, indirect: 0, total: 0, sources: {} };
        const direct = weight >= 0.999;
        const amount = sets * weight;
        if (direct) out[muscle].direct += amount;
        else out[muscle].indirect += amount;
        out[muscle].total += amount;

        const key = source.key || exercise.exerciseId || exercise.nameSnapshot || 'unknown';
        if (!out[muscle].sources[key]) {
          out[muscle].sources[key] = {
            name: source.name || exercise.nameSnapshot || '動作',
            direct: 0,
            indirect: 0,
            total: 0,
            pattern: source.pattern || '',
            equipment: source.equipment || '',
          };
        }
        if (direct) out[muscle].sources[key].direct += amount;
        else out[muscle].sources[key].indirect += amount;
        out[muscle].sources[key].total += amount;
      });
    }));
    return out;
  }
"""
analysis=analysis[:start]+replacement+analysis[end:]

old_wrapper="function stimulusMap(workouts){return window.TrainLogAnalysis.stimulusMap(workouts,{profileForExercise:exerciseStimulusProfile})}"
new_wrapper="""function stimulusMap(workouts){
 return window.TrainLogAnalysis.stimulusMap(workouts,{
  profileForExercise:exerciseStimulusProfile,
  sourceForExercise:e=>{
   const basis=exerciseAnalysisBasis(e);
   return{key:e.exerciseId||e.nameSnapshot||'unknown',name:e.nameSnapshot||basis.lib.name||'動作',pattern:basis.pattern,equipment:basis.eq?.nameZh||''}
  }
 })
}"""
if old_wrapper not in app:
    raise SystemExit('stimulusMap app wrapper anchor not found')
app=app.replace(old_wrapper,new_wrapper,1)

if "const APP_VERSION='2.10.5';" not in app:
    raise SystemExit('APP_VERSION 2.10.5 anchor not found')
app=app.replace("const APP_VERSION='2.10.5';","const APP_VERSION='2.10.6';",1)

if '?v=2.10.5' not in index:
    raise SystemExit('index cache key 2.10.5 anchor not found')
index=index.replace('?v=2.10.5','?v=2.10.6')
index=index.replace('TrainLog Pro v2.10.5','TrainLog Pro v2.10.6')

analysis_path.write_text(analysis,encoding='utf-8')
app_path.write_text(app,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
