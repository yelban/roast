import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 在客戶端執行的快取清除腳本
  const clearCacheScript = `
    // 清除 Service Worker 快取
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister()
        })
      })
      
      // 清除快取存儲
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            return caches.delete(cacheName)
          })
        )
      }).then(() => {
        console.log('所有快取已清除')
        window.location.reload()
      })
    }
    
    // 清除 localStorage 和 sessionStorage
    localStorage.clear()
    sessionStorage.clear()
    
    // 清除 IndexedDB
    if ('indexedDB' in window) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        })
      })
    }
  `

  res.status(200).json({ 
    message: 'Cache clear script generated',
    script: clearCacheScript,
    instructions: [
      '1. 複製返回的 script 內容',
      '2. 在瀏覽器 Console 中貼上並執行',
      '3. 頁面將自動重新載入'
    ]
  })
}