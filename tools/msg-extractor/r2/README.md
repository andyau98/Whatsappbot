# 訊息提取工具

提取 WhatsApp 聊天訊息並儲存到本地。

## 功能

- 提取文字訊息
- 儲存媒體檔案
- 按日期分類整理

## 使用方式

```javascript
const MsgExtractor = require('./tools/msg-extractor/r2');
const extractor = new MsgExtractor({ savePath: './messages' });

await extractor.run(message);
```

## 指令

在 WhatsApp 中輸入 `!2` 或 `!msg-extractor` 啟動。
