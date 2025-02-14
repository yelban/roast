import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { generateHash } from '@/lib/utils'
import { put } from '@vercel/blob'
import { kv } from '@vercel/kv'
import 'server-only'

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
  const cfCacheStatus = req.headers['cf-cache-status']
  const cfRay = req.headers['cf-ray']
  const cfCountry = req.headers['cf-ipcountry']

  console.log(`Cache Status for ${hashId}:`, {
    source: cacheSource,
    edgeCache: cacheSource === 'edge' ? 'HIT' : 'MISS',
    cfStatus: cfCacheStatus,
    cfRay,
    cfCountry,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
};

// 1. 在檔案模組層級宣告兩個全域變數
let cachedToken: string | null = null
let tokenExpiration: Date | null = null

// 2. 提供專門的函式來抓取 Token：有效期內直接用舊 Token
async function fetchAzureToken(): Promise<string> {
  // （1）檢查是否有已快取且未過期的 Token
  if (cachedToken && tokenExpiration && tokenExpiration > new Date()) {
    console.log('🚀 Using cached Azure TTS token');
    return cachedToken;
  }

  console.time('azureTTS-fetchToken');
  const REGION = process.env.AZURE_SPEECH_REGION;
  const AZURE_TOKEN_ENDPOINT = `https://${REGION}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;

  // （2）呼叫 Azure 以取得新的 Token
  const tokenResponse = await fetch(AZURE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
    },
  });
  console.timeEnd('azureTTS-fetchToken');

  if (!tokenResponse.ok) {
    throw new Error(
      `Failed to get access token from Azure TTS: ${tokenResponse.status} ${tokenResponse.statusText}`
    );
  }
  const accessToken = await tokenResponse.text();

  // （3）設定 Token 與過期時間（例如 10 分鐘）
  cachedToken = accessToken;
  tokenExpiration = new Date(Date.now() + 10 * 60 * 1000);
  console.log('💾 Fetched and cached new Azure TTS token');

  return accessToken;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const { text } = req.query;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ message: 'Text is required' });
    return;
  }

  try {
    const hashId = generateHashId(text);
    console.log('hashId', hashId);

    // 檢查 If-None-Match 標頭
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === `"${hashId}"`) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable');
      res.setHeader('CF-Cache-Control', 'max-age=31536000, stale-while-revalidate=86400');
      res.setHeader('ETag', `"${hashId}"`);
      res.status(304).end();
      return;
    }

    // 檢查快取
    console.time(`getCachedAudio-${hashId}`);
    const { buffer: cachedAudio, source: cacheSource } = await getCachedAudio(hashId);
    console.timeEnd(`getCachedAudio-${hashId}`);

    if (cachedAudio) {
      logCacheStatus(req, hashId, cacheSource);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable');
      res.setHeader('CF-Cache-Control', 'max-age=31536000, stale-while-revalidate=86400');
      res.setHeader('Content-Length', cachedAudio.length.toString());
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('ETag', `"${hashId}"`);
      res.setHeader('Vary', 'Accept');
      res.setHeader('CF-Cache-Tags', `tts-${hashId}`);
      res.setHeader('CF-Cache-Status', 'DYNAMIC');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      res.send(cachedAudio);
      return;
    }

    console.log('🎙️ Fetching from Azure TTS');

    // 3. 每次要呼叫 Azure TTS 前，先拿 token，已存在且未過期就不會重撈
    const accessToken = await fetchAzureToken();

    // 這裡開始使用 accessToken 呼叫 Azure TTS
    const REGION = process.env.AZURE_SPEECH_REGION;
    const AZURE_COGNITIVE_ENDPOINT = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    console.time(`azureTTS-synthesize-${hashId}`);
    const ttsResponse = await fetch(AZURE_COGNITIVE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'User-Agent': 'YourAppName',
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
    });
    console.timeEnd(`azureTTS-synthesize-${hashId}`);

    if (!ttsResponse.ok) {
      throw new Error(`TTS API request failed: ${ttsResponse.status} ${ttsResponse.statusText}`);
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // 儲存快取
    console.time(`setCachedAudio-${hashId}`);
    await setCachedAudio(hashId, audioBuffer);
    console.timeEnd(`setCachedAudio-${hashId}`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable');
    res.setHeader('CF-Cache-Control', 'max-age=31536000, stale-while-revalidate=86400');
    res.setHeader('Content-Length', audioBuffer.length.toString());
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('ETag', `"${hashId}"`);
    res.setHeader('Vary', 'Accept');
    res.setHeader('CF-Cache-Tags', `tts-${hashId}`);
    res.setHeader('CF-Cache-Status', 'DYNAMIC');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(audioBuffer);
    return;

  } catch (error: unknown) {
    console.error('TTS error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'TTS generation failed', error: errorMessage });
    return;
  }
} 