import Head from 'next/head'

interface SeoProps {
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: string
}

export default function Seo({
  title = 'スタミナ苑',
  description = '焼肉、韓国料理のスタミナ苑へようこそ',
  keywords = ['焼肉', '韓国料理', 'スタミナ苑', '台湾', '日本料理'],
  ogImage = '/logo.png'
}: SeoProps) {
  const siteTitle = `${title}${title === 'スタミナ苑' ? '' : ' | スタミナ苑'}`

  return (
    <Head>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      
      {/* Open Graph */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      
      {/* Other */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta charSet="utf-8" />
    </Head>
  )
} 