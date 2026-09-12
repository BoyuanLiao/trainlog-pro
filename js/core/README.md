# `js/core/`

跨功能核心能力；不得依賴頁面 render。

## `migration.js`
狀態：**已實作（Phase 3a）**。

提供 `window.TrainLogMigration.create(options)`，由 `app.js` 注入 schema、system exercises、uid、日期與重量轉換等 primitive。負責 fresh defaults、system exercise merge、legacy records/workouts migration、schema < 12 lb→kg normalization、tutorial defaults、active workout / strength goals 與 legacy unknown exercise migration。

### 安全規則
- 不讀 DOM / LocalStorage / mutable `data`。
- 修改 migration 前後都跑 `node tests/core/migration-characterization.test.js`。
- schema 行為變更必須同步 fixture。

## 尚未拆出
- `storage.js`：`loadData / save / snapshot / recovery` 仍在 `app.js`。
- `utils.js`：日期、數值等共用 helper 仍待後續整理。
