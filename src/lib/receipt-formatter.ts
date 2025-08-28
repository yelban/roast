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
  storeZone: string
  storePhone: string
  storeAddress: string
  tableNumber?: string
  items: ReceiptItem[]
  subtotal: number
  tax: number
  total: number
  orderTime: string
}

export function generateReceiptContent(data: ReceiptData): string {
  const lines: string[] = []
  
  // 店名（置中放大）
  lines.push(`<CB>${data.storeName}</CB>`)

  lines.push(`<C>${data.storeZone} ${data.storeAddress}`)

  lines.push(`電話：${data.storePhone}</C>`)
  
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