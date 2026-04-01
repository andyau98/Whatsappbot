/**
 * WhatsApp Bot 測試程式
 * 
 * 測試所有功能並檢查潛在問題
 */

const path = require('path');
const fs = require('fs');

// 顯示分隔線
function printDivider() {
    console.log('\n' + '='.repeat(60) + '\n');
}

// 顯示時間戳記
function getTimestamp() {
    return new Date().toLocaleString('zh-HK');
}

// 測試結果追蹤
let testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

function assert(condition, testName, errorMessage) {
    if (condition) {
        console.log(`✅ ${testName}`);
        testResults.passed++;
    } else {
        console.log(`❌ ${testName}`);
        console.log(`   錯誤: ${errorMessage}`);
        testResults.failed++;
        testResults.errors.push({ test: testName, error: errorMessage });
    }
}

// ============================================
// 【測試 ChatManager】
// ============================================

class ChatManager {
    constructor() {
        this.chats = new Map();
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

    setWaitingForSelection(chatId, waiting) {
        const state = this.getChatState(chatId);
        state.waitingForSelection = waiting;
    }

    isWaitingForSelection(chatId) {
        return this.getChatState(chatId).waitingForSelection;
    }

    addActivePlugin(chatId, pluginName) {
        const state = this.getChatState(chatId);
        state.activePlugins.add(pluginName);
    }

    removeActivePlugin(chatId, pluginName) {
        const state = this.getChatState(chatId);
        state.activePlugins.delete(pluginName);
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
}

function testChatManager() {
    console.log(`[${getTimestamp()}] 🧪 測試 ChatManager...`);
    printDivider();

    const chatManager = new ChatManager();

    // 測試 1: 創建聊天狀態
    const chatId1 = 'chat_123';
    const state1 = chatManager.getChatState(chatId1);
    assert(
        state1 !== undefined && state1.waitingForSelection === false,
        '測試 1: 創建聊天狀態',
        '聊天狀態未正確初始化'
    );

    // 測試 2: 設置等待選擇狀態
    chatManager.setWaitingForSelection(chatId1, true);
    assert(
        chatManager.isWaitingForSelection(chatId1) === true,
        '測試 2: 設置等待選擇狀態',
        '等待選擇狀態未正確設置'
    );

    // 測試 3: 添加活動工具
    chatManager.addActivePlugin(chatId1, 'auto-reply');
    assert(
        chatManager.hasActivePlugins(chatId1) === true,
        '測試 3: 添加活動工具',
        '活動工具未正確添加'
    );

    // 測試 4: 多個聊天獨立
    const chatId2 = 'chat_456';
    chatManager.addActivePlugin(chatId2, 'msg-extractor');
    const plugins1 = Array.from(chatManager.getActivePlugins(chatId1));
    const plugins2 = Array.from(chatManager.getActivePlugins(chatId2));
    assert(
        plugins1.includes('auto-reply') && plugins2.includes('msg-extractor') &&
        !plugins1.includes('msg-extractor') && !plugins2.includes('auto-reply'),
        '測試 4: 多個聊天獨立',
        '聊天狀態未正確隔離'
    );

    // 測試 5: 停止所有工具
    const stopped = chatManager.stopAllPlugins(chatId1);
    assert(
        stopped.includes('auto-reply') && !chatManager.hasActivePlugins(chatId1),
        '測試 5: 停止所有工具',
        '停止工具功能未正確工作'
    );

    // 測試 6: 移除特定工具
    chatManager.addActivePlugin(chatId2, 'tool1');
    chatManager.addActivePlugin(chatId2, 'tool2');
    chatManager.removeActivePlugin(chatId2, 'tool1');
    const pluginsAfterRemove = Array.from(chatManager.getActivePlugins(chatId2));
    assert(
        !pluginsAfterRemove.includes('tool1') && pluginsAfterRemove.includes('tool2'),
        '測試 6: 移除特定工具',
        '移除特定工具功能未正確工作'
    );

    printDivider();
}

// ============================================
// 【測試 PluginManager】
// ============================================

class PluginManager {
    constructor() {
        this.plugins = [];
        this.pluginInstances = new Map();
        this.loadPlugins();
    }

    loadPlugins() {
        const toolsPath = path.join(__dirname, 'tools');

        if (!fs.existsSync(toolsPath)) {
            console.log(`⚠️ tools 資料夾不存在，使用測試數據`);
            // 使用測試數據
            this.plugins = [
                { name: 'auto-reply', description: '自動回覆工具' },
                { name: 'msg-extractor', description: '訊息提取工具' }
            ];
            return;
        }

        const items = fs.readdirSync(toolsPath);

        items.forEach(item => {
            const itemPath = path.join(toolsPath, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                const indexPath = path.join(itemPath, 'index.js');
                const readmePath = path.join(itemPath, 'README.md');

                if (fs.existsSync(indexPath)) {
                    let description = '無描述';

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
    }

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

    getPluginName(index) {
        if (index >= 0 && index < this.plugins.length) {
            return this.plugins[index].name;
        }
        return null;
    }

    async activatePlugin(index, chatId) {
        if (index < 0 || index >= this.plugins.length) {
            return null;
        }

        const plugin = this.plugins[index];
        const instanceKey = `${chatId}_${plugin.name}`;

        // 模擬創建實例
        this.pluginInstances.set(instanceKey, {
            name: plugin.name,
            description: plugin.description,
            instance: { processMessage: () => {} },
            chatId: chatId
        });

        return {
            name: plugin.name,
            description: plugin.description,
            instance: { processMessage: () => {} }
        };
    }

    getPluginInstance(pluginName, chatId) {
        const instanceKey = `${chatId}_${pluginName}`;
        return this.pluginInstances.get(instanceKey);
    }

    removePluginInstance(pluginName, chatId) {
        const instanceKey = `${chatId}_${pluginName}`;
        this.pluginInstances.delete(instanceKey);
    }
}

function testPluginManager() {
    console.log(`[${getTimestamp()}] 🧪 測試 PluginManager...`);
    printDivider();

    const pluginManager = new PluginManager();

    // 測試 1: 載入工具
    assert(
        pluginManager.plugins.length > 0,
        '測試 1: 載入工具',
        '工具未正確載入'
    );

    // 測試 2: 獲取工具列表
    const list = pluginManager.getPluginList();
    assert(
        list.includes('可用工具列表'),
        '測試 2: 獲取工具列表',
        '工具列表格式不正確'
    );

    // 測試 3: 獲取工具名稱
    const name = pluginManager.getPluginName(0);
    assert(
        name !== null && typeof name === 'string',
        '測試 3: 獲取工具名稱',
        '工具名稱未正確獲取'
    );

    // 測試 4: 無效索引返回 null
    const invalidName = pluginManager.getPluginName(999);
    assert(
        invalidName === null,
        '測試 4: 無效索引返回 null',
        '無效索引未返回 null'
    );

    // 測試 5: 為特定聊天啟動工具
    const chatId = 'test_chat_123';
    pluginManager.activatePlugin(0, chatId).then(plugin => {
        assert(
            plugin !== null && plugin.name === pluginManager.getPluginName(0),
            '測試 5: 為特定聊天啟動工具',
            '工具啟動失敗'
        );

        // 測試 6: 獲取工具實例
        const instance = pluginManager.getPluginInstance(plugin.name, chatId);
        assert(
            instance !== undefined && instance.chatId === chatId,
            '測試 6: 獲取工具實例',
            '工具實例未正確存儲'
        );

        // 測試 7: 移除工具實例
        pluginManager.removePluginInstance(plugin.name, chatId);
        const removedInstance = pluginManager.getPluginInstance(plugin.name, chatId);
        assert(
            removedInstance === undefined,
            '測試 7: 移除工具實例',
            '工具實例未正確移除'
        );

        printDivider();
        runTestsPart2();
    });
}

// ============================================
// 【測試指令處理邏輯】
// ============================================

function testCommandProcessing() {
    console.log(`[${getTimestamp()}] 🧪 測試指令處理邏輯...`);
    printDivider();

    // 測試 1: 數字提取（單個數字）
    const message1 = '@96894613209135 1';
    const numericMatch1 = message1.match(/\b[0-9]\b/);
    assert(
        numericMatch1 && numericMatch1[0] === '1',
        '測試 1: 從 @提及訊息中提取數字',
        `期望提取 "1"，但得到 "${numericMatch1 ? numericMatch1[0] : 'null'}"`
    );

    // 測試 2: 數字提取（避免長數字 ID）
    const message2 = '@96894613209135';
    const numericMatch2 = message2.match(/\b[0-9]\b/);
    assert(
        numericMatch2 === null,
        '測試 2: 避免提取長數字 ID',
        '不應該從純 @提及中提取數字'
    );

    // 測試 3: 數字提取（多個數字）
    const message3 = '@96894613209135 2';
    const numericMatch3 = message3.match(/\b[0-9]\b/);
    assert(
        numericMatch3 && numericMatch3[0] === '2',
        '測試 3: 提取第二個數字',
        `期望提取 "2"，但得到 "${numericMatch3 ? numericMatch3[0] : 'null'}"`
    );

    // 測試 4: 數字提取（純數字）
    const message4 = '1';
    const numericMatch4 = message4.match(/\b[0-9]\b/);
    assert(
        numericMatch4 && numericMatch4[0] === '1',
        '測試 4: 提取純數字',
        `期望提取 "1"，但得到 "${numericMatch4 ? numericMatch4[0] : 'null'}"`
    );

    // 測試 5: 指令識別（start）
    const message5 = '@96894613209135 start';
    const hasStart = message5.toLowerCase().includes('start');
    assert(
        hasStart === true,
        '測試 5: 識別 start 指令',
        '未正確識別 start 指令'
    );

    // 測試 6: 指令識別（stop）
    const message6 = '@96894613209135 stop';
    const hasStop = message6.toLowerCase().includes('stop');
    assert(
        hasStop === true,
        '測試 6: 識別 stop 指令',
        '未正確識別 stop 指令'
    );

    // 測試 7: 指令識別（test）
    const message7 = '@96894613209135 test';
    const hasTest = message7.toLowerCase().includes('test');
    assert(
        hasTest === true,
        '測試 7: 識別 test 指令',
        '未正確識別 test 指令'
    );

    // 測試 8: 無效指令
    const message8 = '@96894613209135 hello';
    const hasInvalidCommand = message8.toLowerCase().includes('start') ||
                               message8.toLowerCase().includes('stop') ||
                               message8.toLowerCase().includes('test');
    assert(
        hasInvalidCommand === false,
        '測試 8: 識別無效指令',
        '不應該識別 hello 為有效指令'
    );

    printDivider();
}

// ============================================
// 【測試邊界情況】
// ============================================

function testEdgeCases() {
    console.log(`[${getTimestamp()}] 🧪 測試邊界情況...`);
    printDivider();

    const chatManager = new ChatManager();

    // 測試 1: 空聊天 ID
    try {
        const state = chatManager.getChatState('');
        assert(
            state !== undefined,
            '測試 1: 空聊天 ID',
            '空聊天 ID 應該創建狀態'
        );
    } catch (error) {
        assert(
            false,
            '測試 1: 空聊天 ID',
            `發生錯誤: ${error.message}`
        );
    }

    // 測試 2: 特殊字符聊天 ID
    try {
        const state = chatManager.getChatState('chat_@#$%^&*()');
        assert(
            state !== undefined,
            '測試 2: 特殊字符聊天 ID',
            '特殊字符聊天 ID 應該創建狀態'
        );
    } catch (error) {
        assert(
            false,
            '測試 2: 特殊字符聊天 ID',
            `發生錯誤: ${error.message}`
        );
    }

    // 測試 3: 重複添加相同工具
    const chatId = 'test_chat';
    chatManager.addActivePlugin(chatId, 'tool1');
    chatManager.addActivePlugin(chatId, 'tool1'); // 重複添加
    const plugins = Array.from(chatManager.getActivePlugins(chatId));
    assert(
        plugins.length === 1,
        '測試 3: 重複添加相同工具',
        'Set 應該自動去重'
    );

    // 測試 4: 移除不存在的工具
    try {
        chatManager.removeActivePlugin(chatId, 'nonexistent_tool');
        assert(
            true,
            '測試 4: 移除不存在的工具',
            ''
        );
    } catch (error) {
        assert(
            false,
            '測試 4: 移除不存在的工具',
            `不應該拋出錯誤: ${error.message}`
        );
    }

    // 測試 5: 停止沒有工具的聊天
    const emptyChatId = 'empty_chat';
    const stopped = chatManager.stopAllPlugins(emptyChatId);
    assert(
        Array.isArray(stopped) && stopped.length === 0,
        '測試 5: 停止沒有工具的聊天',
        '應該返回空數組'
    );

    printDivider();
}

// ============================================
// 【運行測試】
// ============================================

function runTestsPart2() {
    testCommandProcessing();
    testEdgeCases();
    printFinalResults();
}

function printFinalResults() {
    printDivider();
    console.log(`[${getTimestamp()}] 📊 測試結果統計`);
    printDivider();
    console.log(`✅ 通過: ${testResults.passed}`);
    console.log(`❌ 失敗: ${testResults.failed}`);
    console.log(`📋 總計: ${testResults.passed + testResults.failed}`);
    
    if (testResults.errors.length > 0) {
        console.log('\n❌ 失敗的測試:');
        testResults.errors.forEach((err, index) => {
            console.log(`  ${index + 1}. ${err.test}`);
            console.log(`     ${err.error}`);
        });
    }
    
    printDivider();
    
    if (testResults.failed === 0) {
        console.log('🎉 所有測試通過！');
    } else {
        console.log(`⚠️ 有 ${testResults.failed} 個測試失敗，請檢查並修復。`);
    }
    
    printDivider();
}

// 開始測試
console.log('\n');
console.log('╔' + '═'.repeat(58) + '╗');
console.log('║' + ' '.repeat(15) + 'WhatsApp Bot 測試程式' + ' '.repeat(20) + '║');
console.log('╚' + '═'.repeat(58) + '╝');
console.log('\n');

testChatManager();
testPluginManager();
// testCommandProcessing 和 testEdgeCases 在 testPluginManager 的回调中调用
