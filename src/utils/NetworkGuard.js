/**
 * NetworkGuard - Offline blocking utility for API calls
 * 
 * Provides network connectivity checking and guards API calls
 * when the device is offline. Returns clean errors immediately
 * without queuing or caching offline requests.
 * 
 * @module NetworkGuard
 */

import NetInfo from '@react-native-community/netinfo';

/**
 * Custom error for offline state
 */
export class OfflineError extends Error {
  constructor() {
    super('Device is offline. Please check your connection.');
    this.name = 'OfflineError';
    this.code = 'OFFLINE';
  }
}

/**
 * NetworkGuard class
 * 
 * Manages network connectivity checking and blocks API calls
 * when the device is offline. Does NOT queue offline calls
 * and does NOT write to cache when offline.
 */
class NetworkGuard {
  constructor() {
    this._isOnline = true;
    this._unsubscribe = null;
    this._initNetworkListener();
  }

  /**
   * Initialize network state listener
   * @private
   */
  _initNetworkListener() {
    // Subscribe to network state changes
    this._unsubscribe = NetInfo.addEventListener(state => {
      this._isOnline = state.isConnected && state.isInternetReachable !== false;
    });

    // Get initial state
    NetInfo.fetch().then(state => {
      this._isOnline = state.isConnected && state.isInternetReachable !== false;
    });
  }

  /**
   * Check if device is currently online
   * 
   * Uses cached state for synchronous access, but can also
   * fetch fresh state asynchronously.
   * 
   * @param {boolean} [fresh=false] - If true, fetches fresh state from NetInfo
   * @returns {Promise<boolean>|boolean} - True if online, false if offline
   */
  async isOnline(fresh = false) {
    if (fresh) {
      const state = await NetInfo.fetch();
      this._isOnline = state.isConnected && state.isInternetReachable !== false;
    }
    return this._isOnline;
  }

  /**
   * Synchronous check if device is online (uses cached state)
   * 
   * @returns {boolean} - True if online, false if offline
   */
  isOnlineSync() {
    return this._isOnline;
  }

  /**
   * Execute an API call with offline guard
   * 
   * Blocks execution immediately if device is offline.
   * Returns OfflineError without queuing or caching.
   * 
   * @param {Function} apiCallFn - Async function that makes the API call
   * @returns {Promise<any>} - The result of the API call
   * @throws {OfflineError} - When device is offline
   */
  async guardedApiCall(apiCallFn) {
    // Check network state (fresh check for accuracy)
    const online = await this.isOnline(true);
    
    if (!online) {
      // Block immediately - NO queuing, NO cache writes
      throw new OfflineError();
    }

    // Device is online, execute the API call
    return apiCallFn();
  }

  /**
   * Cleanup network listener
   * Call this when the guard is no longer needed
   */
  cleanup() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }
}

// Export singleton instance for global use
export const networkGuard = new NetworkGuard();

// Export class for testing purposes
export { NetworkGuard };
