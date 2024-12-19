// hooks/useFont.ts
import { useState, useEffect } from 'react'
import { FontService } from '../services/fontLoader'

export function useFont(
  text: string,
  fontFamily: string,
  options = { preload: false }
) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  )
  // const [isLoading, setIsLoading] = useState(false)
  // const [isReady, setIsReady] = useState(false)
  // const [error, setError] = useState<Error | null>(null)

  // 預載入效果
  // useEffect(() => {
  //   if (options.preload) {
  //     const fontService = new FontService(fontFamily)
  //     fontService.preloadCommonCharacters()
  //   }
  // }, [fontFamily, options.preload])

  // 原有的載入效果
  useEffect(() => {
    if (!text) return

    const fontService = new FontService(fontFamily)
    let mounted = true

    async function loadFont() {
      // if (!text) return
      try {
        setStatus('loading')
        // setIsLoading(true)

        // 如果需要預載入，先確保常用字已載入
        if (!fontService.isPreloaded() && options.preload) {
          console.log('預載入常用字元')
          await fontService.preloadCommonCharacters()
        }

        // 無論是否預載入，都要確保當前文字的所有字元都已載入
        // console.log('載入特定文字:', text)
        await fontService.ensureCharacters(text)

        if (mounted) {
          setStatus('ready')
        }
      } catch (error) {
        if (mounted) {
          console.warn(`字體 ${fontFamily} 載入失敗，使用備用字體`, error)
          setStatus('error')
        }
      }
    }

    loadFont()

    return () => {
      mounted = false
    }
  }, [text, fontFamily, options.preload])

  return status
}
