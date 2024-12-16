import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Language, MenuData, MenuItem } from '@/types/menu'

interface MenuProps {
  language: Language
}

interface SelectedItem extends MenuItem {
  categoryName: {
    [key in Language]: string
  }
}

export default function Menu({ language }: MenuProps) {
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/menu')
        
        if (!response.ok) {
          throw new Error('Failed to fetch menu data')
        }

        const data = await response.json()
        
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid menu data received')
        }

        setMenuData(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching menu data:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMenuData()
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

  // 確保 menuData 存在且是物件
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

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {menuData && Object.entries(menuData).map(([category, categoryData]) => (
            <Card key={category} className="shadow-lg overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl">
                  {categoryData?.name?.[language] || category}
                </CardTitle>
              </CardHeader>
              <div className="p-6">
                <div className="space-y-4">
                  {categoryData?.items?.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between border-b pb-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      onClick={() => handleItemClick(item, categoryData.name)}
                    >
                      <span>{item?.name?.[language] || '未知項目'}</span>
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
        <DialogContent className="!bg-white rounded-lg w-full max-w-[95%] mx-auto md:max-w-lg">
          <DialogHeader className="bg-white rounded-t-lg">
            <DialogTitle className="text-xl mb-4 text-gray-900">
              {selectedItem?.categoryName?.['ja']}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 bg-white p-4 rounded-b-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-semibold text-gray-600">商品名</div>
                  <div className="text-lg text-red-900 font-bold">{selectedItem.name.ja}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-semibold text-gray-600">価格</div>
                  <div className="text-lg text-gray-900">{formatPrice(selectedItem.price)}</div>
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
    </>
  )
} 