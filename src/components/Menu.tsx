import { useState, useEffect } from 'react'
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
import { useLanguageStore } from '@/store/languageStore'

interface SelectedItem extends MenuItem {
  categoryName: {
    [key in Language]: string
  }
}

export default function Menu() {
  const { language } = useLanguageStore()
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const loadMenuData = async () => {
    try {
      setIsLoading(true);
      // 使用 getConfig 獲取運行時配置
      const { publicRuntimeConfig } = getConfig()
      const basePath = publicRuntimeConfig.root || ''

      console.log('basePath', `${basePath}/api/menu`)
      const response = await fetch(`${basePath}/api/menu`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('API 回應狀態:', response.status);
      console.log('API 回應 headers:', Object.fromEntries(response.headers));

      const contentType = response.headers.get('content-type');
      console.log('回應的 content-type:', contentType);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('錯誤回應內容:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      setMenuData(data);
      setError(null);
    } catch (err) {
      console.error('載入菜單時發生錯誤:', err);
      setError(err instanceof Error ? err.message : '載入菜單失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenuData()
  }, [])

  const handleItemClick = (item: MenuItem, categoryName: { [key in Language]: string }) => {
    setSelectedItem({
      ...item,
      categoryName
    })
    setIsDialogOpen(true)
  }

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-4">載入中...</div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-4 text-red-500">錯誤: {error}</div>
      </div>
    )
  }

  // 確保 menuData 在且是物件
  if (!menuData || typeof menuData !== 'object' || Object.keys(menuData).length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-4">沒有菜單資料</div>
      </div>
    )
  }

  const formatPrice = (price: number | { normal?: number; half?: number } | string): string => {
    if (typeof price === 'number') return `¥${price.toLocaleString()}`
    if (typeof price === 'string') return `¥${price}`
    if (price.normal) {
      return `¥${price.normal.toLocaleString()}${price.half ? ` / ¥${price.half.toLocaleString()}` : ''}`
    }
    return '價格未定'
  }

  const getFontTitle = () => {
    switch (language) {
      case 'zh-cn':
        return 'font-dingliehakkafont'
      default:
        return 'font-masa'
    }
  }

  const getFontClass = () => {
    switch (language) {
      case 'ja':
        return 'font-honyaji'
      case 'zh-tw':
        return 'font-kurewa'
      case 'zh-cn':
        return 'font-jason2'
      default:
        return 'font-jason5p'
    }
  }

  return (
    <div className={getFontClass()}>
      <div className="container mx-auto px-4 py-8 subpixel-antialiased">
        <div className="grid gap-6">
          {menuData && Object.entries(menuData).map(([category, categoryData]) => (
            <Card key={category} className="shadow-lg overflow-hidden">
              <CardHeader>
                <CardTitle className={`text-2xl ${getFontTitle()}`}>
                  {categoryData?.name?.[language as Language] || category}
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
                      <span className="text-xl">{item?.name?.[language as Language] || '未知項目'}</span>
                      <span className="font-semibold">
                        {item?.price ? formatPrice(item.price) : '價格未定'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="!bg-white rounded-lg w-full max-w-[95%] mx-auto md:max-w-lg p-0 [&>button>svg]:text-gray-500 [&>button]:hover:bg-gray-300 [&>button]:p-1 [&>button]:rounded-full [&>button]:top-2 [&>button]:right-2 antialiased">
          <DialogHeader className="bg-white rounded-t-lg p-6 py-10 pb-0">
            <DialogTitle className="text-xl">
              <div className="bg-gray-100 p-4 rounded-lg relative subpixel-antialiased">
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
            <DialogDescription className="sr-only">
              商品詳細資訊
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 bg-white px-6 pb-6 subpixel-antialiased">
              <div className="p-4 py-0 rounded-lg">
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