# 版本管理腳本

本專案包含自動化版本檢查工具，確保 PWA 快取機制正常運作。

## 腳本說明

### 1. 版本檢查 (`check-version.js`)
檢查最新提交是否需要更新版本號。

```bash
npm run check-version
```

### 2. 智能提交 (`smart-commit.js`) 
自動分析變更類型並建議版本更新。

```bash
npm run smart-commit
```

## Git Hook

已設置 `pre-commit` hook 自動檢查版本號：

- **feat/fix/perf/refactor** 類型的提交會要求更新版本
- 如果確定不需要更新，使用 `git commit --no-verify` 跳過檢查

## 版本更新建議

| 變更類型 | 版本升級 | 範例 |
|---------|---------|------|
| `feat:` 新功能 | patch | 0.4.2 → 0.4.3 |
| `fix:` 錯誤修復 | patch | 0.4.2 → 0.4.3 |
| `perf:` 性能優化 | patch | 0.4.2 → 0.4.3 |
| `refactor:` 重構 | patch | 0.4.2 → 0.4.3 |
| `chore:` 雜項 | 不更新 | - |
| `docs:` 文檔 | 不更新 | - |

## 快速版本更新

```bash
# 自動 patch 版本 (推薦)
npm version patch

# 手動設定版本
npm version 0.4.3

# 更新後會自動 git add package.json
```

## PWA 快取機制

版本號用於菜單 API 的快取更新：
- `/api/menu?v=0.4.2` 
- 版本更新時自動繞過舊快取
- 確保用戶獲得最新內容

## 注意事項

- **每次功能變更都應該更新版本號**
- **版本號與 PWA 快取機制相關，不可忽略**
- **部署前確保版本號正確**