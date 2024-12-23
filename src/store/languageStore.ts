import { create } from 'zustand'
import { Language } from '@/types/menu'

// 將語言順序定義移到 store 中
export const languageOrder: Language[] = ['ja', 'zh-tw', 'zh-cn', 'en']

// 新增 getPreferredLanguage 函數
const getPreferredLanguage = (browserLang: string): Language => {
  // 轉換為小寫並移除任何空白
  const lang = browserLang.toLowerCase().trim()
  
  // Firefox 可能回傳 "zh-tw" 或 "zh_tw"
  if (lang.startsWith('zh')) {
    return (lang.includes('tw') || lang.includes('_tw')) ? 'zh-tw' : 'zh-cn'
  }
  
  // Firefox 可能回傳 "ja" 或 "ja-jp"
  if (lang.startsWith('ja')) {
    return 'ja'
  }
  
  // 如果都不符合，使用英文
  return 'en'
}

// 可以加入更詳細的語言檢測
const detectLanguage = (): Language => {
  const browserLang = navigator.language 

  // 也檢查 navigator.languages
  const languages = navigator.languages || [browserLang]
  console.log('languages', languages)
  
  // 遍歷所有可能的語言，直到找到匹配的
  for (const lang of languages) {
    const lowerLang = lang.toLowerCase().trim()
    if (lowerLang.startsWith('zh')) {
      return (lowerLang.includes('tw') || lowerLang.includes('_tw')) ? 'zh-tw' : 'zh-cn'
    }
    if (lowerLang.startsWith('ja')) {
      return 'ja'
    }
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
    set({ language: detectLanguage() })
  },
})) 