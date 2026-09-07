# TrainLog Pro

GitHub Pages 直接部署的正式原始碼專案。

## 專案結構

- `index.html`：頁面 HTML
- `css/app.css`：介面樣式
- `js/app.js`：功能與資料邏輯
- `.nojekyll`：停用 Jekyll 處理

## 開發方式

之後直接修改 HTML / CSS / JS 原始碼即可，不再使用 `gz/*.txt` 壓縮分段。GitHub Pages 從 `main` 分支根目錄直接部署。

## 資料

訓練資料仍主要儲存在瀏覽器 LocalStorage。不同裝置或瀏覽器不會自動同步，請定期使用 App 內 JSON 備份。
