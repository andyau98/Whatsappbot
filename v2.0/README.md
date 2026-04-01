# WhatsApp Bot v2.0

## 版本說明

此版本為 **v2.0**，主要改進為每個聊天（私聊/群組）獨立管理工具狀態。

## 主要功能

### 1. 每個聊天獨立管理工具
- 每個聊天（私聊/群組）都有自己獨立的工具狀態
- 在一個聊天中啟動的工具，不影響其他聊天
- 支援多個聊天同時使用不同工具

### 2. 工具管理
- `start` - 顯示工具選單
- `1`, `2` - 選擇工具
- `0` - 取消選擇
- `stop` - 停止當前聊天的工具

### 3. 支援的工具
1. **auto-reply** - 自動回覆訊息
2. **msg-extractor** - 訊息提取和儲存

## 使用方式

### 私聊
直接發送指令：
- `start` - 開啟工具選單
- `1` 或 `2` - 選擇工具
- `0` - 取消選擇
- `stop` - 停止工具
- `test` 或 `!test` - 測試連接

### 群組
需要 @提及機器人：
- `@機器人 start` - 開啟工具選單
- `@機器人 1` 或 `@機器人 2` - 選擇工具
- `@機器人 0` - 取消選擇
- `@機器人 stop` - 停止工具
- `@機器人 test` 或 `@機器人 !test` - 測試連接

## 使用場景示例

### 群組 A：
1. 用戶 A: `@機器人 start` → 顯示選單
2. 用戶 A: `@機器人 1` → 啟動 auto-reply（僅群組 A 生效）
3. 群組 A 的訊息會被 auto-reply 處理

### 群組 B：
1. 用戶 B: `@機器人 start` → 顯示選單
2. 用戶 B: `@機器人 2` → 啟動 msg-extractor（僅群組 B 生效）
3. 群組 B 的訊息會被 msg-extractor 儲存

### 私聊 C：
1. 用戶 C: `start` → 顯示選單
2. 用戶 C: `1` → 啟動 auto-reply（僅私聊 C 生效）
3. 私聊 C 的訊息會被 auto-reply 處理

### 停止工具
- 群組 A: `@機器人 stop` → 僅停止群組 A 的 auto-reply
- 群組 B 和私聊 C 的工具不受影響

## 技術架構

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

### ChatManager
- `getChatState(chatId)` - 獲取或創建聊天狀態
- `setWaitingForSelection(chatId, waiting)` - 設置等待選擇狀態
- `isWaitingForSelection(chatId)` - 檢查是否正在等待選擇
- `addActivePlugin(chatId, pluginName)` - 添加活動工具
- `removeActivePlugin(chatId, pluginName)` - 移除活動工具
- `getActivePlugins(chatId)` - 獲取活動工具列表
- `stopAllPlugins(chatId)` - 停止所有活動工具
- `hasActivePlugins(chatId)` - 檢查是否有活動工具

### PluginManager
- `loadPlugins()` - 掃描並載入所有工具
- `getPluginList()` - 獲取工具列表
- `activatePlugin(index, chatId)` - 為特定聊天啟動工具
- `getPluginName(index)` - 獲取工具名稱
- `getPluginInstance(pluginName, chatId)` - 獲取特定聊天的工具實例
- `removePluginInstance(pluginName, chatId)` - 移除特定聊天的工具實例

## 指令處理流程

1. **顯示訊息** - 所有訊息（包括自己發送的）都會顯示在 Terminal
2. **檢查 @提及** - 群組中需要 @提及機器人才能執行指令
3. **處理指令** - 根據指令類型執行相應操作
4. **工具訊息處理** - 檢查當前聊天是否有活動的工具，並將訊息傳遞給工具處理

## 數字提取規則

使用正則表達式 `\b[0-9]\b` 提取單個數字（0-9），避免提取長數字 ID。

**示例：**
- `@機器人 1` → 提取 `1`
- `@96894613209135 2` → 提取 `2`
- `@96894613209135` → 不提取（避免提取機器人 ID）

## 檔案結構

```
v2.0/
├── index.js          # 主程式
├── package.json      # 專案配置
├── tools/            # 工具目錄
│   ├── auto-reply/   # 自動回覆工具
│   └── msg-extractor/# 訊息提取工具
└── README.md         # 版本說明
```

## 測試

執行 `node test.js` 運行測試程式，驗證所有功能是否正常。

測試覆蓋：
- ChatManager 功能
- PluginManager 功能
- 指令處理邏輯
- 邊界情況

## 版本歷史

- **v1.0** - 基礎版本，全局工具管理
- **v2.0** - 每個聊天獨立管理工具狀態

## 創建日期

2026-04-02
