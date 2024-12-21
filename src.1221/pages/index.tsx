import { useEffect } from 'react'
import Menu from '@/components/Menu'
import Seo from '@/components/Seo'
import { Language } from '@/types/menu'
import Image from 'next/image'
import { useLanguageStore } from '@/store/languageStore'

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
  
  useEffect(() => {
    initializeLanguage()
  }, [initializeLanguage])

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
