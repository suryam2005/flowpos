// Session Notification Display Component
// Requirements: 10.2, 10.5 - Display session state change notifications and immediate feedback

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { colors } from '../styles/colors';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Individual notification item component
 */
const NotificationItem = ({ notification, onRemove, style }) => {
  const slideAnim = React.useRef(new Animated.Value(-screenWidth)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleRemove = () => {
    // Slide out animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      onRemove(notification.id);
    });
  };

  const getNotificationStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          backgroundColor: colors.success.light,
          borderColor: colors.success.main,
          iconColor: colors.success.main,
          icon: '✅'
        };
      case 'warning':
        return {
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          iconColor: '#f59e0b',
          icon: '⚠️'
        };
      case 'error':
        return {
          backgroundColor: colors.error.light,
          borderColor: colors.error.main,
          iconColor: colors.error.main,
          icon: '❌'
        };
      case 'info':
      default:
        return {
          backgroundColor: colors.primary.light,
          borderColor: colors.primary.main,
          iconColor: colors.primary.main,
          icon: 'ℹ️'
        };
    }
  };

  const notificationStyles = getNotificationStyles();

  return (
    <Animated.View
      style={[
        styles.notificationItem,
        {
          backgroundColor: notificationStyles.backgroundColor,
          borderColor: notificationStyles.borderColor,
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        },
        style
      ]}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationIcon}>{notificationStyles.icon}</Text>
          <Text style={[styles.notificationTitle, { color: notificationStyles.iconColor }]}>
            {notification.title}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleRemove}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        {notification.message && (
          <Text style={styles.notificationMessage}>{notification.message}</Text>
        )}
        {notification.timestamp && (
          <Text style={styles.notificationTime}>
            {new Date(notification.timestamp).toLocaleTimeString()}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

/**
 * Main notification display component
 * Requirements: 10.2 - Session state change notifications
 * Requirements: 10.5 - Immediate feedback for user actions
 */
const SessionNotificationDisplay = ({ 
  notifications = [], 
  onRemoveNotification,
  position = 'top',
  maxNotifications = 3
}) => {
  // Limit the number of visible notifications
  const visibleNotifications = notifications.slice(-maxNotifications);

  if (visibleNotifications.length === 0) {
    return null;
  }

  const containerStyle = position === 'bottom' ? styles.containerBottom : styles.containerTop;

  return (
    <View style={[styles.container, containerStyle]} pointerEvents="box-none">
      {visibleNotifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemoveNotification}
          style={[
            styles.notificationSpacing,
            { zIndex: 1000 - index } // Ensure proper stacking
          ]}
        />
      ))}
    </View>
  );
};

/**
 * Network status indicator component
 * Requirements: 10.3 - Graceful network error handling
 */
export const NetworkStatusIndicator = ({ networkStatus, onRetry }) => {
  if (networkStatus.isOnline) {
    return null;
  }

  return (
    <View style={styles.networkStatusContainer}>
      <View style={styles.networkStatusContent}>
        <Text style={styles.networkStatusIcon}>📵</Text>
        <View style={styles.networkStatusText}>
          <Text style={styles.networkStatusTitle}>Connection Issue</Text>
          <Text style={styles.networkStatusMessage}>
            {networkStatus.lastError || 'Unable to connect to server'}
          </Text>
        </View>
        {onRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/**
 * Session status indicator component
 * Requirements: 10.4 - Token expiration detection and handling
 */
export const SessionStatusIndicator = ({ sessionState, onRefresh }) => {
  if (!sessionState.error) {
    return null;
  }

  const isTokenError = sessionState.error.includes('token') || 
                      sessionState.error.includes('expired') || 
                      sessionState.error.includes('unauthorized');

  return (
    <View style={styles.sessionStatusContainer}>
      <View style={styles.sessionStatusContent}>
        <Text style={styles.sessionStatusIcon}>
          {isTokenError ? '🔐' : '⚠️'}
        </Text>
        <View style={styles.sessionStatusText}>
          <Text style={styles.sessionStatusTitle}>
            {isTokenError ? 'Session Expired' : 'Session Error'}
          </Text>
          <Text style={styles.sessionStatusMessage}>
            {isTokenError 
              ? 'Please log in again to continue' 
              : sessionState.error
            }
          </Text>
        </View>
        {!isTokenError && onRefresh && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  containerTop: {
    top: Platform.OS === 'ios' ? 60 : 40,
  },
  containerBottom: {
    bottom: Platform.OS === 'ios' ? 100 : 80,
  },
  notificationItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationSpacing: {
    marginBottom: 8,
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 8,
    textAlign: 'right',
  },
  
  // Network Status Styles
  networkStatusContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f59e0b',
    zIndex: 1001,
  },
  networkStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  networkStatusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  networkStatusText: {
    flex: 1,
  },
  networkStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  networkStatusMessage: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  // Session Status Styles
  sessionStatusContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.error.main,
    zIndex: 1001,
  },
  sessionStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
  },
  sessionStatusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sessionStatusText: {
    flex: 1,
  },
  sessionStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  sessionStatusMessage: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default SessionNotificationDisplay;