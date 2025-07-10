import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const testUrl = 'https://tts-cache.36.to/6eaec7ebff0f679342bc4100c606723377ab6f0625b9a8dc8d1d0015c8569e72.mp3'
  
  try {
    // 1. 測試 OPTIONS 預檢請求
    console.log('測試 CORS 預檢請求...')
    const optionsResponse = await fetch(testUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://sutaminaen-menu.orz99.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    })
    
    const optionsHeaders = {
      status: optionsResponse.status,
      statusText: optionsResponse.statusText,
      headers: Object.fromEntries(optionsResponse.headers.entries())
    }
    
    // 2. 測試實際 GET 請求
    console.log('測試實際 GET 請求...')
    const getResponse = await fetch(testUrl, {
      method: 'GET'
    })
    
    const getHeaders = {
      status: getResponse.status,
      statusText: getResponse.statusText,
      headers: Object.fromEntries(getResponse.headers.entries())
    }
    
    res.status(200).json({
      testUrl,
      optionsRequest: optionsHeaders,
      getRequest: getHeaders,
      corsAnalysis: {
        hasAccessControlAllowOrigin: !!optionsHeaders.headers['access-control-allow-origin'],
        hasAccessControlAllowMethods: !!optionsHeaders.headers['access-control-allow-methods'],
        hasAccessControlAllowHeaders: !!optionsHeaders.headers['access-control-allow-headers'],
        allowedOrigins: optionsHeaders.headers['access-control-allow-origin'],
        allowedMethods: optionsHeaders.headers['access-control-allow-methods'],
        allowedHeaders: optionsHeaders.headers['access-control-allow-headers']
      }
    })
    
  } catch (error) {
    console.error('CORS 測試錯誤:', error)
    res.status(500).json({ 
      error: 'CORS test failed', 
      message: error instanceof Error ? error.message : 'Unknown error',
      testUrl
    })
  }
}