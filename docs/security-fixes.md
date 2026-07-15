# 安全性修正紀錄

本檔記錄已完成的安全性修正：問題、原因、影響、修法與驗證。最新在上。

---

## 2. 管理後台 JWT 使用公開預設密鑰（可偽造 admin token）

- **日期**：2026-07-15
- **等級**：高（未授權存取管理後台）
- **commit**：`f8334bd`
- **檔案**：`src/lib/jwt.ts`

### 問題與原因

`jwt.ts` 原本這樣取簽章密鑰：

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-should-be-in-env'
```

正式站（Vercel）**未設定 `JWT_SECRET`**，因此實際使用那段**寫死在原始碼、公開可見**的預設值。由於 repo 為公開（`github.com/yelban/roast`），任何人都能讀到該預設值。

### 影響

任何人可用該公開密鑰自行簽發 `{ admin: true }` 的 JWT，繞過 `/admin/menu-editor` 登入，直接呼叫受保護 API（改菜單、還原備份等）。

實測確認可利用：用預設密鑰偽造 token 打 `GET /api/admin/menu/current` → **HTTP 200**（成功）。

### 修法

改為優先用 `JWT_SECRET`，未設時退回 `ADMIN_PASSWORD`（正式站必然已設、且非公開），兩者皆無才拋錯：

```ts
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD
  if (!secret) {
    throw new Error('JWT_SECRET (或 ADMIN_PASSWORD 作為 fallback) 必須設定')
  }
  return secret
}
const JWT_SECRET = resolveJwtSecret()
```

設計考量（約束：不能讓現有後台變不能運作）：

- 不直接改「未設就拋錯」——因正式站未設 `JWT_SECRET`，那樣會讓後台 500。
- 退回 `ADMIN_PASSWORD`：登入功能依賴它，故正式站必然有值 → 部署後後台仍可運作，僅需重新登入一次（換掉被洩漏的密鑰，舊 token 作廢為必然）。
- 另在 Vercel 設定專用強隨機 `JWT_SECRET`（Sensitive、Production and Preview），優先於 `ADMIN_PASSWORD` fallback，作為正式的高熵簽章密鑰。

### 驗證（部署後線上實測）

- 偽造預設密鑰 token → 由 `200` 變 **`401`**（被拒），漏洞關閉。
- 回 `401`（非 `500`）→ jwt 模組正常載入、後台功能未壞。
- 舊管理 session → `401`（需重新登入，符合預期）。
- 前台 `/api/menu` → `200`、132 品項、價格不受影響。

### 後續

- 部署後需在 `/admin/menu-editor` 重新登入一次。
- 本機/新環境開發需設定 `JWT_SECRET` 或 `ADMIN_PASSWORD`（見 `.env.example`）。

---

## 1. Next.js React Server Components RCE（CVE-2025-66478）

- **日期**：2026-07-15
- **等級**：Critical（未認證遠端程式碼執行）
- **commit**：`74f5834`
- **檔案**：`package.json`、`pnpm-lock.yaml`

### 問題與原因

Next.js React Flight（RSC）協定的不安全反序列化，可導致未認證 RCE。

- GitHub Advisory：GHSA-9qr9-h5gf-34mp
- CVE：CVE-2025-55182（React）／CVE-2025-66478（Next.js）
- 揭露日：2025-12-03

專案當時實際安裝 **Next.js 15.4.2**。此漏洞在 15.4.x 線的修補版為 **15.4.8**（`>= 15.4.0, < 15.4.8` 皆受影響），故 15.4.2 在漏洞範圍內。

> 判斷要點：不能只看 semver 大小。修補於 2025-12 同時 backport 到多條維護線（15.1.x→15.1.9、15.2.x→15.2.6、15.3.x→15.3.6、15.4.x→15.4.8、15.5.x→15.5.7、16.0.x→16.0.7）；15.4.2 版號雖高於 15.1.9，但早於 15.4 線的修補版，仍含漏洞。

### 修法

`package.json` 的 `next` 由 `^15.1.2` 釘為 **`15.4.8`**（同版本線最小修補版，改動最小、回歸風險最低），重新產生 lockfile。

未採用 Vercel 自動 PR 的方案（將 `next` 降級到 `15.1.11`）——那會從 15.4.2 往回退 3 個 minor，屬降級。該 PR 已關閉。

### 驗證

- `tsc --noEmit` = 0、`next lint` = ✔、`next build` 成功。
- Vercel 部署後生效。
