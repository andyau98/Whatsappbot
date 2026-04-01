# WhatsApp Bot 開發規範

本文檔記錄所有開發規則，供日後創建或修改工具時參考。

---

## 📐 核心設計原則

### 1. 跨電腦相容性
**規則：** 所有工具必須能在不同電腦上運行，無需修改路徑

**實現方式：**
```javascript
const path = require('path');

// 獲取專案/模組根目錄
const PROJECT_ROOT = __dirname;

// 或使用動態偵測（適用於可被引用的模組）
function getModuleRoot() {
    if (require.main === module) {
        return process.cwd();  // 獨立運行
    }
    return __dirname;  // 被引用
}

// 所有路徑使用絕對路徑
const authPath = path.join(PROJECT_ROOT, '.wwebjs_auth');
const savePath = path.join(PROJECT_ROOT, 'messages');
```

**必須顯示：**
```javascript
console.log(`[${getTimestamp()}] 📍 專案根目錄: ${PROJECT_ROOT}`);
```

---

### 2. 資料夾自動創建
**規則：** 程式必須自動創建所需資料夾，不能假設資料夾已存在

**實現方式：**
```javascript
const fs = require('fs');

function ensureDirectoryExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`[${getTimestamp()}] 📁 創建資料夾: ${dirPath}`);
        }
    } catch (error) {
        console.error(`[${getTimestamp()}] ❌ 無法創建資料夾 ${dirPath}:`, error.message);
        // 使用備選路徑
        const fallbackPath = path.join(process.cwd(), 'backup_folder');
        if (!fs.existsSync(fallbackPath)) {
            fs.mkdirSync(fallbackPath, { recursive: true });
        }
        console.log(`[${getTimestamp()}] ⚠️ 使用備選路徑: ${fallbackPath}`);
        return fallbackPath;
    }
    return dirPath;
}

// 在 constructor 或初始化時使用
constructor() {
    this.savePath = ensureDirectoryExists(path.join(PROJECT_ROOT, 'messages'));
    this.messagesPath = ensureDirectoryExists(path.join(this.savePath, 'text'));
    this.mediaPath = ensureDirectoryExists(path.join(this.savePath, 'media'));
}
```

---

### 3. 錯誤處理
**規則：** 所有可能出錯的操作必須有 try-catch 保護

**必須處理的場景：**
- 檔案讀寫
- 資料夾創建
- 網絡請求
- 媒體下載
- JSON 解析

**實現方式：**
```javascript
async saveData(data) {
    try {
        // 確保資料夾存在
        ensureDirectoryExists(this.savePath);
        
        // 執行操作
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error(`[${getTimestamp()}] ❌ 操作失敗:`, error.message);
        // 不要中斷程式，記錄錯誤即可
    }
}
```

---

### 4. 工具結構規範

#### 檔案結構
```
tools/tool-name/
├── index.js          # 主程式（必須）
├── package.json      # 模組配置（必須）
└── README.md         # 使用說明（必須）
```

#### index.js 結構
```javascript
/**
 * 工具名稱
 * 
 * 【功能說明】
 * 簡要描述功能
 * 
 * 【使用方式】
 * 1. 獨立運行：node index.js
 * 2. 作為模組：const tool = require('./tool-name');
 * 
 * @module tool-name
 * @version 1.0
 */

// 1. 引入依賴
const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');

// 2. 獲取根目錄
const MODULE_ROOT = __dirname;

// 3. 配置區
const CONFIG = {
    savePath: path.join(MODULE_ROOT, 'data'),
    authPath: path.join(MODULE_ROOT, '.wwebjs_auth'),
    // ...
};

// 4. 工具函數
function getTimestamp() { /* ... */ }
function ensureDirectoryExists(dirPath) { /* ... */ }

// 5. 主類別
class ToolName {
    constructor(config = {}) {
        this.config = { ...CONFIG, ...config };
        // 確保資料夾存在
        this.initPaths();
    }
    
    initPaths() {
        this.config.savePath = ensureDirectoryExists(this.config.savePath);
        // ...
    }
    
    initClient() {
        // 使用絕對路徑
        ensureDirectoryExists(this.config.authPath);
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: this.config.authPath
            }),
            // ...
        });
    }
}

// 6. 獨立運行入口
if (require.main === module) {
    const tool = new ToolName();
    tool.initClient();
    tool.start();
}

// 7. 模組匯出
module.exports = ToolName;
```

---

### 5. 配置規範

#### 預設配置結構
```javascript
const CONFIG = {
    // 路徑配置（必須使用絕對路徑）
    savePath: path.join(MODULE_ROOT, 'messages'),
    authPath: path.join(MODULE_ROOT, '.wwebjs_auth'),
    
    // 功能開關
    saveMedia: true,
    verbose: true,
    
    // 限制配置
    mediaSizeLimit: 50,  // MB
    maxMessagesPerDay: 10000,
    
    // 其他配置
    // ...
};
```

#### 允許用戶覆蓋的配置
```javascript
constructor(config = {}) {
    this.config = { ...CONFIG, ...config };
    // ...
}
```

---

### 6. 日誌規範

#### 時間戳記格式
```javascript
function getTimestamp() {
    return new Date().toLocaleString('zh-HK');
}
```

#### 日誌級別
```javascript
// 資訊
console.log(`[${getTimestamp()}] ℹ️ 一般資訊`);

// 成功
console.log(`[${getTimestamp()}] ✅ 操作成功`);

// 警告
console.log(`[${getTimestamp()}] ⚠️ 警告訊息`);

// 錯誤
console.error(`[${getTimestamp()}] ❌ 錯誤訊息`);

// 分隔線
console.log('\n' + '='.repeat(60) + '\n');
```

#### 必須記錄的資訊
- 程式啟動/停止
- 路徑資訊（根目錄、儲存路徑）
- 連接狀態變化
- 檔案創建/寫入
- 錯誤發生

---

### 6.5 數字提取規則（群組指令處理）

**規則：** 在群組中處理用戶輸入時，必須能夠從包含 @提及的文字中提取數字

**問題場景：**
- 用戶輸入：`@96894613209135 1`
- `parseInt("@96894613209135 1")` 返回 `NaN`
- 使用 `/\d+/` 會提取到 `96894613209135`（機器人 ID），而非 `1`

**正確做法：**
```javascript
// 提取單個數字（0-9），避免提取長數字 ID
const numericMatch = messageBody.match(/\b[0-9]\b/);
const selection = numericMatch ? parseInt(numericMatch[0]) : NaN;

// 使用示例
if (!isNaN(selection) && selection > 0) {
    // 處理有效數字
}
```

**正則表達式說明：**
- `\b` - 單詞邊界（word boundary）
- `[0-9]` - 匹配單個數字 0-9
- `\b` - 單詞邊界

**示例：**
| 輸入 | 匹配結果 | 說明 |
|------|----------|------|
| `@機器人 1` | `1` | 正確提取 |
| `@96894613209135 2` | `2` | 正確提取，跳過機器人 ID |
| `@96894613209135` | `null` | 無單個數字，不提取 |
| `1` | `1` | 正確提取 |
| `12` | `null` | 多個數字不提取（避免混淆）|

**適用場景：**
- 工具選擇（輸入 1, 2, 0）
- 任何需要數字輸入的指令
- 群組和私聊都應該支援

---

### 7. WhatsApp 客戶端配置

#### 標準配置
```javascript
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(PROJECT_ROOT, '.wwebjs_auth')
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});
```

---

### 8. 檔案命名規範

#### 安全檔名生成
```javascript
function generateSafeFilename(originalId, extension) {
    // 移除所有非字母數字字符
    const safeId = originalId.replace(/[^a-zA-Z0-9]/g, '_');
    // 限制長度
    const truncatedId = safeId.substring(0, 50);
    return `${truncatedId}.${extension}`;
}
```

#### 日期格式
```javascript
function getDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
// 結果：2026-04-01
```

---

### 9. 資料儲存格式

#### JSON 儲存
```javascript
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
    savedAt: new Date().toISOString()
};

// 寫入時格式化
fs.writeFileSync(filepath, JSON.stringify(messages, null, 2), 'utf8');
```

---

### 10. 版本控制

#### 版本號規則
- 主版本號（Major）：重大功能變更
- 次版本號（Minor）：新增功能
- 修訂號（Patch）：Bug 修復

```javascript
// package.json
{
    "version": "1.0.0"
}

// 檔案頭部註釋
/**
 * @version 1.0.0
 */
```

---

### 6.6 每個聊天獨立管理（v2.0 新增）

**規則：** 工具必須支援每個聊天（私聊/群組）獨立管理狀態

**架構設計：**
```javascript
// ChatManager - 管理每個聊天的狀態
class ChatManager {
    constructor() {
        this.chats = new Map(); // key: chatId, value: chatState
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
}

// PluginManager - 為每個聊天創建獨立實例
class PluginManager {
    constructor() {
        this.pluginInstances = new Map(); // key: `${chatId}_${pluginName}`
    }
    
    async activatePlugin(index, chatId) {
        const instanceKey = `${chatId}_${pluginName}`;
        // 為這個聊天創建獨立實例
        const instance = new PluginClass({
            savePath: path.join(PROJECT_ROOT, 'messages', chatId),
            chatId: chatId
        });
        this.pluginInstances.set(instanceKey, instance);
    }
}
```

**工具實現要求：**
```javascript
class ToolName {
    constructor(config = {}) {
        this.config = config;
        this.chatId = config.chatId; // 記錄所屬聊天
        
        // 使用聊天專屬路徑
        this.savePath = path.join(
            config.savePath || path.join(PROJECT_ROOT, 'messages'),
            this.chatId
        );
    }
    
    async processMessage(msg) {
        // 工具只處理所屬聊天的訊息
        const chat = await msg.getChat();
        if (chat.id._serialized !== this.chatId) {
            return; // 忽略其他聊天的訊息
        }
        
        // 處理訊息...
    }
}
```

---

## 📋 檢查清單

創建新工具時，請確認：

- [ ] 使用 `__dirname` 或 `getModuleRoot()` 獲取根目錄
- [ ] 所有路徑使用 `path.join()` 拼接
- [ ] 實現 `ensureDirectoryExists()` 函數
- [ ] 在 constructor 中初始化所有路徑
- [ ] 所有檔案操作有 try-catch 保護
- [ ] 包含完整的 JSDoc 註釋
- [ ] 包含 package.json
- [ ] 包含 README.md
- [ ] 更新 tools/README.md 工具列表
- [ ] 測試在不同目錄運行
- [ ] **(v2.0)** 支援 `config.chatId` 參數
- [ ] **(v2.0)** 使用聊天專屬儲存路徑
- [ ] **(v2.0)** 只處理所屬聊天的訊息

---

## 🔧 常用程式碼片段

### 獲取統計資訊
```javascript
getStats() {
    const stats = {
        textMessages: 0,
        mediaFiles: 0,
        dates: []
    };

    if (fs.existsSync(this.messagesPath)) {
        const files = fs.readdirSync(this.messagesPath);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const data = fs.readFileSync(path.join(this.messagesPath, file), 'utf8');
                const messages = JSON.parse(data);
                stats.textMessages += messages.length;
                stats.dates.push(file.replace('.json', ''));
            }
        });
    }

    return stats;
}
```

### 處理終止訊號
```javascript
process.on('SIGINT', () => {
    console.log('\n');
    console.log(`[${getTimestamp()}] 👋 正在關閉...`);
    
    const stats = tool.getStats();
    console.log(`[${getTimestamp()}] 📊 統計:`);
    console.log(`   文字訊息: ${stats.textMessages} 則`);
    console.log(`   媒體檔案: ${stats.mediaFiles} 個`);
    
    process.exit(0);
});
```

---

## 📚 參考文件

- [Node.js path 模組](https://nodejs.org/api/path.html)
- [Node.js fs 模組](https://nodejs.org/api/fs.html)
- [whatsapp-web.js 文檔](https://docs.wwebjs.dev/)

---

*最後更新：2026-04-01*
*版本：1.0*
