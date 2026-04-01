# WhatsApp Bot v3.0

## 版本說明

此版本為 **v3.0**，主要新增 **智能指令解析** 功能，支援自然語言操作機器人。

## 主要功能

### 1. 智能指令解析（v3.0 新增）
- 使用自然語言操作機器人，無需記憶固定指令
- 支援多種同義詞和表達方式
- 自動識別用戶意圖並執行對應操作
- 智能處理負面指令（「不要」「停止」）

### 2. 每個聊天獨立管理工具（v2.0）
- 每個聊天（私聊/群組）都有自己獨立的工具狀態
- 在一個聊天中啟動的工具，不影響其他聊天
- 支援多個聊天同時使用不同工具

### 3. 工具管理
- `start` - 顯示工具選單
- `1`, `2`, `3` - 選擇工具
- `0` - 取消選擇
- `stop` - 停止當前聊天的工具

### 4. 支援的工具
1. **auto-reply** - 自動回覆訊息
2. **msg-extractor** - 訊息提取和儲存
3. **smart-command** - 智能指令解析（v3.0 新增）

## 使用方式

### 傳統指令方式
- `start` - 開啟工具選單
- `1` / `2` / `3` - 選擇工具
- `0` - 取消選擇
- `stop` - 停止工具
- `test` / `!test` - 測試連接

### 智能語言方式（v3.0 新增）
直接說出你的需求：

#### 📝 記錄訊息
- "幫我記住這個"
- "開始記錄訊息"
- "保存這個對話"
- "我要儲存訊息"

#### 💬 自動回覆
- "開始自動回覆"
- "幫我回覆訊息"
- "啟動自動回答"

#### 🛑 停止功能
- "停止所有功能"
- "關閉所有工具"
- "不要記錄了"
- "結束運作"

#### 📋 其他
- "顯示選單" - 查看所有功能
- "有什麼功能" - 查看可用工具
- "查看狀態" - 了解目前運作情況

## 使用場景示例

### 場景 1：智能啟動工具
用戶：「幫我記住這個」
機器人：「✅ 好的，我會開始記錄這個聊天的訊息。工具：msg-extractor 已啟動」

### 場景 2：智能停止工具
用戶：「不要記錄了」
機器人：「✅ 已停止所有功能。已停止：msg-extractor」

### 場景 3：查詢狀態
用戶：「查看狀態」
機器人：「📊 當前運行中的工具：
• msg-extractor
• auto-reply」

## 技術架構

### SmartCommand（智能指令解析）
```
用戶輸入 → 關鍵字匹配 → 正則模式匹配 → 信心度評分 → 指令識別 → 執行操作
```

**匹配邏輯：**
- 關鍵字匹配：每個匹配 +30 分
- 正則模式匹配：每個匹配 +50 分
- 負面關鍵字：-60 分
- 總分 > 0：視為有效匹配

### ChatManager（每個聊天獨立）
```
ChatManager
├── chatId_1: { waitingForSelection: false, activePlugins: {auto-reply} }
├── chatId_2: { waitingForSelection: true, activePlugins: {} }
└── chatId_3: { waitingForSelection: false, activePlugins: {msg-extractor} }
```

### PluginManager（每個聊天獨立實例）
```
PluginManager
├── chatId_1_auto-reply: instance
├── chatId_3_msg-extractor: instance
└── ...
```

## 核心類別

### SmartCommand
- `parse(text)` - 解析用戶輸入，識別意圖
- `getResponse(parseResult)` - 獲取建議回覆
- `getStats()` - 獲取統計資訊

### ChatManager
- `getChatState(chatId)` - 獲取或創建聊天狀態
- `setWaitingForSelection(chatId, waiting)` - 設置等待選擇狀態
- `addActivePlugin(chatId, pluginName)` - 添加活動工具
- `getActivePlugins(chatId)` - 獲取活動工具列表

### PluginManager
- `loadPlugins()` - 掃描並載入所有工具
- `activatePlugin(index, chatId)` - 為特定聊天啟動工具
- `getPluginInstance(pluginName, chatId)` - 獲取特定聊天的工具實例

## 檔案結構

```
v3.0/
├── index.js              # 主程式（整合 SmartCommand）
├── package.json          # 專案配置
├── test.js               # 測試程式
├── tools/                # 工具目錄
│   ├── auto-reply/       # 自動回覆工具
│   ├── msg-extractor/    # 訊息提取工具
│   └── smart-command/    # 智能指令解析工具（v3.0 新增）
└── README.md             # 版本說明
```

## 測試

執行 `node test.js` 運行測試程式，驗證所有功能是否正常。

測試覆蓋：
- ChatManager 功能
- PluginManager 功能
- SmartCommand 智能解析
- 指令處理邏輯
- 邊界情況

## 版本歷史

- **v1.0** - 基礎版本，全局工具管理
- **v2.0** - 每個聊天獨立管理工具狀態
- **v3.0** - 新增智能指令解析，支援自然語言操作

## 創建日期

2026-04-02
