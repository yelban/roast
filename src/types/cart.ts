import { Language } from './menu'

export interface CartItem {
  id: string
  name: {
    [key in Language]: string
  }
  price: number
  quantity: number
  addedAt: number
  cp?: string
}

export interface CartState {
  items: CartItem[]
  isOpen: boolean
  openedFrom: 'menu' | 'dialog' | null
  tableNumber: string | null
  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clearCart: () => void
  toggleCart: (from?: 'menu' | 'dialog') => void
  getTotalPrice: () => number
  getTotalWithTax: (taxRate?: number) => { subtotal: number; tax: number; total: number }
  getItemCount: () => number
  loadFromStorage: () => void
  saveToStorage: () => void
  setTableNumber: (tableNumber: string | null) => void
  loadTableNumber: () => void
}