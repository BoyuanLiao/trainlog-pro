# `js/ui/`

狀態：**重構骨架，頁面 render / event binding 目前仍在 `app.js`。**

未來依頁面拆分：
- `home.js`
- `training.js`
- `records.js`
- `analysis.js`
- `settings.js`
- `shared.js`：Modal、Toast、共用 UI helper

規則：
- UI 層負責把資料轉成 DOM，不承擔核心分析與 migration。
- 頁面事件綁定與 render 要有清楚入口，避免同一事件重複註冊。
- 分析 UI 應只消費 analysis 模組結果，不自己重算規則。
- 此層依賴最多，因此排在重構後段。
