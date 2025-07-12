import type { NextConfig } from "next";
import path from 'path';
import { InjectManifest } from 'workbox-webpack-plugin';
import packageJson from './package.json';

const nextConfig: NextConfig = {
  // 開啟 React 嚴格模式
  reactStrictMode: false,

  // 部署相關配置
  assetPrefix: process.env.BASE_PATH || '',
  basePath: process.env.BASE_PATH || '',
  trailingSlash: false,
  publicRuntimeConfig: {
    root: process.env.BASE_PATH || '',
  },

  // 環境變數配置
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
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

    // 只在客戶端生產環境建置中加入 Service Worker
    if (!isServer && !dev) {
      config.plugins.push(
        new InjectManifest({
          swSrc: './public/sw.js',
          swDest: './public/sw.js',
          exclude: [/\.map$/, /^manifest.*\.js(?:on)?$/],
        })
      );
    }

    // 返回修改後的配置
    return config;
  },

  // 添加 CORS 標頭
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable'
          },
          {
            key: 'CF-Cache-Control',
            value: 'max-age=31536000, stale-while-revalidate=86400'
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
        source: '/fonts/subsets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          }
        ],
      },
      {
        source: '/fonts/css/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          }
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
