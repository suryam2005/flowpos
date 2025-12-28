/**
 * CallCounter - API call tracking utility with soft limits
 * 
 * Tracks API call counts per endpoint per session and logs warnings
 * when thresholds are exceeded. Does NOT block calls when threshold
 * is exceeded - this is a soft limit for monitoring purposes only.
 * 
 * @module CallCounter
 */

/**
 * Default thresholds per endpoint (per session)
 */
const DEFAULT_THRESHOLDS = {
  'GET:/api/products': 20,
  'GET:/api/orders': 20,
  'GET:/api/store': 10,
  'GET:/api/subscription/status': 5,
};

/**
 * CallCounter class
 * 
 * Tracks API call counts per endpoint per session.
 * Logs warnings when thresholds are exceeded but does NOT block calls.
 */
class CallCounter {
  constructor(thresholds = {}) {
    this._thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this._counts = new Map();
    this._sessionStart = Date.now();
    this._warningsLogged = new Set(); // Track which endpoints have logged warnings
  }

  /**
   * Increment call count for an endpoint
   * 
   * @param {string} endpoint - The endpoint key (e.g., 'GET:/api/products')
   */
  increment(endpoint) {
    const currentCount = this._counts.get(endpoint) || 0;
    this._counts.set(endpoint, currentCount + 1);
  }

  /**
   * Get current count for an endpoint
   * 
   * @param {string} endpoint - The endpoint key
   * @returns {number} - Current call count for the endpoint
   */
  getCount(endpoint) {
    return this._counts.get(endpoint) || 0;
  }

  /**
   * Get threshold for an endpoint
   * 
   * @param {string} endpoint - The endpoint key
   * @returns {number} - Threshold for the endpoint, or Infinity if not defined
   */
  getThreshold(endpoint) {
    return this._thresholds[endpoint] ?? Infinity;
  }

  /**
   * Check if threshold is exceeded and log warning if so
   * 
   * @param {string} endpoint - The endpoint key
   * @returns {boolean} - True if threshold is exceeded, false otherwise
   */
  checkThreshold(endpoint) {
    const count = this.getCount(endpoint);
    const threshold = this.getThreshold(endpoint);
    const exceeded = count > threshold;

    if (exceeded && !this._warningsLogged.has(endpoint)) {
      console.warn(
        `[CallCounter] API call threshold exceeded for ${endpoint}: ` +
        `${count} calls (threshold: ${threshold}). ` +
        `Consider optimizing API usage.`
      );
      this._warningsLogged.add(endpoint);
    }

    return exceeded;
  }

  /**
   * Reset all counts (call on session start)
   */
  reset() {
    this._counts.clear();
    this._warningsLogged.clear();
    this._sessionStart = Date.now();
  }

  /**
   * Get session start timestamp
   * 
   * @returns {number} - Session start timestamp in milliseconds
   */
  getSessionStart() {
    return this._sessionStart;
  }

  /**
   * Get all current counts
   * 
   * @returns {Object} - Object with endpoint keys and their counts
   */
  getAllCounts() {
    const counts = {};
    this._counts.forEach((count, endpoint) => {
      counts[endpoint] = count;
    });
    return counts;
  }

  /**
   * Get summary of all endpoints with their counts and thresholds
   * 
   * @returns {Array<Object>} - Array of endpoint summaries
   */
  getSummary() {
    const summary = [];
    const allEndpoints = new Set([
      ...Object.keys(this._thresholds),
      ...this._counts.keys(),
    ]);

    allEndpoints.forEach(endpoint => {
      const count = this.getCount(endpoint);
      const threshold = this.getThreshold(endpoint);
      summary.push({
        endpoint,
        count,
        threshold,
        exceeded: count > threshold,
      });
    });

    return summary;
  }
}

// Export singleton instance for global use
export const callCounter = new CallCounter();

// Export class for testing purposes
export { CallCounter, DEFAULT_THRESHOLDS };
