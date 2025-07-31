import { Language } from '@/types/menu'

export const translations: {
  [key: string]: {
    [key in Language]: string
  }
} = {
  // 購物車相關
  cart: {
    'zh-tw': '購物車',
    'zh-cn': '购物车',
    'en': 'Cart',
    'ja': 'カート'
  },
  cartEmpty: {
    'zh-tw': '購物車是空的',
    'zh-cn': '购物车是空的',
    'en': 'Your cart is empty',
    'ja': 'カートは空です'
  },
  addToCart: {
    'zh-tw': '加入購物車',
    'zh-cn': '加入购物车',
    'en': 'Add to Cart',
    'ja': 'カートに追加'
  },
  clearCart: {
    'zh-tw': '清空購物車',
    'zh-cn': '清空购物车',
    'en': 'Clear Cart',
    'ja': 'カートをクリア'
  },
  checkout: {
    'zh-tw': '送出訂單',
    'zh-cn': '提交订单',
    'en': 'Submit Order',
    'ja': '注文を送信'
  },
  subtotal: {
    'zh-tw': '小計',
    'zh-cn': '小计',
    'en': 'Subtotal',
    'ja': '小計'
  },
  tax: {
    'zh-tw': '消費税（10%）',
    'zh-cn': '消费税（10%）',
    'en': 'Tax (10%)',
    'ja': '消費税（10%）'
  },
  total: {
    'zh-tw': '合計（税込）',
    'zh-cn': '合计（含税）',
    'en': 'Total (Tax incl.)',
    'ja': '合計（税込）'
  },
  addedToCart: {
    'zh-tw': '已加入購物車',
    'zh-cn': '已加入购物车',
    'en': 'Added to cart',
    'ja': 'カートに追加しました'
  },
  checkoutNotAvailable: {
    'zh-tw': '結帳功能尚未實作',
    'zh-cn': '结账功能尚未实现',
    'en': 'Checkout not available yet',
    'ja': 'チェックアウト機能はまだ利用できません'
  },
  // 數量相關
  quantity: {
    'zh-tw': '數量',
    'zh-cn': '数量',
    'en': 'Quantity',
    'ja': '数量'
  },
  selectQuantity: {
    'zh-tw': '數量を選択',
    'zh-cn': '选择数量',
    'en': 'Select Quantity',
    'ja': '数量を選択'
  },
  // 訂單相關
  orderSuccess: {
    'zh-tw': '訂單已成功送出！',
    'zh-cn': '订单已成功提交！',
    'en': 'Order submitted successfully!',
    'ja': '注文が正常に送信されました！'
  },
  orderFailed: {
    'zh-tw': '訂單送出失敗，請稍後再試',
    'zh-cn': '订单提交失败，请稍后重试',
    'en': 'Failed to submit order, please try again',
    'ja': '注文の送信に失敗しました。もう一度お試しください'
  },
  sendingOrder: {
    'zh-tw': '正在送出訂單...',
    'zh-cn': '正在提交订单...',
    'en': 'Submitting order...',
    'ja': '注文を送信中...'
  }
}

// 輔助函數
export const t = (key: string, language: Language): string => {
  return translations[key]?.[language] || translations[key]?.['en'] || key
}