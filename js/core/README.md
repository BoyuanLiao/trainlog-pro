# `js/core/`

狀態：**重構骨架，程式目前尚未從 `app.js` 搬入。**

未來負責跨功能核心能力：
- `utils.js`：日期、數值、字串、DOM 無關共用函式
- `storage.js`：LocalStorage save/load/recovery
- `migration.js`：Schema migration

規則：
- `core` 不應依賴頁面 render。
- migration 必須能讀舊資料，不可只支援最新 schema。
- storage error 必須保留 recovery 能力。
- 搬移函式後同步更新 `../README.md` 與 `../../docs/REFACTOR.md`。
