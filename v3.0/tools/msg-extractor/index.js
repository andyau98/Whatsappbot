/**
 * WhatsApp 訊息提取與儲存模組
 * 
 * 【功能說明】
 * 從 WhatsApp 提取訊息並儲存到本地電腦資料夾
 * 可獨立運行，也可作為模組被其他專案引用
 * 
 * 【儲存格式】
 * - 文字訊息：儲存為 JSON 格式
 * - 媒體檔案：儲存到 media/ 資料夾
 * - 按日期分類：每天一個檔案
 * 
 * 【使用方式】
 * 1. 獨立運行：node index.js
 * 2. 作為模組：const extractor = require('./msg-extractor');
 * 
 * @module msg-extractor
 * @version 1.0
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// ============================================
// 配置區
// ============================================

/**
 * 獲取模組根目錄（確保在不同電腦上都能正確定位）
 */
function getModuleRoot() {
    // 如果是被引用，使用當前檔案所在目錄
    // 如果是直接運行，使用當前工作目錄
    if (require.main === module) {
        return process.cwd();
    }
    return __dirname;
}

const MODULE_ROOT = getModuleRoot();

const CONFIG = {
    // 儲存路徑（使用絕對路徑，基於模組根目錄）
    savePath: path.join(MODULE_ROOT, 'messages'),
    // 認證資料路徑
    authPath: path.join(MODULE_ROOT, '.wwebjs_auth'),
    // 是否儲存媒體檔案
    saveMedia: true,
    // 媒體檔案大小限制 (MB)
    mediaSizeLimit: 50,
    // 是否顯示詳細日誌
    verbose: true
};

// ============================================
// 工具函數
// ============================================

/**
 * 獲取格式化時間戳記
 */
function getTimestamp() {
    return new Date().toLocaleString('zh-HK');
}

/**
 * 獲取日期字串 (YYYY-MM-DD)
 */
function getDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 確保資料夾存在（自動創建上層目錄）
 */
function ensureDirectoryExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`[${getTimestamp()}] 📁 創建資料夾: ${dirPath}`);
        }
    } catch (error) {
        console.error(`[${getTimestamp()}] ❌ 無法創建資料夾 ${dirPath}:`, error.message);
        // 嘗試使用當前目錄作為備選
        const fallbackPath = path.join(process.cwd(), 'messages_backup');
        if (!fs.existsSync(fallbackPath)) {
            fs.mkdirSync(fallbackPath, { recursive: true });
        }
        console.log(`[${getTimestamp()}] ⚠️ 使用備選路徑: ${fallbackPath}`);
        return fallbackPath;
    }
    return dirPath;
}

/**
 * 顯示分隔線
 */
function printDivider() {
    console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================
// 訊息儲存功能
// ============================================

class MessageExtractor {
    constructor(config = {}) {
        this.config = { ...CONFIG, ...config };
        this.client = null;
        this.botId = null;
        
        // 確保主儲存路徑存在
        this.config.savePath = ensureDirectoryExists(this.config.savePath);
        
        // 初始化儲存路徑
        this.messagesPath = ensureDirectoryExists(path.join(this.config.savePath, 'text'));
        this.mediaPath = ensureDirectoryExists(path.join(this.config.savePath, 'media'));
        
        console.log(`[${getTimestamp()}] 📂 訊息儲存路徑已準備就緒`);
    }

    /**
     * 初始化 WhatsApp 客戶端
     */
    initClient() {
        // 確保認證資料夾存在
        ensureDirectoryExists(this.config.authPath);
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: this.config.authPath
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.setupEventHandlers();
        return this.client;
    }

    /**
     * 設置事件處理器
     */
    setupEventHandlers() {
        // QR Code 生成
        this.client.on('qr', (qr) => {
            printDivider();
            console.log(`[${getTimestamp()}] 📱 請掃描 QR Code 登入`);
            console.log(`[${getTimestamp()}] 💡 提示: WhatsApp → 設定 → 已連結裝置 → 連結裝置`);
            printDivider();
            qrcode.generate(qr, { small: true });
        });

        // 準備就緒
        this.client.on('ready', async () => {
            const info = this.client.info;
            this.botId = info.wid._serialized;
            
            // 顯示運行環境資訊
            console.log(`[${getTimestamp()}] 📍 模組根目錄: ${MODULE_ROOT}`);
            
            printDivider();
            console.log(`[${getTimestamp()}] ✅ WhatsApp 已連接`);
            console.log(`[${getTimestamp()}] 🤖 Bot ID: ${this.botId}`);
            console.log(`[${getTimestamp()}] 💾 訊息儲存路徑: ${this.config.savePath}`);
            console.log(`[${getTimestamp()}] 📁 文字訊息: ${this.messagesPath}`);
            console.log(`[${getTimestamp()}] 🖼️  媒體檔案: ${this.mediaPath}`);
            printDivider();
        });

        // 收到訊息
        this.client.on('message_create', async (msg) => {
            await this.processMessage(msg);
        });

        // 斷開連接
        this.client.on('disconnected', (reason) => {
            printDivider();
            console.log(`[${getTimestamp()}] ⚠️ 已斷開連接: ${reason}`);
            printDivider();
            process.exit(0);
        });
    }

    /**
     * 處理訊息
     */
    async processMessage(msg) {
        try {
            // 忽略自己發送的訊息（避免無限循環）
            if (msg.fromMe) {
                return;
            }

            const chat = await msg.getChat();
            const contact = await msg.getContact();
            
            // 構建訊息資料
            const messageData = {
                id: msg.id._serialized,
                timestamp: msg.timestamp,
                date: getDateString(),
                from: {
                    name: contact.pushname || contact.number,
                    number: contact.number
                },
                chat: {
                    id: chat.id._serialized,
                    name: chat.name || '未知',
                    isGroup: chat.isGroup
                },
                type: msg.type,
                body: msg.body,
                hasMedia: msg.hasMedia,
                isForwarded: msg.isForwarded || false,
                savedAt: new Date().toISOString()
            };

            // 顯示訊息
            if (this.config.verbose) {
                console.log(`[${getTimestamp()}] 📩 新訊息`);
                console.log(`   來源: ${messageData.from.name} (${messageData.from.number})`);
                console.log(`   群組: ${messageData.chat.isGroup ? messageData.chat.name : '私聊'}`);
                console.log(`   類型: ${messageData.type}`);
                console.log(`   內容: ${messageData.body.substring(0, 50)}${messageData.body.length > 50 ? '...' : ''}`);
            }

            // 儲存文字訊息
            await this.saveTextMessage(messageData);

            // 儲存媒體檔案
            if (this.config.saveMedia && msg.hasMedia) {
                await this.saveMediaFile(msg, messageData);
            }

        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 處理訊息失敗:`, error.message);
        }
    }

    /**
     * 儲存文字訊息
     */
    async saveTextMessage(messageData) {
        try {
            // 確保資料夾存在
            ensureDirectoryExists(this.messagesPath);
            
            const filename = `${messageData.date}.json`;
            const filepath = path.join(this.messagesPath, filename);
            
            let messages = [];
            
            // 讀取現有檔案
            if (fs.existsSync(filepath)) {
                try {
                    const data = fs.readFileSync(filepath, 'utf8');
                    messages = JSON.parse(data);
                } catch (error) {
                    console.error(`[${getTimestamp()}] ⚠️ 讀取檔案失敗，創建新檔案`);
                    messages = [];
                }
            }
            
            // 添加新訊息
            messages.push(messageData);
            
            // 寫入檔案
            fs.writeFileSync(filepath, JSON.stringify(messages, null, 2), 'utf8');
            
            if (this.config.verbose) {
                console.log(`[${getTimestamp()}] 💾 已儲存到: ${filename}`);
            }
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 儲存文字訊息失敗:`, error.message);
        }
    }

    /**
     * 儲存媒體檔案
     */
    async saveMediaFile(msg, messageData) {
        try {
            // 確保媒體資料夾存在
            ensureDirectoryExists(this.mediaPath);
            
            const media = await msg.downloadMedia();
            
            if (!media) {
                console.log(`[${getTimestamp()}] ⚠️ 無法下載媒體`);
                return;
            }

            // 檢查檔案大小
            const fileSizeMB = (media.data.length * 0.75) / 1024 / 1024;
            if (fileSizeMB > this.config.mediaSizeLimit) {
                console.log(`[${getTimestamp()}] ⚠️ 媒體檔案過大 (${fileSizeMB.toFixed(2)}MB)，跳過`);
                return;
            }

            // 生成安全的檔名（移除特殊字符）
            const safeId = messageData.id.replace(/[^a-zA-Z0-9]/g, '_');
            const ext = media.mimetype ? media.mimetype.split('/')[1] || 'bin' : 'bin';
            const filename = `${safeId}.${ext}`;
            const filepath = path.join(this.mediaPath, filename);
            
            // 儲存檔案
            const buffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(filepath, buffer);
            
            // 更新訊息資料
            messageData.mediaFile = filename;
            messageData.mediaType = media.mimetype;
            messageData.mediaSize = fileSizeMB;
            
            console.log(`[${getTimestamp()}] 🖼️  已儲存媒體: ${filename} (${fileSizeMB.toFixed(2)}MB)`);
            
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 儲存媒體失敗:`, error.message);
        }
    }

    /**
     * 啟動客戶端
     */
    start() {
        console.log('\n');
        console.log('╔' + '═'.repeat(58) + '╗');
        console.log('║' + ' '.repeat(12) + 'WhatsApp 訊息提取器啟動中' + ' '.repeat(13) + '║');
        console.log('╚' + '═'.repeat(58) + '╝');
        console.log('\n');
        
        this.client.initialize();
    }

    /**
     * 獲取統計資訊
     */
    getStats() {
        const stats = {
            textMessages: 0,
            mediaFiles: 0,
            dates: []
        };

        // 統計文字訊息
        if (fs.existsSync(this.messagesPath)) {
            const files = fs.readdirSync(this.messagesPath);
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    const filepath = path.join(this.messagesPath, file);
                    const data = fs.readFileSync(filepath, 'utf8');
                    const messages = JSON.parse(data);
                    stats.textMessages += messages.length;
                    stats.dates.push(file.replace('.json', ''));
                }
            });
        }

        // 統計媒體檔案
        if (fs.existsSync(this.mediaPath)) {
            const files = fs.readdirSync(this.mediaPath);
            stats.mediaFiles = files.length;
        }

        return stats;
    }
}

// ============================================
// 獨立運行入口
// ============================================

if (require.main === module) {
    // 創建提取器實例
    const extractor = new MessageExtractor({
        savePath: './messages',
        saveMedia: true,
        verbose: true
    });

    // 初始化並啟動
    extractor.initClient();
    extractor.start();

    // 處理終止訊號
    process.on('SIGINT', () => {
        console.log('\n');
        console.log(`[${getTimestamp()}] 👋 正在關閉...`);
        
        // 顯示統計
        const stats = extractor.getStats();
        console.log(`[${getTimestamp()}] 📊 統計:`);
        console.log(`   文字訊息: ${stats.textMessages} 則`);
        console.log(`   媒體檔案: ${stats.mediaFiles} 個`);
        console.log(`   日期範圍: ${stats.dates.join(', ') || '無'}`);
        
        process.exit(0);
    });
}

// ============================================
// 模組匯出
// ============================================

module.exports = MessageExtractor;
