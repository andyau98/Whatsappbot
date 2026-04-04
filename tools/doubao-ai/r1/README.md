# 豆包 AI Tool

透過 OpenCLI 連接豆包 AI，支援自然語言對話。

## 功能

- 自然語言對話
- 長篇回應支援（60秒超時）
- 完整回應解析

## 使用方式

```javascript
const DoubaoAiTool = require('./tools/doubao-ai/r1');
const doubao = new DoubaoAiTool({ timeout: 60000 });

const response = await doubao.ask('你好');
console.log(response);
```

## 指令

在 WhatsApp 中輸入 `#你的問題` 即可使用。
