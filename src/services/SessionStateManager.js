// Session State Manager - Frontend session state synchronization
// Requirements: 4.1, 4.2, 4.3, 4.5 - Implement proper frontend state synchronization
// Requirements: 10.2, 10.3, 10.4, 10.5 - Enhanced with notification mechanisms

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiCallWithFallback } from '../config/apiConfig';
import networkService from './NetworkService';
import sessionErrorRecoveryService from './SessionErrorRecoveryService';
import tokenExpirationMonitor from './TokenExpirationMonitor';

class SessionStateManager {
  constructor() {
    this.sessionCache = new Map();
    this.deviceLimitCache = null;
    this.lastSyncTime = null;
    this.syncInProgress = false;
    this.listeners = new Set();
    this.errorRecoveryListener = null;
    this.tokenMonitorListener = null;
    
    this.setupErrorRecoveryIntegration();
    this.setupTokenMonitorIntegration();
    
    console.log('🔄 Session State Manager initialized with notification support');
  }

  /**
   * Setup integration with error recovery service
   * Requirements: 10.3 - Graceful network error handling
   */
  setupErrorRecoveryIntegration() {
    this.errorRecoveryListener = sessionErrorRecoveryService.addListener((eventType, data) => {
      switch (eventType) {
        case 'network_restored':
          console.log('🔄 Network restored, refreshing session data');
          this.fetchActiveSessions(true).catch(console.error);
          break;
        
        case 'operation_recovered':
          if (data.operationType?.includes('session')) {
            this.notifyListeners('session_operation_recovered', data);
          }
          break;
        
        case 'auth_recovery_failed':
          this.notifyListeners('session_auth_failed', data);
          break;
      }
    });
  }

  /**
   * Setup integration with token expiration monitor
   * Requirements: 10.4 - Token expiration detection and handling
   */
  setupTokenMonitorIntegration() {
    this.tokenMonitorListener = tokenExpirationMonitor.addListener((eventType, data) => {
      switch (eventType) {
        case 'token_expiry_warning':
          this.notifyListeners('token_expiry_warning', data);
          break;
        
        case 'token_expired':
          this.notifyListeners('token_expired', data);
          this.clearAllData();
          break;
        
        case 'token_refreshed':
          console.log('🔄 Token refreshed, updating session data');
          this.fetchActiveSessions(true).catch(console.error);
          break;
      }
    });
  }

  /**
   * Add listener for session state changes
   * Requirements: 4.2 - Add real-time session count updates
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of session state changes
   */
  notifyListeners(eventType, data) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, data);
      } catch (error) {
        console.error('❌ Error notifying session state listener:', error);
      }
    });
  }

  /**
   * Get cached session data
   */
  getCachedSessions() {
    return Array.from(this.sessionCache.values());
  }

  /**
   * Get cached device limit information
   */
  getCachedDeviceLimits() {
    return this.deviceLimitCache;
  }

  /**
   * Invalidate session cache
   * Requirements: 4.3 - Implement cache invalidation after session operations
   */
  invalidateSessionCache() {
    console.log('🧹 Invalidating session cache');
    this.sessionCache.clear();
    this.deviceLimitCache = null;
    this.lastSyncTime = null;
    
    // Notify listeners of cache invalidation
    this.notifyListeners('cache_invalidated', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Update session cache with new data
   */
  updateSessionCache(sessions) {
    console.log(`🔄 Updating session cache with ${sessions.length} sessions`);
    
    // Clear existing cache
    this.sessionCache.clear();
    
    // Add new sessions to cache
    sessions.forEach(session => {
      this.sessionCache.set(session.id, {
        ...session,
        cachedAt: new Date().toISOString()
      });
    });
    
    this.lastSyncTime = new Date().toISOString();
    
    // Notify listeners of session updates
    this.notifyListeners('sessions_updated', {
      sessions: sessions,
      totalSessions: sessions.length,
      timestamp: this.lastSyncTime
    });
  }

  /**
   * Update device limit cache
   */
  updateDeviceLimitCache(limitInfo) {
    console.log(`🔄 Updating device limit cache: ${limitInfo.currentDevices}/${limitInfo.maxDevices}`);
    
    this.deviceLimitCache = {
      ...limitInfo,
      cachedAt: new Date().toISOString()
    };
    
    // Notify listeners of device limit updates
    this.notifyListeners('device_limits_updated', {
      ...limitInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Fetch active sessions from API with error recovery
   * Requirements: 4.1 - Add real-time session count updates
   * Requirements: 10.3 - Graceful network error handling
   */
  async fetchActiveSessions(forceRefresh = false) {
    // Check if sync is already in progress
    if (this.syncInProgress && !forceRefresh) {
      console.log('⏳ Session sync already in progress, returning cached data');
      return this.getCachedSessions();
    }

    // Check cache freshness (5 minutes)
    if (!forceRefresh && this.lastSyncTime) {
      const cacheAge = Date.now() - new Date(this.lastSyncTime).getTime();
      if (cacheAge < 5 * 60 * 1000) { // 5 minutes
        console.log('📋 Using cached session data (fresh)');
        return this.getCachedSessions();
      }
    }

    this.syncInProgress = true;

    try {
      console.log('🔄 Fetching active sessions from API...');
      
      // Get auth token
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No auth token available');
      }

      // Create recoverable operation with timeout
      const operation = sessionErrorRecoveryService.createRecoverableOperation(
        'fetch_sessions',
        async () => {
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15 seconds

          try {
            const response = await apiCallWithFallback('/devices/sessions', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch sessions`);
            }

            return await response.json();
          } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
              throw new Error('Request timeout: Session fetch took too long');
            }
            throw error;
          }
        },
        {
          retryable: true,
          maxRetries: 2,
          onSuccess: (data) => {
            console.log(`✅ Fetched ${data.sessions?.length || 0} active sessions`);
          },
          onError: (error) => {
            console.error('❌ Error in session fetch operation:', error);
          }
        }
      );

      // Execute with error recovery
      const data = await sessionErrorRecoveryService.executeWithRecovery(operation);
      
      if (data.success && data.sessions) {
        // Update cache
        this.updateSessionCache(data.sessions);
        return data.sessions;
      } else {
        console.log('⚠️ No sessions found in API response');
        // Return empty array instead of throwing error
        this.updateSessionCache([]);
        return [];
      }

    } catch (error) {
      console.error('❌ Error fetching active sessions:', error);
      
      // Return cached data if available
      const cachedSessions = this.getCachedSessions();
      if (cachedSessions.length > 0) {
        console.log('📋 Returning cached session data due to API error');
        return cachedSessions;
      }
      
      // Return empty array instead of throwing error to prevent UI hanging
      console.log('📋 Returning empty sessions array due to complete failure');
      return [];
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Fetch device limits from API with error recovery
   * Requirements: 10.3 - Graceful network error handling
   */
  async fetchDeviceLimits(forceRefresh = false) {
    // Check cache freshness (10 minutes for device limits)
    if (!forceRefresh && this.deviceLimitCache) {
      const cacheAge = Date.now() - new Date(this.deviceLimitCache.cachedAt).getTime();
      if (cacheAge < 10 * 60 * 1000) { // 10 minutes
        console.log('📋 Using cached device limit data (fresh)');
        return this.deviceLimitCache;
      }
    }

    try {
      console.log('🔄 Fetching device limits from API...');
      
      // Get auth token
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No auth token available');
      }

      // Create recoverable operation
      const operation = sessionErrorRecoveryService.createRecoverableOperation(
        'fetch_device_limits',
        async () => {
          const response = await apiCallWithFallback('/devices/limits', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch device limits');
          }

          return await response.json();
        },
        {
          retryable: true,
          onSuccess: (data) => {
            console.log(`✅ Fetched device limits: ${data.currentDevices}/${data.maxDevices}`);
          }
        }
      );

      // Execute with error recovery
      const data = await sessionErrorRecoveryService.executeWithRecovery(operation);
      
      if (data.success) {
        // Update cache
        this.updateDeviceLimitCache(data);
        return data;
      } else {
        throw new Error('Invalid device limits response');
      }

    } catch (error) {
      console.error('❌ Error fetching device limits:', error);
      
      // Return cached data if available
      if (this.deviceLimitCache) {
        console.log('📋 Returning cached device limit data due to API error');
        return this.deviceLimitCache;
      }
      
      throw error;
    }
  }

  /**
   * Handle session operation completion
   * Requirements: 4.3, 4.5 - Add frontend state updates for session changes
   */
  async handleSessionOperation(operationType, sessionData = null) {
    console.log(`🔄 Handling session operation: ${operationType}`);
    
    try {
      // Invalidate cache to ensure fresh data
      this.invalidateSessionCache();
      
      // Fetch fresh data
      const [sessions, deviceLimits] = await Promise.all([
        this.fetchActiveSessions(true),
        this.fetchDeviceLimits(true)
      ]);
      
      // Notify listeners of the operation completion
      this.notifyListeners('session_operation_completed', {
        operationType: operationType,
        sessionData: sessionData,
        sessions: sessions,
        deviceLimits: deviceLimits,
        timestamp: new Date().toISOString()
      });
      
      return { sessions, deviceLimits };
      
    } catch (error) {
      console.error(`❌ Error handling session operation ${operationType}:`, error);
      
      // Notify listeners of the error
      this.notifyListeners('session_operation_error', {
        operationType: operationType,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * Handle login completion
   * Requirements: 4.5 - Add frontend state updates for session changes
   */
  async handleLoginCompleted(loginResponse) {
    console.log('🔐 Handling login completion');
    
    try {
      // If login response includes device session info, cache it
      if (loginResponse.deviceSession) {
        const sessionData = {
          id: loginResponse.deviceSession.sessionId,
          sessionId: loginResponse.deviceSession.sessionId,
          deviceName: loginResponse.deviceSession.deviceName,
          deviceType: loginResponse.deviceSession.deviceType,
          isCurrent: true,
          isActive: true,
          loginTime: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
        
        // Add to cache
        this.sessionCache.set(sessionData.id, sessionData);
      }
      
      // Fetch complete session data
      await this.handleSessionOperation('login', loginResponse.deviceSession);
      
    } catch (error) {
      console.error('❌ Error handling login completion:', error);
      // Don't throw - login was successful, just session sync failed
    }
  }

  /**
   * Handle logout completion
   * Requirements: 4.5 - Add frontend state updates for session changes
   */
  async handleLogoutCompleted(logoutResponse) {
    console.log('👋 Handling logout completion');
    
    try {
      // Remove session from cache if we know which one
      if (logoutResponse.sessionId) {
        this.sessionCache.delete(logoutResponse.sessionId);
      }
      
      // Clear all cache since user is logging out
      this.invalidateSessionCache();
      
      // Notify listeners
      this.notifyListeners('logout_completed', {
        sessionCleared: logoutResponse.sessionCleared,
        sessionId: logoutResponse.sessionId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error handling logout completion:', error);
      // Don't throw - logout was successful, just cleanup failed
    }
  }

  /**
   * Handle remote logout (logout from another device)
   */
  async handleRemoteLogout(sessionId) {
    console.log(`📱 Handling remote logout for session: ${sessionId}`);
    
    try {
      // Remove specific session from cache
      this.sessionCache.delete(sessionId);
      
      // Fetch fresh data
      await this.handleSessionOperation('remote_logout', { sessionId });
      
    } catch (error) {
      console.error('❌ Error handling remote logout:', error);
      throw error;
    }
  }

  /**
   * Handle logout all other devices
   */
  async handleLogoutAllOthers() {
    console.log('📱 Handling logout all other devices');
    
    try {
      // CRITICAL FIX: Actually call the logout API instead of just refreshing data
      console.log('🚪 Calling logout all other devices API...');
      
      const response = await networkService.apiCall('/devices/sessions/all/others', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to logout other devices`);
      }

      const result = await response.json();
      console.log('✅ Logout all other devices API response:', result);

      // Invalidate cache and fetch fresh data after successful logout
      await this.handleSessionOperation('logout_all_others', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error handling logout all others:', error);
      
      // CRITICAL FIX: If API call fails, try to clear session data from database anyway
      console.log('🔄 API failed, attempting database cleanup...');
      try {
        // Force invalidate all cached session data
        this.invalidateSessionCache();
        
        // Try to fetch fresh data to see current state
        const sessions = await this.fetchActiveSessions(true);
        
        // If we still have multiple sessions, the logout failed
        if (sessions && sessions.length > 1) {
          console.log('⚠️ Database still shows multiple sessions, logout may have failed');
          throw new Error('Logout failed - sessions still active in database. Please try again or contact support.');
        }
        
        // If we only have 1 or 0 sessions, consider it successful
        console.log('✅ Database cleanup appears successful');
        return { 
          success: true, 
          loggedOutCount: 0, 
          message: 'Session data cleared from database' 
        };
        
      } catch (cleanupError) {
        console.error('❌ Database cleanup also failed:', cleanupError);
        throw new Error(`Logout failed: ${error.message}. Database cleanup also failed: ${cleanupError.message}`);
      }
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const sessions = this.getCachedSessions();
    const deviceLimits = this.getCachedDeviceLimits();
    
    return {
      totalSessions: sessions.length,
      currentSession: sessions.find(s => s.isCurrent),
      otherSessions: sessions.filter(s => !s.isCurrent),
      deviceLimits: deviceLimits,
      lastSyncTime: this.lastSyncTime,
      cacheSize: this.sessionCache.size
    };
  }

  /**
   * Periodic sync to keep data fresh
   * Requirements: 4.1 - Add real-time session count updates
   */
  startPeriodicSync(intervalMinutes = 5) {
    console.log(`🔄 Starting periodic session sync (every ${intervalMinutes} minutes)`);
    
    const syncInterval = setInterval(async () => {
      try {
        // Only sync if we have cached data (user is active)
        if (this.sessionCache.size > 0 || this.deviceLimitCache) {
          console.log('🔄 Performing periodic session sync...');
          await this.fetchActiveSessions(false); // Use cache if fresh
          await this.fetchDeviceLimits(false);
        }
      } catch (error) {
        console.error('❌ Periodic sync error:', error);
        // Don't stop the interval on error
      }
    }, intervalMinutes * 60 * 1000);
    
    return () => {
      console.log('⏹️ Stopping periodic session sync');
      clearInterval(syncInterval);
    };
  }

  /**
   * Clear all cached data (for logout)
   */
  clearAllData() {
    console.log('🧹 Clearing all session state data');
    this.sessionCache.clear();
    this.deviceLimitCache = null;
    this.lastSyncTime = null;
    this.syncInProgress = false;
    
    // Clean up listeners
    if (this.errorRecoveryListener) {
      this.errorRecoveryListener();
      this.errorRecoveryListener = null;
    }
    
    if (this.tokenMonitorListener) {
      this.tokenMonitorListener();
      this.tokenMonitorListener = null;
    }
    
    // Notify listeners
    this.notifyListeners('all_data_cleared', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      sessionCacheSize: this.sessionCache.size,
      deviceLimitCached: !!this.deviceLimitCache,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      listenersCount: this.listeners.size,
      cachedSessions: Array.from(this.sessionCache.keys())
    };
  }
}

// Create singleton instance
const sessionStateManager = new SessionStateManager();

export default sessionStateManager;