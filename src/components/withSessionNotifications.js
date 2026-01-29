// Higher-Order Component for Session Notifications
// Requirements: 10.2, 10.3, 10.4, 10.5 - Provide session notifications to any screen

import React from 'react';
import { View, StyleSheet } from 'react-native';
import useSessionNotifications from '../hooks/useSessionNotifications';
import SessionNotificationDisplay, { 
  NetworkStatusIndicator, 
  SessionStatusIndicator 
} from './SessionNotificationDisplay';

/**
 * Higher-Order Component that adds session notifications to any screen
 * Requirements: 10.2 - Session state change notifications
 * Requirements: 10.3 - Graceful network error handling
 * Requirements: 10.4 - Token expiration detection and handling
 * Requirements: 10.5 - Immediate feedback for user actions
 */
const withSessionNotifications = (WrappedComponent, options = {}) => {
  const {
    showNetworkStatus = true,
    showSessionStatus = true,
    showNotifications = true,
    notificationPosition = 'top',
    maxNotifications = 3,
    enableAutoRefresh = true
  } = options;

  const WithSessionNotificationsComponent = (props) => {
    const {
      sessionState,
      notifications,
      networkStatus,
      removeNotification,
      refreshSessionData,
      isOnline
    } = useSessionNotifications();

    // Pass session-related props to the wrapped component
    const sessionProps = {
      sessionState,
      networkStatus,
      refreshSessionData,
      isOnline,
      hasSessionError: !!sessionState.error,
      isSessionLoading: sessionState.isLoading
    };

    return (
      <View style={styles.container}>
        {/* Network Status Indicator */}
        {showNetworkStatus && (
          <NetworkStatusIndicator 
            networkStatus={networkStatus}
            onRetry={refreshSessionData}
          />
        )}
        
        {/* Session Status Indicator */}
        {showSessionStatus && (
          <SessionStatusIndicator 
            sessionState={sessionState}
            onRefresh={refreshSessionData}
          />
        )}
        
        {/* Wrapped Component */}
        <WrappedComponent 
          {...props} 
          {...sessionProps}
        />
        
        {/* Notification Display */}
        {showNotifications && (
          <SessionNotificationDisplay
            notifications={notifications}
            onRemoveNotification={removeNotification}
            position={notificationPosition}
            maxNotifications={maxNotifications}
          />
        )}
      </View>
    );
  };

  // Set display name for debugging
  WithSessionNotificationsComponent.displayName = 
    `withSessionNotifications(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithSessionNotificationsComponent;
};

/**
 * Hook version for functional components that need session notification data
 * Requirements: 10.2, 10.3, 10.4, 10.5
 */
export const useSessionNotificationData = () => {
  const {
    sessionState,
    notifications,
    networkStatus,
    addNotification,
    removeNotification,
    clearNotifications,
    refreshSessionData,
    performSessionOperation,
    isLoading,
    hasError,
    isOnline
  } = useSessionNotifications();

  return {
    // Session state
    sessionState,
    sessions: sessionState.sessions,
    deviceLimits: sessionState.deviceLimits,
    
    // Notifications
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    
    // Network status
    networkStatus,
    isOnline,
    
    // Actions
    refreshSessionData,
    performSessionOperation,
    
    // Status flags
    isSessionLoading: isLoading,
    hasSessionError: hasError,
    lastUpdate: sessionState.lastUpdate
  };
};

/**
 * Simplified HOC for screens that only need basic session awareness
 */
export const withBasicSessionNotifications = (WrappedComponent) => {
  return withSessionNotifications(WrappedComponent, {
    showNetworkStatus: false,
    showSessionStatus: false,
    showNotifications: true,
    notificationPosition: 'top',
    maxNotifications: 2
  });
};

/**
 * HOC for screens that need full session management capabilities
 */
export const withFullSessionNotifications = (WrappedComponent) => {
  return withSessionNotifications(WrappedComponent, {
    showNetworkStatus: true,
    showSessionStatus: true,
    showNotifications: true,
    notificationPosition: 'top',
    maxNotifications: 3,
    enableAutoRefresh: true
  });
};

/**
 * HOC for screens that only need network status
 */
export const withNetworkNotifications = (WrappedComponent) => {
  return withSessionNotifications(WrappedComponent, {
    showNetworkStatus: true,
    showSessionStatus: false,
    showNotifications: false
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default withSessionNotifications;