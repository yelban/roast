#!/usr/bin/env node

/**
 * 為菜單資料中的每個項目添加 note 欄位（預設為空字串）
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function addNoteFieldToMenuData() {
  const dataPath = path.join(__dirname, '..', 'src', 'data', 'data.json')
  
  try {
    // 讀取現有的菜單資料
    console.log('📖 讀取菜單資料...')
    const menuData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    
    let totalItems = 0
    let modifiedItems = 0
    
    // 遍歷所有分類
    for (const [categoryKey, category] of Object.entries(menuData)) {
      console.log(`📂 處理分類: ${categoryKey}`)
      
      // 遍歷分類中的所有項目
      for (const item of category.items) {
        totalItems++
        
        // 檢查是否已有 note 欄位
        if (!item.note) {
          // 添加 note 欄位，預設為空字串（支援所有語言）
          item.note = {
            "zh-tw": "",
            "zh-cn": "",
            "en": "",
            "ja": ""
          }
          modifiedItems++
          console.log(`  ✅ 已添加 note 欄位到: ${item.name['ja']}`)
        } else {
          console.log(`  ⏭️ 跳過（已有 note）: ${item.name['ja']}`)
        }
      }
    }
    
    // 寫回檔案
    console.log('💾 儲存修改後的菜單資料...')
    fs.writeFileSync(dataPath, JSON.stringify(menuData, null, 2), 'utf8')
    
    console.log('🎉 完成！')
    console.log(`📊 統計:`)
    console.log(`   - 總項目數: ${totalItems}`)
    console.log(`   - 修改項目數: ${modifiedItems}`)
    console.log(`   - 跳過項目數: ${totalItems - modifiedItems}`)
    
    return { totalItems, modifiedItems }
    
  } catch (error) {
    console.error('❌ 處理過程發生錯誤:', error.message)
    throw error
  }
}

// 如果直接執行此腳本則運行主函數
if (import.meta.url === `file://${process.argv[1]}`) {
  addNoteFieldToMenuData().catch(console.error)
}

export { addNoteFieldToMenuData }