import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 檢查必要的環境變數
    const requiredEnvs = {
      'AZURE_SPEECH_KEY': process.env.AZURE_SPEECH_KEY,
      'AZURE_SPEECH_REGION': process.env.AZURE_SPEECH_REGION,
      'KV_REST_API_URL': process.env.KV_REST_API_URL,
      'KV_REST_API_TOKEN': process.env.KV_REST_API_TOKEN ? '[REDACTED]' : undefined,
      'BLOB_STORE_URL': process.env.BLOB_STORE_URL,
      'BLOB_READ_WRITE_TOKEN': process.env.BLOB_READ_WRITE_TOKEN ? '[REDACTED]' : undefined,
      'CACHE_MODE': process.env.CACHE_MODE || 'local'
    }

    const missing = Object.entries(requiredEnvs)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    // 測試 Azure TTS Token 獲取
    let azureTokenStatus = 'untested'
    try {
      const REGION = process.env.AZURE_SPEECH_REGION
      const AZURE_TOKEN_ENDPOINT = `https://${REGION}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`
      
      const tokenResponse = await fetch(AZURE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
        },
      })
      
      azureTokenStatus = tokenResponse.ok ? 'success' : `failed: ${tokenResponse.status}`
    } catch (error) {
      azureTokenStatus = `error: ${error instanceof Error ? error.message : 'unknown'}`
    }

    const health = {
      status: missing.length === 0 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: {
        ...requiredEnvs,
        missing: missing.length > 0 ? missing : undefined
      },
      services: {
        azureToken: azureTokenStatus
      },
      version: '1.0.0'
    }

    res.status(missing.length === 0 ? 200 : 500).json(health)
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}