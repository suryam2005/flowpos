import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for subscription data persistence
const STORAGE_KEYS = {
  SUBSCRIPTION_DATA: '@flowpos_subscription_data',
  SUBSCRIPTION_TIMESTAMP: '@flowpos_subscription_timestamp'
};

// Cache staleness threshold (in milliseconds)
// Data older than this will trigger a background refresh
// Default: 24 hours (session-based staleness)
const CACHE_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Global reference for subscription actions (used by AuthContext integration)
// This allows AuthContext to trigger subscription operations without circular dependencies
let globalSubscriptionActions = {
  refreshSubscription: null,
  clearCache: null
};

// Safe default state when subscription data is unavailable
// No enforcement - all features accessible
const UNKNOWN_SUBSCRIPTION_STATE = {
  plan: 'unknown',
  status: 'UNKNOWN',
  startedAt: null,
  expiresAt: null,
  limits: {
    maxProducts: 'unlimited',
    maxTransactions: 'unlimited',
    maxDevices: 999,
    storageGB: 999
  },
  features: {},
  planDetails: {
    name: 'Unknown',
    price: 0,
    currency: 'INR'
  }
};

// Create the context
const SubscriptionContext = createContext(null);

/**
 * Hook to access subscription context
 * @returns {SubscriptionContextValue} The subscription context value
 */
export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
};

/**
 * SubscriptionProvider - Single cache owner for subscription data
 * Implements request deduplication, AsyncStorage persistence, and safe defaults
 */
export const SubscriptionProvider = ({ children }) => {
  // State
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  // Refs for request deduplication
  const inFlightPromiseRef = useRef(null);
  const mountedRef = useRef(true);

  // Load cached data from AsyncStorage on mount
  useEffect(() => {
    mountedRef.current = true;
    loadCachedData();
    
    // Register global actions for AuthContext integration
    // This enables login/logout flows to trigger subscription operations
    registerSubscriptionActions({
      refreshSubscription,
      clearCache
    });
    
    return () => {
      mountedRef.current = false;
      // Unregister actions on unmount
      unregisterSubscriptionActions();
    };
  }, [refreshSubscription, clearCache]);

  /**
   * Check if cached data is stale (older than session threshold)
   * Implements Requirement 10.3 - Validate cached data freshness
   * @param {number|null} timestamp - The timestamp when data was cached
   * @returns {boolean} True if data is stale, false otherwise
   */
  const isCacheStale = (timestamp) => {
    if (!timestamp) {
      // No timestamp means we should refresh
      return true;
    }
    const now = Date.now();
    const age = now - timestamp;
    const isStale = age > CACHE_STALE_THRESHOLD_MS;
    
    if (isStale) {
      console.log('[SubscriptionCache] Cache is stale:', {
        ageMs: age,
        thresholdMs: CACHE_STALE_THRESHOLD_MS,
        ageHours: Math.round(age / (60 * 60 * 1000))
      });
    }
    
    return isStale;
  };

  /**
   * Trigger background refresh for stale data (non-blocking)
   * Implements Requirements 10.4, 10.5 - Background refresh without blocking UI
   * This function fires and forgets - it does not block the UI
   */
  const triggerBackgroundRefresh = () => {
    console.log('[SubscriptionCache] Triggering background refresh for stale data');
    
    // Fire and forget - don't await, don't block UI (Requirement 10.5)
    refreshSubscription().catch(err => {
      // Log error but don't throw - this is non-blocking
      // App continues with cached data (Requirement 10.5)
      console.error('[SubscriptionCache] Background refresh failed:', {
        operation: 'background-refresh',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
  };

  /**
   * Load subscription data from AsyncStorage on app start
   * Implements Requirements 10.1, 10.2 - App restart recovery
   * Implements Requirements 10.3, 10.4, 10.5 - Stale data refresh
   * Implements error handling with safe defaults (Requirements 8.4, 8.5, 8.6)
   * 
   * Strategy:
   * 1. Check AsyncStorage for existing subscription data (Requirement 10.1)
   * 2. Load into memory immediately if available (Requirement 10.2)
   * 3. Make data available without waiting for API (Requirement 10.2)
   * 4. Check timestamp of cached data (Requirement 10.3)
   * 5. Trigger background refresh if stale (Requirement 10.4)
   * 6. Do not block UI during refresh (Requirement 10.5)
   */
  const loadCachedData = async () => {
    try {
      // Step 1: Check AsyncStorage for existing subscription data (Requirement 10.1)
      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_TIMESTAMP)
      ]);

      if (cachedData && mountedRef.current) {
        try {
          const parsedData = JSON.parse(cachedData);
          const timestamp = cachedTimestamp ? parseInt(cachedTimestamp, 10) : null;
          
          // Step 2 & 3: Load into memory immediately, make data available without waiting for API
          // (Requirements 10.1, 10.2)
          setSubscription(parsedData);
          setIsCached(true);
          setLastFetchedAt(timestamp);
          setIsLoading(false);
          console.log('[SubscriptionCache] Loaded cached data from AsyncStorage immediately');
          
          // Step 4 & 5: Check if data is stale and trigger background refresh if needed
          // (Requirements 10.3, 10.4)
          // This is non-blocking - UI continues with cached data (Requirement 10.5)
          if (isCacheStale(timestamp)) {
            // Use setTimeout to ensure state updates are complete before refresh
            // This ensures the UI has the cached data before we start refreshing
            setTimeout(() => {
              if (mountedRef.current) {
                triggerBackgroundRefresh();
              }
            }, 100);
          } else {
            console.log('[SubscriptionCache] Cached data is fresh, no background refresh needed');
          }
        } catch (parseError) {
          // Log parsing error internally (Requirement 8.4)
          console.error('[SubscriptionCache] Error parsing cached data:', {
            operation: 'load',
            error: parseError.message,
            timestamp: new Date().toISOString()
          });
          // Set UNKNOWN state on parse error (Requirements 8.5, 8.6)
          if (mountedRef.current) {
            setSubscription(UNKNOWN_SUBSCRIPTION_STATE);
            setIsLoading(false);
          }
        }
      } else if (mountedRef.current) {
        // No cached data available - set UNKNOWN state (Requirement 8.2, 8.3)
        setSubscription(UNKNOWN_SUBSCRIPTION_STATE);
        setIsLoading(false);
        console.log('[SubscriptionCache] No cached data, using UNKNOWN state');
      }
    } catch (err) {
      // Log storage error internally (Requirement 8.4)
      console.error('[SubscriptionCache] Error loading cached data:', {
        operation: 'load',
        error: err.message,
        timestamp: new Date().toISOString()
      });
      // Set UNKNOWN state on error (Requirements 8.5, 8.6)
      // App continues functioning normally
      if (mountedRef.current) {
        setSubscription(UNKNOWN_SUBSCRIPTION_STATE);
        setIsLoading(false);
      }
    }
  };

  /**
   * Store subscription data in both memory and AsyncStorage
   * Implements Requirements 2.2, 2.3 - Data persistence
   */
  const storeSubscriptionData = async (data) => {
    const timestamp = Date.now();
    
    // Update in-memory state immediately
    if (mountedRef.current) {
      setSubscription(data);
      setIsCached(true);
      setLastFetchedAt(timestamp);
      setError(null);
    }

    // Persist to AsyncStorage
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_DATA, JSON.stringify(data)),
        AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_TIMESTAMP, timestamp.toString())
      ]);
      console.log('[SubscriptionCache] Data stored in AsyncStorage');
    } catch (err) {
      // Log error but don't fail - in-memory cache is still valid
      console.error('[SubscriptionCache] Error storing to AsyncStorage:', {
        operation: 'store',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  };


  /**
   * Fetch subscription data from backend API
   * Implements request deduplication (Requirements 1.3, 1.4, 1.5)
   * Implements error handling with safe defaults (Requirements 8.4, 8.5, 8.6)
   */
  const fetchSubscriptionFromBackend = async (token) => {
    // If a request is already in flight, return the same promise
    // This prevents duplicate API calls when multiple components request data simultaneously
    if (inFlightPromiseRef.current) {
      console.log('[SubscriptionCache] Returning in-flight promise (deduplication)');
      return inFlightPromiseRef.current;
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      try {
        const { apiCallWithFallback } = require('../config/apiConfig');
        
        const response = await apiCallWithFallback('/subscription/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        // Handle non-JSON responses gracefully
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          // Log parsing error internally (Requirement 8.4)
          console.error('[SubscriptionCache] Error parsing API response:', {
            operation: 'fetch',
            error: parseError.message,
            timestamp: new Date().toISOString()
          });
          // Return UNKNOWN state on parse error (Requirement 8.5, 8.6)
          return UNKNOWN_SUBSCRIPTION_STATE;
        }

        if (!response.ok) {
          // Log API error internally (Requirement 8.4)
          console.error('[SubscriptionCache] API returned error:', {
            operation: 'fetch',
            status: response.status,
            message: data.message || 'Unknown error',
            timestamp: new Date().toISOString()
          });
          throw new Error(data.message || 'Failed to fetch subscription');
        }

        // Parse and normalize the API response with error handling
        try {
          const subscriptionData = parseApiResponse(data);
          return subscriptionData;
        } catch (parseError) {
          // Log parsing error internally (Requirement 8.4)
          console.error('[SubscriptionCache] Error normalizing API response:', {
            operation: 'fetch',
            error: parseError.message,
            timestamp: new Date().toISOString()
          });
          // Return UNKNOWN state on parse error (Requirement 8.5, 8.6)
          return UNKNOWN_SUBSCRIPTION_STATE;
        }
      } catch (networkError) {
        // Log network error internally (Requirement 8.4)
        console.error('[SubscriptionCache] Network error during fetch:', {
          operation: 'fetch',
          error: networkError.message,
          timestamp: new Date().toISOString()
        });
        // Re-throw to be handled by caller
        throw networkError;
      } finally {
        // Clear the in-flight promise when done
        inFlightPromiseRef.current = null;
      }
    })();

    // Store the promise for deduplication
    inFlightPromiseRef.current = fetchPromise;
    return fetchPromise;
  };

  /**
   * Parse API response into normalized SubscriptionData format
   * Implements Requirement 9.4 - API response parsing
   */
  const parseApiResponse = (apiResponse) => {
    // Handle different response formats from the backend
    const data = apiResponse.subscription || apiResponse.data || apiResponse;
    
    return {
      plan: data.plan || data.subscription_plan || 'trial',
      status: data.status || 'active',
      startedAt: data.startedAt || data.started_at || data.created_at || null,
      expiresAt: data.expiresAt || data.expires_at || null,
      limits: {
        maxProducts: data.limits?.maxProducts ?? data.limits?.max_products ?? 'unlimited',
        maxTransactions: data.limits?.maxTransactions ?? data.limits?.max_transactions ?? 'unlimited',
        maxDevices: data.limits?.maxDevices ?? data.limits?.max_devices ?? 999,
        storageGB: data.limits?.storageGB ?? data.limits?.storage_gb ?? 999
      },
      features: data.features || {},
      planDetails: {
        name: data.planDetails?.name || data.plan_details?.name || data.plan || 'Trial',
        price: data.planDetails?.price || data.plan_details?.price || 0,
        currency: data.planDetails?.currency || data.plan_details?.currency || 'INR'
      }
    };
  };


  /**
   * Refresh subscription data from backend
   * Implements cache-first strategy with fallback (Requirements 3.1-3.5)
   * Implements error handling with safe defaults (Requirements 8.4, 8.5, 8.6)
   */
  const refreshSubscription = useCallback(async () => {
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Get auth token
      let token;
      try {
        token = await AsyncStorage.getItem('accessToken');
      } catch (storageError) {
        // Log storage error internally (Requirement 8.4)
        console.error('[SubscriptionCache] Error reading auth token:', {
          operation: 'fetch',
          error: storageError.message,
          timestamp: new Date().toISOString()
        });
        // Continue without token - will be handled below
        token = null;
      }
      
      if (!token) {
        console.log('[SubscriptionCache] No auth token available');
        if (mountedRef.current) {
          setIsLoading(false);
          // Set UNKNOWN state if no cached data exists (Requirement 8.2, 8.3)
          if (!subscription) {
            setSubscription(UNKNOWN_SUBSCRIPTION_STATE);
          }
        }
        return;
      }

      // Fetch from backend
      const data = await fetchSubscriptionFromBackend(token);
      
      // Check if we got UNKNOWN state back (from internal error handling)
      if (data && data.status === 'UNKNOWN') {
        if (mountedRef.current) {
          // Only set UNKNOWN if we don't have better cached data
          if (!subscription || subscription.status === 'UNKNOWN') {
            setSubscription(UNKNOWN_SUBSCRIPTION_STATE);
          }
          setIsLoading(false);
        }
        return;
      }
      
      // Store in cache
      await storeSubscriptionData(data);
      
      console.log('[SubscriptionCache] Subscription refreshed successfully');
    } catch (err) {
      // Log error internally without exposing to users (Requirement 8.4)
      console.error('[SubscriptionCache] Error refreshing subscription:', {
        operation: 'fetch',
        error: err.message,
        timestamp: new Date().toISOString()
      });

      // On error, set UNKNOWN state (Requirements 8.2, 8.3, 8.5, 8.6)
      // This ensures no features are blocked and app continues functioning
      if (mountedRef.current) {
        // Store error internally for debugging, but don't expose to users
        setError(err.message);
        
        // Always ensure we have a valid subscription state
        // If we have cached data, keep it; otherwise use UNKNOWN state
        if (!subscription) {
          setSubscription(UNKNOWN_SUBSCRIPTION_STATE);
          console.log('[SubscriptionCache] Set UNKNOWN state due to fetch error');
        } else {
          console.log('[SubscriptionCache] Keeping cached data despite fetch error');
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [subscription]);

  /**
   * Clear all subscription cache data
   * Implements Requirements 7.1, 7.2 - Logout cleanup
   */
  const clearCache = useCallback(async () => {
    // Clear in-memory state
    if (mountedRef.current) {
      setSubscription(null);
      setIsCached(false);
      setLastFetchedAt(null);
      setError(null);
      setIsLoading(false);
    }

    // Clear in-flight promise
    inFlightPromiseRef.current = null;

    // Clear AsyncStorage
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_TIMESTAMP)
      ]);
      console.log('[SubscriptionCache] Cache cleared successfully');
    } catch (err) {
      console.error('[SubscriptionCache] Error clearing cache:', {
        operation: 'clear',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }, []);


  /**
   * Update subscription cache with new data (write-through)
   * Implements Requirements 6.1, 6.2, 6.3 - Write-through cache update
   * Implements error handling with safe defaults (Requirements 8.4, 8.5, 8.6)
   * Does NOT trigger a refetch - just updates the cache directly
   */
  const updateSubscriptionCache = useCallback(async (newData) => {
    if (!newData) {
      console.warn('[SubscriptionCache] updateSubscriptionCache called with null/undefined data');
      return;
    }

    try {
      // Normalize the data with error handling
      let normalizedData;
      try {
        normalizedData = parseApiResponse(newData);
      } catch (parseError) {
        // Log parsing error internally (Requirement 8.4)
        console.error('[SubscriptionCache] Error normalizing update data:', {
          operation: 'update',
          error: parseError.message,
          timestamp: new Date().toISOString()
        });
        // Don't update cache with invalid data, but don't crash either (Requirement 8.5)
        return;
      }
      
      // Store immediately (write-through)
      await storeSubscriptionData(normalizedData);
      
      console.log('[SubscriptionCache] Cache updated via write-through');
    } catch (err) {
      // Log error internally (Requirement 8.4)
      console.error('[SubscriptionCache] Error updating cache:', {
        operation: 'update',
        error: err.message,
        timestamp: new Date().toISOString()
      });
      // App continues functioning (Requirement 8.5, 8.6)
    }
  }, []);

  /**
   * Get subscription data with cache-first strategy
   * Implements Requirements 3.1, 3.2, 3.3, 3.4 - Cache-first read strategy
   * 
   * Strategy:
   * 1. Check in-memory cache first (Requirement 3.1)
   * 2. Return cached data immediately if available
   * 3. Fetch from backend only on cache miss (Requirement 3.2)
   * 4. Store response in cache after successful fetch (Requirement 3.3)
   * 5. Return safe default on error (Requirement 3.4)
   * 
   * Implements error handling with safe defaults (Requirements 8.4, 8.5, 8.6)
   */
  const getSubscription = useCallback(async () => {
    try {
      // Step 1: Check in-memory cache first (Requirement 3.1)
      // Return cached data immediately if available - no API call needed
      if (subscription && isCached) {
        console.log('[SubscriptionCache] Cache hit - returning cached data immediately');
        return subscription;
      }

      console.log('[SubscriptionCache] Cache miss - fetching from backend');

      // Step 2: Cache miss - need to fetch from backend (Requirement 3.2)
      // Get auth token
      let token;
      try {
        token = await AsyncStorage.getItem('accessToken');
      } catch (storageError) {
        console.error('[SubscriptionCache] Error reading auth token:', {
          operation: 'get',
          error: storageError.message,
          timestamp: new Date().toISOString()
        });
        token = null;
      }

      if (!token) {
        console.log('[SubscriptionCache] No auth token - returning UNKNOWN state');
        return UNKNOWN_SUBSCRIPTION_STATE;
      }

      // Step 3: Fetch from backend
      const data = await fetchSubscriptionFromBackend(token);

      // Check if we got UNKNOWN state back (from internal error handling)
      if (data && data.status === 'UNKNOWN') {
        console.log('[SubscriptionCache] Backend returned UNKNOWN state');
        return UNKNOWN_SUBSCRIPTION_STATE;
      }

      // Step 4: Store response in cache after successful fetch (Requirement 3.3)
      await storeSubscriptionData(data);
      console.log('[SubscriptionCache] Data fetched and stored in cache');

      return data;
    } catch (err) {
      // Log error internally (Requirement 8.4)
      console.error('[SubscriptionCache] Error in getSubscription:', {
        operation: 'get',
        error: err.message,
        timestamp: new Date().toISOString()
      });
      
      // Step 5: Return safe default on error (Requirement 3.4, 8.5, 8.6)
      // If we have cached data, return it; otherwise return UNKNOWN state
      // This ensures the UI doesn't break (Requirement 3.4)
      if (subscription) {
        console.log('[SubscriptionCache] Error occurred but returning existing cached data');
        return subscription;
      }
      
      console.log('[SubscriptionCache] Error occurred - returning UNKNOWN state');
      return UNKNOWN_SUBSCRIPTION_STATE;
    }
  }, [subscription, isCached]);

  /**
   * Check if subscription data is available in cache (synchronous)
   * Useful for components that want to check cache status without triggering a fetch
   * Implements Requirement 3.1 - Cache-first check
   */
  const hasCachedSubscription = useCallback(() => {
    return subscription !== null && isCached;
  }, [subscription, isCached]);

  /**
   * Get cached subscription data synchronously (no fetch)
   * Returns null if no cached data available
   * Implements Requirement 3.1 - Return cached data immediately
   */
  const getCachedSubscription = useCallback(() => {
    if (subscription && isCached) {
      return subscription;
    }
    return null;
  }, [subscription, isCached]);

  // Context value
  const value = {
    // Subscription Data (read-only, informational)
    subscription,
    isLoading,
    error,
    
    // Cache Status
    isCached,
    lastFetchedAt,
    
    // Actions
    refreshSubscription,
    clearCache,
    updateSubscriptionCache,
    getSubscription,
    
    // Cache-first helpers (Requirement 3.1)
    hasCachedSubscription,
    getCachedSubscription,
    
    // Cache staleness check (Requirement 10.3)
    isCacheStale: () => isCacheStale(lastFetchedAt),
    
    // Constants (for testing/debugging)
    UNKNOWN_SUBSCRIPTION_STATE,
    CACHE_STALE_THRESHOLD_MS
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

/**
 * Trigger subscription fetch after login (non-blocking)
 * Called by AuthContext after successful login
 * Implements Requirements 2.1, 2.5, 2.6 - Cache population after login
 * 
 * This function is non-blocking - it does not delay navigation or block post-login UI
 */
export const triggerSubscriptionFetchAfterLogin = () => {
  if (globalSubscriptionActions.refreshSubscription) {
    console.log('[SubscriptionCache] Triggering subscription fetch after login (non-blocking)');
    // Fire and forget - don't await, don't block navigation
    globalSubscriptionActions.refreshSubscription().catch(err => {
      // Log error but don't throw - this is non-blocking
      console.error('[SubscriptionCache] Background subscription fetch failed:', {
        operation: 'login-fetch',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
  } else {
    console.log('[SubscriptionCache] Subscription actions not yet registered');
  }
};

/**
 * Clear subscription cache on logout
 * Called by AuthContext during logout
 * Implements Requirements 7.1, 7.2 - Logout cleanup
 */
export const clearSubscriptionCacheOnLogout = async () => {
  if (globalSubscriptionActions.clearCache) {
    console.log('[SubscriptionCache] Clearing subscription cache on logout');
    try {
      await globalSubscriptionActions.clearCache();
      console.log('[SubscriptionCache] Subscription cache cleared successfully');
    } catch (err) {
      // Log error but don't throw - logout should still complete
      console.error('[SubscriptionCache] Error clearing subscription cache on logout:', {
        operation: 'logout-clear',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    // Fallback: Clear AsyncStorage directly if context not available
    console.log('[SubscriptionCache] Context not available, clearing AsyncStorage directly');
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_TIMESTAMP)
      ]);
      console.log('[SubscriptionCache] AsyncStorage cleared directly');
    } catch (err) {
      console.error('[SubscriptionCache] Error clearing AsyncStorage directly:', {
        operation: 'logout-clear-fallback',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};

/**
 * Register global subscription actions
 * Called internally by SubscriptionProvider to enable AuthContext integration
 */
export const registerSubscriptionActions = (actions) => {
  globalSubscriptionActions = {
    refreshSubscription: actions.refreshSubscription,
    clearCache: actions.clearCache
  };
  console.log('[SubscriptionCache] Global subscription actions registered');
};

/**
 * Unregister global subscription actions
 * Called when SubscriptionProvider unmounts
 */
export const unregisterSubscriptionActions = () => {
  globalSubscriptionActions = {
    refreshSubscription: null,
    clearCache: null
  };
  console.log('[SubscriptionCache] Global subscription actions unregistered');
};

// Export constants for external use
export { STORAGE_KEYS, UNKNOWN_SUBSCRIPTION_STATE, CACHE_STALE_THRESHOLD_MS };

export default SubscriptionContext;
