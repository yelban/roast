import "@/styles/globals.css";
import type { AppProps } from "next/app";
import React, { useEffect } from 'react'
import { FontService } from '@/services/fontLoader'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const preloadFonts = async () => {
      const fonts = [
        'HonyaJi-Re',
        'MasaFont-Regular',
        'JasonHandwriting2-Medium',
        'JasonHandwriting5p-Medium',
        'KurewaGothicCjkTc-Bold',
        'dingliehakkafont'
      ]

      for (const fontFamily of fonts) {
        try {
          const fontService = new FontService(fontFamily)
          await fontService.preloadCommonCharacters()
        } catch (error) {
          // 靜默失敗，繼續載入下一個字體
          console.warn(`字體 ${fontFamily} 預載入失敗，將使用備用字體`)
        }
      }
    }
    preloadFonts()
  }, [])
  return <Component {...pageProps} />;
}
