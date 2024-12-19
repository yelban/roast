const fs = require('fs').promises
const path = require('path')
const subsetFont = require('subset-font')
const menuData = require('../src/data/data.json')

const FONTS = [
  'HonyaJi-Re',
  'MasaFont-Regular',
  'JasonHandwriting2-Medium',
  'JasonHandwriting5p-Medium',
  'KurewaGothicCjkTc-Bold',
  'dingliehakkafont'
]

async function extractTextFromMenu(): Promise<string> {
  // 將菜單數據轉換為字串
  const menuText = JSON.stringify(menuData)
  
  // 使用正則表達式匹配中文、日文、英文、數字和標點符號
  const pattern = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uff00-\uff9fa-zA-Z0-9\s\p{P}]+/gu
  const extractedChars = menuText.match(pattern)?.join('') || ''

  // 加入額外的必要字元
  const additionalChars = 
    '「」，。：；？！＆（）《》『』【】〈〉〔〕、．…─│─' +
    '星期一二三四五六日' +
    '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥' +
    '一月二月三月四月五月六月七月八月九月十月十一月十二月'

  // 合併所有字元並去重
  const uniqueChars = new Set([...extractedChars, ...additionalChars])
  return [...uniqueChars].join('')
}

async function generateSubsets() {
  try {
    const chars = await extractTextFromMenu()
    console.log('提取的字元數量:', chars.length)

    // 確保目標目錄存在
    const subsetsDir = path.join(process.cwd(), 'public', 'fonts', 'subsets')
    await fs.mkdir(subsetsDir, { recursive: true })

    // 為每個字體生成子集
    for (const fontName of FONTS) {
      console.log(`處理字體: ${fontName}`)
      
      // 讀取原始字體
      const fontPath = path.join(process.cwd(), 'public', 'fonts', `${fontName}.ttf`)
      const fontBuffer = await fs.readFile(fontPath)

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