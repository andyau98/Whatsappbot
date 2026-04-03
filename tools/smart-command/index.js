/**
 * SmartCommand 智能指令解析工具
 *
 * 【功能說明】
 * 使用自然語言解析用戶意圖，自動轉換為系統指令
 * 無需記憶固定指令，用日常語言即可操作機器人
 *
 * 【使用方式】
 * 1. 獨立運行：node index.js
 * 2. 作為模組：const SmartCommand = require('./smart-command');
 *
 * 【指令範例】
 * - "幫我記住這個" → 啟動 msg-extractor
 * - "開始自動回覆" → 啟動 auto-reply
 * - "關閉所有功能" → 停止所有工具
 * - "顯示工具列表" → 顯示選單
 * - "我要記錄訊息" → 啟動 msg-extractor
 * - "停止記錄" → 停止 msg-extractor
 *
 * @module smart-command
 * @version 1.0
 */

const path = require('path');

// ============================================
// 配置區
// ============================================

function getModuleRoot() {
    if (require.main === module) {
        return process.cwd();
    }
    return __dirname;
}

const MODULE_ROOT = getModuleRoot();

// ============================================
// 智能指令映射規則
// ============================================

const COMMAND_PATTERNS = {
    // 啟動 msg-extractor 的各種說法
    'msg-extractor': {
        keywords: [
            '記錄', '記住', '保存', '儲存', '存檔', '備份',
            '記下來', '幫我記', '記起來', '儲存訊息',
            '開始記錄', '開始保存', '開始儲存',
            '記錄訊息', '保存訊息', '儲存訊息',
            'extract', 'save message', 'backup'
        ],
        patterns: [
            /幫我.*(記錄|記住|保存|儲存)/,
            /(開始|啟動).*(記錄|保存|儲存)/,
            /(記錄|保存|儲存).*訊息/,
            /我要.*(記錄|保存|儲存)/
        ],
        negativeKeywords: ['停止', '關閉', '不要', '結束', '取消']
    },

    // 啟動 auto-reply 的各種說法
    'auto-reply': {
        keywords: [
            '回覆', '自動回覆', '自動回答', '自動響應',
            '回話', '回答', '響應',
            '開始回覆', '啟動回覆', '開啟回覆',
            'auto reply', '自動回', '幫我回'
        ],
        patterns: [
            /幫我.*(回覆|回答|響應)/,
            /(開始|啟動).*(回覆|自動)/,
            /(自動|幫我).*回(覆|答)/,
            /我要.*(回覆|自動)/
        ],
        negativeKeywords: ['停止', '關閉', '不要', '結束', '取消']
    },

    // 停止所有工具的各種說法
    'stop': {
        keywords: [
            '停止', '關閉', '結束', '取消', '不要',
            '關掉', '停掉', '停止所有', '全部停止',
            '關閉所有', '全部關閉', '結束所有',
            'stop', 'close', 'end', 'cancel'
        ],
        patterns: [
            /(停止|關閉|結束).*所有/,
            /全部.*(停止|關閉|結束)/,
            /(不要|停止).*(記錄|回覆|功能)/,
            /關(掉|閉).*功能/
        ],
        negativeKeywords: []
    },

    // 顯示選單的各種說法
    'start': {
        keywords: [
            '選單', '列表', '功能', '工具', '選項',
            '顯示選單', '顯示列表', '功能列表', '工具列表',
            '有什麼功能', '可以做什麼', '有什麼工具',
            'menu', 'list', 'help', '功能表'
        ],
        patterns: [
            /(顯示|看|給我).*(選單|列表|功能)/,
            /(有什麼|哪些).*(功能|工具|選項)/,
            /(可以|能).*(做什麼|幹嘛)/,
            /幫助|說明|help/i
        ],
        negativeKeywords: []
    },

    // 顯示狀態的各種說法
    'status': {
        keywords: [
            '狀態', '狀況', '情況', '進度',
            '現在狀態', '目前狀態', '運行狀態',
            '在幹嘛', '在做什麼', '運作中',
            'status', 'state', '情況如何'
        ],
        patterns: [
            /(查看|顯示|看).*狀態/,
            /(現在|目前).*狀(態|況)/,
            /(在|正在).*(做什麼|幹嘛|運作)/,
            /狀態.*如何/
        ],
        negativeKeywords: []
    },

    // 天氣查詢的各種說法
    'weather': {
        keywords: [
            '天氣', '氣溫', '溫度', '下雨', '晴天',
            '天氣如何', '今天天氣', '明天天氣',
            'weather', 'temperature', 'forecast',
            'weather today', 'weather tomorrow'
        ],
        patterns: [
            /(查詢|看|問).*天氣/,
            /天氣.*(如何|怎樣|好嗎)/,
            /(今天|明天|後天).*天氣/,
            /(香港|台北|東京|倫敦).*天氣/,
            /weather\s+(in|at|for)/i,
            /(how|what).*(weather|temperature)/i
        ],
        negativeKeywords: []
    }
};

// ============================================
// 工具函數
// ============================================

function getTimestamp() {
    return new Date().toLocaleString('zh-HK');
}

// ============================================
// SmartCommand 類別
// ============================================

class SmartCommand {
    constructor(config = {}) {
        this.config = {
            verbose: config.verbose !== false,
            chatId: config.chatId || null,
            ...config
        };
        this.commandHistory = [];
        this.stats = {
            parsed: 0,
            matched: 0,
            unmatched: 0
        };
    }

    /**
     * 解析用戶輸入，識別意圖
     * @param {string} text - 用戶輸入的文字
     * @returns {Object} - 解析結果
     */
    parse(text) {
        this.stats.parsed++;
        
        if (this.config.verbose) {
            console.log(`[${getTimestamp()}] 🧠 SmartCommand: 解析 "${text}"`);
        }

        const lowerText = text.toLowerCase();

        // 檢查每個指令類型
        for (const [command, rules] of Object.entries(COMMAND_PATTERNS)) {
            const score = this._calculateMatchScore(lowerText, rules);
            
            if (score > 0) {
                this.stats.matched++;
                const result = {
                    matched: true,
                    command: command,
                    confidence: score,
                    originalText: text,
                    timestamp: new Date().toISOString()
                };
                
                this.commandHistory.push(result);
                
                if (this.config.verbose) {
                    console.log(`[${getTimestamp()}] ✅ 識別為: ${command} (信心度: ${score})`);
                }
                
                return result;
            }
        }

        // 沒有匹配
        this.stats.unmatched++;
        const result = {
            matched: false,
            command: null,
            confidence: 0,
            originalText: text,
            timestamp: new Date().toISOString()
        };
        
        if (this.config.verbose) {
            console.log(`[${getTimestamp()}] ❌ 無法識別指令`);
        }
        
        return result;
    }

    /**
     * 計算匹配分數
     * @param {string} text - 用戶輸入
     * @param {Object} rules - 指令規則
     * @returns {number} - 匹配分數 (0-100)
     */
    _calculateMatchScore(text, rules) {
        let score = 0;
        let hasNegative = false;

        // 檢查負面關鍵字（排除條件）
        for (const negKeyword of rules.negativeKeywords) {
            if (text.includes(negKeyword.toLowerCase())) {
                hasNegative = true;
                break;
            }
        }

        // 檢查關鍵字匹配
        for (const keyword of rules.keywords) {
            if (text.includes(keyword.toLowerCase())) {
                score += 30; // 關鍵字匹配 +30 分
            }
        }

        // 檢查正則模式匹配
        for (const pattern of rules.patterns) {
            if (pattern.test(text)) {
                score += 50; // 模式匹配 +50 分
            }
        }

        // 如果有負面關鍵字，大幅降低分數
        if (hasNegative && score > 0) {
            score = Math.max(0, score - 60);
        }

        return score;
    }

    /**
     * 獲取建議的回覆
     * @param {Object} parseResult - 解析結果
     * @returns {string} - 建議的回覆文字
     */
    getResponse(parseResult) {
        if (!parseResult.matched) {
            return '抱歉，我無法理解您的指令。您可以說「顯示選單」查看可用功能。';
        }

        const responses = {
            'msg-extractor': '好的，我會開始記錄這個聊天的訊息。',
            'auto-reply': '好的，自動回覆功能已啟動。',
            'stop': '已停止所有功能。',
            'start': '這是目前可用的功能列表...',
            'status': '讓我查看一下目前的狀態...',
            'weather': '正在查詢天氣資訊...'
        };

        return responses[parseResult.command] || '指令已識別。';
    }

    /**
     * 獲取統計資訊
     * @returns {Object} - 統計數據
     */
    getStats() {
        return {
            ...this.stats,
            history: this.commandHistory.length
        };
    }

    /**
     * 顯示指令說明
     */
    printHelp() {
        console.log(`\n[${getTimestamp()}] 📖 SmartCommand 使用說明\n`);
        console.log('您可以說以下語句來操作機器人：\n');
        console.log('📝 記錄訊息：');
        console.log('   • "幫我記住這個"');
        console.log('   • "開始記錄訊息"');
        console.log('   • "保存這個對話"');
        console.log('');
        console.log('💬 自動回覆：');
        console.log('   • "開始自動回覆"');
        console.log('   • "幫我回覆訊息"');
        console.log('   • "啟動自動回答"');
        console.log('');
        console.log('🛑 停止功能：');
        console.log('   • "停止所有功能"');
        console.log('   • "關閉所有工具"');
        console.log('   • "結束運作"');
        console.log('');
        console.log('📋 其他：');
        console.log('   • "顯示選單" - 查看所有功能');
        console.log('   • "查看狀態" - 了解目前運作情況');
        console.log('');
        console.log('🌤️ 天氣查詢：');
        console.log('   • "今天天氣如何" - 查詢天氣');
        console.log('   • "香港天氣" - 查詢特定城市天氣');
        console.log('');
    }
}

// ============================================
// 獨立運行入口
// ============================================

if (require.main === module) {
    console.log('\n╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(10) + 'SmartCommand 智能指令解析工具' + ' '.repeat(17) + '║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const smartCommand = new SmartCommand({ verbose: true });
    
    // 顯示說明
    smartCommand.printHelp();

    // 測試範例
    console.log(`[${getTimestamp()}] 🧪 測試範例：\n`);
    
    const testCases = [
        '幫我記住這個',
        '開始自動回覆',
        '停止所有功能',
        '顯示選單',
        '不要記錄了',
        '這是什麼功能',
        '幫我保存對話',
        '關閉自動回覆'
    ];

    for (const test of testCases) {
        const result = smartCommand.parse(test);
        console.log(`   輸入: "${test}"`);
        console.log(`   識別: ${result.matched ? result.command : '無法識別'}`);
        console.log(`   回覆: ${smartCommand.getResponse(result)}\n`);
    }

    // 顯示統計
    console.log(`[${getTimestamp()}] 📊 統計：`);
    console.log(smartCommand.getStats());
    console.log('\n');
}

// ============================================
// 模組匯出
// ============================================

module.exports = SmartCommand;
