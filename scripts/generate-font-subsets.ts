import { promises as fs } from 'fs'
import path from 'path'
import { createRequire } from 'module'
import menuData from '../src/data/data.json' assert { type: 'json' }

const require = createRequire(import.meta.url)
const subsetFont = require('subset-font')

const FONTS = [
  'dingliehakkafont',
  'MasaFont-Regular',
  'uzura_font',
  'JasonHandwriting2-SemiBold',
  'KurewaGothicCjkTc-Bold',
  'KurewaGothicCjkJp-Bold'
]

async function extractTextFromMenu(fontName: string): Promise<string> {
  // 只有這些字體需要完整的菜單文字
  const fullMenuFonts = ['uzura_font', 'JasonHandwriting2-SemiBold', 'KurewaGothicCjkTc-Bold', 'KurewaGothicCjkJp-Bold']
  
  // 加入額外的必要字元
  const additionalChars = 
    '「」，。：；？！＆（）《》『』【】〈〉〔〕、．…─│─' +
    '星期一二三四五六七八九十日月年' +
    '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥' +
    '燒肉烧肉焼肉內臟類内脏类ホルモン其他其他その他' +
    '季節限定例湯季节限定例汤季節限定スープ飯食饭食ご飯' +
    '湯品汤品スープ醃漬小菜＆沙拉腌渍小菜＆沙拉漬物＆サラダ' +
    '燉煮料理炖煮料理煮物料理甜點甜点デザート伴手禮伴手礼お土産' +
    // 1. 日文平假名
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょっ' +
    // 2. 日文片假名
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポャュョッ' +
    // 3. 半形數字
    '0123456789' +
    // 4. 全形數字
    '０１２３４５６７８９' +
    // 5. 大小寫英文字母
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

  if (fullMenuFonts.includes(fontName)) {
    // 將菜單數據轉換為字串
    const menuText = JSON.stringify(menuData)
    
    // 使用正則表達式匹配中文、日文、英文、數字和標點符號
    const pattern = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uff00-\uff9fa-zA-Z0-9\s\p{P}]+/gu
    const extractedChars = menuText.match(pattern)?.join('') || ''

    // 合併所有字元並去重
    const uniqueChars = new Set([...extractedChars, ...additionalChars])
    return [...uniqueChars].join('')
  }

  // 對於其他字體，返回去重後的必要字元
  const uniqueChars = new Set([...additionalChars])
  return [...uniqueChars].join('')
}

async function generateSubsets() {
  try {
    // 確保目標目錄存在
    const subsetsDir = path.join(process.cwd(), 'public', 'fonts', 'subsets')
    await fs.mkdir(subsetsDir, { recursive: true })

    // 為每個字體生成子集
    for (const fontName of FONTS) {
      console.log(`處理字體: ${fontName}`)
      
      // 讀取原始字體
      const fontPath = path.join(process.cwd(), 'public', 'fonts', `${fontName}.ttf`)
      const fontBuffer = await fs.readFile(fontPath)

      // 根據字體名稱提取所需字元
      const chars = await extractTextFromMenu(fontName)
      
      // 生成子集
      const subsetBuffer = await subsetFont(fontBuffer, chars)

      // 儲存子集字體
      const outputPath = path.join(subsetsDir, `${fontName}.ttf`)
      await fs.writeFile(outputPath, subsetBuffer)
      
      console.log(`${fontName} 子集已生成`)
    }

    console.log('所有字體子集生成完成')
  } catch (error) {
    console.error('生成字體子集時發生錯誤:', error)
    process.exit(1)
  }
}

generateSubsets() 