// Cloudflare R2 資料獲取 - 用於菜單和桌位資料
import 'server-only'

interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  region?: string
}

class R2DataFetch {
  private config: R2Config
  private endpoint: string
  private cache: Map<string, { data: unknown, timestamp: number, etag?: string }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 分鐘快取

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
  private async createAwsV4Headers(method: string, key: string): Promise<Headers> {
    const { accessKeyId, secretAccessKey } = this.config
    const region = this.config.region || 'auto'
    const service = 's3'
    
    const now = new Date()
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '')
    
    // 計算內容 hash (GET 請求沒有 body)
    const payloadHash = await this.sha256('')
    
    const headers = new Headers()
    headers.set('Host', `${this.config.accountId}.r2.cloudflarestorage.com`)
    headers.set('X-Amz-Date', amzDate)
    headers.set('X-Amz-Content-Sha256', payloadHash)

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

  // 獲取 JSON 資料 (帶快取)
  async getJsonData(key: string): Promise<unknown> {
    // 檢查記憶體快取
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`🚀 Memory cache hit for: ${key}`)
      return cached.data
    }

    try {
      // 優先嘗試公開 URL (如果有設定)
      const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
      if (publicUrl) {
        const url = `${publicUrl}/${key}`
        console.log(`🔍 Trying public URL: ${url}`)
        
        const response = await fetch(url, {
          headers: cached?.etag ? { 'If-None-Match': cached.etag } : {}
        })
        
        if (response.status === 304) {
          // 資料未變更，使用快取
          console.log(`📦 Public URL cache valid for: ${key}`)
          if (cached) {
            cached.timestamp = Date.now() // 更新快取時間
            return cached.data
          }
        }
        
        if (response.ok) {
          const data = await response.json()
          const etag = response.headers.get('etag')
          
          // 更新快取
          this.cache.set(key, {
            data,
            timestamp: Date.now(),
            etag: etag || undefined
          })
          
          console.log(`✅ Public URL fetch success for: ${key}`)
          return data
        }
        
        console.warn(`⚠️ Public URL failed (${response.status}), falling back to S3 API`)
      }
      
      // 回退到 S3 API
      const headers = await this.createAwsV4Headers('GET', key)
      const url = `${this.endpoint}/${this.config.bucketName}/${key}`
      const response = await fetch(url, { headers })
      
      if (!response.ok) {
        throw new Error(`R2 fetch failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // 更新快取
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      })
      
      console.log(`✅ S3 API fetch success for: ${key}`)
      return data
      
    } catch (error) {
      console.error(`❌ R2 fetch failed for ${key}:`, error)
      
      // 如果有過期快取，返回過期資料作為回退
      if (cached) {
        console.warn(`⚠️ Using stale cache for: ${key}`)
        return cached.data
      }
      
      throw error
    }
  }

  // 清除快取
  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
}

// 單例模式
let r2DataInstance: R2DataFetch | null = null

export function getR2DataFetch(): R2DataFetch {
  if (!r2DataInstance) {
    const config = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      bucketName: 'roast', // 固定使用 roast 儲存桶
      region: process.env.CLOUDFLARE_R2_REGION || 'auto'
    }

    // 檢查必要配置
    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('Missing required Cloudflare R2 configuration')
    }

    r2DataInstance = new R2DataFetch(config)
    console.log('✅ R2 Data Fetch client initialized')
  }

  return r2DataInstance
}

// 便利函數
export async function getMenuData() {
  const r2 = getR2DataFetch()
  return await r2.getJsonData('data.json')
}

export async function getTableData() {
  const r2 = getR2DataFetch()
  return await r2.getJsonData('table.json')
}

// 清除資料快取
export function clearDataCache(key?: 'data.json' | 'table.json') {
  if (r2DataInstance) {
    r2DataInstance.clearCache(key)
  }
}