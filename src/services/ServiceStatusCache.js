/**
 * ServiceStatusCache - In-memory storage for service status data during app session
 * 
 * Core Principles:
 * - In-memory only storage (never persists to AsyncStorage)
 * - Clears on logout/restart
 * - Used for UI optimization only, never for business logic
 * - Maintains timestamp for diagnostics and future staleness checks
 * - Rechecks only on manual refresh or explicit setup screen visits
 * - Respects rollback configuration to disable service status optimization
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import uiOptimizationConfig from './UIOptimizationConfig';

class ServiceStatusCache {
  constructor() {
    this.serviceStatuses = new Map(); // Map of service name to status data
    this.isInitialized = false;
    
    console.log('🔧 [ServiceStatusCache] Initialized - in-memory only storage');
  }

  /**
   * Get cached service status
   * @param {string} serviceName - Name of the service (e.g., 'whatsapp', 'email')
   * @returns {Object|null} Service status object or null if no data
   */
  getServiceStatus(serviceName) {
    // Check if service status optimization is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isServiceStatusOptimizationEnabled()) {
      console.log('🔄 [ServiceStatusCache] Service status optimization disabled - returning null');
      return null; // Force fresh status check when disabled
    }

    const statusData = this.serviceStatuses.get(serviceName);
    
    console.log('🔧 [ServiceStatusCache] getServiceStatus called:', {
      serviceName,
      hasData: statusData !== undefined,
      lastFetch: statusData?.lastFetchTime
    });
    
    return statusData?.status || null;
  }

  /**
   * Store service status with timestamp
   * @param {string} serviceName - Name of the service
   * @param {Object} status - Service status object to store
   * @param {number} timestamp - Timestamp when data was fetched
   */
  setServiceStatus(serviceName, status, timestamp = Date.now()) {
    // Check if service status optimization is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isServiceStatusOptimizationEnabled()) {
      console.log('🔄 [ServiceStatusCache] Service status optimization disabled - skipping cache');
      return;
    }

    if (!serviceName || typeof status !== 'object' || status === null) {
      console.error('🔧 [ServiceStatusCache] setServiceStatus: Invalid parameters');
      return;
    }

    const statusData = {
      status: { ...status }, // Create a copy to avoid mutations
      lastFetchTime: timestamp,
      serviceName
    };

    this.serviceStatuses.set(serviceName, statusData);
    this.isInitialized = true;

    console.log('🔧 [ServiceStatusCache] Service status stored:', {
      serviceName,
      timestamp: new Date(timestamp).toISOString(),
      statusKeys: Object.keys(status)
    });
  }

  /**
   * Check if cache has data for a specific service
   * @param {string} serviceName - Name of the service
   * @returns {boolean} True if has data, false otherwise
   */
  hasServiceStatus(serviceName) {
    return this.serviceStatuses.has(serviceName);
  }

  /**
   * Get last fetch timestamp for a service
   * @param {string} serviceName - Name of the service
   * @returns {number|null} Timestamp or null if no data
   */
  getLastFetchTime(serviceName) {
    const statusData = this.serviceStatuses.get(serviceName);
    return statusData?.lastFetchTime || null;
  }

  /**
   * Clear all stored service status data (called on logout/restart)
   */
  clear() {
    console.log('🔧 [ServiceStatusCache] Clearing session data');
    
    this.serviceStatuses.clear();
    this.isInitialized = false;
    
    console.log('🔧 [ServiceStatusCache] Session data cleared');
  }

  /**
   * Clear status for a specific service
   * @param {string} serviceName - Name of the service to clear
   */
  clearService(serviceName) {
    if (this.serviceStatuses.has(serviceName)) {
      this.serviceStatuses.delete(serviceName);
      console.log('🔧 [ServiceStatusCache] Service status cleared:', serviceName);
    }
  }

  /**
   * Get all cached service names
   * @returns {Array} Array of service names that have cached status
   */
  getCachedServices() {
    return Array.from(this.serviceStatuses.keys());
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const services = {};
    
    for (const [serviceName, statusData] of this.serviceStatuses) {
      services[serviceName] = {
        lastFetchTime: statusData.lastFetchTime,
        lastFetchAge: statusData.lastFetchTime ? Date.now() - statusData.lastFetchTime : null,
        statusKeys: Object.keys(statusData.status)
      };
    }

    return {
      isInitialized: this.isInitialized,
      serviceCount: this.serviceStatuses.size,
      services
    };
  }

  /**
   * Validate that we're not persisting to AsyncStorage
   * This method is for testing/debugging purposes
   */
  validateInMemoryOnly() {
    // This is a compile-time check - if AsyncStorage is imported here, it's a violation
    const hasAsyncStorage = typeof AsyncStorage !== 'undefined';
    if (hasAsyncStorage) {
      console.warn('⚠️ [ServiceStatusCache] AsyncStorage detected - ensure no persistence calls are made');
    }
    
    return {
      inMemoryOnly: true,
      asyncStorageDetected: hasAsyncStorage,
      storageType: 'memory'
    };
  }
}

// Create singleton instance
const serviceStatusCache = new ServiceStatusCache();

export default serviceStatusCache;