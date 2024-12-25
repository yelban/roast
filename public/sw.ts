declare let self: ServiceWorkerGlobalScope & typeof globalThis;

import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// 預快取重要資源
precacheAndRoute(self.__WB_MANIFEST)

// 字體 CSS 快取
registerRoute(
  ({ url }) => url.pathname.startsWith('/fonts/css/'),
  new CacheFirst({
    cacheName: 'font-css',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60
      })
    ]
  })
)

// 字體切片檔案快取
registerRoute(
  ({ url }) => url.pathname.startsWith('/fonts/subsets/'),
  new CacheFirst({
    cacheName: 'font-subsets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,  // 增加數量以容納所有字體切片
        maxAgeSeconds: 365 * 24 * 60 * 60
      })
    ]
  })
)

// API 路由快取
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/menu'),
  new StaleWhileRevalidate({
    cacheName: 'api-menu',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 24 * 60 * 60
      })
    ]
  })
)

// TTS 快取
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/tts'),
  new CacheFirst({
    cacheName: 'api-tts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60
      })
    ]
  })
)
