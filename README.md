# 活力園菜單系統

一個基於 Next.js 的多語言數位菜單系統，支援離線快取和語音播放功能。

## 主要功能

- 🌐 多語言支援（日文、繁中、簡中、英文）
- 🔊 日文發音 TTS 功能
- 📱 響應式設計
- ⚡ 多層級快取策略
- 🖼️ 字體優化與子集化

## 技術架構

### 前端框架
- Next.js 15.1.2
- React 18.2.0
- TypeScript
- Tailwind CSS
- Shadcn UI

### 核心功能
- Vercel KV：快取管理
- Vercel Blob：音訊檔案存儲
- Azure TTS：語音合成服務

### 快取策略
- Edge Cache (Vercel KV)
- CDN Cache (Cloudflare)
- Browser Cache
- Local Storage

## 開發環境設定

1. 安裝依賴：
```bash
npm install
```

2. 生成字體子集：
```bash
npm run generate-subsets
```

3. 啟動開發伺服器：
```bash
npm run dev
```

## 版本紀錄

### v0.1.0
- 初始版本發布
- 基礎多語言菜單功能
- TTS 語音合成整合
- 多層級快取實作
- 字體子集化
- 響應式設計
- 離線快取功能
