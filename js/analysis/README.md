# Analysis 模組

Phase 2 開始把分析邏輯從大型 `js/app.js` 移到可獨立測試的模組。

## `training-metrics.js`

目前提供 `window.TrainLogAnalysis`：
- `completedWorkingSets(exercise)`：完成且非暖身的組數。
- `effortStats(workouts)`：依 RIR / RPE 分類 high / mid / low / missing。
- `analysisConfidence(workouts, options)`：分析可信度分級。

`analysisConfidence` 不直接讀 App state；需要由呼叫端注入：
- `formalSetCount(workouts)`
- `patternForExercise(exercise)`

這是刻意的依賴反轉，避免外部模組反向依賴 `app.js` IIFE 內部函式。

## 規則

- 本目錄優先放 pure logic。
- 禁止直接操作 DOM / LocalStorage。
- 禁止直接讀取可變的全域 `data`。
- App 專屬 resolver 由 `app.js` wrapper 注入。
- 每次抽離一小組函式，同時補 Node fixture test。

## Phase 2b

新增 pure metrics：
- `stimulusMap(workouts, options)`：依注入的 `profileForExercise` 計算肌群刺激組數。
- `movementStats(workouts, options)`：依注入的 `patternForExercise` 統計動作模式。
- `consistencyStats(workouts, days, options)`：訓練規律性；日期邏輯由呼叫端注入。

這三個函式不直接讀 `data`、DOM 或 LocalStorage。

## Phase 2c

- `STIMULUS_BY_PATTERN` 已移入 analysis module。
- `exerciseStimulusProfile(exercise, options)` 已移入 analysis module。
- App 端只注入 `analysisBasis(exercise)`，因此器材/動作庫查找仍留在 App data boundary。

## `progress.js`

純進步判斷模組，不讀取 App state：
- `comparePct(cur, prev)`：期間百分比比較。
- `progressSignals(prev, cur)`：兩次同動作訓練的進步訊號。
- `overloadSummaryFromSessions(sessions)`：最近 5 次漸進超負荷摘要。
- `plateauFromSessions(sessions)`：近期進步趨緩判斷。

`exerciseSessionMetrics()` 目前仍留在 `app.js`，負責把 App workout state 轉成 session metrics。這是刻意保留的 adapter boundary。
