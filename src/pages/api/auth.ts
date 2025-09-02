import { NextApiRequest, NextApiResponse } from 'next'

interface AuthRequest {
  password: string
}

interface AuthResponse {
  success: boolean
  message: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse>
) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    })
  }

  try {
    const { password }: AuthRequest = req.body

    // 檢查密碼是否提供
    if (!password) {
      return res.status(400).json({
        success: false,
        message: '請輸入密碼'
      })
    }

    // 從環境變數獲取管理員密碼
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set')
      return res.status(500).json({
        success: false,
        message: '服務器配置錯誤'
      })
    }

    // 驗證密碼
    if (password === adminPassword) {
      return res.status(200).json({
        success: true,
        message: '登入成功'
      })
    } else {
      return res.status(401).json({
        success: false,
        message: '密碼錯誤'
      })
    }

  } catch (error) {
    console.error('Auth API error:', error)
    return res.status(500).json({
      success: false,
      message: '服務器錯誤'
    })
  }
}