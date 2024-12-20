import { create } from 'zustand'
import { Language } from '@/types/menu'

// 將語言順序定義移到 store 中
export const languageOrder: Language[] = ['ja', 'zh-tw', 'zh-cn', 'en']

// 新增 getPreferredLanguage 函數
const getPreferredLanguage = (browserLang: string): Language => {
  if (browserLang.startsWith('zh')) {
    return browserLang.includes('tw') ? 'zh-tw' : 'zh-cn'
  }
  if (browserLang.startsWith('ja')) {
    return 'ja'
  }
  return 'en'
}

interface LanguageState {
  language: Language
  slideDirection: 'left' | 'right' | null
  nextLanguage: Language | null
  setLanguage: (lang: Language) => void
  setSlideDirection: (direction: 'left' | 'right' | null) => void
  setNextLanguage: (lang: Language | null) => void
  initializeLanguage: () => void  // 新增初始化函數
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'ja',
  slideDirection: null,
  nextLanguage: null,
  setLanguage: (lang) => set({ language: lang }),
  setSlideDirection: (direction) => set({ slideDirection: direction }),
  setNextLanguage: (lang) => set({ nextLanguage: lang }),
  initializeLanguage: () => {
    const browserLang = navigator.language.toLowerCase()
    set({ language: getPreferredLanguage(browserLang) })
  },
})) 