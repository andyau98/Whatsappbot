# WhatsApp 機器人 v4.0

## 🎯 版本特性

v4.0 是 WhatsApp 機器人的重大更新，引入了全新的互動體驗：

### ✨ 新功能
1. **分開訊息發送** - 工具選單分開發送多個訊息，每個工具獨立顯示
2. **滑動關聯功能** - 滑動特定工具訊息直接執行對應功能
3. **群組/私聊區分** - 群組用滑動回覆，私聊直接輸入
4. **訊息追蹤系統** - 追蹤每個訊息對應的工具，避免記憶體洩漏

## 📁 專案結構

```
v4.0/
├── index.js                    # 主程式入口
├── package.json                # 專案配置
├── README.md                   # 本文件
└── tools/                      # 工具目錄
    ├── auto-reply/            # 自動回覆工具
    ├── msg-extractor/         # 訊息提取工具
    ├── smart-command/         # 智能指令工具
    ├── weather/               # 天氣查詢工具
    └── slide-reply-interface.js # 滑動回覆接口
```

## 🚀 快速開始

### 安裝依賴
```bash
cd v4.0
npm install
```

### 啟動機器人
```bash
node index.js
```

### 掃描 QR Code
首次啟動時會顯示 QR Code，使用 WhatsApp 手機應用掃描即可登入。

## 📱 使用方式

### 群組使用（v4.0 新方式）
1. 輸入 `start` 開啟工具選單
2. 機器人會分開發送多個訊息：
   - 工具選單標題
   - 每個工具的詳細介紹（獨立訊息）
   - 操作指引
3. **滑動回覆**特定工具的訊息即可使用該功能
4. 例如：滑動回覆「天氣工具」訊息，輸入「香港天氣」

### 私聊使用（v4.0 新方式）
1. 直接輸入指令，無需滑動回覆
2. 啟動工具後，直接輸入功能指令
3. 例如：啟動天氣工具後，直接輸入「香港天氣」

## 🛠️ 工具列表

### 1. 自動回覆 (auto-reply)
- 根據關鍵字自動回覆訊息
- 支援自定義回覆規則
- 滑動回覆後可管理規則

### 2. 訊息提取 (msg-extractor)
- 從 WhatsApp 提取訊息並儲存到本地
- 支援文字和媒體檔案
- 自動分類儲存

### 3. 智能指令 (smart-command)
- 使用自然語言解析用戶意圖
- 自動轉換為系統指令
- 無需記憶固定指令

### 4. 天氣查詢 (weather)
- 查詢香港及全球天氣資訊
- 支援自然語言查詢
- 詳細天氣預報

## 🔧 技術架構

### 訊息追蹤系統
```javascript
// 追蹤發出的訊息
chatManager.trackMessage(messageId, toolName, chatId);

// 根據訊息ID獲取對應的工具
const toolName = chatManager.getToolByMessageId(messageId);
```

### 滑動回覆接口
```javascript
// 註冊滑動回覆處理器
slideReplyInterface.registerSlideReplyHandler(toolName, handler);

// 處理滑動回覆
await slideReplyInterface.processSlideReply(msg, toolName, messageBody);
```

## 📋 指令列表

- `start` - 開啟工具選單
- `stop` - 停止當前聊天的工具
- `今天天氣如何` - 查詢天氣
- `香港天氣` - 查詢指定城市天氣
- `幫助` / `help` - 顯示幫助訊息

## 🔒 安全與隱私

- 所有訊息處理都在本地完成
- 不會將用戶資料發送到外部伺服器
- 定期清理過期訊息追蹤（每24小時）

## 📝 版本歷史

- **v4.0** - 分開訊息發送、滑動關聯、群組私聊區分
- **v3.0** - 智能指令解析，支援自然語言操作
- **v2.0** - 多聊天獨立管理工具狀態
- **v1.0** - 基礎功能實現

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request 來改進這個專案。

## 📄 授權

MIT License
