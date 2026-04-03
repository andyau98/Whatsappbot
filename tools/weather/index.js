/**
 * 天氣查詢工具 - Weather Tool
 * 
 * 查詢香港及全球天氣資訊
 */

const https = require('https');

class WeatherTool {
    constructor(config = {}) {
        this.config = {
            verbose: config.verbose !== false,
            ...config
        };
    }

    /**
     * 獲取天氣資訊
     */
    async getWeather(city = 'Hong Kong') {
        return new Promise((resolve, reject) => {
            // 使用 wttr.in 免費 API
            const encodedCity = encodeURIComponent(city);
            const url = `https://wttr.in/${encodedCity}?format=j1`;

            if (this.config.verbose) {
                console.log(`[Weather] 查詢: ${city}`);
            }

            https.get(url, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const weather = JSON.parse(data);
                        resolve(weather);
                    } catch (error) {
                        reject(new Error('解析天氣資料失敗'));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * 格式化天氣輸出
     */
    formatWeather(weather, city) {
        const current = weather.current_condition?.[0];
        const location = weather.nearest_area?.[0];
        
        if (!current || !location) {
            return '無法獲取天氣資訊，請檢查城市名稱是否正確。';
        }
        
        const weatherDesc = current.lang_zh?.[0]?.value || 
                           current.weatherDesc?.[0]?.value || 
                           '未知';
        
        const astronomy = weather.weather?.[0]?.astronomy?.[0] || {};
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        const timeStr = now.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
🌤️ ${city} 天氣資訊

📅 查詢時間: ${dateStr} ${timeStr}
📍 地點: ${location.areaName?.[0]?.value || city}, ${location.country?.[0]?.value || '未知'}
🌡️ 溫度: ${current.temp_C}°C (體感 ${current.FeelsLikeC}°C)
☁️ 天氣: ${weatherDesc}
💧 濕度: ${current.humidity}%
🌬️ 風速: ${current.windspeedKmph} km/h ${current.winddir16Point}
👁️ 能見度: ${current.visibility} km
🌅 日出: ${astronomy.sunrise || '未知'}
🌇 日落: ${astronomy.sunset || '未知'}

📅 未來 3 天預報:
${weather.weather?.slice(0, 3).map((day, idx) => {
    const dayName = ['今天', '明天', '後天'][idx] || day.date;
    const dayWeather = day.hourly?.[4]?.lang_zh?.[0]?.value || 
                       day.hourly?.[4]?.weatherDesc?.[0]?.value || 
                       '未知';
    return `${dayName}: ${day.mintempC}°C - ${day.maxtempC}°C, ${dayWeather}`;
}).join('\n') || '無法獲取預報資訊'}

資料來源: wttr.in
        `.trim();
    }

    /**
     * 主要執行函數
     */
    async run(city = 'Hong Kong') {
        try {
            const weather = await this.getWeather(city);
            const output = this.formatWeather(weather, city);
            console.log(output);
            return output;
        } catch (error) {
            console.error(`[Weather] 錯誤: ${error.message}`);
            throw error;
        }
    }
}

// 如果是直接運行
if (require.main === module) {
    const city = process.argv[2] || 'Hong Kong';
    const tool = new WeatherTool({ verbose: true });
    tool.run(city);
}

module.exports = WeatherTool;
