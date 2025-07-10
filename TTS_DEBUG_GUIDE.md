# 🔧 TTS 本地開發問題除錯指南

## 🚨 問題描述

在本地開發環境運行時，如果本地沒有快取會出現 `TypeError: Failed to fetch` 錯誤。

## 🎯 解決方案

我已經實作了以下修復：

### 1. **開發環境保護**
```typescript
// 在 r2CacheFetch.ts 中
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode: skipping redirect optimization')
  return { source: 'miss' }
}
```

### 2. **增強的錯誤處理**
- 更詳細的錯誤日誌
- 正確的 CORS 和重導向配置
- TypeScript 類型安全

### 3. **本地開發流程**
在開發環境中，系統會：
1. 跳過重導向優化
2. 直接使用傳統的檔案下載
3. 避免 CORS 和跨域問題

## 🧪 測試步驟

### 1. 啟動開發服務器
```bash
npm run dev
```

### 2. 檢查控制台日誌
當點擊 TTS 播放時，應該看到：
```
🔧 Development mode: skipping redirect optimization
🎙️ 快取未命中，呼叫 Azure TTS
```

### 3. 如果仍有問題，檢查：

#### A. 環境變數
確認 `.env.local` 包含：
```bash
AZURE_SPEECH_KEY=your_key
AZURE_SPEECH_REGION=your_region
```

#### B. 網路連線
測試 Azure TTS 連線：
```bash
curl -X GET "http://localhost:3000/api/tts/health"
```

#### C. 控制台錯誤
打開瀏覽器開發者工具，查看詳細錯誤：
```javascript
// 錯誤日誌格式
{
  error: TypeError,
  text: "テスト",
  apiUrl: "http://localhost:3000/api/tts/...",
  userAgent: "...",
  timestamp: "2025-07-10T..."
}
```

## 🔍 除錯工具

### 1. 重導向測試 API
```bash
# 測試快取檢查邏輯
curl "http://localhost:3000/api/tts/redirect-test?text=テスト"
```

### 2. 健康檢查 API
```bash
# 檢查 TTS 服務狀態
curl "http://localhost:3000/api/tts/health"
```

### 3. 直接 TTS 測試
```bash
# 直接測試 TTS 生成
curl "http://localhost:3000/api/tts/テスト"
```

## 🚀 生產環境

在生產環境 (Vercel) 中：
- 重導向優化會啟用
- 直接重導向到 Cloudflare R2
- 大幅提升效能

## 🛠️ 常見問題解決

### Q: 仍然出現 "Failed to fetch"
**A**: 檢查：
1. Azure API 金鑰是否正確
2. 網路連線是否正常
3. 瀏覽器控制台的詳細錯誤

### Q: TTS 生成很慢
**A**: 在開發環境是正常的，因為：
1. 沒有預熱快取
2. 每次都要呼叫 Azure API
3. 沒有 CDN 加速

### Q: 生產環境如何測試重導向？
**A**: 部署到 Vercel 後：
```bash
curl -I "https://your-app.vercel.app/api/tts/テスト"
# 應該看到 302 重導向
```

## 📋 檢查清單

部署前確認：
- [ ] 所有環境變數已設定
- [ ] 本地開發正常運作
- [ ] 建置成功無錯誤
- [ ] TTS 健康檢查通過

---

**本地開發**: 使用傳統下載  
**生產環境**: 使用重導向優化  
**錯誤處理**: 詳細日誌與回退機制