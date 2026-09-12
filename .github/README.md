# GitHub 維護說明

## `workflows/`
目前存放 GitHub Actions workflow。

現況：主程式已到 v2.10.1，但此目錄仍存在多個 `apply-v2.9.x.yml`、`refresh-v2.9.x-assets.yml` 類型的一次性歷史 workflow。

維護規則：
- 不要因為檔案仍在 `workflows/` 就假設它仍屬於目前部署流程。
- 執行舊 workflow 前先檢查 trigger、修改檔案與版本條件。
- 新的持續性 CI 應使用用途導向名稱，例如 `verify.yml`，不要再用版本號作為永久 workflow 名稱。
- 歷史 workflow 後續確認不再使用後，可移出 `workflows/` 或刪除；在確認前先保留。

詳細檔案狀態請看 `workflows/README.md`。
