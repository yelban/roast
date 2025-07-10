# 活力園多語言菜單系統 - Claude 工作配置

## 項目概述
- **項目名稱**: 活力園 (Stamina-en) 多語言數位菜單系統
- **技術棧**: Next.js 15 + TypeScript + Tailwind CSS + Vercel
- **語言**: 日文、繁體中文、簡體中文、英文
- **核心功能**: 多語言菜單、TTS 語音播放、多層快取、PWA

## 開發環境命令

### 開發服務器
```bash
npm run dev              # 啟動開發服務器 (http://localhost:3000)
npm run dev-https        # 啟動 HTTPS 開發服務器
```

### 建置與部署
```bash
npm run build           # 建置生產版本
npm run start          # 啟動生產服務器
npm run lint           # 執行 ESLint 檢查
```

### 字體最佳化
```bash
npm run generate-subsets  # 生成字體子集檔案
```

## 項目結構

### 核心目錄
```
src/
├── components/         # React 組件
│   ├── ui/            # Shadcn UI 組件
│   ├── Menu.tsx       # 主菜單組件
│   ├── FontWrapper.tsx # 字體包裝組件
│   └── ...
├── pages/             # Next.js 頁面
│   ├── api/           # API 路由
│   │   ├── menu.ts    # 菜單 API
│   │   └── tts/       # TTS API
│   ├── _app.tsx       # 應用程式根組件
│   └── index.tsx      # 首頁
├── store/             # Zustand 狀態管理
├── types/             # TypeScript 型別定義
├── config/            # 配置檔案
├── lib/               # 工具函數
└── styles/            # 全局樣式
```

### 重要檔案
- `src/data/data.json` - 菜單資料
- `src/config/fonts.ts` - 字體配置
- `src/store/languageStore.ts` - 語言狀態管理
- `next.config.ts` - Next.js 配置
- `public/sw.js` - Service Worker

## 開發規範

### 程式碼風格
- 使用 TypeScript 嚴格模式
- 遵循 ESLint 配置
- 使用 Tailwind CSS 類別
- 組件使用 PascalCase 命名
- 檔案使用 camelCase 命名

### 提交規範
```bash
feat: 新增功能
fix: 修復錯誤
docs: 文檔更新
style: 代碼格式
refactor: 重構
test: 測試
chore: 其他
```

## 環境變數

### 必要環境變數
```bash
# Azure TTS 配置
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region

# Vercel 配置
KV_URL=your_vercel_kv_url
KV_REST_API_URL=your_vercel_kv_rest_api_url
KV_REST_API_TOKEN=your_vercel_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_vercel_kv_read_only_token

# Vercel Blob 配置
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

### 可選環境變數
```bash
# 快取模式 ('local' | 'blob')
CACHE_MODE=blob

# 基礎路徑 (用於子目錄部署)
BASE_PATH=

# 節點環境
NODE_ENV=development|production
```

## 技術架構

### 快取策略
1. **Edge Cache** (Vercel KV) - 第一層快取
2. **CDN Cache** (Cloudflare) - 第二層快取
3. **Browser Cache** - 瀏覽器快取
4. **Service Worker** - 離線快取

### API 端點
- `GET /api/menu` - 獲取菜單資料
- `GET /api/tts/[text]` - 獲取 TTS 音訊

### 狀態管理
- 使用 Zustand 管理全域狀態
- 語言切換狀態
- 滑動動畫狀態

## 常見任務

### 更新菜單資料
1. 編輯 `src/data/data.json`
2. 確保所有語言都有對應翻譯
3. 測試各語言顯示

### 添加新語言
1. 更新 `src/types/menu.ts` 中的 Language 型別
2. 更新 `src/store/languageStore.ts` 中的語言順序
3. 更新 `src/config/fonts.ts` 中的字體配置
4. 更新菜單資料中的翻譯

### 優化效能
1. 檢查 Lighthouse 報告
2. 優化圖片大小
3. 檢查字體載入策略
4. 監控 Core Web Vitals

## 疑難排解

### 常見問題
1. **TTS 不工作**: 檢查 Azure 配置和 API 金鑰
2. **字體載入失敗**: 檢查字體檔案路徑和 CORS 設定
3. **快取問題**: 清除瀏覽器快取或檢查 Service Worker
4. **語言切換故障**: 檢查狀態管理和動畫邏輯

### 除錯指令
```bash
# 檢查建置輸出
npm run build -- --debug

# 分析打包大小
npm run build -- --analyze

# 檢查 TypeScript 錯誤
npx tsc --noEmit
```

## 部署說明

### Vercel 部署
1. 連接 GitHub 儲存庫
2. 設定環境變數
3. 部署後檢查功能

### 環境檢查清單
- [ ] 所有環境變數已設定
- [ ] TTS API 正常運作
- [ ] 快取策略生效
- [ ] 字體檔案可訪問
- [ ] Service Worker 註冊成功

## 效能監控

### 關鍵指標
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **快取命中率**: > 95%

### 監控工具
- Vercel Analytics
- Lighthouse CI
- Core Web Vitals

## 維護作業

### 定期檢查
- [ ] 監控 API 使用量
- [ ] 檢查快取效率
- [ ] 更新依賴套件
- [ ] 審查安全性

### 快取管理
- TTS 音訊檔案自動快取
- 菜單資料版本控制
- 字體檔案長期快取

---

**重要提醒**: 
- 修改菜單資料後需要清除快取
- TTS 功能需要有效的 Azure 訂閱
- 字體子集化需要重新生成
- 部署前務必測試所有語言功能