# `js/training/`

狀態：**重構骨架，訓練流程目前仍在 `app.js`。**

未來負責：
- Active Workout 狀態與生命週期
- 動作 / 組數新增刪除與完成狀態
- 休息計時器與訓練工具
- 課表 / Template 轉成當次訓練
- 未來 Progression Engine

規則：
- 先固定 active workout 的資料格式再搬移。
- 不直接處理 LocalStorage migration，交給 core。
- 訓練計算與 HTML render 盡量分離。
- 任何會改變歷史訓練資料格式的修改，都要同步評估 schema migration。
