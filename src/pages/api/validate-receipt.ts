import type { NextApiRequest, NextApiResponse } from 'next'
import { getStringWidth, generateReceiptContent } from '@/lib/receipt-formatter'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const testData = {
    storeName: 'スタミナ苑',
    storePhone: '03-3897-0416',
    storeAddress: '東京都足立区鹿浜3-13-4',
    tableNumber: '5',
    items: [
      { name: '品名', price: 0, quantity: 0 },
      { name: '上ロース', price: 3100, quantity: 1 },
      { name: '特選和牛サーロインステーキ', price: 12500, quantity: 2 },
    ],
    subtotal: 28100,
    tax: 2554,
    total: 28100,
    orderTime: '2024-01-20 18:30:45'
  }
  
  const content = generateReceiptContent(testData)
  const lines = content.split('\n')
  
  const validation = lines.map((line, index) => {
    // 移除標籤
    const cleanLine = line.replace(/<CB>|<\/CB>|<C>|<\/C>|<BR>|<RIGHT>|<\/RIGHT>/g, '')
    const width = getStringWidth(cleanLine)
    
    return {
      lineNumber: index + 1,
      content: line,
      cleanContent: cleanLine,
      width,
      isValid: width <= 48,
      overflow: width > 48 ? width - 48 : 0
    }
  })
  
  const invalidLines = validation.filter(v => !v.isValid)
  
  res.status(200).json({
    totalLines: validation.length,
    invalidLines: invalidLines.length,
    validation: validation.filter(v => v.cleanContent.trim() !== ''), // 排除空行
    summary: {
      allValid: invalidLines.length === 0,
      maxWidth: Math.max(...validation.map(v => v.width)),
      invalidLineNumbers: invalidLines.map(v => v.lineNumber)
    }
  })
}