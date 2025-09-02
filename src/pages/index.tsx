import { useEffect, useState } from 'react'
import Menu from '@/components/Menu'
import LoginForm from '@/components/LoginForm'
import Seo from '@/components/Seo'
import { Language } from '@/types/menu'
import Image from 'next/image'
import { useLanguageStore } from '@/store/languageStore'
import { useCartStore } from '@/store/cartStore'
import { useRouter } from 'next/router'

const getMetadata = (language: Language) => {
  switch (language) {
    case 'ja':
      return {
        title: 'スタミナ苑',
        description: '焼肉、韓国料理のスタミナ苑へようこそ。本場の味をお楽しみください。',
        keywords: ['焼肉', '日本料理', '韓国料理', 'スタミナ苑', '台湾']
      }
    case 'zh-tw':
      return {
        title: '活力園',
        description: '歡迎光臨活力園燒肉店。正宗的A5和牛燒肉等著您。',
        keywords: ['燒肉', '日式料理', '韓式料理', '活力園', '台灣']
      }
    case 'zh-cn':
      return {
        title: '活力园',
        description: '欢迎光临活力园烧肉店。正宗的A5和牛烧肉等着您。',
        keywords: ['烧肉', '日式料理', '韩式料理', '活力园', '台湾']
      }
    default:
      return {
        title: 'Stamina-en',
        description: 'Welcome to Stamina-en. Enjoy authentic Korean BBQ and Japanese cuisine.',
        keywords: ['yakiniku', 'korean bbq', 'stamina-en', 'taiwan', 'japanese food']
      }
  }
}

export default function Home() {
  const { language, setLanguage, setSlideDirection, setNextLanguage, initializeLanguage } = useLanguageStore()
  const { setTableNumber, loadTableNumber } = useCartStore()
  const router = useRouter()
  const [isPosMode, setIsPosMode] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  useEffect(() => {
    initializeLanguage()
    loadTableNumber()
    
    // 從 URL 參數讀取桌號和模式
    const { table, mode } = router.query
    if (table && typeof table === 'string') {
      setTableNumber(table)
    }
    
    // 檢測 POS 模式
    const posMode = mode === 'pos'
    setIsPosMode(posMode)
    
    // 檢查 POS 模式的驗證狀態
    if (posMode) {
      const authStatus = localStorage.getItem('pos-authenticated')
      const authTimestamp = localStorage.getItem('pos-auth-timestamp')
      
      // 檢查是否有有效的登入狀態
      if (authStatus === 'true' && authTimestamp) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    }
    
    setIsCheckingAuth(false)
  }, [initializeLanguage, loadTableNumber, router.query, setTableNumber])

  // 處理登入成功
  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  // 語言順序定義
  const languageOrder: Language[] = ['ja', 'zh-tw', 'zh-cn', 'en']

  const handleLanguageChange = (lang: Language) => {
    const currentIndex = languageOrder.indexOf(language)
    const nextIndex = languageOrder.indexOf(lang)
    
    // // 決定滑動方向
    // let direction: 'left' | 'right'
    // if (currentIndex < newIndex) {
    //   // 如果是從最後一個到第一個，視為向右滑
    //   direction = (currentIndex === 0 && newIndex === languageOrder.length - 1) ? 'right' : 'left'
    // } else {
    //   // 如果是從第一個到最後一個，視為向左滑
    //   direction = (currentIndex === languageOrder.length - 1 && newIndex === 0) ? 'left' : 'right'
    // }

    // setSlideDirection(direction)

    // 設定滑動方向
    if (currentIndex < nextIndex) {
      setSlideDirection('left')
    } else {
      setSlideDirection('right')
    }

    setNextLanguage(lang)
    
    setTimeout(() => {
      setLanguage(lang)
      setSlideDirection(null)
      setNextLanguage(null)
    }, 300)
  }

  const metadata = getMetadata(language)

  // 如果正在檢查驗證狀態，顯示載入畫面
  if (isPosMode && isCheckingAuth) {
    return (
      <>
        <Seo {...metadata} />
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">載入中...</p>
          </div>
        </div>
      </>
    )
  }

  // POS 模式：如果未驗證，顯示登入表單
  if (isPosMode && !isAuthenticated) {
    return (
      <>
        <Seo {...metadata} />
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </>
    )
  }

  // POS 模式：已驗證，顯示 POS 介面
  if (isPosMode && isAuthenticated) {
    return (
      <>
        <Seo {...metadata} />
        <div className="min-h-screen">
          <header className="bg-gray-800 text-white p-4 fixed top-0 left-0 right-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Image 
                  src="/logo.png" 
                  alt="スタミナ苑 POS" 
                  width={85} 
                  height={36}
                  className="h-full w-auto"
                  style={{ height: 'auto' }}
                  priority
                />
                <span className="text-sm bg-red-600 px-2 py-1 rounded">POS</span>
              </div>
              <div className="space-x-1 text-sm">
                {languageOrder.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-0.5 py-2 rounded transition-colors duration-300 ${
                      language === lang ? 'bg-white text-gray-800' : ''
                    }`}
                  >
                    {lang === 'ja' && '日本語'}
                    {lang === 'zh-tw' && '台湾語'}
                    {lang === 'zh-cn' && '中国語'}
                    {lang === 'en' && 'English'}
                  </button>
                ))}
              </div>
            </div>
          </header>
          <main className="pt-[72px] relative">
            <Menu mode="pos" />
          </main>
        </div>
      </>
    )
  }

  return (
    <>
      <Seo {...metadata} />
      <div className="min-h-screen">
        <header className="bg-gray-800 text-white p-4 fixed top-0 left-0 right-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <div>
              <Image 
                src="/logo.png" 
                alt="スタミナ苑" 
                width={85} 
                height={36}
                className="h-full w-auto"
                style={{ height: 'auto' }}
                priority
              />
            </div>
            <div className="space-x-1 text-sm">
              {languageOrder.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-0.5 py-2 rounded transition-colors duration-300 ${
                    language === lang ? 'bg-white text-gray-800' : ''
                  }`}
                >
                  {lang === 'ja' && '日本語'}
                  {lang === 'zh-tw' && '台湾語'}
                  {lang === 'zh-cn' && '中国語'}
                  {lang === 'en' && 'English'}
                </button>
              ))}
            </div>
          </div>
        </header>
        <main className="pt-[72px] relative">
          <Menu />
        </main>
      </div>
    </>
  )
}
