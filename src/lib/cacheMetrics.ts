// 快取使用度量和智能策略
export interface CacheMetric {
  hashId: string
  text: string
  hitCount: number
  lastUsed: number
  avgResponseTime: number
  createdAt: number
}

export interface CacheMetrics {
  [hashId: string]: CacheMetric
}

export type CacheStrategy = 'edge-only' | 'standard' | 'preload-all'

const METRICS_STORAGE_KEY = 'tts-cache-metrics'

// 從 localStorage 獲取指標（瀏覽器端）
export function getCacheMetrics(): CacheMetrics {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(METRICS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Failed to load cache metrics:', error)
    return {}
  }
}

// 儲存指標到 localStorage
export function saveCacheMetrics(metrics: CacheMetrics): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics))
  } catch (error) {
    console.error('Failed to save cache metrics:', error)
  }
}

// 記錄快取使用
export function recordCacheUsage(
  hashId: string, 
  text: string, 
  responseTime: number
): void {
  const metrics = getCacheMetrics()
  const now = Date.now()
  
  if (metrics[hashId]) {
    // 更新現有指標
    const metric = metrics[hashId]
    metric.hitCount++
    metric.lastUsed = now
    
    // 計算平均響應時間（使用移動平均）
    const weight = Math.min(metric.hitCount, 10) // 最多考慮最近10次
    metric.avgResponseTime = (
      (metric.avgResponseTime * (weight - 1) + responseTime) / weight
    )
  } else {
    // 創建新指標
    metrics[hashId] = {
      hashId,
      text,
      hitCount: 1,
      lastUsed: now,
      avgResponseTime: responseTime,
      createdAt: now
    }
  }
  
  // 清理舊指標（保留最近 30 天）
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
  Object.keys(metrics).forEach(key => {
    if (metrics[key].lastUsed < thirtyDaysAgo) {
      delete metrics[key]
    }
  })
  
  saveCacheMetrics(metrics)
}

// 決定快取策略
export function determineCacheStrategy(hashId: string): CacheStrategy {
  const metrics = getCacheMetrics()
  const metric = metrics[hashId]
  
  if (!metric) {
    // 新項目：標準策略
    return 'standard'
  }
  
  const now = Date.now()
  const daysSinceLastUsed = (now - metric.lastUsed) / (24 * 60 * 60 * 1000)
  
  // 基於使用頻率和最近使用時間決定策略
  if (metric.hitCount >= 20 || (metric.hitCount >= 5 && daysSinceLastUsed <= 7)) {
    // 高頻項目或最近常用：預載入所有層級
    return 'preload-all'
  } else if (metric.hitCount <= 2 && daysSinceLastUsed > 30) {
    // 低頻且長時間未使用：僅使用 Edge Cache
    return 'edge-only'
  } else {
    // 中頻項目：標準策略
    return 'standard'
  }
}

// 獲取熱門項目（用於預熱）
export function getPopularItems(limit: number = 20): CacheMetric[] {
  const metrics = getCacheMetrics()
  const items = Object.values(metrics)
  
  // 基於綜合分數排序：hit count + 時間衰減
  const now = Date.now()
  return items
    .map(metric => {
      const daysSinceLastUsed = (now - metric.lastUsed) / (24 * 60 * 60 * 1000)
      const timeDecay = Math.exp(-daysSinceLastUsed / 30) // 30天衰減
      const score = metric.hitCount * timeDecay
      return { ...metric, score }
    })
    .sort((a: CacheMetric & { score: number }, b: CacheMetric & { score: number }) => b.score - a.score)
    .slice(0, limit)
}

// 分析快取效能
export function analyzeCachePerformance(): {
  totalItems: number
  averageHitCount: number
  averageResponseTime: number
  popularItems: CacheMetric[]
  recentActivity: CacheMetric[]
} {
  const metrics = getCacheMetrics()
  const items = Object.values(metrics)
  
  if (items.length === 0) {
    return {
      totalItems: 0,
      averageHitCount: 0,
      averageResponseTime: 0,
      popularItems: [],
      recentActivity: []
    }
  }
  
  const totalHits = items.reduce((sum, item) => sum + item.hitCount, 0)
  const totalResponseTime = items.reduce((sum, item) => sum + item.avgResponseTime, 0)
  
  const now = Date.now()
  const recentItems = items
    .filter(item => (now - item.lastUsed) <= (7 * 24 * 60 * 60 * 1000)) // 最近7天
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, 10)
  
  return {
    totalItems: items.length,
    averageHitCount: totalHits / items.length,
    averageResponseTime: totalResponseTime / items.length,
    popularItems: getPopularItems(10),
    recentActivity: recentItems
  }
}

// 匯出指標數據（用於調試）
export function exportMetrics(): string {
  const metrics = getCacheMetrics()
  const analysis = analyzeCachePerformance()
  
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    metrics,
    analysis
  }, null, 2)
}

// 重置所有指標
export function resetMetrics(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(METRICS_STORAGE_KEY)
  }
}