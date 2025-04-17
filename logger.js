// Logger class for centralized logging
class Logger {
    static async log(message, type = 'info', details = null) {
        // Ensure message is a string and not undefined
        const formattedMessage = message ? String(message) : 'No message provided';
        
        // Ensure type is valid
        const validTypes = ['info', 'success', 'warning', 'error', 'llm'];
        const validType = validTypes.includes(type) ? type : 'info';
        
        // Format timestamp consistently
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const logEntry = {
            timestamp,
            type: validType,
            message: formattedMessage,
            details: details && typeof details === 'object' ? details : null
        };

        try {
            // Get existing logs
            const { logs = [] } = await chrome.storage.local.get('logs');
            
            // Format message if it's a JSON string
            if (typeof logEntry.message === 'string' && 
                (logEntry.message.startsWith('{') || logEntry.message.startsWith('['))) {
                try {
                    const jsonObj = JSON.parse(logEntry.message);
                    logEntry.message = JSON.stringify(jsonObj, null, 2);
                } catch (e) {
                    // Not valid JSON, keep original message
                }
            }

            // Add to logs
            logs.push(logEntry);
            
            // Keep only last 1000 logs
            if (logs.length > 1000) {
                logs.shift();
            }
            
            await chrome.storage.local.set({ logs });

            // If it's an LLM interaction, store separately
            if (type === 'llm' && details) {
                const { llm_interactions = [] } = await chrome.storage.local.get('llm_interactions');
                llm_interactions.push({
                    ...details,
                    timestamp,
                    type: 'LLM_INTERACTION'
                });
                
                // Keep only last 100 LLM interactions
                if (llm_interactions.length > 100) {
                    llm_interactions.shift();
                }
                
                await chrome.storage.local.set({ llm_interactions });
            }

            // Send to popup if it's open
            try {
                await chrome.runtime.sendMessage({
                    action: 'log',
                    data: logEntry
                });
            } catch (error) {
                // Popup not open, log to console
                if (error.message.includes('Receiving end does not exist')) {
                    let consoleMessage = `[${timestamp}] ${validType.toUpperCase()}  ${formattedMessage}`;
                    if (details) {
                        consoleMessage += '\nDetails: ' + JSON.stringify(details, null, 2);
                    }
                    console.log(consoleMessage);
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Logging error:', error);
        }
    }

    static async getLogs() {
        try {
            const { logs = [], llm_interactions = [] } = await chrome.storage.local.get(['logs', 'llm_interactions']);
            return { 
                logs: logs.filter(log => log && log.message), 
                llm_interactions: llm_interactions.filter(interaction => interaction && interaction.symbol) 
            };
        } catch (error) {
            console.error('Error getting logs:', error);
            return { logs: [], llm_interactions: [] };
        }
    }

    static async clearLogs() {
        try {
            await chrome.storage.local.set({ logs: [], llm_interactions: [] });
        } catch (error) {
            console.error('Error clearing logs:', error);
            throw error;
        }
    }

    static formatLogsForDownload(logs) {
        return logs.map(log => {
            if (log.type === 'llm' && log.details) {
                const { symbol, request, response, currentPrice, lowerThreshold, upperThreshold } = log.details;
                return `
[${log.timestamp}] LLM Interaction for ${symbol}
Price: ₹${currentPrice} | Thresholds: ₹${lowerThreshold} - ₹${upperThreshold}

Request:
${request}

Response:
${response}
----------------------------------------`;
            }
            
            let message = log.message;
            if (typeof message === 'string' && 
                (message.startsWith('{') || message.startsWith('['))) {
                try {
                    const jsonObj = JSON.parse(message);
                    message = JSON.stringify(jsonObj, null, 2);
                } catch (e) {
                    // Not valid JSON, keep original message
                }
            }
            
            return `[${log.timestamp}] ${log.type.toUpperCase()}  ${message}`;
        }).join('\n');
    }
}

export default Logger; 