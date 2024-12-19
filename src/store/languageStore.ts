import { create } from 'zustand'
import { Language } from '@/types/menu'

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

type SetState = (state: Partial<LanguageState>) => void

export const useLanguageStore = create<LanguageState>((set: SetState) => ({
  language: 'en',
  setLanguage: (language: Language) => set({ language }),
})) 