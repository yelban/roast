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
import { Volume2 } from 'lucide-react'
import { FontWrapper } from '@/components/FontWrapper'
import { generateHash } from '@/lib/utils'

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
      console.error('載入菜單失敗:', error)
    } finally {
      setIsMenuLoading(false)
    }
  }

  useEffect(() => {
    loadMenuData()
  }, [])

  const handleItemClick = (item: MenuItem, categoryName: { [key in Language]: string }) => {
    setSelectedItem({ ...item, categoryName })
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

    if (Math.abs(diff) < 50) return

    if (diff > 0) {
      onSwipeLeft()
    } else if (onSwipeRight) {
      onSwipeRight()
    }
  }

  // 處理主頁面滑動
  const handleMainTouchEnd = (e: TouchEvent) => {
    handleTouchEvent(
      e,
      touchStart,
      () => {
        const currentIndex = languageOrder.indexOf(language)
        const nextIndex = (currentIndex + 1) % languageOrder.length
        handleLanguageChange(nextIndex)
      },
      () => {
        const currentIndex = languageOrder.indexOf(language)
        const nextIndex = (currentIndex - 1 + languageOrder.length) % languageOrder.length
        handleLanguageChange(nextIndex)
      }
    )
    setTouchStart(null)
  }

  // 處理對話框滑動
  const handleDialogTouchEnd = (e: TouchEvent) => {
    handleTouchEvent(
      e,
      touchStart,
      () => setIsDialogOpen(false)
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

  const formatPrice = (price: number | { normal?: number; half?: number } | string): string => {
    if (typeof price === 'number') return `¥${price.toLocaleString()}`
    if (typeof price === 'string') return `¥${price}`
    if (price.normal) {
      return `¥${price.normal.toLocaleString()}${price.half ? ` / ¥${price.half.toLocaleString()}` : ''}`
    }
    return '價格未定'
  }

  const playTTS = async (text: string) => {
    try {
      setIsTTSLoading(true)
      const { publicRuntimeConfig } = getConfig()
      const basePath = publicRuntimeConfig.root || ''
      
      const protocol = window.location.protocol
      const host = window.location.host
      const apiUrl = `${protocol}//${host}${basePath}/api/tts/?text=${encodeURIComponent(text)}`
      const textHash = generateHash(text)

      // 先嘗試使用帶有 If-None-Match 的請求
      let response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000',
          'If-None-Match': `"${textHash}"`,
        }
      })

      // 如果收到 304 但找不到快取，重新發送請求獲取完整內容
      if (response.status === 304) {
        const cacheResponse = await caches.match(apiUrl)
        if (!cacheResponse) {
          console.log('Cache miss, fetching full content')
          response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'audio/mpeg',
              'Cache-Control': 'public, max-age=31536000',
            }
          })
        } else {
          response = cacheResponse
        }
      }

      if (!response.ok) {
        throw new Error('TTS request failed')
      }

      // 儲存到快取
      const cache = await caches.open('tts-cache')
      await cache.put(apiUrl, response.clone())

      // 播放音訊
      const audioData = await response.blob()
      const blobUrl = URL.createObjectURL(audioData)

      const audio = new Audio()
      audio.src = blobUrl
      
      setIsPlaying(true)
      
      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(blobUrl)
      }
      
      await audio.play()
    } finally {
      setIsTTSLoading(false)
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
                      <span className="text-xl">{item?.name?.[lang] || '未知項目'}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
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
          className="dialog-content bg-white rounded-lg max-w-[95%] md:max-w-lg"
          onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
          onTouchEnd={handleDialogTouchEnd}
        >
          <FontWrapper>
            <DialogHeader>
              <DialogTitle>
                <div className="bg-gray-100 p-4 rounded-lg relative">
                  <div className={`absolute top-2 left-4 text-base text-gray-500 ${getTitleFontClass('ja')} flex items-center gap-2`}>
                    {selectedItem?.categoryName?.['ja']}
                  </div>
                  <div className="text-4xl text-red-900 font-bold mt-5 text-center">
                    {selectedItem?.name?.ja?.split(/[()（]/)[0]}
                  </div>
                  <div className="text-xl text-red-900 font-bold text-center">
                    {selectedItem?.name?.ja?.match(/[()（].*$/)?.[0]}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isTTSLoading || isPlaying}
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
                      <div className="h-5 w-5 animate-spin" />
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
              </DialogTitle>
              <DialogDescription className="sr-only">商品詳細資訊</DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4 px-0 pb-6">
                <div className="py-2">
                  <div className="flex justify-end items-center gap-4">
                    <div className="font-semibold text-gray-600">価格</div>
                    <div className="text-2xl text-gray-900">{formatPrice(selectedItem.price)}</div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="font-semibold text-gray-600 mb-4">その他の言語</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="block text-sm text-gray-500 mb-1">台湾語</span>
                      <div className="text-gray-900 text-xl">{selectedItem.name['zh-tw']}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="block text-sm text-gray-500 mb-1">中国語</span>
                      <div className="text-gray-900 text-xl">{selectedItem.name['zh-cn']}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                      <span className="block text-sm text-gray-500 mb-1">English</span>
                      <div className="text-gray-900 text-xl">{selectedItem.name.en}</div>
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