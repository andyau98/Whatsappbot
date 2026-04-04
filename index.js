/**
 * WhatsApp 本地機器人 - 插件管理系統
 *
 * 【功能規格說明】
 * 1. 每個聊天（私聊/群組）獨立管理工具狀態
 * 2. 在一個聊天中啟動的工具，不影響其他聊天
 * 3. 支援多個聊天同時使用不同工具
 * 4. v4.0 新增：分開訊息發送、滑動關聯、群組私聊區分
 *
 * 【使用方式】
 * - 私聊：直接發送指令
 * - 群組：滑動回覆機器人訊息 + 指令
 * - 輸入 "start" 開啟工具選單（所有人可用）
 * - 輸入 "stop" 停止當前聊天的工具（所有人可用）
 * - v4.0：分開訊息發送，滑動特定訊息執行對應功能
 *
 * 【群組指令授權規則】
 * 1. start / stop 指令：所有人都可以使用
 * 2. 其他指令：必須滑動回覆機器人訊息才能使用
 * 3. 滑動回覆其他人訊息：指令被忽略
 *
 * 【v4.0 新功能】
 * 1. 分開訊息發送：每個工具獨立訊息，方便滑動回覆
 * 2. 滑動關聯：滑動特定工具訊息直接執行對應功能
 * 3. 群組私聊區分：群組用滑動回覆，私聊直接輸入
 * 4. 訊息追蹤系統：追蹤每個訊息對應的工具
 *
 * 【跨電腦相容】
 * - 使用動態路徑偵測
 * - 自動適應不同電腦的目錄結構
 *
 * @version 4.0
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

// 滑動回覆接口
const slideReplyInterface = require('./tools/slide-reply-interface');

// 獲取專案根目錄
const PROJECT_ROOT = __dirname;

// 顯示分隔線
function printDivider() {
    console.log('\n' + '='.repeat(60) + '\n');
}

// 顯示時間戳記
function getTimestamp() {
    return new Date().toLocaleString('zh-HK');
}

// ============================================
// 【聊天管理器】每個聊天獨立管理工具狀態
// ============================================

class ChatManager {
    constructor() {
        // 存儲每個聊天的狀態
        // key: chatId, value: { waitingForSelection, activePlugins: Set, messageMap: Map }
        this.chats = new Map();
        
        // v4.0: 訊息追蹤系統
        // key: messageId, value: { toolName, chatId, timestamp }
        this.messageTracker = new Map();
    }

    /**
     * 獲取或創建聊天狀態
     */
    getChatState(chatId) {
        if (!this.chats.has(chatId)) {
            this.chats.set(chatId, {
                waitingForSelection: false,
                activePlugins: new Set()
            });
        }
        return this.chats.get(chatId);
    }

    /**
     * 設置等待選擇狀態
     */
    setWaitingForSelection(chatId, waiting) {
        const state = this.getChatState(chatId);
        state.waitingForSelection = waiting;
    }

    /**
     * 檢查是否正在等待選擇
     */
    isWaitingForSelection(chatId) {
        return this.getChatState(chatId).waitingForSelection;
    }

    /**
     * 添加活動工具
     */
    addActivePlugin(chatId, pluginName) {
        const state = this.getChatState(chatId);
        state.activePlugins.add(pluginName);
    }

    /**
     * 移除活動工具
     */
    removeActivePlugin(chatId, pluginName) {
        const state = this.getChatState(chatId);
        state.activePlugins.delete(pluginName);
    }

    /**
     * 獲取活動工具列表
     */
    getActivePlugins(chatId) {
        return this.getChatState(chatId).activePlugins;
    }

    /**
     * 停止所有活動工具
     */
    stopAllPlugins(chatId) {
        const state = this.getChatState(chatId);
        const plugins = Array.from(state.activePlugins);
        state.activePlugins.clear();
        return plugins;
    }

    /**
     * 檢查是否有活動工具
     */
    hasActivePlugins(chatId) {
        return this.getChatState(chatId).activePlugins.size > 0;
    }

    // ============================================
    // v4.0: 訊息追蹤系統
    // ============================================

    /**
     * 追蹤發出的訊息
     */
    trackMessage(messageId, toolName, chatId) {
        this.messageTracker.set(messageId, {
            toolName: toolName,
            chatId: chatId,
            timestamp: new Date()
        });
        console.log(`[${getTimestamp()}] 📍 v4.0 追蹤訊息: ${messageId} -> ${toolName} [聊天: ${chatId}]`);
    }

    /**
     * 根據訊息ID獲取對應的工具
     */
    getToolByMessageId(messageId) {
        const tracking = this.messageTracker.get(messageId);
        if (tracking) {
            console.log(`[${getTimestamp()}] 🔍 v4.0 找到訊息對應工具: ${messageId} -> ${tracking.toolName}`);
            return tracking.toolName;
        }
        console.log(`[${getTimestamp()}] ⚠️ v4.0 未找到訊息對應工具: ${messageId}`);
        return null;
    }

    /**
     * 清理過期的訊息追蹤（避免記憶體洩漏）
     */
    cleanupExpiredMessages(maxAgeHours = 24) {
        const now = new Date();
        const maxAge = maxAgeHours * 60 * 60 * 1000; // 轉換為毫秒
        
        let cleanedCount = 0;
        for (const [messageId, tracking] of this.messageTracker.entries()) {
            if (now - tracking.timestamp > maxAge) {
                this.messageTracker.delete(messageId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`[${getTimestamp()}] 🧹 v4.0 清理了 ${cleanedCount} 個過期訊息追蹤`);
        }
    }
}

// ============================================
// 【插件管理系統】
// ============================================

class PluginManager {
    constructor() {
        this.plugins = [];
        this.pluginInstances = new Map(); // 存儲每個聊天的工具實例
        this.loadPlugins();
    }

    /**
     * 掃描並載入所有工具
     */
    loadPlugins() {
        const toolsPath = path.join(PROJECT_ROOT, 'tools');

        if (!fs.existsSync(toolsPath)) {
            console.log(`[${getTimestamp()}] ⚠️ tools 資料夾不存在`);
            return;
        }

        const items = fs.readdirSync(toolsPath);

        items.forEach(item => {
            const itemPath = path.join(toolsPath, item);
            const stat = fs.statSync(itemPath);

            // 只處理資料夾（排除 README.md 等檔案）
            if (stat.isDirectory()) {
                const indexPath = path.join(itemPath, 'index.js');
                const readmePath = path.join(itemPath, 'README.md');

                if (fs.existsSync(indexPath)) {
                    let description = '無描述';

                    // 嘗試從 README 獲取描述
                    if (fs.existsSync(readmePath)) {
                        const readme = fs.readFileSync(readmePath, 'utf8');
                        const match = readme.match(/【功能說明】\s*\n\s*(.+)/);
                        if (match) {
                            description = match[1].trim();
                        }
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

    /**
     * 獲取工具列表
     */
    getPluginList() {
        if (this.plugins.length === 0) {
            return '暫無可用工具';
        }

        let list = '🤖 *機器人功能選單*\n\n';
        list += '📖 *使用方法：*\n';
        list += '• 私聊：直接輸入指令\n';
        list += '• 群組：滑動回覆機器人訊息後輸入指令\n\n';
        
        list += '📋 *可用工具：*\n\n';
        this.plugins.forEach((plugin, index) => {
            list += `${index + 1}. *${plugin.name}*\n`;
            list += `   ${plugin.description}\n\n`;
        });
        
        list += '🌤️ *快速指令：*\n';
        list += '• 「今天天氣如何」- 查詢天氣\n';
        list += '• 「香港天氣」- 查詢指定城市天氣\n';
        list += '• 「stop」- 停止所有功能\n\n';
        
        list += '請回覆數字 (1-' + this.plugins.length + ') 選擇工具\n';
        list += '或回覆 "0" 取消';

        return list;
    }

    /**
     * 啟動指定工具（為特定聊天）
     */
    async activatePlugin(index, chatId) {
        if (index < 0 || index >= this.plugins.length) {
            return null;
        }

        const plugin = this.plugins[index];
        const instanceKey = `${chatId}_${plugin.name}`;

        try {
            // 清除 require 快取，確保重新載入
            delete require.cache[require.resolve(plugin.indexPath)];

            // 載入工具
            const PluginClass = require(plugin.indexPath);

            // 為這個聊天創建獨立實例
            const instance = new PluginClass({
                savePath: path.join(PROJECT_ROOT, 'messages', chatId),
                verbose: true,
                chatId: chatId
            });

            // 存儲實例
            this.pluginInstances.set(instanceKey, {
                name: plugin.name,
                description: plugin.description,
                instance: instance,
                chatId: chatId
            });

            return {
                name: plugin.name,
                description: plugin.description,
                instance: instance
            };
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 載入工具失敗:`, error.message);
            return null;
        }
    }

    /**
     * 獲取工具名稱
     */
    getPluginName(index) {
        if (index >= 0 && index < this.plugins.length) {
            return this.plugins[index].name;
        }
        return null;
    }

    /**
     * 獲取特定聊天的工具實例
     */
    getPluginInstance(pluginName, chatId) {
        const instanceKey = `${chatId}_${pluginName}`;
        return this.pluginInstances.get(instanceKey);
    }

    /**
     * 移除特定聊天的工具實例
     */
    removePluginInstance(pluginName, chatId) {
        const instanceKey = `${chatId}_${pluginName}`;
        this.pluginInstances.delete(instanceKey);
    }
}

// 創建管理器實例
const chatManager = new ChatManager();
const pluginManager = new PluginManager();

// ============================================
// 【WhatsApp 客戶端】
// ============================================

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(PROJECT_ROOT, '.wwebjs_auth')
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// 獲取機器人自己的 ID
let botId = null;
let botNumber = null;  // 機器人手機號碼

// 當生成 QR Code 時
client.on('qr', (qr) => {
    printDivider();
    console.log(`[${getTimestamp()}] 📱 請掃描 QR Code 以登入 WhatsApp`);
    console.log('[提示] 打開你的手機 WhatsApp → 設定 → 已連結裝置 → 連結裝置');
    printDivider();
    qrcode.generate(qr, { small: true });
});

// 當客戶端準備就緒時
client.on('ready', async () => {
    const info = client.info;
    botId = info.wid._serialized;
    botNumber = info.wid.user;  // 提取手機號碼

    // v4.0: 啟動定期的訊息追蹤清理
    setInterval(() => {
        chatManager.cleanupExpiredMessages(24); // 每24小時清理一次
    }, 60 * 60 * 1000); // 每小時檢查一次

    printDivider();
    console.log(`[${getTimestamp()}] ✅ WhatsApp 已成功連接並準備就緒！`);
    console.log(`[${getTimestamp()}] 📍 專案根目錄: ${PROJECT_ROOT}`);
    console.log(`[${getTimestamp()}] 🤖 機器人正在運行中...`);
    console.log(`[${getTimestamp()}] 💡 v4.0 新功能已啟用！`);
    console.log(`[${getTimestamp()}] 💡 私聊: 直接發送指令`);
    console.log(`[${getTimestamp()}] 💡 群組: 滑動回覆機器人訊息後輸入指令`);
    console.log(`[${getTimestamp()}] 🚀 輸入 "start" 開啟工具選單（所有人可用）`);
    console.log(`[${getTimestamp()}] 🛑 輸入 "stop" 停止當前聊天的工具（所有人可用）`);
    console.log(`[${getTimestamp()}] 🧠 v3.0: 支援自然語言，如「幫我記住這個」`);
    console.log(`[${getTimestamp()}] 🌤️ v4.0: 分開訊息發送、滑動關聯、群組私聊區分`);
    console.log(`[${getTimestamp()}] 📱 天氣查詢: 「今天天氣如何」、「香港天氣」`);
    console.log(`[${getTimestamp()}] 🔄 v4.0 訊息追蹤系統已啟動`);
    printDivider();
});

// 當收到訊息時
client.on('message_create', async (msg) => {
    const chat = await msg.getChat();
    const contact = await msg.getContact();

    const senderName = contact.pushname || contact.number;
    const messageBody = msg.body.trim();
    const chatType = chat.isGroup ? '群組' : '私聊';
    const chatName = chat.name || '未知';
    const chatId = chat.id._serialized;

    // 顯示訊息（包括自己發送的）
    printDivider();
    if (msg.fromMe) {
        // 自己發送的訊息
        console.log(`[${getTimestamp()}] 📤 發送訊息 [${chatType}]`);
        if (chat.isGroup) {
            console.log(`   群組名稱: ${chatName}`);
        }
        console.log(`   內容: ${messageBody}`);
        printDivider();
        return;  // 不處理自己的訊息，只顯示
    } else {
        // 收到的訊息
        console.log(`[${getTimestamp()}] 📩 收到訊息 [${chatType}]`);
        if (chat.isGroup) {
            console.log(`   群組名稱: ${chatName}`);
        }
        console.log(`   發送者: ${senderName} (${contact.number})`);
        console.log(`   內容: ${messageBody}`);
        printDivider();
    }

    // 檢查滑動回覆（群組指令只接受滑動回覆機器人訊息）
    let isReplyToBot = false;
    let isReplyToOther = false;
    if (msg.hasQuotedMsg) {
        try {
            const quoted = await msg.getQuotedMessage();
            if (quoted.fromMe) {
                isReplyToBot = true;
            } else {
                isReplyToOther = true;
            }
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 檢查滑動回覆失敗:`, error.message);
        }
    }
    
    // 確定測試類型
    let testType = 0;
    if (chat.isGroup) {
        if (isReplyToBot) testType = 1; // 滑動回覆機器人
        else if (isReplyToOther) testType = 2; // 滑動回覆其他人
    }
    
    // 調試日誌：顯示滑動回覆資訊
    if (chat.isGroup) {
        console.log(`[${getTimestamp()}] 🔍 群組指令檢測 [類型: ${testType}] [聊天: ${chatId}]`);
        console.log(`   類型說明: ${testType === 1 ? '1=滑動回覆機器人' : testType === 2 ? '2=滑動回覆其他人' : '0=無滑動回覆'}`);
        console.log(`   isReplyToBot: ${isReplyToBot}`);
        console.log(`   isReplyToOther: ${isReplyToOther}`);
    }

    // ============================================
    // v4.0: 私聊直接指令處理
    // ============================================
    if (!chat.isGroup) {
        console.log(`[${getTimestamp()}] 💬 v4.0 私聊直接指令處理 [聊天: ${chatId}]`);
        
        // 檢查是否有活動的工具支援滑動回覆
        const activePlugins = Array.from(chatManager.getActivePlugins(chatId));
        for (const pluginName of activePlugins) {
            if (slideReplyInterface.hasSlideReplySupport(pluginName)) {
                console.log(`[${getTimestamp()}] 🔄 v4.0 私聊直接處理: ${pluginName} [聊天: ${chatId}]`);
                const processed = await slideReplyInterface.processSlideReply(msg, pluginName, messageBody);
                if (processed) {
                    return;
                }
            }
        }
    }

    // ============================================
    // 【新增：滑動回覆指令處理】
    // ============================================
    let isCommandProcessed = false;
    
    if (msg.hasQuotedMsg) {
        try {
            const quoted = await msg.getQuotedMessage();
            // 檢查是否是回覆機器人自己的訊息
            if (quoted.fromMe) {
                console.log(`[${getTimestamp()}] 💬 v4.0 收到滑動回覆指令 [聊天: ${chatId}]`);
                
                // v4.0: 檢查滑動的是哪個工具的訊息
                const quotedMessageId = quoted.id._serialized;
                const toolName = chatManager.getToolByMessageId(quotedMessageId);
                
                if (toolName && slideReplyInterface.hasSlideReplySupport(toolName)) {
                    console.log(`[${getTimestamp()}] 🔄 v4.0 滑動關聯: ${toolName} [聊天: ${chatId}]`);
                    const processed = await slideReplyInterface.processSlideReply(msg, toolName, messageBody);
                    if (processed) {
                        isCommandProcessed = true;
                        return;
                    }
                }
                
                // 檢查是否有活動的工具支援滑動回覆
                const activePlugins = Array.from(chatManager.getActivePlugins(chatId));
                for (const pluginName of activePlugins) {
                    if (slideReplyInterface.hasSlideReplySupport(pluginName)) {
                        console.log(`[${getTimestamp()}] 🔄 使用滑動回覆接口處理: ${pluginName} [聊天: ${chatId}]`);
                        const processed = await slideReplyInterface.processSlideReply(msg, pluginName, messageBody);
                        if (processed) {
                            isCommandProcessed = true;
                            return;
                        }
                    }
                }
                
                // 解析指令
                const command = messageBody.trim().toLowerCase();
                
                // 處理指令
                switch (command) {
                    case '1':
                    case '自動回覆':
                        // 啟動自動回覆功能
                        // 根據工具列表順序，auto-reply 是第 1 個工具（索引 0）
                        const autoReplyIndex = 0; // 直接使用索引位置
                        if (autoReplyIndex >= 0 && autoReplyIndex < pluginManager.plugins.length) {
                            const plugin = await pluginManager.activatePlugin(autoReplyIndex, chatId);
                            if (plugin) {
                                chatManager.addActivePlugin(chatId, 'auto-reply');
                                await msg.reply('✅ 已啟動自動回覆\n\n功能：自動回覆收到的訊息');
                                console.log(`[${getTimestamp()}] ✅ 已啟動自動回覆功能 [聊天: ${chatId}]`);
                            } else {
                                await msg.reply('❌ 啟動自動回覆功能失敗');
                            }
                        } else {
                            await msg.reply('❌ 自動回覆功能不存在');
                        }
                        // 重置等待選擇狀態，避免觸發工具選擇處理
                        chatManager.setWaitingForSelection(chatId, false);
                        isCommandProcessed = true;
                        return;
                        
                    case '2':
                    case '記錄':
                    case '記錄訊息':
                    case '開始記錄':
                        // 啟動記錄訊息功能（msg-extractor）
                        // 根據工具列表順序，msg-extractor 是第 2 個工具（索引 1）
                        const msgExtractorIndex = 1; // 直接使用索引位置
                        if (msgExtractorIndex >= 0 && msgExtractorIndex < pluginManager.plugins.length) {
                            const plugin = await pluginManager.activatePlugin(msgExtractorIndex, chatId);
                            if (plugin) {
                                chatManager.addActivePlugin(chatId, 'msg-extractor');
                                await msg.reply('✅ 已啟動記錄訊息\n\n功能：提取並儲存 WhatsApp 訊息到本地');
                                console.log(`[${getTimestamp()}] ✅ 已啟動記錄訊息功能 [聊天: ${chatId}]`);
                            } else {
                                await msg.reply('❌ 啟動記錄訊息功能失敗');
                            }
                        } else {
                            await msg.reply('❌ 記錄訊息功能不存在');
                        }
                        // 重置等待選擇狀態，避免觸發工具選擇處理
                        chatManager.setWaitingForSelection(chatId, false);
                        isCommandProcessed = true;
                        return;
                        

                        
                    case '0':
                    case '取消':
                    case '停止':
                    case '關閉':
                        // 停止所有功能
                        if (chatManager.hasActivePlugins(chatId)) {
                            const stoppedPlugins = chatManager.stopAllPlugins(chatId);
                            stoppedPlugins.forEach(pluginName => {
                                pluginManager.removePluginInstance(pluginName, chatId);
                            });
                            await msg.reply('🛑 已停止所有功能');
                            console.log(`[${getTimestamp()}] ✅ 已停止所有功能 [聊天: ${chatId}]`);
                        } else {
                            await msg.reply('ℹ️ 目前無執行中功能');
                        }
                        // 重置等待選擇狀態，避免觸發工具選擇處理
                        chatManager.setWaitingForSelection(chatId, false);
                        isCommandProcessed = true;
                        return;
                        
                    case '狀態':
                        // 顯示狀態
                        const activePlugins = Array.from(chatManager.getActivePlugins(chatId));
                        if (activePlugins.length > 0) {
                            await msg.reply(`📊 目前執行中功能：\n${activePlugins.map(p => `• ${p}`).join('\n')}`);
                        } else {
                            await msg.reply('📊 目前無執行中功能');
                        }
                        console.log(`[${getTimestamp()}] ✅ 已顯示狀態 [聊天: ${chatId}]`);
                        // 重置等待選擇狀態，避免觸發工具選擇處理
                        chatManager.setWaitingForSelection(chatId, false);
                        isCommandProcessed = true;
                        return;
                        
                    case '選單':
                        // 重新顯示功能說明
                        const featureMenu = `🤖 機械人功能說明\n\n請滑動回覆這條訊息來下指令：\n1=自動回覆 2=記錄訊息 0=停止所有\n\n各工具說明：\n1. 自動回覆 (auto-reply)：自動回覆收到的訊息\n2. 記錄訊息 (msg-extractor)：提取並儲存 WhatsApp 訊息到本地\n\n也可以直接輸入：\n- start → 開啟工具選單\n- stop → 停止所有功能`;
                        await msg.reply(featureMenu);
                        console.log(`[${getTimestamp()}] ✅ 已重新顯示功能說明 [聊天: ${chatId}]`);
                        // 重置等待選擇狀態，避免觸發工具選擇處理
                        chatManager.setWaitingForSelection(chatId, false);
                        isCommandProcessed = true;
                        return;
                }
            }
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 處理滑動回覆失敗:`, error.message);
        }
    }
    
    // 如果是指令消息，跳過後續工具處理
    if (isCommandProcessed) {
        return;
    }

    // ============================================
    // 【群組指令授權檢查】
    // ============================================
    // 在群組中，只有以下情況才處理指令：
    // 1. 滑動回覆機器人的訊息
    // 2. start / stop 指令（所有人都可以使用）
    const isStartOrStop = messageBody.toLowerCase() === 'start' || 
                          messageBody.toLowerCase() === 'stop' ||
                          messageBody.toLowerCase().includes('start') ||
                          messageBody.toLowerCase().includes('stop');
    
    if (chat.isGroup) {
        if (testType === 1 || isStartOrStop) {
            console.log(`[${getTimestamp()}] ✅ 類型 ${testType}: 群組指令已授權 (滑動回覆機器人或 start/stop) [聊天: ${chatId}]`);
        } else {
            console.log(`[${getTimestamp()}] ❌ 類型 ${testType}: 群組訊息未滑動回覆機器人，忽略指令 [聊天: ${chatId}]`);
            return; // 不處理這個訊息
        }
    }

    // ============================================
    // 【測試指令處理】
    // ============================================
    // 處理測試指令: test1, test2
    // test1: 滑動回覆機器人
    // test2: 滑動回覆其他人
    const testMatch = messageBody.match(/^test([12])$/i);
    if (testMatch) {
        const testNum = testMatch[1];
        const testTypes = {
            '1': '滑動回覆機器人',
            '2': '滑動回覆其他人'
        };

        console.log(`[${getTimestamp()}] 🧪 收到測試指令 test${testNum} [類型: ${testTypes[testNum]}] [聊天: ${chatId}]`);
        console.log(`[${getTimestamp()}] 🧪 當前檢測狀態: testType=${testType}, isReplyToBot=${isReplyToBot}`);

        // 根據測試類型驗證
        let isValid = false;
        if (testNum === '1' && testType === 1) isValid = true;  // 滑動回覆機器人
        else if (testNum === '2' && testType === 2) isValid = true;  // 滑動回覆其他人

        if (isValid) {
            const successMsg = `✅ *測試 ${testNum} 成功！*\n\n` +
                `📋 類型: ${testTypes[testNum]}\n` +
                `🔍 檢測結果: 正確 ✓\n\n` +
                `---\n` +
                `📝 下一步:\n` +
                (testNum === '1' ? '請繼續測試 2: 滑動回覆其他人訊息 + test2' :
                 '✨ 所有測試完成！系統正常運作。');
            await msg.reply(successMsg);
            console.log(`[${getTimestamp()}] ✅ 測試 ${testNum} 成功！類型檢測正確`);
        } else {
            const failMsg = `❌ *測試 ${testNum} 失敗！*\n\n` +
                `📋 預期類型: ${testTypes[testNum]}\n` +
                `🔍 實際類型: ${testType}\n\n` +
                `💡 請檢查操作方式後重試。\n` +
                (testNum === '1' ? '提示: 請滑動回覆機器人的訊息' :
                 '提示: 請滑動回覆其他人的訊息');
            await msg.reply(failMsg);
            console.log(`[${getTimestamp()}] ❌ 測試 ${testNum} 失敗！預期類型=${testNum}, 實際類型=${testType}`);
        }
        return;
    }

    // ============================================
    // 【指令處理區】
    // ============================================

    // 處理 "start" 指令 - 顯示工具選單 (v4.0 分開訊息發送)
    // 群組中必須滑動回覆機器人的訊息才會回應
    if (messageBody.toLowerCase() === 'start' || messageBody.toLowerCase().includes('start')) {
        console.log(`[${getTimestamp()}] 🚀 v4.0 用戶請求工具選單 [聊天: ${chatId}]`);

        // v4.0: 分開發送多個訊息，每個工具一個訊息
        const menuMessage = await msg.reply('🤖 *機器人功能選單 v4.0*\n\n📖 請選擇您要使用的功能：');
        
        // 發送每個工具的詳細介紹（分開訊息）並追蹤
        for (let i = 0; i < pluginManager.plugins.length; i++) {
            const plugin = pluginManager.plugins[i];
            const toolMessage = `\n${i + 1}. *${plugin.name}*\n` +
                              `   ${plugin.description}\n` +
                              `   💡 滑動回覆此訊息即可使用`;
            
            const sentMessage = await msg.reply(toolMessage);
            
            // v4.0: 追蹤這個訊息對應的工具
            if (sentMessage && sentMessage.id) {
                chatManager.trackMessage(sentMessage.id._serialized, plugin.name, chatId);
            }
        }
        
        // 發送操作指引（分開訊息）
        const usageMessage = `\n🌤️ *快速指令*\n` +
                           `• 天氣查詢：滑動回覆天氣工具訊息後輸入城市名稱\n` +
                           `• 自動回覆：滑動回覆自動回覆工具訊息後輸入指令\n\n` +
                           `💡 *v4.0 新功能*\n` +
                           `• 分開訊息發送，每個工具獨立\n` +
                           `• 滑動關聯：滑動特定訊息執行對應功能\n` +
                           `• 群組/私聊區分：群組用滑動回覆，私聊直接輸入`;
        
        await msg.reply(usageMessage);

        // 設置這個聊天的等待選擇狀態
        chatManager.setWaitingForSelection(chatId, true);

        console.log(`[${getTimestamp()}] ✅ v4.0 已發送分開的工具列表 [聊天: ${chatId}]`);
        return;
    }

    // 處理工具選擇（每個聊天獨立）
    if (chatManager.isWaitingForSelection(chatId)) {
        // 提取數字（只匹配 0-9 的單個數字，避免匹配長數字 ID）
        const numericMatch = messageBody.match(/\b[0-9]\b/);
        const selection = numericMatch ? parseInt(numericMatch[0]) : NaN;

        if (messageBody === '0' || (numericMatch && numericMatch[0] === '0')) {
            chatManager.setWaitingForSelection(chatId, false);
            await msg.reply('已取消工具選擇');
            console.log(`[${getTimestamp()}] ℹ️ 用戶取消選擇 [聊天: ${chatId}]`);
            return;
        }

        if (!isNaN(selection) && selection > 0) {
            const pluginIndex = selection - 1;
            const pluginName = pluginManager.getPluginName(pluginIndex);

            if (pluginName) {
                console.log(`[${getTimestamp()}] 🔄 正在啟動工具: ${pluginName} [聊天: ${chatId}]`);
                await msg.reply(`正在啟動 ${pluginName}...`);

                const plugin = await pluginManager.activatePlugin(pluginIndex, chatId);

                if (plugin) {
                    await msg.reply(`✅ ${pluginName} 已啟動\n\n功能：${plugin.description}\n\n此工具僅在當前聊天生效。`);
                    console.log(`[${getTimestamp()}] ✅ 工具 ${pluginName} 啟動成功 [聊天: ${chatId}]`);

                    // 記錄這個聊天的活動工具
                    chatManager.addActivePlugin(chatId, pluginName);
                } else {
                    await msg.reply(`❌ 啟動 ${pluginName} 失敗，請稍後再試`);
                    console.log(`[${getTimestamp()}] ❌ 工具 ${pluginName} 啟動失敗 [聊天: ${chatId}]`);
                }

                chatManager.setWaitingForSelection(chatId, false);
                return;
            } else {
                // 數字超出範圍
                await msg.reply('無效的選擇，請輸入正確的數字（1-' + pluginManager.plugins.length + '）');
                console.log(`[${getTimestamp()}] ⚠️ 用戶輸入無效數字: ${selection} [聊天: ${chatId}]`);
                // 保持 waitingForSelection 狀態，讓用戶重新輸入
                return;
            }
        }

        // 輸入的不是有效數字，取消選擇狀態
        chatManager.setWaitingForSelection(chatId, false);
        await msg.reply('已取消工具選擇（輸入無效）');
        console.log(`[${getTimestamp()}] ℹ️ 用戶輸入非數字，取消選擇 [聊天: ${chatId}]`);
        return;
    }

    // 處理 "stop" 指令 - 停止當前聊天的工具
    if (messageBody.toLowerCase() === 'stop' || messageBody.toLowerCase().includes('stop')) {
        console.log(`[${getTimestamp()}] 🛑 用戶請求停止工具 [聊天: ${chatId}]`);

        // 停止這個聊天的所有活動工具
        if (chatManager.hasActivePlugins(chatId)) {
            const stoppedPlugins = chatManager.stopAllPlugins(chatId);
            
            // 清理工具實例
            stoppedPlugins.forEach(pluginName => {
                pluginManager.removePluginInstance(pluginName, chatId);
            });
            
            await msg.reply(`✅ 已停止工具：${stoppedPlugins.join(', ')}`);
            console.log(`[${getTimestamp()}] ✅ 已停止工具：${stoppedPlugins.join(', ')} [聊天: ${chatId}]`);
        } else {
            await msg.reply('ℹ️ 當前聊天沒有運行中的工具');
            console.log(`[${getTimestamp()}] ℹ️ 當前聊天沒有運行中的工具 [聊天: ${chatId}]`);
        }
        return;
    }

    // ============================================
    // 【工具訊息處理】每個聊天的工具獨立處理
    // ============================================

    // 檢查這個聊天是否有活動的工具
    if (chatManager.hasActivePlugins(chatId)) {
        const activePlugins = chatManager.getActivePlugins(chatId);
        
        for (const pluginName of activePlugins) {
            const pluginData = pluginManager.getPluginInstance(pluginName, chatId);
            
            if (pluginData && pluginData.instance && pluginData.instance.processMessage) {
                try {
                    await pluginData.instance.processMessage(msg);
                } catch (error) {
                    console.error(`[${getTimestamp()}] ❌ 工具 ${pluginName} 處理訊息失敗 [聊天: ${chatId}]:`, error.message);
                }
            }
        }
    }

    // ============================================
    // 【預設指令】
    // ============================================

    // 指令：!test（系統測試指令）
    if (messageBody === '!test' || messageBody.includes('!test')) {
        console.log(`[${getTimestamp()}] 📝 處理 !test 指令 [聊天: ${chatId}]`);

        try {
            await msg.reply('已連接，可互動');
            console.log(`[${getTimestamp()}] ✅ 已回覆: 「已連接，可互動」 [聊天: ${chatId}]`);
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 回覆失敗:`, error.message);
        }
        return;
    }

    // 其他訊息 - 只顯示不處理
    console.log(`[${getTimestamp()}] ℹ️ 訊息已顯示，等待後續處理 [聊天: ${chatId}]`);
});

// 當客戶端斷開連接時
client.on('disconnected', (reason) => {
    printDivider();
    console.log(`[${getTimestamp()}] ⚠️ WhatsApp 已斷開連接`);
    console.log(`   原因: ${reason}`);
    console.log(`[${getTimestamp()}] 🔄 請重新啟動程式以重新連接`);
    printDivider();
    process.exit(0);
});

// 當認證狀態改變時
client.on('authenticated', () => {
    console.log(`[${getTimestamp()}] 🔐 認證成功！正在建立連接...`);
});

// 當認證失敗時
client.on('auth_failure', (msg) => {
    console.error(`[${getTimestamp()}] ❌ 認證失敗:`, msg);
});

// 當載入畫面時
client.on('loading_screen', (percent, message) => {
    console.log(`[${getTimestamp()}] ⏳ 載入中... ${percent}% - ${message}`);
});

// 啟動客戶端
console.log('\n');
console.log('╔' + '═'.repeat(58) + '╗');
console.log('║' + ' '.repeat(12) + 'WhatsApp 機器人插件系統啟動中' + ' '.repeat(12) + '║');
console.log('╚' + '═'.repeat(58) + '╝');
console.log('\n');

client.initialize();
