# motion3d 動畫資產

此目錄存放依「動作模式」分類的本機 GIF。

## 命名原則

檔名應與程式使用的 movement pattern key 保持一致，例如：
- `horizontal_push.gif`
- `horizontal_pull.gif`
- `knee_dominant.gif`
- `knee_extension.gif`
- `knee_flexion.gif`
- `hip_extension.gif`
- `hip_abduction.gif`
- `hip_adduction.gif`
- `elbow_flexion.gif`
- `elbow_extension.gif`
- `core_flexion.gif`
- `rotation.gif`
- `plantar_flexion.gif`
- `cardio.gif`

## 修改檢查

1. 檔名變更後搜尋 `js/motion-gifs.js` 是否仍引用舊名稱。
2. 新增 pattern 時，確認動作資料與分析邏輯使用的 pattern key 一致。
3. 不要只改 GIF 名稱而沒有更新映射。
4. 若改成外部資源，需同步檢查 `sw.js` 的離線快取範圍。
