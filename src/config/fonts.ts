import localFont from 'next/font/local'
import { Language } from '@/types/menu'

export const honyaJi = localFont({
  src: '../../public/fonts/subsets/HonyaJi-Re.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-honya-ji'
})

export const masaFont = localFont({
  src: '../../public/fonts/subsets/MasaFont-Regular.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-masa'
})

export const jasonHandwriting2 = localFont({
  src: '../../public/fonts/subsets/JasonHandwriting2-Medium.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-jason2'
})

export const jasonHandwriting5p = localFont({
  src: '../../public/fonts/subsets/JasonHandwriting5p-Medium.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-jason5p'
})

export const kurewaGothic = localFont({
  src: '../../public/fonts/subsets/KurewaGothicCjkTc-Bold.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-kurewa'
})

export const dingliehakka = localFont({
  src: '../../public/fonts/subsets/dingliehakkafont.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-dingliehakka'
})

export const getFontClass = (lang: Language) => {
  switch (lang) {
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

export const getTitleFontClass = (lang: Language) => {
  switch (lang) {
    case 'zh-cn':
      return 'font-dingliehakkafont'
    default:
      return 'font-masa'
  }
}
