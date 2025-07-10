import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { generateHash } from '@/lib/utils'
import { put } from '@vercel/blob'
import { getCachedAudio, setCachedAudio, checkCacheAvailability } from '@/lib/r2CacheFetch'
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
    // 直接返回 Blob URL，避免預先 fetch
    const blobUrl = `${process.env.BLOB_STORE_URL}/tts-cache/${hashId}.mp3`
    // 使用 HEAD 請求檢查檔案是否存在
    const response = await fetch(blobUrl, { method: 'HEAD' })
    return response.ok ? { url: blobUrl, exists: true } : null
  } catch (error) {
    console.error('Blob cache check error:', error)
    return null
  }
}

// 從 Blob 獲取音訊資料
async function fetchBlobAudio(blobUrl: string): Promise<Buffer> {
  const response = await fetch(blobUrl)
  if (!response.ok) throw new Error(`Blob fetch failed: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// Edge Cache 已停用，改用 Cloudflare R2

// 舊版本快取介面已移除，現在使用 r2CacheS3 統一介面

// 舊版本 setCachedAudio 已移除，現在使用 r2CacheS3 統一介面

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

// 1. 在檔案模組層級宣告全域變數
let cachedToken: string | null = null
let tokenExpiration: Date | null = null
let tokenPromise: Promise<string> | null = null

// 2. 內部執行 Token 獲取的函式
async function performTokenFetch(): Promise<string> {
  console.time('azureTTS-fetchToken');
  const REGION = process.env.AZURE_SPEECH_REGION;
  const AZURE_TOKEN_ENDPOINT = `https://${REGION}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 秒超時

  try {
    const tokenResponse = await fetch(AZURE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
        'Content-Length': '0',
      },
      body: '',
      signal: controller.signal
    });
    
    if (!tokenResponse.ok) {
      throw new Error(
        `Failed to get access token from Azure TTS: ${tokenResponse.status} ${tokenResponse.statusText}`
      );
    }
    
    const accessToken = await tokenResponse.text();
    
    // 設定 Token 與過期時間（9 分鐘，留 1 分鐘緩衝）
    cachedToken = accessToken;
    tokenExpiration = new Date(Date.now() + 9 * 60 * 1000);
    console.log('💾 Fetched and cached new Azure TTS token');
    
    return accessToken;
  } finally {
    clearTimeout(timeoutId)
    console.timeEnd('azureTTS-fetchToken');
  }
}

// 3. 提供專門的函式來抓取 Token：有效期內直接用舊 Token，防止併發重複請求
async function fetchAzureToken(): Promise<string> {
  // 檢查是否有已快取且未過期的 Token
  if (cachedToken && tokenExpiration && tokenExpiration > new Date()) {
    console.log('🚀 Using cached Azure TTS token');
    return cachedToken;
  }

  // 防止併發重複請求
  if (tokenPromise) {
    console.log('⏳ Waiting for concurrent token fetch');
    return await tokenPromise;
  }

  tokenPromise = performTokenFetch();
  try {
    const token = await tokenPromise;
    return token;
  } finally {
    tokenPromise = null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const startTime = Date.now()
  console.log('🎤 TTS API 請求開始:', req.url)
  
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
    console.log('📝 處理文字:', text, '| Hash:', hashId);

    // 檢查 If-None-Match 標頭
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === `"${hashId}"`) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable');
      res.setHeader('CF-Cache-Control', 'max-age=31536000, stale-while-revalidate=86400');
      res.setHeader('ETag', `"${hashId}"`);
      res.status(304).end();
      return;
    }

    // 優先檢查快取可用性 (重導向優化)
    console.time(`checkCacheAvailability-${hashId}`);
    const cacheAvailability = await checkCacheAvailability(hashId);
    console.timeEnd(`checkCacheAvailability-${hashId}`);

    // 如果快取可用且有公開 URL，直接重導向
    if (cacheAvailability.source !== 'miss' && cacheAvailability.publicUrl) {
      console.log(`🚀 快取重導向 (${cacheAvailability.source}):`, cacheAvailability.publicUrl);
      logCacheStatus(req, hashId, cacheAvailability.source);
      
      // 設定重導向 headers
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300'); // 重導向本身可以快取 5 分鐘
      res.setHeader('Location', cacheAvailability.publicUrl);
      
      console.log(`⚡ 重導向回應時間: ${Date.now() - startTime}ms`);
      res.status(302).end();
      return;
    }

    // 如果快速檢查失敗，回退到傳統快取檢查（確保向後相容）
    console.time(`getCachedAudio-${hashId}`);
    const { buffer: cachedAudio, source: cacheSource } = await getCachedAudio(hashId);
    console.timeEnd(`getCachedAudio-${hashId}`);

    if (cachedAudio) {
      console.log(`✅ 快取命中 (回退模式-${cacheSource}):`, cachedAudio.length, 'bytes');
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

      console.log(`⚡ 回退模式回應時間: ${Date.now() - startTime}ms`);
      res.send(cachedAudio);
      return;
    }

    console.log('🎙️ 快取未命中，呼叫 Azure TTS');

    // 3. 每次要呼叫 Azure TTS 前，先拿 token，已存在且未過期就不會重撈
    const accessToken = await fetchAzureToken();

    // 這裡開始使用 accessToken 呼叫 Azure TTS
    const REGION = process.env.AZURE_SPEECH_REGION;
    const AZURE_COGNITIVE_ENDPOINT = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    console.time(`azureTTS-synthesize-${hashId}`);
    
    // 添加 TTS 請求超時控制
    const ttsController = new AbortController()
    const ttsTimeoutId = setTimeout(() => ttsController.abort(), 30000) // 30 秒超時

    let ttsResponse: Response;
    try {
      ttsResponse = await fetch(AZURE_COGNITIVE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
          'User-Agent': 'Stamina-en-Menu-App',
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
        signal: ttsController.signal
      });
    } finally {
      clearTimeout(ttsTimeoutId)
      console.timeEnd(`azureTTS-synthesize-${hashId}`);
    }

    if (!ttsResponse.ok) {
      throw new Error(`TTS API request failed: ${ttsResponse.status} ${ttsResponse.statusText}`);
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // 儲存快取 (使用新的 R2 整合介面)
    console.time(`setCachedAudio-${hashId}`);
    await setCachedAudio(hashId, audioBuffer, {
      text: text,
      generated: new Date().toISOString(),
      source: 'tts-api'
    });
    console.timeEnd(`setCachedAudio-${hashId}`);

    console.log(`🎵 Azure TTS 生成完成:`, audioBuffer.length, 'bytes');
    console.log(`🕐 總處理時間: ${Date.now() - startTime}ms`);
    
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