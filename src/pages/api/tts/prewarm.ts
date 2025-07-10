import { NextApiRequest, NextApiResponse } from 'next'
import { generateHash } from '@/lib/utils'
import { setCachedAudio, getCachedAudio } from '@/lib/r2CacheFetch'
import 'server-only'

// 常用的菜單項目（需要預熱的項目）
const COMMON_PHRASES = [
  // 焼肉類
  '上ロース', '中ロース', '特上ハラミ', '上ハラミ', '並ハラミ',
  '上ヒレ肉', '上ミスジ', '上カルビ', '上赤身', '並赤身',
  '中切り落とし', '並切り落とし', '骨付きカルビ', '特撰上ロース', '特撰上カルビ',
  
  // ホルモン類
  '上ミノ', '並ミノ', '上タン', '並タン', 'ミックスホルモン',
  'ギアラ', 'ホルモン', 'ハツ', 'センマイ', '子袋',
  'しびれ塩', 'ナンコツ塩', 'レバ塩',
  
  // その他
  'ひな鳥', 'いか焼き', '豚足', '季節の焼野菜',
  
  // 湯品
  'コムタンスープ', '玉子スープ', '野菜スープ', 'わかめスープ',
  'わかめ玉子スープ', 'もやしスープ', 'ほほ肉スープ',
  
  // 飯食
  'コムタン', 'カルビクッパ', 'クッパ', 'のりクッパ',
  'わかめクッパ', 'ビビンバ', 'ライス', '大ライス'
]

// 追蹤預熱狀態
interface PrewarmStatus {
  total: number
  completed: number
  failed: number
  inProgress: boolean
  lastRun: string | null
}

// 全域狀態
let prewarmStatus: PrewarmStatus = {
  total: 0,
  completed: 0,
  failed: 0,
  inProgress: false,
  lastRun: null
}

// Azure TTS Token 管理（複用主要 API 的邏輯）
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
      throw new Error(`Failed to get access token: ${tokenResponse.status}`)
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
    const token = await tokenPromise
    return token
  } finally {
    tokenPromise = null
  }
}

// 生成單個 TTS 音訊
async function generateTTSAudio(text: string): Promise<Buffer> {
  const accessToken = await fetchAzureToken()
  
  const REGION = process.env.AZURE_SPEECH_REGION
  const AZURE_COGNITIVE_ENDPOINT = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 秒超時

  try {
    const ttsResponse = await fetch(AZURE_COGNITIVE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'User-Agent': 'Stamina-en-Menu-App-Prewarm',
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
      throw new Error(`TTS API request failed: ${ttsResponse.status}`)
    }

    return Buffer.from(await ttsResponse.arrayBuffer())
  } finally {
    clearTimeout(timeoutId)
  }
}

// 預熱單個項目
async function prewarmSingleItem(text: string, forceRegenerate: boolean = false): Promise<boolean> {
  try {
    const hashId = generateHash(text)
    console.log(`🎯 Starting prewarm for: "${text}" (hash: ${hashId})`)
    
    if (!forceRegenerate) {
      // 檢查是否已在任何快取層存在
      const { buffer: existingCache, source } = await getCachedAudio(hashId)
      if (existingCache) {
        console.log(`✅ Already cached in ${source}: ${text}`)
        return true
      }
    } else {
      console.log(`🔥 Force regenerating: ${text}`)
    }

    console.log(`🔄 Generating TTS for: ${text}`)
    
    // 生成音訊
    const audioBuffer = await generateTTSAudio(text)
    console.log(`🎵 Generated audio for "${text}": ${audioBuffer.length} bytes`)
    
    // 使用統一快取介面，包含 R2 + Blob + Edge Cache
    console.log(`💾 Saving to all cache layers: ${text}`)
    await setCachedAudio(hashId, audioBuffer, {
      text: text,
      prewarmed: 'true',
      timestamp: new Date().toISOString()
    })
    
    console.log(`✅ Successfully prewarmed: ${text}`)
    return true
  } catch (error) {
    console.error(`❌ Prewarm failed for "${text}":`, error)
    console.error(`❌ Error details:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return false
  }
}

// 批次預熱
async function performPrewarm(phrases: string[], forceRegenerate: boolean = false): Promise<void> {
  prewarmStatus = {
    total: phrases.length,
    completed: 0,
    failed: 0,
    inProgress: true,
    lastRun: new Date().toISOString()
  }

  console.log(`🚀 Starting prewarm for ${phrases.length} items (force: ${forceRegenerate})`)

  // 批次處理，每批 3 個項目，避免 API 限制
  const batchSize = 3
  for (let i = 0; i < phrases.length; i += batchSize) {
    const batch = phrases.slice(i, i + batchSize)
    
    const promises = batch.map(async (phrase) => {
      const success = await prewarmSingleItem(phrase, forceRegenerate)
      if (success) {
        prewarmStatus.completed++
      } else {
        prewarmStatus.failed++
      }
    })
    
    await Promise.allSettled(promises)
    
    // 批次之間的延遲，避免 API 限制
    if (i + batchSize < phrases.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  prewarmStatus.inProgress = false
  console.log(`✅ Prewarm completed: ${prewarmStatus.completed} success, ${prewarmStatus.failed} failed`)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // 獲取預熱狀態
    res.status(200).json(prewarmStatus)
    return
  }

  if (req.method === 'POST') {
    // 開始預熱
    if (prewarmStatus.inProgress) {
      res.status(409).json({ 
        message: 'Prewarm already in progress',
        status: prewarmStatus 
      })
      return
    }

    const { phrases, force } = req.body
    const targetPhrases = phrases && Array.isArray(phrases) ? phrases : COMMON_PHRASES
    const forceRegenerate = force === true

    console.log(`Starting prewarm with force=${forceRegenerate}`)

    // 非同步執行預熱，不等待完成
    performPrewarm(targetPhrases, forceRegenerate).catch(error => {
      console.error('Prewarm process failed:', error)
      prewarmStatus.inProgress = false
    })

    res.status(202).json({ 
      message: 'Prewarm started',
      total: targetPhrases.length,
      status: prewarmStatus
    })
    return
  }

  res.status(405).json({ message: 'Method not allowed' })
}