importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// 確保 workbox 已載入
if (workbox) {
  console.log('Workbox is loaded');

  // @ts-expect-error - self.__WB_MANIFEST 由 Workbox 在運行時注入
  const manifestEntries = self.__WB_MANIFEST || [];
  workbox.precaching.precacheAndRoute(manifestEntries);

  // 字體 CSS 快取
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/fonts/css/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'font-css',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60
        })
      ]
    })
  );

  // 字體切片檔案快取
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/fonts/subsets/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'font-subsets',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,  // 增加數量以容納所有字體切片
          maxAgeSeconds: 365 * 24 * 60 * 60
        })
      ]
    })
  );

  // API 路由快取
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/menu'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'api-menu',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 1,
          maxAgeSeconds: 24 * 60 * 60
        })
      ]
    })
  );

  // TTS 快取 - 增強版
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/tts'),
    new workbox.strategies.CacheFirst({
      cacheName: 'api-tts-v2',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 500, // 增加快取項目
          maxAgeSeconds: 90 * 24 * 60 * 60, // 增加到 90 天
          purgeOnQuotaError: true // 空間不足時清理
        }),
        {
          // 智能快取策略
          cacheKeyWillBeUsed: async ({ request }) => {
            // 使用 URL 中的文字作為快取鍵，確保移除所有尾隨斜線
            const url = new URL(request.url)
            const pathPart = url.pathname.split('/api/tts/')[1] || ''
            const text = decodeURIComponent(pathPart.replace(/\/+$/, '')) // 移除所有尾隨斜線
            return `tts-${text.substring(0, 50)}` // 限制長度
          },
          cacheWillUpdate: async ({ response }) => {
            // 只快取成功的音訊響應
            return response.status === 200 && response.headers.get('content-type')?.includes('audio')
          },
          requestWillFetch: async ({ request }) => {
            // 添加自定義標頭
            const modifiedRequest = new Request(request, {
              headers: {
                ...Object.fromEntries(request.headers.entries()),
                'X-Cache-Source': 'service-worker'
              }
            })
            return modifiedRequest
          }
        }
      ]
    })
  );

  // TTS 預熱 API 快取
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/tts/prewarm'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-tts-prewarm',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 // 1 小時
        })
      ]
    })
  );

  // 增強快取管理
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_MANAGEMENT') {
      const { action, cacheName, keys } = event.data
      
      switch (action) {
        case 'CLEAR_CACHE':
          caches.delete(cacheName || 'api-tts-v2')
            .then(() => {
              event.ports[0]?.postMessage({ success: true })
            })
            .catch((error) => {
              event.ports[0]?.postMessage({ success: false, error: error.message })
            })
          break
          
        case 'PRELOAD_AUDIO':
          if (keys && Array.isArray(keys)) {
            Promise.allSettled(
              keys.map(url => 
                fetch(url).then(response => {
                  if (response.ok) {
                    return caches.open('api-tts-v2').then(cache => cache.put(url, response))
                  }
                })
              )
            ).then(results => {
              const successful = results.filter(r => r.status === 'fulfilled').length
              event.ports[0]?.postMessage({ 
                success: true, 
                preloaded: successful, 
                total: keys.length 
              })
            })
          }
          break
          
        case 'GET_CACHE_INFO':
          caches.open('api-tts-v2').then(cache => {
            return cache.keys()
          }).then(keys => {
            event.ports[0]?.postMessage({ 
              success: true, 
              cacheSize: keys.length,
              cacheKeys: keys.map(req => req.url)
            })
          })
          break
      }
    }
  })
  
  // 背景同步支援
  self.addEventListener('sync', (event) => {
    if (event.tag === 'tts-background-sync') {
      event.waitUntil(
        // 嘗試同步失敗的 TTS 請求
        syncFailedRequests()
      )
    }
  })
  
  // 同步失敗請求
  async function syncFailedRequests() {
    try {
      const cache = await caches.open('failed-tts-requests')
      const requests = await cache.keys()
      
      for (const request of requests) {
        try {
          const response = await fetch(request)
          if (response.ok) {
            await cache.delete(request)
            const ttsCache = await caches.open('api-tts-v2')
            await ttsCache.put(request, response)
          }
        } catch (error) {
          console.log('Sync failed for request:', request.url, error)
        }
      }
    } catch (error) {
      console.error('Background sync failed:', error)
    }
  }

}
