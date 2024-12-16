import { useEffect, useState } from 'react'
import Menu from '@/components/Menu'
import { Language } from '@/types/menu'
import Image from 'next/image'

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

  return (
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
  )
}
