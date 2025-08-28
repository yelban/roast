import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useCartStore } from '@/store/cartStore'
import { useLanguageStore } from '@/store/languageStore'
import tableData from '@/data/table.json'
import { Users } from 'lucide-react'

interface TableSelectorProps {
  onTableSelected: (tableNumber: string) => void
}

const translations = {
  ja: {
    title: 'テーブル番号を選択',
    subtitle: 'お客様のテーブルを選んでください',
    seats: '席',
    zone: 'エリア'
  },
  'zh-tw': {
    title: '選擇桌號',
    subtitle: '請選擇您的桌號',
    seats: '座位',
    zone: '區域'
  },
  'zh-cn': {
    title: '选择桌号',
    subtitle: '请选择您的桌号',
    seats: '座位',
    zone: '区域'
  },
  en: {
    title: 'Select Table Number',
    subtitle: 'Please select your table number',
    seats: 'seats',
    zone: 'Zone'
  }
}

export default function TableSelector({ onTableSelected }: TableSelectorProps) {
  const { language } = useLanguageStore()
  const { tableNumber: currentTableNumber, setTableNumber } = useCartStore()
  const [selectedTable, setSelectedTable] = useState<string | null>(currentTableNumber)
  
  const t = translations[language] || translations['ja']

  const handleTableSelect = (tableNumber: string) => {
    setSelectedTable(tableNumber)
    setTableNumber(tableNumber)
    onTableSelected(tableNumber)
  }

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'A':
        return 'bg-blue-500 hover:bg-blue-600 text-white'
      case 'B':
        return 'bg-green-500 hover:bg-green-600 text-white'
      case 'C':
        return 'bg-purple-500 hover:bg-purple-600 text-white'
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white'
    }
  }

  const getZoneBorderColor = (zone: string) => {
    switch (zone) {
      case 'A':
        return 'border-blue-400 hover:border-blue-500 text-blue-700 hover:bg-blue-50'
      case 'B':
        return 'border-green-400 hover:border-green-500 text-green-700 hover:bg-green-50'
      case 'C':
        return 'border-purple-400 hover:border-purple-500 text-purple-700 hover:bg-purple-50'
      default:
        return 'border-gray-400 hover:border-gray-500 text-gray-700 hover:bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-[72px] p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl text-center">{t.title}</CardTitle>
            <p className="text-center text-gray-600 mt-2">{t.subtitle}</p>
          </CardHeader>
        </Card>

        <div className="space-y-8">
          {tableData.sections.map((section) => (
            <div key={section.zone}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`px-3 py-1 rounded font-medium ${getZoneColor(section.zone)}`}>
                  {t.zone} {section.zone}
                </div>
                <span className="text-gray-600 font-medium">
                  ({section.tables[0].seats} {t.seats})
                </span>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {section.tables.map((table) => (
                  <Button
                    key={table.number}
                    onClick={() => handleTableSelect(table.number)}
                    variant={selectedTable === table.number ? "default" : "outline"}
                    className={`h-20 text-xl font-bold relative transition-all ${
                      selectedTable === table.number 
                        ? getZoneColor(section.zone)
                        : `bg-white border-2 ${getZoneBorderColor(section.zone)}`
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-2xl ${
                        selectedTable === table.number ? '' : 'font-semibold'
                      }`}>{table.number}</span>
                      <div className={`flex items-center gap-1 text-xs ${
                        selectedTable === table.number ? 'opacity-90' : 'opacity-80'
                      }`}>
                        <Users className="h-3 w-3" />
                        <span>{table.seats}</span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {currentTableNumber && (
          <div className="mt-8 text-center">
            <Card className="inline-block">
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">
                  現在の選択 / 目前選擇 / Current Selection:
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {currentTableNumber}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}