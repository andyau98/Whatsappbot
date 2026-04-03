# 天氣查詢工具 (Weather Tool)

查詢香港及全球天氣資訊的簡易工具。

## 🚀 使用方式

### 查詢香港天氣
```bash
node tools/weather/index.js
```

### 查詢其他城市
```bash
node tools/weather/index.js "Taipei"
node tools/weather/index.js "Tokyo"
node tools/weather/index.js "London"
```

## 📊 輸出範例

```
🌤️ Hong Kong 天氣資訊

📍 地點: Hong Kong, Hong Kong
🌡️ 溫度: 25°C (體感 27°C)
☁️ 天氣: 多雲
💧 濕度: 78%
🌬️ 風速: 15 km/h SE
👁️ 能見度: 10 km
🌅 日出: 06:15 AM
🌇 日落: 06:45 PM

📅 未來 3 天預報:
今天: 23°C - 28°C, 多雲
明天: 24°C - 29°C, 局部多雲
後天: 23°C - 27°C, 小雨

資料來源: wttr.in
```

## 🔧 作為模組使用

```javascript
const WeatherTool = require('./tools/weather');

const tool = new WeatherTool();
const weather = await tool.run('Hong Kong');
console.log(weather);
```

## 📡 資料來源

- [wttr.in](https://wttr.in/) - 免費天氣 API

## 📝 版本記錄

- **v1.0.0** (2026-04-02) - 初始版本，支援全球城市天氣查詢
