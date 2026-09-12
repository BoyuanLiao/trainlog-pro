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
