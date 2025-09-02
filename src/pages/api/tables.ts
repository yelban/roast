import { NextApiRequest, NextApiResponse } from 'next'
import { getTableData } from '@/lib/r2DataFetch'
import { generateHash } from '@/lib/utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 從 R2 獲取桌位資料
    const tableData = await getTableData()
    
    if (!tableData || typeof tableData !== 'object') {
      throw new Error('Invalid table data')
    }

    // 生成桌位資料的 ETag
    const tableHash = generateHash(JSON.stringify(tableData))

    // 檢查客戶端快取
    const ifNoneMatch = req.headers['if-none-match']

    if (ifNoneMatch === `"${tableHash}"`) {
      // 如果客戶端已有最新版本，返回 304
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable')
      res.setHeader('CF-Cache-Control', 'max-age=31536000, stale-while-revalidate=86400')
      res.setHeader('ETag', `"${tableHash}"`)
      res.status(304).end()
      return
    }

    // 設置快取相關標頭
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable')
    res.setHeader('CF-Cache-Control', 'max-age=31536000, stale-while-revalidate=86400')
    res.setHeader('ETag', `"${tableHash}"`)
    res.setHeader('Last-Modified', new Date().toUTCString())
    res.setHeader('Vary', 'Accept')
    
    // Cloudflare 特定的優化
    res.setHeader('CF-Cache-Tags', `tables-${tableHash}`)
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
    
    res.status(200).json(tableData)
  } catch (error: unknown) {
    console.error('Tables API Error:', error)
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unknown error occurred'

    res.status(500).json({ 
      error: 'Failed to load table data',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
    })
  }
}