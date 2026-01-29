/**
 * useServiceStatus - Hook for accessing cached service status
 * 
 * Core Principles:
 * - Treat status as session-known after first check
 * - Recheck only on manual refresh or explicit setup screen visits
 * - Maintain all existing service status behavior from user perspective
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import { useState, useEffect, useCallback } from 'react';
import serviceStatusCoordinator from '../services/ServiceStatusCoordinator';

/**
 * Hook for WhatsApp service status with caching
 * @param {Object} options - Hook options
 * @param {boolean} options.autoFetch - Whether to fetch status on mount (default: true)
 * @param {string} options.screenName - Name of the screen using this hook
 * @returns {Object} WhatsApp status state and methods
 */
export const useWhatsAppStatus = (options = {}) => {
  const { autoFetch = true, screenName = 'unknown' } = options;
  
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch WhatsApp status (uses cache by default)
   * @param {boolean} forceRefresh - Force API call bypassing cache
   */
  const fetchStatus = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔧 [useWhatsAppStatus] Fetching status:', { forceRefresh, screenName });
      
      const whatsappStatus = await serviceStatusCoordinator.fetchWhatsAppStatus({
        forceRefresh,
        screenName
      });

      setStatus(whatsappStatus);
      console.log('🔧 [useWhatsAppStatus] Status updated:', whatsappStatus);
    } catch (err) {
      console.error('🔧 [useWhatsAppStatus] Error fetching status:', err);
      setError(err.message || 'Failed to fetch WhatsApp status');
    } finally {
      setLoading(false);
    }
  }, [screenName]);

  /**
   * Refresh status (forces API call)
   */
  const refreshStatus = useCallback(() => {
    return fetchStatus(true);
  }, [fetchStatus]);

  /**
   * Check if status is cached
   */
  const isCached = useCallback(() => {
    return serviceStatusCoordinator.hasServiceStatus('whatsapp');
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchStatus(false);
    }
  }, [autoFetch, fetchStatus]);

  return {
    status,
    loading,
    error,
    fetchStatus,
    refreshStatus,
    isCached
  };
};

/**
 * Hook for Email service status with caching
 * @param {Object} options - Hook options
 * @param {boolean} options.autoFetch - Whether to fetch status on mount (default: true)
 * @param {string} options.screenName - Name of the screen using this hook
 * @returns {Object} Email status state and methods
 */
export const useEmailStatus = (options = {}) => {
  const { autoFetch = true, screenName = 'unknown' } = options;
  
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch Email status (uses cache by default)
   * @param {boolean} forceRefresh - Force API call bypassing cache
   */
  const fetchStatus = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔧 [useEmailStatus] Fetching status:', { forceRefresh, screenName });
      
      const emailStatus = await serviceStatusCoordinator.fetchEmailStatus({
        forceRefresh,
        screenName
      });

      setStatus(emailStatus);
      console.log('🔧 [useEmailStatus] Status updated:', emailStatus);
    } catch (err) {
      console.error('🔧 [useEmailStatus] Error fetching status:', err);
      setError(err.message || 'Failed to fetch email status');
    } finally {
      setLoading(false);
    }
  }, [screenName]);

  /**
   * Refresh status (forces API call)
   */
  const refreshStatus = useCallback(() => {
    return fetchStatus(true);
  }, [fetchStatus]);

  /**
   * Check if status is cached
   */
  const isCached = useCallback(() => {
    return serviceStatusCoordinator.hasServiceStatus('email');
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchStatus(false);
    }
  }, [autoFetch, fetchStatus]);

  return {
    status,
    loading,
    error,
    fetchStatus,
    refreshStatus,
    isCached
  };
};

/**
 * Hook for general service status cache management
 * @returns {Object} Cache management methods
 */
export const useServiceStatusCache = () => {
  /**
   * Clear all service status cache
   */
  const clearCache = useCallback(() => {
    console.log('🔧 [useServiceStatusCache] Clearing all service status cache');
    serviceStatusCoordinator.clearCache();
  }, []);

  /**
   * Clear cache for a specific service
   * @param {string} serviceName - Name of the service to clear
   */
  const clearServiceCache = useCallback((serviceName) => {
    console.log('🔧 [useServiceStatusCache] Clearing cache for service:', serviceName);
    serviceStatusCoordinator.clearServiceCache(serviceName);
  }, []);

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  const getCacheStats = useCallback(() => {
    return serviceStatusCoordinator.getCacheStats();
  }, []);

  return {
    clearCache,
    clearServiceCache,
    getCacheStats
  };
};