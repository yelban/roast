export type Language = 'zh-tw' | 'zh-cn' | 'en' | 'ja'

export interface MenuItem {
  name: {
    [key in Language]: string
  }
  price: number | { normal?: number; half?: number } | string
}

export interface MenuCategory {
  name: {
    [key in Language]: string
  }
  items: MenuItem[]
}

export interface MenuData {
  [key: string]: MenuCategory
} 