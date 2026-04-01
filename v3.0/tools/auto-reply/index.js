/**
 * AutoReply 自動回覆工具
 *
 * 【功能說明】
 * 根據關鍵字自動回覆訊息，支援自定義回覆規則
 *
 * 【使用方式】
 * 1. 獨立運行：node index.js
 * 2. 作為模組：const AutoReply = require('./auto-reply');
 *
 * 【回覆規則】
 * - 在 REPLY_RULES 中添加新的關鍵字和回覆
 * - 支援完全匹配和包含匹配
 * - 支援群組和私聊不同規則
 *
 * 【擴展方式】
 * 在 REPLY_RULES 數組中添加新規則：
 * {
 *     keywords: ['關鍵字1', '關鍵字2'],
 *     response: '回覆內容',
 *     matchType: 'exact' | 'contains',  // exact=完全匹配, contains=包含匹配
 *     chatType: 'all' | 'private' | 'group'  // 適用場景
 * }
 *
 * @module auto-reply
 * @version 1.0
 */

const path = require('path');

// ============================================
// 配置區
// ============================================

/**
 * 獲取模組根目錄
 */
function getModuleRoot() {
    if (require.main === module) {
        return process.cwd();
    }
    return __dirname;
}

const MODULE_ROOT = getModuleRoot();

// ============================================
// 回覆規則配置（可擴展）
// ============================================

const REPLY_RULES = [
    {
        id: 'test_reply',
        keywords: ['test', 'Test', 'TEST'],
        response: "it's ok",
        matchType: 'contains',  // 'exact' 或 'contains'
        chatType: 'all',        // 'all', 'private', 'group'
        description: '測試回覆'
    },
    {
        id: 'hello_reply',
        keywords: ['hello', 'hi', '你好', '您好'],
        response: '你好！有什麼可以幫助你的嗎？',
        matchType: 'contains',
        chatType: 'all',
        description: '問候回覆'
    },
    {
        id: 'help_reply',
        keywords: ['help', '幫助', '說明'],
        response: '可用指令：\n- test: 測試回覆\n- hello: 問候\n- help: 顯示幫助',
        matchType: 'contains',
        chatType: 'all',
        description: '幫助回覆'
    }
    // 在這裡添加更多規則...
];

// ============================================
// 工具函數
// ============================================

function getTimestamp() {
    return new Date().toLocaleString('zh-HK');
}

function printDivider() {
    console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================
// AutoReply 類別
// ============================================

class AutoReply {
    constructor(config = {}) {
        this.config = {
            verbose: true,
            ...config
        };
        this.rules = REPLY_RULES;
        this.stats = {
            processed: 0,
            replied: 0,
            rules: {}
        };

        // 初始化統計
        this.rules.forEach(rule => {
            this.stats.rules[rule.id] = 0;
        });

        console.log(`[${getTimestamp()}] 🤖 AutoReply 已初始化`);
        console.log(`[${getTimestamp()}] 📋 載入 ${this.rules.length} 條回覆規則`);

        // 顯示所有規則
        if (this.config.verbose) {
            this.listRules();
        }
    }

    /**
     * 列出所有回覆規則
     */
    listRules() {
        console.log(`[${getTimestamp()}] 📋 回覆規則列表：`);
        this.rules.forEach((rule, index) => {
            console.log(`   ${index + 1}. ${rule.id}: ${rule.description}`);
            console.log(`      關鍵字: ${rule.keywords.join(', ')}`);
            console.log(`      回覆: ${rule.response.substring(0, 30)}${rule.response.length > 30 ? '...' : ''}`);
        });
    }

    /**
     * 處理訊息
     */
    async processMessage(msg) {
        try {
            // 忽略自己發送的訊息（避免無限循環）
            if (msg.fromMe) {
                return {
                    matched: false,
                    rule: null,
                    response: null,
                    skipped: true
                };
            }

            const chat = await msg.getChat();
            const contact = await msg.getContact();
            const messageBody = msg.body.trim();

            this.stats.processed++;

            if (this.config.verbose) {
                console.log(`[${getTimestamp()}] 📩 AutoReply 處理訊息`);
                console.log(`   來源: ${contact.pushname || contact.number}`);
                console.log(`   內容: ${messageBody}`);
            }

            // 檢查是否匹配任何規則
            const matchedRule = this.findMatchingRule(messageBody, chat.isGroup);

            if (matchedRule) {
                console.log(`[${getTimestamp()}] ✅ 匹配規則: ${matchedRule.id}`);

                // 發送回覆
                await msg.reply(matchedRule.response);

                // 更新統計
                this.stats.replied++;
                this.stats.rules[matchedRule.id]++;

                console.log(`[${getTimestamp()}] 💬 已回覆: ${matchedRule.response.substring(0, 50)}${matchedRule.response.length > 50 ? '...' : ''}`);

                return {
                    matched: true,
                    rule: matchedRule,
                    response: matchedRule.response
                };
            }

            if (this.config.verbose) {
                console.log(`[${getTimestamp()}] ℹ️ 無匹配規則`);
            }

            return {
                matched: false,
                rule: null,
                response: null
            };

        } catch (error) {
            console.error(`[${getTimestamp()}] ❌ AutoReply 處理失敗:`, error.message);
            return {
                matched: false,
                rule: null,
                response: null,
                error: error.message
            };
        }
    }

    /**
     * 查找匹配的規則
     */
    findMatchingRule(messageBody, isGroup) {
        for (const rule of this.rules) {
            // 檢查聊天類型
            if (rule.chatType === 'private' && isGroup) continue;
            if (rule.chatType === 'group' && !isGroup) continue;

            // 檢查關鍵字匹配
            for (const keyword of rule.keywords) {
                const isMatch = rule.matchType === 'exact'
                    ? messageBody.toLowerCase() === keyword.toLowerCase()
                    : messageBody.toLowerCase().includes(keyword.toLowerCase());

                if (isMatch) {
                    return rule;
                }
            }
        }

        return null;
    }

    /**
     * 添加新規則（動態添加）
     */
    addRule(rule) {
        const newRule = {
            id: rule.id || `rule_${Date.now()}`,
            keywords: rule.keywords || [],
            response: rule.response || '',
            matchType: rule.matchType || 'contains',
            chatType: rule.chatType || 'all',
            description: rule.description || '自定義規則'
        };

        this.rules.push(newRule);
        this.stats.rules[newRule.id] = 0;

        console.log(`[${getTimestamp()}] ➕ 已添加規則: ${newRule.id}`);

        return newRule;
    }

    /**
     * 獲取統計資訊
     */
    getStats() {
        return {
            ...this.stats,
            rulesCount: this.rules.length
        };
    }

    /**
     * 顯示統計
     */
    printStats() {
        printDivider();
        console.log(`[${getTimestamp()}] 📊 AutoReply 統計`);
        console.log(`   處理訊息: ${this.stats.processed}`);
        console.log(`   回覆訊息: ${this.stats.replied}`);
        console.log(`   規則數量: ${this.rules.length}`);
        console.log(`   各規則觸發次數:`);

        for (const [ruleId, count] of Object.entries(this.stats.rules)) {
            console.log(`      - ${ruleId}: ${count} 次`);
        }
        printDivider();
    }
}

// ============================================
// 獨立運行入口
// ============================================

if (require.main === module) {
    console.log('\n');
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(15) + 'AutoReply 工具啟動中' + ' '.repeat(16) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');
    console.log('\n');

    const autoReply = new AutoReply({ verbose: true });

    // 處理終止訊號
    process.on('SIGINT', () => {
        autoReply.printStats();
        console.log(`[${getTimestamp()}] 👋 AutoReply 已關閉`);
        process.exit(0);
    });

    // 保持程式運行
    console.log(`[${getTimestamp()}] ℹ️ 此工具需要配合主程式使用`);
    console.log(`[${getTimestamp()}] ℹ️ 請在主程式中啟動 AutoReply`);
}

// ============================================
// 模組匯出
// ============================================

module.exports = AutoReply;
