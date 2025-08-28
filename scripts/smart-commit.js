#!/usr/bin/env node

import fs from 'fs'
import { execSync } from 'child_process'

/**
 * 智能提交腳本 - 自動檢查並更新版本號
 */
function smartCommit() {
  try {
    // 檢查是否有暫存的變更
    const stagedChanges = execSync('git diff --staged --name-only', { encoding: 'utf8' }).trim()
    if (!stagedChanges) {
      console.log('❌ 沒有暫存的變更，請先使用 git add')
      return false
    }

    console.log('📋 暫存的檔案：')
    stagedChanges.split('\n').forEach(file => console.log(`  ${file}`))

    // 分析提交類型
    const commitType = analyzeChanges(stagedChanges.split('\n'))
    console.log(`🔍 檢測到提交類型: ${commitType}`)

    // 如果需要版本更新
    if (shouldUpdateVersion(commitType)) {
      const currentVersion = getCurrentVersion()
      console.log(`📦 當前版本: ${currentVersion}`)
      
      // 檢查 package.json 是否已經在暫存區中且包含版本變更
      if (stagedChanges.includes('package.json')) {
        const diff = execSync('git diff --staged package.json', { encoding: 'utf8' })
        if (diff.includes('"version"')) {
          console.log('✅ 版本號已更新，繼續提交')
          return true
        }
      }

      // 自動更新版本號
      const newVersion = suggestVersionBump(currentVersion, commitType)
      console.log(`🚀 建議新版本: ${newVersion}`)
      
      if (updateVersion(newVersion)) {
        console.log('✅ 版本號已自動更新')
        return true
      }
    }

    return true
  } catch (error) {
    console.error('❌ 智能提交失敗:', error.message)
    return false
  }
}

function analyzeChanges(files) {
  // 檢查檔案類型來判斷提交類型
  const hasSourceCode = files.some(f => 
    f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.jsx')
  )
  
  const hasComponents = files.some(f => f.includes('components/'))
  const hasAPI = files.some(f => f.includes('api/'))
  const hasConfig = files.some(f => 
    f.includes('config/') || f.includes('next.config') || f.includes('package.json')
  )

  if (hasComponents || hasAPI) return 'feat'
  if (hasSourceCode) return 'fix'
  if (hasConfig) return 'chore'
  
  return 'docs'
}

function shouldUpdateVersion(commitType) {
  return ['feat', 'fix', 'perf', 'refactor'].includes(commitType)
}

function getCurrentVersion() {
  const packageContent = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
  return packageContent.version
}

function suggestVersionBump(currentVersion, commitType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number)
  
  switch (commitType) {
    case 'feat':
      return `${major}.${minor}.${patch + 1}`
    case 'fix':
    case 'perf':
    case 'refactor':
      return `${major}.${minor}.${patch + 1}`
    default:
      return currentVersion
  }
}

function updateVersion(newVersion) {
  try {
    const packagePath = './package.json'
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    packageContent.version = newVersion
    
    fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2) + '\n')
    execSync('git add package.json')
    
    return true
  } catch (error) {
    console.error('❌ 版本更新失敗:', error.message)
    return false
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = smartCommit()
  process.exit(result ? 0 : 1)
}

export default smartCommit