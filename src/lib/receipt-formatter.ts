/**
 * 收據格式化工具
 * 熱感應收據機限制：48字元（24個中文字）
 */

/**
 * 計算字串的實際顯示寬度
 * 中文字符算2個寬度，英文/數字算1個寬度
 */
export function getStringWidth(str: string): number {
  let width = 0
  for (const char of str) {
    // 使用 Unicode 範圍判斷是否為全形字符
    if (char.match(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uff00-\uffef]/)) {
      width += 2
    } else {
      width += 1
    }
  }
  return width
}

/**
 * 裁切或填充字串到指定寬度
 * @param str 原始字串
 * @param targetWidth 目標寬度
 * @param align 對齊方式 'left' | 'right'
 * @param ellipsis 是否使用省略號
 */
export function padString(
  str: string, 
  targetWidth: number, 
  align: 'left' | 'right' = 'left',
  ellipsis: boolean = false
): string {
  const currentWidth = getStringWidth(str)
  
  if (currentWidth > targetWidth) {
    // 需要裁切
    let result = ''
    let width = 0
    const chars = Array.from(str)
    const ellipsisWidth = ellipsis ? 3 : 0 // "..." 的寬度
    
    for (const char of chars) {
      const charWidth = getStringWidth(char)
      if (width + charWidth + ellipsisWidth <= targetWidth) {
        result += char
        width += charWidth
      } else {
        break
      }
    }
    
    if (ellipsis && width < currentWidth) {
      result += '... '
    }
    
    return result
  } else if (currentWidth < targetWidth) {
    // 需要填充
    const spaces = ' '.repeat(targetWidth - currentWidth)
    return align === 'left' ? str + spaces : spaces + str
  }
  
  return str
}

/**
 * 格式化金額（加入千分位逗號）
 */
export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US')
}

/**
 * 格式化商品行
 * 總寬度 48 字元分配：
 * - 名稱：22字元
 * - 單價：9字元（右對齊）
 * - 數量：5字元（右對齊）  
 * - 金額：10字元（右對齊）
 * - 空白：2字元（分隔用）
 */
export function formatItemLine(
  name: string,
  price: number,
  quantity: number,
  amount: number
): string {
  const formattedName = padString(name, 22, 'left', true)
  const formattedPrice = padString(formatMoney(price), 9, 'right')
  const formattedQuantity = padString(quantity.toString(), 5, 'right')
  const formattedAmount = padString(formatMoney(amount), 10, 'right')
  
  return `${formattedName}${formattedPrice}${formattedQuantity}${formattedAmount}`
}

/**
 * 格式化標題（置中）
 */
export function formatCenterLine(text: string, totalWidth: number = 48): string {
  const textWidth = getStringWidth(text)
  if (textWidth >= totalWidth) {
    return text
  }
  
  const leftPadding = Math.floor((totalWidth - textWidth) / 2)
  const rightPadding = totalWidth - textWidth - leftPadding
  
  return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding)
}

/**
 * 格式化分隔線
 */
export function formatDivider(char: string = '-', width: number = 48): string {
  return char.repeat(width)
}

/**
 * 格式化右對齊行（用於小計、稅金、總計）
 */
export function formatRightAlignLine(label: string, value: string, totalWidth: number = 46): string {
  const labelWidth = getStringWidth(label)
  const valueWidth = getStringWidth(value)
  const spacesNeeded = totalWidth - labelWidth - valueWidth - 2 // 2 for spacing
  
  if (spacesNeeded < 0) {
    // 如果超出寬度，裁切標籤
    const maxLabelWidth = totalWidth - valueWidth - 2
    const truncatedLabel = padString(label, maxLabelWidth, 'left', true)
    return `${truncatedLabel}  ${value}`
  }
  
  return `${label}${' '.repeat(spacesNeeded + 2)}${value}`
}

/**
 * 生成完整的收據內容
 */
export interface ReceiptItem {
  name: string
  price: number
  quantity: number
}

export interface ReceiptData {
  storeName: string
  storePhone: string
  storeAddress: string
  tableNumber?: string
  items: ReceiptItem[]
  subtotal: number
  tax: number
  total: number
  orderTime: string
}

/**
 * 生成單一收據內容（內部函數）
 */
function generateSingleReceipt(data: ReceiptData, copyLabel?: string, showNameField: boolean = false): string {
  const lines: string[] = []

  // 聯別標記（如果有）
  if (copyLabel) {
    lines.push(`<CB>【${copyLabel}】</CB>`)
  }

  // 店名（置中放大）
  lines.push(`<CB>${data.storeName}</CB>`)

  lines.push(`<C>${data.storeAddress}`)

  lines.push(`電話：${data.storePhone}`)

  lines.push(`事業者登録番号 T9011802022957</C>`)

  // 只在顧客聯（第一聯，無標籤）顯示「領収書」
  if (!copyLabel) {
    lines.push(`<CB>領収書</CB>`)
  }

  // 桌號（如果有）
  if (data.tableNumber) {
    lines.push(`テーブル: ${data.tableNumber}`)
  }

  // lines.push('') // 空行

  // 表頭（手動格式化以確保正確對齊）
  // 品名(4) + 18空白 + 単価(4) + 5空白 + 数量(4) + 1空白 + 金額(4) + 8空白 = 48
  const header = '品名' + ' '.repeat(22) + '単価' + ' '.repeat(4) + '数量' + ' '.repeat(4) + '金額'
  lines.push(header)
  lines.push(formatDivider())

  // 商品明細
  data.items.forEach(item => {
    const amount = item.price * item.quantity
    lines.push(formatItemLine(item.name, item.price, item.quantity, amount))
  })

  lines.push(formatDivider())
  // lines.push('') // 空行

  // 金額彙總（右對齊）
  lines.push(formatRightAlignLine('小計', `￥${formatMoney(data.subtotal)}`))
  lines.push(formatRightAlignLine('內消費税（10%）', `￥${formatMoney(data.tax)}`))
  lines.push(formatRightAlignLine('合計', `￥${formatMoney(data.total)}`))

  lines.push('') // 空行
  lines.push(formatRightAlignLine('受付時間', data.orderTime))

  return lines.join('\n')
}

/**
 * 生成簡化版顧客聯（不含明細）
 */
function generateSimplifiedReceipt(data: ReceiptData): string {
  const lines: string[] = []

  // // 手寫姓名/公司名稱欄位
  // lines.push('<CB>お名前：________________________________</CB>')
  // lines.push('') // 空行

  // 店名（置中放大）
  lines.push(`<CB>${data.storeName}</CB>`)

  lines.push(`<C>${data.storeAddress}`)

  lines.push(`電話：${data.storePhone}`)

  lines.push(`事業者登録番号 T9011802022957</C>`)

  // 桌號（如果有）
  if (data.tableNumber) {
    lines.push(`テーブル: ${data.tableNumber}`)
  }

  lines.push('') // 空行
  lines.push(formatDivider())

  // 只顯示總金額
  lines.push(formatRightAlignLine('合計', `￥${formatMoney(data.total)}`))

  lines.push(formatDivider())
  lines.push('') // 空行
  lines.push(formatRightAlignLine('受付時間', data.orderTime))

  return lines.join('\n')
}

/**
 * 生成三聯收據內容（完整顧客聯 + 店家留存聯 + 簡化顧客聯）
 */
export function generateReceiptContent(data: ReceiptData): string {
  const parts: string[] = []

  // 第一聯：完整顧客聯（含明細，無標籤但有手寫欄位）
  parts.push(generateSingleReceipt(data, undefined, true))

  // 空行
  parts.push('\n')

  // 自動切紙
  parts.push('<CUT>')

  // 空行
  parts.push('\n')

  // 第二聯：店家留存聯（含明細）
  parts.push(generateSingleReceipt(data, '店舗控え'))

  return parts.join('\n')
}