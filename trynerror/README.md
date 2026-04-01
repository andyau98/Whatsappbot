# Try N Error - v3.0 測試版本

此資料夾包含 WhatsApp Bot v3.0 的測試版本，用於開發和測試新功能。

## 📁 檔案結構

```
trynerror/
├── index.js              # 主程式（整合 SmartCommand）
├── package.json          # 專案配置
├── test.js               # 測試程式
├── tools/                # 工具集
│   ├── auto-reply/       # 自動回覆器
│   ├── msg-extractor/    # 訊息提取器
│   └── smart-command/    # 智能指令解析器（v3.0 新增）
└── README.md             # 本文件
```

## 🧪 測試內容

### SmartCommand 智能指令解析
- 測試自然語言指令識別
- 測試多種同義詞匹配
- 測試負面指令處理
- 測試信心度評分

### 傳統功能測試
- ChatManager 功能測試
- PluginManager 功能測試
- 指令處理邏輯測試
- 邊界情況測試

## 🚀 使用方式

### 運行測試程式
```bash
cd trynerror
node test.js
```

### 運行主程式（獨立測試）
```bash
cd trynerror
node index.js
```

## 📝 v3.0 新功能

### 智能指令解析
可以直接用自然語言操作：
- 「幫我記住這個」→ 啟動 msg-extractor
- 「開始自動回覆」→ 啟動 auto-reply
- 「停止所有功能」→ 停止所有工具
- 「顯示選單」→ 顯示工具列表
- 「查看狀態」→ 顯示運行狀態

## ⚠️ 注意事項

- 此為測試版本，僅供開發使用
- 正式版本請參考主目錄
- v3.0 基於 v2.0 的多聊天獨立架構
- 新增 SmartCommand 智能指令解析工具

---

*版本：v3.0*
*更新日期：2026-04-02*
