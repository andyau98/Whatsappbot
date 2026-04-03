# 豆包 AI Tool

使用 OpenCLI 呼叫 Doubao (豆包) AI 的工具。

## 使用方法

### 作為模組使用
```javascript
const DoubaoAiTool = require('./tools/doubao-ai/r1');

const tool = new DoubaoAiTool();
const response = await tool.ask('你好');
console.log(response);
```

### 命令列使用
```bash
node tools/doubao-ai/r1/index.js "你的問題"
```

## 需求

- OpenCLI 已安裝並在 PATH 中
- OpenCLI 已配置豆包 (doubao-app)

## 安裝 OpenCLI

```bash
git clone https://github.com/jackwener/OpenCLI.git
cd OpenCLI
npm install
npm run build
```

## 注意事項

- 需要有效的 OpenCLI 安裝
- 豆包通過 OpenCLI 呼叫，無需額外 API Key
