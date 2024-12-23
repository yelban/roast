import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // 開啟 React 嚴格模式
  reactStrictMode: false,

  // 部署相關配置
  assetPrefix: process.env.BASE_PATH || '',
  basePath: process.env.BASE_PATH || '',
  trailingSlash: true,
  publicRuntimeConfig: {
    root: process.env.BASE_PATH || '',
  },

  serverExternalPackages: [],

  webpack: (config, { dev, isServer }) => {
    // 只在客戶端構建中啟用 WebAssembly
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      }
    }

    // 修改 WebAssembly 模組規則
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // 只在生產環境的客戶端構建中啟用檔案系統快取
    if (!dev && !isServer) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: path.resolve(__dirname, '.next/cache'),
      }
    }

    // 處理字體檔案
    config.module.rules.push({
      test: /\.(ttf|woff|woff2)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[hash][ext]'
      }
    })

    return config;
  },

  // 添加 CORS 標頭
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
          {
            key: 'Access-Control-Expose-Headers',
            value: 'CF-Cache-Status, CF-Ray, CF-IPCountry'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      },
      {
        source: '/api/tts',
        headers: [
          // {
          //   key: 'Cache-Control',
          //   value: 'public, max-age=31536000, immutable'
          // },
          {
            key: 'Cache-Control',
            // 修改快取策略以支援 CloudFlare CDN
            value: 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable'
          },
          // CloudFlare 特定的快取控制標頭
          {
            key: 'CDN-Cache-Control',
            value: 'max-age=31536000'
          },
          {
            key: 'Cloudflare-CDN-Cache-Control',
            value: 'max-age=31536000'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ]
  },

  async rewrites() {
    return [
      {
        source: '/api/tts',
        destination: '/api/tts'
      },
      {
        source: '/api/tts/',
        destination: '/api/tts'  // 統一導向無斜線版本
      },
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
};

export default nextConfig;
