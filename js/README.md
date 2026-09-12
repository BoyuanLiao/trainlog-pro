# JavaScript 結構說明

> 目的：讓下一次維護時先看本檔，再決定要讀哪個來源檔；避免每次從 790KB 的 `app.js` 重新摸索。

## 檔案責任

### `app.js`
TrainLog Pro 的主要應用程式，目前仍是單檔主程式。

目前涵蓋：
- App 常數、Schema 與版本
- LocalStorage 載入、migration、save、recovery
- 系統器材 / 動作 / 課表靜態資料
- 首頁、訓練、紀錄、分析、設定頁 render
- 訓練流程與 Active Workout
- PR、肌群刺激、RIR/RPE、動作模式、一致性等分析
- 匯入 / 匯出 / 備份
- 教學、Modal、Toast 與 DOM event binding

修改前注意：
1. `CURRENT_SCHEMA` 變更時必須同步 migration。
2. 不要直接改掉舊資料欄位而沒有 migration。
3. 分析函式應盡量保持 pure function，方便之後抽模組與測試。
4. UI render 與資料計算不要再新增交叉依賴；新功能優先放到未來的模組檔。
5. 每次修改至少執行 `node --check js/app.js`。

### `motion-gifs.js`
動作庫動畫 / GIF 對應與顯示相關邏輯。

修改前注意：
- 與 `assets/motion3d/` 本機 GIF 及遠端 Exercise Library 資源有關。
- `sw.js` 目前只針對 Exercise Library 遠端動畫做 cache。
- 若改 URL 規則，需同步檢查 `sw.js`。

## `app.js` 主要區塊快速定位

目前可先用下列關鍵字搜尋：
- `APP_KEY`：資料與版本入口
- `GLOSSARY`：術語資料
- `SYSTEM_EQUIPMENT`：系統器材
- `SYSTEM_EXERCISES`：系統動作
- `SYSTEM_PROGRAMS`：系統課表
- `freshData` / `migrate` / `loadData` / `save`：資料層
- `activeWorkout`：訓練流程
- `renderHome`：首頁
- `renderRecords`：訓練紀錄
- `renderAnalysis`：分析
- `STIMULUS_BY_PATTERN`：肌群刺激權重
- `analysisConfidence`：分析可信度
- `renderSettings`：設定
- `export` / `import` / `backup`：資料備份

## 重構目標

`app.js` 不做一次性大爆拆，採可驗證的小步驟：

1. `js/data/`：靜態資料（glossary / equipment / exercises / programs）
2. `js/core/`：storage / migration / shared utils
3. `js/analysis/`：stimulus / progress / consistency / confidence
4. `js/training/`：workout / progression / programs
5. `js/ui/`：各頁 render 與共用 UI

詳細進度見 `../docs/REFACTOR.md`。
