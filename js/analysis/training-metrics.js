/**
 * TrainLog Pro analysis metrics.
 *
 * Pure/testable analysis logic. This file must not access DOM,
 * LocalStorage, or mutable app state directly.
 */
(() => {
  'use strict';


  const STIMULUS_BY_PATTERN={
   horizontal_push:[['胸',1],['三頭',.5],['肩膀',.5]],
   shoulder_horizontal_adduction:[['胸',1],['肩膀',.25]],
   vertical_push:[['肩膀',1],['三頭',.5]],
   horizontal_pull:[['背',1],['二頭',.5],['肩膀',.25]],
   vertical_pull:[['背',1],['二頭',.5]],
   shoulder_extension:[['背',1],['二頭',.25]],
   shoulder_abduction:[['肩膀',1]],
   elbow_flexion:[['二頭',1]],
   elbow_extension:[['三頭',1]],
   knee_dominant:[['腿',1]],
   knee_extension:[['腿',1]],
   knee_flexion:[['腿',1]],
   hip_extension:[['腿',1]],
   hip_abduction:[['腿',1]],
   hip_adduction:[['腿',1]],
   plantar_flexion:[['腿',1]],
   core_flexion:[['腹部',1]],
   core_stability:[['腹部',1]],
   rotation:[['腹部',1]]
  };
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



  function stimulusMap(workouts, options = {}) {
    const profileForExercise = typeof options.profileForExercise === 'function'
      ? options.profileForExercise
      : () => [];
    const out = {};
    (workouts || []).forEach(workout => (workout.exercises || []).forEach(exercise => {
      const sets = completedWorkingSets(exercise);
      if (!sets) return;
      (profileForExercise(exercise) || []).forEach(item => {
        const muscle = item?.muscle;
        const weight = num(item?.weight);
        if (!muscle || weight <= 0) return;
        out[muscle] = (out[muscle] || 0) + sets * weight;
      });
    }));
    return out;
  }

  function movementStats(workouts, options = {}) {
    const patternForExercise = typeof options.patternForExercise === 'function'
      ? options.patternForExercise
      : () => '';
    const ignored = new Set(['cardio', 'mobility', 'scapular_control']);
    const out = {};
    (workouts || []).forEach(workout => (workout.exercises || []).forEach(exercise => {
      const sets = completedWorkingSets(exercise);
      if (!sets) return;
      const pattern = patternForExercise(exercise);
      if (!pattern || ignored.has(pattern)) return;
      out[pattern] = (out[pattern] || 0) + sets;
    }));
    return out;
  }

  function consistencyStats(workouts, days, options = {}) {
    const list = workouts || [];
    const numericDays = num(days);
    const today = typeof options.today === 'function' ? options.today() : options.today;
    const daysBetween = typeof options.daysBetween === 'function' ? options.daysBetween : () => 0;
    const weekKeyForDate = typeof options.weekKeyForDate === 'function' ? options.weekKeyForDate : date => date;
    const rollingStart = typeof options.rollingStart === 'function' ? options.rollingStart : () => today;

    if (!list.length) {
      return {
        days: 0,
        avgPerWeek: 0,
        weeks: 0,
        totalWeeks: days === 'all' ? 0 : Math.max(1, Math.ceil(numericDays / 7)),
        longestGap: null,
      };
    }

    const uniq = [...new Set(list.map(workout => workout.date).filter(Boolean))].sort();
    let spanDays = numericDays;
    if (days === 'all') spanDays = Math.max(1, daysBetween(uniq[0], today) + 1);
    const weekKeys = new Set(list.map(workout => weekKeyForDate(workout.date)));
    let longest = 0;
    const boundaries = [days === 'all' ? uniq[0] : rollingStart(days), ...uniq, today].filter(Boolean).sort();
    const uniqueBounds = [...new Set(boundaries)];
    for (let i = 1; i < uniqueBounds.length; i++) {
      longest = Math.max(longest, Math.max(0, daysBetween(uniqueBounds[i - 1], uniqueBounds[i]) - 1));
    }
    return {
      days: uniq.length,
      avgPerWeek: list.length / (spanDays / 7),
      weeks: weekKeys.size,
      totalWeeks: Math.max(1, Math.ceil(spanDays / 7)),
      longestGap: longest,
    };
  }



  function exerciseStimulusProfile(exercise, options = {}) {
    if (!exercise || exercise.type === 'cardio') return [];
    const analysisBasis = typeof options.analysisBasis === 'function'
      ? options.analysisBasis
      : () => ({ lib: {}, pattern: '', primary: exercise?.muscle || '其他' });
    const { lib = {}, pattern = '', primary = exercise?.muscle || '其他' } = analysisBasis(exercise) || {};
    if (Array.isArray(lib.stimulus) && lib.stimulus.length) {
      return lib.stimulus
        .map(item => ({ muscle: item?.muscle, weight: num(item?.weight) }))
        .filter(item => item.muscle && item.weight > 0);
    }
    if (['mobility', 'scapular_control'].includes(pattern)) return [];
    const base = (STIMULUS_BY_PATTERN[pattern] || []).map(([muscle, weight]) => ({ muscle, weight }));
    if (!base.length && primary && !['有氧', '其他'].includes(primary)) return [{ muscle: primary, weight: 1 }];
    if (primary && !['有氧', '其他'].includes(primary) && !base.some(item => item.muscle === primary)) {
      base.unshift({ muscle: primary, weight: 1 });
    }
    return base;
  }

  window.TrainLogAnalysis = Object.freeze({
    completedWorkingSets,
    effortStats,
    analysisConfidence,
    stimulusMap,
    movementStats,
    consistencyStats,
    exerciseStimulusProfile,
  });
})();
