import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// 生成 hash ID 的函數
function generateHashId(text: string): string {
  return crypto
    .createHash('md5')
    .update(text)
    .digest('hex')
}

// 檢查快取檔案是否存在
function getCachedAudioPath(hashId: string): string {
  return path.join(process.cwd(), 'public', 'audio', `${hashId}.mp3`)
}

// 確保音頻目錄存在
function ensureAudioDirectory() {
  const audioDir = path.join(process.cwd(), 'public', 'audio')
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true })
  }
}

// 添加快取清理函數
function cleanupOldCache() {
  const audioDir = path.join(process.cwd(), 'public', 'audio')
  const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 天
  
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { text } = req.body

  if (!text) {
    return res.status(400).json({ message: 'Text is required' })
  }

  try {
    // 生成 hash ID
    const hashId = generateHashId(text)
    const cachedFilePath = getCachedAudioPath(hashId)

    // 檢查快取是否存在
    if (fs.existsSync(cachedFilePath)) {
      const audioBuffer = fs.readFileSync(cachedFilePath)
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'public, max-age=31536000')
      return res.send(audioBuffer)
    }

    // 如果快取不存在，從 Azure 取得語音
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

    const audioBuffer = await ttsResponse.arrayBuffer()
    
    // 儲存快取檔案
    ensureAudioDirectory()
    try {
      fs.writeFileSync(cachedFilePath, Buffer.from(audioBuffer))
    } catch (error) {
      console.error('Cache write error:', error)
    }

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000')
    res.send(Buffer.from(audioBuffer))
  } catch (error) {
    console.error('TTS error:', error)
    res.status(500).json({ message: 'TTS generation failed' })
  }
} 