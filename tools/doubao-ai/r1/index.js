/**
 * 豆包 AI Tool - 使用 OpenCLI 呼叫 Doubao
 * 
 * @version 1.0
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class DoubaoAiTool {
    constructor(config = {}) {
        this.verbose = config.verbose !== false;
        this.timeout = config.timeout || 30000;
        this.opencliPath = config.opencliPath || 'opencli';
        
        if (this.verbose) {
            console.log('[DoubaoAi] 初始化完成');
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
            if (this.verbose) {
                console.log(`[DoubaoAi] 發送問題: ${question.substring(0, 50)}...`);
            }

            // 使用 opencli 呼叫豆包
            const command = `${this.opencliPath} doubao-app ask "${question.replace(/"/g, '\\"')}"`;
            
            const { stdout, stderr } = await execAsync(command, {
                timeout: this.timeout,
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

        // 尋找 Assistant 行的內容
        const lines = output.split('\n');
        let inAssistantRow = false;
        let response = '';

        for (const line of lines) {
            // 檢查是否進入 Assistant 行
            if (line.includes('│ Assistant │')) {
                inAssistantRow = true;
                // 提取 Assistant 後的內容
                const match = line.match(/│ Assistant │\s*(.*?)\s*│/);
                if (match) {
                    response = match[1].trim();
                }
                continue;
            }
            
            // 如果在 Assistant 行且下一行是分隔線，結束
            if (inAssistantRow && line.includes('├') || line.includes('└')) {
                break;
            }
        }

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
