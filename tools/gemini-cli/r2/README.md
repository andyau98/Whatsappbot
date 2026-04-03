# Gemini CLI Tool

使用 Google Gemini API 的 AI 對話工具，無需 opencli。

## 使用方法

### 環境變數設置
```bash
export GEMINI_API_KEY="你的API密鑰"
```

### 作為模組使用
```javascript
const GeminiCliTool = require('./tools/gemini-cli/r2');

const tool = new GeminiCliTool();
const response = await tool.askGemini('你好');
console.log(response);
```

### 命令列使用
```bash
node tools/gemini-cli/r2/index.js "你的問題"
```

## 取得 API Key

1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登入 Google 帳號
3. 點擊 "Create API Key"
4. 複製密鑰並設置環境變數

## 注意事項

- 需要有效的 Gemini API Key
- 免費版有使用限制（每分鐘 60 請求）
- 支援模型: gemini-1.5-flash (預設)
