import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCartStore } from '@/store/cartStore'
import { useLanguageStore } from '@/store/languageStore'
import tableData from '@/data/table.json'
import { Users, X } from 'lucide-react'

interface TableSelectorDialogProps {
  isOpen: boolean
  onClose: () => void
  onTableSelected?: (tableNumber: string) => void
}

const translations = {
  ja: {
    title: 'テーブル番号を変更',
    subtitle: '新しいテーブル番号を選択してください',
    seats: '席',
    zone: 'エリア',
    cancel: 'キャンセル'
  },
  'zh-tw': {
    title: '變更桌號',
    subtitle: '請選擇新的桌號',
    seats: '座位',
    zone: '區域',
    cancel: '取消'
  },
  'zh-cn': {
    title: '变更桌号',
    subtitle: '请选择新的桌号',
    seats: '座位',
    zone: '区域',
    cancel: '取消'
  },
  en: {
    title: 'Change Table Number',
    subtitle: 'Please select a new table number',
    seats: 'seats',
    zone: 'Zone',
    cancel: 'Cancel'
  }
}

export default function TableSelectorDialog({ isOpen, onClose, onTableSelected }: TableSelectorDialogProps) {
  const { language } = useLanguageStore()
  const { tableNumber: currentTableNumber, setTableNumber } = useCartStore()
  const [selectedTable, setSelectedTable] = useState<string | null>(currentTableNumber)
  
  const t = translations[language] || translations['ja']

  useEffect(() => {
    if (isOpen) {
      setSelectedTable(currentTableNumber)
    }
  }, [isOpen, currentTableNumber])

  const handleTableSelect = (tableNumber: string) => {
    setSelectedTable(tableNumber)
    setTableNumber(tableNumber)
    onTableSelected?.(tableNumber)
    onClose()
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white [&>button]:hidden">
        <DialogHeader className="relative">
          <DialogTitle className="text-3xl font-bold text-gray-900 pr-12">{t.title}</DialogTitle>
          <p className="text-lg text-gray-700 mt-2 pr-12">{t.subtitle}</p>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="absolute right-0 top-0 h-10 w-10 rounded-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-100 bg-white shadow-sm"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {tableData.sections.map((section) => (
            <div key={section.zone}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`px-3 py-1 rounded font-medium ${getZoneColor(section.zone)}`}>
                  {t.zone} {section.zone}
                </div>
                <span className="text-gray-600 font-medium">
                  ({section.tables[0].seats} {t.seats})
                </span>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {section.tables.map((table) => (
                  <Button
                    key={table.number}
                    onClick={() => handleTableSelect(table.number)}
                    variant={selectedTable === table.number ? "default" : "outline"}
                    className={`h-16 text-lg font-bold relative transition-all ${
                      selectedTable === table.number 
                        ? getZoneColor(section.zone)
                        : `bg-white border-2 ${getZoneBorderColor(section.zone)}`
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xl ${
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

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-6 text-gray-800 font-medium"
          >
            {t.cancel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}