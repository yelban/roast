import type { NextApiResponse } from 'next'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { getR2MenuManager } from '@/lib/r2MenuManager'
import { MenuData } from '@/types/menu'
import { clearDataCache } from '@/lib/r2DataFetch'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { data } = req.body as { data: MenuData }
    
    if (!data) {
      return res.status(400).json({ error: 'Menu data is required' })
    }
    
    // 基本驗證
    if (typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid menu data format' })
    }
    
    const manager = getR2MenuManager()
    const result = await manager.saveMenu(data)
    
    // 自動清除記憶體快取，確保後續請求獲取最新資料
    console.log('🔄 Clearing memory cache after menu save...')
    clearDataCache('data.json')
    clearDataCache('table.json')
    console.log('✅ Memory cache cleared successfully')
    
    return res.status(200).json({
      success: true,
      backupId: result.backupId,
      message: 'Menu saved successfully'
    })
  } catch (error) {
    console.error('Save menu error:', error)
    return res.status(500).json({ 
      error: 'Failed to save menu data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export default withAuth(handler)