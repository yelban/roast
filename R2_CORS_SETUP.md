# 🌐 Cloudflare R2 CORS 配置指南

## 🚨 問題描述
部署後遇到 CORS 錯誤：`403 Forbidden` 在 OPTIONS 請求時。

## 🛠️ 解決方案：配置 R2 CORS

### 方法 1: 使用 Cloudflare Dashboard

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇您的帳戶 → R2 Object Storage
3. 點擊 `tts-cache` bucket
4. 進入 **Settings** 標籤
5. 找到 **CORS policy** 區域
6. 添加以下 CORS 規則：

```json
[
  {
    "AllowedOrigins": [
      "https://sutaminaen-menu.orz99.com",
      "https://*.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD",
      "OPTIONS"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 方法 2: 使用 AWS CLI (S3 API)

```bash
# 創建 CORS 配置檔案
cat > cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://sutaminaen-menu.orz99.com",
        "https://*.vercel.app",
        "http://localhost:3000"
      ],
      "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# 應用 CORS 配置
aws s3api put-bucket-cors \
  --endpoint-url https://your-account-id.r2.cloudflarestorage.com \
  --bucket tts-cache \
  --cors-configuration file://cors-config.json
```

### 方法 3: 使用 Wrangler CLI

```bash
# 安裝 Wrangler (如果還沒有)
npm install -g wrangler

# 配置 CORS
wrangler r2 bucket cors put tts-cache --config cors-config.json
```

## 🧪 測試 CORS 配置

配置後測試：

```bash
# 測試 OPTIONS 請求
curl -X OPTIONS \
  -H "Origin: https://sutaminaen-menu.orz99.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: if-none-match" \
  -v https://tts-cache.36.to/test

# 應該返回 CORS 標頭：
# Access-Control-Allow-Origin: https://sutaminaen-menu.orz99.com
# Access-Control-Allow-Methods: GET, HEAD, OPTIONS
```