// Session Notifications Hook - Frontend notification mechanisms for session changes
// Requirements: 10.2, 10.3, 10.4, 10.5 - Implement session state change notifications

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import sessionStateManager from '../services/SessionStateManager';
import { useAuth } from '../context/AuthContext';

/**
 * Hook for managing session-related notifications and state changes
 * Requirements: 10.2 - Session state change notifications
 * Requirements: 10.3 - Graceful network error handling  
 * Requirements: 10.4 - Token expiration detection and handling
 * Requirements: 10.5 - Immediate feedback for user actions
 */
export const useSessionNotifications = () => {
  const { isAuthenticated, accessToken, logout } = useAuth();
  const [sessionState, setSessionState] = useState({
    sessions: [],
    deviceLimits: null,
    isLoading: false,
    lastUpdate: null,
    error: null
  });
  
  const [notifications, setNotifications] = useState([]);
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: true,
    lastError: null,
    retryCount: 0
  });
  
  const listenerRef = useRef(null);
  const periodicSyncRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const tokenExpiryCheckRef = useRef(null);

  /**
   * Add a notification to the queue
   * Requirements: 10.5 - Immediate feedback for user actions
   */
  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    const newNotification = {
      id,
      timestamp: new Date().toISOString(),
      ...notification
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove notification after specified duration
    const duration = notification.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  }, []);

  /**
   * Remove a notification from the queue
   */
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Handle session state changes from SessionStateManager
   * Requirements: 10.2 - Session state change notifications
   */
  const handleSessionStateChange = useCallback((eventType, data) => {
    console.log(`🔔 [SessionNotifications] Received event: ${eventType}`, data);
    
    switch (eventType) {
      case 'sessions_updated':
        setSessionState(prev => ({
          ...prev,
          sessions: data.sessions || [],
          lastUpdate: data.timestamp,
          isLoading: false,
          error: null
        }));
        
        // Notify user of session count changes
        if (data.sessions && data.sessions.length > 0) {
          addNotification({
            type: 'info',
            title: 'Sessions Updated',
            message: `You have ${data.sessions.length} active device${data.sessions.length !== 1 ? 's' : ''}`,
            duration: 3000
          });
        }
        break;

      case 'device_limits_updated':
        setSessionState(prev => ({
          ...prev,
          deviceLimits: data,
          lastUpdate: data.timestamp,
          error: null
        }));
        
        // Warn if approaching device limit
        if (data.currentDevices >= data.maxDevices * 0.8) {
          addNotification({
            type: 'warning',
            title: 'Device Limit Warning',
            message: `Using ${data.currentDevices} of ${data.maxDevices} allowed devices`,
            duration: 5000
          });
        }
        break;

      case 'session_operation_completed':
        const { operationType, sessions, deviceLimits } = data;
        
        setSessionState(prev => ({
          ...prev,
          sessions: sessions || prev.sessions,
          deviceLimits: deviceLimits || prev.deviceLimits,
          lastUpdate: data.timestamp,
          isLoading: false,
          error: null
        }));
        
        // Provide feedback for specific operations
        switch (operationType) {
          case 'login':
            addNotification({
              type: 'success',
              title: 'Login Successful',
              message: 'You have been logged in successfully',
              duration: 3000
            });
            break;
          case 'remote_logout':
            addNotification({
              type: 'info',
              title: 'Device Logged Out',
              message: 'A device has been logged out remotely',
              duration: 4000
            });
            break;
          case 'logout_all_others':
            addNotification({
              type: 'success',
              title: 'Other Devices Logged Out',
              message: 'All other devices have been logged out',
              duration: 4000
            });
            break;
        }
        break;

      case 'session_operation_error':
        setSessionState(prev => ({
          ...prev,
          error: data.error,
          isLoading: false
        }));
        
        // Handle specific error types
        if (data.error.includes('token') || data.error.includes('expired') || data.error.includes('unauthorized')) {
          handleTokenExpiration();
        } else {
          addNotification({
            type: 'error',
            title: 'Session Error',
            message: 'Failed to update session information',
            duration: 5000
          });
        }
        break;

      case 'logout_completed':
        setSessionState({
          sessions: [],
          deviceLimits: null,
          isLoading: false,
          lastUpdate: data.timestamp,
          error: null
        });
        
        addNotification({
          type: 'info',
          title: 'Logged Out',
          message: 'You have been logged out successfully',
          duration: 3000
        });
        break;

      case 'cache_invalidated':
        setSessionState(prev => ({
          ...prev,
          isLoading: true,
          error: null
        }));
        break;

      case 'all_data_cleared':
        setSessionState({
          sessions: [],
          deviceLimits: null,
          isLoading: false,
          lastUpdate: data.timestamp,
          error: null
        });
        break;
    }
  }, [addNotification]);

  /**
   * Handle network errors gracefully
   * Requirements: 10.3 - Graceful network error handling
   */
  const handleNetworkError = useCallback((error) => {
    console.error('🌐 [SessionNotifications] Network error:', error);
    
    setNetworkStatus(prev => ({
      isOnline: false,
      lastError: error.message,
      retryCount: prev.retryCount + 1
    }));
    
    // Show user-friendly network error notification
    if (error.message.includes('Network request failed') || 
        error.message.includes('fetch') ||
        error.message.includes('timeout')) {
      
      addNotification({
        type: 'warning',
        title: 'Connection Issue',
        message: 'Unable to connect to server. Retrying...',
        duration: 4000
      });
    } else if (error.message.includes('offline')) {
      addNotification({
        type: 'warning',
        title: 'Offline',
        message: 'You are currently offline. Some features may be limited.',
        duration: 6000
      });
    } else {
      addNotification({
        type: 'error',
        title: 'Network Error',
        message: 'Connection problem. Please check your internet.',
        duration: 5000
      });
    }
  }, [addNotification]);

  /**
   * Handle token expiration detection
   * Requirements: 10.4 - Token expiration detection and handling
   */
  const handleTokenExpiration = useCallback(async () => {
    // Guard against multiple simultaneous token expiration handling
    if (handleTokenExpiration._inProgress) {
      console.log('⚠️ Token expiration handling already in progress, skipping duplicate call');
      return;
    }
    
    handleTokenExpiration._inProgress = true;
    
    try {
      console.log('🔐 [SessionNotifications] Token expiration detected');
      
      // Clear any existing notifications
      clearNotifications();
      
      // Show token expiration notification
      addNotification({
        type: 'error',
        title: 'Session Expired',
        message: 'Your session has expired. Please log in again.',
        duration: 0 // Don't auto-remove
      });
      
      // Clear session state
      setSessionState({
        sessions: [],
        deviceLimits: null,
        isLoading: false,
        lastUpdate: new Date().toISOString(),
        error: 'Session expired'
      });
      
      // Trigger logout after a short delay to allow notification to show
      setTimeout(() => {
        logout();
        // Clear the guard flag after logout
        handleTokenExpiration._inProgress = false;
      }, 2000);
    } catch (error) {
      console.error('❌ Error handling token expiration:', error);
      handleTokenExpiration._inProgress = false;
    }
  }, [logout, addNotification, clearNotifications]);

  /**
   * Check token expiration periodically
   * Requirements: 10.4 - Token expiration detection and handling
   */
  const checkTokenExpiration = useCallback(async () => {
    if (!accessToken || !isAuthenticated) return;
    
    try {
      // Decode JWT token to check expiration
      const tokenParts = accessToken.split('.');
      if (tokenParts.length !== 3) return;
      
      const payload = JSON.parse(atob(tokenParts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = payload.exp;
      
      // Check if token expires within 5 minutes
      const timeUntilExpiry = expirationTime - currentTime;
      if (timeUntilExpiry <= 300) { // 5 minutes
        console.log(`⚠️ [SessionNotifications] Token expires in ${timeUntilExpiry} seconds`);
        
        if (timeUntilExpiry <= 60) { // 1 minute
          handleTokenExpiration();
        } else {
          addNotification({
            type: 'warning',
            title: 'Session Expiring Soon',
            message: `Your session will expire in ${Math.ceil(timeUntilExpiry / 60)} minute(s)`,
            duration: 10000
          });
        }
      }
    } catch (error) {
      console.error('❌ [SessionNotifications] Error checking token expiration:', error);
    }
  }, [accessToken, isAuthenticated, handleTokenExpiration, addNotification]);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback((nextAppState) => {
    console.log(`📱 [SessionNotifications] App state changed: ${appStateRef.current} -> ${nextAppState}`);
    
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - refresh session data
      if (isAuthenticated) {
        console.log('🔄 [SessionNotifications] App resumed, refreshing session data...');
        
        // Check for session updates after app resume
        sessionStateManager.fetchActiveSessions(true).catch(error => {
          if (!error.message.includes('token') && !error.message.includes('expired')) {
            handleNetworkError(error);
          }
        });
        
        // Check token expiration
        checkTokenExpiration();
        
        // Update network status
        setNetworkStatus(prev => ({
          ...prev,
          isOnline: true,
          lastError: null
        }));
      }
    }
    
    appStateRef.current = nextAppState;
  }, [isAuthenticated, handleNetworkError, checkTokenExpiration]);

  /**
   * Refresh session data manually
   * Requirements: 10.5 - Immediate feedback for user actions
   */
  const refreshSessionData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setSessionState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const [sessions, deviceLimits] = await Promise.all([
        sessionStateManager.fetchActiveSessions(true),
        sessionStateManager.fetchDeviceLimits(true)
      ]);
      
      setSessionState(prev => ({
        ...prev,
        sessions,
        deviceLimits,
        isLoading: false,
        lastUpdate: new Date().toISOString(),
        error: null
      }));
      
      // Update network status on successful refresh
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: true,
        lastError: null,
        retryCount: 0
      }));
      
      addNotification({
        type: 'success',
        title: 'Refreshed',
        message: 'Session data updated successfully',
        duration: 2000
      });
      
    } catch (error) {
      console.error('❌ [SessionNotifications] Error refreshing session data:', error);
      
      if (error.message.includes('token') || error.message.includes('expired') || error.message.includes('unauthorized')) {
        handleTokenExpiration();
      } else {
        handleNetworkError(error);
        setSessionState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message
        }));
      }
    }
  }, [isAuthenticated, handleTokenExpiration, handleNetworkError, addNotification]);

  /**
   * Perform a session operation with user feedback
   * Requirements: 10.5 - Immediate feedback for user actions
   */
  const performSessionOperation = useCallback(async (operation, ...args) => {
    if (!isAuthenticated) return;
    
    setSessionState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      let result;
      
      switch (operation) {
        case 'logout_device':
          result = await sessionStateManager.handleRemoteLogout(...args);
          break;
        case 'logout_all_others':
          result = await sessionStateManager.handleLogoutAllOthers();
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      addNotification({
        type: 'success',
        title: 'Operation Successful',
        message: 'Session operation completed successfully',
        duration: 3000
      });
      
      return result;
      
    } catch (error) {
      console.error(`❌ [SessionNotifications] Error performing ${operation}:`, error);
      
      if (error.message.includes('token') || error.message.includes('expired') || error.message.includes('unauthorized')) {
        handleTokenExpiration();
      } else {
        handleNetworkError(error);
        
        addNotification({
          type: 'error',
          title: 'Operation Failed',
          message: error.message || 'Failed to perform session operation',
          duration: 5000
        });
      }
      
      throw error;
    } finally {
      setSessionState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isAuthenticated, handleTokenExpiration, handleNetworkError, addNotification]);

  // Setup session state listener
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔔 [SessionNotifications] Setting up session state listener');
      
      listenerRef.current = sessionStateManager.addListener(handleSessionStateChange);
      
      // Initial data fetch
      refreshSessionData();
      
      return () => {
        if (listenerRef.current) {
          listenerRef.current();
          listenerRef.current = null;
        }
      };
    } else {
      // Clear state when not authenticated
      setSessionState({
        sessions: [],
        deviceLimits: null,
        isLoading: false,
        lastUpdate: null,
        error: null
      });
      clearNotifications();
    }
  }, [isAuthenticated, handleSessionStateChange, refreshSessionData, clearNotifications]);

  // Setup periodic token expiration check
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      console.log('🔐 [SessionNotifications] Setting up token expiration check');
      
      tokenExpiryCheckRef.current = setInterval(checkTokenExpiration, 60000); // Check every minute
      
      return () => {
        if (tokenExpiryCheckRef.current) {
          clearInterval(tokenExpiryCheckRef.current);
          tokenExpiryCheckRef.current = null;
        }
      };
    }
  }, [isAuthenticated, accessToken, checkTokenExpiration]);

  // Setup app state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  // Setup periodic sync
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔄 [SessionNotifications] Setting up periodic sync');
      
      periodicSyncRef.current = sessionStateManager.startPeriodicSync(5); // Every 5 minutes
      
      return () => {
        if (periodicSyncRef.current) {
          periodicSyncRef.current();
          periodicSyncRef.current = null;
        }
      };
    }
  }, [isAuthenticated]);

  return {
    // Session state
    sessionState,
    
    // Notifications
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    
    // Network status
    networkStatus,
    
    // Actions
    refreshSessionData,
    performSessionOperation,
    
    // Utilities
    isLoading: sessionState.isLoading,
    hasError: !!sessionState.error,
    isOnline: networkStatus.isOnline
  };
};

export default useSessionNotifications;