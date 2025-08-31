#!/usr/bin/env node

/**
 * 自動更新 Service Worker 中的版本號
 * 在版本更新時自動執行，確保 Service Worker 版本與 package.json 同步
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 讀取 package.json 版本
const packagePath = path.join(__dirname, '..', 'package.json');
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageData.version;

// Service Worker 檔案路徑
const swPath = path.join(__dirname, '..', 'public', 'sw.js');

// 讀取 Service Worker 內容
let swContent = fs.readFileSync(swPath, 'utf8');

// 更新版本號
const versionPattern = /const APP_VERSION = ['"][\d.]+['"]/;
const newVersionLine = `const APP_VERSION = '${version}'`;

if (versionPattern.test(swContent)) {
  swContent = swContent.replace(versionPattern, newVersionLine);
  
  // 寫回檔案
  fs.writeFileSync(swPath, swContent, 'utf8');
  
  console.log(`✅ Service Worker 版本已更新到 ${version}`);
  console.log('📦 舊版本的菜單快取將在下次載入時自動清除');
} else {
  console.error('❌ 無法找到版本號定義，請檢查 Service Worker 格式');
  process.exit(1);
}