// Cloudflare R2 快取 - 使用 fetch API (Edge Runtime 相容)
import 'server-only'

interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  region?: string
}

class R2CacheFetch {
  private config: R2Config
  private endpoint: string

  constructor(config: R2Config) {
    this.config = config
    this.endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`
  }

  // 生成 SHA256 hash (字串)
  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // 生成 SHA256 hash (Buffer)
  private async sha256Buffer(data: Buffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // 生成 HMAC-SHA256
  private async hmacSha256(key: string | Uint8Array, message: string): Promise<Uint8Array> {
    const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key
    const messageBuffer = new TextEncoder().encode(message)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBuffer)
    return new Uint8Array(signature)
  }

  // 生成 AWS v4 簽名認證標頭
  private async createAwsV4Headers(method: string, key: string, data?: Buffer): Promise<Headers> {
    const { accessKeyId, secretAccessKey } = this.config
    const region = this.config.region || 'auto'
    const service = 's3'
    
    const now = new Date()
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '')
    
    // 計算內容 hash
    const payloadHash = data ? await this.sha256Buffer(data) : await this.sha256('')
    
    const headers = new Headers()
    headers.set('Host', `${this.config.accountId}.r2.cloudflarestorage.com`)
    headers.set('X-Amz-Date', amzDate)
    headers.set('X-Amz-Content-Sha256', payloadHash)
    
    if (data) {
      headers.set('Content-Type', 'audio/mpeg')
      headers.set('Content-Length', data.length.toString())
    }

    // 建立規範化請求
    const canonicalUri = `/${this.config.bucketName}/${key}`
    const canonicalQueryString = ''
    const canonicalHeaders = `host:${this.config.accountId}.r2.cloudflarestorage.com\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
    
    // 建立要簽名的字串
    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await this.sha256(canonicalRequest)}`
    
    // 計算簽名
    const kDate = await this.hmacSha256(`AWS4${secretAccessKey}`, dateStamp)
    const kRegion = await this.hmacSha256(kDate, region)
    const kService = await this.hmacSha256(kRegion, service)
    const kSigning = await this.hmacSha256(kService, 'aws4_request')
    const signature = await this.hmacSha256(kSigning, stringToSign)
    
    const signatureHex = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('')
    
    // 建立認證標頭
    const authHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`
    headers.set('Authorization', authHeader)
    
    return headers
  }

  // 檢查檔案是否存在
  async exists(key: string): Promise<boolean> {
    try {
      const headers = await this.createAwsV4Headers('HEAD', key)
      const url = `${this.endpoint}/${this.config.bucketName}/${key}`
      const response = await fetch(url, { 
        method: 'HEAD',
        headers
      })
      return response.ok
    } catch (error) {
      console.warn('R2 exists check failed:', error)
      return false
    }
  }

  // 獲取檔案
  async get(key: string): Promise<Buffer | null> {
    try {
      // 使用公開 URL 讀取 (如果檔案已設為公開)
      const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
      if (publicUrl) {
        const url = `${publicUrl}/${key}`
        const response = await fetch(url)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          return Buffer.from(arrayBuffer)
        }
      }
      
      // 回退到 S3 API (使用 AWS v4 簽名)
      const headers = await this.createAwsV4Headers('GET', key)
      const url = `${this.endpoint}/${this.config.bucketName}/${key}`
      const response = await fetch(url, { headers })
      
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        return Buffer.from(arrayBuffer)
      }
      
      return null
    } catch (error) {
      console.warn('R2 get failed:', error)
      return null
    }
  }

  // 儲存檔案 (使用 AWS v4 簽名)
  async put(key: string, data: Buffer, metadata?: Record<string, string>): Promise<boolean> {
    try {
      const headers = await this.createAwsV4Headers('PUT', key, data)
      
      // 添加 metadata 標頭 (編碼非 ASCII 字符)
      if (metadata) {
        Object.entries(metadata).forEach(([k, v]) => {
          // 對包含非 ASCII 字符的值進行 URL 編碼
          const encodedValue = encodeURIComponent(v)
          headers.set(`x-amz-meta-${k}`, encodedValue)
        })
      }

      const url = `${this.endpoint}/${this.config.bucketName}/${key}`
      console.log(`Attempting R2 PUT to: ${url}`)

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: data
      })

      console.log(`R2 PUT response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.warn('R2 PUT failed:', response.status, errorText)
      }

      return response.ok
    } catch (error) {
      console.warn('R2 put failed:', error)
      return false
    }
  }

  // 刪除檔案
  async delete(key: string): Promise<boolean> {
    try {
      const headers = await this.createAwsV4Headers('DELETE', key)
      const url = `${this.endpoint}/${this.config.bucketName}/${key}`
      const response = await fetch(url, { 
        method: 'DELETE',
        headers
      })
      return response.ok
    } catch (error) {
      console.warn('R2 delete failed:', error)
      return false
    }
  }
}

// 單例模式
let r2Instance: R2CacheFetch | null = null

export function getR2Cache(): R2CacheFetch | null {
  if (!r2Instance) {
    const config = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'tts-cache',
      region: process.env.CLOUDFLARE_R2_REGION || 'auto'
    }

    // 檢查必要配置
    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
      console.warn('R2 configuration missing, falling back to Blob storage')
      return null
    }

    try {
      r2Instance = new R2CacheFetch(config as R2Config)
      console.log('✅ R2 Fetch client initialized')
    } catch (error) {
      console.error('❌ R2 Fetch client initialization failed:', error)
      return null
    }
  }

  return r2Instance
}

// 快取 key 生成器 (簡化版)
export function generateCacheKey(hashId: string, type: 'audio' | 'metadata' = 'audio'): string {
  return `${hashId}.${type === 'audio' ? 'mp3' : 'json'}`
}

// 統一快取介面
export interface CacheResult {
  buffer: Buffer | null
  source: 'r2' | 'blob' | 'miss'
  metadata?: Record<string, string>
}

export async function getCachedAudio(hashId: string): Promise<CacheResult> {
  const r2 = getR2Cache()
  
  // 1. 嘗試從 R2 獲取
  if (r2) {
    try {
      const key = generateCacheKey(hashId)
      const buffer = await r2.get(key)
      if (buffer) {
        console.log('🔥 R2 Cache hit:', hashId, `(${buffer.length} bytes)`)
        return { buffer, source: 'r2' }
      }
    } catch (error) {
      console.warn('R2 cache failed, falling back to Blob:', error)
    }
  }

  // 2. 回退到 Vercel Blob
  try {
    const blobUrl = `${process.env.BLOB_STORE_URL}/tts-cache/${hashId}.mp3`
    const response = await fetch(blobUrl, { method: 'HEAD' })
    
    if (response.ok) {
      const audioResponse = await fetch(blobUrl)
      if (audioResponse.ok) {
        const arrayBuffer = await audioResponse.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        console.log('☁️ Blob Cache hit:', hashId, `(${buffer.length} bytes)`)
        return { buffer, source: 'blob' }
      }
    }
  } catch (error) {
    console.warn('Blob cache check failed:', error)
  }

  return { buffer: null, source: 'miss' }
}

export async function setCachedAudio(hashId: string, audioBuffer: Buffer, metadata?: Record<string, string>): Promise<void> {
  const promises: Promise<boolean | void>[] = []

  // 1. 儲存到 R2 (優先)
  const r2 = getR2Cache()
  if (r2) {
    const key = generateCacheKey(hashId)
    const cacheMetadata = {
      ...metadata,
      hashId,
      createdAt: new Date().toISOString(),
      size: audioBuffer.length.toString()
    }
    
    promises.push(
      r2.put(key, audioBuffer, cacheMetadata)
        .then(success => {
          if (success) {
            console.log('🔥 Saved to R2 Cache:', hashId)
          } else {
            console.warn('R2 save failed:', hashId)
          }
        })
        .catch(error => console.warn('R2 save error:', error))
    )
  }

  // 2. 儲存到 Vercel Blob (回退)
  const { put } = await import('@vercel/blob')
  promises.push(
    put(`tts-cache/${hashId}.mp3`, audioBuffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'audio/mpeg'
    })
      .then(() => console.log('☁️ Saved to Blob Storage:', hashId))
      .catch(error => console.warn('Blob save error:', error))
  )

  // 並行執行，不等待完成
  Promise.allSettled(promises)
}