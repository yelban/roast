import { NextApiRequest, NextApiResponse } from 'next'
import { generateHash } from '@/lib/utils'
import 'server-only'

// 複製主要 API 的 Token 管理
let cachedToken: string | null = null
let tokenExpiration: Date | null = null

async function fetchAzureToken(): Promise<string> {
  if (cachedToken && tokenExpiration && tokenExpiration > new Date()) {
    return cachedToken
  }

  const REGION = process.env.AZURE_SPEECH_REGION
  const AZURE_TOKEN_ENDPOINT = `https://${REGION}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`

  const tokenResponse = await fetch(AZURE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
      'Content-Length': '0',
    },
    body: ''
  })
  
  if (!tokenResponse.ok) {
    throw new Error(`Token failed: ${tokenResponse.status}`)
  }
  
  const accessToken = await tokenResponse.text()
  cachedToken = accessToken
  tokenExpiration = new Date(Date.now() + 9 * 60 * 1000)
  return accessToken
}

async function generateTTSAudio(text: string): Promise<Buffer> {
  const accessToken = await fetchAzureToken()
  
  const REGION = process.env.AZURE_SPEECH_REGION
  const AZURE_COGNITIVE_ENDPOINT = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`

  const ttsResponse = await fetch(AZURE_COGNITIVE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
      'User-Agent': 'Stamina-en-Menu-App-Simple',
    },
    body: `<speak version='1.0' 
                  xmlns='http://www.w3.org/2001/10/synthesis' 
                  xml:lang='ja-JP'>
             <voice name='ja-JP-NanamiNeural'>
               <prosody volume='+100%'>
                 ${text}
               </prosody>
             </voice>
           </speak>`
  })

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text()
    throw new Error(`TTS failed: ${ttsResponse.status} - ${errorText}`)
  }

  return Buffer.from(await ttsResponse.arrayBuffer())
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { text } = req.query
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text parameter required' })
    return
  }

  try {
    console.log(`🧪 Simple TTS test for: "${text}"`)
    
    const startTime = Date.now()
    const audioBuffer = await generateTTSAudio(text)
    const duration = Date.now() - startTime
    
    console.log(`✅ TTS success: ${audioBuffer.length} bytes in ${duration}ms`)
    
    // 直接回傳音訊，不儲存快取
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audioBuffer.length.toString())
    res.send(audioBuffer)
    
  } catch (error) {
    console.error(`❌ TTS failed:`, error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}