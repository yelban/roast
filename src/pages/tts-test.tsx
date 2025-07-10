import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TTSTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  const testTTS = async (text: string) => {
    setIsLoading(true)
    setLogs([])
    
    try {
      addLog(`🎤 開始測試 TTS: "${text}"`)
      
      const startTime = performance.now()
      const encodedText = encodeURIComponent(text)
      const apiUrl = `/api/tts/${encodedText}/`
      
      addLog(`📡 發送請求到: ${apiUrl}`)
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'audio/mpeg',
        },
      })
      
      const fetchTime = performance.now() - startTime
      addLog(`⏱️ API 回應時間: ${Math.round(fetchTime)}ms`)
      addLog(`📊 回應狀態: ${response.status} ${response.statusText}`)
      addLog(`📦 Content-Type: ${response.headers.get('content-type')}`)
      addLog(`📏 Content-Length: ${response.headers.get('content-length')}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      addLog(`🎵 音訊 Blob 大小: ${blob.size} bytes`)
      
      if (blob.size === 0) {
        throw new Error('接收到空的音訊檔案')
      }
      
      const blobUrl = URL.createObjectURL(blob)
      const audio = new Audio()
      audio.preload = 'auto'
      audio.src = blobUrl
      
      addLog(`🔊 開始載入音訊...`)
      
      return new Promise<void>((resolve, reject) => {
        audio.onloadstart = () => addLog('📥 開始載入音訊')
        audio.oncanplay = () => addLog('✅ 音訊可以播放')
        audio.oncanplaythrough = () => {
          addLog('💯 音訊完全載入')
          audio.play()
            .then(() => {
              addLog('🎵 開始播放')
              setIsPlaying(true)
              resolve()
            })
            .catch((error) => {
              addLog(`❌ 播放失敗: ${error.message}`)
              reject(error)
            })
        }
        
        audio.onplay = () => addLog('▶️ 播放開始')
        audio.onended = () => {
          addLog('🏁 播放結束')
          setIsPlaying(false)
          URL.revokeObjectURL(blobUrl)
        }
        
        audio.onerror = (e) => {
          addLog(`❌ 音訊錯誤: ${e}`)
          setIsPlaying(false)
          URL.revokeObjectURL(blobUrl)
          reject(new Error('音訊載入失敗'))
        }
        
        // 開始載入
        audio.load()
      })
      
    } catch (error) {
      addLog(`❌ 錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }

  const clearCache = async () => {
    try {
      addLog('🧹 清理瀏覽器快取...')
      const cacheNames = await caches.keys()
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName)
      }
      addLog('✅ 快取已清理')
    } catch (error) {
      addLog(`❌ 清理快取失敗: ${error}`)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">TTS 音訊測試</h1>
      
      <div className="space-y-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={() => testTTS('上ロース')}
            disabled={isLoading}
          >
            {isLoading ? '測試中...' : '測試: 上ロース'}
          </Button>
          
          <Button 
            onClick={() => testTTS('中ロース')}
            disabled={isLoading}
            variant="outline"
          >
            測試: 中ロース
          </Button>
          
          <Button 
            onClick={() => testTTS('コムタン')}
            disabled={isLoading}
            variant="outline"
          >
            測試: コムタン
          </Button>
          
          <Button 
            onClick={clearCache}
            variant="destructive"
            size="sm"
          >
            清理快取
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${
            isLoading ? 'bg-yellow-500 animate-pulse' : 
            isPlaying ? 'bg-green-500' : 'bg-gray-300'
          }`}></div>
          <span className="text-sm">
            {isLoading ? '載入中...' : isPlaying ? '播放中' : '待機'}
          </span>
        </div>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">除錯日誌</h2>
        <div className="bg-black text-green-400 p-3 rounded font-mono text-sm h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">點擊測試按鈕開始...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-semibold">使用說明:</h3>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>點擊測試按鈕來測試不同的日文文字</li>
          <li>查看除錯日誌了解詳細的執行過程</li>
          <li>第一次可能需要較長時間（生成音訊）</li>
          <li>後續播放應該很快（從快取載入）</li>
          <li>如有問題，可清理快取重新測試</li>
        </ul>
      </div>
    </div>
  )
}