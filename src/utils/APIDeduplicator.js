/**
 * APIDeduplicator - Public API for endpoint-specific request deduplication
 * 
 * Wraps the internal RequestDeduplicator to provide a clean public interface
 * for services and contexts to deduplicate API calls by endpoint.
 * 
 * @module APIDeduplicator
 */

import { RequestDeduplicator } from './debounce';

/**
 * Endpoint key constants for consistent deduplication keys
 */
export const ENDPOINT_KEYS = {
  PRODUCTS: 'GET:/api/products',
  ORDERS: 'GET:/api/orders',
  STORE: 'GET:/api/store',
  SUBSCRIPTION: 'GET:/api/subscription/status',
};

/**
 * APIDeduplicator class
 * 
 * Provides a public API for deduplicating API requests by endpoint key.
 * Ensures only one active API call per endpoint at a time.
 */
class APIDeduplicator {
  constructor() {
    this._deduplicator = new RequestDeduplicator();
  }

  /**
   * Deduplicate requests by endpoint key
   * 
   * If a request for the same endpoint is already in-flight,
   * returns the existing promise instead of making a new request.
   * 
   * @param {string} endpointKey - The endpoint key (use ENDPOINT_KEYS constants)
   * @param {Function} requestFn - Async function that makes the API request
   * @returns {Promise<any>} - The result of the API request
   */
  async deduplicate(endpointKey, requestFn) {
    return this._deduplicator.deduplicate(endpointKey, requestFn);
  }

  /**
   * Check if a request is currently in-flight for the given endpoint
   * 
   * @param {string} endpointKey - The endpoint key to check
   * @returns {boolean} - True if a request is in-flight, false otherwise
   */
  isInFlight(endpointKey) {
    return this._deduplicator.pendingRequests.has(endpointKey);
  }

  /**
   * Clear pending requests
   * 
   * @param {string} [endpointKey] - Optional endpoint key to clear.
   *                                 If not provided, clears all pending requests.
   */
  clear(endpointKey) {
    this._deduplicator.clear(endpointKey);
  }
}

// Export singleton instance for global use
export const apiDeduplicator = new APIDeduplicator();

// Export class for testing purposes
export { APIDeduplicator };
