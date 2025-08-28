import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { Language } from '@/types/menu'
import { generateReceiptContent } from '@/lib/receipt-formatter'

interface CartItem {
  id: string
  name: {
    [key in Language]: string
  }
  price: number
  quantity: number
}

interface PrintOrderRequest {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  tableNumber?: string
  language: Language
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { items, subtotal, tax, total, tableNumber, language } = req.body as PrintOrderRequest

    // 環境變數
    const USER = process.env.FEIE_USER
    const UKEY = process.env.FEIE_UKEY
    const SN = process.env.FEIE_SN

    if (!USER || !UKEY || !SN) {
      console.error('Missing printer configuration')
      return res.status(500).json({ error: 'Printer configuration missing' })
    }

    // 構造打印內容
    const orderTime = new Date().toLocaleString('ja-JP', { 
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // 店名固定使用日文
    const storeName = 'スタミナ苑'

    const storeZone = '足立本店'
    
    const storePhone = '03-3897-0416'

    const storeAddress = '東京都足立区鹿浜3-13-4'
    
    // 準備收據資料（菜名固定使用日文）
    const receiptItems = items.map(item => ({
      name: item.name['ja'] || item.name[language],
      price: item.price,
      quantity: item.quantity
    }))

    // 使用格式化工具生成收據內容
    const content = generateReceiptContent({
      storeName,
      storeZone,
      storePhone,
      storeAddress,
      tableNumber,
      items: receiptItems,
      subtotal,
      tax,
      total,
      orderTime
    })

    // 產生時間戳和簽名
    const stime = Math.floor(Date.now() / 1000)
    const stringToSign = `${USER}${UKEY}${stime}`
    const sig = crypto.createHash('sha1').update(stringToSign).digest('hex')

    // 調用打印機 API
    const apiUrl = 'https://api.jp.feieyun.com/Api/Open/'
    const params = new URLSearchParams({
      user: USER,
      stime: stime.toString(),
      sig: sig,
      apiname: 'Open_printMsg',
      sn: SN,
      content: content
    })

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    })

    const result = await response.json()

    if (result.ret === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Order printed successfully',
        data: result.data 
      })
    } else {
      console.error('Print API error:', result)
      return res.status(400).json({ 
        success: false, 
        message: result.msg || 'Failed to print order',
        error: result 
      })
    }

  } catch (error) {
    console.error('Print order error:', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}