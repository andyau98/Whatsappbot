# AutoReply 自動回覆工具

## 【功能說明】

根據關鍵字自動回覆訊息，支援自定義回覆規則。

## 【使用方式】

### 1. 作為主程式插件

在主程式中輸入 `start`，選擇 `2. auto-reply` 啟動。

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
| hello/hi/你好 | 你好！有什麼可以幫助你的嗎？ | 問候回覆 |
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

### processMessage(msg)

處理訊息並根據規則回覆。

```javascript
const AutoReply = require('./auto-reply');
const autoReply = new AutoReply();

// 處理訊息
const result = await autoReply.processMessage(msg);
// result: { matched: true/false, rule: {...}, response: '...' }
```

### addRule(rule)

動態添加新規則。

```javascript
autoReply.addRule({
    keywords: ['新關鍵字'],
    response: '新回覆內容',
    matchType: 'contains'
});
```

### getStats()

獲取統計資訊。

```javascript
const stats = autoReply.getStats();
// stats: { processed: 100, replied: 50, rules: {...} }
```

## 【配置選項】

```javascript
const autoReply = new AutoReply({
    verbose: true  // 是否顯示詳細日誌
});
```

## 【版本】

v1.0
