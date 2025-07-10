import { NextApiRequest, NextApiResponse } from 'next'
import { getR2Cache, checkCacheAvailability, getCachedAudio } from '@/lib/r2CacheFetch'
import { generateHash } from '@/lib/utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text } = req.query
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text parameter required' })
  }

  const hashId = generateHash(text)
  
  try {
    // 1. 檢查 R2 配置
    const r2 = getR2Cache()
    const r2Config = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
      hasR2Instance: !!r2
    }

    // 2. 檢查快取可用性
    console.time(`checkCacheAvailability-${hashId}`)
    const cacheAvailability = await checkCacheAvailability(hashId)
    console.timeEnd(`checkCacheAvailability-${hashId}`)

    // 3. 檢查實際快取
    console.time(`getCachedAudio-${hashId}`)
    const cacheResult = await getCachedAudio(hashId)
    console.timeEnd(`getCachedAudio-${hashId}`)

    // 4. 環境資訊
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION
    }

    const debugInfo = {
      hashId,
      text,
      r2Config,
      cacheAvailability,
      cacheResult: {
        hasBuffer: !!cacheResult.buffer,
        bufferSize: cacheResult.buffer?.length || 0,
        source: cacheResult.source
      },
      envInfo,
      timestamp: new Date().toISOString()
    }

    console.log('🔍 Cache Debug Info:', JSON.stringify(debugInfo, null, 2))
    
    res.status(200).json(debugInfo)
  } catch (error) {
    console.error('Cache debug error:', error)
    res.status(500).json({ 
      error: 'Debug failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}