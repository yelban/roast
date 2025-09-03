import type { NextApiResponse } from 'next'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { getR2MenuManager } from '@/lib/r2MenuManager'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const manager = getR2MenuManager()
    const menuData = await manager.getCurrentMenu()
    
    return res.status(200).json({
      success: true,
      data: menuData
    })
  } catch (error) {
    console.error('Get menu error:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch menu data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export default withAuth(handler)