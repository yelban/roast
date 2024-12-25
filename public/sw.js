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

  // TTS 快取
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/tts'),
    new workbox.strategies.CacheFirst({
      cacheName: 'api-tts',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60
        })
      ]
    })
  );
}
