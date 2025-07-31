import { useCartStore } from '@/store/cartStore'
import { useLanguageStore } from '@/store/languageStore'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Trash2, Minus, Plus, X } from 'lucide-react'
import { FontWrapper } from '@/components/FontWrapper'
import { t } from '@/config/translations'
import { useState } from 'react'
import { toast } from 'sonner'

export default function CartDrawer() {
  const { isOpen, toggleCart, items, updateQuantity, removeItem, clearCart, getTotalWithTax, openedFrom, tableNumber } = useCartStore()
  const { language } = useLanguageStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { subtotal, tax, total } = getTotalWithTax()
  
  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`
  }
  
  const handleClose = () => {
    toggleCart()
    // 如果是從菜品彈窗開啟的，不需要做特別處理
    // 因為菜品彈窗會保持開啟狀態
  }
  
  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:w-[400px] overflow-y-auto bg-white dark:bg-gray-900">
        <FontWrapper>
          <SheetHeader className="border-b dark:border-gray-700 pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <span>{t('cart', language)}</span>
                {tableNumber && (
                  <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                    {language === 'ja' && `テーブル: ${tableNumber}`}
                    {language === 'zh-tw' && `${tableNumber}桌`}
                    {language === 'zh-cn' && `${tableNumber}桌`}
                    {language === 'en' && `Table: ${tableNumber}`}
                  </span>
                )}
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </Button>
            </div>
          </SheetHeader>
          
          <div className="mt-6 flex-1">
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {t('cartEmpty', language)}
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg text-gray-900 dark:text-white">{item.name[language]}</h4>
                        <p className="text-gray-600 dark:text-gray-300">{formatPrice(item.price)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                          <Minus className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        </Button>
                        <span className="w-12 text-center font-medium text-gray-900 dark:text-white text-lg">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Plus className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        </Button>
                      </div>
                      <div className="font-medium text-xl text-gray-900 dark:text-white">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {items.length > 0 && (
            <SheetFooter className="mt-6 border-t dark:border-gray-700 pt-6">
              <div className="w-full space-y-3">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>{t('subtotal', language)}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>{t('tax', language)}</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t dark:border-gray-700 pt-3 text-gray-900 dark:text-white">
                  <span>{t('total', language)}</span>
                  <span>{formatPrice(total)}</span>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={clearCart}
                    className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300"
                  >
                    {t('clearCart', language)}
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50"
                    onClick={async () => {
                      setIsSubmitting(true)
                      try {
                        const response = await fetch('/api/print-order', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            items,
                            subtotal,
                            tax,
                            total,
                            tableNumber,
                            language
                          }),
                        })
                        
                        const result = await response.json()
                        
                        if (result.success) {
                          toast.success(t('orderSuccess', language))
                          clearCart()
                          toggleCart()
                        } else {
                          toast.error(t('orderFailed', language))
                          console.error('Order submission failed:', result)
                        }
                      } catch (error) {
                        toast.error(t('orderFailed', language))
                        console.error('Order submission error:', error)
                      } finally {
                        setIsSubmitting(false)
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('sendingOrder', language) : t('checkout', language)}
                  </Button>
                </div>
              </div>
            </SheetFooter>
          )}
        </FontWrapper>
      </SheetContent>
    </Sheet>
  )
}