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
    const { backupPath } = req.query
    
    if (!backupPath || !Array.isArray(backupPath)) {
      return res.status(400).json({ error: 'Backup path is required' })
    }
    
    // 重建完整的備份路徑
    let fullBackupId = backupPath.join('/')
    
    // 如果路徑不包含 .json 擴展名，添加它
    if (!fullBackupId.endsWith('.json')) {
      fullBackupId += '.json'
    }
    
    console.log('Restoring backup from path:', backupPath, '->', fullBackupId)
    
    const manager = getR2MenuManager()
    const result = await manager.restoreBackup(fullBackupId)
    
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