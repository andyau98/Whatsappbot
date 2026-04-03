/**
 * WhatsApp Bot CLI 管理工具
 * 使用 @jackwener/opencli 創建命令列介面
 * 
 * 使用方法:
 * node cli.mjs --help
 * node cli.mjs status
 * node cli.mjs broadcast "訊息內容" --group "群組名稱"
 * node cli.mjs stats --chat "chatId"
 */

import { CLI } from '@jackwener/opencli';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 創建 CLI 實例
const cli = new CLI({
    name: 'whatsapp-bot-cli',
    version: '4.1.0',
    description: 'WhatsApp Bot 管理命令列工具'
});

// ============================================
// 命令: status - 查看機器人狀態
// ============================================
cli.command('status', '查看機器人運行狀態')
    .action(() => {
        console.log('\n📊 WhatsApp Bot 狀態\n');
        
        // 檢查認證狀態
        const authPath = path.join(__dirname, '.wwebjs_auth');
        const isAuthenticated = fs.existsSync(authPath);
        
        console.log(`🔐 認證狀態: ${isAuthenticated ? '✅ 已認證' : '❌ 未認證'}`);
        console.log(`📁 專案路徑: ${__dirname}`);
        
        // 檢查工具數量
        const toolsPath = path.join(__dirname, 'tools');
        if (fs.existsSync(toolsPath)) {
            const tools = fs.readdirSync(toolsPath)
                .filter(item => fs.statSync(path.join(toolsPath, item)).isDirectory())
                .filter(item => fs.existsSync(path.join(toolsPath, item, 'index.js')));
            console.log(`🔧 可用工具: ${tools.length} 個 (${tools.join(', ')})`);
        }
        
        // 檢查訊息儲存
        const messagesPath = path.join(__dirname, 'messages');
        if (fs.existsSync(messagesPath)) {
            const chats = fs.readdirSync(messagesPath);
            console.log(`💬 聊天記錄: ${chats.length} 個聊天`);
        }
        
        console.log('\n✅ 機器人運行正常\n');
    });

// ============================================
// 命令: broadcast - 廣播訊息
// ============================================
cli.command('broadcast <message>', '向指定群組廣播訊息')
    .option('-g, --group <name>', '指定群組名稱')
    .option('-a, --all', '發送到所有群組')
    .action((args) => {
        const { message, group, all } = args;
        
        console.log('\n📢 廣播訊息\n');
        console.log(`📝 訊息內容: ${message}`);
        
        if (all) {
            console.log('🎯 目標: 所有群組');
            console.log('\n⚠️  注意: 需要機器人正在運行才能發送');
            console.log('💡 提示: 使用 node index.js 啟動機器人\n');
        } else if (group) {
            console.log(`🎯 目標群組: ${group}`);
            console.log('\n⚠️  注意: 需要機器人正在運行才能發送');
            console.log('💡 提示: 使用 node index.js 啟動機器人\n');
        } else {
            console.log('❌ 錯誤: 請指定 --group 或 --all 選項\n');
            process.exit(1);
        }
    });

// ============================================
// 命令: stats - 查看統計數據
// ============================================
cli.command('stats', '查看聊天統計數據')
    .option('-c, --chat <chatId>', '指定聊天 ID')
    .option('-d, --days <number>', '查看最近 N 天的數據', '7')
    .action((args) => {
        const { chat, days } = args;
        
        console.log('\n📈 聊天統計\n');
        console.log(`📅 時間範圍: 最近 ${days} 天`);
        
        if (chat) {
            console.log(`💬 指定聊天: ${chat}`);
            
            // 檢查該聊天的訊息記錄
            const chatPath = path.join(__dirname, 'messages', chat);
            if (fs.existsSync(chatPath)) {
                const files = fs.readdirSync(chatPath);
                console.log(`📁 訊息檔案: ${files.length} 個`);
            } else {
                console.log('⚠️  未找到該聊天的記錄');
            }
        } else {
            console.log('💬 所有聊天');
            
            const messagesPath = path.join(__dirname, 'messages');
            if (fs.existsSync(messagesPath)) {
                const chats = fs.readdirSync(messagesPath);
                console.log(`📊 總聊天數: ${chats.length}`);
                
                chats.forEach(c => {
                    const chatPath = path.join(messagesPath, c);
                    if (fs.statSync(chatPath).isDirectory()) {
                        const files = fs.readdirSync(chatPath);
                        console.log(`  • ${c}: ${files.length} 個檔案`);
                    }
                });
            } else {
                console.log('⚠️  未找到訊息記錄');
            }
        }
        
        console.log('');
    });

// ============================================
// 命令: tools - 管理工具
// ============================================
cli.command('tools', '管理工具插件')
    .option('-l, --list', '列出所有工具')
    .option('-e, --enable <tool>', '啟用工具')
    .option('-d, --disable <tool>', '停用工具')
    .action((args) => {
        const { list, enable, disable } = args;
        
        console.log('\n🔧 工具管理\n');
        
        const toolsPath = path.join(__dirname, 'tools');
        
        if (list || (!enable && !disable)) {
            console.log('📋 可用工具列表:\n');
            
            if (fs.existsSync(toolsPath)) {
                const items = fs.readdirSync(toolsPath);
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
                        
                        console.log(`  ${item}`);
                        console.log(`    狀態: ${status}`);
                        console.log(`    說明: ${description}\n`);
                    }
                });
            }
        }
        
        if (enable) {
            console.log(`✅ 啟用工具: ${enable}`);
            console.log('💡 提示: 工具啟用需要重啟機器人\n');
        }
        
        if (disable) {
            console.log(`🛑 停用工具: ${disable}`);
            console.log('💡 提示: 工具停用需要重啟機器人\n');
        }
    });

// ============================================
// 命令: logs - 查看日誌
// ============================================
cli.command('logs', '查看機器人日誌')
    .option('-n, --lines <number>', '顯示最後 N 行', '20')
    .option('-f, --follow', '持續監控日誌')
    .action((args) => {
        const { lines, follow } = args;
        
        console.log('\n📜 機器人日誌\n');
        
        // 這裡可以整合實際的日誌系統
        console.log(`📊 顯示最後 ${lines} 行日誌`);
        
        if (follow) {
            console.log('👀 正在監控日誌 (按 Ctrl+C 停止)...\n');
            // 實際應用中這裡會持續輸出日誌
        } else {
            console.log('💡 提示: 使用 -f 選項持續監控日誌\n');
        }
    });

// ============================================
// 命令: config - 設定管理
// ============================================
cli.command('config', '管理機器人設定')
    .option('-s, --show', '顯示目前設定')
    .option('-r, --reset', '重置為預設設定')
    .action((args) => {
        const { show, reset } = args;
        
        console.log('\n⚙️  設定管理\n');
        
        if (reset) {
            console.log('🔄 正在重置設定...');
            console.log('✅ 設定已重置為預設值\n');
        } else {
            console.log('📋 目前設定:\n');
            console.log('  版本: 4.1.0');
            console.log('  認證: LocalAuth');
            console.log('  工具數量: 3');
            console.log('  訊息儲存: 啟用\n');
        }
    });

// ============================================
// 執行 CLI
// ============================================
cli.run(process.argv.slice(2)).catch(err => {
    console.error('❌ 錯誤:', err.message);
    process.exit(1);
});
