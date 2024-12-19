// services/fontLoader.ts
import getConfig from 'next/config'

export class FontService {
  private loadedCharacters = new Set<string>()
  private loading = new Map<string, Promise<void>>()
  private fontFamily: string
  private fontLoaded: boolean = false
  private static preloadedFonts = new Set<string>()

  // 修改常用字元的定義
  private static COMMON_CHARS: string = ''
  private static commonCharsPromise: Promise<string> | null = null

  constructor(fontFamily: string) {
    this.fontFamily = fontFamily
  }

  // 新增獲取常用字元的方法
  private static async getCommonChars(): Promise<string> {
    if (!this.commonCharsPromise) {
      this.commonCharsPromise = (async () => {
        try {
          // 使用 ES 模組語法
          const { publicRuntimeConfig } = getConfig()
          const basePath = publicRuntimeConfig.root || ''
          
          const response = await fetch(`${basePath}/api/menu`);
          if (!response.ok) {
            console.error('無法載入選單數據');
          }
          const data = await response.json();

          // 直接將整個 JSON 物件轉為字串
          const allText = JSON.stringify(data)

          // 使用正則表達式匹配中文、日文、英文、數字和標點符號
          const pattern = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uff00-\uff9fa-zA-Z0-9\s\p{P}]+/gu
          const extractedChars = allText.match(pattern)?.join('') || ''

          console.log('提取的字元長度：', extractedChars.length)

          const specificChars =
            '「」，。：；？！＆（）《》『』【】〈〉〔〕、．…─│─' +
            '星期一二三四五六日' +
            '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥' +
            '一月二月三月四月五月六月七月八月九月十月十一月十二月'
          console.log('specificChars', specificChars)

          // 將所有字元和指定字元轉換為不重複的字元集合
          const uniqueChars = new Set([...extractedChars, ...specificChars])
          console.log('不重複字元數量：', uniqueChars.size)

          return [...uniqueChars].join('')
        } catch (error) {
          console.error('獲取常用字元失敗:', error)
          return ''
        }
      })()
    }
    return this.commonCharsPromise
  }

  async ensureCharacters(text: string): Promise<void> {
    // 如果字體已載入，直接返回
    // console.log('ensureCharacters', text)
    // if (this.fontLoaded) return

    // 過濾出尚未載入的字符
    const newChars = [...new Set([...text])].filter(
      (char) => !this.loadedCharacters.has(char)
    )
    // console.log('newChars', newChars)

    if (newChars.length === 0) return

    // 將新字符分組（例如每 100 個字符一組）
    const charGroups = this.groupCharacters(newChars, 250)
    console.log('charGroups', charGroups)

    // 依序載入每組字符
    for (const group of charGroups) {
      const key = `${this.fontFamily}-${group.join('')}`
      // console.log('key', key)
      if (!this.loading.has(key)) {
        this.loading.set(key, this.loadFontSubset(group))
      }
      await this.loading.get(key)
      group.forEach((char) => this.loadedCharacters.add(char))
    }
  }

  private groupCharacters(chars: string[], size: number): string[][] {
    const groups: string[][] = []
    for (let i = 0; i < chars.length; i += size) {
      groups.push(chars.slice(i, i + size))
    }
    return groups
  }

  private async loadFontSubset(chars: string[]): Promise<void> {
    try {
      const { publicRuntimeConfig } = getConfig()
      const basePath = publicRuntimeConfig.root || ''

      const response = await fetch(`${basePath}/api/subset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chars: chars.join(''),
          fontFamily: this.fontFamily,
        }),
      })

      const data = await response.json()

      if (data.fallback) {
        console.warn('使用備用字體:', data.error || '未知原因')
        return
      }

      // 直接注入 CSS 內容
      await this.injectCSS(data.css)

      const fontFaceSet = await document.fonts.load(`1em "${this.fontFamily}"`)
      this.fontLoaded = true
    } catch (error) {
      console.error('字體子集載入失敗 :', error)
      throw error
    }
  }

  private async injectCSS(cssContent: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 創建 style 元素
        const style = document.createElement('style')
        style.textContent = cssContent
        document.head.appendChild(style)
        resolve()
      } catch (error) {
        reject(new Error('Failed to inject font CSS'))
      }
    })
  }

  // 檢查字符是否已載入
  isCharacterLoaded(char: string): boolean {
    return this.loadedCharacters.has(char)
  }

  // 獲取已載入的字符數量
  getLoadedCharacterCount(): number {
    return this.loadedCharacters.size
  }

  // 新增預載入方法
  // async preloadCommonCharacters(): Promise<void> {
  //   try {
  //     console.log('開始預載入常用字元...')
  //     await this.ensureCharacters(FontService.COMMON_CHARS)
  //     console.log('常用字元預載入完成')
  //   } catch (error) {
  //     console.error('預載入常用字元失敗:', error)
  //   }
  // }
  public isPreloaded(): boolean {
    return FontService.preloadedFonts.has(this.fontFamily)
  }

  public async preloadCommonCharacters(): Promise<void> {
    console.log('preloadCommonCharacters')
    try {
      const commonChars = await FontService.getCommonChars()
      if (commonChars) {
        await this.ensureCharacters(commonChars)
        FontService.preloadedFonts.add(this.fontFamily)
      }
    } catch (error) {
      console.warn('預載入常用字元失敗:', error)
      throw error
    }
  }
}
