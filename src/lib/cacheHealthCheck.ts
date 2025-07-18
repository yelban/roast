/**
 * TTS 快取健康檢查工具
 * 用於監控和診斷快取系統的健康狀態
 */

interface CacheHealthResult {
  isHealthy: boolean
  issues: string[]
  stats: {
    apiCacheSize: number
    r2CacheSize: number
    totalFiles: number
    lastUpdated: string
  }
}

interface CacheEntry {
  url: string
  timestamp: number
  size?: number
  type: 'api' | 'r2'
}

/**
 * 檢查 Service Worker 快取健康狀態
 */
export async function checkCacheHealth(): Promise<CacheHealthResult> {
  const issues: string[] = []
  let apiCacheSize = 0
  let r2CacheSize = 0
  let totalFiles = 0

  try {
    // 檢查 Service Worker 是否可用
    if (!('serviceWorker' in navigator)) {
      issues.push('Service Worker 不支援')
      return {
        isHealthy: false,
        issues,
        stats: { apiCacheSize: 0, r2CacheSize: 0, totalFiles: 0, lastUpdated: new Date().toISOString() }
      }
    }

    // 檢查快取存在性
    const cacheNames = await caches.keys()
    const ttsCacheExists = cacheNames.some(name => name.includes('tts'))
    
    if (!ttsCacheExists) {
      issues.push('TTS 快取不存在')
    }

    // 統計快取檔案
    for (const cacheName of cacheNames) {
      if (cacheName.includes('tts')) {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()
        
        for (const request of requests) {
          const response = await cache.match(request)
          if (response) {
            totalFiles++
            const contentLength = response.headers.get('content-length')
            const size = contentLength ? parseInt(contentLength) : 0
            
            if (request.url.includes('/api/tts/')) {
              apiCacheSize += size
            } else if (request.url.includes('tts-cache.36.to')) {
              r2CacheSize += size
            }
          }
        }
      }
    }

    // 檢查儲存空間
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const usagePercent = estimate.usage && estimate.quota ? 
        (estimate.usage / estimate.quota) * 100 : 0
      
      if (usagePercent > 90) {
        issues.push(`儲存空間使用率過高: ${usagePercent.toFixed(1)}%`)
      }
    }

    // 檢查快取性能
    const testUrl = '/api/menu'
    const startTime = performance.now()
    const cached = await caches.match(testUrl)
    const cacheTime = performance.now() - startTime
    
    if (cacheTime > 100) {
      issues.push(`快取響應時間過慢: ${cacheTime.toFixed(1)}ms`)
    }

  } catch (error) {
    issues.push(`快取檢查失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
  }

  return {
    isHealthy: issues.length === 0,
    issues,
    stats: {
      apiCacheSize,
      r2CacheSize,
      totalFiles,
      lastUpdated: new Date().toISOString()
    }
  }
}

/**
 * 快取效能測試
 */
export async function benchmarkCache(): Promise<{
  apiCacheTime: number
  r2CacheTime: number
  networkTime: number
}> {
  const results = {
    apiCacheTime: 0,
    r2CacheTime: 0,
    networkTime: 0
  }

  try {
    // 測試 API 快取
    const apiTestUrl = '/api/tts/test'
    const apiStart = performance.now()
    await caches.match(apiTestUrl)
    results.apiCacheTime = performance.now() - apiStart

    // 測試 R2 快取
    const r2TestUrl = 'https://tts-cache.36.to/test.mp3'
    const r2Start = performance.now()
    await caches.match(r2TestUrl)
    results.r2CacheTime = performance.now() - r2Start

    // 測試網路請求
    const networkStart = performance.now()
    await fetch('/api/menu', { method: 'HEAD' })
    results.networkTime = performance.now() - networkStart

  } catch (error) {
    console.warn('快取效能測試失敗:', error)
  }

  return results
}

/**
 * 清理過期快取
 */
export async function cleanupExpiredCache(): Promise<number> {
  let cleanedCount = 0
  
  try {
    const cacheNames = await caches.keys()
    const now = Date.now()
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 天

    for (const cacheName of cacheNames) {
      if (cacheName.includes('tts')) {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()
        
        for (const request of requests) {
          const response = await cache.match(request)
          if (response) {
            const dateHeader = response.headers.get('date')
            if (dateHeader) {
              const cacheDate = new Date(dateHeader).getTime()
              if (now - cacheDate > maxAge) {
                await cache.delete(request)
                cleanedCount++
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('清理快取失敗:', error)
  }

  return cleanedCount
}