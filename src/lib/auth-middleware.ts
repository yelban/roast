import { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken, extractToken } from './jwt'

export interface AuthenticatedRequest extends NextApiRequest {
  admin?: boolean
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const token = extractToken(req.headers.authorization)
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    const payload = verifyToken(token)
    
    if (!payload || !payload.admin) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    
    req.admin = payload.admin
    
    return handler(req, res)
  }
}