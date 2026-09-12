# `js/analysis/`

狀態：**重構骨架，分析函式目前仍在 `app.js`。**

未來負責資料分析，不直接操作 DOM：
- `stimulus.js`：肌群刺激、正式組、動作模式
- `progress.js`：PR、趨勢、前一期比較
- `consistency.js`：頻率、間隔、一致性
- `confidence.js`：分析資料可信度

優先搬移 pure function，並搭配固定測試資料驗證搬移前後輸出一致。

分析模組應回傳資料物件；畫面 HTML 應留在 UI 層。這是後續加入 progression / recovery 判斷的基礎。
