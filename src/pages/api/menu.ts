import { NextApiRequest, NextApiResponse } from 'next'
import menuData from '@/data/data.json'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!menuData || typeof menuData !== 'object' || Object.keys(menuData).length === 0) {
      throw new Error('Invalid menu data')
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }
    
    res.status(200).json(menuData)
  } catch (error: unknown) {
    console.error('API Error:', error)
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unknown error occurred'

    res.status(500).json({ 
      error: 'Failed to load menu data',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
    })
  }
} 