/**
 * StoreSettingsContext - Single cache owner for store settings data
 * 
 * Implements:
 * - Cache-first read strategy
 * - Write-through updates (backend first, NO offline writes)
 * - AsyncStorage persistence
 * - Request deduplication
 * - One-time migration from legacy keys
 * 
 * Settings managed (18 fields):
 * - Store Profile: store_name, store_address, store_website, business_type, gst_number, currency
 * - Payment: upi_id, upi_id_2, upi_id_3, payment_methods
 * - Tax: tax_settings (JSONB)
 * - Business: business_settings (JSONB)
 * - Receipt: receipt_settings (JSONB)
 * 
 * NOTE: store_phone and store_email are EXCLUDED - they come from AuthContext (user-bound)
 * 
 * CRITICAL RULES:
 * 1. NO offline writes - settings are compliance-critical
 * 2. Boolean handling: undefined !== false (use explicit checks)
 * 3. Write-through: backend first, cache second
 * 4. DB value > cache > defaults (only for new stores)
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Storage keys for store settings persistence
const STORAGE_KEYS = {
  STORE_SETTINGS: '@flowpos_store_settings',
  STORE_SETTINGS_TIMESTAMP: '@flowpos_store_settings_timestamp',
  MIGRATION_COMPLETE: '@flowpos_store_settings_migrated'
};

// Legacy AsyncStorage keys (for one-time migration)
const LEGACY_KEYS = {
  storeInfo: 'storeInfo',
  taxSettings: 'taxSettings',
  receiptSettings: 'receiptSettings',
  businessSettings: 'businessSettings'
};

// Cache staleness threshold (24 hours)
const CACHE_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Max retry attempts for failed fetches
const MAX_RETRY_ATTEMPTS = 3;

// Health check delay after login (10 seconds)
const HEALTH_CHECK_DELAY_MS = 10000;

// Global reference for actions (used by AuthContext integration)
let globalStoreSettingsActions = {
  refreshSettings: null,
  clearCache: null,
  getSetting: null,
  getSettings: null,
  getReceiptSettings: null,
  getTaxSettings: null,
  getStoreProfile: null,
  setLoginTimestamp: null // For health check tracking
};

// Create the context
const StoreSettingsContext = createContext(null);

/**
 * Hook to access store settings context
 * @returns {StoreSettingsContextValue} The store settings context value
 */
export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
};


/**
 * StoreSettingsProvider - Single cache owner for store settings data
 */
export const StoreSettingsProvider = ({ children }) => {
  // State
  const [storeSettings, setStoreSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  // Refs for request deduplication and lifecycle
  const inFlightPromiseRef = useRef(null);
  const mountedRef = useRef(true);
  const loginTimestampRef = useRef(null);
  const storeSettingsRef = useRef(storeSettings); // Ref for global access to latest settings
  const healthCheckTimeoutRef = useRef(null); // For health check timer
  const healthCheckRetryCountRef = useRef(0); // Track health check retry attempts

  // Keep ref in sync with state for global access
  useEffect(() => {
    storeSettingsRef.current = storeSettings;
  }, [storeSettings]);

  /**
   * Set login timestamp for health check tracking
   * Called from triggerStoreSettingsFetchAfterLogin
   */
  const setLoginTimestamp = useCallback(() => {
    loginTimestampRef.current = Date.now();
    healthCheckRetryCountRef.current = 0; // Reset retry count on new login
    // console.log('[StoreSettingsContext] Login timestamp set for health check');
  }, []);

  // Refs for functions to avoid stale closures in global actions
  const refreshSettingsRef = useRef(null);
  const clearCacheRef = useRef(null);

  // Load cached data on mount
  useEffect(() => {
    mountedRef.current = true;
    loadCachedData();
    
    return () => {
      mountedRef.current = false;
      unregisterStoreSettingsActions();
    };
  }, []);
  
  // Register global actions once on mount - uses refs to avoid stale closures
  useEffect(() => {
    registerStoreSettingsActions({
      refreshSettings: () => refreshSettingsRef.current?.(),
      clearCache: () => clearCacheRef.current?.(),
      getSetting: (key) => storeSettingsRef.current?.[key],
      getSettings: () => storeSettingsRef.current,
      getReceiptSettings: () => {
        const rs = storeSettingsRef.current?.receipt_settings;
        return {
          showAddress: rs?.showAddress !== undefined ? rs.showAddress : true,
          showPhone: rs?.showPhone !== undefined ? rs.showPhone : true,
          showEmail: rs?.showEmail !== undefined ? rs.showEmail : false,
          showGST: rs?.showGST !== undefined ? rs.showGST : true
        };
      },
      getTaxSettings: () => {
        const ts = storeSettingsRef.current?.tax_settings;
        return {
          enableGST: ts?.enableGST !== undefined ? ts.enableGST : false,
          gstRate: ts?.gstRate !== undefined ? ts.gstRate : 18,
          includeTaxInPrice: ts?.includeTaxInPrice !== undefined ? ts.includeTaxInPrice : false
        };
      },
      getStoreProfile: () => {
        const ss = storeSettingsRef.current;
        return {
          store_name: ss?.store_name || '',
          store_address: ss?.store_address || '',
          store_website: ss?.store_website || '',
          business_type: ss?.business_type || '',
          gst_number: ss?.gst_number || '',
          currency: ss?.currency || 'INR'
        };
      },
      setLoginTimestamp
    });
  }, [setLoginTimestamp]); // Only setLoginTimestamp is stable (useCallback with [])

  // Health check: detect empty settings after login
  // Runs 10 seconds after login timestamp is set
  // Tracks retry count and logs warnings at max retries
  useEffect(() => {
    // Clear any existing health check timeout
    if (healthCheckTimeoutRef.current) {
      clearTimeout(healthCheckTimeoutRef.current);
      healthCheckTimeoutRef.current = null;
    }

    // Only run health check if login timestamp is set
    if (!loginTimestampRef.current) {
      return;
    }

    // If settings are loaded successfully, clear login timestamp (health check passed)
    if (storeSettings && Object.keys(storeSettings).length > 0) {
      // console.log('[StoreSettingsContext] Health check passed - settings loaded successfully');
      loginTimestampRef.current = null;
      healthCheckRetryCountRef.current = 0;
      return;
    }

    // If still loading, wait for loading to complete
    if (isLoading) {
      return;
    }

    // Calculate time since login
    const timeSinceLogin = Date.now() - loginTimestampRef.current;
    
    // If less than 10 seconds since login, schedule health check
    if (timeSinceLogin < HEALTH_CHECK_DELAY_MS) {
      const remainingTime = HEALTH_CHECK_DELAY_MS - timeSinceLogin;
      // console.log(`[StoreSettingsContext] Scheduling health check in ${remainingTime}ms`);
      
      healthCheckTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        
        // Re-check if settings are still empty
        if (!storeSettingsRef.current || Object.keys(storeSettingsRef.current).length === 0) {
          healthCheckRetryCountRef.current += 1;
          const currentRetryCount = healthCheckRetryCountRef.current;
          
          console.error(`[StoreSettingsContext] Health check FAILED - Settings still empty ${HEALTH_CHECK_DELAY_MS / 1000}s after login (attempt ${currentRetryCount}/${MAX_RETRY_ATTEMPTS})`);
          
          if (currentRetryCount >= MAX_RETRY_ATTEMPTS) {
            console.warn('[StoreSettingsContext] Health check: Max retries reached. Settings may not be available. User may need to re-login or check network connection.');
            // Clear login timestamp to stop further health checks
            loginTimestampRef.current = null;
          } else {
            // Use ref to avoid dependency on refreshSettings
            refreshSettingsRef.current?.().catch(err => {
              console.error('[StoreSettingsContext] Health check refetch failed:', err.message);
            });
          }
        } else {
          // console.log('[StoreSettingsContext] Health check passed - settings loaded');
          loginTimestampRef.current = null;
          healthCheckRetryCountRef.current = 0;
        }
      }, remainingTime);
    } else {
      // Already past 10 seconds - run health check immediately
      healthCheckRetryCountRef.current += 1;
      const currentRetryCount = healthCheckRetryCountRef.current;
      
      console.error(`[StoreSettingsContext] Health check FAILED - Settings still empty after ${Math.round(timeSinceLogin / 1000)}s (attempt ${currentRetryCount}/${MAX_RETRY_ATTEMPTS})`);
      
      if (currentRetryCount >= MAX_RETRY_ATTEMPTS) {
        console.warn('[StoreSettingsContext] Health check: Max retries reached. Settings may not be available. User may need to re-login or check network connection.');
        loginTimestampRef.current = null;
      } else {
        // Use ref to avoid dependency on refreshSettings
        refreshSettingsRef.current?.().catch(err => {
          console.error('[StoreSettingsContext] Health check refetch failed:', err.message);
        });
      }
    }

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (healthCheckTimeoutRef.current) {
        clearTimeout(healthCheckTimeoutRef.current);
        healthCheckTimeoutRef.current = null;
      }
    };
  }, [isLoading, storeSettings]); // Removed refreshSettings - use ref instead

  /**
   * Check if cached data is stale
   */
  const isCacheStale = useCallback((timestamp) => {
    if (!timestamp) return true;
    return (Date.now() - timestamp) > CACHE_STALE_THRESHOLD_MS;
  }, []);

  /**
   * Load store settings from AsyncStorage on app start
   * Also triggers one-time migration check for legacy keys
   */
  const loadCachedData = async () => {
    try {
      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.STORE_SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.STORE_SETTINGS_TIMESTAMP)
      ]);

      if (cachedData && mountedRef.current) {
        try {
          const parsedData = JSON.parse(cachedData);
          const timestamp = cachedTimestamp ? parseInt(cachedTimestamp, 10) : null;
          
          setStoreSettings(parsedData);
          setIsCached(true);
          setLastFetchedAt(timestamp);
          setIsLoading(false);
          // console.log('[StoreSettingsContext] Loaded cached data from AsyncStorage');
          
          // Trigger background refresh if stale
          if (isCacheStale(timestamp)) {
            setTimeout(() => {
              if (mountedRef.current) {
                // console.log('[StoreSettingsContext] Cache stale, triggering background refresh');
                refreshSettings().catch(err => {
                  console.error('[StoreSettingsContext] Background refresh failed:', err.message);
                });
              }
            }, 100);
          }
        } catch (parseError) {
          // Cache corrupted - clear and continue
          console.error('[StoreSettingsContext] Cache corrupted, clearing:', parseError.message);
          await AsyncStorage.removeItem(STORAGE_KEYS.STORE_SETTINGS);
          await AsyncStorage.removeItem(STORAGE_KEYS.STORE_SETTINGS_TIMESTAMP);
          if (mountedRef.current) {
            setStoreSettings(null);
            setIsLoading(false);
          }
        }
      } else if (mountedRef.current) {
        // No cached data - settings remain null (no defaults applied)
        setStoreSettings(null);
        setIsLoading(false);
        // console.log('[StoreSettingsContext] No cached data available');
      }
      
      // Check for legacy data migration (runs in background, non-blocking)
      // This ensures migration happens even if user already has DB data
      checkAndPerformLegacyMigration();
      
    } catch (err) {
      console.error('[StoreSettingsContext] Error loading cached data:', err.message);
      if (mountedRef.current) {
        setStoreSettings(null);
        setIsLoading(false);
      }
    }
  };
  
  /**
   * Check for and perform legacy data migration on app startup
   * This runs independently of the DB fetch to ensure legacy data is migrated
   * even for users who already have data in the database
   */
  const checkAndPerformLegacyMigration = async () => {
    try {
      // Check if migration already completed
      const migrationComplete = await AsyncStorage.getItem(STORAGE_KEYS.MIGRATION_COMPLETE);
      if (migrationComplete === 'true') {
        // console.log('[StoreSettingsContext] Legacy migration already completed');
        return;
      }
      
      // Check if any legacy data exists
      const [storeInfo, taxSettings, receiptSettings, businessSettings] = await Promise.all([
        AsyncStorage.getItem(LEGACY_KEYS.storeInfo),
        AsyncStorage.getItem(LEGACY_KEYS.taxSettings),
        AsyncStorage.getItem(LEGACY_KEYS.receiptSettings),
        AsyncStorage.getItem(LEGACY_KEYS.businessSettings)
      ]);
      
      if (!storeInfo && !taxSettings && !receiptSettings && !businessSettings) {
        // console.log('[StoreSettingsContext] No legacy data found, marking migration complete');
        await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETE, 'true');
        return;
      }
      
      // console.log('[StoreSettingsContext] Legacy data found, will migrate on next backend fetch');
      // Migration will be performed in fetchSettingsFromBackend when token is available
      
    } catch (err) {
      console.error('[StoreSettingsContext] Error checking legacy migration:', err.message);
    }
  };

  /**
   * Store settings in both memory and AsyncStorage
   */
  const storeSettingsData = async (data) => {
    const timestamp = Date.now();
    
    if (mountedRef.current) {
      setStoreSettings(data);
      setIsCached(true);
      setLastFetchedAt(timestamp);
      setError(null);
    }

    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.STORE_SETTINGS, JSON.stringify(data)),
        AsyncStorage.setItem(STORAGE_KEYS.STORE_SETTINGS_TIMESTAMP, timestamp.toString())
      ]);
      // console.log('[StoreSettingsContext] Data stored in AsyncStorage');
    } catch (err) {
      console.error('[StoreSettingsContext] Error storing to AsyncStorage:', err.message);
    }
  };


  /**
   * Fetch store settings from backend API
   * Includes one-time migration check for existing users
   */
  const fetchSettingsFromBackend = async (token) => {
    if (inFlightPromiseRef.current) {
      // console.log('[StoreSettingsContext] Returning in-flight promise (deduplication)');
      return inFlightPromiseRef.current;
    }

    const fetchPromise = (async () => {
      try {
        const { apiCallWithFallback } = require('../config/apiConfig');
        
        const response = await apiCallWithFallback('/store', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('[StoreSettingsContext] Error parsing API response:', parseError.message);
          return null;
        }

        if (!response.ok) {
          console.error('[StoreSettingsContext] API returned error:', data.message || 'Unknown error');
          throw new Error(data.message || 'Failed to fetch store data');
        }

        // Extract store data from response
        const storeData = data.store || data;
        
        // Transform backend response to context format
        // NOTE: Excludes store_phone and store_email (auth-bound)
        const settings = {
          // Store Profile (6 fields)
          store_name: storeData?.store_name || '',
          store_address: storeData?.store_address || '',
          store_website: storeData?.store_website || '',
          business_type: storeData?.business_type || '',
          gst_number: storeData?.gst_number || '',
          currency: storeData?.currency || 'INR',
          
          // Payment Settings (4 fields)
          upi_id: storeData?.upi_id || '',
          upi_id_2: storeData?.upi_id_2 || '',
          upi_id_3: storeData?.upi_id_3 || '',
          payment_methods: storeData?.payment_methods || ['Cash', 'QR Pay'],
          
          // JSONB Settings (preserve as objects)
          tax_settings: storeData?.tax_settings || null,
          receipt_settings: storeData?.receipt_settings || null,
          business_settings: storeData?.business_settings || null
        };
        
        // Always check for legacy migration (handles both new users and existing users with legacy data)
        // Pass existing DB data so migration can merge properly (DB takes precedence)
        const hasDbData = storeData && Object.keys(storeData).length > 0;
        const migratedSettings = await performOneTimeMigration(token, hasDbData ? settings : null);
        
        // If migration returned data, use it (it's already merged with DB data)
        if (migratedSettings) {
          // console.log('[StoreSettingsContext] Using migrated settings');
          return migratedSettings;
        }
        
        return settings;
      } catch (networkError) {
        console.error('[StoreSettingsContext] Network error:', networkError.message);
        throw networkError;
      } finally {
        inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = fetchPromise;
    return fetchPromise;
  };

  /**
   * Refresh store settings from backend (non-blocking)
   */
  const refreshSettings = useCallback(async () => {
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      let token;
      try {
        token = await AsyncStorage.getItem('accessToken');
      } catch (storageError) {
        console.error('[StoreSettingsContext] Error reading auth token:', storageError.message);
        token = null;
      }
      
      if (!token) {
        // console.log('[StoreSettingsContext] No auth token available');
        if (mountedRef.current) {
          setIsLoading(false);
        }
        return;
      }

      const data = await fetchSettingsFromBackend(token);
      
      // Store in cache (empty object {} if null to distinguish from "not loaded")
      const settingsToStore = data === null ? {} : data;
      await storeSettingsData(settingsToStore);
      
      // console.log('[StoreSettingsContext] Settings refreshed successfully');
    } catch (err) {
      console.error('[StoreSettingsContext] Error refreshing settings:', err.message);
      
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Update store settings with write-through pattern
   * 
   * CRITICAL: NO OFFLINE WRITES - Settings are compliance-critical
   * 
   * Flow:
   * 1. Check network availability FIRST
   * 2. Send update to backend
   * 3. On success: update local cache
   * 4. On failure: return error, NO cache update, NO offline queue
   * 
   * @param {Object} updates - Partial store settings to update
   * @returns {Promise<{success: boolean, error?: string, message?: string}>}
   */
  const updateStoreSettings = useCallback(async (updates) => {
    // console.log('[StoreSettingsContext] updateStoreSettings called with:', Object.keys(updates));

    // STEP 0: Network guard - HARD FAIL when offline
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.error('[StoreSettingsContext] No network - blocking write');
        return { 
          success: false, 
          error: 'NO_NETWORK', 
          message: 'Network connection required to save settings. Please check your connection and try again.' 
        };
      }
    } catch (netError) {
      console.error('[StoreSettingsContext] Network check failed:', netError.message);
      return { 
        success: false, 
        error: 'NETWORK_CHECK_FAILED', 
        message: 'Unable to verify network connection. Please try again.' 
      };
    }

    // STEP 1: Get auth token
    let token;
    try {
      token = await AsyncStorage.getItem('accessToken');
    } catch (storageError) {
      console.error('[StoreSettingsContext] Error reading auth token:', storageError.message);
      return { 
        success: false, 
        error: 'AUTH_ERROR', 
        message: 'Authentication error. Please log in again.' 
      };
    }

    if (!token) {
      console.error('[StoreSettingsContext] No auth token available for write');
      return { 
        success: false, 
        error: 'NO_AUTH', 
        message: 'Not authenticated. Please log in again.' 
      };
    }

    // STEP 2: Send to backend FIRST (write-through)
    try {
      const { apiCallWithFallback } = require('../config/apiConfig');
      
      // console.log('[StoreSettingsContext] Sending update to backend...');
      const response = await apiCallWithFallback('/store', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[StoreSettingsContext] Error parsing API response:', parseError.message);
        return { 
          success: false, 
          error: 'PARSE_ERROR', 
          message: 'Invalid response from server. Please try again.' 
        };
      }

      if (!response.ok) {
        // Backend failed - DO NOT update cache
        console.error('[StoreSettingsContext] Backend update failed:', data.message || 'Unknown error');
        return { 
          success: false, 
          error: 'BACKEND_ERROR', 
          message: data.message || 'Failed to save settings. Please try again.' 
        };
      }

      // STEP 3: Backend succeeded - NOW update cache
      // console.log('[StoreSettingsContext] Backend update successful, updating cache...');
      
      // Merge updates with existing settings
      const newSettings = { ...storeSettings, ...updates };
      await storeSettingsData(newSettings);
      
      // console.log('[StoreSettingsContext] Settings updated successfully');
      return { success: true };

    } catch (networkError) {
      // Network/other error - DO NOT update cache, NO OFFLINE QUEUE
      console.error('[StoreSettingsContext] Write failed:', networkError.message);
      return { 
        success: false, 
        error: 'NETWORK_ERROR', 
        message: networkError.message || 'Network error. Please check your connection and try again.' 
      };
    }
  }, [storeSettings]);

  /**
   * Update tax settings specifically (convenience wrapper)
   * @param {Object} taxUpdates - Partial tax settings to update
   * @returns {Promise<{success: boolean, error?: string, message?: string}>}
   */
  const updateTaxSettings = useCallback(async (taxUpdates) => {
    const currentTaxSettings = storeSettings?.tax_settings || {};
    const mergedTaxSettings = { ...currentTaxSettings, ...taxUpdates };
    return updateStoreSettings({ tax_settings: mergedTaxSettings });
  }, [storeSettings, updateStoreSettings]);

  /**
   * Update receipt settings specifically (convenience wrapper)
   * @param {Object} receiptUpdates - Partial receipt settings to update
   * @returns {Promise<{success: boolean, error?: string, message?: string}>}
   */
  const updateReceiptSettings = useCallback(async (receiptUpdates) => {
    const currentReceiptSettings = storeSettings?.receipt_settings || {};
    const mergedReceiptSettings = { ...currentReceiptSettings, ...receiptUpdates };
    return updateStoreSettings({ receipt_settings: mergedReceiptSettings });
  }, [storeSettings, updateStoreSettings]);

  /**
   * Update business settings specifically (convenience wrapper)
   * @param {Object} businessUpdates - Partial business settings to update
   * @returns {Promise<{success: boolean, error?: string, message?: string}>}
   */
  const updateBusinessSettings = useCallback(async (businessUpdates) => {
    const currentBusinessSettings = storeSettings?.business_settings || {};
    const mergedBusinessSettings = { ...currentBusinessSettings, ...businessUpdates };
    return updateStoreSettings({ business_settings: mergedBusinessSettings });
  }, [storeSettings, updateStoreSettings]);

  /**
   * Clear cache on logout
   */
  const clearCache = useCallback(async () => {
    // console.log('[StoreSettingsContext] Clearing cache...');
    
    // Clear health check state
    if (healthCheckTimeoutRef.current) {
      clearTimeout(healthCheckTimeoutRef.current);
      healthCheckTimeoutRef.current = null;
    }
    loginTimestampRef.current = null;
    healthCheckRetryCountRef.current = 0;
    
    if (mountedRef.current) {
      setStoreSettings(null);
      setIsCached(false);
      setLastFetchedAt(null);
      setError(null);
    }

    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.STORE_SETTINGS),
        AsyncStorage.removeItem(STORAGE_KEYS.STORE_SETTINGS_TIMESTAMP)
      ]);
      // console.log('[StoreSettingsContext] Cache cleared from AsyncStorage');
    } catch (err) {
      console.error('[StoreSettingsContext] Error clearing cache:', err.message);
    }
  }, []);

  // Keep function refs in sync for global actions
  useEffect(() => {
    refreshSettingsRef.current = refreshSettings;
    clearCacheRef.current = clearCache;
  }, [refreshSettings, clearCache]);

  /**
   * Get a single setting value from cache
   * @param {string} key - The setting key to retrieve
   * @returns {any} The setting value or undefined
   */
  const getSetting = useCallback((key) => {
    if (!storeSettings) return undefined;
    return storeSettings[key];
  }, [storeSettings]);

  // ============================================================================
  // GETTER FUNCTIONS WITH PROPER BOOLEAN HANDLING
  // ============================================================================
  // CRITICAL: Boolean handling rule - undefined !== false
  // ✅ CORRECT: value !== undefined ? value : defaultValue
  // ❌ FORBIDDEN: value || defaultValue (treats false as undefined)
  // ============================================================================

  /**
   * Get store profile settings (6 fields)
   * NOTE: Excludes store_phone and store_email (auth-bound, from AuthContext)
   * 
   * @returns {Object} Store profile with defaults for missing values
   */
  const getStoreProfile = useCallback(() => {
    const ss = storeSettings;
    return {
      store_name: ss?.store_name || '',
      store_address: ss?.store_address || '',
      store_website: ss?.store_website || '',
      business_type: ss?.business_type || '',
      gst_number: ss?.gst_number || '',
      currency: ss?.currency || 'INR'
    };
  }, [storeSettings]);

  /**
   * Get payment settings (UPI IDs and payment methods)
   * 
   * @returns {Object} Payment settings with defaults
   */
  const getPaymentSettings = useCallback(() => {
    const ss = storeSettings;
    return {
      upi_id: ss?.upi_id || '',
      upi_id_2: ss?.upi_id_2 || '',
      upi_id_3: ss?.upi_id_3 || '',
      payment_methods: ss?.payment_methods || ['Cash', 'QR Pay']
    };
  }, [storeSettings]);

  /**
   * Get tax settings with proper boolean handling
   * 
   * CRITICAL: Uses !== undefined checks for booleans
   * - enableGST: defaults to false (opt-in feature)
   * - includeTaxInPrice: defaults to false (explicit tax display)
   * - gstRate: defaults to 18 (standard GST rate in India)
   * 
   * @returns {Object} Tax settings with proper defaults
   */
  const getTaxSettings = useCallback(() => {
    const ts = storeSettings?.tax_settings;
    return {
      // Boolean: use !== undefined check, NOT || operator
      enableGST: ts?.enableGST !== undefined ? ts.enableGST : false,
      // Number: use !== undefined check for 0 to be valid
      gstRate: ts?.gstRate !== undefined ? ts.gstRate : 18,
      // Boolean: use !== undefined check
      includeTaxInPrice: ts?.includeTaxInPrice !== undefined ? ts.includeTaxInPrice : false
    };
  }, [storeSettings]);

  /**
   * Get receipt settings with proper boolean handling
   * 
   * CRITICAL: Uses !== undefined checks for booleans
   * - showAddress: defaults to true (common to show)
   * - showPhone: defaults to true (common to show)
   * - showEmail: defaults to false (less common)
   * - showGST: defaults to true (compliance requirement)
   * 
   * @returns {Object} Receipt settings with proper defaults
   */
  const getReceiptSettings = useCallback(() => {
    const rs = storeSettings?.receipt_settings;
    return {
      // Boolean: use !== undefined check, NOT || operator
      showAddress: rs?.showAddress !== undefined ? rs.showAddress : true,
      showPhone: rs?.showPhone !== undefined ? rs.showPhone : true,
      showEmail: rs?.showEmail !== undefined ? rs.showEmail : false,
      showGST: rs?.showGST !== undefined ? rs.showGST : true
    };
  }, [storeSettings]);

  /**
   * Get business settings with proper boolean/number handling
   * 
   * CRITICAL: Uses !== undefined checks
   * - lowStockThreshold: defaults to 10 (reasonable threshold)
   * - enableNotifications: defaults to true (opt-out feature)
   * 
   * @returns {Object} Business settings with proper defaults
   */
  const getBusinessSettings = useCallback(() => {
    const bs = storeSettings?.business_settings;
    return {
      // Number: use !== undefined check for 0 to be valid
      lowStockThreshold: bs?.lowStockThreshold !== undefined ? bs.lowStockThreshold : 10,
      // Boolean: use !== undefined check
      enableNotifications: bs?.enableNotifications !== undefined ? bs.enableNotifications : true
    };
  }, [storeSettings]);

  /**
   * Perform one-time migration from legacy AsyncStorage keys
   * Only runs once per user (checks MIGRATION_COMPLETE flag)
   * 
   * Migration Strategy:
   * 1. Check if migration already completed (flag check)
   * 2. Read all legacy AsyncStorage keys
   * 3. If no legacy data exists, mark complete and return
   * 4. Merge legacy data with existing DB data (DB takes precedence)
   * 5. Persist merged data to backend
   * 6. Set migration complete flag
   * 7. Clear legacy keys
   * 
   * @param {string} token - Auth token for API calls
   * @param {Object|null} existingDbData - Existing data from database (if any)
   * @returns {Object|null} Migrated settings or null if no migration needed
   */
  const performOneTimeMigration = async (token, existingDbData = null) => {
    try {
      // Check if migration already completed
      const migrationComplete = await AsyncStorage.getItem(STORAGE_KEYS.MIGRATION_COMPLETE);
      if (migrationComplete === 'true') {
        // console.log('[StoreSettingsContext] Migration already completed, skipping');
        return null;
      }

      // console.log('[StoreSettingsContext] Checking for legacy data to migrate...');

      // Read legacy keys
      const [storeInfo, taxSettings, receiptSettings, businessSettings] = await Promise.all([
        AsyncStorage.getItem(LEGACY_KEYS.storeInfo),
        AsyncStorage.getItem(LEGACY_KEYS.taxSettings),
        AsyncStorage.getItem(LEGACY_KEYS.receiptSettings),
        AsyncStorage.getItem(LEGACY_KEYS.businessSettings)
      ]);

      // Check if any legacy data exists
      if (!storeInfo && !taxSettings && !receiptSettings && !businessSettings) {
        // console.log('[StoreSettingsContext] No legacy data found');
        await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETE, 'true');
        return null;
      }

      // console.log('[StoreSettingsContext] Found legacy data, migrating...');
      // console.log('[StoreSettingsContext] Legacy keys found:', {
      //   storeInfo: !!storeInfo,
      //   taxSettings: !!taxSettings,
      //   receiptSettings: !!receiptSettings,
      //   businessSettings: !!businessSettings
      // });

      // Parse legacy data safely
      let parsedStoreInfo = {};
      let parsedTaxSettings = null;
      let parsedReceiptSettings = null;
      let parsedBusinessSettings = null;
      
      try {
        if (storeInfo) parsedStoreInfo = JSON.parse(storeInfo);
      } catch (e) {
        console.warn('[StoreSettingsContext] Failed to parse legacy storeInfo:', e.message);
      }
      
      try {
        if (taxSettings) parsedTaxSettings = JSON.parse(taxSettings);
      } catch (e) {
        console.warn('[StoreSettingsContext] Failed to parse legacy taxSettings:', e.message);
      }
      
      try {
        if (receiptSettings) parsedReceiptSettings = JSON.parse(receiptSettings);
      } catch (e) {
        console.warn('[StoreSettingsContext] Failed to parse legacy receiptSettings:', e.message);
      }
      
      try {
        if (businessSettings) parsedBusinessSettings = JSON.parse(businessSettings);
      } catch (e) {
        console.warn('[StoreSettingsContext] Failed to parse legacy businessSettings:', e.message);
      }

      // Build legacy settings object (exclude phone/email - they're auth-bound)
      // Support both snake_case and camelCase field names from legacy data
      const legacySettings = {
        store_name: parsedStoreInfo.store_name || parsedStoreInfo.storeName || '',
        store_address: parsedStoreInfo.store_address || parsedStoreInfo.storeAddress || '',
        store_website: parsedStoreInfo.store_website || parsedStoreInfo.storeWebsite || '',
        business_type: parsedStoreInfo.business_type || parsedStoreInfo.businessType || '',
        gst_number: parsedStoreInfo.gst_number || parsedStoreInfo.gstNumber || '',
        currency: parsedStoreInfo.currency || 'INR',
        upi_id: parsedStoreInfo.upi_id || parsedStoreInfo.upiId || '',
        upi_id_2: parsedStoreInfo.upi_id_2 || parsedStoreInfo.upiId2 || '',
        upi_id_3: parsedStoreInfo.upi_id_3 || parsedStoreInfo.upiId3 || '',
        payment_methods: parsedStoreInfo.payment_methods || parsedStoreInfo.paymentMethods || ['Cash', 'QR Pay'],
        tax_settings: parsedTaxSettings,
        receipt_settings: parsedReceiptSettings,
        business_settings: parsedBusinessSettings
      };

      // Merge with existing DB data (DB takes precedence)
      // Only use legacy value if DB value is empty/null/undefined
      const mergedSettings = {};
      
      if (existingDbData) {
        // console.log('[StoreSettingsContext] Merging legacy data with existing DB data (DB takes precedence)');
        
        // For string fields: use DB value if non-empty, otherwise legacy
        mergedSettings.store_name = existingDbData.store_name || legacySettings.store_name;
        mergedSettings.store_address = existingDbData.store_address || legacySettings.store_address;
        mergedSettings.store_website = existingDbData.store_website || legacySettings.store_website;
        mergedSettings.business_type = existingDbData.business_type || legacySettings.business_type;
        mergedSettings.gst_number = existingDbData.gst_number || legacySettings.gst_number;
        mergedSettings.currency = existingDbData.currency || legacySettings.currency;
        mergedSettings.upi_id = existingDbData.upi_id || legacySettings.upi_id;
        mergedSettings.upi_id_2 = existingDbData.upi_id_2 || legacySettings.upi_id_2;
        mergedSettings.upi_id_3 = existingDbData.upi_id_3 || legacySettings.upi_id_3;
        
        // For arrays: use DB value if non-empty array, otherwise legacy
        mergedSettings.payment_methods = (existingDbData.payment_methods && existingDbData.payment_methods.length > 0) 
          ? existingDbData.payment_methods 
          : legacySettings.payment_methods;
        
        // For JSONB objects: use DB value if exists, otherwise legacy
        mergedSettings.tax_settings = existingDbData.tax_settings || legacySettings.tax_settings;
        mergedSettings.receipt_settings = existingDbData.receipt_settings || legacySettings.receipt_settings;
        mergedSettings.business_settings = existingDbData.business_settings || legacySettings.business_settings;
      } else {
        // No DB data - use all legacy settings
        Object.assign(mergedSettings, legacySettings);
      }

      // Check if there's anything to persist (any non-empty values)
      const hasDataToPersist = Object.values(mergedSettings).some(value => {
        if (value === null || value === undefined || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      });

      if (!hasDataToPersist) {
        // console.log('[StoreSettingsContext] No meaningful data to migrate');
        await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETE, 'true');
        return null;
      }

      // Persist to backend
      const { apiCallWithFallback } = require('../config/apiConfig');
      // console.log('[StoreSettingsContext] Persisting migrated settings to backend...');
      
      const response = await apiCallWithFallback('/store', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(mergedSettings)
      });

      if (response.ok) {
        // console.log('[StoreSettingsContext] Migration persisted to backend successfully');
        
        // Set migration flag
        await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETE, 'true');
        
        // Clear legacy keys
        await Promise.all([
          AsyncStorage.removeItem(LEGACY_KEYS.storeInfo),
          AsyncStorage.removeItem(LEGACY_KEYS.taxSettings),
          AsyncStorage.removeItem(LEGACY_KEYS.receiptSettings),
          AsyncStorage.removeItem(LEGACY_KEYS.businessSettings)
        ]);
        
        // console.log('[StoreSettingsContext] Legacy keys cleared after successful migration');
        return mergedSettings;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[StoreSettingsContext] Migration backend persist failed:', errorData.message || 'Unknown error');
        // Don't set migration flag - will retry on next app start
        return null;
      }
    } catch (err) {
      console.error('[StoreSettingsContext] Migration error:', err.message);
      // Don't set migration flag - will retry on next app start
      return null;
    }
  };

  // Register global actions for non-React code
  const registerStoreSettingsActions = (actions) => {
    globalStoreSettingsActions = { ...globalStoreSettingsActions, ...actions };
  };

  const unregisterStoreSettingsActions = () => {
    globalStoreSettingsActions = {
      refreshSettings: null,
      clearCache: null,
      getSetting: null,
      getSettings: null,
      getReceiptSettings: null,
      getTaxSettings: null,
      getStoreProfile: null,
      setLoginTimestamp: null
    };
  };

  // Context value
  const contextValue = {
    // Data
    storeSettings,
    isLoading,
    error,
    isCached,
    lastFetchedAt,
    
    // Read helpers (with proper boolean handling)
    getStoreProfile,
    getPaymentSettings,
    getTaxSettings,
    getReceiptSettings,
    getBusinessSettings,
    
    // Write actions (write-through, NO offline)
    updateStoreSettings,
    updateTaxSettings,
    updateReceiptSettings,
    updateBusinessSettings,
    
    // Cache management
    refreshSettings,
    clearCache,
    isCacheStale: () => isCacheStale(lastFetchedAt),
    
    // Utility
    getSetting
  };

  return (
    <StoreSettingsContext.Provider value={contextValue}>
      {children}
    </StoreSettingsContext.Provider>
  );
};

// ============================================================================
// GLOBAL EXPORTS FOR NON-REACT CODE (Services)
// ============================================================================

/**
 * Trigger store settings fetch after login (called from AuthContext)
 * Non-blocking - does not wait for completion
 * Also sets login timestamp for health check monitoring
 */
export const triggerStoreSettingsFetchAfterLogin = () => {
  // console.log('[StoreSettingsContext] triggerStoreSettingsFetchAfterLogin called');
  
  // Set login timestamp for health check (10s after login)
  if (globalStoreSettingsActions.setLoginTimestamp) {
    globalStoreSettingsActions.setLoginTimestamp();
  } else {
    // console.warn('[StoreSettingsContext] setLoginTimestamp not registered yet');
  }
  
  if (globalStoreSettingsActions.refreshSettings) {
    globalStoreSettingsActions.refreshSettings().catch(err => {
      console.error('[StoreSettingsContext] Post-login fetch failed:', err.message);
    });
  } else {
    // console.warn('[StoreSettingsContext] refreshSettings not registered yet');
  }
};

/**
 * Clear store settings cache on logout (called from AuthContext)
 * @returns {Promise<void>}
 */
export const clearStoreSettingsCacheOnLogout = async () => {
  // console.log('[StoreSettingsContext] clearStoreSettingsCacheOnLogout called');
  if (globalStoreSettingsActions.clearCache) {
    await globalStoreSettingsActions.clearCache();
  } else {
    // console.warn('[StoreSettingsContext] clearCache not registered yet');
    // Fallback: clear AsyncStorage directly
    try {
      await AsyncStorage.removeItem('@flowpos_store_settings');
      await AsyncStorage.removeItem('@flowpos_store_settings_timestamp');
    } catch (err) {
      console.error('[StoreSettingsContext] Fallback cache clear failed:', err.message);
    }
  }
};

/**
 * Get a single setting from cache (for non-React code)
 * @param {string} key - The setting key to retrieve
 * @returns {any} The setting value or undefined
 */
export const getStoreSettingFromCache = (key) => {
  if (globalStoreSettingsActions.getSetting) {
    return globalStoreSettingsActions.getSetting(key);
  }
  // console.warn('[StoreSettingsContext] getSetting not registered yet');
  return undefined;
};

/**
 * Get all settings from cache (for non-React code)
 * @returns {Object|null} The store settings or null
 */
export const getStoreSettingsFromCache = () => {
  if (globalStoreSettingsActions.getSettings) {
    return globalStoreSettingsActions.getSettings();
  }
  // console.warn('[StoreSettingsContext] getSettings not registered yet');
  return null;
};

/**
 * Get receipt settings from cache with proper boolean handling (for non-React code)
 * 
 * CRITICAL: Uses !== undefined checks for booleans
 * - showAddress: defaults to true (common to show)
 * - showPhone: defaults to true (common to show)
 * - showEmail: defaults to false (less common)
 * - showGST: defaults to true (compliance requirement)
 * 
 * @returns {Object} Receipt settings with proper defaults
 */
export const getReceiptSettingsFromCache = () => {
  // Try to use the registered getReceiptSettings function first (has proper boolean handling)
  if (globalStoreSettingsActions.getReceiptSettings) {
    return globalStoreSettingsActions.getReceiptSettings();
  }
  
  // Fallback: Apply proper boolean handling manually if context not registered yet
  // console.warn('[StoreSettingsContext] getReceiptSettings not registered yet, using fallback');
  const storeSettings = globalStoreSettingsActions.getSettings ? globalStoreSettingsActions.getSettings() : null;
  const rs = storeSettings?.receipt_settings;
  
  return {
    // Boolean: use !== undefined check, NOT || operator
    showAddress: rs?.showAddress !== undefined ? rs.showAddress : true,
    showPhone: rs?.showPhone !== undefined ? rs.showPhone : true,
    showEmail: rs?.showEmail !== undefined ? rs.showEmail : false,
    showGST: rs?.showGST !== undefined ? rs.showGST : true
  };
};

/**
 * Get tax settings from cache with proper boolean handling (for non-React code)
 * 
 * CRITICAL: Uses !== undefined checks for booleans
 * - enableGST: defaults to false (opt-in feature)
 * - includeTaxInPrice: defaults to false (explicit tax display)
 * - gstRate: defaults to 18 (standard GST rate in India)
 * 
 * @returns {Object} Tax settings with proper defaults
 */
export const getTaxSettingsFromCache = () => {
  // Try to use the registered getTaxSettings function first (has proper boolean handling)
  if (globalStoreSettingsActions.getTaxSettings) {
    return globalStoreSettingsActions.getTaxSettings();
  }
  
  // Fallback: Apply proper boolean handling manually if context not registered yet
  // console.warn('[StoreSettingsContext] getTaxSettings not registered yet, using fallback');
  const storeSettings = globalStoreSettingsActions.getSettings ? globalStoreSettingsActions.getSettings() : null;
  const ts = storeSettings?.tax_settings;
  
  return {
    // Boolean: use !== undefined check, NOT || operator
    enableGST: ts?.enableGST !== undefined ? ts.enableGST : false,
    // Number: use !== undefined check for 0 to be valid
    gstRate: ts?.gstRate !== undefined ? ts.gstRate : 18,
    // Boolean: use !== undefined check
    includeTaxInPrice: ts?.includeTaxInPrice !== undefined ? ts.includeTaxInPrice : false
  };
};

/**
 * Get store profile from cache (for non-React code)
 * NOTE: Excludes store_phone and store_email (auth-bound, from AuthContext)
 * 
 * @returns {Object} Store profile with defaults for missing values
 */
export const getStoreProfileFromCache = () => {
  // Try to use the registered getStoreProfile function first
  if (globalStoreSettingsActions.getStoreProfile) {
    return globalStoreSettingsActions.getStoreProfile();
  }
  
  // Fallback: Apply defaults manually if context not registered yet
  // console.warn('[StoreSettingsContext] getStoreProfile not registered yet, using fallback');
  const storeSettings = globalStoreSettingsActions.getSettings ? globalStoreSettingsActions.getSettings() : null;
  
  return {
    store_name: storeSettings?.store_name || '',
    store_address: storeSettings?.store_address || '',
    store_website: storeSettings?.store_website || '',
    business_type: storeSettings?.business_type || '',
    gst_number: storeSettings?.gst_number || '',
    currency: storeSettings?.currency || 'INR'
  };
};

export default StoreSettingsContext;
