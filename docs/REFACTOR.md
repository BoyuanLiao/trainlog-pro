# TrainLog Pro 重構紀錄

此文件是下次接手時的第一個重構入口。目標是把目前大型 `js/app.js` 漸進拆分，而不是一次重寫。

## 原則

- 功能行為優先保持不變。
- 每次只拆一個責任清楚、可驗證的區塊。
- 先抽 pure data / pure logic，再抽有 DOM 與儲存副作用的流程。
- Schema / LocalStorage 相容性高於程式碼漂亮程度。
- 拆分後立即補最低限度驗證，不留半搬移狀態。

## Phase 0：架構盤點與文件化

狀態：**進行中 / 本次處理**

- [x] 根目錄 README 改成專案入口
- [x] `js/README.md` 記錄大型主檔責任與搜尋索引
- [x] `css/README.md`
- [x] `assets/README.md` 與 `assets/motion3d/README.md`
- [x] `.github/README.md` 與 workflows legacy 說明
- [x] 建立預定模組目錄 README
- [ ] 建立真正的自動化 smoke / unit tests

## Phase 1：靜態資料

狀態：**完成**

已從 `js/app.js` 搬出：
- [x] `js/data/glossary.js` — `GLOSSARY`
- [x] `js/data/equipment.js` — `SYSTEM_EQUIPMENT`
- [x] `js/data/exercises.js` — `SYSTEM_EXERCISES`
- [x] `js/data/programs.js` — `SYSTEM_PROGRAMS`
- [x] `index.html` 明確在 `app.js` 前載入 data scripts
- [x] JavaScript syntax check
- [x] 靜態資料同一 VM context 載入檢查

重構原則：只搬位置，不改 ID、資料格式與內容語意。

下一步進入 Phase 2：先抽可獨立驗證的分析 pure logic。

## Phase 2：分析邏輯

狀態：**進行中**

已完成第一批 pure/testable boundary：
- [x] `js/analysis/training-metrics.js`
- [x] `completedWorkingSets` 移出實作，`app.js` 保留薄 wrapper
- [x] `effortStats` 移出實作，`app.js` 保留薄 wrapper
- [x] `analysisConfidence` 移出實作，以 callback 注入 App-specific dependency
- [x] Node fixture tests 驗證 RIR/RPE 分類與可信度門檻

下一批候選：`STIMULUS_BY_PATTERN` / `stimulusMap` / `movementStats`。先處理依賴注入，再搬實作。


預定：
- `js/analysis/stimulus.js`
- `js/analysis/progress.js`
- `js/analysis/consistency.js`
- `js/analysis/confidence.js`

優先抽出目前已接近 pure function 的邏輯，例如：
- `completedWorkingSets`
- `exerciseStimulusProfile`
- `stimulusMap`
- `effortStats`
- `movementStats`
- `consistencyStats`
- `analysisConfidence`
- 前一期比較函式

驗證：建立固定 fixture，確認搬移前後輸出一致。

## Phase 3：Core

- [x] `js/core/migration.js`：schema migration 已抽離並有 characterization tests
- [x] `js/core/storage.js`：load/recovery/snapshot/save 已抽離並有 characterization tests


預定：
- `js/core/utils.js`
- `js/core/storage.js`
- `js/core/migration.js`

高風險區：
- `CURRENT_SCHEMA`
- `migrate`
- `loadData`
- recovery 副本
- import / backup 相容性

此階段不可只做 syntax check，必須測舊 schema migration 與損壞 JSON recovery。

## Phase 4：Training

預定：
- active workout state
- set 操作
- rest timer
- program/template 展開
- 未來 progression engine

拆分前需先固定 active workout 的資料契約。

## Phase 5：UI

最後才拆 render / modal / event binding：
- home
- train
- records
- analysis
- settings
- shared UI

原因：UI 對全域狀態與 DOM 依賴最多，先拆風險最高。

## 目前技術債

1. `js/app.js` 約 790KB，責任過多。
2. `css/app.css` 約 50KB，之後也應依功能漸進拆分。
3. `.github/workflows/` 有 v2.9.x 歷史一次性 workflow，需確認後再清理。
4. `index.html` 顯示 v2.10.1，但部分 CSS cache query 仍是 v2.10.0；後續版本管理應集中化。
5. 現有 GitHub Actions 主要是版本修補腳本，不等於完整 CI。

## 下一次開始工作的順序

1. 讀根目錄 `README.md`
2. 讀 `js/README.md`
3. 讀本文件
4. 查看 main 最新 commit
5. 若要拆 code，從 Phase 1 開始，不要直接從 UI 開刀

### Phase 2b
- [x] `stimulusMap` 移出實作，使用 `profileForExercise` 注入。
- [x] `movementStats` 移出實作，使用 `patternForExercise` 注入。
- [x] `consistencyStats` 移出實作，日期 helper 改為注入。
- [x] 補 fixture tests，避免暖身組與忽略 pattern 被誤計。

### Phase 2c
- [x] `STIMULUS_BY_PATTERN` 移到 analysis module。
- [x] `exerciseStimulusProfile` 改成 pure function + `analysisBasis` dependency injection。
- [x] App 只保留 resolver wrapper。

### Phase 2d：Progress / Plateau

- [x] `comparePct` 搬至 `js/analysis/progress.js`
- [x] `progressSignals` 搬出
- [x] overload summary 改成 pure session input
- [x] plateau 判斷改成 pure session input
- [ ] `exerciseSessionMetrics` adapter 待 Core/Data boundary 更清楚後再搬

### Phase 3c — Core utils（已完成）
- `js/core/utils.js`：共用純函式。
- `tests/core/utils-characterization.test.js`：重構前後 characterization tests。
