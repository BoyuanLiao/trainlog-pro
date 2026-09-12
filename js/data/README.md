# Static Data

Phase 1 已完成：原本放在 `js/app.js` 的大型靜態資料已拆到本目錄。

## 檔案

- `glossary.js`：`GLOSSARY`，術語與說明資料。
- `equipment.js`：`SYSTEM_EQUIPMENT`，系統器材清單。
- `exercises.js`：`SYSTEM_EXERCISES`，系統動作資料庫。
- `programs.js`：`SYSTEM_PROGRAMS`，內建課表資料。

## 載入順序

`index.html` 會先載入上述四個檔案，再載入 `js/app.js`。這些檔案目前使用 classic script 的全域 lexical binding，因此不要任意改成 ES module，除非同一輪把 `app.js` 的引用一起改完。

## 維護規則

- 不要任意改既有 ID；歷史 LocalStorage、課表與訓練紀錄會依賴它。
- 不要改既有資料 shape 而不處理相容性。
- 本目錄只放靜態資料，不放 DOM 操作、LocalStorage 或 render 邏輯。
- 新增器材 / 動作 / 課表後，應跑 App self-check 與基本頁面 smoke test。
- 修改後至少執行 `node --check`。
