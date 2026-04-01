/**
 * WhatsApp 本地機器人
 * 
 * 【功能規格說明】
 * 1. 私聊訊息：所有指令直接回覆
 * 2. 群組訊息：需 @提及 + 包含指令才回覆
 * 3. 支援指令：
 *    - !test → 回覆「已連接，可互動」
 *    - test/Test/TEST → 回覆 "it's ok"
 * 
 * 【使用方式】
 * - 私聊：直接發送指令
 * - 群組：@機器人名稱 + 指令
 * 
 * 【記錄功能】
 * - 所有訊息都會顯示在 Terminal
 * - 私聊和符合條件的群組訊息會回覆
 * 
 * @version 1.0
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// 顯示分隔線
function printDivider() {
    console.log('\n' + '='.repeat(60) + '\n');
}

// 顯示時間戳記
function getTimestamp() {
    return new Date().toLocaleString('zh-HK');
}

// 初始化 WhatsApp 客戶端
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// 當生成 QR Code 時（首次登入或需要重新認證）
client.on('qr', (qr) => {
    printDivider();
    console.log(`[${getTimestamp()}] 📱 請掃描以下 QR Code 以登入 WhatsApp`);
    console.log('[提示] 打開你的手機 WhatsApp → 設定 → 已連結裝置 → 連結裝置');
    printDivider();
    qrcode.generate(qr, { small: true });
});



// 獲取機器人自己的 ID
let botId = null;

// 當客戶端準備就緒時獲取 bot ID
client.on('ready', async () => {
    const info = client.info;
    botId = info.wid._serialized;
    printDivider();
    console.log(`[${getTimestamp()}] ✅ WhatsApp 已成功連接並準備就緒！`);
    console.log(`[${getTimestamp()}] 🤖 機器人正在運行中...`);
    console.log(`[${getTimestamp()}] 💡 私聊: 直接發送 !test 或 test`);
    console.log(`[${getTimestamp()}] 💡 群組: @提及機器人 + !test 或 test`);
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
    
    // 顯示收到的訊息
    printDivider();
    console.log(`[${getTimestamp()}] 📩 收到訊息 [${chatType}]`);
    if (chat.isGroup) {
        console.log(`   群組名稱: ${chatName}`);
    }
    console.log(`   發送者: ${senderName} (${contact.number})`);
    console.log(`   內容: ${messageBody}`);
    printDivider();
    
    // ============================================
    // 【訊息處理邏輯 - 常規規格】
    // ============================================
    // 
    // 規則 1：私聊訊息
    //   - 所有指令直接回覆
    //   - 無需 @提及
    //
    // 規則 2：群組訊息
    //   - 需同時滿足：
    //     a) 有 @提及（msg.mentionedIds 非空）
    //     b) 訊息包含指令（!test 或 test）
    //   - 否則只在 Terminal 顯示，不回覆
    //
    // 規則 3：支援指令
    //   - !test → 回覆「已連接，可互動」
    //   - test（不分大小寫）→ 回覆 "it's ok"
    //
    // ============================================
    
    const hasMention = msg.mentionedIds && msg.mentionedIds.length > 0;
    const hasCommand = messageBody.includes('!test') || 
                       messageBody.toLowerCase().includes('test');
    
    // 私聊：直接處理
    // 群組：需 @提及 + 指令
    if (chat.isGroup && !(hasMention && hasCommand)) {
        console.log(`[${getTimestamp()}] ℹ️ 群組訊息但未 @提及或無指令，只顯示不回覆`);
        return;
    }
    
    // ============================================
    // 【指令處理區】
    // ============================================
    
    // 指令 1：!test
    if (messageBody === '!test' || messageBody.includes('!test')) {
        console.log(`[${getTimestamp()}] 🔄 處理 !test 指令...`);
        
        try {
            await msg.reply('已連接，可互動');
            console.log(`[${getTimestamp()}] ✅ 已回覆: 「已連接，可互動」`);
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 回覆失敗:`, error.message);
        }
        return;
    }
    
    // 指令 2：test（不分大小寫）
    if (messageBody.toLowerCase() === 'test' || messageBody.toLowerCase().includes('test')) {
        console.log(`[${getTimestamp()}] 🔄 處理 test 指令...`);
        
        try {
            await msg.reply("it's ok");
            console.log(`[${getTimestamp()}] ✅ 已回覆: "it's ok"`);
        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ 回覆失敗:`, error.message);
        }
        return;
    }
    
    // ============================================
    // 【擴展區】未來加入 AI 處理邏輯
    // ============================================
    // TODO: 在這裡加入 AI 回覆邏輯
    // 例如：串接 OpenAI、Claude 等 AI 服務
    // ============================================
    
    console.log(`[${getTimestamp()}] ℹ️ 訊息已顯示，等待後續處理...`);
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
console.log('║' + ' '.repeat(15) + 'WhatsApp 本地機器人啟動中' + ' '.repeat(16) + '║');
console.log('╚' + '═'.repeat(58) + '╝');
console.log('\n');

client.initialize();
