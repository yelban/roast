import { NextApiRequest, NextApiResponse } from 'next'
import { generateHash } from '@/lib/utils'
import { put } from '@vercel/blob'
import { kv } from '@vercel/kv'
import 'server-only'

// 複製主要 API 的 Token 管理
let cachedToken: string | null = null
let tokenExpiration: Date | null = null
let tokenPromise: Promise<string> | null = null

async function performTokenFetch(): Promise<string> {
  console.time('azureTTS-fetchToken')
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
      throw new Error(`Failed to get access token: ${tokenResponse.status}`)
    }
    
    const accessToken = await tokenResponse.text()
    cachedToken = accessToken
    tokenExpiration = new Date(Date.now() + 9 * 60 * 1000)
    return accessToken
  } finally {
    clearTimeout(timeoutId)
    console.timeEnd('azureTTS-fetchToken')
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
    const token = await tokenPromise
    return token
  } finally {
    tokenPromise = null
  }
}

async function generateTTSAudio(text: string): Promise<Buffer> {
  const accessToken = await fetchAzureToken()
  
  const REGION = process.env.AZURE_SPEECH_REGION
  const AZURE_COGNITIVE_ENDPOINT = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`

  console.log(`🎤 Calling Azure TTS for: "${text}"`)
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000)

  try {
    const ttsResponse = await fetch(AZURE_COGNITIVE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'User-Agent': 'Stamina-en-Menu-App-Test',
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

    console.log(`📡 Azure TTS response: ${ttsResponse.status} ${ttsResponse.statusText}`)

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text()
      throw new Error(`TTS API request failed: ${ttsResponse.status} - ${errorText}`)
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
    console.log(`🎵 Generated audio: ${audioBuffer.length} bytes`)
    return audioBuffer
  } finally {
    clearTimeout(timeoutId)
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  const { text } = req.body
  if (!text || typeof text !== 'string') {
    res.status(400).json({ message: 'Text is required' })
    return
  }

  console.log(`🧪 Testing TTS for: "${text}"`)

  try {
    const startTime = Date.now()
    
    // 生成 TTS 音訊
    const audioBuffer = await generateTTSAudio(text)
    const generateTime = Date.now() - startTime
    
    // 生成 Hash
    const hashId = generateHash(text)
    
    // 嘗試儲存到 Edge Cache
    console.log(`💾 Saving to Edge Cache...`)
    await kv.set(`tts:${hashId}`, audioBuffer, {
      ex: 86400 * 365
    })
    
    // 嘗試儲存到 Blob Storage  
    console.log(`☁️ Saving to Blob Storage...`)
    const blobResult = await put(`tts-cache/${hashId}.mp3`, audioBuffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'audio/mpeg'
    })
    
    const totalTime = Date.now() - startTime
    
    res.status(200).json({
      success: true,
      text,
      hashId,
      audioSize: audioBuffer.length,
      generateTime: `${generateTime}ms`,
      totalTime: `${totalTime}ms`,
      blobUrl: blobResult.url,
      message: '✅ TTS generation and caching successful'
    })
    
  } catch (error) {
    console.error(`❌ Test failed for "${text}":`, error)
    
    res.status(500).json({
      success: false,
      text,
      error: error instanceof Error ? error.message : String(error),
      message: '❌ TTS generation failed'
    })
  }
}