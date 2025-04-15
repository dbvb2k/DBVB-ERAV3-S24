import os
from dotenv import load_dotenv
from google import genai
import time
import argparse

# Load environment variables
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found in .env file")
    exit(1)

client = genai.Client(api_key=api_key)

# Stock symbol to MoneyControl code mapping
STOCK_SYMBOL_MAP = {
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
}

def fetch_stock_price(symbol):
    """Fetch stock price from MoneyControl API"""
    try:
        money_control_code = STOCK_SYMBOL_MAP.get(symbol)
        if not money_control_code:
            print(f"Error: Symbol {symbol} not found in mapping")
            return None
        
        # In a real implementation, you would make an API call here
        # For testing, we'll simulate a price that changes over time
        import random
        base_price = 1500.0
        variation = random.uniform(-50, 50)
        simulated_price = base_price + variation
        print(f"Simulated price for {symbol}: {simulated_price:.2f}")
        return simulated_price
    except Exception as e:
        print(f"Error fetching price: {e}")
        return None

def monitor_stock(symbol, lower_threshold, upper_threshold, max_iterations=5):
    """Monitor stock price and notify when thresholds are crossed"""
    conversation_history = []
    iteration = 0
    
    print(f"\nStarting monitoring for {symbol}")
    print(f"Lower threshold: {lower_threshold}")
    print(f"Upper threshold: {upper_threshold}")
    print("-" * 50)
    
    while iteration < max_iterations:
        iteration += 1
        print(f"\nIteration {iteration}/{max_iterations}")
        
        # Get current price
        current_price = fetch_stock_price(symbol)
        if current_price is None:
            time.sleep(2)  # Shorter sleep for testing
            continue
            
        # Build the prompt with conversation history
        prompt = f"""You are a stock monitoring agent. Your task is to monitor {symbol} stock price.
Current price: {current_price}
Lower threshold: {lower_threshold}
Upper threshold: {upper_threshold}

Previous interactions:
{chr(10).join(conversation_history)}

What should we do next? Respond with one of these formats:
1. MONITOR: Continue monitoring
2. ALERT: Price has crossed threshold
3. ERROR: Something went wrong"""

        print("\nSending prompt to LLM...")
        print(f"Current price: {current_price}")
        
        # Get LLM response
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        print(f"LLM Response: {response.text}")
        
        # Add to conversation history
        conversation_history.append(f"Price: {current_price}")
        conversation_history.append(f"LLM Response: {response.text}")
        
        # Process response
        if "ALERT" in response.text:
            print(f"\nALERT: {symbol} price ({current_price}) has crossed threshold!")
            break
        elif "ERROR" in response.text:
            print("\nError in monitoring process")
            break
            
        time.sleep(2)  # Shorter sleep for testing

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Stock Monitoring Agent')
    parser.add_argument('--symbol', type=str, default='HDFCBANK', help='Stock symbol to monitor')
    parser.add_argument('--lower', type=float, default=1400, help='Lower threshold')
    parser.add_argument('--upper', type=float, default=1600, help='Upper threshold')
    parser.add_argument('--iterations', type=int, default=5, help='Maximum number of iterations')
    
    args = parser.parse_args()
    
    monitor_stock(args.symbol, args.lower, args.upper, args.iterations) 