import type { NextApiRequest, NextApiResponse } from 'next'
import { generateToken } from '@/lib/jwt'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { password } = req.body
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }
    
    const adminPassword = process.env.ADMIN_PASSWORD
    
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD not configured in environment')
      return res.status(500).json({ error: 'Server configuration error' })
    }
    
    // 驗證密碼
    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid password' })
    }
    
    // 生成 JWT token
    const token = generateToken({ admin: true })
    
    return res.status(200).json({
      success: true,
      token,
      expiresIn: 86400 // 24 hours in seconds
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}