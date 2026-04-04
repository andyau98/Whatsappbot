# 天氣查詢工具

查詢全球城市天氣資訊。

## 功能

- 查詢全球天氣
- 使用 wttr.in API
- 支援中文城市名稱

## 使用方式

```javascript
const WeatherTool = require('./tools/weather/r2');
const weather = new WeatherTool();

const info = await weather.getWeather('Hong Kong');
console.log(info);
```

## 指令

在 WhatsApp 中輸入 `!3` 或 `!weather` 啟動。
