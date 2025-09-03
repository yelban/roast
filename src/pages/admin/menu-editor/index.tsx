import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronRight, 
  AlertCircle,
  Clock,
  RotateCcw,
  LogOut,
  Loader2
} from 'lucide-react'
import { MenuData, MenuCategory, MenuItem, Language } from '@/types/menu'

export default function MenuEditor() {
  const router = useRouter()
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [backups, setBackups] = useState<Array<{ id: string; date: string; size: string }>>([])
  const [showBackups, setShowBackups] = useState(false)
  const [editingItem, setEditingItem] = useState<{ categoryKey: string, itemIndex: number, item: MenuItem } | null>(null)
  const [newCategory, setNewCategory] = useState<{ name: string } | null>(null)
  const [addingItem, setAddingItem] = useState<{ categoryKey: string, item: MenuItem } | null>(null)

  const fetchMenuData = useCallback(async (bypassCache = false) => {
    setIsLoading(true)
    setError('')
    
    try {
      const token = localStorage.getItem('adminToken')
      const url = bypassCache 
        ? `/api/admin/menu/current?t=${Date.now()}` 
        : '/api/admin/menu/current'
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(bypassCache ? { 'Cache-Control': 'no-cache' } : {})
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/menu-editor/login')
          return
        }
        throw new Error('Failed to fetch menu data')
      }
      
      const data = await response.json()
      setMenuData(data.data)
      
      // 設定第一個類別為預設選擇
      if (data.data && Object.keys(data.data).length > 0) {
        setSelectedCategory(Object.keys(data.data)[0])
      }
    } catch (error) {
      setError('無法載入菜單資料')
      console.error('Fetch error:', error)
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 檢查登入狀態
  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    const expiry = localStorage.getItem('adminTokenExpiry')
    
    if (!token || !expiry || Date.now() > parseInt(expiry)) {
      router.push('/admin/menu-editor/login')
      return
    }
    
    fetchMenuData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMenuData])

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/menu/backups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBackups(data.backups)
      }
    } catch (error) {
      console.error('Fetch backups error:', error)
    }
  }

  const handleSave = async () => {
    if (!menuData) return
    
    setIsSaving(true)
    setError('')
    setSuccessMessage('')
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/menu/save', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: menuData })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save menu data')
      }
      
      const result = await response.json()
      setSuccessMessage('メニューが正常に保存されました！')
      
      // 保存成功後重新載入菜單資料以確保資料同步（繞過快取）
      try {
        await fetchMenuData(true)
      } catch (error) {
        console.error('Failed to reload menu data after save:', error)
      }
      
      // 3秒後清除成功訊息
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setError('保存に失敗しました。しばらくしてから再試行してください。')
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm('このバックアップを復元しますか？現在のデータが上書きされます。')) return
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/menu/restore/${backupId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to restore backup')
      }
      
      setSuccessMessage('バックアップが正常に復元されました')
      setShowBackups(false)
      await fetchMenuData(true)
    } catch (error) {
      setError('復元に失敗しました')
      console.error('Restore error:', error)
    }
  }

  const handleAddCategory = () => {
    if (!newCategory || !newCategory.name.trim()) return
    
    if (!menuData) return
    
    // 檢查日文名稱是否重複
    const existingNames = Object.values(menuData).map(category => category.name?.['ja'] || '')
    if (existingNames.includes(newCategory.name.trim())) {
      setError('この分類名は既に存在します')
      return
    }
    
    // 自動生成 key (使用時間戳記)
    const categoryKey = `category_${Date.now()}`
    
    const newData = { ...menuData }
    newData[categoryKey] = {
      name: {
        'ja': newCategory.name.trim(),
        'zh-tw': '',
        'zh-cn': '', 
        'en': ''
      },
      items: []
    }
    
    setMenuData(newData)
    setSelectedCategory(categoryKey)
    setNewCategory(null)
  }

  const handleDeleteCategory = (key: string) => {
    if (!confirm(`カテゴリ "${menuData?.[key]?.name?.['ja']}" を削除しますか？`)) return
    
    if (!menuData) return
    
    const newData = { ...menuData }
    delete newData[key]
    
    setMenuData(newData)
    
    // 選擇另一個類別
    const keys = Object.keys(newData)
    if (keys.length > 0) {
      setSelectedCategory(keys[0])
    } else {
      setSelectedCategory('')
    }
  }

  const handleAddItem = (categoryKey: string) => {
    if (!menuData) return
    
    const newItem: MenuItem = {
      name: {
        'ja': '',
        'zh-tw': '',
        'zh-cn': '',
        'en': ''
      },
      price: 0,
      note: {
        'zh-tw': '',
        'zh-cn': '',
        'en': '',
        'ja': ''
      },
      cp: ''
    }
    
    setAddingItem({ categoryKey, item: newItem })
  }

  const handleSaveNewItem = () => {
    if (!addingItem || !menuData) return
    
    const newData = { ...menuData }
    newData[addingItem.categoryKey].items.push(addingItem.item)
    
    setMenuData(newData)
    setAddingItem(null)
    
    // 短暫延遲後滾動到新項目
    setTimeout(() => {
      const itemsList = document.querySelector('.space-y-2')
      if (itemsList && itemsList.lastElementChild) {
        itemsList.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }, 100)
  }

  const handleUpdateItem = (categoryKey: string, itemIndex: number, updatedItem: MenuItem) => {
    if (!menuData) return
    
    const newData = { ...menuData }
    newData[categoryKey].items[itemIndex] = updatedItem
    
    setMenuData(newData)
    setEditingItem(null)
  }

  const handleDeleteItem = (categoryKey: string, itemIndex: number) => {
    if (!confirm('このアイテムを削除しますか？')) return
    
    if (!menuData) return
    
    const newData = { ...menuData }
    newData[categoryKey].items.splice(itemIndex, 1)
    
    setMenuData(newData)
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminTokenExpiry')
    router.push('/admin/menu-editor/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!menuData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>無法載入菜單資料</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">メニューエディタ</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchBackups()
                  setShowBackups(true)
                }}
              >
                <Clock className="h-4 w-4 mr-1" />
                バックアップ履歴
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    保存
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="mx-4 mt-4 border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Categories Sidebar */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">カテゴリ</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setNewCategory({ name: '' })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  カテゴリを追加
                </Button>
              </CardHeader>
              <CardContent className="p-2">
                {Object.keys(menuData).map((key) => (
                  <div
                    key={key}
                    className={`
                      flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700
                      ${selectedCategory === key ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    `}
                    onClick={() => setSelectedCategory(key)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <ChevronRight className="h-4 w-4" />
                      <span className="text-sm">{menuData[key].name['ja']}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCategory(key)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Items Editor */}
          <div className="col-span-9">
            {selectedCategory && menuData[selectedCategory] && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{menuData[selectedCategory].name['ja']}</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => handleAddItem(selectedCategory)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      アイテムを追加
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {menuData[selectedCategory].items.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{item.name['ja']}</span>
                              <Badge variant="outline">
                                ¥{typeof item.price === 'number' ? item.price : (typeof item.price === 'object' ? item.price.normal || 0 : 0)}
                              </Badge>
                              {item.cp && <Badge className="bg-orange-100 text-orange-800">CP</Badge>}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>繁: {item.name['zh-tw']}</div>
                              <div>英: {item.name['en']}</div>
                              {item.note?.['ja'] && (
                                <div className="text-xs text-gray-500">備考: {item.note['ja']}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingItem({ categoryKey: selectedCategory, itemIndex: index, item: { ...item } })}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteItem(selectedCategory, index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={true} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="pl-10">
              <DialogTitle>アイテム編集</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* 日文 */}
              <div className="border-2 rounded-lg p-5 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                <h3 className="text-lg font-bold mb-4 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <span className="text-2xl">🇯🇵</span>
                  <span>日本語</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">名前</Label>
                    <Input
                      className="mt-1 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100"
                      value={editingItem.item.name['ja']}
                      onChange={(e) => {
                        const newItem = { ...editingItem.item }
                        newItem.name['ja'] = e.target.value
                        setEditingItem({ ...editingItem, item: newItem })
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">備考 (任意)</Label>
                    <Input
                      className="mt-1 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100"
                      value={editingItem.item.note?.['ja'] || ''}
                      onChange={(e) => {
                        const newItem = { ...editingItem.item }
                        if (!newItem.note) newItem.note = { 'zh-tw': '', 'zh-cn': '', 'en': '', 'ja': '' }
                        newItem.note['ja'] = e.target.value
                        setEditingItem({ ...editingItem, item: newItem })
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">価格</Label>
                    <Input
                      className="mt-1 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100"
                      type="number"
                      value={typeof editingItem.item.price === 'number' ? editingItem.item.price : (typeof editingItem.item.price === 'object' ? editingItem.item.price.normal || 0 : 0)}
                      onChange={(e) => {
                        const newItem = { ...editingItem.item }
                        newItem.price = parseInt(e.target.value) || 0
                        setEditingItem({ ...editingItem, item: newItem })
                      }}
                    />
                  </div>
                  <div>
                    <div className="h-6"></div>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        checked={!!editingItem.item.cp}
                        onCheckedChange={(checked) => {
                          const newItem = { ...editingItem.item }
                          newItem.cp = checked ? '1' : ''
                          setEditingItem({ ...editingItem, item: newItem })
                        }}
                      />
                      <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">カスタマイズ (量り売り)</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 繁體中文 */}
              <div className="border-2 rounded-lg p-5 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
                <h3 className="text-lg font-bold mb-4 text-red-900 dark:text-red-100 flex items-center gap-2">
                  <span className="text-2xl">🇹🇼</span>
                  <span>繁体中国語 (Traditional Chinese)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-red-800 dark:text-red-200">名前</Label>
                    <Input
                      className="mt-1 border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 text-gray-900 dark:text-gray-100"
                      value={editingItem.item.name['zh-tw']}
                      onChange={(e) => {
                        const newItem = { ...editingItem.item }
                        newItem.name['zh-tw'] = e.target.value
                        setEditingItem({ ...editingItem, item: newItem })
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-red-800 dark:text-red-200">備考 (任意)</Label>
                    <Input
                      className="mt-1 border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 text-gray-900 dark:text-gray-100"
                      value={editingItem.item.note?.['zh-tw'] || ''}
                      onChange={(e) => {
                        const newItem = { ...editingItem.item }
                        if (!newItem.note) newItem.note = { 'zh-tw': '', 'zh-cn': '', 'en': '', 'ja': '' }
                        newItem.note['zh-tw'] = e.target.value
                        setEditingItem({ ...editingItem, item: newItem })
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 簡體中文 */}
              <div className="border-2 rounded-lg p-5 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
                <h3 className="text-lg font-bold mb-4 text-green-900 dark:text-green-100 flex items-center gap-2">
                  <span className="text-2xl">🇨🇳</span>
                  <span>簡体中国語 (Simplified Chinese)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-green-800 dark:text-green-200">名前</Label>
                    <Input
                      className="mt-1 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 text-gray-900 dark:text-gray-100"
                      value={editingItem.item.name['zh-cn']}
                      onChange={(e) => {
                        const newItem = { ...editingItem.item }
                        newItem.name['zh-cn'] = e.target.value
                        setEditingItem({ ...editingItem, item: newItem })
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-green-800 dark:text-green-200">備考 (任意)</Label>
                    <Input
                      className="mt-1 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 text-gray-900 dark:text-gray-100"
                      value={editingItem.item.note?.['zh-cn'] || ''}
                      onChange={(e) => {
                        const newItem = { ...editingItem.item }
                        if (!newItem.note) newItem.note = { 'zh-tw': '', 'zh-cn': '', 'en': '', 'ja': '' }
                        newItem.note['zh-cn'] = e.target.value
                        setEditingItem({ ...editingItem, item: newItem })
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 英文 */}
              <div className="border-2 rounded-lg p-5 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                <h3 className="text-lg font-bold mb-4 text-purple-900 dark:text-purple-100 flex items-center gap-2">
                  <span className="text-2xl">🇺🇸</span>
                  <span>英語 (English)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-purple-800 dark:text-purple-200">名前</Label>
                    <Input
                      className="mt-1 border-purple-300 dark:border-purple-600 focus:border-purple-500 dark:focus:border-purple-400 text-gray-900 dark:text-gray-100"
                      value={editingItem.item.name['en']}
                      onChange={(e) => {
                        const newItem = { ...editingItem.item }
                        newItem.name['en'] = e.target.value
                        setEditingItem({ ...editingItem, item: newItem })
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-purple-800 dark:text-purple-200">備考 (任意)</Label>
                    <Input
                      className="mt-1 border-purple-300 dark:border-purple-600 focus:border-purple-500 dark:focus:border-purple-400 text-gray-900 dark:text-gray-100"
                      value={editingItem.item.note?.['en'] || ''}
                      onChange={(e) => {
                        const newItem = { ...editingItem.item }
                        if (!newItem.note) newItem.note = { 'zh-tw': '', 'zh-cn': '', 'en': '', 'ja': '' }
                        newItem.note['en'] = e.target.value
                        setEditingItem({ ...editingItem, item: newItem })
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                キャンセル
              </Button>
              <Button onClick={() => handleUpdateItem(editingItem.categoryKey, editingItem.itemIndex, editingItem.item)}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add New Item Dialog */}
      {addingItem && (
        <Dialog open={true} onOpenChange={() => setAddingItem(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="pr-10">
              <DialogTitle>新しいアイテムを追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* 日文 */}
              <div className="border-2 rounded-lg p-5 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                <h3 className="text-lg font-bold mb-4 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <span className="text-2xl">🇯🇵</span>
                  <span>日本語</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">名前</Label>
                    <Input
                      className="mt-1 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100"
                      value={addingItem.item.name['ja']}
                      onChange={(e) => {
                        const newItem = { ...addingItem.item }
                        newItem.name['ja'] = e.target.value
                        setAddingItem({ ...addingItem, item: newItem })
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">備考 (任意)</Label>
                    <Input
                      className="mt-1 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100"
                      value={addingItem.item.note?.['ja'] || ''}
                      onChange={(e) => {
                        const newItem = { ...addingItem.item }
                        if (!newItem.note) newItem.note = { 'zh-tw': '', 'zh-cn': '', 'en': '', 'ja': '' }
                        newItem.note['ja'] = e.target.value
                        setAddingItem({ ...addingItem, item: newItem })
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">価格</Label>
                    <Input
                      className="mt-1 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100"
                      type="number"
                      value={typeof addingItem.item.price === 'number' ? addingItem.item.price : (typeof addingItem.item.price === 'object' ? addingItem.item.price.normal || 0 : 0)}
                      onChange={(e) => {
                        const newItem = { ...addingItem.item }
                        newItem.price = parseInt(e.target.value) || 0
                        setAddingItem({ ...addingItem, item: newItem })
                      }}
                    />
                  </div>
                  <div>
                    <div className="h-6"></div>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        checked={!!addingItem.item.cp}
                        onCheckedChange={(checked) => {
                          const newItem = { ...addingItem.item }
                          newItem.cp = checked ? '1' : ''
                          setAddingItem({ ...addingItem, item: newItem })
                        }}
                      />
                      <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">カスタマイズ (量り売り)</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 繁體中文 */}
              <div className="border-2 rounded-lg p-5 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
                <h3 className="text-lg font-bold mb-4 text-red-900 dark:text-red-100 flex items-center gap-2">
                  <span className="text-2xl">🇹🇼</span>
                  <span>繁体中国語 (Traditional Chinese)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-red-800 dark:text-red-200">名前</Label>
                    <Input
                      className="mt-1 border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 text-gray-900 dark:text-gray-100"
                      value={addingItem.item.name['zh-tw']}
                      onChange={(e) => {
                        const newItem = { ...addingItem.item }
                        newItem.name['zh-tw'] = e.target.value
                        setAddingItem({ ...addingItem, item: newItem })
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-red-800 dark:text-red-200">備考 (任意)</Label>
                    <Input
                      className="mt-1 border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 text-gray-900 dark:text-gray-100"
                      value={addingItem.item.note?.['zh-tw'] || ''}
                      onChange={(e) => {
                        const newItem = { ...addingItem.item }
                        if (!newItem.note) newItem.note = { 'zh-tw': '', 'zh-cn': '', 'en': '', 'ja': '' }
                        newItem.note['zh-tw'] = e.target.value
                        setAddingItem({ ...addingItem, item: newItem })
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 簡體中文 */}
              <div className="border-2 rounded-lg p-5 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
                <h3 className="text-lg font-bold mb-4 text-green-900 dark:text-green-100 flex items-center gap-2">
                  <span className="text-2xl">🇨🇳</span>
                  <span>簡体中国語 (Simplified Chinese)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-green-800 dark:text-green-200">名前</Label>
                    <Input
                      className="mt-1 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 text-gray-900 dark:text-gray-100"
                      value={addingItem.item.name['zh-cn']}
                      onChange={(e) => {
                        const newItem = { ...addingItem.item }
                        newItem.name['zh-cn'] = e.target.value
                        setAddingItem({ ...addingItem, item: newItem })
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-green-800 dark:text-green-200">備考 (任意)</Label>
                    <Input
                      className="mt-1 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 text-gray-900 dark:text-gray-100"
                      value={addingItem.item.note?.['zh-cn'] || ''}
                      onChange={(e) => {
                        const newItem = { ...addingItem.item }
                        if (!newItem.note) newItem.note = { 'zh-tw': '', 'zh-cn': '', 'en': '', 'ja': '' }
                        newItem.note['zh-cn'] = e.target.value
                        setAddingItem({ ...addingItem, item: newItem })
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 英文 */}
              <div className="border-2 rounded-lg p-5 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                <h3 className="text-lg font-bold mb-4 text-purple-900 dark:text-purple-100 flex items-center gap-2">
                  <span className="text-2xl">🇺🇸</span>
                  <span>英語 (English)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-purple-800 dark:text-purple-200">名前</Label>
                    <Input
                      className="mt-1 border-purple-300 dark:border-purple-600 focus:border-purple-500 dark:focus:border-purple-400 text-gray-900 dark:text-gray-100"
                      value={addingItem.item.name['en']}
                      onChange={(e) => {
                        const newItem = { ...addingItem.item }
                        newItem.name['en'] = e.target.value
                        setAddingItem({ ...addingItem, item: newItem })
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-purple-800 dark:text-purple-200">備考 (任意)</Label>
                    <Input
                      className="mt-1 border-purple-300 dark:border-purple-600 focus:border-purple-500 dark:focus:border-purple-400 text-gray-900 dark:text-gray-100"
                      value={addingItem.item.note?.['en'] || ''}
                      onChange={(e) => {
                        const newItem = { ...addingItem.item }
                        if (!newItem.note) newItem.note = { 'zh-tw': '', 'zh-cn': '', 'en': '', 'ja': '' }
                        newItem.note['en'] = e.target.value
                        setAddingItem({ ...addingItem, item: newItem })
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddingItem(null)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveNewItem}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* New Category Dialog */}
      {newCategory && (
        <Dialog open={true} onOpenChange={() => setNewCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>カテゴリを追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>分類名稱</Label>
                <Input
                  placeholder="例: 飲み物、デザート"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewCategory(null)}>
                キャンセル
              </Button>
              <Button onClick={handleAddCategory}>
                追加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Backups Dialog */}
      {showBackups && (
        <Dialog open={true} onOpenChange={() => setShowBackups(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>バックアップ履歴</DialogTitle>
              <DialogDescription>
                システムは自動的に最新5つのバックアップバージョンを保持します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {backups.map((backup) => (
                <div key={backup.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">{backup.date}</div>
                    <div className="text-sm text-gray-500">{backup.size}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreBackup(backup.id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    復元
                  </Button>
                </div>
              ))}
              {backups.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  バックアップ記録がありません
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}