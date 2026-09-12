# CSS 結構說明

## 檔案責任

### `app.css`
TrainLog Pro 主介面樣式。目前包含首頁、訓練、紀錄、分析、設定、Modal、Toast、響應式版面等大部分樣式。

修改規則：
- 新功能優先使用既有 design token / class 命名，不要重複建立功能相同的 class。
- 與分析頁相關的新樣式，未來重構時優先移至獨立 analysis stylesheet。
- 修改 mobile layout 時需同時檢查 viewport、安全區與底部導覽。

### `motion-gifs.css`
動作動畫 / GIF 顯示專用樣式。保持小而獨立；如果修改動畫容器 class，必須同步檢查 `../js/motion-gifs.js`。

## 重構方向

目前 `app.css` 約 50KB，先不一次拆散。之後建議依頁面漸進拆成：
- `base.css`：tokens、共用元件、排版
- `training.css`
- `records.css`
- `analysis.css`
- `settings.css`

每次拆分都應保持 `index.html` 載入順序明確，並避免 CSS specificity 改變造成 UI 回歸。
