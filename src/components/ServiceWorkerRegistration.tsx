import { useEffect } from 'react'
import { Workbox } from 'workbox-window'

const SW_VERSION = '1.0.0'
const CHECK_INTERVAL = 24 * 60 * 60 * 1000  // 24小時

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // 在本地開發環境中禁用 PWA
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: PWA disabled')
      return
    }

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      const wb = new Workbox(`/sw.js?v=${SW_VERSION}`)

      // 監聽更新
      wb.addEventListener('installed', event => {
        if (event.isUpdate) {
          if (confirm('新版本已可用。要更新嗎？')) {
            window.location.reload()
          }
        }
      })

      // 初始註冊和首次檢查
      wb.register().then(() => {
        // 請求持久性存儲權限，提高快取持久性
        if ('storage' in navigator && 'persist' in navigator.storage) {
          navigator.storage.persist().then(persistent => {
            if (persistent) {
              console.log('✅ 持久性存儲已啟用')
            } else {
              console.log('⚠️ 持久性存儲未啟用，快取可能被清理')
            }
          })
        }
      }).catch(error => {
        console.error('Service worker registration failed:', error)
      })

      // 每24小時檢查一次
      const intervalId = setInterval(() => {
        wb.update()
      }, CHECK_INTERVAL)

      return () => clearInterval(intervalId)
    }
  }, [])

  return null
} 