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
    const backups = await manager.listBackups()
    
    // 格式化備份資訊
    const formattedBackups = backups.map(backup => ({
      id: backup.id,
      timestamp: backup.timestamp,
      date: new Date(backup.timestamp).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      size: `${(backup.size / 1024).toFixed(2)} KB`
    }))
    
    return res.status(200).json({
      success: true,
      backups: formattedBackups
    })
  } catch (error) {
    console.error('List backups error:', error)
    return res.status(500).json({ 
      error: 'Failed to list backups',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export default withAuth(handler)