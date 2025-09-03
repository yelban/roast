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
      date: (() => {
        try {
          // 優先使用 Intl.DateTimeFormat (更可靠)
          return new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).format(new Date(backup.timestamp))
        } catch (error) {
          // 後備方案：手動計算東京時區
          console.warn('Intl.DateTimeFormat failed, using manual conversion:', error)
          const date = new Date(backup.timestamp + (9 * 60 * 60 * 1000)) // UTC + 9 小時
          const year = date.getUTCFullYear()
          const month = String(date.getUTCMonth() + 1).padStart(2, '0')
          const day = String(date.getUTCDate()).padStart(2, '0')
          const hour = String(date.getUTCHours()).padStart(2, '0')
          const minute = String(date.getUTCMinutes()).padStart(2, '0')
          const second = String(date.getUTCSeconds()).padStart(2, '0')
          return `${year}/${month}/${day} ${hour}:${minute}:${second}`
        }
      })(),
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