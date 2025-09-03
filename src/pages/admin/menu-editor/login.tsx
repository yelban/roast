import { useState } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Lock, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function MenuEditorLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 儲存 token 到 localStorage
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('adminTokenExpiry', (Date.now() + data.expiresIn * 1000).toString())
        
        // 導向編輯器主頁
        router.push('/admin/menu-editor')
      } else {
        setError(data.error || '登入失敗')
      }
    } catch (error) {
      setError('連線錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <Lock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">菜單編輯器</CardTitle>
          <CardDescription className="text-center">
            請輸入管理員密碼以進入編輯器
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                placeholder="輸入管理員密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !password}
            >
              {isLoading ? '登入中...' : '登入'}
            </Button>
            
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/')}
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                返回主頁
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}