import { useEffect, useState, TouchEvent } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Language, MenuData, MenuItem } from '@/types/menu'
import getConfig from 'next/config'
import { useLanguageStore, languageOrder } from '@/store/languageStore'
import { getFontClass, getTitleFontClass } from '@/config/fonts'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Volume2, Minus, Plus } from 'lucide-react'
import { FontWrapper } from '@/components/FontWrapper'
import { generateHash } from '@/lib/utils'
import { recordCacheUsage } from '@/lib/cacheMetrics'
import { StreamingAudioPlayer } from '@/lib/audioStreaming'

// 日文數字映射
const japaneseNumbers: { [key: number]: string } = {
  1: '一つ',
  2: '二つ', 
  3: '三つ',
  4: '四つ',
  5: '五つ',
  6: '六つ',
  7: '七つ',
  8: '八つ',
  9: '九つ'
}

interface SelectedItem extends MenuItem {
  categoryName: {
    [key in Language]: string
  }
}

export default function Menu() {
  const { language, setLanguage, slideDirection, setSlideDirection, nextLanguage, setNextLanguage } = useLanguageStore()
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [isMenuLoading, setIsMenuLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [isTTSLoading, setIsTTSLoading] = useState(false)
  const [audioPlayer, setAudioPlayer] = useState<StreamingAudioPlayer | null>(null)
  const [audioProgress, setAudioProgress] = useState<{ loaded: number; total: number } | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isQuantityTTSLoading, setIsQuantityTTSLoading] = useState(false)
  const [preloadedQuantityAudios, setPreloadedQuantityAudios] = useState<{ [key: number]: string }>({})
  const [isPreloading, setIsPreloading] = useState(false)

  // 音效功能
  const playButtonSound = (type: 'plus' | 'minus' | 'boundary') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // 設定音效參數
      switch (type) {
        case 'plus':
          // + 按鈕：較高頻率的短音
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.1)
          break
        case 'minus':
          // - 按鈕：較低頻率的短音
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(350, audioContext.currentTime + 0.1)
          break
        case 'boundary':
          // 邊界音效：雙音調提示
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime)
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.1)
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2)
          break
      }
      
      // 音量控制
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + (type === 'boundary' ? 0.3 : 0.15))
      
      oscillator.type = 'sine'
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + (type === 'boundary' ? 0.3 : 0.15))
      
      // 清理資源
      oscillator.onended = () => {
        audioContext.close()
      }
    } catch (error) {
      // 如果音效播放失敗，靜默處理
      console.warn('音效播放失敗:', error)
    }
  }

  const loadMenuData = async () => {
    try {
      setIsMenuLoading(true)
      const { publicRuntimeConfig } = getConfig()
      const basePath = publicRuntimeConfig?.root || ''
      
      const protocol = window.location.protocol
      const host = window.location.host
      const apiPath = basePath ? `${protocol}//${host}${basePath}/api/menu` : `${protocol}//${host}/api/menu`
      const response = await fetch(apiPath)
      const data = await response.json()
      setMenuData(data)
    } catch (error) {
      // console.error('載入菜單失敗:', error)
    } finally {
      setIsMenuLoading(false)
    }
  }

  // 預下載數量音檔
  const preloadQuantityAudios = async () => {
    if (isPreloading) return
    
    setIsPreloading(true)
    console.log('🎵 開始預下載數量音檔...')
    
    const preloadedUrls: { [key: number]: string } = {}
    
    try {
      const { publicRuntimeConfig } = getConfig()
      const basePath = publicRuntimeConfig?.root || ''
      const protocol = window.location.protocol
      const host = window.location.host
      
      // 並行下載1-9的數量音檔
      const downloadPromises = Object.entries(japaneseNumbers).map(async ([num, text]) => {
        try {
          const encodedText = encodeURIComponent(text)
          const apiUrl = `${protocol}//${host}${basePath}/api/tts/${encodedText}`
          
          const response = await fetch(apiUrl, {
            headers: { 'Accept': 'audio/mpeg' },
            mode: 'cors' as RequestMode
          })
          
          if (response.ok) {
            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)
            preloadedUrls[parseInt(num)] = blobUrl
            console.log(`🎵 預下載完成: ${text} (${num})`)
          }
        } catch (error) {
          console.warn(`🎵 預下載失敗: ${text} (${num})`, error)
        }
      })
      
      await Promise.all(downloadPromises)
      setPreloadedQuantityAudios(preloadedUrls)
      console.log('🎵 所有數量音檔預下載完成！', preloadedUrls)
      
    } catch (error) {
      console.error('🎵 預下載過程發生錯誤:', error)
    } finally {
      setIsPreloading(false)
    }
  }

  useEffect(() => {
    loadMenuData()
    // 延遲一點開始預下載，避免阻塞主要內容載入
    setTimeout(() => {
      preloadQuantityAudios()
    }, 1000)
    
    // 清理函數：釋放預下載的 blob URLs
    return () => {
      Object.values(preloadedQuantityAudios).forEach(url => {
        if (url) {
          URL.revokeObjectURL(url)
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleItemClick = (item: MenuItem, categoryName: { [key in Language]: string }) => {
    setSelectedItem({ ...item, categoryName })
    setQuantity(1) // 重置數量為1
    setIsDialogOpen(true)
  }

  // 統一的觸控處理函數
  const handleTouchEvent = (
    e: TouchEvent,
    startTouch: number | null,
    onSwipeLeft: () => void,
    onSwipeRight?: () => void
  ) => {
    if (!startTouch) return

    const touchEnd = e.changedTouches[0].clientX
    const diff = startTouch - touchEnd

    if (Math.abs(diff) < 125) return

    if (diff > 0) {
      onSwipeLeft()
    } else if (onSwipeRight) {
      onSwipeRight()
    }
  }

  // 處理主頁面滑動
  const handleMainTouchEnd = (e: TouchEvent) => {
    const currentIndex = languageOrder.indexOf(language)
    const isFirstLanguage = currentIndex === 0
    const isLastLanguage = currentIndex === languageOrder.length - 1

    handleTouchEvent(
      e,
      touchStart,
      () => {
        // 向左滑動（下一個語言）
        if (!isLastLanguage) {
          const nextIndex = currentIndex + 1
          handleLanguageChange(nextIndex)
        }
      },
      () => {
        // 向右滑動（上一個語言）
        if (!isFirstLanguage) {
          const nextIndex = currentIndex - 1
          handleLanguageChange(nextIndex)
        }
      }
    )
    setTouchStart(null)
  }

  // 處理對話框滑動
  const handleDialogTouchEnd = (e: TouchEvent) => {
    handleTouchEvent(
      e,
      touchStart,
      () => setIsDialogOpen(false),  // 向左滑動時關閉
      () => setIsDialogOpen(false)   // 向右滑動時也關閉
    )
    setTouchStart(null)
  }

  const handleLanguageChange = (index: number) => {
    const newLang = languageOrder[index]
    setSlideDirection(index > languageOrder.indexOf(language) ? 'left' : 'right')
    setNextLanguage(newLang)
    
    setTimeout(() => {
      setLanguage(newLang)
      setSlideDirection(null)
      setNextLanguage(null)
    }, 300)
  }

  const formatPrice = (price: number | { normal?: number; half?: number } | string): JSX.Element => {
    if (typeof price === 'number') {
      return (
        <span>
          <span className="text-gray-400 mr-0.5 font-light align-bottom">¥</span>
          {price.toLocaleString()}
        </span>
      )
    }
    if (typeof price === 'string') {
      return (
        <span>
          <span className="text-gray-400 mr-0.5 font-light align-bottom">¥</span>
          {price}
        </span>
      )
    }
    if (price.normal) {
      return (
        <span>
          <span className="text-gray-400 mr-0.5 font-light align-bottom">¥</span>
          {price.normal.toLocaleString()}
          {price.half ? (
            <>
              {' / '}
              <span className="text-gray-400 mr-0.5 font-light align-bottom">¥</span>
              {price.half.toLocaleString()}
            </>
          ) : ''}
        </span>
      )
    }
    return <span>價格未定</span>
  }

  const playTTS = async (text: string) => {
    const startTime = performance.now()
    
    try {
      // 如果正在播放，先停止
      if (isPlaying) {
        setIsPlaying(false)
        if (audioPlayer) {
          audioPlayer.stop()
          setAudioPlayer(null)
        }
        return // 直接返回，不重新播放同一個音訊
      }
      
      setIsTTSLoading(true)
      setAudioProgress(null)
      
      // 清理之前的播放器
      if (audioPlayer) {
        audioPlayer.stop()
        setAudioPlayer(null)
      }
      
      const textHash = generateHash(text)
      
      const { publicRuntimeConfig } = getConfig()
      const basePath = publicRuntimeConfig?.root || ''
      const protocol = window.location.protocol
      const host = window.location.host
      const encodedText = encodeURIComponent(text)
      const apiUrl = `${protocol}//${host}${basePath}/api/tts/${encodedText}`

      const playAudio = async (audioResponse: Response) => {
        // 記錄快取使用指標
        const responseTime = performance.now() - startTime
        recordCacheUsage(textHash, text, responseTime)
        
        // console.log('🎵 開始播放音訊:', text)
        // console.log('🎵 AudioResponse 狀態:', audioResponse.status, audioResponse.statusText)
        
        // 簡化為傳統播放方式，避免流式播放的複雜性
        // console.log('🎵 讀取 audioResponse blob...')
        const blob = await audioResponse.blob()
        // console.log('🎵 音訊 Blob 大小:', blob.size, 'bytes, 類型:', blob.type)
        
        const blobUrl = URL.createObjectURL(blob)
        const audio = new Audio()
        audio.preload = 'auto'
        audio.src = blobUrl
        
        // 設定事件監聽器
        // audio.onloadstart = () => console.log('🎵 音訊開始載入')
        // audio.oncanplay = () => console.log('🎵 音訊可以播放')
        audio.onplay = () => {
          // console.log('🎵 音訊開始播放')
          setIsPlaying(true)
        }
        audio.onended = () => {
          // console.log('🎵 音訊播放結束')
          setIsPlaying(false)
          setAudioProgress(null)
          URL.revokeObjectURL(blobUrl)
        }
        audio.onerror = () => {
          // console.error('🎵 音訊播放錯誤:', e)
          // console.error('🎵 Audio element error details:', {
          //   code: e.target?.error?.code,
          //   message: e.target?.error?.message,
          //   networkState: e.target?.networkState,
          //   readyState: e.target?.readyState,
          //   src: e.target?.src
          // })
          setIsPlaying(false)
          setAudioProgress(null)
          URL.revokeObjectURL(blobUrl)
        }
        
        // 等待音訊載入完成後再播放
        return new Promise((resolve, reject) => {
          audio.oncanplaythrough = async () => {
            try {
              // console.log('🎵 音訊完全載入，開始播放')
              await audio.play()
              // console.log('🎵 播放命令執行成功')
              resolve(audio)
            } catch (playError) {
              // console.error('🎵 播放錯誤:', playError)
              reject(playError)
            }
          }
          
          audio.onerror = () => {
            // console.error('🎵 音訊載入失敗在 Promise 內')
            reject(new Error('音訊載入失敗'))
          }
          
          // 開始載入音訊
          // console.log('🎵 開始載入音訊檔案...')
          audio.load()
        })
      }

      // 先嘗試直接從 R2 獲取（如果有配置 R2 公開 URL）
      const r2PublicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL
      // console.log('🔍 R2 Public URL:', r2PublicUrl)
      // console.log('📝 Current text:', text)
      // console.log('📝 Text hash:', textHash)
      // console.log('🌍 Current NODE_ENV:', process.env.NODE_ENV)
      // console.log('🌍 Current location:', window.location.href)
      if (r2PublicUrl) {
        try {
          const r2AudioUrl = `${r2PublicUrl}/${textHash}.mp3`
          // console.log('🔥 嘗試直接從 R2 獲取:', r2AudioUrl)
          
          const r2Controller = new AbortController()
          const r2TimeoutId = setTimeout(() => r2Controller.abort(), 15000) // 15 秒超時
          
          // 單次嘗試 R2 請求，不重試
          const r2Response = await fetch(r2AudioUrl, {
            method: 'GET',
            mode: 'cors',
            cache: 'default',
            credentials: 'omit',
            signal: r2Controller.signal
          })
          
          clearTimeout(r2TimeoutId)
          
          if (r2Response.ok) {
            // console.log('✅ R2 直接命中! 狀態:', r2Response.status)
            
            // 檢查回應內容
            const contentLength = r2Response.headers.get('content-length')
            // console.log('📦 R2 內容長度:', contentLength)
            
            try {
              // 檢查是否能正確讀取內容
              // console.log('📄 開始讀取 R2 blob...')
              const blob = await r2Response.blob()
              // console.log('📄 實際 Blob 大小:', blob.size, '類型:', blob.type)
              
              if (blob.size === 0) {
                throw new Error('R2 回應內容為空')
              }
              
              // 重新創建 Response 對象給 playAudio 使用
              // console.log('🔧 創建 Response 對象...')
              const audioResponse = new Response(blob, {
                status: r2Response.status,
                statusText: r2Response.statusText,
                headers: r2Response.headers
              })
              
              // console.log('🎵 開始播放 R2 音訊...')
              await playAudio(audioResponse)
              // console.log('🎵 R2 音訊播放成功，結束函數')
              return // 成功播放，結束函數
            } catch (playError) {
              // console.warn('🚨 R2 音訊播放失敗，回退到 API:', playError)
              // console.error('🚨 完整錯誤堆疊:', playError)
              // 繼續執行回退邏輯
            }
          } else {
            // console.log('❌ R2 回應失敗:', r2Response.status, r2Response.statusText)
          }
        } catch (error) {
          console.error('🔄 R2 直接獲取失敗，回退到 API:', error)
          console.error('錯誤類型:', error instanceof Error ? error.name : typeof error)
          console.error('錯誤訊息:', error instanceof Error ? error.message : String(error))
          console.error('完整錯誤對象:', error)
          if (error instanceof Error) {
            console.error('錯誤堆疊:', error.stack)
            if (error.name === 'AbortError') {
              console.error('R2 請求被超時中止 (15秒)')
            } else if (error.name === 'TypeError') {
              console.error('可能是 CORS 或網路連接問題')
            }
          }
        }
      }

      // 回退到 API 方式
      // console.log('🔄 開始 API 回退邏輯')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 35000) // 35 秒超時
      
      try {
        // 配置請求選項
        const fetchOptions = {
          headers: {
            'Accept': 'audio/mpeg'
            // 移除可能觸發預檢的標頭
          },
          cache: 'force-cache' as RequestCache,
          signal: controller.signal,
          redirect: 'follow' as RequestRedirect,
          mode: 'cors' as RequestMode
        }

        const response = await fetch(apiUrl, fetchOptions)

        if (response.status === 304) {
          const cacheResponse = await caches.match(apiUrl)
          if (!cacheResponse) {
            const freshResponse = await fetch(apiUrl, {
              headers: { 'Accept': 'audio/mpeg' },
              signal: controller.signal,
              redirect: 'follow' as RequestRedirect,
              mode: 'cors' as RequestMode
            })
            if (!freshResponse.ok) {
              throw new Error(`TTS request failed: ${freshResponse.status} ${freshResponse.statusText}`)
            }
            
            const cache = await caches.open('tts-cache')
            await cache.put(apiUrl, freshResponse.clone())
            
            return await playAudio(freshResponse)
          }
          return await playAudio(cacheResponse)
        }

        if (!response.ok) {
          throw new Error(`TTS request failed: ${response.status} ${response.statusText}`)
        }
        
        // 只有當響應是來自我們的 API 時才快取
        if (response.url.includes('/api/tts/')) {
          const cache = await caches.open('tts-cache')
          await cache.put(apiUrl, response.clone())
        }
        
        return await playAudio(response)
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      // const { publicRuntimeConfig } = getConfig()
      // const basePath = publicRuntimeConfig?.root || ''
      // const protocol = window.location.protocol
      // const host = window.location.host
      // const encodedText = encodeURIComponent(text)
      // const errorApiUrl = `${protocol}//${host}${basePath}/api/tts/${encodedText}/`
      
      // console.error('TTS error details:', {
      //   error,
      //   text,
      //   apiUrl: errorApiUrl,
      //   userAgent: navigator.userAgent,
      //   timestamp: new Date().toISOString()
      // })
      
      // 檢查是否是網路錯誤
      // if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      //   console.error('Network error - possibly CORS or connectivity issue')
      // }
      
      setIsPlaying(false)
      setAudioProgress(null)
    } finally {
      setIsTTSLoading(false)
    }
  }

  // 播放預下載的數量音檔
  const playPreloadedQuantityAudio = async (quantity: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audioUrl = preloadedQuantityAudios[quantity]
      if (!audioUrl) {
        reject(new Error(`預下載音檔不存在: ${quantity}`))
        return
      }
      
      const audio = new Audio(audioUrl)
      audio.onended = () => resolve()
      audio.onerror = () => reject(new Error(`播放預下載音檔失敗: ${quantity}`))
      audio.play().catch(reject)
    })
  }

  // 分離播放：先播放菜色名稱，然後播放數量
  const playItemWithQuantity = async (itemName: string, quantity: number) => {
    try {
      // 如果正在播放，先停止
      if (isPlaying || isQuantityTTSLoading) {
        setIsPlaying(false)
        setIsQuantityTTSLoading(false)
        if (audioPlayer) {
          audioPlayer.stop()
          setAudioPlayer(null)
        }
        return
      }

      setIsQuantityTTSLoading(true)
      
      // 1. 播放菜色名稱
      console.log('🎵 開始播放菜色名稱:', itemName)
      await playTTS(itemName)
      
      // 2. 縮短等待時間（從2.5秒縮短到1秒）
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 3. 短暫停頓
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 4. 播放數量（優先使用預下載的音檔）
      const quantityText = japaneseNumbers[quantity]
      if (quantityText) {
        console.log('🎵 開始播放數量:', quantityText)
        
        if (preloadedQuantityAudios[quantity]) {
          // 使用預下載的音檔，速度更快
          console.log('🎵 使用預下載音檔:', quantity)
          await playPreloadedQuantityAudio(quantity)
        } else {
          // 回退到TTS API
          console.log('🎵 使用TTS API:', quantityText)
          await playTTS(quantityText)
        }
      }
      
    } catch (error) {
      console.error('連續播放錯誤:', error)
    } finally {
      setIsQuantityTTSLoading(false)
    }
  }

  if (isMenuLoading) {
    return <div className="container mx-auto p-8 text-center">載入中...</div>
  }

  if (!menuData) {
    return <div className="container mx-auto p-8 text-center">沒有菜單資料</div>
  }

  const renderMenuContent = (lang: Language) => (
    <div className={`w-full ${getFontClass(lang)}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {Object.entries(menuData).map(([category, categoryData]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className={`text-2xl ${getTitleFontClass(lang)}`}>
                  {categoryData?.name?.[lang] || category}
                </CardTitle>
              </CardHeader>
              <div className="p-6 pt-0">
                <div className="space-y-2">
                  {categoryData?.items?.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between border-b pb-2 p-0 cursor-pointer hover:bg-gray-50 rounded"
                      onClick={() => handleItemClick(item, categoryData.name)}
                    >
                      <span className="text-2xl">{item?.name?.[lang] || '未知項目'}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xl">
                          {formatPrice(item.price)}
                        </span>
                        <span className="flex items-center text-gray-300">❯</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen">
      <div 
        className="relative overflow-auto"
        style={{ minHeight: 'calc(100vh - 72px)', WebkitOverflowScrolling: 'touch', overflowY: 'auto' }}
        onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
        onTouchEnd={handleMainTouchEnd}
      >
        <div className="relative w-full h-full">
          {nextLanguage && (
            <div className={`absolute inset-0 w-full slide-${slideDirection}-in`}>
              {renderMenuContent(nextLanguage)}
            </div>
          )}
          <div className={`${slideDirection ? `absolute inset-0 w-full slide-${slideDirection}-out` : ''}`}>
            {renderMenuContent(language)}
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent 
          className="dialog-content bg-white rounded-lg max-w-[95%] md:max-w-lg focus:outline-none focus:ring-0"
          onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
          onTouchEnd={handleDialogTouchEnd}
        >
          <FontWrapper>
            <DialogHeader>
              <DialogTitle>
                <div className="bg-gray-100 p-3 rounded-lg mt-8">
                  <div className={`text-center text-sm text-gray-600 mb-2 ${getTitleFontClass('ja')}`}>
                    {selectedItem?.categoryName?.['ja']}
                  </div>
                  <div className="text-3xl text-red-900 font-bold text-center">
                    {selectedItem?.name?.ja?.split(/[()（]/)[0]}
                  </div>
                  <div className="text-lg text-red-900 font-bold text-center">
                    {selectedItem?.name?.ja?.match(/[()（].*$/)?.[0]}
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    {/* 原有的語音播放按鈕 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isTTSLoading || isPlaying || isQuantityTTSLoading}
                      className={`h-8 w-8 pt-2 inline-flex items-center justify-center hover:bg-gray-200 relative
                        focus-visible:ring-0 focus-visible:ring-offset-0
                        ${isTTSLoading ? 'animate-pulse' : ''}
                        ${isPlaying ? 'text-blue-600' : 'text-gray-600'}
                      `}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        if (selectedItem?.name?.['ja']) {
                          playTTS(selectedItem.name['ja'])
                        }
                      }}
                    >
                      {isTTSLoading ? (
                        <div className="h-5 w-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Volume2 className="h-5 w-5 fill-current" />
                          {isPlaying && (
                            <div className="absolute -right-[6px] flex items-center gap-[2px]">
                              <div className="w-[2px] h-[8px] bg-blue-600 animate-sound-wave-1" />
                              <div className="w-[2px] h-[12px] bg-blue-600 animate-sound-wave-2" />
                              <div className="w-[2px] h-[16px] bg-blue-600 animate-sound-wave-3" />
                            </div>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription className="sr-only">商品詳細資訊</DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-2 px-0 pb-2">
                {/* 數量選擇區域 */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-center mb-2">
                    <span className="text-gray-600 font-medium">数量を選択</span>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className={`h-12 w-12 rounded-full border-2 shadow-md transition-all duration-200
                        ${quantity <= 1 
                          ? 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed' 
                          : 'border-gray-400 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-500 hover:shadow-lg active:scale-95'
                        }`}
                      disabled={quantity <= 1}
                      onClick={() => {
                        const newQuantity = Math.max(1, quantity - 1)
                        if (newQuantity === 1 && quantity === 2) {
                          // 從 2 變成 1 (最低值)，播放邊界音效
                          playButtonSound('boundary')
                        } else {
                          // 普通 - 音效
                          playButtonSound('minus')
                        }
                        setQuantity(newQuantity)
                      }}
                    >
                      <Minus className="h-6 w-6 stroke-2" />
                    </Button>
                    
                    <div className="bg-white border-2 border-gray-300 rounded-lg px-6 py-3 min-w-[4rem] text-center shadow-md">
                      <span className="text-2xl font-bold text-gray-800">{quantity}</span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      className={`h-12 w-12 rounded-full border-2 shadow-md transition-all duration-200
                        ${quantity >= 9 
                          ? 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed' 
                          : 'border-gray-400 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-500 hover:shadow-lg active:scale-95'
                        }`}
                      disabled={quantity >= 9}
                      onClick={() => {
                        const newQuantity = Math.min(9, quantity + 1)
                        if (newQuantity === 9 && quantity === 8) {
                          // 從 8 變成 9 (最高值)，播放邊界音效
                          playButtonSound('boundary')
                        } else {
                          // 普通 + 音效
                          playButtonSound('plus')
                        }
                        setQuantity(newQuantity)
                      }}
                    >
                      <Plus className="h-6 w-6 stroke-2" />
                    </Button>
                  </div>
                  
                  {/* 連續語音播放按鈕 */}
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="default"
                      className={`px-6 py-3 text-base bg-red-900 hover:bg-red-800 text-white rounded-lg
                        focus-visible:ring-0 focus-visible:ring-offset-0
                        ${isQuantityTTSLoading ? 'animate-pulse' : ''}
                        disabled:opacity-50
                      `}
                      disabled={isTTSLoading || isPlaying || isQuantityTTSLoading}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        if (selectedItem?.name?.['ja']) {
                          playItemWithQuantity(selectedItem.name['ja'], quantity)
                        }
                      }}
                    >
                      {isQuantityTTSLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>播放中...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-5 w-5" />
                          <span>播放 {japaneseNumbers[quantity]}</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* 價格顯示 */}
                <div className="py-2">
                  <div className="flex justify-center items-center gap-4">
                    <div className="font-semibold text-gray-600">価格</div>
                    <div className="text-2xl text-gray-900">{formatPrice(selectedItem.price)}</div>
                  </div>
                </div>
                
                {/* 下載進度條 */}
                {audioProgress && audioProgress.total > 0 && (
                  <div className="flex justify-center">
                    <div className="w-32 flex flex-col items-center gap-1">
                      <Progress 
                        value={(audioProgress.loaded / audioProgress.total) * 100} 
                        className="h-2 w-full"
                      />
                      <span className="text-xs text-gray-500">
                        {Math.round((audioProgress.loaded / audioProgress.total) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <div className="font-semibold text-gray-600 mb-2">その他の言語</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-xs text-gray-500 mb-1">台湾語</span>
                      <div className="text-gray-900 text-lg">{selectedItem.name['zh-tw']}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-xs text-gray-500 mb-1">中国語</span>
                      <div className="text-gray-900 text-lg">{selectedItem.name['zh-cn']}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                      <span className="block text-xs text-gray-500 mb-1">English</span>
                      <div className="text-gray-900 text-lg">{selectedItem.name.en}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </FontWrapper>
        </DialogContent>
      </Dialog>
    </div>
  )
} 