import { generateReceiptContent } from '@/lib/receipt-formatter'
import { useState } from 'react'

export default function TestReceipt() {
  const [receipt, setReceipt] = useState('')
  
  const testData = {
    storeName: 'スタミナ苑',
    storePhone: '03-3897-0416',
    storeAddress: '東京都足立区鹿浜3-13-4',
    tableNumber: '5',
    items: [
      { name: '上ロース', price: 3100, quantity: 1 },
      { name: '上ミノ', price: 1700, quantity: 2 },
      { name: 'わかめクッパ（半分）', price: 650, quantity: 1 },
      { name: '特選和牛サーロインステーキ', price: 8500, quantity: 1 },
      { name: '韓国風チヂミ', price: 980, quantity: 3 },
    ],
    subtotal: 17610,
    tax: 1600,
    total: 17610,
    orderTime: '2024-01-20 18:30:45'
  }
  
  const generateReceipt = () => {
    const content = generateReceiptContent(testData)
    setReceipt(content)
  }
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">收據格式測試</h1>
      
      <button
        onClick={generateReceipt}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        生成收據
      </button>
      
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-2">格式化後的收據內容：</h2>
          <pre className="bg-gray-100 p-4 rounded font-mono text-xs whitespace-pre overflow-x-auto text-gray-800">
{receipt || '點擊按鈕生成收據'}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">模擬收據機顯示（等寬字體）：</h2>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-xs whitespace-pre overflow-x-auto">
{receipt.replace(/<CB>|<\/CB>|<C>|<\/C>|<BR>|<RIGHT>|<\/RIGHT>/g, '') || '點擊按鈕生成收據'}
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">格式說明：</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>總寬度：48字元（24個中文字）</li>
          <li>名稱欄位：22字元（超過會裁切並加...）</li>
          <li>單價欄位：9字元（右對齊）</li>
          <li>數量欄位：5字元（右對齊）</li>
          <li>金額欄位：10字元（右對齊）</li>
          <li>欄位間空白：2字元</li>
        </ul>
      </div>
    </div>
  )
}