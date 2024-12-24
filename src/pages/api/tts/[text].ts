import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { generateHash } from '@/lib/utils'
import { put } from '@vercel/blob'
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

// 新增 Edge Cache 檢查函數
async function getEdgeCache(hashId: string): Promise<Buffer | null> {
  try {
    const cachedData = await kv.get<Buffer>(`tts:${hashId}`)
    if (cachedData) {
      console.log('⚡ Edge Cache hit for:', hashId)
      return cachedData
    }
    return null
  } catch (error) {
    console.error('Edge cache get error:', error)
    return null
  }
}

// 統一的快取介面
async function getCachedAudio(hashId: string): Promise<{ buffer: Buffer | null, source: string }> {
  // 1. 先檢查 Edge Cache
  const edgeCache = await getEdgeCache(hashId)
  if (edgeCache) {
    console.log('⚡ Using Edge Cache')
    // 確保返回的是 Buffer
    return { buffer: Buffer.from(edgeCache), source: 'edge' }
  }

  // 2. 如果 Edge Cache 沒有命中，檢查本地快取
  if (CACHE_MODE === 'local') {
    const cachedFilePath = getCachedAudioPath(hashId)
    if (fs.existsSync(cachedFilePath)) {
      console.log('🎵 Using local cache')
      return { buffer: fs.readFileSync(cachedFilePath), source: 'local' }
    }
    return { buffer: null, source: 'miss' }
  } else {
    const blob = await getBlobCache(hashId)
    if (blob) {
      console.log('🌐 Using Vercel Blob cache')
      const response = await fetch(blob.url)
      if (!response.ok) throw new Error('Blob fetch failed')
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = Buffer.from(arrayBuffer)

      // 存入 Edge Cache
      try {
        await kv.set(`tts:${hashId}`, audioBuffer, {
          ex: 86400 * 365
        })
        console.log('💾 Saved to Edge Cache')
      } catch (error) {
        console.error('Edge cache set error:', error)
      }

      return { buffer: audioBuffer, source: 'blob' }
    }
    return { buffer: null, source: 'miss' }
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

    // 先儲存到 Edge Cache
    await kv.set(`tts:${hashId}`, audioBuffer, {
      ex: 86400 * 365 // 365 天過期
    })
    console.log('💾 Saved to Edge Cache')

    // 再儲存到 Blob
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

const logCacheStatus = (req: NextApiRequest, hashId: string, cacheSource: string) => {
  const cfCacheStatus = req.headers['cf-cache-status']  // Cloudflare 快取狀態
  // 可能的值：
  // - HIT: CloudFlare 快取命中
  // - MISS: 快取未命中
  // - BYPASS: 跳過快取
  // - DYNAMIC: 動態內容
  const cfRay = req.headers['cf-ray']  // Cloudflare Ray ID
  const cfCountry = req.headers['cf-ipcountry']  // 國家資訊

  console.log(`Cache Status for ${hashId}:`, {
    source: cacheSource,
    edgeCache: cacheSource === 'edge' ? 'HIT' : 'MISS',
    cfStatus: cfCacheStatus,
    cfRay,
    cfCountry,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.status(405).end()
    return
  }

  // 從路徑參數取得文字
  const { text } = req.query
  if (!text || typeof text !== 'string') {
    res.status(400).json({ message: 'Text is required' })
    return
  }

  try {
    const hashId = generateHashId(text)
    console.log('hashId', hashId)
    
    // 檢查 If-None-Match 標頭
    const ifNoneMatch = req.headers['if-none-match']
    const ifModifiedSince = req.headers['if-modified-since']
    // if (ifNoneMatch === `"${hashId}"`) {
    //   console.log('🎵 Client cache hit')
    //   res.status(304).end()
    //   return
    // }
    if (ifNoneMatch === `"${hashId}"` || 
      (ifModifiedSince && new Date(ifModifiedSince) >= new Date())) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable')
    res.setHeader('CF-Cache-Control', 'max-age=31536000, stale-while-revalidate=86400')
    res.setHeader('ETag', `"${hashId}"`)
    res.status(304).end()
    return
  }
    
    // 檢查快取
    const { buffer: cachedAudio, source: cacheSource } = await getCachedAudio(hashId)
    if (cachedAudio) {
      logCacheStatus(req, hashId, cacheSource)
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable')
      res.setHeader('CF-Cache-Control', 'max-age=31536000, stale-while-revalidate=86400')
      res.setHeader('Content-Length', cachedAudio.length.toString())
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('ETag', `"${hashId}"`)
      res.setHeader('Vary', 'Accept')
      // Cloudflare 特定的優化
      res.setHeader('CF-Cache-Tags', `tts-${hashId}`)  // 用於快取標記
      res.setHeader('CF-Cache-Status', 'DYNAMIC')
      // 安全性標頭
      // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
      res.setHeader('X-Content-Type-Options', 'nosniff')

      res.send(cachedAudio)
      return
    }

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
    
    // 儲存快取
    await setCachedAudio(hashId, audioBuffer)

    // 瀏覽器本地快取（通過 ETag 和 Cache-Control）
    // CloudFlare CDN 快取（通過 CDN-Cache-Control 和頁面規則）
    // Vercel Edge 快取（通過 s-maxage）
    // Vercel Blob 存儲（現有的實現）

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable')
    res.setHeader('CF-Cache-Control', 'max-age=31536000, stale-while-revalidate=86400')
    res.setHeader('Content-Length', audioBuffer.length.toString())
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('ETag', `"${hashId}"`)
    res.setHeader('Vary', 'Accept')
    // Cloudflare 特定的優化
    res.setHeader('CF-Cache-Tags', `tts-${hashId}`)  // 用於快取標記
    res.setHeader('CF-Cache-Status', 'DYNAMIC')
    // 安全性標頭
    // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(audioBuffer)
    return

  } catch (error) {
    console.error('TTS error:', error)
    res.status(500).json({ message: 'TTS generation failed' })
    return
  }
} 