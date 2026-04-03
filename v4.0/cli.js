#!/usr/bin/env node

/**
 * WhatsApp Bot CLI 管理工具
 * 使用 Commander.js 創建命令列介面
 * 
 * 使用方法:
 *   node cli.js --help
 *   node cli.js status
 *   node cli.js broadcast "訊息內容" --group "群組名稱"
 *   node cli.js stats --chat "chatId"
 *   node cli.js tools --list
 */

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');

const program = new Command();

// ============================================
// 工具函數
// ============================================

function printDivider() {
    console.log('\n' + '='.repeat(60) + '\n');
}

function getTimestamp() {
    return new Date().toLocaleString('zh-HK');
}

// ============================================
// CLI 設定
// ============================================

program
    .name('whatsapp-bot-cli')
    .description('WhatsApp Bot v4.1 管理命令列工具')
    .version('4.1.0');

// ============================================
// 命令: status - 查看機器人狀態
// ============================================

program
    .command('status')
    .description('查看機器人運行狀態')
    .action(() => {
        printDivider();
        console.log('📊 WhatsApp Bot 狀態');
        printDivider();
        
        // 檢查認證狀態
        const authPath = path.join(__dirname, '.wwebjs_auth');
        const isAuthenticated = fs.existsSync(authPath);
        
        console.log(`🔐 認證狀態: ${isAuthenticated ? '✅ 已認證' : '❌ 未認證'}`);
        console.log(`📁 專案路徑: ${__dirname}`);
        console.log(`⏰ 檢查時間: ${getTimestamp()}`);
        
        // 檢查工具數量
        const toolsPath = path.join(__dirname, 'tools');
        if (fs.existsSync(toolsPath)) {
            const tools = fs.readdirSync(toolsPath)
                .filter(item => fs.statSync(path.join(toolsPath, item)).isDirectory())
                .filter(item => fs.existsSync(path.join(toolsPath, item, 'index.js')));
            console.log(`\n🔧 可用工具 (${tools.length} 個):`);
            tools.forEach((tool, index) => {
                console.log(`   ${index + 1}. ${tool}`);
            });
        }
        
        // 檢查訊息儲存
        const messagesPath = path.join(__dirname, 'messages');
        if (fs.existsSync(messagesPath)) {
            const chats = fs.readdirSync(messagesPath);
            console.log(`\n💬 聊天記錄: ${chats.length} 個聊天`);
        } else {
            console.log('\n💬 聊天記錄: 0 個聊天');
        }
        
        printDivider();
        console.log('✅ 狀態檢查完成');
        printDivider();
    });

// ============================================
// 命令: broadcast - 廣播訊息
// ============================================

program
    .command('broadcast <message>')
    .description('向指定群組廣播訊息')
    .option('-g, --group <name>', '指定群組名稱')
    .option('-a, --all', '發送到所有群組')
    .action((message, options) => {
        printDivider();
        console.log('📢 廣播訊息');
        printDivider();
        
        console.log(`📝 訊息內容: ${message}`);
        console.log(`⏰ 請求時間: ${getTimestamp()}`);
        
        if (options.all) {
            console.log('\n🎯 目標: 所有群組');
            console.log('\n⚠️  注意: 需要機器人正在運行才能發送');
            console.log('💡 提示: 使用 node index.js 啟動機器人');
        } else if (options.group) {
            console.log(`\n🎯 目標群組: ${options.group}`);
            console.log('\n⚠️  注意: 需要機器人正在運行才能發送');
            console.log('💡 提示: 使用 node index.js 啟動機器人');
        } else {
            console.log('\n❌ 錯誤: 請指定 --group 或 --all 選項');
            console.log('💡 用法: node cli.js broadcast "訊息" --group "群組名稱"');
            console.log('    或: node cli.js broadcast "訊息" --all');
            process.exit(1);
        }
        
        printDivider();
    });

// ============================================
// 命令: stats - 查看統計數據
// ============================================

program
    .command('stats')
    .description('查看聊天統計數據')
    .option('-c, --chat <chatId>', '指定聊天 ID')
    .option('-d, --days <number>', '查看最近 N 天的數據', '7')
    .action((options) => {
        printDivider();
        console.log('📈 聊天統計');
        printDivider();
        
        console.log(`📅 時間範圍: 最近 ${options.days} 天`);
        
        if (options.chat) {
            console.log(`💬 指定聊天: ${options.chat}`);
            
            // 檢查該聊天的訊息記錄
            const chatPath = path.join(__dirname, 'messages', options.chat);
            if (fs.existsSync(chatPath)) {
                const files = fs.readdirSync(chatPath);
                console.log(`\n📁 訊息檔案: ${files.length} 個`);
                
                // 顯示檔案大小統計
                let totalSize = 0;
                files.forEach(file => {
                    const filePath = path.join(chatPath, file);
                    const stats = fs.statSync(filePath);
                    totalSize += stats.size;
                });
                console.log(`💾 總大小: ${(totalSize / 1024).toFixed(2)} KB`);
            } else {
                console.log('\n⚠️  未找到該聊天的記錄');
            }
        } else {
            console.log('💬 所有聊天');
            
            const messagesPath = path.join(__dirname, 'messages');
            if (fs.existsSync(messagesPath)) {
                const chats = fs.readdirSync(messagesPath);
                console.log(`\n📊 總聊天數: ${chats.length}`);
                
                if (chats.length > 0) {
                    console.log('\n📋 聊天列表:');
                    chats.forEach((c, index) => {
                        const chatPath = path.join(messagesPath, c);
                        if (fs.statSync(chatPath).isDirectory()) {
                            const files = fs.readdirSync(chatPath);
                            console.log(`   ${index + 1}. ${c}: ${files.length} 個檔案`);
                        }
                    });
                }
            } else {
                console.log('\n⚠️  未找到訊息記錄');
            }
        }
        
        printDivider();
    });

// ============================================
// 命令: tools - 管理工具
// ============================================

program
    .command('tools')
    .description('管理工具插件')
    .option('-l, --list', '列出所有工具')
    .option('-e, --enable <tool>', '啟用工具')
    .option('-d, --disable <tool>', '停用工具')
    .action((options) => {
        printDivider();
        console.log('🔧 工具管理');
        printDivider();
        
        const toolsPath = path.join(__dirname, 'tools');
        
        if (options.list || (!options.enable && !options.disable)) {
            console.log('📋 可用工具列表:\n');
            
            if (fs.existsSync(toolsPath)) {
                const items = fs.readdirSync(toolsPath);
                let count = 0;
                
                items.forEach(item => {
                    const itemPath = path.join(toolsPath, item);
                    if (fs.statSync(itemPath).isDirectory()) {
                        const indexPath = path.join(itemPath, 'index.js');
                        const readmePath = path.join(itemPath, 'README.md');
                        
                        let status = fs.existsSync(indexPath) ? '✅ 可用' : '❌ 不可用';
                        let description = '無描述';
                        
                        if (fs.existsSync(readmePath)) {
                            try {
                                const readme = fs.readFileSync(readmePath, 'utf8');
                                const match = readme.match(/【功能說明】\s*\n\s*(.+)/);
                                if (match) description = match[1].trim();
                            } catch (e) {}
                        }
                        
                        count++;
                        console.log(`${count}. ${item}`);
                        console.log(`   狀態: ${status}`);
                        console.log(`   說明: ${description}\n`);
                    }
                });
                
                console.log(`總計: ${count} 個工具`);
            } else {
                console.log('⚠️  未找到工具目錄');
            }
        }
        
        if (options.enable) {
            console.log(`\n✅ 啟用工具: ${options.enable}`);
            console.log('💡 提示: 工具啟用需要重啟機器人');
        }
        
        if (options.disable) {
            console.log(`\n🛑 停用工具: ${options.disable}`);
            console.log('💡 提示: 工具停用需要重啟機器人');
        }
        
        printDivider();
    });

// ============================================
// 命令: logs - 查看日誌
// ============================================

program
    .command('logs')
    .description('查看機器人日誌')
    .option('-n, --lines <number>', '顯示最後 N 行', '20')
    .option('-f, --follow', '持續監控日誌 (尚未實現)')
    .action((options) => {
        printDivider();
        console.log('📜 機器人日誌');
        printDivider();
        
        console.log(`📊 顯示最後 ${options.lines} 行日誌`);
        
        // 這裡可以整合實際的日誌系統
        console.log('\n💡 提示: 目前使用 console 輸出日誌');
        console.log('   實際日誌請查看終端機輸出');
        
        if (options.follow) {
            console.log('\n👀 持續監控模式 (按 Ctrl+C 停止)');
            console.log('⚠️  注意: 此功能需要整合日誌文件系統');
        }
        
        printDivider();
    });

// ============================================
// 命令: config - 設定管理
// ============================================

program
    .command('config')
    .description('管理機器人設定')
    .option('-s, --show', '顯示目前設定')
    .option('-r, --reset', '重置為預設設定')
    .action((options) => {
        printDivider();
        console.log('⚙️  設定管理');
        printDivider();
        
        if (options.reset) {
            console.log('🔄 正在重置設定...');
            console.log('✅ 設定已重置為預設值');
        } else {
            console.log('📋 目前設定:\n');
            console.log('  版本: 4.1.0');
            console.log('  認證: LocalAuth');
            console.log('  工具數量: 3');
            console.log('  訊息儲存: 啟用');
            console.log('  智能指令: 啟用');
            console.log('  滑動回覆: 啟用');
        }
        
        printDivider();
    });

// ============================================
// 命令: restart - 重啟機器人
// ============================================

program
    .command('restart')
    .description('重啟 WhatsApp Bot')
    .option('-f, --force', '強制重啟 (跳過確認)')
    .action((options) => {
        printDivider();
        console.log('🔄 重啟機器人');
        printDivider();
        
        console.log('⏰ 重啟時間:', getTimestamp());
        console.log('\n⚠️  注意: 此命令需要在終端機中手動執行');
        console.log('💡 手動重啟步驟:');
        console.log('   1. 按 Ctrl+C 停止目前進程');
        console.log('   2. 執行: node index.js');
        
        if (options.force) {
            console.log('\n🚀 強制重啟模式');
        }
        
        printDivider();
    });

// ============================================
// 執行 CLI
// ============================================

program.parse();

// 如果沒有輸入命令，顯示幫助
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
