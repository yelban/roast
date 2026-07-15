import jwt from 'jsonwebtoken'

// 優先用 JWT_SECRET；未設時退回 ADMIN_PASSWORD（一定有設、且非公開）。
// 兩者皆無才拋錯，避免退回公開可見的預設值造成 token 可被偽造。
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD
  if (!secret) {
    throw new Error('JWT_SECRET (或 ADMIN_PASSWORD 作為 fallback) 必須設定')
  }
  return secret
}

const JWT_SECRET = resolveJwtSecret()
const JWT_EXPIRES_IN = '24h'

export interface JWTPayload {
  admin: boolean
  iat?: number
  exp?: number
}

export function generateToken(payload: { admin: boolean }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
}