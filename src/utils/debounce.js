/**
 * Debounce utility for API calls
 * Delays execution until after wait milliseconds have elapsed since the last call
 */
export const debounce = (func, wait = 250) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle utility for API calls
 * Ensures function is called at most once per specified time period
 */
export const throttle = (func, limit = 1000) => {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Request deduplication utility
 * Prevents duplicate API calls to the same endpoint while a request is in flight
 */
export class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  async deduplicate(key, requestFn) {
    // If request is already in flight, return the existing promise
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 [Dedup] Reusing in-flight request: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Create new request
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pendingRequests.delete(key);
      });

    // Store the promise
    this.pendingRequests.set(key, promise);
    
    return promise;
  }

  clear(key) {
    if (key) {
      this.pendingRequests.delete(key);
    } else {
      this.pendingRequests.clear();
    }
  }
}

// Global deduplicator instance
export const globalDeduplicator = new RequestDeduplicator();
