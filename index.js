/**
 * WhatsApp 本地機器人 - 插件管理系統
 *
 * 【功能規格說明】
 * 1. 每個聊天（私聊/群組）獨立管理工具狀態
 * 2. 在一個聊天中啟動的工具，不影響其他聊天
 * 3. 支援多個聊天同時使用不同工具
 * 4. v3.0 新增：智能指令解析，支援自然語言操作
 *
 * 【使用方式】
 * - 私聊：直接發送指令
 * - 群組：@機器人名稱 + 指令
 * - 輸入 "start" 開啟工具選單
 * - 輸入 "stop" 停止當前聊天的工具
 * - v3.0：直接用自然語言操作，如「幫我記住這個」
 *
 * 【跨電腦相容】
 * - 使用動態路徑偵測
 * - 自動適應不同電腦的目錄結構
 *
 * @version 3.0
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

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
        // key: chatId, value: { waitingForSelection, activePlugins: Set }
        this.chats = new Map();
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

        let list = '\n📋 可用工具列表：\n\n';
        this.plugins.forEach((plugin, index) => {
            list += `${index + 1}. ${plugin.name}\n`;
            list += `   ${plugin.description}\n\n`;
        });
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

    printDivider();
    console.log(`[${getTimestamp()}] ✅ WhatsApp 已成功連接並準備就緒！`);
    console.log(`[${getTimestamp()}] 📍 專案根目錄: ${PROJECT_ROOT}`);
    console.log(`[${getTimestamp()}] 🤖 機器人正在運行中...`);
    console.log(`[${getTimestamp()}] 💡 私聊: 直接發送指令`);
    console.log(`[${getTimestamp()}] 💡 群組: 直接發送指令（無需@提及）`);
    console.log(`[${getTimestamp()}] 🚀 輸入 "start" 開啟工具選單`);
    console.log(`[${getTimestamp()}] 🛑 輸入 "stop" 停止當前聊天的工具`);
    console.log(`[${getTimestamp()}] 🧠 v3.0: 支援自然語言，如「幫我記住這個」`);
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

    // 檢查群組 @提及（群組指令需要 @提及）
    const hasMention = msg.mentionedIds && msg.mentionedIds.length > 0;
    
    // 檢查是否@機械人自己（而不是@其他用戶）
    // 注意：msg.mentionedIds 可能包含字串或物件，需要轉換為字串比較
    const isMentioningBotById = hasMention && botId && msg.mentionedIds.some(id => {
        const idStr = typeof id === 'string' ? id : (id._serialized || id.toString());
        return idStr === botId;
    });
    
    // 檢查訊息內容是否包含機械人手機號碼（備用檢測方式）
    const isMentioningBotByNumber = botNumber && messageBody.includes(botNumber);
    
    // 檢查是否只有一個@提及（簡化判斷：如果只有一個@提及，且訊息包含指令，則視為@機械人）
    // 這是因為 WhatsApp Web.js 的 ID 格式可能與實際顯示的不同
    const isSingleMention = hasMention && msg.mentionedIds.length === 1;
    
    // 綜合判斷是否@機械人
    const isMentioningBot = isMentioningBotById || isMentioningBotByNumber || isSingleMention;
    
    // 調試日誌：顯示 @提及資訊
    if (chat.isGroup && hasMention) {
        console.log(`[${getTimestamp()}] 🔍 群組 @提及檢測 [聊天: ${chatId}]`);
        console.log(`   botId: ${botId}`);
        console.log(`   botNumber: ${botNumber}`);
        console.log(`   mentionedIds: ${JSON.stringify(msg.mentionedIds)}`);
        console.log(`   isMentioningBotById: ${isMentioningBotById}`);
        console.log(`   isMentioningBotByNumber: ${isMentioningBotByNumber}`);
        console.log(`   isSingleMention: ${isSingleMention}`);
        console.log(`   isMentioningBot: ${isMentioningBot}`);
    }

    // ============================================
    // 【新增：@機械人時主動發出功能訊息】
    // ============================================
    if (chat.isGroup && isMentioningBot) {
        console.log(`[${getTimestamp()}] 📢 機械人被 @提及 [聊天: ${chatId}]`);
        
        // 檢查是否是 @機械人 (Stop) 指令
        if (messageBody.toLowerCase().includes('stop')) {
            console.log(`[${getTimestamp()}] 🛑 @機械人 (Stop) 指令 [聊天: ${chatId}]`);
            
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
            return;
        }
        
        // 發送功能說明
        const featureMenu = `🤖 機械人功能說明\n\n請滑動回覆這條訊息來下指令：\n1=自動回覆 2=記錄訊息 3=智能指令 0=停止所有\n\n各工具說明：\n1. 自動回覆 (auto-reply)：自動回覆收到的訊息\n2. 記錄訊息 (msg-extractor)：提取並儲存 WhatsApp 訊息到本地\n3. 智能指令 (smart-command)：支援自然語言操作\n\n也可以直接輸入：\n- start → 開啟工具選單\n- stop → 停止所有功能`;
        
        await msg.reply(featureMenu);
        console.log(`[${getTimestamp()}] ✅ 已發送功能說明 [聊天: ${chatId}]`);
        return;
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
                console.log(`[${getTimestamp()}] 💬 收到滑動回覆指令 [聊天: ${chatId}]`);
                
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
                        
                    case '3':
                    case '智能指令':
                        // 啟動智能指令功能
                        // 根據工具列表順序，smart-command 是第 3 個工具（索引 2）
                        const smartCommandIndex = 2; // 直接使用索引位置
                        if (smartCommandIndex >= 0 && smartCommandIndex < pluginManager.plugins.length) {
                            const plugin = await pluginManager.activatePlugin(smartCommandIndex, chatId);
                            if (plugin) {
                                chatManager.addActivePlugin(chatId, 'smart-command');
                                await msg.reply('✅ 已啟動智能指令\n\n功能：支援自然語言操作');
                                console.log(`[${getTimestamp()}] ✅ 已啟動智能指令功能 [聊天: ${chatId}]`);
                            } else {
                                await msg.reply('❌ 啟動智能指令功能失敗');
                            }
                        } else {
                            await msg.reply('❌ 智能指令功能不存在');
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
                        const featureMenu = `🤖 機械人功能說明\n\n請滑動回覆這條訊息來下指令：\n1=自動回覆 2=記錄訊息 3=智能指令 0=停止所有\n\n各工具說明：\n1. 自動回覆 (auto-reply)：自動回覆收到的訊息\n2. 記錄訊息 (msg-extractor)：提取並儲存 WhatsApp 訊息到本地\n3. 智能指令 (smart-command)：支援自然語言操作\n\n也可以直接輸入：\n- start → 開啟工具選單\n- stop → 停止所有功能`;
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
    // 【指令處理區】
    // ============================================

    // 處理 "start" 指令 - 顯示工具選單
    // 群組中必須 @機械人才會回應
    if (!chat.isGroup || isMentioningBot) {
        if (messageBody.toLowerCase() === 'start' || messageBody.toLowerCase().includes('start')) {
            console.log(`[${getTimestamp()}] 🚀 用戶請求工具選單 [聊天: ${chatId}]`);

            const pluginList = pluginManager.getPluginList();
            await msg.reply(pluginList);

            // 設置這個聊天的等待選擇狀態
            chatManager.setWaitingForSelection(chatId, true);

            console.log(`[${getTimestamp()}] ✅ 已發送工具列表 [聊天: ${chatId}]`);
            return;
        }
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
    // 群組中必須 @機械人才會回應
    if (!chat.isGroup || isMentioningBot) {
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
    // 【v3.0 智能指令解析】
    // ============================================
    
    // 載入 SmartCommand 工具
    const SmartCommand = require('./tools/smart-command');
    const smartCommand = new SmartCommand({ verbose: false, chatId: chatId });
    
    // 解析用戶輸入
    const parseResult = smartCommand.parse(messageBody);
    
    if (parseResult.matched) {
        console.log(`[${getTimestamp()}] 🧠 智能指令識別: ${parseResult.command} [聊天: ${chatId}]`);
        
        // 根據識別的指令執行對應操作
        switch (parseResult.command) {
            case 'msg-extractor':
                // 檢查是否已經啟動
                if (chatManager.getActivePlugins(chatId).has('msg-extractor')) {
                    await msg.reply('ℹ️ msg-extractor 已經在運行中');
                    return;
                }
                
                // 找到 msg-extractor 的索引
                const msgExtractorIndex = pluginManager.plugins.findIndex(p => p.name === 'msg-extractor');
                if (msgExtractorIndex !== -1) {
                    const plugin = await pluginManager.activatePlugin(msgExtractorIndex, chatId);
                    if (plugin) {
                        chatManager.addActivePlugin(chatId, 'msg-extractor');
                        await msg.reply(`✅ ${smartCommand.getResponse(parseResult)}\n\n工具：msg-extractor 已啟動`);
                        console.log(`[${getTimestamp()}] ✅ 智能啟動 msg-extractor [聊天: ${chatId}]`);
                    }
                }
                return;
                
            case 'auto-reply':
                // 檢查是否已經啟動
                if (chatManager.getActivePlugins(chatId).has('auto-reply')) {
                    await msg.reply('ℹ️ auto-reply 已經在運行中');
                    return;
                }
                
                // 找到 auto-reply 的索引
                const autoReplyIndex = pluginManager.plugins.findIndex(p => p.name === 'auto-reply');
                if (autoReplyIndex !== -1) {
                    const plugin = await pluginManager.activatePlugin(autoReplyIndex, chatId);
                    if (plugin) {
                        chatManager.addActivePlugin(chatId, 'auto-reply');
                        await msg.reply(`✅ ${smartCommand.getResponse(parseResult)}\n\n工具：auto-reply 已啟動`);
                        console.log(`[${getTimestamp()}] ✅ 智能啟動 auto-reply [聊天: ${chatId}]`);
                    }
                }
                return;
                
            case 'stop':
                if (chatManager.hasActivePlugins(chatId)) {
                    const stoppedPlugins = chatManager.stopAllPlugins(chatId);
                    stoppedPlugins.forEach(pluginName => {
                        pluginManager.removePluginInstance(pluginName, chatId);
                    });
                    await msg.reply(`✅ ${smartCommand.getResponse(parseResult)}\n\n已停止：${stoppedPlugins.join(', ')}`);
                    console.log(`[${getTimestamp()}] ✅ 智能停止工具：${stoppedPlugins.join(', ')} [聊天: ${chatId}]`);
                } else {
                    await msg.reply('ℹ️ 當前聊天沒有運行中的工具');
                }
                return;
                
            case 'start':
                const pluginList = pluginManager.getPluginList();
                await msg.reply(smartCommand.getResponse(parseResult) + '\n' + pluginList);
                chatManager.setWaitingForSelection(chatId, true);
                console.log(`[${getTimestamp()}] ✅ 智能顯示選單 [聊天: ${chatId}]`);
                return;
                
            case 'status':
                const activePlugins = Array.from(chatManager.getActivePlugins(chatId));
                if (activePlugins.length > 0) {
                    await msg.reply(`📊 當前運行中的工具：\n${activePlugins.map(p => `• ${p}`).join('\n')}`);
                } else {
                    await msg.reply('ℹ️ 當前聊天沒有運行中的工具\n\n輸入「顯示選單」查看可用功能');
                }
                console.log(`[${getTimestamp()}] ✅ 智能顯示狀態 [聊天: ${chatId}]`);
                return;

            case 'weather':
                // 載入天氣工具
                const WeatherTool = require('./tools/weather');
                const weatherTool = new WeatherTool({ verbose: false });
                
                // 嘗試從訊息中提取城市名稱
                let city = 'Hong Kong';
                const cityPatterns = [
                    /(香港|台北|東京|倫敦|北京|上海|廣州|深圳|新加坡|紐約|巴黎|悉尼)/,
                    /weather\s+(?:in|at|for)\s+(\w+)/i,
                    /(\w+)\s+weather/i
                ];
                
                for (const pattern of cityPatterns) {
                    const match = messageBody.match(pattern);
                    if (match) {
                        const cityMap = {
                            '香港': 'Hong Kong',
                            '台北': 'Taipei',
                            '東京': 'Tokyo',
                            '倫敦': 'London',
                            '北京': 'Beijing',
                            '上海': 'Shanghai',
                            '廣州': 'Guangzhou',
                            '深圳': 'Shenzhen',
                            '新加坡': 'Singapore'
                        };
                        city = cityMap[match[1]] || match[1];
                        break;
                    }
                }
                
                try {
                    await msg.reply(`🌤️ 正在查詢 ${city} 的天氣...`);
                    const weatherInfo = await weatherTool.run(city);
                    await msg.reply(weatherInfo);
                    console.log(`[${getTimestamp()}] ✅ 智能查詢天氣: ${city} [聊天: ${chatId}]`);
                } catch (error) {
                    await msg.reply(`❌ 查詢天氣失敗: ${error.message}`);
                    console.error(`[${getTimestamp()}] ❌ 天氣查詢失敗:`, error.message);
                }
                return;
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
