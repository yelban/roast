import 'server-only'
import { MenuData } from '@/types/menu'

interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  region?: string
}

export class R2MenuManager {
  private config: R2Config
  private endpoint: string
  private readonly MAX_BACKUPS = 5

  constructor(config: R2Config) {
    this.config = config
    this.endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`
  }

  // 生成 SHA256 hash
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
  private async createAwsV4Headers(
    method: string, 
    key: string, 
    queryString: string = '',
    contentType: string = 'application/json',
    body?: string
  ): Promise<Headers> {
    const { accessKeyId, secretAccessKey } = this.config
    const region = this.config.region || 'auto'
    const service = 's3'
    
    const now = new Date()
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '')
    
    // 計算內容 hash
    const payloadHash = body ? await this.sha256(body) : await this.sha256('')
    
    // 準備請求
    const canonicalUri = key ? `/${this.config.bucketName}/${key}` : `/${this.config.bucketName}`
    const canonicalQuerystring = queryString
    const canonicalHeaders = 
      `host:${this.config.accountId}.r2.cloudflarestorage.com\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    
    const canonicalRequest = 
      `${method}\n${canonicalUri}\n${canonicalQuerystring}\n` +
      `${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
    
    // 計算簽名
    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = 
      `${algorithm}\n${amzDate}\n${credentialScope}\n` +
      `${await this.sha256(canonicalRequest)}`
    
    // 生成簽名金鑰
    const kDate = await this.hmacSha256(`AWS4${secretAccessKey}`, dateStamp)
    const kRegion = await this.hmacSha256(kDate, region)
    const kService = await this.hmacSha256(kRegion, service)
    const kSigning = await this.hmacSha256(kService, 'aws4_request')
    
    // 計算簽名
    const signatureBytes = await this.hmacSha256(kSigning, stringToSign)
    const signature = Array.from(signatureBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // 建構授權標頭
    const authorizationHeader = 
      `${algorithm} Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`
    
    const headers = new Headers({
      'Authorization': authorizationHeader,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Content-Type': contentType
    })
    
    if (body) {
      headers.set('Content-Length', new TextEncoder().encode(body).length.toString())
    }
    
    return headers
  }

  // 獲取當前菜單資料
  async getCurrentMenu(): Promise<MenuData> {
    const headers = await this.createAwsV4Headers('GET', 'data.json', '')
    
    const response = await fetch(
      `${this.endpoint}/${this.config.bucketName}/data.json`,
      { headers }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch menu: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data as MenuData
  }

  // 保存菜單資料並創建備份
  async saveMenu(menuData: MenuData): Promise<{ success: boolean; backupId: string }> {
    const timestamp = Date.now()
    const backupId = `backup-${timestamp}`
    
    try {
      // 1. 先獲取當前資料作為備份
      let currentData: MenuData | null = null
      try {
        currentData = await this.getCurrentMenu()
      } catch (error) {
        console.log('No existing data to backup')
      }
      
      // 2. 如果有現有資料，創建備份
      if (currentData) {
        const backupKey = `backups/data-${timestamp}.json`
        const backupBody = JSON.stringify(currentData, null, 2)
        const backupHeaders = await this.createAwsV4Headers('PUT', backupKey, '', 'application/json', backupBody)
        
        const backupResponse = await fetch(
          `${this.endpoint}/${this.config.bucketName}/${backupKey}`,
          {
            method: 'PUT',
            headers: backupHeaders,
            body: backupBody
          }
        )
        
        if (!backupResponse.ok) {
          console.error('Failed to create backup:', backupResponse.status)
        }
        
        // 3. 清理舊備份
        await this.cleanupOldBackups()
      }
      
      // 4. 保存新資料
      const body = JSON.stringify(menuData, null, 2)
      const headers = await this.createAwsV4Headers('PUT', 'data.json', '', 'application/json', body)
      
      const response = await fetch(
        `${this.endpoint}/${this.config.bucketName}/data.json`,
        {
          method: 'PUT',
          headers,
          body
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to save menu: ${response.status} ${response.statusText}`)
      }
      
      return { success: true, backupId }
    } catch (error) {
      console.error('Save menu error:', error)
      throw error
    }
  }

  // 獲取備份列表
  async listBackups(): Promise<Array<{ id: string; timestamp: number; size: number }>> {
    // 構造查詢參數 - AWS V4簽名需要特定的編碼格式
    const params = new URLSearchParams()
    params.set('list-type', '2')
    params.set('prefix', 'backups/')
    
    // 對於 AWS V4 簽名，查詢字串需要按照字母順序排序
    const sortedParams = new URLSearchParams()
    Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => sortedParams.set(key, value))
    
    const queryString = sortedParams.toString()
    const headers = await this.createAwsV4Headers('GET', '', queryString)
    
    const url = `${this.endpoint}/${this.config.bucketName}?${queryString}`
    
    console.log('Listing backups from URL:', url)
    
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('List backups failed:', response.status, errorText)
      throw new Error(`Failed to list backups: ${response.status} - ${errorText}`)
    }
    
    const text = await response.text()
    console.log('List backups response XML:', text.substring(0, 500) + (text.length > 500 ? '...' : ''))
    
    // 使用正則表達式解析 XML（避免在 Edge Runtime 中使用 DOMParser）
    // 解析 Contents 區塊，每個檔案的資訊都在一個 Contents 標籤內
    const contentsRegex = /<Contents>(.*?)<\/Contents>/gs
    const keyRegex = /<Key>([^<]+)<\/Key>/
    const sizeRegex = /<Size>([^<]+)<\/Size>/
    const lastModifiedRegex = /<LastModified>([^<]+)<\/LastModified>/
    
    const backups: Array<{ id: string; timestamp: number; size: number }> = []
    
    let match
    while ((match = contentsRegex.exec(text)) !== null) {
      const contentXml = match[1]
      
      const keyMatch = keyRegex.exec(contentXml)
      const sizeMatch = sizeRegex.exec(contentXml)
      const lastModifiedMatch = lastModifiedRegex.exec(contentXml)
      
      if (keyMatch && sizeMatch && lastModifiedMatch) {
        const key = keyMatch[1]
        const size = parseInt(sizeMatch[1])
        const lastModified = lastModifiedMatch[1]
        
        // 檢查是否為備份檔案
        const fileMatch = key.match(/data-(\d+)\.json$/)
        if (fileMatch) {
          // 使用檔案的實際 LastModified 時間而不是檔案名稱中的時間戳記
          const timestamp = new Date(lastModified).getTime()
          
          backups.push({
            id: key,
            timestamp,
            size
          })
        }
      }
    }
    
    console.log('Found backups:', backups.length, backups)
    
    // 按時間戳排序，最新的在前
    return backups.sort((a, b) => b.timestamp - a.timestamp)
  }

  // 還原備份
  async restoreBackup(backupId: string): Promise<{ success: boolean }> {
    try {
      // 1. 獲取備份資料
      const headers = await this.createAwsV4Headers('GET', backupId, '')
      
      const response = await fetch(
        `${this.endpoint}/${this.config.bucketName}/${backupId}`,
        { headers }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch backup: ${response.status}`)
      }
      
      const backupData = await response.json() as MenuData
      
      // 2. 保存為當前資料（這會自動創建新備份）
      await this.saveMenu(backupData)
      
      return { success: true }
    } catch (error) {
      console.error('Restore backup error:', error)
      throw error
    }
  }

  // 清理舊備份（保留最近 5 個）
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups()
      
      if (backups.length > this.MAX_BACKUPS) {
        const toDelete = backups.slice(this.MAX_BACKUPS)
        
        for (const backup of toDelete) {
          const headers = await this.createAwsV4Headers('DELETE', backup.id, '')
          
          await fetch(
            `${this.endpoint}/${this.config.bucketName}/${backup.id}`,
            {
              method: 'DELETE',
              headers
            }
          )
        }
      }
    } catch (error) {
      console.error('Cleanup backups error:', error)
    }
  }
}

// 創建單例實例
let menuManagerInstance: R2MenuManager | null = null

export function getR2MenuManager(): R2MenuManager {
  if (!menuManagerInstance) {
    const config = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      bucketName: 'roast',
      region: process.env.CLOUDFLARE_R2_REGION || 'auto'
    }
    
    menuManagerInstance = new R2MenuManager(config)
  }
  
  return menuManagerInstance
}