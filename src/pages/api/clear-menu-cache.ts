import { NextApiRequest, NextApiResponse } from 'next'
import { clearDataCache } from '@/lib/r2DataFetch'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // 清除記憶體快取
    clearDataCache('data.json')
    clearDataCache('table.json')
    
    console.log('✅ Menu cache cleared successfully')
    
    res.status(200).json({ 
      success: true, 
      message: 'Menu cache cleared successfully' 
    })
  } catch (error) {
    console.error('❌ Failed to clear cache:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear cache' 
    })
  }
}