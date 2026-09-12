# `js/training/`

狀態：**Phase 4 已開始；純訓練統計已從 `app.js` 抽離。**

目前模組：
- `metrics.js`：純訓練統計（volume、effective sets、cardio/duration、best set）。
- `lifecycle.js`：Active Workout 建立與完成狀態轉換。
- `mutations.js`：set / exercise 資料變更（新增、刪除、複製、完成、組別、簡易強度）。
- `progression.js`：最近 3–5 次同動作紀錄的 Smart Progression Engine。

未來負責：
- Active Workout 狀態與生命週期
- 動作 / 組數新增刪除與完成狀態
- 休息計時器與訓練工具
- 課表 / Template 轉成當次訓練
- 未來 Progression Engine

規則：
- 先固定 active workout 的資料格式再搬移。
- 不直接處理 LocalStorage migration，交給 core。
- 訓練計算與 HTML render 盡量分離。
- 任何會改變歷史訓練資料格式的修改，都要同步評估 schema migration。

## 已完成

- `metrics.js`：訓練量、正式組、有氧／計時與最佳組純計算。
- `lifecycle.js`：空白／模板 Active Workout 建立、一般完成、歷史編輯完成、日期排序。
- `tests/training/metrics-characterization.test.js`
- `tests/training/lifecycle-characterization.test.js`

目前 UI confirm / modal / save 副作用仍留在 `app.js`，由 wrapper 呼叫 pure lifecycle。

## Phase 4c

- `mutations.js` 不處理 DOM、save、confirm、timer 或 toast。
- `app.js` 保留 UI event binding 與副作用，只把資料 mutation 委派給 module。
- `tests/training/mutations-characterization.test.js` 會在抽離前後驗證同一組行為。

## Phase 4d

- `progression.js` 讀取最多最近 5 次同動作紀錄。
- action：`new` / `increase_load` / `add_reps` / `reduce_load` / `plateau` / `maintain` / `increase_time`。
- 單次紀錄的加重／維持／降重規則優先保持既有行為。
- 至少 3 次可比較紀錄才啟用 plateau 趨勢判定。
- 支援 unilateral，以左右側較弱一側的 reps / weight 作為進階判斷基準。
- UI render、文字樣式與 app state 仍由 `app.js` 處理。

## Phase 4e — Progression UI / Explainability

- `progression-view.js`：把 engine action 統一轉成顯示標籤、tone、判斷原因與證據範圍。
- 首頁、訓練動作卡、分析頁共用同一 formatter。
- UI 明確顯示「增加次數／加重／降重／平台期／維持」與「參考最近 N 次紀錄」。
- presentation module 不碰 DOM；HTML 組裝仍留在 `app.js`。

## Phase 4f

- `progression-actions.js`：把可執行的 progression action 套到 Active Workout 未完成的 working sets。
- 只自動套用 `increase_load`、`add_reps`、`reduce_load`、`increase_time`。
- 暖身、已完成組、Drop / Failure / Back-off 不會被自動修改。
- `plateau` / `maintain` / `new` 保持建議文字，不自動改訓練資料。
