# GitHub Actions Workflows

## 目前檔案

以下 workflow 是過去版本的套用/資產刷新腳本，屬於 **legacy / one-shot maintenance**，不是目前架構的核心入口：

- `apply-v2.9.14.yml`
- `apply-v2.9.21.yml`
- `apply-v2.9.22.yml`
- `apply-v2.9.23.yml`
- `refresh-v2.9.22-assets.yml`
- `refresh-v2.9.23-assets.yml`

## 閱讀規則

1. TrainLog Pro 現在的版本已高於這些 workflow 的版本號。
2. 下次維護時，不要把這些腳本當成目前功能來源；真正的正式原始碼是根目錄的 HTML / CSS / JS。
3. 若要建立 CI，應新增用途導向的 workflow，例如：
   - `verify.yml`：JavaScript syntax / integration checks
   - `pages.yml`：若未來改成明確的 Pages deployment workflow
4. 在尚未確認所有歷史用途前，本次重構不刪除舊 workflow，避免誤傷可追溯性。

## 後續清理條件

只有在確認下列事項後才移除 legacy workflow：
- main 已不依賴它們產生或修補原始碼。
- 沒有 workflow_dispatch 仍需人工重跑。
- 對應版本已可由 Git history 完整追溯。
