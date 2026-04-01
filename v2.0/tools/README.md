# WhatsApp Bot 工具集

此資料夾包含所有 WhatsApp 機器人的獨立功能模組，每個工具都可單獨運行或與主程式組合使用。

## 📁 工具列表

### 1. msg-extractor（訊息提取器）

**功能：** 從 WhatsApp 提取訊息並儲存到本地電腦

**特點：**
- ✅ 自動儲存所有收到的訊息
- ✅ 分類儲存文字訊息和媒體檔案
- ✅ 按日期整理（每天一個 JSON 檔案）
- ✅ 自動下載圖片、影片、檔案
- ✅ 可獨立運行或作為模組引用

**使用方式：**
```bash
cd tools/msg-extractor
node index.js
```

**儲存結構：**
```
messages/
├── text/              # 文字訊息（JSON 格式）
│   ├── 2026-04-01.json
│   └── ...
└── media/             # 媒體檔案
    ├── xxx.jpg
    └── ...
```

**詳細說明：** [msg-extractor/README.md](./msg-extractor/README.md)

---

## 🔧 工具開發規範

### 新增工具的步驟：

1. 在 `tools/` 下創建新資料夾
2. 包含以下檔案：
   - `index.js` - 主程式
   - `package.json` - 模組配置
   - `README.md` - 使用說明
3. 更新此 README.md，在列表中加入新工具

### 工具設計原則：

- **獨立性**：每個工具都可獨立運行
- **模組化**：可被主程式或其他工具引用
- **文檔化**：必須包含完整的 README
- **配置化**：支援自定義配置選項

---

## 📦 專案結構

```
Whatsappbot/
├── index.js              # 主程式
├── tools/                # 工具集
│   ├── README.md         # 本文件
│   └── msg-extractor/    # 訊息提取器
│       ├── index.js
│       ├── package.json
│       └── README.md
├── v1.0/                 # 版本備份
└── README.md             # 主說明文件
```

---

## 🔮 計劃中的工具

- [ ] **ai-responder** - AI 自動回覆模組
- [ ] **msg-search** - 訊息搜尋模組
- [ ] **stats-analyzer** - 數據統計分析模組
- [ ] **web-dashboard** - Web 管理介面

---

*最後更新：2026-04-01*
