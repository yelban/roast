#!/usr/bin/env node

import fs from 'fs'
import { execSync } from 'child_process'

/**
 * 檢查是否需要更新版本號
 * 如果提交訊息包含 feat: 或 fix:，則需要更新版本
 */
function checkVersionUpdate() {
  try {
    // 獲取當前分支的最新提交訊息
    const lastCommitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim()
    
    // 檢查是否為功能性提交
    const needsVersionUpdate = /^(feat|fix|perf|refactor)(\(.+\))?: /.test(lastCommitMessage)
    
    if (!needsVersionUpdate) {
      console.log('✅ 非功能性提交，無需更新版本號')
      return true
    }

    // 讀取 package.json
    const packagePath = './package.json'
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    const currentVersion = packageContent.version

    console.log(`📦 當前版本: ${currentVersion}`)
    console.log(`📝 提交訊息: ${lastCommitMessage}`)
    
    // 檢查是否在同一次會話中已經更新過版本
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' })
    const hasPackageJsonChanges = gitStatus.includes('package.json')
    
    if (hasPackageJsonChanges) {
      // 檢查是否是版本號變更
      const diff = execSync('git diff --staged package.json', { encoding: 'utf8' })
      if (diff.includes('"version"')) {
        console.log('✅ 版本號已更新')
        return true
      }
    }

    // 提示需要更新版本號
    console.log('⚠️  檢測到功能性提交，建議更新版本號')
    console.log('請執行以下命令之一：')
    console.log('  npm version patch  # 0.4.2 -> 0.4.3 (小修改)')
    console.log('  npm version minor  # 0.4.2 -> 0.5.0 (新功能)')
    console.log('  npm version major  # 0.4.2 -> 1.0.0 (重大變更)')
    
    return false
  } catch (error) {
    console.error('❌ 版本檢查失敗:', error.message)
    return false
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = checkVersionUpdate()
  process.exit(result ? 0 : 1)
}

export default checkVersionUpdate