# 待辦事項

## 安全性

### [x] JWT_SECRET 不安全的 fallback 預設值（已修，2026-07-15）

**已修正**：`src/lib/jwt.ts` 改為 `JWT_SECRET || ADMIN_PASSWORD`，兩者皆無則拋錯，移除公開預設值。部署後偽造的預設密鑰 token 即失效。建議另在 Vercel 設定專用強隨機 `JWT_SECRET`（會優先於 ADMIN_PASSWORD fallback）。

<details><summary>原始問題紀錄</summary>

`src/lib/jwt.ts:3`：

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-should-be-in-env'
```

**問題**：若正式環境未設定 `JWT_SECRET`，管理 token 會用這段**寫死在原始碼、公開可見**的預設密鑰簽發。任何人都能偽造 `{ admin: true }` 的 JWT，繞過 `/admin/menu-editor` 登入直接修改菜單。

**建議修法**：把 fallback 改為「未設 `JWT_SECRET` 就直接拋錯」，逼使部署環境必須設定正確密鑰（沒設就啟動失敗，而非靜默使用公開預設值）。這會改變行為（未設變數的環境會直接失敗），屬安全強化。

**驗收**：未設 `JWT_SECRET` 時，呼叫 `generateToken` / `verifyToken` 應拋錯；Vercel 已設 `JWT_SECRET` 故正式站不受影響。

> 來源：2026-07-15 管理介面 review。`ADMIN_PASSWORD` 與 `JWT_SECRET` 已補進 `.env.example` 與 `docs/local-and-deploy.md`。

</details>
