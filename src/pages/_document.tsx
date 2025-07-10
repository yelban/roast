import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return (
    <Html lang="en">
      <Head>
        {/* 僅在生產環境中載入 PWA 相關配置 */}
        {!isDevelopment && (
          <>
            <link rel="manifest" href="/manifest.json" />
            <meta name="application-name" content="スタミナ苑" />
            <meta name="theme-color" content="#1f2937" />
            <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="mobile-web-app-status-bar-style" content="default" />
          </>
        )}
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
