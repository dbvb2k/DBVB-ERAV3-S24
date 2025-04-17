// Price History Manager
class PriceHistory {
    static async addPrice(symbol, price) {
        try {
            const { price_history = {} } = await chrome.storage.local.get('price_history');
            if (!price_history[symbol]) {
                price_history[symbol] = [];
            }
            
            const timestamp = new Date().toISOString();
            price_history[symbol].push({
                timestamp,
                symbol,
                price
            });
            
            // Keep only last 100 entries per stock to prevent storage bloat
            if (price_history[symbol].length > 100) {
                price_history[symbol] = price_history[symbol].slice(-100);
            }
            
            await chrome.storage.local.set({ price_history });
        } catch (error) {
            console.error('Error adding price to history:', error);
        }
    }
    
    static async getPriceHistory(symbol) {
        try {
            const { price_history = {} } = await chrome.storage.local.get('price_history');
            return price_history[symbol] || [];
        } catch (error) {
            console.error('Error getting price history:', error);
            return [];
        }
    }
    
    static async removeStockHistory(symbol) {
        try {
            const { price_history = {} } = await chrome.storage.local.get('price_history');
            delete price_history[symbol];
            await chrome.storage.local.set({ price_history });
        } catch (error) {
            console.error('Error removing stock history:', error);
        }
    }
    
    static formatPriceHistory(history) {
        if (!history || history.length === 0) {
            return 'No price history available';
        }
        
        return history.map(entry => {
            const date = new Date(entry.timestamp);
            const formattedDate = date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            return `${formattedDate} | ${entry.symbol}: ₹${entry.price}`;
        }).join('\n');
    }
    
    static async getFormattedHistory(symbol) {
        const history = await this.getPriceHistory(symbol);
        return this.formatPriceHistory(history);
    }

    static async getAllHistory() {
        try {
            const { price_history = {} } = await chrome.storage.local.get('price_history');
            let allHistory = [];
            
            // Combine all stock histories
            Object.values(price_history).forEach(stockHistory => {
                allHistory = allHistory.concat(stockHistory);
            });
            
            // Sort by timestamp
            allHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return allHistory;
        } catch (error) {
            console.error('Error getting all history:', error);
            return [];
        }
    }
    
    static async getFormattedAllHistory() {
        const history = await this.getAllHistory();
        return this.formatPriceHistory(history);
    }
}

export default PriceHistory; 