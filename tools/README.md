# WhatsApp Bot 工具集

此資料夾包含所有 WhatsApp 機器人的獨立功能模組，每個工具都可單獨運行或與主程式組合使用。

## 📁 工具列表

### 1. auto-reply（自動回覆器）

【功能說明】
根據關鍵字自動回覆訊息，支援自定義回覆規則。

**特點：**
- ✅ 支援多個關鍵字匹配
- ✅ 支援精確匹配和包含匹配
- ✅ 可區分私聊和群組
- ✅ 統計回覆數據
- ✅ 可獨立運行或作為模組引用

**使用方式：**
```bash
cd tools/auto-reply
node index.js
```

**詳細說明：** [auto-reply/README.md](./auto-reply/README.md)

---

### 2. msg-extractor（訊息提取器）

【功能說明】
從 WhatsApp 提取訊息並儲存到本地電腦，支援文字和媒體檔案自動分類儲存。

**特點：**
- ✅ 自動儲存所有收到的訊息
- ✅ 分類儲存文字訊息和媒體檔案
- ✅ 按日期整理（每天一個 JSON 檔案）
- ✅ 自動下載圖片、影片、檔案
- ✅ 支援每個聊天獨立儲存（v2.0）
- ✅ 可獨立運行或作為模組引用

**使用方式：**
```bash
cd tools/msg-extractor
node index.js
```

**儲存結構：**
```
messages/
├── {chatId_1}/         # 聊天 1 的訊息
│   ├── text/           # 文字訊息（JSON 格式）
│   │   ├── 2026-04-01.json
│   │   └── ...
│   └── media/          # 媒體檔案
│       ├── xxx.jpg
│       └── ...
├── {chatId_2}/         # 聊天 2 的訊息
│   └── ...
```

**詳細說明：** [msg-extractor/README.md](./msg-extractor/README.md)

---

### 3. smart-command（智能指令解析器）

【功能說明】
使用自然語言解析用戶意圖，自動轉換為系統指令。無需記憶固定指令，用日常語言即可操作機器人。

**特點：**
- ✅ 自然語言理解，用日常語言操作
- ✅ 多種表達方式，支援各種同義詞
- ✅ 智能意圖識別，自動判斷用戶想要做什麼
- ✅ 信心度評分，評估識別準確性
- ✅ 負面指令處理，識別「不要」「停止」等否定語句
- ✅ 可擴展規則，容易添加新的指令模式

**使用方式：**
```bash
cd tools/smart-command
node index.js
```

**支援的指令範例：**
- "幫我記住這個" → 啟動 msg-extractor
- "開始自動回覆" → 啟動 auto-reply
- "停止所有功能" → 停止所有工具
- "顯示選單" → 顯示工具列表
- "查看狀態" → 顯示運行狀態

**詳細說明：** [smart-command/README.md](./smart-command/README.md)

---

## 🔧 工具開發規範

### 新增工具的步驟：

1. 在 `tools/` 下創建新資料夾
2. 包含以下檔案：
   - `index.js` - 主程式
   - `package.json` - 模組配置
   - `README.md` - 使用說明
3. 更新此 README.md，在列表中加入新工具
4. 參考 [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md) 了解詳細規範

### 工具設計原則：

- **獨立性**：每個工具都可獨立運行
- **模組化**：可被主程式或其他工具引用
- **文檔化**：必須包含完整的 README
- **配置化**：支援自定義配置選項
- **v2.0 相容**：支援每個聊天獨立管理

### v2.0 相容要求：

工具必須支援以下配置參數：

```javascript
class ToolName {
    constructor(config = {}) {
        this.config = config;
        this.chatId = config.chatId; // 所屬聊天的 ID
        
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

## 📦 專案結構

```
Whatsappbot/
├── index.js              # 主程式
├── test.js               # 測試程式
├── tools/                # 工具集
│   ├── README.md         # 本文件
│   ├── auto-reply/       # 自動回覆器
│   │   ├── index.js
│   │   ├── package.json
│   │   └── README.md
│   ├── msg-extractor/    # 訊息提取器
│   │   ├── index.js
│   │   ├── package.json
│   │   └── README.md
│   └── smart-command/    # 智能指令解析器 (v3.0)
│       ├── index.js
│       ├── package.json
│       └── README.md
├── v1.0/                 # 版本 1.0 備份
├── v2.0/                 # 版本 2.0 備份
├── DEVELOPMENT_GUIDE.md  # 開發規範
└── README.md             # 主說明文件
```

---

## 🔮 計劃中的工具

- [ ] **ai-responder** - AI 自動回覆模組
- [ ] **msg-search** - 訊息搜尋模組
- [ ] **stats-analyzer** - 數據統計分析模組
- [ ] **web-dashboard** - Web 管理介面

---

## 📚 相關文件

- [主程式說明](../README.md)
- [開發規範](../DEVELOPMENT_GUIDE.md)
- [v2.0 版本說明](../v2.0/README.md)

---

*最後更新：2026-04-02*
