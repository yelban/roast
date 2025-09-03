import type { NextApiResponse } from 'next'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { getR2MenuManager } from '@/lib/r2MenuManager'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { backupId } = req.query
    
    if (!backupId || typeof backupId !== 'string') {
      return res.status(400).json({ error: 'Backup ID is required' })
    }
    
    const manager = getR2MenuManager()
    const result = await manager.restoreBackup(backupId)
    
    return res.status(200).json({
      success: true,
      message: 'Backup restored successfully'
    })
  } catch (error) {
    console.error('Restore backup error:', error)
    return res.status(500).json({ 
      error: 'Failed to restore backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export default withAuth(handler)