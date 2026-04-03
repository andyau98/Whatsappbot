/**
 * WhatsApp Bot v4.1 - 重構版本
 * 移除 auto-reply 工具，優化代碼結構
 * 
 * @version 4.1
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

// 滑動回覆接口 - 引用根目錄工具
const slideReplyInterface = require('../tools/slide-reply-interface/r2');

// 常量定義
const PROJECT_ROOT = __dirname;
const COMMANDS = {
    START: 'start',
    STOP: 'stop',
    STATUS: '狀態',
    MENU: '選單'
};

// 城市映射
const CITY_MAP = {
    '香港': 'Hong Kong', '台北': 'Taipei', '東京': 'Tokyo', '倫敦': 'London',
    '北京': 'Beijing', '上海': 'Shanghai', '廣州': 'Guangzhou', '深圳': 'Shenzhen',
    '新加坡': 'Singapore', '紐約': 'New York', '巴黎': 'Paris', '悉尼': 'Sydney'
};

// ============================================
// 工具函數
// ============================================

const printDivider = () => console.log('\n' + '='.repeat(60) + '\n');
const getTimestamp = () => new Date().toLocaleString('zh-HK');

/**
 * 處理天氣查詢
 */
async function handleWeatherCommand(messageBody, msg, chatId) {
    const cityPatterns = [
        /(香港|台北|東京|倫敦|北京|上海|廣州|深圳|新加坡|紐約|巴黎|悉尼)/,
        /weather\s+(?:in|at|for)\s+(\w+)/i,
        /(\w+)\s+weather/i
    ];
    
    let city = 'Hong Kong';
    for (const pattern of cityPatterns) {
        const match = messageBody.match(pattern);
        if (match) {
            city = CITY_MAP[match[1]] || match[1];
            break;
        }
    }
    
    try {
        console.log(`[${getTimestamp()}] 🧠 智能識別天氣查詢: ${city} [聊天: ${chatId}]`);
        await msg.reply(`🌤️ 正在查詢 ${city} 的天氣...`);
        
        const WeatherTool = require('../tools/weather/r2');
        const weatherTool = new WeatherTool({ verbose: false });
        const weatherInfo = await weatherTool.run(city);
        
        await msg.reply(weatherInfo);
        console.log(`[${getTimestamp()}] ✅ 智能查詢天氣成功: ${city} [聊天: ${chatId}]`);
        return true;
    } catch (error) {
        await msg.reply(`❌ 查詢天氣失敗: ${error.message}`);
        console.error(`[${getTimestamp()}] ❌ 天氣查詢失敗:`, error.message);
        return true;
    }
}

// ============================================
// 聊天管理器
// ============================================

class ChatManager {
    constructor() {
        this.chats = new Map();
        this.messageTracker = new Map();
    }

    getChatState(chatId) {
        if (!this.chats.has(chatId)) {
            this.chats.set(chatId, {
                waitingForSelection: false,
                activePlugins: new Set()
            });
        }
        return this.chats.get(chatId);
    }

    addActivePlugin(chatId, pluginName) {
        this.getChatState(chatId).activePlugins.add(pluginName);
    }

    removeActivePlugin(chatId, pluginName) {
        this.getChatState(chatId).activePlugins.delete(pluginName);
    }

    getActivePlugins(chatId) {
        return this.getChatState(chatId).activePlugins;
    }

    stopAllPlugins(chatId) {
        const state = this.getChatState(chatId);
        const plugins = Array.from(state.activePlugins);
        state.activePlugins.clear();
        return plugins;
    }

    hasActivePlugins(chatId) {
        return this.getChatState(chatId).activePlugins.size > 0;
    }

    trackMessage(messageId, toolName, chatId) {
        this.messageTracker.set(messageId, {
            toolName: toolName,
            chatId: chatId,
            timestamp: new Date()
        });
        console.log(`[${getTimestamp()}] 📍 追蹤訊息: ${messageId} -> ${toolName} [聊天: ${chatId}]`);
    }

    getToolByMessageId(messageId) {
        const tracking = this.messageTracker.get(messageId);
        return tracking ? tracking.toolName : null;
    }

    cleanupExpiredMessages(maxAgeHours = 24) {
        const now = new Date();
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        let cleanedCount = 0;
        
        for (const [messageId, tracking] of this.messageTracker.entries()) {
            if (now - tracking.timestamp > maxAge) {
                this.messageTracker.delete(messageId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`[${getTimestamp()}] 🧹 清理了 ${cleanedCount} 個過期訊息追蹤`);
        }
    }
}

// ============================================
// 插件管理器
// ============================================

class PluginManager {
    constructor() {
        this.plugins = [];
        this.pluginInstances = new Map();
        this.loadPlugins();
    }

    loadPlugins() {
        const toolsPath = path.join(PROJECT_ROOT, 'tools');
        if (!fs.existsSync(toolsPath)) return;

        const items = fs.readdirSync(toolsPath);
        items.forEach(item => {
            const itemPath = path.join(toolsPath, item);
            if (fs.statSync(itemPath).isDirectory()) {
                const indexPath = path.join(itemPath, 'index.js');
                const readmePath = path.join(itemPath, 'README.md');

                if (fs.existsSync(indexPath)) {
                    let description = '無描述';
                    if (fs.existsSync(readmePath)) {
                        const readme = fs.readFileSync(readmePath, 'utf8');
                        const match = readme.match(/【功能說明】\s*\n\s*(.+)/);
                        if (match) description = match[1].trim();
                    }

                    this.plugins.push({
                        name: item,
                        path: itemPath,
                        indexPath: indexPath,
                        description: description
                    });
                }
            }
        });

        console.log(`[${getTimestamp()}] 📦 已載入 ${this.plugins.length} 個工具`);
    }

    async activatePlugin(index, chatId) {
        if (index < 0 || index >= this.plugins.length) return null;

        const plugin = this.plugins[index];
        const instanceKey = `${chatId}_${plugin.name}`;

        try {
            delete require.cache[require.resolve(plugin.indexPath)];
            const PluginClass = require(plugin.indexPath);
            const instance = new PluginClass({
                savePath: path.join(PROJECT_ROOT, 'messages', chatId),
                verbose: true,
                chatId: chatId
            });

            this.pluginInstances.set(instanceKey, {
                name: plugin.name,
                description: plugin.description,
                instance: instance,
                chatId: chatId
            });

            return { name: plugin.name, description: plugin.description, instance };
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 載入工具失敗:`, error.message);
            return null;
        }
    }

    getPluginInstance(pluginName, chatId) {
        return this.pluginInstances.get(`${chatId}_${pluginName}`);
    }

    removePluginInstance(pluginName, chatId) {
        this.pluginInstances.delete(`${chatId}_${pluginName}`);
    }
}

// ============================================
// 主程式
// ============================================

const chatManager = new ChatManager();
const pluginManager = new PluginManager();

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(PROJECT_ROOT, '.wwebjs_auth') }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

let botId = null;

// QR Code 生成
client.on('qr', (qr) => {
    printDivider();
    console.log(`[${getTimestamp()}] 📱 請掃描 QR Code 以登入 WhatsApp`);
    printDivider();
    qrcode.generate(qr, { small: true });
});

// 客戶端就緒
client.on('ready', async () => {
    botId = client.info.wid._serialized;
    setInterval(() => chatManager.cleanupExpiredMessages(24), 60 * 60 * 1000);
    
    printDivider();
    console.log(`[${getTimestamp()}] ✅ WhatsApp v4.1 已就緒！`);
    console.log(`[${getTimestamp()}] 🤖 機器人正在運行中...`);
    console.log(`[${getTimestamp()}] 💡 輸入 "start" 開啟工具選單`);
    printDivider();
});

// 訊息處理
client.on('message_create', async (msg) => {
    if (msg.fromMe) return;

    const chat = await msg.getChat();
    const chatId = chat.id._serialized;
    const messageBody = msg.body.trim();

    if (!messageBody) return;

    console.log(`[${getTimestamp()}] 📩 新訊息 [聊天: ${chatId}]`);

    // 檢測滑動回覆
    let testType = 0;
    if (msg.hasQuotedMsg) {
        try {
            const quoted = await msg.getQuotedMessage();
            testType = quoted.fromMe ? 1 : 2;
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 檢查滑動回覆失敗:`, error.message);
        }
    }

    // 智能指令優先處理（無需授權）
    try {
        const SmartCommand = require('../tools/smart-command');
        const smartCommand = new SmartCommand({ verbose: false, chatId });
        const parseResult = smartCommand.parse(messageBody);

        if (parseResult.matched && parseResult.command === 'weather/r2') {
            const handled = await handleWeatherCommand(messageBody, msg, chatId);
            if (handled) return;
        }
    } catch (error) {
        console.error(`[${getTimestamp()}] ❌ 智能指令處理失敗:`, error.message);
    }

    // 群組授權檢查
    const isStartOrStop = messageBody.toLowerCase() === COMMANDS.START || 
                          messageBody.toLowerCase() === COMMANDS.STOP;
    const isStatusOrMenu = messageBody === COMMANDS.STATUS || messageBody === COMMANDS.MENU;
    const isGeminiCommand = messageBody.startsWith('/gemini ') || messageBody.startsWith('/ai ');

    if (chat.isGroup && testType !== 1 && !isStartOrStop && !isStatusOrMenu && !isGeminiCommand) {
        console.log(`[${getTimestamp()}] ❌ 群組訊息未授權，忽略 [聊天: ${chatId}]`);
        return;
    }

    // 發送工具選單函數
    async function sendToolMenu() {
        const sentMessages = [];
        try {
            await msg.reply('🤖 *機器人功能選單*\n\n📖 請滑動回覆下方工具訊息直接使用：');

            for (let i = 0; i < pluginManager.plugins.length; i++) {
                const plugin = pluginManager.plugins[i];
                try {
                    const toolMessage = `\n${i + 1}. *${plugin.name}*\n   ${plugin.description}\n   💡 滑動回覆此訊息直接使用`;
                    const sentMessage = await msg.reply(toolMessage);
                    if (sentMessage?.id) {
                        chatManager.trackMessage(sentMessage.id._serialized, plugin.name, chatId);
                        sentMessages.push({ id: sentMessage.id._serialized, tool: plugin.name });
                    }
                } catch (sendError) {
                    console.error(`[${getTimestamp()}] ❌ 發送工具 ${plugin.name} 訊息失敗:`, sendError.message);
                }
            }

            // 主頁和停止訊息
            for (const [name, text] of [['主頁', '🏠 *主頁*\n   返回功能選單'], ['停止', '🛑 *停止所有功能*\n   停止當前所有運行中的工具']]) {
                try {
                    const sentMessage = await msg.reply(`\n${text}\n   💡 滑動回覆此訊息${name === '主頁' ? '返回主頁' : '停止所有功能'}`);
                    if (sentMessage?.id) {
                        chatManager.trackMessage(sentMessage.id._serialized, name, chatId);
                        sentMessages.push({ id: sentMessage.id._serialized, tool: name });
                    }
                } catch (sendError) {
                    console.error(`[${getTimestamp()}] ❌ 發送${name}訊息失敗:`, sendError.message);
                }
            }

            await msg.reply('\n💡 *使用說明*\n• 滑動回覆上方任意工具訊息即可直接使用\n• 無需輸入數字或額外指令\n• 輸入 "start" 可重新顯示此選單');
            console.log(`[${getTimestamp()}] ✅ 已發送工具選單，追蹤 ${sentMessages.length} 個訊息 [聊天: ${chatId}]`);
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 發送工具選單失敗:`, error.message);
            await msg.reply('❌ 發送選單失敗，請稍後重試');
        }
    }

    // 滑動回覆處理
    if (msg.hasQuotedMsg) {
        try {
            const quoted = await msg.getQuotedMessage();
            if (quoted.fromMe) {
                const toolName = chatManager.getToolByMessageId(quoted.id._serialized);
                
                if (toolName) {
                    console.log(`[${getTimestamp()}] 🔄 滑動啟動工具: ${toolName} [聊天: ${chatId}]`);

                    if (toolName === '主頁') {
                        await msg.reply('🏠 返回主頁...');
                        await sendToolMenu();
                        return;
                    }

                    if (toolName === '停止') {
                        if (chatManager.hasActivePlugins(chatId)) {
                            const stoppedPlugins = chatManager.stopAllPlugins(chatId);
                            stoppedPlugins.forEach(name => {
                                try {
                                    pluginManager.removePluginInstance(name, chatId);
                                } catch (e) {
                                    console.error(`[${getTimestamp()}] ❌ 清理實例失敗 ${name}:`, e.message);
                                }
                            });
                            await msg.reply('🛑 已停止所有功能');
                        } else {
                            await msg.reply('ℹ️ 目前沒有執行中的功能');
                        }
                        return;
                    }

                    // 啟動工具
                    const pluginIndex = pluginManager.plugins.findIndex(p => p.name === toolName);
                    if (pluginIndex !== -1) {
                        try {
                            const plugin = await pluginManager.activatePlugin(pluginIndex, chatId);
                            if (plugin?.instance) {
                                chatManager.addActivePlugin(chatId, toolName);
                                await msg.reply(`✅ 已啟動 ${toolName}\n\n功能：${plugin.description}\n\n💡 現在可以直接輸入指令使用此工具`);
                                console.log(`[${getTimestamp()}] ✅ 滑動啟動工具成功: ${toolName} [聊天: ${chatId}]`);
                            } else {
                                await msg.reply(`❌ 啟動 ${toolName} 失敗：工具實例創建失敗`);
                            }
                        } catch (error) {
                            await msg.reply(`❌ 啟動 ${toolName} 失敗：${error.message}`);
                            console.error(`[${getTimestamp()}] ❌ 啟動 ${toolName} 失敗:`, error.message);
                        }
                    }
                    return;
                }
            }
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 處理滑動回覆失敗:`, error.message);
        }
    }

    // 一般指令處理
    const command = messageBody.toLowerCase();

    if (command === COMMANDS.START) {
        await sendToolMenu();
        return;
    }

    if (command === COMMANDS.STOP) {
        try {
            if (chatManager.hasActivePlugins(chatId)) {
                const stoppedPlugins = chatManager.stopAllPlugins(chatId);
                stoppedPlugins.forEach(name => {
                    try {
                        pluginManager.removePluginInstance(name, chatId);
                    } catch (e) {
                        console.error(`[${getTimestamp()}] ❌ 清理實例失敗 ${name}:`, e.message);
                    }
                });
                await msg.reply(`✅ 已停止工具：${stoppedPlugins.join(', ')}`);
            } else {
                await msg.reply('ℹ️ 當前聊天沒有運行中的工具');
            }
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 停止工具失敗:`, error.message);
            await msg.reply(`❌ 停止工具失敗：${error.message}`);
        }
        return;
    }

    if (messageBody === COMMANDS.STATUS) {
        const activePlugins = Array.from(chatManager.getActivePlugins(chatId));
        if (activePlugins.length > 0) {
            await msg.reply(`📊 目前執行中功能：\n${activePlugins.map(p => `• ${p}`).join('\n')}`);
        } else {
            await msg.reply('📊 目前無執行中功能');
        }
        return;
    }

    if (messageBody === COMMANDS.MENU) {
        await sendToolMenu();
        return;
    }

    // 豆包 AI 指令處理
    if (messageBody.startsWith('/doubao ') || messageBody.startsWith('/db ')) {
        const prompt = messageBody.replace(/^\/doubao\s+|^\/db\s+/, '');
        
        if (!prompt) {
            await msg.reply('💡 用法: /doubao 你的問題\n例如: /doubao 香港今天天氣如何？');
            return;
        }

        try {
            console.log(`[${getTimestamp()}] 🤖 豆包 AI 請求: ${prompt.substring(0, 50)}... [聊天: ${chatId}]`);
            await msg.reply('🤔 豆包正在思考...');
            
            const DoubaoAiTool = require('../tools/doubao-ai/r1');
            const doubaoTool = new DoubaoAiTool({ verbose: false, timeout: 30000 });
            const response = await doubaoTool.ask(prompt);
            
            // 限制回應長度
            let replyText = `🤖 *豆包 AI*\n\n${response}`;
            if (replyText.length > 4000) {
                replyText = replyText.substring(0, 3900) + '\n\n... (訊息已截斷)';
            }
            
            await msg.reply(replyText);
            console.log(`[${getTimestamp()}] ✅ 豆包 AI 回應完成 [聊天: ${chatId}]`);
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 豆包 AI 錯誤:`, error.message);
            await msg.reply(`❌ 豆包 AI 請求失敗: ${error.message}\n\n請確保:\n1. OpenCLI 已正確安裝\n2. 豆包 (doubao-app) 已配置`);
        }
        return;
    }

    // 工具訊息處理
    if (chatManager.hasActivePlugins(chatId)) {
        for (const pluginName of chatManager.getActivePlugins(chatId)) {
            const pluginData = pluginManager.getPluginInstance(pluginName, chatId);
            if (pluginData?.instance?.processMessage) {
                try {
                    await pluginData.instance.processMessage(msg);
                } catch (error) {
                    console.error(`[${getTimestamp()}] ❌ 工具 ${pluginName} 處理訊息失敗:`, error.message);
                }
            }
        }
    }
});

// 斷開連接
client.on('disconnected', (reason) => {
    printDivider();
    console.log(`[${getTimestamp()}] ⚠️ WhatsApp 已斷開連接: ${reason}`);
    printDivider();
    process.exit(0);
});

client.on('authenticated', () => console.log(`[${getTimestamp()}] 🔐 認證成功！`));
client.on('auth_failure', (msg) => console.error(`[${getTimestamp()}] ❌ 認證失敗:`, msg));

// 啟動
console.log('\n╔' + '═'.repeat(58) + '╗');
console.log('║' + ' '.repeat(15) + 'WhatsApp Bot v4.1 啟動中' + ' '.repeat(15) + '║');
console.log('╚' + '═'.repeat(58) + '╝\n');

client.initialize();
