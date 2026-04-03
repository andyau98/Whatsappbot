/**
 * Gemini CLI Tool - 使用 Google Gemini API
 * 
 * 不需要 opencli，直接使用官方 API
 * 
 * @version 2.0
 */

const https = require('https');

class GeminiCliTool {
    constructor(config = {}) {
        this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
        this.model = config.model || 'gemini-1.5-flash';
        this.timeout = config.timeout || 60000;
        this.verbose = config.verbose !== false;
        
        if (this.verbose) {
            console.log('[GeminiCli] 初始化完成');
        }
    }

    /**
     * 向 Gemini 提問
     */
    async askGemini(question) {
        if (!this.apiKey) {
            return '❌ 請設置 GEMINI_API_KEY 環境變數\n\n取得 API Key:\n1. 前往 https://makersuite.google.com/app/apikey\n2. 創建新的 API Key\n3. 設置環境變數: export GEMINI_API_KEY=你的密鑰';
        }

        if (!question || question.trim() === '') {
            return '❌ 請提供問題';
        }

        try {
            if (this.verbose) {
                console.log(`[GeminiCli] 發送問題: ${question.substring(0, 50)}...`);
            }

            const response = await this._callApi(question);
            
            if (this.verbose) {
                console.log('[GeminiCli] 收到回應');
            }
            
            return response;
        } catch (error) {
            console.error('[GeminiCli] 錯誤:', error.message);
            return `❌ Gemini 請求失敗: ${error.message}`;
        }
    }

    /**
     * 呼叫 Gemini API
     */
    _callApi(question) {
        return new Promise((resolve, reject) => {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
            
            const data = JSON.stringify({
                contents: [{
                    parts: [{
                        text: question
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                    topP: 0.8,
                    topK: 40
                }
            });

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                },
                timeout: this.timeout
            };

            const req = https.request(apiUrl, options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const jsonResponse = JSON.parse(responseData);
                        
                        if (jsonResponse.error) {
                            reject(new Error(jsonResponse.error.message || 'API 錯誤'));
                            return;
                        }

                        const text = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;
                        
                        if (text) {
                            resolve(text.trim());
                        } else {
                            reject(new Error('無法獲取回應內容'));
                        }
                    } catch (error) {
                        reject(new Error('解析回應失敗: ' + error.message));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error('請求失敗: ' + error.message));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('請求超時'));
            });

            req.write(data);
            req.end();
        });
    }

    /**
     * 運行工具（統一接口）
     */
    async run(question) {
        return await this.askGemini(question);
    }
}

module.exports = GeminiCliTool;

// 如果直接運行此文件
if (require.main === module) {
    const tool = new GeminiCliTool();
    const question = process.argv.slice(2).join(' ') || '你好';
    
    tool.askGemini(question).then(response => {
        console.log('\n🤖 Gemini 回應:\n');
        console.log(response);
        console.log('');
    }).catch(error => {
        console.error('錯誤:', error.message);
        process.exit(1);
    });
}
