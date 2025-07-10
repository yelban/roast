import { NextApiRequest, NextApiResponse } from 'next'
import { generateHash } from '@/lib/utils'
import { getCachedAudio, setCachedAudio } from '@/lib/r2CacheFetch'
import 'server-only'

// Azure Token 管理
let cachedToken: string | null = null
let tokenExpiration: Date | null = null
let tokenPromise: Promise<string> | null = null

async function performTokenFetch(): Promise<string> {
  const REGION = process.env.AZURE_SPEECH_REGION
  const AZURE_TOKEN_ENDPOINT = `https://${REGION}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const tokenResponse = await fetch(AZURE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
        'Content-Length': '0',
      },
      body: '',
      signal: controller.signal
    })
    
    if (!tokenResponse.ok) {
      throw new Error(`Token failed: ${tokenResponse.status}`)
    }
    
    const accessToken = await tokenResponse.text()
    cachedToken = accessToken
    tokenExpiration = new Date(Date.now() + 9 * 60 * 1000)
    return accessToken
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchAzureToken(): Promise<string> {
  if (cachedToken && tokenExpiration && tokenExpiration > new Date()) {
    return cachedToken
  }

  if (tokenPromise) {
    return await tokenPromise
  }

  tokenPromise = performTokenFetch()
  try {
    return await tokenPromise
  } finally {
    tokenPromise = null
  }
}

async function generateTTSAudio(text: string): Promise<Buffer> {
  const accessToken = await fetchAzureToken()
  
  const REGION = process.env.AZURE_SPEECH_REGION
  const AZURE_COGNITIVE_ENDPOINT = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const ttsResponse = await fetch(AZURE_COGNITIVE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'User-Agent': 'Stamina-en-Menu-App-v2',
      },
      body: `<speak version='1.0' 
                    xmlns='http://www.w3.org/2001/10/synthesis' 
                    xml:lang='ja-JP'>
               <voice name='ja-JP-NanamiNeural'>
                 <prosody volume='+100%'>
                   ${text}
                 </prosody>
               </voice>
             </speak>`,
      signal: controller.signal
    })

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text()
      throw new Error(`TTS failed: ${ttsResponse.status} - ${errorText}`)
    }

    return Buffer.from(await ttsResponse.arrayBuffer())
  } finally {
    clearTimeout(timeoutId)
  }
}

function logCacheStatus(req: NextApiRequest, hashId: string, cacheSource: string) {
  const cfCacheStatus = req.headers['cf-cache-status']
  const cfRay = req.headers['cf-ray']
  const cfCountry = req.headers['cf-ipcountry']

  console.log(`📊 Cache Status [${hashId}]:`, {
    source: cacheSource,
    cfStatus: cfCacheStatus,
    cfRay,
    cfCountry,
    userAgent: req.headers['user-agent']?.substring(0, 50),
    timestamp: new Date().toISOString()
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const startTime = Date.now()
  console.log('🎤 TTS API v2 request:', req.url)
  
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
    const hashId = generateHash(text)
    console.log('📝 Processing:', text, '| Hash:', hashId)

    // 檢查 ETag
    const ifNoneMatch = req.headers['if-none-match']
    if (ifNoneMatch === `"${hashId}"`) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('ETag', `"${hashId}"`)
      res.status(304).end()
      return
    }

    // 檢查快取
    console.time(`cache-check-${hashId}`)
    const { buffer: cachedAudio, source: cacheSource } = await getCachedAudio(hashId)
    console.timeEnd(`cache-check-${hashId}`)

    if (cachedAudio) {
      console.log(`✅ Cache hit (${cacheSource}):`, cachedAudio.length, 'bytes')
      logCacheStatus(req, hashId, cacheSource)
      
      // 設定最佳化的 HTTP 快取標頭
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
      res.setHeader('Content-Length', cachedAudio.length.toString())
      res.setHeader('ETag', `"${hashId}"`)
      res.setHeader('X-Cache-Source', cacheSource)
      res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`)
      
      // Cloudflare 特定標頭
      res.setHeader('CF-Cache-Control', 'max-age=31536000')
      res.setHeader('CF-Cache-Tags', `tts,tts-${hashId}`)

      console.log(`⚡ Cache response time: ${Date.now() - startTime}ms`)
      res.send(cachedAudio)
      return
    }

    console.log('🎙️ Cache miss, generating TTS...')

    // 生成 TTS 音訊
    const accessToken = await fetchAzureToken()
    const audioBuffer = await generateTTSAudio(text)
    
    console.log(`🎵 Generated audio:`, audioBuffer.length, 'bytes')

    // 非同步儲存到快取
    const metadata = {
      text: text.substring(0, 100), // 限制長度
      generated: new Date().toISOString(),
      size: audioBuffer.length.toString()
    }
    
    setCachedAudio(hashId, audioBuffer, metadata)
      .catch(error => console.warn('Cache save failed:', error))

    // 回傳結果
    console.log(`🕐 Total processing time: ${Date.now() - startTime}ms`)
    
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
    res.setHeader('Content-Length', audioBuffer.length.toString())
    res.setHeader('ETag', `"${hashId}"`)
    res.setHeader('X-Cache-Source', 'generated')
    res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`)
    res.setHeader('CF-Cache-Control', 'max-age=31536000')
    res.setHeader('CF-Cache-Tags', `tts,tts-${hashId}`)
    
    res.send(audioBuffer)

  } catch (error: unknown) {
    console.error('❌ TTS error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ 
      message: 'TTS generation failed', 
      error: errorMessage,
      timestamp: new Date().toISOString()
    })
  }
}