import { create } from 'zustand'
import { CartState, CartItem } from '@/types/cart'

const CART_STORAGE_KEY = 'stamina-en-cart'
const TABLE_STORAGE_KEY = 'stamina-en-table'

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  openedFrom: null,
  tableNumber: null,

  addItem: (item) => {
    set((state) => {
      const existingItem = state.items.find(
        (i) => i.name['ja'] === item.name['ja'] && i.price === item.price
      )

      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.id === existingItem.id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        }
      }

      const newItem: CartItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        addedAt: Date.now(),
      }

      return { items: [...state.items, newItem] }
    })
    
    get().saveToStorage()
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id)
      return
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, quantity } : item
      ),
    }))
    
    get().saveToStorage()
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
    
    get().saveToStorage()
  },

  clearCart: () => {
    set({ items: [] })
    localStorage.removeItem(CART_STORAGE_KEY)
  },

  toggleCart: (from) => {
    set((state) => ({ 
      isOpen: !state.isOpen,
      openedFrom: from || state.openedFrom
    }))
  },

  getTotalPrice: () => {
    const { items } = get()
    return items.reduce((total, item) => total + item.price * item.quantity, 0)
  },

  getTotalWithTax: (taxRate = 0.1) => {
    const total = get().getTotalPrice() // 商品價格已含稅
    const subtotal = total // 小計就是總價（已含稅）
    const tax = Math.floor(total * taxRate / (1 + taxRate)) // 計算內含的稅額
    return { subtotal, tax, total }
  },

  getItemCount: () => {
    const { items } = get()
    return items.reduce((count, item) => count + item.quantity, 0)
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return

    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (storedCart) {
        const { items } = JSON.parse(storedCart)
        set({ items })
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error)
    }
  },

  saveToStorage: () => {
    if (typeof window === 'undefined') return

    try {
      const { items } = get()
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items }))
    } catch (error) {
      console.error('Failed to save cart to storage:', error)
    }
  },

  setTableNumber: (tableNumber) => {
    set({ tableNumber })
    if (typeof window !== 'undefined' && tableNumber) {
      localStorage.setItem(TABLE_STORAGE_KEY, tableNumber)
    }
  },

  loadTableNumber: () => {
    if (typeof window === 'undefined') return

    try {
      const storedTable = localStorage.getItem(TABLE_STORAGE_KEY)
      if (storedTable) {
        set({ tableNumber: storedTable })
      }
    } catch (error) {
      console.error('Failed to load table number from storage:', error)
    }
  },
}))