import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { generateHash } from '@/lib/utils'
import { list, put } from '@vercel/blob'
import { kv } from '@vercel/kv'

// 快取模式設定
const CACHE_MODE = process.env.CACHE_MODE || 'local' // 'local' | 'blob'

// 生成 hash ID 的函數
function generateHashId(text: string): string {
  return generateHash(text)
}

// 本地快取相關函數
function getCachedAudioPath(hashId: string): string {
  return path.join(process.cwd(), 'public', 'audio', `${hashId}.mp3`)
}

function ensureAudioDirectory() {
  const audioDir = path.join(process.cwd(), 'public', 'audio')
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true })
  }
}

// Blob 快取相關函數
async function setBlobCache(hashId: string, audioBuffer: Buffer) {
  try {
    await put(`tts-cache/${hashId}.mp3`, audioBuffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'audio/mpeg'
    })
  } catch (error) {
    console.error('Blob cache set error:', error)
  }
}

async function getBlobCache(hashId: string) {
  try {
    const response = await fetch(`${process.env.BLOB_STORE_URL}/tts-cache/${hashId}.mp3`)
    if (!response.ok) return null
    return response
  } catch (error) {
    console.error('Blob cache get error:', error)
    return null
  }
}

type CacheSource = 'browser' | 'cdn' | 'edge' | 'blob' | 'origin';

function getHitLayer(source: CacheSource): string {
  const layers = {
    browser: 'L1',
    cdn: 'L2',
    edge: 'L3',
    blob: 'L4',
    origin: 'MISS'
  }
  return layers[source]
}

function setResponseHeaders(
  res: NextApiResponse,
  hashId: string,
  cacheHit: CacheSource
) {
  const headers = {
    'Content-Type': 'audio/mpeg',
    // 分層的快取控制
    'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
    // CloudFlare 特定的快取控制
    'CDN-Cache-Control': 'max-age=31536000',
    'Cloudflare-CDN-Cache-Control': 'max-age=31536000',
    'ETag': `"${hashId}"`,
    'Last-Modified': new Date().toUTCString(),
    'Vary': 'Accept',
    // 支援 CloudFlare 的企業版功能
    'Cache-Tag': `tts-${hashId}`,
    'CF-Cache-Status': 'DYNAMIC',
    // 安全性標頭
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    // 快取診斷資訊
    'X-Cache-Hit': cacheHit.toUpperCase(),
    'X-Cache-Hit-Layer': getHitLayer(cacheHit)
  }

  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
}

// 統一的快取介面
async function getCachedAudio(hashId: string): Promise<Buffer | null> {
  if (CACHE_MODE === 'local') {
    const cachedFilePath = getCachedAudioPath(hashId)
    if (fs.existsSync(cachedFilePath)) {
      console.log('🎵 Using local cache')
      return fs.readFileSync(cachedFilePath)
    }
    return null
  } else {
    const blob = await getBlobCache(hashId)
    if (blob) {
      console.log('🌐 Using Vercel Blob cache')
      const response = await fetch(blob.url)
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }
    return null
  }
}

async function setCachedAudio(hashId: string, audioBuffer: Buffer) {
  if (CACHE_MODE === 'local') {
    try {
      ensureAudioDirectory()
      fs.writeFileSync(getCachedAudioPath(hashId), audioBuffer)
    } catch (error) {
      console.error('Local cache write error:', error)
    }
  } else {
    await setBlobCache(hashId, audioBuffer)
  }
}

// 快取清理函數
async function cleanupOldCache() {
  const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 天

  if (CACHE_MODE === 'local') {
    const audioDir = path.join(process.cwd(), 'public', 'audio')
    try {
      const files = fs.readdirSync(audioDir)
      const now = Date.now()
      
      files.forEach(file => {
        const filePath = path.join(audioDir, file)
        const stats = fs.statSync(filePath)
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath)
        }
      })
    } catch (error) {
      console.error('Cache cleanup error:', error)
    }
  }
  // Vercel Blob 目前沒有直接的清 API，所以移除相關邏輯
}

const logCacheStatus = async (req: NextApiRequest, hashId: string, cacheSource: string) => {
  const headers = req.headers
  const cfHeaders = {
    status: headers['cf-cache-status'],
    ray: headers['cf-ray'],
    country: headers['cf-ipcountry'],
    // 新增更多 CloudFlare 相關標頭
    connecting_ip: headers['cf-connecting-ip'],
    visitor: headers['cf-visitor'],
    worker: headers['cf-worker']
  }

  console.log('CloudFlare Headers:', cfHeaders)

  const metrics = {
    source: cacheSource,
    hashId,
    cf: {
      status: cfHeaders.status,
      ray: cfHeaders.ray,
      country: cfHeaders.country,
      cacheHit: cfHeaders.status === 'HIT',
      // 添加更多資訊
      connecting_ip: cfHeaders.connecting_ip,
      visitor: cfHeaders.visitor,
      worker: cfHeaders.worker
    },
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  }

  console.log('Cache Status:', metrics)

  // 記錄到 KV 中
  try {
    await kv.hincrby('tts:metrics:hits', cacheSource, 1)
    if (cfHeaders.status) {
      await kv.hincrby('tts:metrics:cf', cfHeaders.status.toString().toLowerCase(), 1)
    }
    await kv.lpush(
      `tts:logs:${new Date().toISOString().split('T')[0]}`,
      JSON.stringify(metrics)
    )
  } catch (error) {
    console.error('Metrics tracking error:', error)
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.status(405).end()
    return
  }

  const { text } = req.query
  if (!text || typeof text !== 'string') {
    res.status(400).json({ message: 'Text is required' })
    return
  }

  try {
    const hashId = generateHashId(text)
    console.log('hashId', hashId)
    
    // 1. 檢查瀏覽器快取
    const ifNoneMatch = req.headers['if-none-match']
    const ifModifiedSince = req.headers['if-modified-since']
    // if (ifNoneMatch === `"${hashId}"`) {
    //   console.log('🎵 Client cache hit')
    //   res.status(304).end()
    //   return
    // }
    if (ifNoneMatch === `"${hashId}"` || 
      (ifModifiedSince && new Date(ifModifiedSince) >= new Date())) {
    // res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable')
    // res.setHeader('ETag', `"${hashId}"`)
    await logCacheStatus(req, hashId, 'browser')
    setResponseHeaders(res, hashId, 'browser')
    res.status(304).end()
    return

    // 2. 檢查 CloudFlare CDN 快取
    const cfCacheStatus = req.headers['cf-cache-status']
    if (cfCacheStatus === 'HIT') {
      await logCacheStatus(req, hashId, 'cdn')
      // CloudFlare 會自動處理響應
      return res.status(200).end()
    }

    // 3. 檢查 Edge Cache
    const edgeCache = await kv.get<Buffer>(`tts:${hashId}`)
    if (edgeCache) {
      await logCacheStatus(req, hashId, 'edge')
      setResponseHeaders(res, hashId, 'edge')
      return res.send(edgeCache)
    }

    // 4. 檢查 Vercel Blob
    const { blobs } = await list({ prefix: `tts/${hashId}` })
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url)
      const audioBuffer = Buffer.from(await response.arrayBuffer())
      
      // 存入 Edge Cache
      await kv.set(`tts:${hashId}`, audioBuffer, {
        ex: 86400 * 30
      })
      
      await logCacheStatus(req, hashId, 'blob')
      setResponseHeaders(res, hashId, 'blob')
      return res.send(audioBuffer)
    }

    // 5. 如果以上都沒有快取，則從 Azure TTS 取得語音
    console.log('🎙️ Fetching from Azure TTS')

    // 如果沒有快取，從 Azure 取得語音
    const tokenResponse = await fetch(
      `https://${process.env.AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
        },
      }
    )

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token')
    }

    const accessToken = await tokenResponse.text()

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
        <voice name="ja-JP-NanamiNeural">
          <prosody volume="+100%">
            ${text}
          </prosody>
        </voice>
      </speak>
    `

    const ttsResponse = await fetch(
      `https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'YourAppName',
        },
        body: ssml,
      }
    )

    if (!ttsResponse.ok) {
      throw new Error('TTS API request failed')
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())

    // 同時儲存到 Blob 和 Edge Cache
    await Promise.all([
      put(`tts/${hashId}`, audioBuffer, { 
        access: 'public',
        addRandomSuffix: false 
      }),
      kv.set(`tts:${hashId}`, audioBuffer, { 
        ex: 86400 * 30 
      })
    ])

    await logCacheStatus(req, hashId, 'origin')
    setResponseHeaders(res, hashId, 'origin')
    return res.send(audioBuffer)
  }
    
    // // 1. 先檢查 Edge Cache
    // const cachedAudio = await kv.get<Buffer>(`tts:${hashId}`)
    // if (cachedAudio) {
    //   console.log('⚡ Using Edge Cache for:', hashId)
      
    //   res.setHeader('Content-Type', 'audio/mpeg')
    //   res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable')
    //   res.setHeader('CDN-Cache-Control', 'max-age=31536000')
    //   res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=31536000')
    //   res.setHeader('ETag', `"${hashId}"`)
    //   res.setHeader('Vary', 'Accept')
    //   res.setHeader('CF-Cache-Tags', `tts-${hashId}`)
    //   res.setHeader('CF-Cache-Status', 'DYNAMIC')
    //   res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    //   res.setHeader('X-Content-Type-Options', 'nosniff')
    //   res.setHeader('X-Cache-Hit', 'EDGE')
      
    //   return res.send(cachedAudio)
    // }

    // // 2. 檢查 Vercel Blob
    // const { blobs } = await list({ prefix: `tts/${hashId}` })
    // if (blobs.length > 0) {
    //   console.log('🌐 Using Vercel Blob cache')
    //   const response = await fetch(blobs[0].url)
    //   const arrayBuffer = await response.arrayBuffer()
    //   const audioBuffer = Buffer.from(arrayBuffer)

    //   // 存入 Edge Cache 以供後續使用
    //   await kv.set(`tts:${hashId}`, audioBuffer, {
    //     ex: 86400 * 30 // 30 天過期
    //   })
    //   console.log('💾 Cached in Edge for:', hashId)

    //   res.setHeader('Content-Type', 'audio/mpeg')
    //   res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable')
    //   res.setHeader('CDN-Cache-Control', 'max-age=31536000')
    //   res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=31536000')
    //   res.setHeader('ETag', `"${hashId}"`)
    //   res.setHeader('Vary', 'Accept')
    //   res.setHeader('CF-Cache-Tags', `tts-${hashId}`)
    //   res.setHeader('CF-Cache-Status', 'DYNAMIC')
    //   res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    //   res.setHeader('X-Content-Type-Options', 'nosniff')
    //   res.setHeader('X-Cache-Hit', 'BLOB')
      
    //   res.send(audioBuffer)
    //   return
    // }

    // console.log('🎙️ Fetching from Azure TTS')
    
    

    
    
    // // 儲存快取
    // // await setCachedAudio(hashId, audioBuffer)

    // // 瀏覽器本地快取（通過 ETag 和 Cache-Control）
    // // CloudFlare CDN 快取（通過 CDN-Cache-Control 和頁面規則）
    // // Vercel Edge 快取（通過 s-maxage）
    // // Vercel Blob 存儲（現有的實現）

    

    // res.setHeader('Content-Type', 'audio/mpeg')
    // res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable')
    // res.setHeader('CDN-Cache-Control', 'max-age=31536000')
    // res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=31536000')
    // res.setHeader('ETag', `"${hashId}"`)
    // res.setHeader('Vary', 'Accept')
    // res.setHeader('CF-Cache-Tags', `tts-${hashId}`)
    // res.setHeader('CF-Cache-Status', 'DYNAMIC')
    // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    // res.setHeader('X-Content-Type-Options', 'nosniff')
    // res.setHeader('X-Cache-Hit', 'MISS')
    
    // res.send(audioBuffer)
    // return

  } catch (error) {
    console.error('TTS error:', error)
    res.status(500).json({ message: 'TTS generation failed' })
    return
  }
} 