import { NextApiRequest, NextApiResponse } from 'next'

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
    // 取得 Azure 訪問令牌
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

    // 使用 SSML 生成語音
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
        <voice name="ja-JP-NanamiNeural">
          <prosody volume="+100%">
            ${text}
          </prosody>
        </voice>
      </speak>
    `

    // 呼叫 TTS API
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
    
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000')
    res.send(Buffer.from(audioBuffer))
  } catch (error) {
    console.error('TTS error:', error)
    res.status(500).json({ message: 'TTS generation failed' })
  }
} 