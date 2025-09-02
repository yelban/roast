#!/usr/bin/env node

/**
 * 上傳菜單資料到 Cloudflare R2 儲存桶 'roast'
 * 使用現有的 R2 配置和認證方法
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// R2 配置
const R2_CONFIG = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  bucketName: 'roast', // 新的儲存桶名稱
  region: process.env.CLOUDFLARE_R2_REGION || 'auto'
}

class R2Uploader {
  constructor(config) {
    this.config = config
    this.endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`
  }

  // 生成 SHA256 hash
  async sha256(message) {
    return crypto.createHash('sha256').update(message).digest('hex')
  }

  // 生成 HMAC-SHA256
  hmacSha256(key, message) {
    return crypto.createHmac('sha256', key).update(message).digest()
  }

  // 生成 AWS v4 簽名認證標頭
  async createAwsV4Headers(method, key, data = null) {
    const { accessKeyId, secretAccessKey, region } = this.config
    const service = 's3'
    
    const now = new Date()
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '')
    
    // 計算內容 hash
    const payloadHash = data ? await this.sha256(data) : await this.sha256('')
    
    const headers = {
      'Host': `${this.config.accountId}.r2.cloudflarestorage.com`,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-Sha256': payloadHash
    }
    
    if (data) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(data).toString()
    }

    // 建立規範化請求
    const canonicalUri = `/${this.config.bucketName}/${key}`
    const canonicalQueryString = ''
    const canonicalHeaders = Object.keys(headers)
      .map(k => k.toLowerCase())
      .sort()
      .map(k => `${k}:${headers[Object.keys(headers).find(h => h.toLowerCase() === k)]}\n`)
      .join('')
    
    const signedHeaders = Object.keys(headers)
      .map(k => k.toLowerCase())
      .sort()
      .join(';')
    
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
    
    // 建立要簽名的字串
    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await this.sha256(canonicalRequest)}`
    
    // 計算簽名
    const kDate = this.hmacSha256(`AWS4${secretAccessKey}`, dateStamp)
    const kRegion = this.hmacSha256(kDate, region)
    const kService = this.hmacSha256(kRegion, service)
    const kSigning = this.hmacSha256(kService, 'aws4_request')
    const signature = this.hmacSha256(kSigning, stringToSign).toString('hex')
    
    // 建立認證標頭
    const authHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    headers['Authorization'] = authHeader
    
    return headers
  }

  // 上傳檔案到 R2
  async uploadFile(key, data) {
    try {
      const headers = await this.createAwsV4Headers('PUT', key, data)
      const url = `${this.endpoint}/${this.config.bucketName}/${key}`
      
      console.log(`正在上傳到: ${url}`)
      
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: data
      })

      console.log(`上傳回應: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`上傳失敗: ${response.status} ${errorText}`)
      }

      return true
    } catch (error) {
      console.error('上傳錯誤:', error)
      throw error
    }
  }
}

// 主要執行函數
async function main() {
  // 檢查必要的環境變數
  if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
    console.error('❌ 缺少必要的 Cloudflare R2 環境變數')
    console.error('請檢查以下環境變數:')
    console.error('- CLOUDFLARE_ACCOUNT_ID')
    console.error('- CLOUDFLARE_R2_ACCESS_KEY_ID') 
    console.error('- CLOUDFLARE_R2_SECRET_ACCESS_KEY')
    process.exit(1)
  }

  const uploader = new R2Uploader(R2_CONFIG)
  const dataDir = path.join(__dirname, '..', 'src', 'data')
  
  try {
    // 上傳 data.json
    console.log('📤 正在上傳菜單資料 (data.json)...')
    const menuDataPath = path.join(dataDir, 'data.json')
    const menuData = fs.readFileSync(menuDataPath, 'utf8')
    await uploader.uploadFile('data.json', menuData)
    console.log('✅ data.json 上傳成功')

    // 上傳 table.json
    console.log('📤 正在上傳桌位資料 (table.json)...')
    const tableDataPath = path.join(dataDir, 'table.json')
    const tableData = fs.readFileSync(tableDataPath, 'utf8')
    await uploader.uploadFile('table.json', tableData)
    console.log('✅ table.json 上傳成功')

    console.log('🎉 所有菜單資料上傳完成！')
    console.log(`📍 儲存桶: ${R2_CONFIG.bucketName}`)
    console.log('📁 上傳的檔案:')
    console.log('   - data.json (菜單資料)')
    console.log('   - table.json (桌位資料)')

  } catch (error) {
    console.error('❌ 上傳過程發生錯誤:', error.message)
    process.exit(1)
  }
}

// 如果直接執行此腳本則運行主函數
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { R2Uploader }