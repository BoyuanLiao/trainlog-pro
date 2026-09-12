# TrainLog Pro

GitHub Pages 直接部署的健身訓練紀錄 Web App。目前正式程式仍以 `js/app.js` 為主，重構採漸進方式進行，避免破壞既有 LocalStorage、歷史紀錄與訓練流程。

## 下次維護先讀這裡

1. 本 README：確認整體入口與檔案責任
2. `js/README.md`：定位 JavaScript 功能與大型 `app.js` 區塊
3. `docs/REFACTOR.md`：查看重構進度與下一步
4. 要改特定目錄前，再讀該目錄的 README

## 專案結構

```text
trainlog-pro/
├─ index.html              # 單頁應用 HTML、各頁面容器與 script/style 入口
├─ sw.js                   # Service Worker；目前主要快取 Exercise Library 動畫
├─ .nojekyll               # GitHub Pages 不使用 Jekyll
├─ README.md               # 本文件／專案入口
├─ docs/                   # 架構與重構追蹤
├─ js/
│  ├─ app.js               # 目前主要應用程式；仍包含大部分功能
│  ├─ motion-gifs.js       # 動作動畫映射
│  ├─ core/                # 重構骨架：storage / migration / utils
│  ├─ data/                # 重構骨架：glossary / equipment / exercises / programs
│  ├─ analysis/            # 重構骨架：分析 pure logic
│  ├─ training/            # 重構骨架：訓練流程
│  └─ ui/                  # 重構骨架：頁面 render / events
├─ css/
│  ├─ app.css              # 主介面樣式
│  └─ motion-gifs.css      # 動作動畫樣式
├─ assets/
│  └─ motion3d/            # movement pattern 本機 GIF
└─ .github/
   └─ workflows/           # GitHub Actions；含歷史 v2.9.x 一次性 workflow
```

> `js/core/`、`js/data/`、`js/analysis/`、`js/training/`、`js/ui/` 目前先建立 README 與責任邊界；程式尚未全部從 `app.js` 搬出。不要誤認為已完成模組化。

## 執行與部署

這是無後端的靜態專案，GitHub Pages 從 `main` 分支根目錄直接提供 HTML / CSS / JS。

目前主要資料儲存在瀏覽器 LocalStorage：
- 不同裝置 / 瀏覽器不會自動同步。
- 修改 schema 時一定要保留 migration。
- 匯入 / 匯出與 recovery 是資料安全的重要邊界。

## 核心檔案修改注意

### `index.html`
- 只放頁面結構、容器、資源載入。
- 拆 JS/CSS 模組時要維持正確載入順序。
- 版本 cache query 應和 App 版本保持一致；目前仍有部分 v2.10.0 query，已列入重構技術債。

### `js/app.js`
- 目前仍是應用核心且檔案很大。
- 不要一次性大重寫。
- 先從 static data、pure analysis logic 抽離。
- 詳見 `js/README.md` 與 `docs/REFACTOR.md`。

### `sw.js`
- 修改遠端 Exercise Library URL / 快取策略時需和 `js/motion-gifs.js` 一起檢查。
- Service Worker 的舊 cache 行為可能影響使用者看到的版本，修改時要特別注意更新策略。

## 重構順序

固定採以下順序：

**Data → Analysis → Core → Training → UI**

理由是先處理副作用最少的內容，再逐步進入 LocalStorage、Active Workout 與 DOM 高耦合區。

完整 checklist：`docs/REFACTOR.md`。

## 最低驗證

目前每次 JS 修改至少應確認：

```bash
node --check js/app.js
node --check js/motion-gifs.js
node --check sw.js
```

這只能驗 syntax，不能取代後續要補的 unit / smoke tests。

## 文件規則

- 每個主要目錄都有 README，列出該目錄檔案責任與修改注意事項。
- 新增新的主要模組時，同時建立 / 更新該目錄 README。
- 實際搬移功能後，必須同步更新 `docs/REFACTOR.md`，避免下次重新分析整個 repository。
