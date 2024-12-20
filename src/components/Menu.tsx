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

interface SelectedItem extends MenuItem {
  categoryName: {
    [key in Language]: string
  }
}

export default function Menu() {
  const { language, setLanguage, slideDirection, setSlideDirection, nextLanguage, setNextLanguage } = useLanguageStore()
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  const loadMenuData = async () => {
    try {
      setIsLoading(true)
      const { publicRuntimeConfig } = getConfig()
      const basePath = publicRuntimeConfig.root || ''
      
      const response = await fetch(`${basePath}/api/menu`)
      const data = await response.json()
      setMenuData(data)
    } finally {
      setIsLoading(false)
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

  if (isLoading) {
    return <div className="container mx-auto p-8 text-center">載入中...</div>
  }

  if (!menuData) {
    return <div className="container mx-auto p-8 text-center">沒有菜單資料</div>
  }

  const renderMenuContent = (lang: Language, className: string = '') => (
    <div className={`${className} w-full absolute inset-0 ${getFontClass(lang)}`}>
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
                <div className="space-y-4">
                  {categoryData?.items?.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between border-b pb-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      onClick={() => handleItemClick(item, categoryData.name)}
                    >
                      <span className="text-xl">{item?.name?.[lang] || '未知項目'}</span>
                      <span className="font-semibold">
                        {formatPrice(item.price)}
                      </span>
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
        className="relative"
        onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
        onTouchEnd={handleMainTouchEnd}
      >
        {nextLanguage && renderMenuContent(nextLanguage, `slide-${slideDirection}-in`)}
        {renderMenuContent(language, slideDirection ? `slide-${slideDirection}-out` : '')}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent 
          className="dialog-content bg-white rounded-lg max-w-[95%] md:max-w-lg"
          onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
          onTouchEnd={handleDialogTouchEnd}
        >
          <DialogHeader>
            <DialogTitle>
              <div className="bg-gray-100 p-4 rounded-lg relative">
                <div className="absolute top-2 left-4 text-base text-gray-500 font-masa">
                  {selectedItem?.categoryName?.['ja']}
                </div>
                <div className="text-4xl text-red-900 font-bold mt-5 text-center">
                  {selectedItem?.name?.ja?.split(/[()（]/)[0]}
                </div>
                <div className="text-xl text-red-900 font-bold text-center">
                  {selectedItem?.name?.ja?.match(/[()（].*$/)?.[0]}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">商品詳細資訊</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 px-6 pb-6">
              <div className="py-0">
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
                    <div className="text-gray-900">{selectedItem.name['zh-tw']}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="block text-sm text-gray-500 mb-1">中国語</span>
                    <div className="text-gray-900">{selectedItem.name['zh-cn']}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                    <span className="block text-sm text-gray-500 mb-1">English</span>
                    <div className="text-gray-900">{selectedItem.name.en}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 