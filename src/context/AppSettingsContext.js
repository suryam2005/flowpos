import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for app settings persistence
const STORAGE_KEYS = {
  APP_SETTINGS: '@flowpos_app_settings',
  APP_SETTINGS_TIMESTAMP: '@flowpos_app_settings_timestamp',
  MIGRATION_COMPLETE: '@flowpos_app_settings_migrated'
};

// Legacy AsyncStorage keys (for one-time migration)
const LEGACY_KEYS = {
  autoPaymentDetection: 'autoPaymentDetection',
  requireCustomerDetails: 'requireCustomerDetails',
  showStoreNameOnInvoice: 'showStoreNameOnInvoice',
  sendInvoiceEnabled: 'sendInvoiceEnabled',
  whatsappMethod: 'whatsappMethod',
  notifications: 'notifications'
};

// Cache staleness threshold (in milliseconds)
// Default: 24 hours (session-based staleness)
const CACHE_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Global reference for app settings actions (used by AuthContext integration)
let globalAppSettingsActions = {
  refreshSettings: null,
  clearCache: null,
  getSetting: null,
  getSettings: null
};

// Create the context
const AppSettingsContext = createContext(null);

/**
 * Hook to access app settings context
 * @returns {AppSettingsContextValue} The app settings context value
 */
export const useAppSettingsContext = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettingsContext must be used within an AppSettingsProvider');
  }
  return context;
};

/**
 * AppSettingsProvider - Single cache owner for app settings data
 * Implements request deduplication, AsyncStorage persistence, and no default values
 * 
 * Settings managed:
 * - autoPaymentDetection: boolean
 * - requireCustomerDetails: boolean
 * - showStoreNameOnInvoice: boolean
 * - sendInvoiceEnabled: boolean
 * - whatsappMethod: 'flowpos' | 'device'
 * - notifications: boolean
 */
export const AppSettingsProvider = ({ children }) => {
  // State
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  // Refs for request deduplication
  const inFlightPromiseRef = useRef(null);
  const mountedRef = useRef(true);

  // Ref to hold latest settings for global access (avoids stale closure issues)
  const settingsRef = useRef(settings);
  
  // Refs for functions to avoid stale closures in global actions
  const refreshSettingsRef = useRef(null);
  const clearCacheRef = useRef(null);
  
  // Keep settingsRef in sync with state
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Load cached data from AsyncStorage on mount
  useEffect(() => {
    mountedRef.current = true;
    loadCachedData();
    
    return () => {
      mountedRef.current = false;
      unregisterAppSettingsActions();
    };
  }, []);
  
  // Register global actions once on mount
  // Uses refs to avoid stale closures - refs are always current
  useEffect(() => {
    registerAppSettingsActions({
      refreshSettings: () => refreshSettingsRef.current?.(),
      clearCache: () => clearCacheRef.current?.(),
      getSetting: (key) => settingsRef.current?.[key],
      getSettings: () => settingsRef.current
    });
  }, []); // Empty deps - register once, use refs for current values

  /**
   * Check if cached data is stale (older than session threshold)
   */
  const isCacheStale = (timestamp) => {
    if (!timestamp) return true;
    const now = Date.now();
    const age = now - timestamp;
    return age > CACHE_STALE_THRESHOLD_MS;
  };

  /**
   * Load app settings from AsyncStorage on app start
   * Does NOT apply default values - returns null if no settings exist
   */
  const loadCachedData = async () => {
    try {
      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS_TIMESTAMP)
      ]);

      if (cachedData && mountedRef.current) {
        try {
          const parsedData = JSON.parse(cachedData);
          const timestamp = cachedTimestamp ? parseInt(cachedTimestamp, 10) : null;
          
          setSettings(parsedData);
          setIsCached(true);
          setLastFetchedAt(timestamp);
          setIsLoading(false);
          console.log('[AppSettingsCache] Loaded cached data from AsyncStorage');
          
          // Trigger background refresh if stale
          if (isCacheStale(timestamp)) {
            setTimeout(() => {
              if (mountedRef.current) {
                triggerBackgroundRefresh();
              }
            }, 100);
          }
        } catch (parseError) {
          console.error('[AppSettingsCache] Error parsing cached data:', parseError.message);
          if (mountedRef.current) {
            setSettings(null);
            setIsLoading(false);
          }
        }
      } else if (mountedRef.current) {
        // No cached data - settings remain null (no defaults)
        setSettings(null);
        setIsLoading(false);
        console.log('[AppSettingsCache] No cached data available');
      }
    } catch (err) {
      console.error('[AppSettingsCache] Error loading cached data:', err.message);
      if (mountedRef.current) {
        setSettings(null);
        setIsLoading(false);
      }
    }
  };

  /**
   * Trigger background refresh for stale data (non-blocking)
   */
  const triggerBackgroundRefresh = () => {
    console.log('[AppSettingsCache] Triggering background refresh');
    refreshSettings().catch(err => {
      console.error('[AppSettingsCache] Background refresh failed:', err.message);
    });
  };

  /**
   * Store app settings in both memory and AsyncStorage
   */
  const storeSettingsData = async (data) => {
    const timestamp = Date.now();
    
    if (mountedRef.current) {
      setSettings(data);
      setIsCached(true);
      setLastFetchedAt(timestamp);
      setError(null);
    }

    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(data)),
        AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS_TIMESTAMP, timestamp.toString())
      ]);
      console.log('[AppSettingsCache] Data stored in AsyncStorage');
    } catch (err) {
      console.error('[AppSettingsCache] Error storing to AsyncStorage:', err.message);
    }
  };

  /**
   * Fetch app settings from backend API via store endpoint
   * Settings are stored in the app_settings JSONB column of the stores table
   * Includes one-time migration check for existing users
   */
  const fetchSettingsFromBackend = async (token) => {
    if (inFlightPromiseRef.current) {
      console.log('[AppSettingsCache] Returning in-flight promise (deduplication)');
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
          console.error('[AppSettingsCache] Error parsing API response:', parseError.message);
          return null;
        }

        if (!response.ok) {
          console.error('[AppSettingsCache] API returned error:', data.message || 'Unknown error');
          throw new Error(data.message || 'Failed to fetch store data');
        }

        // Extract app_settings from store response
        const storeData = data.store || data;
        const appSettings = storeData.app_settings;
        
        // Check if app_settings is NULL in DB - trigger one-time migration
        if (appSettings === null || appSettings === undefined) {
          console.log('[AppSettingsCache] app_settings is NULL in DB, checking for migration...');
          const migratedSettings = await performOneTimeMigration(token);
          if (migratedSettings) {
            console.log('[AppSettingsCache] Using migrated settings');
            return migratedSettings;
          }
        }
        
        // Returns null if app_settings doesn't exist (no defaults)
        return appSettings || null;
      } catch (networkError) {
        console.error('[AppSettingsCache] Network error:', networkError.message);
        throw networkError;
      } finally {
        inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = fetchPromise;
    return fetchPromise;
  };

  /**
   * Refresh app settings from backend
   * Implements cache-first strategy with fallback
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
        console.error('[AppSettingsCache] Error reading auth token:', storageError.message);
        token = null;
      }
      
      if (!token) {
        console.log('[AppSettingsCache] No auth token available');
        if (mountedRef.current) {
          setIsLoading(false);
        }
        return;
      }

      const data = await fetchSettingsFromBackend(token);
      
      // Store in cache
      // IMPORTANT: If backend returns null (new user, no settings), store empty object {}
      // This distinguishes "loaded but empty" from "not loaded yet" (null)
      // - null: context not loaded yet (show loading state)
      // - {}: loaded from backend, but user hasn't configured any settings (show defaults)
      // - {key: value}: loaded from backend with actual settings
      const settingsToStore = data === null ? {} : data;
      await storeSettingsData(settingsToStore);
      
      console.log('[AppSettingsCache] Settings refreshed successfully');
    } catch (err) {
      console.error('[AppSettingsCache] Error refreshing settings:', err.message);
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
   * Clear all app settings cache data
   * Called on logout - does NOT delete from database
   * Note: Does NOT clear migration flag - migration is one-time per user
   */
  const clearCache = useCallback(async () => {
    if (mountedRef.current) {
      setSettings(null);
      setIsCached(false);
      setLastFetchedAt(null);
      setError(null);
      setIsLoading(false);
    }

    inFlightPromiseRef.current = null;

    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.APP_SETTINGS),
        AsyncStorage.removeItem(STORAGE_KEYS.APP_SETTINGS_TIMESTAMP)
        // Note: MIGRATION_COMPLETE is NOT cleared on logout
        // Migration should only run once per user, even across logout/login cycles
      ]);
      console.log('[AppSettingsCache] Cache cleared successfully');
    } catch (err) {
      console.error('[AppSettingsCache] Error clearing cache:', err.message);
    }
  }, []);

  // Keep function refs in sync for global actions
  useEffect(() => {
    refreshSettingsRef.current = refreshSettings;
    clearCacheRef.current = clearCache;
  }, [refreshSettings, clearCache]);

  /**
   * Get a single setting value
   * Returns undefined if setting doesn't exist (no defaults)
   */
  const getSetting = useCallback((key) => {
    if (!settings) return undefined;
    return settings[key];
  }, [settings]);

  /**
   * Update a single setting (write-through with conflict resolution)
   * Sends to backend first via PUT /store with app_settings, updates cache only on success
   * Uses same pattern as StoreSettingsContext for consistency
   * @returns {boolean} true if update succeeded, false otherwise
   */
  const updateSetting = useCallback(async (key, value) => {
    try {
      let token;
      try {
        token = await AsyncStorage.getItem('accessToken');
      } catch (storageError) {
        console.error('[AppSettingsCache] Error reading auth token:', storageError.message);
        return false;
      }
      
      if (!token) {
        console.error('[AppSettingsCache] No auth token available for update');
        return false;
      }

      // Optimistic update for better UX
      const previousSettings = settings;
      if (mountedRef.current) {
        setSettings(prev => prev ? { ...prev, [key]: value } : { [key]: value });
      }

      try {
        const { apiCallWithFallback } = require('../config/apiConfig');
        
        // Build new app_settings object with the updated key
        const newAppSettings = { ...(settings || {}), [key]: value };
        
        // Use PUT /store with app_settings in body (same as updateSettings)
        const response = await apiCallWithFallback('/store', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ app_settings: newAppSettings })
        });

        if (!response.ok) {
          // Revert optimistic update on failure
          if (mountedRef.current) {
            setSettings(previousSettings);
          }
          
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update setting');
        }

        // Update cache with the new settings
        await storeSettingsData(newAppSettings);
        
        console.log(`[AppSettingsCache] Setting ${key} updated successfully`);
        return true;
      } catch (networkError) {
        // Revert optimistic update on network error
        if (mountedRef.current) {
          setSettings(previousSettings);
        }
        console.error('[AppSettingsCache] Network error updating setting:', networkError.message);
        return false;
      }
    } catch (err) {
      console.error('[AppSettingsCache] Error updating setting:', err.message);
      return false;
    }
  }, [settings]);

  /**
   * Update multiple settings at once (write-through)
   * @returns {boolean} true if update succeeded, false otherwise
   */
  const updateSettings = useCallback(async (updates) => {
    try {
      let token;
      try {
        token = await AsyncStorage.getItem('accessToken');
      } catch (storageError) {
        console.error('[AppSettingsCache] Error reading auth token:', storageError.message);
        return false;
      }

      if (!token) {
        console.log('[AppSettingsCache] No auth token for update');
        return false;
      }

      // Merge updates with existing settings
      const newSettings = { ...(settings || {}), ...updates };

      // Send to backend first (write-through)
      const { apiCallWithFallback } = require('../config/apiConfig');
      const response = await apiCallWithFallback('/store', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ app_settings: newSettings })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[AppSettingsCache] Backend update failed:', errorData.message || 'Unknown error');
        return false;
      }

      // Backend succeeded - update cache
      await storeSettingsData(newSettings);
      console.log('[AppSettingsCache] Settings updated successfully');
      return true;
    } catch (err) {
      console.error('[AppSettingsCache] Error updating settings:', err.message);
      return false;
    }
  }, [settings]);

  // Context value
  const value = {
    // Settings data (read-only from context)
    settings,
    isLoading,
    error,
    
    // Cache status
    isCached,
    lastFetchedAt,
    
    // Actions
    refreshSettings,
    clearCache,
    getSetting,
    updateSetting,
    updateSettings,
    
    // Cache staleness check
    isCacheStale: () => isCacheStale(lastFetchedAt),
    
    // Constants (for external use)
    STORAGE_KEYS,
    LEGACY_KEYS
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
};


/**
 * Perform one-time migration of legacy AsyncStorage settings to database
 * This runs when app_settings is NULL in DB (existing user who hasn't migrated)
 * 
 * Migration flow:
 * 1. Check if app_settings is NULL in DB response
 * 2. Read legacy AsyncStorage keys
 * 3. If legacy values exist, persist to DB
 * 4. Clear legacy AsyncStorage keys after successful migration
 * 5. Mark migration as complete
 * 
 * @param {string} token - Auth token for API calls
 * @returns {Object|null} Migrated settings or null if no migration needed
 */
const performOneTimeMigration = async (token) => {
  try {
    console.log('[AppSettingsCache] Checking if one-time migration is needed...');
    
    // Check if migration was already completed
    const migrationComplete = await AsyncStorage.getItem(STORAGE_KEYS.MIGRATION_COMPLETE);
    if (migrationComplete === 'true') {
      console.log('[AppSettingsCache] Migration already completed, skipping');
      return null;
    }
    
    // Read all legacy AsyncStorage keys
    const legacyValues = {};
    let hasLegacyValues = false;
    
    for (const [settingKey, storageKey] of Object.entries(LEGACY_KEYS)) {
      try {
        const value = await AsyncStorage.getItem(storageKey);
        if (value !== null) {
          // Parse boolean strings and other values
          let parsedValue;
          if (value === 'true') {
            parsedValue = true;
          } else if (value === 'false') {
            parsedValue = false;
          } else {
            // Try JSON parse for complex values, fallback to string
            try {
              parsedValue = JSON.parse(value);
            } catch {
              parsedValue = value;
            }
          }
          legacyValues[settingKey] = parsedValue;
          hasLegacyValues = true;
          console.log(`[AppSettingsCache] Found legacy value for ${settingKey}:`, parsedValue);
        }
      } catch (err) {
        console.error(`[AppSettingsCache] Error reading legacy key ${storageKey}:`, err.message);
      }
    }
    
    if (!hasLegacyValues) {
      console.log('[AppSettingsCache] No legacy values found, marking migration complete');
      await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETE, 'true');
      return null;
    }
    
    console.log('[AppSettingsCache] Found legacy values, migrating to database:', legacyValues);
    
    // Persist legacy values to database
    const { apiCallWithFallback } = require('../config/apiConfig');
    const response = await apiCallWithFallback('/store', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ app_settings: legacyValues })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AppSettingsCache] Migration to DB failed:', errorData.message || 'Unknown error');
      // Don't mark as complete - will retry on next login
      return null;
    }
    
    console.log('[AppSettingsCache] Successfully migrated settings to database');
    
    // Clear legacy AsyncStorage keys after successful migration
    const keysToRemove = Object.values(LEGACY_KEYS);
    for (const key of keysToRemove) {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`[AppSettingsCache] Cleared legacy key: ${key}`);
      } catch (err) {
        console.error(`[AppSettingsCache] Error clearing legacy key ${key}:`, err.message);
      }
    }
    
    // Mark migration as complete
    await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETE, 'true');
    console.log('[AppSettingsCache] One-time migration completed successfully');
    
    return legacyValues;
  } catch (err) {
    console.error('[AppSettingsCache] Migration error:', err.message);
    // Migration failure doesn't block app - will retry on next login
    return null;
  }
};

/**
 * Distribute store data to AppSettingsContext (called from AuthContext)
 * This receives the app_settings field from a consolidated GET /api/store call
 * and stores it in the AppSettingsContext cache.
 * 
 * @param {Object} storeData - Full store data from GET /api/store
 */
export const distributeStoreDataToAppSettings = (storeData) => {
  if (!storeData) {
    console.log('[AppSettingsCache] No store data to distribute');
    return;
  }

  const appSettings = storeData.app_settings;
  
  // Store in cache via global actions
  // IMPORTANT: If app_settings is null (new user), store empty object {}
  // This distinguishes "loaded but empty" from "not loaded yet" (null)
  const settingsToStore = appSettings === null || appSettings === undefined ? {} : appSettings;
  
  // Use internal storage function via global action pattern
  if (globalAppSettingsActions.refreshSettings) {
    // We can't directly call storeSettingsData, so we'll use a different approach
    // Store directly to AsyncStorage and update state via a new global action
    (async () => {
      try {
        const timestamp = Date.now();
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settingsToStore)),
          AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS_TIMESTAMP, timestamp.toString())
        ]);
        console.log('[AppSettingsCache] Distributed store data stored in AsyncStorage');
        
        // Trigger a refresh to update in-memory state from the newly stored cache
        // This is a lightweight operation since data is already in AsyncStorage
        globalAppSettingsActions.refreshSettings().catch(err => {
          console.error('[AppSettingsCache] Error refreshing after distribution:', err.message);
        });
      } catch (err) {
        console.error('[AppSettingsCache] Error distributing store data:', err.message);
      }
    })();
  } else {
    console.log('[AppSettingsCache] Global actions not registered, falling back to direct storage');
    // Fallback: store directly to AsyncStorage
    (async () => {
      try {
        const timestamp = Date.now();
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settingsToStore)),
          AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS_TIMESTAMP, timestamp.toString())
        ]);
        console.log('[AppSettingsCache] Distributed store data stored in AsyncStorage (fallback)');
      } catch (err) {
        console.error('[AppSettingsCache] Error in fallback distribution:', err.message);
      }
    })();
  }
};

/**
 * Trigger app settings fetch after login (non-blocking)
 * Called by AuthContext after successful login
 * Includes one-time migration check for existing users
 */
export const triggerAppSettingsFetchAfterLogin = () => {
  if (globalAppSettingsActions.refreshSettings) {
    console.log('[AppSettingsCache] Triggering settings fetch after login (non-blocking)');
    globalAppSettingsActions.refreshSettings().catch(err => {
      console.error('[AppSettingsCache] Background settings fetch failed:', err.message);
    });
  } else {
    console.log('[AppSettingsCache] App settings actions not yet registered');
  }
};

/**
 * Clear app settings cache on logout
 * Called by AuthContext during logout
 * Does NOT delete settings from database
 * Does NOT clear migration flag - migration is one-time per user
 */
export const clearAppSettingsCacheOnLogout = async () => {
  if (globalAppSettingsActions.clearCache) {
    console.log('[AppSettingsCache] Clearing app settings cache on logout');
    try {
      await globalAppSettingsActions.clearCache();
      console.log('[AppSettingsCache] App settings cache cleared successfully');
    } catch (err) {
      console.error('[AppSettingsCache] Error clearing app settings cache on logout:', err.message);
    }
  } else {
    // Fallback: Clear AsyncStorage directly if context not available
    console.log('[AppSettingsCache] Context not available, clearing AsyncStorage directly');
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.APP_SETTINGS),
        AsyncStorage.removeItem(STORAGE_KEYS.APP_SETTINGS_TIMESTAMP)
        // Note: MIGRATION_COMPLETE is NOT cleared on logout
      ]);
      console.log('[AppSettingsCache] App settings cache cleared from AsyncStorage');
    } catch (err) {
      console.error('[AppSettingsCache] Error clearing AsyncStorage:', err.message);
    }
  }
};

/**
 * Register global app settings actions
 * Called internally by AppSettingsProvider to enable AuthContext integration
 */
export const registerAppSettingsActions = (actions) => {
  globalAppSettingsActions = {
    refreshSettings: actions.refreshSettings,
    clearCache: actions.clearCache,
    getSetting: actions.getSetting,
    getSettings: actions.getSettings
  };
  console.log('[AppSettingsCache] Global app settings actions registered');
};

/**
 * Unregister global app settings actions (cleanup)
 */
export const unregisterAppSettingsActions = () => {
  globalAppSettingsActions = {
    refreshSettings: null,
    clearCache: null,
    getSetting: null,
    getSettings: null
  };
  console.log('[AppSettingsCache] Global app settings actions unregistered');
};

/**
 * Get app settings from global cache (for use outside React components)
 * @returns {Object|null} Current app settings or null if not available
 */
export const getAppSettingsFromCache = () => {
  if (globalAppSettingsActions.getSettings) {
    return globalAppSettingsActions.getSettings();
  }
  console.log('[AppSettingsCache] getSettings not available, cache may not be initialized');
  return null;
};

/**
 * Get a single app setting from global cache (for use outside React components)
 * Used by CartScreen, InvoiceService, WhatsAppService for reading settings
 * @param {string} key - The setting key to retrieve
 * @returns {any} The setting value or undefined if not available
 */
export const getAppSettingFromCache = (key) => {
  // Primary: try to get from getSettings and extract the key
  // This is more reliable than getSetting because getSettings returns the full object
  if (globalAppSettingsActions.getSettings) {
    const settings = globalAppSettingsActions.getSettings();
    if (settings && typeof settings === 'object') {
      return settings[key];
    }
  }
  
  // Fallback: try getSetting if available
  if (globalAppSettingsActions.getSetting) {
    return globalAppSettingsActions.getSetting(key);
  }
  
  console.log('[AppSettingsCache] Cache not initialized, returning undefined for key:', key);
  return undefined;
};

// Export constants for external use
export { STORAGE_KEYS, LEGACY_KEYS, CACHE_STALE_THRESHOLD_MS };
export default AppSettingsContext;