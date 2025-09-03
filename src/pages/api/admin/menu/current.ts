import type { NextApiResponse } from 'next'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { getR2MenuManager } from '@/lib/r2MenuManager'
import { generateHash } from '@/lib/utils'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const manager = getR2MenuManager()
    const menuData = await manager.getCurrentMenu()
    
    if (!menuData || typeof menuData !== 'object' || Object.keys(menuData).length === 0) {
      throw new Error('Invalid menu data')
    }

    // 生成菜單資料的 ETag
    const menuHash = generateHash(JSON.stringify(menuData))

    // 檢查客戶端快取
    const ifNoneMatch = req.headers['if-none-match']

    if (ifNoneMatch === `"${menuHash}"`) {
      // 如果客戶端已有最新版本，返回 304
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')
      res.setHeader('CF-Cache-Control', 'max-age=3600, stale-while-revalidate=86400')
      res.setHeader('ETag', `"${menuHash}"`)
      res.status(304).end()
      return
    }

    // 設置快取相關標頭
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')
    res.setHeader('CF-Cache-Control', 'max-age=3600, stale-while-revalidate=86400')
    res.setHeader('ETag', `"${menuHash}"`)
    res.setHeader('Last-Modified', new Date().toUTCString())
    res.setHeader('Vary', 'Accept')
    
    // Cloudflare 特定的優化
    res.setHeader('CF-Cache-Tags', `admin-menu-${menuHash}`)
    res.setHeader('CF-Cache-Status', 'DYNAMIC')

    // 安全性標頭
    res.setHeader('X-Content-Type-Options', 'nosniff')
    
    return res.status(200).json({
      success: true,
      data: menuData
    })
  } catch (error) {
    console.error('Get menu error:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch menu data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export default withAuth(handler)