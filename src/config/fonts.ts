import localFont from 'next/font/local'
import { Language } from '@/types/menu'

export const dingliehakka = localFont({
  src: '../../public/fonts/subsets/dingliehakkafont.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-dingliehakka'
})

export const masaFont = localFont({
  src: '../../public/fonts/subsets/MasaFont-Regular.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-masa'
})

export const uzuraFont = localFont({
  src: '../../public/fonts/subsets/uzura_font.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-uzura'
})

export const jasonHandwriting2 = localFont({
  src: '../../public/fonts/subsets/JasonHandwriting2-SemiBold.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-jason2'
})

export const kurewaGothicTc = localFont({
  src: '../../public/fonts/subsets/KurewaGothicCjkTc-Bold.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-kurewa-tc'
})

export const kurewaGothicJp = localFont({
  src: '../../public/fonts/subsets/KurewaGothicCjkJp-Bold.ttf',
  display: 'swap',
  preload: true,
  variable: '--font-kurewa-jp'
})

export const getFontClass = (lang: Language) => {
  switch (lang) {
    case 'ja':
      return 'font-kurewa-jp'
    case 'zh-tw':
      return 'font-kurewa-tc'
    case 'zh-cn':
      return 'font-jason2'
    default:
      return 'font-kurewa-jp'
  }
}

export const getTitleFontClass = (lang: Language) => {
  switch (lang) {
    case 'ja':
      return 'font-kurewa-jp'
    case 'zh-tw':
      return 'font-kurewa-tc'
    case 'zh-cn':
      return 'font-jason2'
    default:
      return 'font-kurewa-jp'
  }
}
