import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function QRCodeGenerator() {
  const [tables, setTables] = useState<string[]>(['A01', 'A02', 'A03', 'A04', 'A05', 'B01', 'B02'])
  const [newTable, setNewTable] = useState('')
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({})
  const router = useRouter()

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : ''

  useEffect(() => {
    generateAllQRCodes()
  }, [tables])

  const generateQRCode = async (tableNumber: string): Promise<string> => {
    try {
      const url = `${baseUrl}/?table=${tableNumber}`
      // 使用 QR Server API 生成 QR Code
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
      return qrCodeUrl
    } catch (err) {
      console.error('QR Code generation error:', err)
      return ''
    }
  }

  const generateAllQRCodes = async () => {
    const codes: { [key: string]: string } = {}
    for (const table of tables) {
      codes[table] = await generateQRCode(table)
    }
    setQrCodes(codes)
  }

  const addTable = () => {
    if (newTable && !tables.includes(newTable)) {
      setTables([...tables, newTable])
      setNewTable('')
    }
  }

  const removeTable = (table: string) => {
    setTables(tables.filter(t => t !== table))
  }

  const downloadQRCode = (tableNumber: string) => {
    const link = document.createElement('a')
    link.download = `table-${tableNumber}-qrcode.png`
    link.href = qrCodes[tableNumber]
    link.click()
  }

  const printAllQRCodes = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stamina-en - Table QR Codes</title>
        <style>
          body { 
            margin: 0; 
            padding: 10mm;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 5mm;
          }
          .qr-container {
            page-break-inside: avoid;
            display: inline-block;
            width: 50mm;
            text-align: center;
            border: 2px solid #EEE;
            padding: 5mm;
            margin: 5mm;
          }
          .qr-code { 
            width: 50mm; 
            height: 50mm; 
            display: block;
            margin: 0 auto;
          }
          .table-number { 
            font-size: 24pt; 
            font-weight: bold; 
            margin-top: 5mm;
            font-family: Arial, sans-serif;
          }
          // @media print {
          //   body { 
          //     margin: 0; 
          //     padding: 20mm;
          //   }
          //   .qr-container {
          //     page-break-after: always;
          //   }
          //   .qr-container:last-child {
          //     page-break-after: auto;
          //   }
          // }
        </style>
      </head>
      <body>
        ${tables.map(table => `
          <div class="qr-container">
            <img src="${qrCodes[table]}" class="qr-code" />
            <div class="table-number">${table}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `
    
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Table QR Code Generator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter table number (e.g. C01)"
                value={newTable}
                onChange={(e) => setNewTable(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTable()}
              />
              <Button onClick={addTable}>Add Table</Button>
              <Button onClick={printAllQRCodes} variant="outline">Print All</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => (
            <Card key={table} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Table: {table}</h3>
                  {qrCodes[table] && (
                    <>
                      <img 
                        src={qrCodes[table]} 
                        alt={`Table ${table} QR Code`}
                        className="w-full max-w-[200px] mx-auto mb-4"
                      />
                      <div className="text-sm text-gray-600 mb-4 break-all">
                        {baseUrl}/?table={table}
                      </div>
                    </>
                  )}
                  <div className="flex gap-2 justify-center">
                    <Button 
                      size="sm" 
                      onClick={() => downloadQRCode(table)}
                    >
                      Download
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => removeTable(table)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}