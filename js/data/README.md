# `js/data/`

狀態：**重構骨架，靜態資料目前仍在 `app.js`。**

未來負責不含 UI / 儲存副作用的靜態資料：
- `glossary.js`
- `equipment.js`
- `exercises.js`
- `programs.js`

規則：
- 保留既有 ID，避免歷史紀錄無法對應。
- 搬移前後應驗證器材、動作、課表筆數一致。
- 資料檔只描述資料，不在這裡做 DOM render。
- 新增欄位時先確認舊紀錄 fallback 行為。
