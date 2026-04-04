# 工具目錄 (Tools)

最後更新：2026-04-04

## 📁 目錄結構

每個工具支援多版本管理：

```
tools/
├── doubao-ai/
│   └── r1/          # 豆包 AI 整合
├── msg-extractor/
│   ├── r1/          # 基礎版本 (v1-v3)
│   └── r2/          # 增強版本 (v4)
└── weather/
    ├── r1/          # 基礎版本
    └── r2/          # 增強版本
```

## 🛠️ 可用工具

### doubao-ai - 豆包 AI
透過 OpenCLI 連接豆包 AI，支援長篇回應。

**功能：**
- 自然語言對話
- 60秒超時設定
- 完整回應解析

### weather - 天氣查詢
查詢全球城市天氣，使用 wttr.in API。

**版本差異：**
- r1: 基礎天氣查詢
- r2: 增強格式化輸出

### msg-extractor - 訊息提取
提取聊天記錄並儲存。

**版本差異：**
- r1: 基礎提取功能
- r2: 增強格式化

## 🔄 版本管理規則

### 命名規範
- `r1`: 第一版（基礎功能）
- `r2`: 第二版（功能增強）
- `r3+`: 後續版本

### 更新流程
1. 複製最新版本：`cp -r r2 r3`
2. 在 `r3/` 中修改功能
3. 更新主程式引用 `r3`
4. 測試驗證
5. 提交到 GitHub

### 向後兼容
- 舊版本（v1-v3）繼續使用 r1
- 新版本（v4）使用 r2
- 不刪除舊版本，確保兼容性

## 📝 工具開發規範

### 檔案結構
```
tools/[tool-name]/[version]/
├── index.js         # 主程式
├── README.md        # 工具說明
└── package.json     # 依賴配置
```

### 類別結構
```javascript
class ToolName {
    constructor(config = {}) {
        // 初始化配置
    }
    
    async run(params) {
        // 主要功能
        return result;
    }
}

module.exports = ToolName;
```

## 🔗 引用方式

```javascript
// v1-v3 引用 r1
const Tool = require('../tools/tool-name/r1');

// v4 引用 r2
const Tool = require('../tools/tool-name/r2');
```

## ⚠️ 注意事項

- 每個版本獨立，修改不影響其他版本
- 提交前確保所有版本都能正常運行
- 更新 README.md 說明版本差異
