// Import LLM service
import { updateConfig, config } from './llm_service.js';

// Import Logger
import Logger from './logger.js';

// Load saved configuration
async function loadConfig() {
    try {
        const { llm_config } = await chrome.storage.local.get('llm_config');
        if (llm_config) {
            updateConfig(llm_config);
            updateUIFromConfig(llm_config);
        } else {
            // Set default configuration if none exists
            const defaultConfig = {
                model: 'gemini-pro',
                temperature: 0.7,
                maxTokens: 1000,
                maxRetries: 3,
                timeout: 10000,
                cooldownPeriod: 5,
                maxAlerts: 2
            };
            await saveConfig(defaultConfig);
            updateConfig(defaultConfig);
            updateUIFromConfig(defaultConfig);
            logMessage('Initialized default LLM configuration', 'info');
        }
    } catch (error) {
        logMessage(`Error loading configuration: ${error.message}`, 'error');
    }
}

// Update UI from configuration
function updateUIFromConfig(config) {
    if (!config) return;
    
    const elements = {
        'model': config.model || 'gemini-pro',
        'temperature': config.temperature || 0.7,
        'maxTokens': config.maxTokens || 1000,
        'maxRetries': config.maxRetries || 3,
        'timeout': config.timeout || 10000,
        'cooldownPeriod': config.cooldownPeriod || 5,
        'maxAlerts': config.maxAlerts || 2
    };

    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
            if (id === 'temperature') {
                document.getElementById('temperatureValue').textContent = value;
            }
        }
    }
}

// Save configuration
async function saveConfig(configToSave = null) {
    try {
        const config = configToSave || {
            model: document.getElementById('model').value,
            temperature: parseFloat(document.getElementById('temperature').value),
            maxTokens: parseInt(document.getElementById('maxTokens').value),
            maxRetries: parseInt(document.getElementById('maxRetries').value),
            timeout: parseInt(document.getElementById('timeout').value),
            cooldownPeriod: parseInt(document.getElementById('cooldownPeriod').value),
            maxAlerts: parseInt(document.getElementById('maxAlerts').value)
        };

        await chrome.storage.local.set({ llm_config: config });
        updateConfig(config);
        logMessage('LLM configuration saved successfully', 'success');
        console.log('Saved LLM config:', config);
    } catch (error) {
        logMessage(`Error saving configuration: ${error.message}`, 'error');
    }
}

// Handle temperature slider
document.getElementById('temperature').addEventListener('input', (e) => {
    document.getElementById('temperatureValue').textContent = e.target.value;
});

// Save API key
async function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value;
    if (!apiKey) {
        showMessage('Please enter an API key', 'error');
        return;
    }

    await chrome.storage.local.set({ gemini_api_key: apiKey });
    showMessage('API key saved successfully!');
}

// Show message
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Load stocks
async function loadStocks() {
    const { stocks } = await chrome.storage.local.get('stocks');
    const stocksDiv = document.getElementById('stocks');
    stocksDiv.innerHTML = '';

    if (stocks && stocks.length > 0) {
        stocks.forEach((stock, index) => {
            const stockDiv = document.createElement('div');
            stockDiv.className = 'stock-item';
            stockDiv.innerHTML = `
                <div class="stock-info">
                    <span class="stock-symbol">${stock.symbol}</span>
                    <span class="stock-thresholds">Lower: ₹${stock.lowerThreshold} | Upper: ₹${stock.upperThreshold}</span>
                </div>
                <button class="delete-btn" data-index="${index}">Delete</button>
            `;
            stocksDiv.appendChild(stockDiv);
        });
    }
}

// Add stock
async function addStock() {
    try {
        const symbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
        const lowerThreshold = parseFloat(document.getElementById('lowerThreshold').value);
        const upperThreshold = parseFloat(document.getElementById('upperThreshold').value);

        logMessage(`Adding stock: ${symbol} with thresholds ${lowerThreshold}-${upperThreshold}`, 'info');

        if (!symbol || isNaN(lowerThreshold) || isNaN(upperThreshold)) {
            logMessage('Failed to add stock: Invalid input', 'error');
            showMessage('Please fill in all fields', 'error');
            return;
        }

        if (lowerThreshold >= upperThreshold) {
            logMessage('Failed to add stock: Lower threshold must be less than upper threshold', 'error');
            showMessage('Lower threshold must be less than upper threshold', 'error');
            return;
        }

        const { stocks = [] } = await chrome.storage.local.get('stocks');

        // Check if stock already exists
        const existingIndex = stocks.findIndex(s => s.symbol === symbol);
        if (existingIndex !== -1) {
            stocks[existingIndex] = { symbol, lowerThreshold, upperThreshold };
            logMessage(`Updated existing stock: ${symbol}`, 'info');
        } else {
            stocks.push({ symbol, lowerThreshold, upperThreshold });
            logMessage(`Added new stock: ${symbol}`, 'success');
        }

        await chrome.storage.local.set({ stocks });
        
        // Clear input fields
        document.getElementById('stockSymbol').value = '';
        document.getElementById('lowerThreshold').value = '';
        document.getElementById('upperThreshold').value = '';
        
        // Reload the stock list
        await loadStocks();
        showMessage('Stock added successfully!');
    } catch (error) {
        console.error('Error adding stock:', error);
        logMessage(`Error adding stock: ${error.message}`, 'error');
        showMessage('Error adding stock: ' + error.message, 'error');
    }
}

// Delete stock
async function deleteStock(index) {
    const { stocks } = await chrome.storage.local.get('stocks');
    const deletedStock = stocks[index];
    stocks.splice(index, 1);
    await chrome.storage.local.set({ stocks });
    loadStocks();
    logMessage(`Stock ${deletedStock.symbol} deleted (Thresholds: ₹${deletedStock.lowerThreshold} - ₹${deletedStock.upperThreshold})`, 'warning');
    showMessage('Stock deleted successfully!');
}

// Clear all stocks
async function clearAllStocks() {
    await chrome.storage.local.set({ stocks: [] });
    loadStocks();
    showMessage('All stocks cleared!');
}

// Function to toggle config sections
function toggleConfig(configId) {
    const content = document.getElementById(configId);
    const header = content.previousElementSibling;
    const toggleIcon = header.querySelector('.toggle-icon');
    
    const isExpanded = content.style.display === 'block';
    content.style.display = isExpanded ? 'none' : 'block';
    header.classList.toggle('active');
    toggleIcon.textContent = isExpanded ? '▶' : '▼';
}

// Function to display log in the console window
function displayLogInConsole(logEntry) {
    if (!logEntry) return;
    
    const logContent = document.getElementById('logContent');
    if (!logContent) return;

    const logDiv = document.createElement('div');
    logDiv.className = `log-entry ${logEntry.type || 'info'}`;
    
    // Handle LLM interaction logs
    if (logEntry.type === 'llm' && logEntry.details) {
        const { symbol, request, response, currentPrice, lowerThreshold, upperThreshold } = logEntry.details;
        
        // Create main log entry
        logDiv.innerHTML = `<span class="timestamp">[${logEntry.timestamp}]</span>  <span class="type">LLM</span>  <span class="message">Analysis for ${symbol} (₹${currentPrice})</span>`;
        logContent.appendChild(logDiv);
        
        // Create details section
        const details = document.createElement('div');
        details.className = 'llm-details';
        details.innerHTML = `
            <div class="llm-content">
                <div class="thresholds">Thresholds: ₹${lowerThreshold} - ₹${upperThreshold}</div>
                <div class="request"><strong>Request:</strong><pre>${request}</pre></div>
                <div class="response"><strong>Response:</strong><pre>${response}</pre></div>
            </div>`;
        logContent.appendChild(details);
    } else {
        // Regular log entry
        let message = logEntry.message || '';
        
        // Format JSON content if present
        if (typeof message === 'string' && 
            (message.startsWith('{') || message.startsWith('['))) {
            try {
                const jsonObj = JSON.parse(message);
                const formattedJson = JSON.stringify(jsonObj, null, 2);
                logDiv.innerHTML = `<span class="timestamp">[${logEntry.timestamp}]</span>  <span class="type">${logEntry.type.toUpperCase()}</span>  <span class="message">JSON Response:</span>`;
                const pre = document.createElement('pre');
                pre.textContent = formattedJson;
                logDiv.appendChild(pre);
                logContent.appendChild(logDiv);
                logContent.scrollTop = logContent.scrollHeight;
                return;
            } catch (e) {
                // Not valid JSON, continue with regular message
            }
        }

        // Regular message with stock symbol highlighting
        const highlightedMessage = highlightStockSymbols(message);
        logDiv.innerHTML = `<span class="timestamp">[${logEntry.timestamp}]</span>  <span class="type">${(logEntry.type || 'info').toUpperCase()}</span>  <span class="message">${highlightedMessage}</span>`;
        logContent.appendChild(logDiv);
    }
    
    logContent.scrollTop = logContent.scrollHeight;
}

// Function to generate a consistent color for a stock symbol
function getStockColor(symbol) {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
        hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
}

// Function to highlight stock symbols in the message
function highlightStockSymbols(message) {
    const stockSymbols = message.match(/\b[A-Z]{2,10}\b/g) || [];
    let highlightedMessage = message;
    
    stockSymbols.forEach(symbol => {
        const color = getStockColor(symbol);
        const regex = new RegExp(`\\b${symbol}\\b`, 'g');
        highlightedMessage = highlightedMessage.replace(
            regex,
            `<span class="stock-symbol" style="color: ${color}; font-weight: bold;">${symbol}</span>`
        );
    });
    
    return highlightedMessage;
}

// Function to send log to popup
function logMessage(message, type = 'info', details = null) {
    Logger.log(message, type, details).then(() => {
        displayLogInConsole({
            timestamp: new Date().toLocaleTimeString(),
            type,
            message,
            details
        });
    }).catch(error => {
        console.error('Error logging message:', error);
    });
}

// Function to load logs from storage
function loadLogs() {
    chrome.storage.local.get(['logs'], function(result) {
        const logContent = document.getElementById('logContent');
        if (result.logs && result.logs.length > 0) {
            result.logs.forEach(log => {
                const logEntry = document.createElement('div');
                logEntry.innerHTML = log.html;
                logContent.appendChild(logEntry);
            });
            logContent.scrollTop = logContent.scrollHeight;
        }
    });
}

// Function to clear logs
function clearLogs() {
    Logger.clearLogs();
}

// Function to copy logs to clipboard
async function copyLogs() {
    try {
        const { logs } = await chrome.storage.local.get('logs');
        if (!logs || logs.length === 0) {
            logMessage('No logs to copy', 'warning');
            return;
        }

        // Format logs for copying
        const formattedLogs = logs.map(log => 
            `[${log.timestamp}] ${log.type.toUpperCase()}  ${log.message}`
        ).join('\n');

        // Copy to clipboard
        await navigator.clipboard.writeText(formattedLogs);
        logMessage('Logs copied to clipboard', 'success');
    } catch (error) {
        console.error('Error copying logs:', error);
        logMessage(`Error copying logs: ${error.message}`, 'error');
    }
}

// Function to download logs
async function downloadLogs() {
    try {
        const { logs, llm_interactions } = await Logger.getLogs();
        if (!logs.length && !llm_interactions.length) {
            logMessage('No logs to download', 'warning');
            return;
        }

        // Get current date for filename
        const date = new Date().toISOString().split('T')[0];
        const filename = `stock_monitor_logs_${date}.txt`;

        // Format and combine all logs
        const allLogs = Logger.formatLogsForDownload(logs, llm_interactions);

        // Create blob and download
        const blob = new Blob([allLogs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        logMessage(`Logs downloaded as ${filename}`, 'success');
    } catch (error) {
        console.error('Error downloading logs:', error);
        logMessage(`Error downloading logs: ${error.message}`, 'error');
    }
}

// Load existing logs when popup opens
async function loadExistingLogs() {
    const { logs } = await Logger.getLogs();
    const logContent = document.getElementById('logContent');
    logContent.innerHTML = ''; // Clear existing content
    
    logs.forEach(log => {
        displayLogInConsole(log);
    });
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup initialized'); // Debug log
    await loadExistingLogs();
    logMessage('Popup initialized', 'info');
    
    // Load initial data
    loadConfig();
    loadStocks();
    loadLogs();

    // Set up resize functionality
    const resizeHandle = document.querySelector('.resize-handle');
    const logContainer = document.querySelector('.log-container');
    let isResizing = false;
    let startX;
    let startWidth;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = logContainer.offsetWidth;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const width = startWidth + (e.clientX - startX);
        const minWidth = 300;
        const maxWidth = 800;
        
        if (width >= minWidth && width <= maxWidth) {
            logContainer.style.width = `${width}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = '';
    });

    // Set up event listeners
    document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
    document.getElementById('saveConfig').addEventListener('click', saveConfig);
    document.getElementById('addStock').addEventListener('click', addStock);
    document.getElementById('clearAll').addEventListener('click', clearAllStocks);
    document.getElementById('clearLog').addEventListener('click', clearLogs);
    document.getElementById('copyLog').addEventListener('click', copyLogs);
    document.getElementById('downloadLog').addEventListener('click', downloadLogs);

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'log') {
            displayLogInConsole(message.data);
        }
    });

    // Handle stock deletion
    document.getElementById('stocks').addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            deleteStock(parseInt(e.target.dataset.index));
        }
    });

    // Initialize and handle collapsible sections
    const configHeaders = document.querySelectorAll('.config-header');
    configHeaders.forEach(header => {
        const content = document.getElementById(header.dataset.configId);
        const toggleIcon = header.querySelector('.toggle-icon');
        
        // Set initial state for all sections except console log
        if (header.dataset.configId !== 'console-log') {
            content.style.display = 'none';
            toggleIcon.textContent = '▶';
        }
        
        header.addEventListener('click', () => {
            const isExpanded = content.style.display === 'block';
            content.style.display = isExpanded ? 'none' : 'block';
            header.classList.toggle('active');
            toggleIcon.textContent = isExpanded ? '▶' : '▼';
            logMessage(`${header.querySelector('h2').textContent} section ${isExpanded ? 'collapsed' : 'expanded'}`, 'info');
        });
    });

    // Automatically expand console log section
    const consoleLogHeader = document.querySelector('[data-config-id="console-log"]');
    const consoleLogContent = document.getElementById('console-log');
    if (consoleLogHeader && consoleLogContent) {
        consoleLogContent.style.display = 'block';
        consoleLogHeader.classList.add('active');
        consoleLogHeader.querySelector('.toggle-icon').textContent = '▼';
    }
});