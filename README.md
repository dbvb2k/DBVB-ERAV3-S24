# Stock Price Monitor Chrome Extension

A powerful Chrome extension for real-time stock price monitoring with smart alerts and LLM-powered analysis.

## Features

- **Real-time Stock Monitoring**
  - Track multiple stocks simultaneously
  - Set custom upper and lower price thresholds
  - Real-time price updates every minute
  - Price history tracking and visualization

- **Smart Alerts**
  - Customizable price threshold alerts
  - Desktop notifications when prices cross thresholds
  - Configurable alert cooldown periods
  - Maximum alert limits to prevent notification spam

- **LLM-Powered Analysis**
  - AI-driven price analysis and recommendations
  - Context-aware suggestions based on price movements
  - Customizable LLM parameters
  - Detailed analysis of price trends

- **Advanced Logging**
  - Comprehensive logging system
  - Download logs for analysis
  - View price history for each stock
  - Formatted log exports with LLM interactions

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the extension directory

## Usage

1. **Adding Stocks**
   - Click the extension icon to open the popup
   - Enter the stock symbol (e.g., HDFCBANK)
   - Set lower and upper price thresholds
   - Click "Add Stock"

2. **Monitoring Stocks**
   - The extension checks prices every minute
   - Notifications appear when prices cross thresholds
   - View price history in the console log

3. **Viewing Analysis**
   - LLM analysis is triggered when prices approach thresholds
   - Analysis includes price trend evaluation
   - Recommendations for potential actions

4. **Managing Logs**
   - Use the console log section to view all activities
   - Download logs for detailed analysis
   - Clear logs as needed
   - View complete price history

## Configuration

### API Configuration
- Set up your Gemini API key for LLM functionality
- Secure storage of API credentials

### LLM Configuration
- Model selection (Gemini Pro/Pro Vision)
- Temperature setting (0.0 - 1.0)
- Max tokens (100 - 2048)
- Retry settings and timeout
- Cooldown period for analysis
- Alert limits per threshold

### Supported Stocks
Currently supports major Indian stocks including:
- HDFCBANK
- RELIANCE
- TCS
- INFY
- ICICIBANK
- SBIN
- BHARTIARTL
- KOTAKBANK
- AXISBANK
- LT

## Technical Details

### Architecture
- Background service for price monitoring
- Popup interface for user interaction
- Local storage for data persistence
- Chrome notifications API integration

### Data Sources
- Real-time price data from MoneyControl API
- Historical price tracking
- LLM-based analysis

### Security
- Secure API key storage
- Rate limiting for API calls
- Error handling and validation

## Development

### Prerequisites
- Chrome browser
- Basic understanding of Chrome extension development
- Gemini API key for LLM features

### Project Structure
```
├── background.js      # Background service worker
├── popup.js          # Popup UI functionality
├── popup.html        # Popup interface
├── styles.css        # UI styling
├── logger.js         # Logging functionality
├── price_history.js  # Price history management
└── llm_service.js    # LLM integration service
```

### Building
The extension is ready to use after cloning. No build step required.

## Troubleshooting

Common issues and solutions:

1. **No Price Updates**
   - Check internet connection
   - Verify stock symbol is correct
   - Ensure MoneyControl API is accessible

2. **LLM Analysis Not Working**
   - Verify API key is correctly set
   - Check cooldown period settings
   - Ensure price is within analysis threshold

3. **Missing Notifications**
   - Enable Chrome notifications
   - Check alert settings
   - Verify threshold values

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- MoneyControl for real-time price data
- Google's Gemini API for LLM capabilities
- Chrome Extensions API documentation

## Version History

- v1.0.0 - Initial release
  - Basic price monitoring
  - Threshold alerts
  - LLM integration
  - Logging system 