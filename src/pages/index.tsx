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
  const { language, setLanguage, setSlideDirection, setNextLanguage } = useLanguageStore()
  
  // 語言順序定義
  const languageOrder: Language[] = ['ja', 'zh-tw', 'zh-cn', 'en']

  const handleLanguageChange = (newLang: Language) => {
    const currentIndex = languageOrder.indexOf(language)
    const newIndex = languageOrder.indexOf(newLang)
    
    // 決定滑動方向
    let direction: 'left' | 'right'
    if (currentIndex < newIndex) {
      // 如果是從最後一個到第一個，視為向右滑
      direction = (currentIndex === 0 && newIndex === languageOrder.length - 1) ? 'right' : 'left'
    } else {
      // 如果是從第一個到最後一個，視為向左滑
      direction = (currentIndex === languageOrder.length - 1 && newIndex === 0) ? 'left' : 'right'
    }

    setSlideDirection(direction)
    setNextLanguage(newLang)
    
    setTimeout(() => {
      setLanguage(newLang)
      setSlideDirection(null)
      setNextLanguage(null)
    }, 300)
  }

  const metadata = getMetadata(language)

  return (
    <>
      <Seo {...metadata} />
      <div className="min-h-screen">
        <header className="bg-gray-800 text-white p-4">
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
              <button
                onClick={() => handleLanguageChange('ja')}
                className={`px-0.5 py-2 rounded ${language === 'ja' ? 'bg-white text-gray-800' : ''}`}
              >
                日本語
              </button>
              <button
                onClick={() => handleLanguageChange('zh-tw')}
                className={`px-0.5 py-2 rounded ${language === 'zh-tw' ? 'bg-white text-gray-800' : ''}`}
              >
                台湾語
              </button>
              <button
                onClick={() => handleLanguageChange('zh-cn')}
                className={`px-0.5 py-2 rounded ${language === 'zh-cn' ? 'bg-white text-gray-800' : ''}`}
              >
                中国語
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-0.5 py-2 rounded ${language === 'en' ? 'bg-white text-gray-800' : ''}`}
              >
                English
              </button>
            </div>
          </div>
        </header>
        <main>
          <Menu />
        </main>
      </div>
    </>
  )
}
