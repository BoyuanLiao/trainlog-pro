# JavaScript 結構說明

> 目的：讓下一次維護時先看本檔，再決定要讀哪個來源檔；避免每次從大型 `app.js` 重新摸索。

## 現在的載入結構

`index.html` 目前依序載入：

1. `motion-gifs.js`
2. `data/glossary.js`
3. `data/equipment.js`
4. `data/exercises.js`
5. `data/programs.js`
6. `analysis/training-metrics.js`
7. `analysis/progress.js`
8. `core/utils.js`
9. `core/migration.js`
10. `core/storage.js`
11. `training/metrics.js`
12. `training/lifecycle.js`
13. `app.js`

`app.js` 仍包在 IIFE 內，因此之後拆模組時要注意：IIFE 內的 helper 對外部檔案不可見。新的外部模組不得偷偷依賴 `app.js` 內部變數；應使用純函式或明確 dependency injection。

## 檔案責任

### `app.js`
TrainLog Pro 目前的主要應用程式。

目前仍涵蓋：
- App 常數、Schema 與版本
- LocalStorage 載入、migration、save、recovery
- 首頁、訓練、紀錄、分析、設定頁 render
- 訓練流程與 Active Workout
- 尚未抽離的 PR、肌群刺激、動作模式、一致性等分析
- 匯入 / 匯出 / 備份
- 教學、Modal、Toast 與 DOM event binding

已不再放在 `app.js`：
- `GLOSSARY`
- `SYSTEM_EQUIPMENT`
- `SYSTEM_EXERCISES`
- `SYSTEM_PROGRAMS`
- `completedWorkingSets` 的主要實作
- `effortStats` 的主要實作
- `analysisConfidence` 的主要實作

其中三個分析函式目前在 `app.js` 只保留薄 wrapper，以便逐步解除舊程式碼耦合。

修改前注意：
1. `CURRENT_SCHEMA` 變更時必須同步 migration。
2. 不要直接改掉舊資料欄位而沒有 migration。
3. 新的分析邏輯優先放 `analysis/` 並保持 pure/testable。
4. UI render 與資料計算不要再新增交叉依賴。
5. 每次修改至少執行 `node --check js/app.js`，若涉及模組也要檢查對應檔案。

### `data/`
靜態資料模組。詳細規則見 `data/README.md`。

目前：
- `glossary.js`：`GLOSSARY`
- `equipment.js`：`SYSTEM_EQUIPMENT`
- `exercises.js`：`SYSTEM_EXERCISES`
- `programs.js`：`SYSTEM_PROGRAMS`

### `analysis/`
分析 pure logic。詳細規則見 `analysis/README.md`。

目前：
- `training-metrics.js`：完成組數、RIR/RPE effort 統計、分析可信度


### `training/`
訓練流程中的可測試狀態與計算。

目前：
- `metrics.js`：訓練量、正式組、有氧分鐘、計時秒數、最佳組
- `lifecycle.js`：Active Workout 建立／完成／歷史編輯完成等純狀態轉換

### `motion-gifs.js`
動作庫動畫 / GIF 對應與顯示相關邏輯。

修改前注意：
- 與 `assets/motion3d/` 本機 GIF 及遠端 Exercise Library 資源有關。
- `sw.js` 目前只針對 Exercise Library 遠端動畫做 cache。
- 若改 URL 規則，需同步檢查 `sw.js`。

## `app.js` 主要區塊快速定位

目前可先用下列關鍵字搜尋：
- `APP_KEY`：資料與版本入口
- `freshData` / `migrate` / `loadData` / `save`：資料層
- `activeWorkout`：訓練流程
- `renderHome`：首頁
- `renderRecords`：訓練紀錄
- `renderAnalysis`：分析頁 UI
- `STIMULUS_BY_PATTERN`：尚待抽離的肌群刺激權重
- `stimulusMap`：尚待抽離的肌群刺激計算
- `movementStats`：尚待抽離的動作模式統計
- `consistencyStats`：尚待抽離的一致性分析
- `renderSettings`：設定
- `export` / `import` / `backup`：資料備份

若要找靜態資料，不要再搜尋 `app.js`，直接進 `data/`。

## 重構順序

採可驗證的小步驟，不做一次性大爆拆：

1. `js/data/`：靜態資料 — **已完成第一階段**
2. `js/analysis/`：分析 pure logic — **進行中**
3. `js/core/`：storage / migration / shared utils
4. `js/training/`：workout / progression / programs
5. `js/ui/`：各頁 render 與共用 UI

詳細進度見 `../docs/REFACTOR.md`。
