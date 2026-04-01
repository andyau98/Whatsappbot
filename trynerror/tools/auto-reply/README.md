# AutoReply 自動回覆工具

## 【功能說明】

根據關鍵字自動回覆訊息，支援自定義回覆規則。

## 【使用方式】

### 1. 作為主程式插件（推薦）

在主程式中：
1. 輸入 `start` 顯示工具選單
2. 選擇 `1. auto-reply` 啟動
3. 工具僅在當前聊天生效

### 2. 獨立運行

```bash
cd tools/auto-reply
node index.js
```

## 【回覆規則】

### 預設規則

| 關鍵字 | 回覆內容 | 說明 |
|--------|----------|------|
| test/Test/TEST | it's ok | 測試回覆 |
| hello/hi/你好/您好 | 你好！有什麼可以幫助你的嗎？ | 問候回覆 |
| help/幫助/說明 | 可用指令列表 | 幫助回覆 |

### 擴展方式

在 `index.js` 的 `REPLY_RULES` 數組中添加新規則：

```javascript
{
    id: 'custom_reply',           // 規則唯一標識
    keywords: ['關鍵字1', '關鍵字2'],  // 觸發關鍵字
    response: '回覆內容',          // 回覆內容
    matchType: 'contains',        // 'exact'=完全匹配, 'contains'=包含匹配
    chatType: 'all',              // 'all'=全部, 'private'=私聊, 'group'=群組
    description: '規則描述'        // 規則說明
}
```

## 【API 方法】

### constructor(config)

創建 AutoReply 實例。

```javascript
const AutoReply = require('./auto-reply');

// v2.0 支援 chatId 參數
const autoReply = new AutoReply({
    verbose: true,        // 是否顯示詳細日誌
    chatId: 'chat_id'     // 所屬聊天的 ID（v2.0 新增）
});
```

### processMessage(msg)

處理訊息並根據規則回覆。

```javascript
const result = await autoReply.processMessage(msg);
// result: { matched: true/false, rule: {...}, response: '...', skipped: true/false }
```

**注意：** 工具會自動忽略自己發送的訊息（避免無限循環）。

### addRule(rule)

動態添加新規則。

```javascript
autoReply.addRule({
    id: 'my_rule',
    keywords: ['新關鍵字'],
    response: '新回覆內容',
    matchType: 'contains',
    chatType: 'all',
    description: '我的自定義規則'
});
```

### getStats()

獲取統計資訊。

```javascript
const stats = autoReply.getStats();
// stats: { processed: 100, replied: 50, rules: {...} }
```

### printRules()

顯示所有規則列表。

```javascript
autoReply.printRules();
```

## 【配置選項】

```javascript
const autoReply = new AutoReply({
    verbose: true,        // 是否顯示詳細日誌
    chatId: 'chat_id'     // 所屬聊天的 ID（v2.0 新增，主程式會自動傳入）
});
```

## 【v2.0 更新】

### 支援每個聊天獨立管理

- 工具現在支援 `config.chatId` 參數
- 每個聊天的工具實例獨立運作
- 在一個聊天中啟動的工具不影響其他聊天

### 防止無限循環

- 自動檢測 `msg.fromMe`，忽略自己發送的訊息
- 避免機器人回覆自己的訊息導致無限循環

## 【版本】

- v1.0 - 基礎自動回覆功能
- v2.0 - 支援每個聊天獨立管理，防止無限循環

---

*最後更新：2026-04-02*
