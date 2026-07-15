# 本地開發與部署指南

roast（活力園多語言數位菜單）的本地啟動、測試與 Vercel 部署流程。

> 本文以目前程式碼為準：TTS 由 **Azure 合成**、**Cloudflare R2 為唯一快取後端**。
> 舊的 Vercel Blob / KV / `CACHE_MODE` 已從程式碼移除，**不再需要**（`.env.example` 若仍列出可忽略或刪除）。

---

## 1. 前置需求

| 工具 | 版本 | 備註 |
|------|------|------|
| Node.js | 20+（本機實測 24 亦可） | 未在 repo 釘版本；Vercel 用自己的 Node runtime |
| pnpm | 9+（本機實測 11.9） | 本專案的套件管理器（有 `pnpm-lock.yaml`） |
| Azure Speech | 一組 key + region | TTS 合成來源 |
| Cloudflare R2 | bucket + S3 存取金鑰 + 公開網域 | 音訊快取 |

安裝 pnpm（若尚未有）：

```bash
corepack enable && corepack prepare pnpm@latest --activate
# 或 npm i -g pnpm
```

---

## 2. 環境變數

Next.js 本地開發讀 **`.env.local`**（此檔已被 `.gitignore` 忽略，不會進版控）。

```bash
cp .env.example .env.local
```

編輯 `.env.local`，**目前實際需要的變數**：

```bash
# Azure TTS（合成來源）
AZURE_SPEECH_REGION=eastus
AZURE_SPEECH_KEY=<你的 Azure Speech key>

# Cloudflare R2（唯一快取後端，使用 AWS S3 SDK 存取）
CLOUDFLARE_ACCOUNT_ID=<account id>
CLOUDFLARE_R2_ACCESS_KEY_ID=<r2 access key id>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<r2 secret access key>
CLOUDFLARE_R2_BUCKET_NAME=<bucket 名稱>
CLOUDFLARE_R2_REGION=apac
CLOUDFLARE_R2_PUBLIC_URL=https://<你的 R2 自訂網域>            # 伺服器讀取用
NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL=https://<你的 R2 自訂網域>  # 客戶端直接讀取用（必須 NEXT_PUBLIC_ 前綴）
```

補充說明：

- **R2 沒設也能跑**：`getR2Cache()` 在缺 R2 設定時回 `null`，TTS 仍會呼叫 Azure 合成、只是不快取（每次都重打 Azure）。要測快取行為就得填 R2。
- **`.env.local` 只在本機生效**，不會上傳 Vercel；Vercel 的變數要另外在儀表板設定（見第 5 節）。
- `BASE_PATH`（選填）：設定後會套用到 Next.js 的 `basePath` 與 `assetPrefix`（`next.config.ts`），部署在子路徑時才需要，一般留空。

---

## 3. 啟動本地伺服器

```bash
pnpm install                 # 首次或依賴變動後
pnpm dev                     # → http://localhost:3000
```

其他模式：

```bash
pnpm dev-https               # HTTPS 開發（--experimental-https 自動產生自簽憑證）
pnpm build && pnpm start     # 本機跑生產建置（driver 部署前的最終驗證）
```

什麼時候用 `dev-https`：要測 **PWA / Service Worker** 在真機（手機掃 QR）上的行為時。`localhost` 本身是安全上下文，SW 在 `pnpm dev` 下就能運作；但用區網 IP（`192.168.x.x`）從手機連時，SW 需要 HTTPS，這時才用 `dev-https`。

字體子集（選填）：`public/fonts/subsets/` 已預先產生並進版控，一般不用重跑。菜單文字有大改動、要重新子集化時才：

```bash
pnpm generate-subsets
```

---

## 4. 提交前檢查

沒有獨立的 typecheck script，直接用本地 binary：

```bash
node_modules/.bin/tsc --noEmit     # 型別檢查
pnpm lint                          # next lint（會正確忽略 .next/ 產物）
```

> 注意：直接跑 `eslint .` 會連 `.next/` 建置產物一起 lint 而噴一堆 `no-require-imports`；用 `pnpm lint`（= `next lint`）才是對的。

---

## 5. 部署到 Vercel

### 自動部署（Git integration）

repo 已連 `git@github.com:yelban/roast.git`。只要 GitHub repo 在 Vercel 綁定了 Git integration：

| 動作 | 結果 |
|------|------|
| push 到 `main` | **Production** 部署（正式網址） |
| push 其他分支 / 開 PR | **Preview** 部署（獨立預覽網址） |

**所以「push 就自動部署」= 對**，前提是 Vercel↔GitHub 已連上。首次連接：Vercel 儀表板 → New Project → Import `yelban/roast`。

### 環境變數（在 Vercel 設定，非 .env.local）

Vercel 儀表板 → 專案 → Settings → Environment Variables，填入第 2 節那組 Azure + R2 變數。三種環境（Production / Preview / Development）可各自設定。

### 部署後預熱 TTS 快取（建議）

菜單文字固定，第一次生成後永久快取於 R2。部署後主動預熱可讓首位使用者就命中快取：

```bash
curl -X POST https://<你的網址>/api/tts/prewarm     # 觸發預熱
curl https://<你的網址>/api/tts/prewarm             # 查預熱狀態
```

### 健康檢查

```bash
curl https://<你的網址>/api/tts/health    # 檢查 Azure 環境變數與 token 取得
```

回 `healthy` = Azure 設定正常。（此端點目前只驗 Azure；R2 由應用層自帶 null-guard 回退。）

---

## 6. 常見問題

| 症狀 | 可能原因 |
|------|---------|
| TTS 有聲音但每次都很慢 | R2 未設定 → 沒快取，每次重打 Azure。檢查 `CLOUDFLARE_R2_*` |
| `/api/tts/health` 回 unhealthy | 缺 `AZURE_SPEECH_KEY` 或 `AZURE_SPEECH_REGION` |
| 手機掃 QR 後 PWA 不更新 | 用 `pnpm dev-https` 測；或確認 Service Worker 版本（`pnpm update-sw-version`） |
| 客戶端拿不到快取音訊 | `NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL` 未設或網域不對（客戶端直接讀 R2 用） |

---

## 相關檔案

- `next.config.ts` — Next.js 設定（PWA、`basePath`）
- `src/pages/api/tts/[text].ts` — TTS 主路由（miss 時合成 + 寫 R2）
- `src/lib/r2CacheFetch.ts` — R2 快取讀寫
- `src/pages/api/tts/prewarm.ts` — 快取預熱
- `.env.example` — 環境變數範本（含已淘汰的 Blob/KV 欄位，可忽略）
