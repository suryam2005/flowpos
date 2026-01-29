/**
 * ServiceStatusCoordinator - Coordinate service status fetching across all screens
 * 
 * Core Principles:
 * - Treat status as session-known after first check
 * - Recheck only on manual refresh or explicit setup screen visits
 * - Maintain all existing service status behavior from user perspective
 * - Never change API contracts or business logic
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import serviceStatusCache from './ServiceStatusCache';
import { apiCallWithFallback } from '../config/apiConfig';

class ServiceStatusCoordinator {
  constructor() {
    this.isInitialized = false;
    console.log('🔧 [ServiceStatusCoordinator] Initialized');
  }

  /**
   * Fetch WhatsApp service status with caching
   * @param {Object} options - Fetch options
   * @param {boolean} options.forceRefresh - Force API call bypassing cache
   * @param {string} options.screenName - Name of requesting screen for logging
   * @returns {Promise<Object>} WhatsApp service status
   */
  async fetchWhatsAppStatus(options = {}) {
    const { forceRefresh = false, screenName = 'unknown' } = options;
    const serviceName = 'whatsapp';

    console.log('🔧 [ServiceStatusCoordinator] fetchWhatsAppStatus called:', {
      serviceName,
      forceRefresh,
      screenName,
      hasCache: serviceStatusCache.hasServiceStatus(serviceName)
    });

    // Check cache first (unless force refresh)
    if (!forceRefresh && serviceStatusCache.hasServiceStatus(serviceName)) {
      const cachedStatus = serviceStatusCache.getServiceStatus(serviceName);
      console.log('🔧 [ServiceStatusCoordinator] Using cached WhatsApp status');
      return cachedStatus;
    }

    // Fetch from API
    try {
      console.log('🔧 [ServiceStatusCoordinator] Fetching WhatsApp status from API');
      
      const response = await apiCallWithFallback('/whatsapp/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        const status = data.data || data;

        // Store in cache
        serviceStatusCache.setServiceStatus(serviceName, status);
        
        console.log('🔧 [ServiceStatusCoordinator] WhatsApp status fetched and cached:', {
          configured: status.configured,
          ready: status.ready
        });

        return status;
      } else {
        console.error('🔧 [ServiceStatusCoordinator] WhatsApp status API failed:', response.status);
        
        // If we have cached data and API fails, return cached data
        if (serviceStatusCache.hasServiceStatus(serviceName)) {
          console.log('🔧 [ServiceStatusCoordinator] API failed, using cached WhatsApp status');
          return serviceStatusCache.getServiceStatus(serviceName);
        }
        
        throw new Error(`WhatsApp status API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('🔧 [ServiceStatusCoordinator] Error fetching WhatsApp status:', error);
      
      // If we have cached data and API fails, return cached data
      if (serviceStatusCache.hasServiceStatus(serviceName)) {
        console.log('🔧 [ServiceStatusCoordinator] Error occurred, using cached WhatsApp status');
        return serviceStatusCache.getServiceStatus(serviceName);
      }
      
      throw error;
    }
  }

  /**
   * Fetch Email Automation service status with caching
   * @param {Object} options - Fetch options
   * @param {boolean} options.forceRefresh - Force API call bypassing cache
   * @param {string} options.screenName - Name of requesting screen for logging
   * @returns {Promise<Object>} Email service status
   */
  async fetchEmailStatus(options = {}) {
    const { forceRefresh = false, screenName = 'unknown' } = options;
    const serviceName = 'email';

    console.log('🔧 [ServiceStatusCoordinator] fetchEmailStatus called:', {
      serviceName,
      forceRefresh,
      screenName,
      hasCache: serviceStatusCache.hasServiceStatus(serviceName)
    });

    // Check cache first (unless force refresh)
    if (!forceRefresh && serviceStatusCache.hasServiceStatus(serviceName)) {
      const cachedStatus = serviceStatusCache.getServiceStatus(serviceName);
      console.log('🔧 [ServiceStatusCoordinator] Using cached email status');
      return cachedStatus;
    }

    // Fetch from API
    try {
      console.log('🔧 [ServiceStatusCoordinator] Fetching email status from API');
      
      const response = await apiCallWithFallback('/email-automation/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        const status = data.data || data;

        // Store in cache
        serviceStatusCache.setServiceStatus(serviceName, status);
        
        console.log('🔧 [ServiceStatusCoordinator] Email status fetched and cached:', {
          initialized: status.initialized,
          emailAutomationEnabled: status.emailAutomationEnabled
        });

        return status;
      } else {
        console.error('🔧 [ServiceStatusCoordinator] Email status API failed:', response.status);
        
        // If we have cached data and API fails, return cached data
        if (serviceStatusCache.hasServiceStatus(serviceName)) {
          console.log('🔧 [ServiceStatusCoordinator] API failed, using cached email status');
          return serviceStatusCache.getServiceStatus(serviceName);
        }
        
        throw new Error(`Email status API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('🔧 [ServiceStatusCoordinator] Error fetching email status:', error);
      
      // If we have cached data and API fails, return cached data
      if (serviceStatusCache.hasServiceStatus(serviceName)) {
        console.log('🔧 [ServiceStatusCoordinator] Error occurred, using cached email status');
        return serviceStatusCache.getServiceStatus(serviceName);
      }
      
      throw error;
    }
  }

  /**
   * Clear all service status cache (called on logout/restart)
   */
  clearCache() {
    console.log('🔧 [ServiceStatusCoordinator] Clearing service status cache');
    serviceStatusCache.clear();
  }

  /**
   * Clear cache for a specific service
   * @param {string} serviceName - Name of the service to clear
   */
  clearServiceCache(serviceName) {
    console.log('🔧 [ServiceStatusCoordinator] Clearing cache for service:', serviceName);
    serviceStatusCache.clearService(serviceName);
  }

  /**
   * Get cache statistics for debugging
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return serviceStatusCache.getStats();
  }

  /**
   * Check if a service has cached status
   * @param {string} serviceName - Name of the service
   * @returns {boolean} True if service has cached status
   */
  hasServiceStatus(serviceName) {
    return serviceStatusCache.hasServiceStatus(serviceName);
  }
}

// Create singleton instance
const serviceStatusCoordinator = new ServiceStatusCoordinator();

export default serviceStatusCoordinator;