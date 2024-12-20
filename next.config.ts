import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // 開啟 React 嚴格模式
  reactStrictMode: true,

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
    ]
  },
};

export default nextConfig;
