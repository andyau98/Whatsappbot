# SmartCommand 智能指令解析工具

【功能說明】
使用自然語言解析用戶意圖，自動轉換為系統指令。無需記憶固定指令，用日常語言即可操作機器人。

## 🎯 功能特點

- ✅ **自然語言理解** - 用日常語言操作，不用記指令
- ✅ **多種表達方式** - 支援各種同義詞和說法
- ✅ **智能意圖識別** - 自動判斷用戶想要做什麼
- ✅ **信心度評分** - 評估識別準確性
- ✅ **負面指令處理** - 識別「不要」「停止」等否定語句
- ✅ **可擴展規則** - 容易添加新的指令模式

## 🚀 使用方式

### 1. 作為主程式插件（推薦）

在主程式中：
1. 輸入 `start` 顯示工具選單
2. 選擇 `3. smart-command` 啟動
3. 直接用自然語言操作機器人

### 2. 獨立運行

```bash
cd tools/smart-command
node index.js
```

### 3. 作為模組引用

```javascript
const SmartCommand = require('./smart-command');

const smartCommand = new SmartCommand({
    verbose: true,
    chatId: 'chat_id'
});

// 解析用戶輸入
const result = smartCommand.parse('幫我記住這個');
console.log(result);
// { matched: true, command: 'msg-extractor', confidence: 80, ... }

// 獲取建議回覆
const response = smartCommand.getResponse(result);
console.log(response);
// '好的，我會開始記錄這個聊天的訊息。'
```

## 📝 支援的指令

### 📝 記錄訊息（msg-extractor）

| 說法範例 | 識別結果 |
|---------|---------|
| "幫我記住這個" | ✅ msg-extractor |
| "開始記錄訊息" | ✅ msg-extractor |
| "保存這個對話" | ✅ msg-extractor |
| "我要儲存訊息" | ✅ msg-extractor |
| "幫我備份聊天" | ✅ msg-extractor |

### 💬 自動回覆（auto-reply）

| 說法範例 | 識別結果 |
|---------|---------|
| "開始自動回覆" | ✅ auto-reply |
| "幫我回覆訊息" | ✅ auto-reply |
| "啟動自動回答" | ✅ auto-reply |
| "幫我響應訊息" | ✅ auto-reply |

### 🛑 停止功能（stop）

| 說法範例 | 識別結果 |
|---------|---------|
| "停止所有功能" | ✅ stop |
| "關閉所有工具" | ✅ stop |
| "結束運作" | ✅ stop |
| "不要記錄了" | ✅ stop |
| "取消自動回覆" | ✅ stop |

### 📋 顯示選單（start）

| 說法範例 | 識別結果 |
|---------|---------|
| "顯示選單" | ✅ start |
| "有什麼功能" | ✅ start |
| "可以做什麼" | ✅ start |
| "給我功能列表" | ✅ start |

### 📊 查看狀態（status）

| 說法範例 | 識別結果 |
|---------|---------|
| "查看狀態" | ✅ status |
| "現在在做什麼" | ✅ status |
| "運行情況如何" | ✅ status |

## ⚙️ API 方法

### constructor(config)

創建 SmartCommand 實例。

```javascript
const smartCommand = new SmartCommand({
    verbose: true,        // 是否顯示詳細日誌
    chatId: 'chat_id'     // 所屬聊天的 ID
});
```

### parse(text)

解析用戶輸入，識別意圖。

```javascript
const result = smartCommand.parse('幫我記住這個');
// {
//     matched: true,
//     command: 'msg-extractor',
//     confidence: 80,
//     originalText: '幫我記住這個',
//     timestamp: '2026-04-02T...'
// }
```

### getResponse(parseResult)

獲取建議的回覆文字。

```javascript
const response = smartCommand.getResponse(result);
// '好的，我會開始記錄這個聊天的訊息。'
```

### getStats()

獲取統計資訊。

```javascript
const stats = smartCommand.getStats();
// { parsed: 10, matched: 8, unmatched: 2, history: 10 }
```

### printHelp()

顯示指令說明。

```javascript
smartCommand.printHelp();
```

## 🔧 擴展指令規則

在 `COMMAND_PATTERNS` 中添加新的指令類型：

```javascript
'new-command': {
    keywords: [
        '關鍵字1', '關鍵字2', '關鍵字3'
    ],
    patterns: [
        /正則表達式1/,
        /正則表達式2/
    ],
    negativeKeywords: ['排除關鍵字1', '排除關鍵字2']
}
```

## 🎯 匹配邏輯

1. **關鍵字匹配** - 每個匹配關鍵字 +30 分
2. **正則模式匹配** - 每個匹配模式 +50 分
3. **負面關鍵字** - 如果存在，-60 分
4. **識別門檻** - 總分 > 0 即視為匹配

## 🆕 v3.0 更新

- 新增 SmartCommand 工具
- 支援自然語言指令解析
- 無需記憶固定指令格式

## 📄 版本

- v1.0 - 基礎智能指令解析

---

*最後更新：2026-04-02*
