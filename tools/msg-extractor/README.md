# WhatsApp 訊息提取與儲存模組

【功能說明】
從 WhatsApp 提取訊息並儲存到本地電腦，支援文字和媒體檔案自動分類儲存。

一個獨立的 WhatsApp 訊息提取模組，可將訊息儲存到本地電腦資料夾。

## 📦 功能特點

- ✅ **自動儲存**所有收到的訊息
- ✅ **分類儲存**文字訊息和媒體檔案
- ✅ **按日期整理**每天一個 JSON 檔案
- ✅ **媒體下載**自動下載圖片、影片、檔案
- ✅ **獨立運行**無需依賴其他模組
- ✅ **模組化設計**可被其他專案引用
- ✅ **v2.0** 支援每個聊天獨立儲存

## 📁 儲存結構

### v2.0 結構（每個聊天獨立）

```
messages/
├── {chatId_1}/              # 聊天 1 的訊息
│   ├── text/                # 文字訊息
│   │   ├── 2026-04-01.json
│   │   └── ...
│   └── media/               # 媒體檔案
│       ├── msg1234567890.jpg
│       └── ...
├── {chatId_2}/              # 聊天 2 的訊息
│   └── ...
└── ...
```

### 獨立運行結構

```
messages/
├── text/                    # 文字訊息
│   ├── 2026-04-01.json
│   └── ...
└── media/                   # 媒體檔案
    ├── msg1234567890.jpg
    └── ...
```

## 🚀 使用方式

### 方式 1：作為主程式插件（推薦）

在主程式中：
1. 輸入 `start` 顯示工具選單
2. 選擇 `2. msg-extractor` 啟動
3. 工具僅在當前聊天生效，訊息儲存到 `messages/{chatId}/`

### 方式 2：獨立運行

```bash
cd tools/msg-extractor
node index.js
```

獨立運行時會儲存所有聊天的訊息到 `messages/`。

### 方式 3：作為模組引用

```javascript
const MessageExtractor = require('./msg-extractor');

// 創建實例
const extractor = new MessageExtractor({
    savePath: './my-messages',
    saveMedia: true,
    verbose: true,
    chatId: 'chat_id'  // v2.0 新增：指定所屬聊天
});

// 初始化並啟動
extractor.initClient();
extractor.start();

// 獲取統計
const stats = extractor.getStats();
console.log(stats);
```

## ⚙️ 配置選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `savePath` | string | './messages' | 儲存路徑 |
| `saveMedia` | boolean | true | 是否儲存媒體檔案 |
| `mediaSizeLimit` | number | 50 | 媒體大小限制 (MB) |
| `verbose` | boolean | true | 是否顯示詳細日誌 |
| `chatId` | string | null | 所屬聊天的 ID（v2.0 新增）|

## 📝 訊息格式

儲存的 JSON 格式：

```json
{
  "id": "msg_xxx@xxx",
  "timestamp": 1234567890,
  "date": "2026-04-01",
  "from": {
    "name": "使用者名稱",
    "number": "8529xxxxxxxx"
  },
  "chat": {
    "id": "chat_xxx@xxx",
    "name": "群組名稱",
    "isGroup": true
  },
  "type": "chat",
  "body": "訊息內容",
  "hasMedia": false,
  "isForwarded": false,
  "savedAt": "2026-04-01T12:00:00.000Z"
}
```

## 🔧 快捷操作

### 查看統計

按 `Ctrl + C` 停止程式時會自動顯示統計：
- 文字訊息數量
- 媒體檔案數量
- 日期範圍

### 重置登入

```bash
rm -rf .wwebjs_auth
node index.js
```

## 🆕 v2.0 更新

### 支援每個聊天獨立儲存

- 新增 `chatId` 配置參數
- 每個聊天的訊息儲存到獨立資料夾
- 在主程式中啟動時，自動使用當前聊天的 ID

### 防止無限循環

- 自動檢測 `msg.fromMe`，忽略自己發送的訊息
- 避免機器人儲存自己的訊息

### 聊天隔離

- 工具只處理所屬聊天的訊息
- 其他聊天的訊息會被忽略

## 🔮 未來擴展

此模組可與以下功能組合：
- 🤖 AI 分析模組
- 🔍 訊息搜尋模組
- 📊 數據統計模組
- 🌐 Web 介面模組

## 📄 版本

- **v1.0** - 基礎功能：訊息提取、儲存、媒體下載
- **v2.0** - 支援每個聊天獨立儲存，防止無限循環

---

*最後更新：2026-04-02*
