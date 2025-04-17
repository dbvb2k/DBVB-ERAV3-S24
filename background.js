// Import Logger
import Logger from './logger.js';
import PriceHistory from './price_history.js';

// Stock symbol to MoneyControl code mapping
const stockSymbolMap = {
    'HDFCBANK': 'HDF01',
    'RELIANCE': 'RELIANCE',
    'TCS': 'TCS',
    'INFY': 'INFOSYSTCH',
    'ICICIBANK': 'ICICIBANK',
    'SBIN': 'SBIN',
    'BHARTIARTL': 'BHARTIARTL',
    'KOTAKBANK': 'KOTAKBANK',
    'AXISBANK': 'AXISBANK',
    'LT': 'LT'
};

// Store conversation history for each stock
const conversationHistory = {};

// Track alert states for each stock
const alertStates = {};

// Track notification counts and last notification times
const notificationState = {};

// Track LLM call times
const llmCallState = {};

// Add a variable to track if we've already logged the no stocks message
let hasLoggedNoStocks = false;

// Function to send logs to popup
function sendLogToPopup(message, type = 'info', details = null) {
    // Ensure message is a string and not undefined
    const formattedMessage = message ? String(message) : 'No message provided';
    
    // Ensure type is valid
    const validTypes = ['info', 'success', 'warning', 'error', 'llm'];
    const validType = validTypes.includes(type) ? type : 'info';
    
    // Ensure details is an object if provided
    const validDetails = details && typeof details === 'object' ? details : null;
    
    Logger.log(formattedMessage, validType, validDetails);
}

// Function to format API response for logging
function formatAPIResponse(response) {
    try {
        if (!response || !response.data) {
            return { error: 'Invalid response data' };
        }
        
        const responseData = response.data;
        return {
            symbol: responseData.NSEID || 'Unknown',
            price: responseData.pricecurrent || 0,
            change: responseData.pricechange || 0,
            changePercent: responseData.pricepercentchange || 0,
            volume: responseData.VOL || 0,
            dayRange: `₹${responseData.LP || 0} - ₹${responseData.HP || 0}`,
            yearRange: `₹${responseData['52L'] || 0} - ₹${responseData['52H'] || 0}`,
            lastUpdate: responseData.lastupd || new Date().toISOString()
        };
    } catch (error) {
        return {
            error: error.message,
            rawResponse: response
        };
    }
}

// Function to fetch stock price from MoneyControl
async function fetchStockPrice(symbol) {
    try {
        // Get the MoneyControl code for the symbol
        const moneyControlCode = stockSymbolMap[symbol];
        if (!moneyControlCode) {
            await Logger.log(`Symbol ${symbol} not found in mapping`, 'error');
            throw new Error(`Symbol ${symbol} not found in mapping`);
        }

        const url = `https://priceapi.moneycontrol.com/pricefeed/nse/equitycash/${moneyControlCode}`;
        await Logger.log(`Fetching price for ${symbol} from: ${url}`, 'info');

        // Fetch the price using MoneyControl's API
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.moneycontrol.com/'
            }
        });

        if (!response.ok) {
            await Logger.log(`HTTP error for ${symbol}: ${response.status}`, 'error');
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseJson = await response.json();
        const formattedResponse = formatAPIResponse(responseJson);
        await Logger.log(`Received response for ${symbol}: ${JSON.stringify(formattedResponse, null, 2)}`, 'info');
        
        if (responseJson && responseJson.data && responseJson.data.pricecurrent) {
            const price = parseFloat(responseJson.data.pricecurrent);
            // Store price in history
            await PriceHistory.addPrice(symbol, price);
            await Logger.log(`Current price for ${symbol}: ${price}`, 'success');
            return price;
        } else {
            await Logger.log(`Price not found in response for ${symbol}`, 'error');
            throw new Error('Price not found in response');
        }
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        await Logger.log(`Error fetching price for ${symbol}: ${error.message}`, 'error');
        return null;
    }
}

// Function to log LLM interactions
async function logLLMInteraction(symbol, request, response) {
    try {
        const timestamp = new Date();
        const dateStr = timestamp.toISOString().split('T')[0];
        const logFileName = `logs/LLM_Logs_${dateStr}.txt`;
        
        const logEntry = `
[${timestamp.toISOString()}] LLM Interaction for ${symbol}
Request:
${request}

Response:
${response}
----------------------------------------
`;

        // Use chrome.storage.local to store the log
        const storageKey = `llm_log_${dateStr}`;
        const { [storageKey]: existingLogs = '' } = await chrome.storage.local.get(storageKey);
        await chrome.storage.local.set({ [storageKey]: existingLogs + logEntry });
        
        sendLogToPopup(`LLM interaction logged for ${symbol}`, 'info');
    } catch (error) {
        console.error('Error logging LLM interaction:', error);
        sendLogToPopup(`Error logging LLM interaction: ${error.message}`, 'error');
    }
}

// Function to get LLM response
async function getLLMResponse(symbol, currentPrice, lowerThreshold, upperThreshold) {
    try {
        // Get conversation history for this stock
        if (!conversationHistory[symbol]) {
            conversationHistory[symbol] = [];
        }

        // Get price history
        const priceHistory = await PriceHistory.getFormattedHistory(symbol);

        // Build the prompt
        const prompt = `You are a stock monitoring agent. Your task is to monitor ${symbol} stock price.
Current price: ₹${currentPrice}
Lower threshold: ₹${lowerThreshold}
Upper threshold: ₹${upperThreshold}
Previous price movements:
${priceHistory}

Analyze the current situation and provide a brief recommendation. Consider:
1. How far is the price from thresholds?
2. Recent price movement pattern
3. Suggested action for the investor

Respond in a concise format.`;

        // Log the prompt being sent to LLM
        await Logger.log('Sending prompt to LLM', 'info', {
            symbol,
            request: prompt,
            currentPrice,
            lowerThreshold,
            upperThreshold,
            priceHistory
        });

        // Simulate LLM response with more detailed analysis
        let response;
        const lowerDiff = ((currentPrice - lowerThreshold) / lowerThreshold * 100).toFixed(2);
        const upperDiff = ((upperThreshold - currentPrice) / upperThreshold * 100).toFixed(2);

        if (currentPrice <= lowerThreshold) {
            response = `Price has dropped below lower threshold. Currently ${lowerDiff}% below target. Consider buying if fundamentals remain strong.`;
        } else if (currentPrice >= upperThreshold) {
            response = `Price has exceeded upper threshold. Currently ${upperDiff}% from target. Consider booking profits.`;
        } else {
            if (currentPrice - lowerThreshold < upperThreshold - currentPrice) {
                response = `Price is closer to lower threshold (${lowerDiff}% away). Monitor for potential support levels.`;
            } else {
                response = `Price is closer to upper threshold (${upperDiff}% away). Watch for resistance levels.`;
            }
        }

        // Log LLM interaction with all details
        await Logger.log('LLM Analysis', 'llm', {
            symbol,
            request: prompt,
            response,
            currentPrice,
            lowerThreshold,
            upperThreshold
        });

        // Add to conversation history
        conversationHistory[symbol].push(`Price: ₹${currentPrice} | Analysis: ${response}`);

        return response;
    } catch (error) {
        console.error(`Error getting LLM response for ${symbol}:`, error);
        await Logger.log(`Error getting LLM response for ${symbol}: ${error.message}`, 'error');
        return "Error in analysis";
    }
}

// Function to check and update alert state
function shouldSendAlert(symbol, currentPrice, lower, upper) {
    if (!alertStates[symbol]) {
        alertStates[symbol] = {
            belowLower: false,
            aboveUpper: false,
            lastAlertPrice: null,
            lastAlertTime: null,
            inNormalRange: true
        };
    }

    const state = alertStates[symbol];
    let shouldAlert = false;
    let alertType = '';

    // Check if price has moved back to normal range
    const isInNormalRange = currentPrice > lower && currentPrice < upper;

    // Only send new alerts if:
    // 1. Price crosses threshold for the first time, or
    // 2. Price returns to normal range and then crosses threshold again
    if (currentPrice <= lower && (state.inNormalRange || !state.belowLower)) {
        shouldAlert = true;
        alertType = 'lower';
        state.belowLower = true;
        state.aboveUpper = false;
        state.inNormalRange = false;
        state.lastAlertPrice = currentPrice;
        state.lastAlertTime = Date.now();
        sendLogToPopup(`Alert state updated for ${symbol}: Below lower threshold`, 'info');
    } else if (currentPrice >= upper && (state.inNormalRange || !state.aboveUpper)) {
        shouldAlert = true;
        alertType = 'upper';
        state.aboveUpper = true;
        state.belowLower = false;
        state.inNormalRange = false;
        state.lastAlertPrice = currentPrice;
        state.lastAlertTime = Date.now();
        sendLogToPopup(`Alert state updated for ${symbol}: Above upper threshold`, 'info');
    } else if (isInNormalRange && !state.inNormalRange) {
        // Price has returned to normal range
        state.belowLower = false;
        state.aboveUpper = false;
        state.inNormalRange = true;
        state.lastAlertPrice = null;
        state.lastAlertTime = null;
        sendLogToPopup(`${symbol} price returned to normal range: ${currentPrice}`, 'success');
    }

    return { shouldAlert, alertType };
}

// Check stocks and send notifications
async function checkStocks() {
    try {
        const { stocks, llm_config } = await chrome.storage.local.get(['stocks', 'llm_config']);
        
        if (!stocks || stocks.length === 0) {
            // Only log if we haven't logged this message yet
            if (!hasLoggedNoStocks) {
                await Logger.log('No stocks being monitored', 'info');
                hasLoggedNoStocks = true;
            }
            return;
        }
        
        // Reset the flag when we have stocks
        hasLoggedNoStocks = false;

        // Use default config if none exists
        const config = llm_config || {
            cooldownPeriod: 5,
            maxAlerts: 2
        };

        // Log current configuration
        await Logger.log(`Current LLM config: ${JSON.stringify(config)}`, 'info');
        
        for (const stock of stocks) {
            try {
                const price = await fetchStockPrice(stock.symbol);
                if (price === null) {
                    sendLogToPopup(`Failed to fetch price for ${stock.symbol}`, 'error');
                    continue;
                }
                
                const currentTime = Date.now();
                
                // Initialize notification state for this stock if not exists
                if (!notificationState[stock.symbol]) {
                    notificationState[stock.symbol] = {
                        lastNotification: 0,
                        alertCount: 0
                    };
                }
                
                // Initialize LLM call state if not exists
                if (!llmCallState[stock.symbol]) {
                    llmCallState[stock.symbol] = {
                        lastCall: 0
                    };
                }
                
                const state = notificationState[stock.symbol];
                const llmState = llmCallState[stock.symbol];
                const cooldownPeriod = (config.cooldownPeriod || 5) * 60 * 1000; // Convert to milliseconds
                const maxAlerts = config.maxAlerts || 2;
                const llmCooldown = 15 * 60 * 1000; // 15 minutes cooldown for LLM calls
                
                // Log current state
                sendLogToPopup(`Checking ${stock.symbol}: Price=₹${price}, Lower=₹${stock.lowerThreshold}, Upper=₹${stock.upperThreshold}`, 'info');
                
                // Calculate price differences from thresholds
                const lowerDiff = ((price - stock.lowerThreshold) / stock.lowerThreshold * 100).toFixed(2);
                const upperDiff = ((stock.upperThreshold - price) / stock.upperThreshold * 100).toFixed(2);
                
                sendLogToPopup(`Price differences for ${stock.symbol}: Lower=${lowerDiff}%, Upper=${upperDiff}%`, 'info');
                
                // Check if we should call LLM
                const shouldCallLLM = (Math.abs(lowerDiff) <= 5 || Math.abs(upperDiff) <= 5) && 
                                    (currentTime - llmState.lastCall >= llmCooldown);
                
                if (shouldCallLLM) {
                    sendLogToPopup(`Calling LLM for ${stock.symbol} (Price within 5% of threshold)`, 'info');
                    try {
                        const llmResponse = await getLLMResponse(
                            stock.symbol,
                            price,
                            stock.lowerThreshold,
                            stock.upperThreshold
                        );
                        llmState.lastCall = currentTime;
                        sendLogToPopup(`LLM analysis for ${stock.symbol}: ${llmResponse}`, 'success');
                    } catch (error) {
                        sendLogToPopup(`Error getting LLM response for ${stock.symbol}: ${error.message}`, 'error');
                    }
                } else {
                    if (Math.abs(lowerDiff) > 5 && Math.abs(upperDiff) > 5) {
                        sendLogToPopup(`Skipping LLM for ${stock.symbol} (Price not within 5% of thresholds)`, 'info');
                    } else if (currentTime - llmState.lastCall < llmCooldown) {
                        const minutesLeft = Math.ceil((llmCooldown - (currentTime - llmState.lastCall)) / 60000);
                        sendLogToPopup(`Skipping LLM for ${stock.symbol} (Cooldown period: ${minutesLeft} minutes left)`, 'info');
                    }
                }
                
                // Check if we should send a notification
                if (currentTime - state.lastNotification < cooldownPeriod) {
                    sendLogToPopup(`Skipping notification for ${stock.symbol} (within cooldown period)`, 'info');
                    continue;
                }
                
                if (state.alertCount >= maxAlerts) {
                    sendLogToPopup(`Skipping notification for ${stock.symbol} (max alerts reached)`, 'info');
                    continue;
                }
                
                if (price <= stock.lowerThreshold) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon48.png',
                        title: `Price Alert: ${stock.symbol}`,
                        message: `Price dropped to ₹${price} (below threshold of ₹${stock.lowerThreshold})`,
                        priority: 2
                    });
                    state.lastNotification = currentTime;
                    state.alertCount++;
                    sendLogToPopup(`Sent lower threshold alert for ${stock.symbol}`, 'success');
                } else if (price >= stock.upperThreshold) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon48.png',
                        title: `Price Alert: ${stock.symbol}`,
                        message: `Price rose to ₹${price} (above threshold of ₹${stock.upperThreshold})`,
                        priority: 2
                    });
                    state.lastNotification = currentTime;
                    state.alertCount++;
                    sendLogToPopup(`Sent upper threshold alert for ${stock.symbol}`, 'success');
                }
            } catch (error) {
                console.error(`Error checking stock ${stock.symbol}:`, error);
                sendLogToPopup(`Error checking stock ${stock.symbol}: ${error.message}`, 'error');
            }
        }
    } catch (error) {
        console.error('Error in checkStocks:', error);
        await Logger.log(`Error checking stocks: ${error.message}`, 'error');
    }
}

// Reset notification counts daily
function resetNotificationCounts() {
    for (const symbol in notificationState) {
        notificationState[symbol].alertCount = 0;
    }
}

// Schedule daily reset
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);
const timeUntilReset = tomorrow - now;

setTimeout(() => {
    resetNotificationCounts();
    // Set up daily reset
    setInterval(resetNotificationCounts, 24 * 60 * 60 * 1000);
}, timeUntilReset);

// Reset alert states when stocks are modified
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.stocks) {
        const newStocks = changes.stocks.newValue || [];
        
        // Reset hasLoggedNoStocks when stocks are modified
        if (newStocks.length > 0) {
            hasLoggedNoStocks = false;
        }
        
        // Clear alert states for removed stocks
        const stockSymbols = new Set(newStocks.map(s => s.symbol));
        
        // Remove alert states and price history for stocks that are no longer monitored
        Object.keys(alertStates).forEach(symbol => {
            if (!stockSymbols.has(symbol)) {
                delete alertStates[symbol];
                PriceHistory.removeStockHistory(symbol);
                sendLogToPopup(`Removed alert state and price history for ${symbol}`, 'info');
            }
        });

        // Reset alert states for modified stocks
        newStocks.forEach(stock => {
            if (alertStates[stock.symbol]) {
                alertStates[stock.symbol] = {
                    belowLower: false,
                    aboveUpper: false,
                    lastAlertPrice: null,
                    lastAlertTime: null,
                    inNormalRange: true
                };
                sendLogToPopup(`Reset alert state for ${stock.symbol} due to threshold update`, 'info');
            }
        });
    }
});

// Set up alarm to check stocks every minute
chrome.alarms.create('checkStocks', {
    periodInMinutes: 1
});

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkStocks') {
        checkStocks();
    }
});

// Initial check when extension starts
checkStocks(); 