// Configuration options
const config = {
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
    timeout: 10000, // milliseconds
    model: 'gemini-pro',
    temperature: 0.7,
    maxTokens: 1000
};

// Error types
const ErrorTypes = {
    API_KEY_MISSING: 'API_KEY_MISSING',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    INVALID_RESPONSE: 'INVALID_RESPONSE',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Function to handle errors
function handleError(error, retryCount) {
    console.error('LLM Service Error:', error);
    
    if (retryCount < config.maxRetries) {
        console.log(`Retrying... (${retryCount + 1}/${config.maxRetries})`);
        return {
            shouldRetry: true,
            delay: config.retryDelay * Math.pow(2, retryCount) // Exponential backoff
        };
    }

    return {
        shouldRetry: false,
        error: {
            type: determineErrorType(error),
            message: error.message,
            details: error
        }
    };
}

// Function to determine error type
function determineErrorType(error) {
    if (error.message.includes('API key')) return ErrorTypes.API_KEY_MISSING;
    if (error.message.includes('network')) return ErrorTypes.NETWORK_ERROR;
    if (error.message.includes('timeout')) return ErrorTypes.TIMEOUT_ERROR;
    if (error.status === 429) return ErrorTypes.RATE_LIMIT;
    return ErrorTypes.UNKNOWN_ERROR;
}

// Function to call Gemini API with retry logic
async function callGeminiAPI(prompt, retryCount = 0) {
    try {
        // Get API key from storage
        const { gemini_api_key } = await chrome.storage.local.get('gemini_api_key');
        if (!gemini_api_key) {
            throw new Error('API key not found in storage');
        }

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gemini_api_key}`
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: config.temperature,
                    maxOutputTokens: config.maxTokens
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from API');
        }

        return {
            success: true,
            response: data.candidates[0].content.parts[0].text
        };

    } catch (error) {
        const errorHandling = handleError(error, retryCount);
        
        if (errorHandling.shouldRetry) {
            await new Promise(resolve => setTimeout(resolve, errorHandling.delay));
            return callGeminiAPI(prompt, retryCount + 1);
        }

        return {
            success: false,
            error: errorHandling.error
        };
    }
}

// Function to update configuration
function updateConfig(newConfig) {
    Object.assign(config, newConfig);
}

// Export functions and configuration
export { 
    callGeminiAPI, 
    updateConfig, 
    config,
    ErrorTypes
}; 