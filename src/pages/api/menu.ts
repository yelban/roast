import { NextApiRequest, NextApiResponse } from 'next'
import { getMenuData } from '@/lib/r2DataFetch'
import { generateHash } from '@/lib/utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 從 R2 獲取菜單資料
    const menuData = await getMenuData()
    
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
    res.setHeader('CF-Cache-Tags', `menu-${menuHash}`)
    res.setHeader('CF-Cache-Status', 'DYNAMIC')

    // 安全性標頭
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }
    
    res.status(200).json(menuData)
  } catch (error: unknown) {
    console.error('API Error:', error)
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unknown error occurred'

    res.status(500).json({ 
      error: 'Failed to load menu data',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
    })
  }
} 