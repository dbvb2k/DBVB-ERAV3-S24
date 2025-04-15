// Import LLM service
import { updateConfig, config } from './llm_service.js';

// Load saved configuration
async function loadConfig() {
    const savedConfig = await chrome.storage.local.get('llm_config');
    if (savedConfig.llm_config) {
        updateConfig(savedConfig.llm_config);
        updateUIFromConfig(savedConfig.llm_config);
    }
}

// Update UI from configuration
function updateUIFromConfig(config) {
    document.getElementById('model').value = config.model;
    document.getElementById('temperature').value = config.temperature;
    document.getElementById('temperatureValue').textContent = config.temperature;
    document.getElementById('maxTokens').value = config.maxTokens;
    document.getElementById('maxRetries').value = config.maxRetries;
    document.getElementById('timeout').value = config.timeout;
    document.getElementById('cooldownPeriod').value = config.cooldownPeriod || 5;
    document.getElementById('maxAlerts').value = config.maxAlerts || 2;
}

// Save configuration
async function saveConfig() {
    const config = {
        model: document.getElementById('model').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        maxTokens: parseInt(document.getElementById('maxTokens').value),
        maxRetries: parseInt(document.getElementById('maxRetries').value),
        timeout: parseInt(document.getElementById('timeout').value),
        cooldownPeriod: parseInt(document.getElementById('cooldownPeriod').value),
        maxAlerts: parseInt(document.getElementById('maxAlerts').value)
    };

    try {
        await chrome.storage.local.set({ llm_config: config });
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

// Function to generate a consistent color for a stock symbol
function getStockColor(symbol) {
    // Create a simple hash of the symbol
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
        hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to a color
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
}

// Function to highlight stock symbols in the message
function highlightStockSymbols(message) {
    // Find all stock symbols in the message (uppercase words with 2-10 characters)
    const stockSymbols = message.match(/\b[A-Z]{2,10}\b/g) || [];
    let highlightedMessage = message;
    
    // Replace each stock symbol with a colored span
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
function logMessage(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logContent = document.getElementById('logContent');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.style.fontFamily = 'monospace';
    logEntry.style.whiteSpace = 'pre';
    
    // Highlight stock symbols in the message
    const highlightedMessage = highlightStockSymbols(message);
    
    logEntry.innerHTML = `[${timestamp}] ${type.toUpperCase()}  ${highlightedMessage}`;
    logContent.appendChild(logEntry);
    logContent.scrollTop = logContent.scrollHeight;

    // Store the log in Chrome storage
    chrome.storage.local.get(['logs'], function(result) {
        const logs = result.logs || [];
        logs.push({
            timestamp,
            type,
            message,
            html: logEntry.outerHTML
        });
        chrome.storage.local.set({ logs });
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
    const logContent = document.getElementById('logContent');
    logContent.innerHTML = '';
    chrome.storage.local.set({ logs: [] });
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
        const { logs } = await chrome.storage.local.get('logs');
        if (!logs || logs.length === 0) {
            logMessage('No logs to download', 'warning');
            return;
        }

        // Get current date for filename
        const date = new Date().toISOString().split('T')[0];
        const filename = `stock_monitor_logs_${date}.txt`;

        // Format logs for download
        const formattedLogs = logs.map(log => 
            `[${log.timestamp}] ${log.type.toUpperCase()}  ${log.message}`
        ).join('\n');

        // Create blob and download
        const blob = new Blob([formattedLogs], { type: 'text/plain' });
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

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup initialized'); // Debug log
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
            logMessage(message.data.message, message.data.type);
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