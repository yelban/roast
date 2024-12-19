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

    // 修改為使用 /tmp 目錄
    const tmpDir = '/tmp'
    const subsetsDir = path.join(tmpDir, 'fonts', 'subsets')
    const cssDir = path.join(tmpDir, 'fonts', 'css')

    // 確保目錄存在
    await fs.mkdir(path.join(tmpDir, 'fonts'), { recursive: true })
    await fs.mkdir(subsetsDir, { recursive: true })
    await fs.mkdir(cssDir, { recursive: true })

    // 讀取原始字體檔案
    const fontPath = path.join(process.cwd(), 'public', 'fonts', `${fontFamily}.ttf`)
    const fontBuffer = await fs.readFile(fontPath)

    // 生成子集
    const subsetBuffer = await subsetFont(fontBuffer, chars)

    // 使用記憶體中的 Buffer 直接回傳
    const base64Font = subsetBuffer.toString('base64')
    
    // 生成內嵌的 CSS
    const cssContent = `@font-face {
      font-family: '${fontFamily}';
      src: url(data:font/truetype;charset=utf-8;base64,${base64Font}) format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }`

    // 直接回傳 CSS 內容
    return res.status(200).json({
      css: cssContent,
      fallback: false
    })
  } catch (error) {
    console.warn('Font subset warning:', error)
    return res.status(200).json({
      error: error instanceof Error ? error.message : '字體子集生成失敗',
      fallback: true,
    })
  }
}
