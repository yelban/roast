# 🍽️ 活力園多語言數位菜單系統

[![Next.js](https://img.shields.io/badge/Next.js-15.1.2-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4.17-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

一個現代化的多語言數位菜單系統，為 **活力園 (Stamina-en)** 餐廳打造。具備先進的 TTS 語音播放、多層級快取架構、PWA 離線支援和響應式設計，提供卓越的用戶體驗。

## ✨ 主要特色

- 🌍 **多語言支援** - 日文、繁體中文、簡體中文、英文
- 🔊 **智能 TTS 語音** - 日文菜單項目語音播放，支援多層級快取
- 🎵 **數量選擇播放** - 1-9 數量選擇，分離式連續語音播放
- 🎶 **按鈕音效系統** - + / - 按鈕點擊音效，到達邊界時特殊提示音
- ⚡ **預下載優化** - 背景預下載數量音檔，播放延遲減少 52%
- 📱 **響應式設計** - 完美適配手機、平板、桌面端
- 🚀 **極速載入** - 客戶端直接存取 R2，零中轉延遲
- 🎨 **字體優化** - 字體子集化，減少 70% 載入時間
- 🔄 **離線支援** - PWA 技術，支援離線瀏覽
- 📊 **高效能** - Core Web Vitals 優化，Lighthouse 95+ 分

## 🏗️ 技術架構

### 核心技術棧
```typescript
Frontend:
├── Next.js 15.1.2 (React 18.2.0)
├── TypeScript 5.7.2
├── Tailwind CSS 3.4.17
├── Shadcn/UI Components
└── Zustand (狀態管理)

Backend & Services:
├── Next.js API Routes
├── Azure Text-to-Speech API
└── Cloudflare R2 (唯一快取)

PWA & Caching:
├── Service Worker (Workbox)
├── 客戶端直接 R2 存取
├── API 智能回退機制
├── 數量音檔預下載
├── 背景同步
└── 離線支援
```

### 快取架構
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Service Worker  │────│  Cloudflare R2  │────│   Vercel API    │
│   (超強快取)     │    │   (直接存取)     │    │   (回退處理)     │
│                 │    │                 │    │                 │
│ • R2 音訊: 1年   │    │ • 直接 GET 請求  │    │ • 檔案不存在時   │
│ • API 快取: 90天 │    │ • 零中轉延遲     │    │ • Azure TTS 生成 │
│ • 持久性存儲     │    │ • 全球 CDN      │    │ • 檔案上傳到 R2  │
│ • 1000檔案容量  │    │ • 1年 TTL       │    │ • 回傳音訊內容   │
│ • 毫秒級響應     │    │ • CORS 優化     │    │ • 智能回退機制   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 開始使用

### 環境要求
- Node.js 18.0+
- npm 8.0+
- 支援 ES2022 的瀏覽器

### 安裝步驟

1. **克隆專案**
```bash
git clone https://github.com/your-org/stamina-en-menu.git
cd stamina-en-menu
```

2. **安裝依賴**
```bash
npm install
```

3. **環境變數設定**
```bash
# 複製環境變數模板
cp .env.example .env.local

# 設定必要的環境變數
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=https://your-domain.com
NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL=https://your-domain.com
```

4. **生成字體子集**
```bash
npm run generate-subsets
```

5. **啟動開發伺服器**
```bash
npm run dev
```

應用程式將在 `http://localhost:3000` 啟動。

## 🛠️ 可用指令

### 開發
```bash
npm run dev              # 啟動開發伺服器
npm run dev-https        # 啟動 HTTPS 開發伺服器
npm run build           # 建置生產版本
npm run start           # 啟動生產伺服器
```

### 工具
```bash
npm run lint            # 執行 ESLint 檢查
npm run generate-subsets # 生成字體子集檔案
```

### TTS 管理
```bash
# 預熱 TTS 快取（建議部署後執行）
curl -X POST https://your-domain.com/api/tts/prewarm

# 檢查預熱狀態
curl https://your-domain.com/api/tts/prewarm
```

## 📂 專案結構

```
src/
├── components/          # React 組件
│   ├── ui/             # Shadcn UI 組件
│   ├── Menu.tsx        # 主菜單組件 (含數量選擇器)
│   ├── FontWrapper.tsx # 字體載入組件
│   └── ...
├── pages/              # Next.js 頁面
│   ├── api/            # API 路由
│   │   ├── menu.ts     # 菜單資料 API
│   │   └── tts/        # TTS 相關 API
│   │       ├── [text].ts     # 文字轉語音
│   │       ├── prewarm.ts    # 預熱快取
│   │       └── health.ts     # 健康檢查
│   ├── _app.tsx        # 應用程式根組件
│   └── index.tsx       # 首頁
├── store/              # Zustand 狀態管理
│   └── languageStore.ts
├── types/              # TypeScript 類型定義
├── config/             # 配置檔案
│   └── fonts.ts        # 字體配置
├── lib/                # 工具函數
│   ├── audioStreaming.ts   # 音訊串流
│   ├── cacheMetrics.ts     # 快取指標
│   └── ...
├── data/               # 資料檔案
│   └── data.json       # 菜單資料
└── styles/             # 全域樣式
    └── globals.css
```

## 🔧 API 端點

### 菜單 API
```typescript
GET /api/menu           # 獲取菜單資料
```

### TTS API
```typescript
GET /api/tts/[text]     # 文字轉語音
POST /api/tts/prewarm   # 預熱常用項目
GET /api/tts/prewarm    # 查詢預熱狀態
GET /api/tts/health     # TTS 服務健康檢查
```

## 🎨 自訂與配置

### 新增語言支援
1. 更新 `src/types/menu.ts` 中的 `Language` 型別
2. 編輯 `src/data/data.json` 新增翻譯內容
3. 更新 `src/config/fonts.ts` 字體配置
4. 調整 `src/store/languageStore.ts` 語言順序

### 菜單內容更新
編輯 `src/data/data.json` 檔案，確保所有語言都有對應翻譯：

```json
{
  "menuItems": [
    {
      "id": "item1",
      "translations": {
        "ja": "上ロース",
        "zh-tw": "上級里脊",
        "zh-cn": "上级里脊",
        "en": "Premium Loin"
      },
      "price": 1200,
      "category": "meat"
    }
  ]
}
```

## 📈 效能優化

### 關鍵指標
- **首次內容繪製 (FCP)**: < 1.5s
- **最大內容繪製 (LCP)**: < 2.5s
- **首次輸入延遲 (FID)**: < 100ms
- **累積版面配置偏移 (CLS)**: < 0.1
- **TTS 響應時間**: < 3s (95% 情況)

### 快取策略
- **Service Worker 快取**: 毫秒級響應 (< 50ms)
  - R2 音訊檔案：1年超長期快取
  - API 響應：90天智能快取
  - 持久性存儲保護，不易被清理
- **R2 直接存取**: 零中轉延遲 (< 200ms)
- **API 回退處理**: 檔案不存在時生成 (< 500ms)
- **預熱機制**: 80+ 常用項目預生成
- **智能快取**: 支援 1000+ 音訊檔案永久快取

## 🚀 部署指南

### Vercel 部署 (推薦)
1. 連接 GitHub 儲存庫到 Vercel
2. 設定環境變數
3. 部署並執行預熱：
```bash
curl -X POST https://your-app.vercel.app/api/tts/prewarm
```

### 其他平台部署
支援任何 Node.js 託管平台：
- Netlify
- Railway
- Render
- 自託管 (Docker)

## 🔍 監控與維護

### 健康檢查
```bash
# 系統健康檢查
curl https://your-domain.com/api/health

# TTS 服務檢查
curl https://your-domain.com/api/tts/health
```

### 效能監控
- 使用 Vercel Analytics 監控 Core Web Vitals
- 追蹤 TTS API 使用量和響應時間
- 監控快取命中率和錯誤率

### 快取管理
```javascript
// 查看快取狀態
navigator.serviceWorker.controller?.postMessage({
  type: 'CACHE_MANAGEMENT',
  action: 'GET_CACHE_INFO'
});

// 清理 API 快取
navigator.serviceWorker.controller?.postMessage({
  type: 'CACHE_MANAGEMENT',
  action: 'CLEAR_CACHE'
});

// 清理 R2 音訊快取
navigator.serviceWorker.controller?.postMessage({
  type: 'CACHE_MANAGEMENT',
  action: 'CLEAR_R2_CACHE'
});

// 檢查持久性存儲
navigator.storage.estimate().then(estimate => {
  console.log('存儲使用情況:', estimate);
});
```

### 版本管理與 PWA 更新
```bash
# 更新版本號（自動觸發 PWA 更新）
npm version patch  # 0.2.2 → 0.2.3
npm version minor  # 0.2.2 → 0.3.0
npm version major  # 0.2.2 → 1.0.0

# 構建時自動注入版本號
npm run build

# 部署後用戶會收到 PWA 更新提示
```

**版本自動化：**
- 📦 **package.json**: 主版本源
- 🔄 **Service Worker**: 自動讀取版本號
- 📱 **PWA**: 版本變更時自動提示更新
- ⏰ **檢查間隔**: 每 24 小時自動檢查更新

## 🛡️ 安全性

- **HTTPS 強制**: 所有連線均使用 HTTPS
- **API 金鑰保護**: 敏感資訊僅在伺服器端處理
- **CORS 配置**: 適當的跨域資源共享設定
- **輸入驗證**: 防止 XSS 和注入攻擊
- **快取安全**: 適當的快取標頭和過期策略

## 🐛 故障排除

### 常見問題

**TTS 音訊播放失敗**
- 檢查 Azure Speech Service 配置
- 確認 API 金鑰有效性
- 檢查網路連線狀態

**字體載入失敗**
- 重新生成字體子集：`npm run generate-subsets`
- 檢查字體檔案路徑
- 確認 CDN 設定正確

**快取問題**
- 清理瀏覽器快取
- 重新註冊 Service Worker
- 檢查快取策略設定

**Cloudflare R2 CORS 問題**
- **症狀**: 特定音訊檔案需要多次連線，瀏覽器 CORS 錯誤，但 curl 測試正常
- **根本原因**: Cloudflare CDN 快取了沒有 CORS 標頭的舊版本檔案
- **解決方案**: 
  1. 進入 Cloudflare 控制台 → Caching → Configuration → Purge Cache
  2. 選擇 "Custom Purge" → "Purge by URL"
  3. 輸入問題檔案的完整 URL (例: `https://tts-cache.36.to/檔案名.mp3`)
  4. 點擊 "Purge" 清除快取
  5. 等待 5-10 分鐘讓變更生效
  6. 測試瀏覽器音訊播放是否恢復正常
- **預防措施**: 
  - CORS 設定變更後，主動清除相關檔案的 CDN 快取
  - 監控 `cf-cache-status` 標頭，確認是否從快取返回
  - 定期檢查特定檔案的 CORS 標頭是否正確

### 除錯工具
```bash
# 檢查建置輸出
npm run build -- --debug

# TypeScript 類型檢查
npx tsc --noEmit

# 查看詳細日誌
DEBUG=* npm run dev
```

## 📋 版本紀錄

### v0.2.5 (2025-07-18)
- 📱 **改善彈窗使用體驗** - 優化手機端彈窗操作流程
- 🎯 **分類標籤居中** - 將"燒肉"等分類標籤從左上角移至居中顯示
- 📐 **緊湊化設計** - 減少內容項目上下間距，讓彈窗更緊湊
- ↩️ **返回按鈕優化** - 移至左上角並改為返回箭頭圖示，更直觀明顯
- 🎨 **視覺層次改善** - 調整字體大小、間距和按鈕尺寸
- 📱 **多設備適配** - 確保在更多手機裝置上完整顯示內容

### v0.2.4 (2025-07-17)
- 🎶 **新增數量選擇器音效** - + / - 按鈕點擊音效，提升用戶體驗
- 🔊 **智能音效系統** - 不同按鈕使用不同頻率音效
- 🎯 **邊界提示音** - 到達最低值(1)或最高值(9)時播放特殊提示音
- 🛠️ **Web Audio API** - 純前端音效生成，無需額外音頻檔案
- 🎨 **音效優化** - 短促音效設計，不干擾主要功能

### v0.2.3 (2025-07-15)
- 🎵 **新增數量選擇器功能** - 支援 1-9 數量選擇
- ⚡ **音訊播放優化** - 分離式播放策略，重複使用既有音檔
- 🚀 **預下載機制** - 背景預下載數量音檔，播放延遲減少 52%
- 🎯 **智能播放策略** - 優先使用預下載音檔，回退至 TTS API
- 💾 **記憶體管理** - 自動管理 blob URL 生命週期
- 🎨 **UI/UX 改進** - 平衡的視覺設計，清晰的操作回饋

### v0.2.2 (2025-07-11)
- ⚡ 實現音訊檔案超長期快取策略
- 🔒 新增 R2 音訊檔案 1年本地快取
- 💾 支援最多 1000 個音訊檔案永久快取
- 🛡️ 請求持久性存儲權限，防止自動清理
- 📊 增強快取管理：分別統計 API/R2 快取
- 🚀 實現毫秒級音訊播放響應

### v0.2.1 (2025-07-11)
- 🐛 修復特定日文音訊檔案的多次連線問題
- 🔧 簡化 R2 重試邏輯，提升連線穩定性
- 🛠️ 修復 API URL 尾隨斜線導致的 308 重定向
- 📝 新增 Cloudflare CDN 快取 CORS 問題解決指南
- 🧹 清理生產環境除錯日誌輸出

### v0.2.0 (2025-07-10)
- 🚀 重大架構升級：客戶端直接存取 Cloudflare R2
- ⚡ 零中轉延遲，消除雙重傳輸問題
- 🔧 智能 CORS 解決方案，避免預檢請求
- 📈 效能提升 90%+，頻寬成本降低 50%
- 🛠️ API 智能回退機制，確保可靠性
- 📚 完整技術文檔和除錯指南

### v0.1.0 (2024-12-10)
- ✨ 初始版本發布
- 🌍 多語言菜單系統
- 🔊 Azure TTS 整合
- ⚡ 多層級快取架構
- 🎨 字體子集化優化
- 📱 響應式設計
- 🔄 PWA 離線支援

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

### 開發流程
1. Fork 專案
2. 建立功能分支：`git checkout -b feature/amazing-feature`
3. 提交變更：`git commit -m 'Add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 程式碼風格
- 使用 TypeScript 嚴格模式
- 遵循 ESLint 配置
- 組件使用 PascalCase
- 檔案使用 camelCase

## 📄 授權

此專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案。

## 🙏 致謝

- [Next.js](https://nextjs.org/) - React 框架
- [Azure Cognitive Services](https://azure.microsoft.com/en-us/products/cognitive-services/) - TTS 服務
- [Vercel](https://vercel.com/) - 部署平台
- [Cloudflare](https://cloudflare.com/) - CDN 服務
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Shadcn/UI](https://ui.shadcn.com/) - UI 組件庫

---

**專案維護者**: Yelban  
**最後更新**: 2025-07-17  
**專案狀態**: 生產就緒 🚀
