import { NextApiRequest, NextApiResponse } from 'next'
import { checkCacheAvailability } from '@/lib/r2CacheFetch'
import { generateHash } from '@/lib/utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { text } = req.query

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text parameter is required' })
    return
  }

  try {
    const hashId = generateHash(text)
    const startTime = Date.now()
    
    console.log('🧪 Testing redirect for:', text, 'hash:', hashId)
    
    const cacheAvailability = await checkCacheAvailability(hashId)
    const responseTime = Date.now() - startTime
    
    const result = {
      text,
      hashId,
      cacheAvailability,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }
    
    console.log('🧪 Redirect test result:', result)
    
    res.status(200).json(result)
  } catch (error) {
    console.error('Redirect test error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}