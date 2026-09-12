# Assets 結構說明

此目錄只放應用程式需要的靜態資產，不放業務邏輯。

## 目錄

### `motion3d/`
本機動作模式 GIF。檔名以 movement pattern 為主，例如 `horizontal_push.gif`、`knee_dominant.gif`。

用途：
- 當動作沒有更精確的外部示範資源時，可用 movement pattern 動畫作為視覺提示。
- 與 `js/motion-gifs.js` 的映射邏輯一起使用。

維護規則：
- 新增或重新命名資產時，同步檢查 `js/motion-gifs.js`。
- 避免把大型原始影片直接提交到此目錄。
- GIF 只作動作提示，不應被視為完整姿勢教學或醫療建議。
