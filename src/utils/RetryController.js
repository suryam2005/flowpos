/**
 * RetryController - Controlled retry logic with exponential backoff
 * 
 * Provides retry functionality for failed API calls with configurable
 * exponential backoff delays. Only retries GET requests to prevent
 * duplicate writes.
 * 
 * @module RetryController
 */

/**
 * Custom error for max retries exceeded
 */
export class MaxRetriesError extends Error {
  constructor(attempts, originalError) {
    super(`Request failed after ${attempts} attempts`);
    this.name = 'MaxRetriesError';
    this.code = 'MAX_RETRIES';
    this.attempts = attempts;
    this.originalError = originalError;
  }
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  shouldRetry: (error) => {
    // Retry on network errors and 5xx server errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network')) {
      return true;
    }
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    return false;
  },
};

/**
 * HTTP methods that should NOT be retried (write operations)
 */
const NON_RETRYABLE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Calculate delay with exponential backoff
 * Delay = min(baseDelay * 2^attempt, maxDelay)
 * 
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @param {number} maxDelayMs - Maximum delay cap in milliseconds
 * @returns {number} - Delay in milliseconds
 */
export function calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs) {
  const delay = baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 * 
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if HTTP method is retryable
 * 
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @returns {boolean} - True if method can be retried
 */
export function isRetryableMethod(method) {
  if (!method) return true; // Default to retryable if no method specified
  return !NON_RETRYABLE_METHODS.includes(method.toUpperCase());
}

/**
 * RetryController class
 * 
 * Manages retry attempts with exponential backoff for failed API calls.
 * Only retries GET requests to prevent duplicate writes.
 */
class RetryController {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a request with retry logic
   * 
   * @param {Function} requestFn - Async function that makes the API request
   * @param {Object} [options] - Override options for this execution
   * @param {string} [options.method] - HTTP method (GET, POST, etc.)
   * @param {number} [options.maxAttempts] - Maximum retry attempts
   * @param {number} [options.baseDelayMs] - Base delay for backoff
   * @param {number} [options.maxDelayMs] - Maximum delay cap
   * @param {Function} [options.shouldRetry] - Custom retry condition
   * @returns {Promise<any>} - The result of the request
   * @throws {MaxRetriesError} - When max retries exceeded
   */
  async executeWithRetry(requestFn, options = {}) {
    const config = { ...this.options, ...options };
    const { maxAttempts, baseDelayMs, maxDelayMs, shouldRetry, method } = config;

    // Skip retry for write operations
    if (method && !isRetryableMethod(method)) {
      return requestFn();
    }

    let lastError;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        const isLastAttempt = attempt === maxAttempts - 1;
        if (isLastAttempt || !shouldRetry(error)) {
          break;
        }
        
        // Calculate and apply backoff delay
        const delay = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs);
        await sleep(delay);
      }
    }

    // All retries exhausted, throw MaxRetriesError
    throw new MaxRetriesError(maxAttempts, lastError);
  }
}

// Export singleton instance for global use
export const retryController = new RetryController();

// Export class for testing purposes
export { RetryController };
