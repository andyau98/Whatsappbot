/**
 * 豆包 AI Tool - 使用 OpenCLI 呼叫 Doubao
 * 
 * @version 1.0
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = promisify(exec);

// 全局變數：記錄是否已發送系統提示詞（避免每次對話都發送）
let globalSystemPromptSent = false;

class DoubaoAiTool {
    constructor(config = {}) {
        this.verbose = config.verbose !== false;
        this.timeout = config.timeout || 30000;
        this.opencliPath = config.opencliPath || 'opencli';
        this.systemPrompt = this._loadSystemPrompt();
        
        if (this.verbose) {
            console.log('[DoubaoAi] 初始化完成');
        }
    }

    /**
     * 載入系統提示詞
     */
    _loadSystemPrompt() {
        try {
            // 使用簡潔版本避免特殊字符問題
            const promptPath = path.join(__dirname, 'prompt-simple.txt');
            if (fs.existsSync(promptPath)) {
                return fs.readFileSync(promptPath, 'utf8').trim();
            }
        } catch (error) {
            console.log('[DoubaoAi] 無法載入系統提示詞:', error.message);
        }
        return null;
    }

    /**
     * 發送系統提示詞（整個程式生命週期只發送一次）
     */
    async _sendSystemPrompt() {
        // 使用全局變數檢查是否已發送
        if (globalSystemPromptSent || !this.systemPrompt) {
            return;
        }

        try {
            if (this.verbose) {
                console.log('[DoubaoAi] 首次對話，發送系統提示詞...');
            }

            const timeoutMs = 20000; // 系統提示詞使用較短超時
            // 提示詞已經是清理過的格式
            const cleanPrompt = this.systemPrompt;
            
            const command = `${this.opencliPath} doubao-app send "${cleanPrompt}"`;
            
            await execAsync(command, {
                timeout: timeoutMs,
                cwd: process.cwd()
            });

            // 標記全局變數，避免重複發送
            globalSystemPromptSent = true;
            
            if (this.verbose) {
                console.log('[DoubaoAi] 系統提示詞已發送（後續對話不再發送）');
            }
        } catch (error) {
            console.log('[DoubaoAi] 發送系統提示詞失敗:', error.message);
            // 即使失敗也標記為已發送，避免重複嘗試
            globalSystemPromptSent = true;
        }
    }

    /**
     * 向豆包 AI 提問
     */
    async ask(question) {
        if (!question || question.trim() === '') {
            return '❌ 請提供問題';
        }

        try {
            // 首次對話時發送系統提示詞
            await this._sendSystemPrompt();

            if (this.verbose) {
                console.log(`[DoubaoAi] 發送問題: ${question.substring(0, 50)}...`);
            }

            // 使用 opencli 呼叫豆包（增加 timeout 參數，並附加字數限制提示）
            const timeoutMs = this.timeout || 30000;
            const limitedQuestion = `${question} (請在300個字內回復)`.replace(/"/g, '\\"');
            const command = `${this.opencliPath} doubao-app ask "${limitedQuestion}" --timeout ${timeoutMs}`;
            
            const { stdout, stderr } = await execAsync(command, {
                timeout: timeoutMs + 5000, // 給 exec 多 5 秒緩衝
                cwd: process.cwd()
            });

            if (stderr && this.verbose) {
                console.log('[DoubaoAi] stderr:', stderr);
            }

            // 解析 opencli 輸出
            const response = this._parseResponse(stdout);
            
            if (this.verbose) {
                console.log('[DoubaoAi] 收到回應');
            }
            
            return response;
        } catch (error) {
            console.error('[DoubaoAi] 錯誤:', error.message);
            
            if (error.message.includes('command not found')) {
                return '❌ OpenCLI 未安裝。請先安裝 opencli:\nhttps://github.com/jackwener/OpenCLI';
            }
            
            return `❌ 豆包 AI 請求失敗: ${error.message}`;
        }
    }

    /**
     * 解析 opencli 輸出
     */
    _parseResponse(output) {
        if (!output) return '無回應';

        // 尋找 Assistant 區塊的內容
        const lines = output.split('\n');
        let inAssistantBlock = false;
        let responseLines = [];

        for (const line of lines) {
            // 檢查是否進入 Assistant 行
            if (line.includes('│ Assistant │')) {
                inAssistantBlock = true;
                // 提取 Assistant 後的內容
                const match = line.match(/│ Assistant │\s*(.*?)\s*│/);
                if (match && match[1].trim()) {
                    responseLines.push(match[1].trim());
                }
                continue;
            }
            
            // 如果在 Assistant 區塊內，繼續收集內容
            if (inAssistantBlock) {
                // 檢查是否為內容行（以 │ 開頭和結尾）
                const contentMatch = line.match(/^[\s│]*│\s*(.*?)\s*│\s*$/);
                if (contentMatch) {
                    const content = contentMatch[1].trim();
                    // 跳過空行和分隔線
                    if (content && !content.match(/^[─┬┼┴]+$/)) {
                        responseLines.push(content);
                    }
                }
                
                // 檢查是否到達結尾（└ 符號）
                if (line.includes('└')) {
                    break;
                }
            }
        }

        const response = responseLines.join('\n');
        return response || output.trim();
    }

    /**
     * 運行工具（統一接口）
     */
    async run(question) {
        return await this.ask(question);
    }
}

module.exports = DoubaoAiTool;

// 如果直接運行此文件
if (require.main === module) {
    const tool = new DoubaoAiTool();
    const question = process.argv.slice(2).join(' ') || '你好';
    
    tool.ask(question).then(response => {
        console.log('\n🤖 豆包 AI 回應:\n');
        console.log(response);
        console.log('');
    }).catch(error => {
        console.error('錯誤:', error.message);
        process.exit(1);
    });
}
