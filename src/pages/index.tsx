import { useEffect, useState } from 'react'
import Menu from '@/components/Menu'
import Seo from '@/components/Seo'
import { Language } from '@/types/menu'
import Image from 'next/image'

const getMetadata = (language: Language) => {
  switch (language) {
    case 'ja':
      return {
        title: 'スタミナ苑',
        description: '焼肉、韓国料理のスタミナ苑へようこそ。本場の味をお楽しみください。',
        keywords: ['焼肉', '韓国料理', 'スタミナ苑', '台湾', '日本料理']
      }
    case 'zh-tw':
      return {
        title: '活力園',
        description: '歡迎光臨活力園燒肉店。正宗的韓式燒肉等著您。',
        keywords: ['燒肉', '韓式料理', '活力園', '台灣', '日式料理']
      }
    case 'zh-cn':
      return {
        title: '活力园',
        description: '欢迎光临活力园烧肉店。正宗的韩式烧肉等着您。',
        keywords: ['烧肉', '韩式料理', '活力园', '台湾', '日式料理']
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
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    // 取得瀏覽器語言設定
    const browserLang = navigator.language.toLowerCase()
    
    // 根據瀏覽器語言設定預設語言
    if (browserLang.startsWith('zh')) {
      if (browserLang.includes('tw')) {
        setLanguage('zh-tw')
      } else {
        setLanguage('zh-cn')
      }
    } else if (browserLang.startsWith('ja')) {
      setLanguage('ja')
    } else {
      setLanguage('en')
    }
  }, [])

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
  }

  const metadata = getMetadata(language)

  return (
    <>
      <Seo {...metadata} />
      <div className="min-h-screen">
        <header className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="h-[42px]">
              <Image 
                src="/logo.png" 
                alt="スタミナ苑" 
                width={99} 
                height={42}
                className="h-full w-auto"
                priority
              />
            </div>
            <div className="space-x-1">
              <button
                onClick={() => handleLanguageChange('ja')}
                className={`px-1 py-1 rounded ${language === 'ja' ? 'bg-white text-gray-800' : ''}`}
              >
                日本語
              </button>
              <button
                onClick={() => handleLanguageChange('zh-tw')}
                className={`px-1 py-1 rounded ${language === 'zh-tw' ? 'bg-white text-gray-800' : ''}`}
              >
                台湾語
              </button>
              <button
                onClick={() => handleLanguageChange('zh-cn')}
                className={`px-1 py-1 rounded ${language === 'zh-cn' ? 'bg-white text-gray-800' : ''}`}
              >
                中国語
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-1 py-1 rounded ${language === 'en' ? 'bg-white text-gray-800' : ''}`}
              >
                English
              </button>
            </div>
          </div>
        </header>
        <main>
          <Menu language={language} />
        </main>
      </div>
    </>
  )
}
