// src/pages/api/fonts/subset.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import * as fs from 'fs/promises'
import * as path from 'path'
import subsetFont from 'subset-font'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 添加 CORS 標頭
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // 如果是 OPTIONS 請求，直接返回
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    const { chars, fontFamily } = req.body

    if (!chars || !fontFamily) {
      return res.status(400).json({
        error: 'Missing required fields',
        received: { chars, fontFamily },
      })
    }

    // 支援多種字體格式
    const fontExtensions = ['.ttf', '.otf']
    let fontPath = ''

    // 處理檔案名稱，移除不安全的字元
    const safeFontFamily = fontFamily.replace(/[^a-zA-Z0-9\s-_]/g, '')

    // 使用 path.normalize 確保路徑格式正確
    const fontsDir = path.normalize(path.join(process.cwd(), 'public', 'fonts'))

    // 尋找可用的字體檔案
    for (const ext of fontExtensions) {
      const testPath = path.normalize(
        path.join(fontsDir, `${safeFontFamily}${ext}`)
      )

      // 安全檢查：確保路徑在���許的目錄內
      if (!testPath.startsWith(fontsDir)) {
        throw new Error('無效的字體路徑')
      }

      try {
        await fs.access(testPath)
        fontPath = testPath
        break
      } catch {
        // 靜默失敗，繼續嘗試下一個副檔名
        continue
      }
    }

    if (!fontPath) {
      return res.status(200).json({
        error: `找不到字體檔案：${safeFontFamily}`,
        fallback: true,
        cssUrl: null,
      })
    }

    // 建立必要的目錄
    const subsetsDir = path.join(process.cwd(), 'public', 'fonts', 'subsets')
    const cssDir = path.join(process.cwd(), 'public', 'fonts', 'css')
    await fs.mkdir(subsetsDir, { recursive: true })
    await fs.mkdir(cssDir, { recursive: true })

    // 讀取字體檔案
    const fontBuffer = await fs.readFile(fontPath)

    // 直接使用 subsetFont 函數
    const subsetBuffer = await subsetFont(fontBuffer, chars)

    // 使用更短的雜湊值作為檔案名稱
    const hash = Buffer.from(chars).toString('hex').slice(0, 8)
    const extension = fontPath.endsWith('.otf') ? '.otf' : '.ttf'
    const subsetFileName = `${fontFamily}-${hash}${extension}`
    const cssFileName = `${fontFamily}-${hash}.css`

    // 寫入子集字體檔案
    const subsetPath = path.join(subsetsDir, subsetFileName)
    await fs.writeFile(subsetPath, subsetBuffer)

    // 生成並寫入 CSS 檔案
    const cssContent = `@font-face {
      font-family: '${fontFamily}';
      src: url('/fonts/subsets/${subsetFileName}') format('${
        extension === '.otf' ? 'opentype' : 'truetype'
      }');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
      font-display: block;
    }`

    const cssPath = path.join(cssDir, cssFileName)
    await fs.writeFile(cssPath, cssContent)

    // 返回成功響應
    return res.status(200).json({
      cssUrl: `/fonts/css/${cssFileName}`,
      fontUrl: `/fonts/subsets/${subsetFileName}`,
    })
  } catch (error) {
    // 簡化錯誤訊息
    console.warn(
      'Font subset warning:',
      error instanceof Error ? error.message : '未知錯誤'
    )
    return res.status(200).json({
      error: error instanceof Error ? error.message : '字體子集生成失敗',
      fallback: true,
    })
  }
}
