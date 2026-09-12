/**
 * TrainLog Pro analysis metrics.
 *
 * Pure/testable analysis logic. This file must not access DOM,
 * LocalStorage, or mutable app state directly.
 */
(() => {
  'use strict';

  const num = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function completedWorkingSets(exercise) {
    return (exercise?.sets || []).filter(set => set.completed && set.kind !== 'warmup').length;
  }

  function effortStats(workouts) {
    const stats = { high: 0, mid: 0, low: 0, missing: 0, total: 0 };
    (workouts || []).forEach(workout => (workout.exercises || []).forEach(exercise =>
      (exercise.sets || []).forEach(set => {
        if (!set.completed || set.kind === 'warmup' || exercise.type === 'cardio') return;
        stats.total++;
        const hasRir = set.rir !== '' && set.rir != null;
        const hasRpe = set.rpe !== '' && set.rpe != null;
        if (!hasRir && !hasRpe) {
          stats.missing++;
          return;
        }
        if (hasRir) {
          const value = num(set.rir);
          if (value <= 1) stats.high++;
          else if (value <= 3) stats.mid++;
          else stats.low++;
        } else {
          const value = num(set.rpe);
          if (value >= 9) stats.high++;
          else if (value >= 7) stats.mid++;
          else stats.low++;
        }
      })
    ));
    return stats;
  }

  function analysisConfidence(workouts, options = {}) {
    const list = workouts || [];
    const formal = typeof options.formalSetCount === 'function'
      ? options.formalSetCount(list)
      : 0;
    const patternForExercise = typeof options.patternForExercise === 'function'
      ? options.patternForExercise
      : () => '';
    const effort = effortStats(list);
    let exTotal = 0;
    let recognized = 0;

    list.forEach(workout => (workout.exercises || []).forEach(exercise => {
      const sets = completedWorkingSets(exercise);
      if (!sets || exercise.type === 'cardio') return;
      exTotal += sets;
      if (patternForExercise(exercise)) recognized += sets;
    }));

    const effortRecorded = effort.high + effort.mid + effort.low;
    const effortRate = effort.total ? effortRecorded / effort.total : 0;
    const patternRate = exTotal ? recognized / exTotal : 0;
    let level = 'low';
    let label = '低';

    if (list.length < 2 || formal < 6) {
      level = 'insufficient';
      label = '資料不足';
    } else if (list.length >= 6 && formal >= 30 && effortRate >= 0.6 && patternRate >= 0.75) {
      level = 'high';
      label = '高';
    } else if (list.length >= 3 && formal >= 15 && patternRate >= 0.5) {
      level = 'medium';
      label = '中';
    }

    return { level, label, formal, workouts: list.length, effortRate, patternRate };
  }

  window.TrainLogAnalysis = Object.freeze({
    completedWorkingSets,
    effortStats,
    analysisConfidence,
  });
})();
