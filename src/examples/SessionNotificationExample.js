// Session Notification Integration Example
// Requirements: 10.2, 10.3, 10.4, 10.5 - Demonstrate session notification mechanisms

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSessionNotifications from '../hooks/useSessionNotifications';
import SessionNotificationDisplay, { 
  NetworkStatusIndicator, 
  SessionStatusIndicator 
} from '../components/SessionNotificationDisplay';
import withSessionNotifications, { 
  useSessionNotificationData,
  withFullSessionNotifications 
} from '../components/withSessionNotifications';
import { colors } from '../styles/colors';

/**
 * Example component demonstrating session notifications
 * Requirements: 10.2 - Session state change notifications
 * Requirements: 10.5 - Immediate feedback for user actions
 */
const SessionNotificationExample = () => {
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

  /**
   * Demonstrate adding different types of notifications
   */
  const handleAddNotification = (type) => {
    const notificationConfigs = {
      success: {
        type: 'success',
        title: 'Success!',
        message: 'Operation completed successfully',
        duration: 3000
      },
      warning: {
        type: 'warning',
        title: 'Warning',
        message: 'Please check your device limits',
        duration: 5000
      },
      error: {
        type: 'error',
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        duration: 5000
      },
      info: {
        type: 'info',
        title: 'Information',
        message: 'Session data has been updated',
        duration: 4000
      }
    };

    const config = notificationConfigs[type];
    if (config) {
      addNotification(config);
    }
  };

  /**
   * Demonstrate session operations
   */
  const handleSessionOperation = async (operation) => {
    try {
      switch (operation) {
        case 'refresh':
          await refreshSessionData();
          break;
        case 'logout_device':
          // Simulate logout device operation
          addNotification({
            type: 'info',
            title: 'Device Logout',
            message: 'Simulated device logout operation',
            duration: 3000
          });
          break;
        case 'logout_all_others':
          // Simulate logout all others operation
          addNotification({
            type: 'success',
            title: 'All Others Logged Out',
            message: 'Simulated logout all other devices',
            duration: 3000
          });
          break;
      }
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Network Status Indicator */}
      <NetworkStatusIndicator 
        networkStatus={networkStatus}
        onRetry={refreshSessionData}
      />
      
      {/* Session Status Indicator */}
      <SessionStatusIndicator 
        sessionState={sessionState}
        onRefresh={refreshSessionData}
      />
      
      {/* Notification Display */}
      <SessionNotificationDisplay
        notifications={notifications}
        onRemoveNotification={removeNotification}
        position="top"
        maxNotifications={3}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Session Notifications Demo</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearNotifications}
          activeOpacity={0.7}
        >
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Network:</Text>
              <Text style={[
                styles.statusValue,
                { color: isOnline ? colors.success.main : colors.error.main }
              ]}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Loading:</Text>
              <Text style={styles.statusValue}>
                {isLoading ? '⏳ Yes' : '✅ No'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Error:</Text>
              <Text style={styles.statusValue}>
                {hasError ? '❌ Yes' : '✅ No'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Sessions:</Text>
              <Text style={styles.statusValue}>
                {sessionState.sessions.length}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Notifications:</Text>
              <Text style={styles.statusValue}>
                {notifications.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Notification Demo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Notifications</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[styles.demoButton, styles.successButton]}
              onPress={() => handleAddNotification('success')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Success</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.demoButton, styles.warningButton]}
              onPress={() => handleAddNotification('warning')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Warning</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.demoButton, styles.errorButton]}
              onPress={() => handleAddNotification('error')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Error</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.demoButton, styles.infoButton]}
              onPress={() => handleAddNotification('info')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Info</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Session Operations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Operations</Text>
          <View style={styles.buttonColumn}>
            <TouchableOpacity
              style={[styles.operationButton, styles.primaryButton]}
              onPress={() => handleSessionOperation('refresh')}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Text style={styles.operationButtonText}>
                {isLoading ? 'Refreshing...' : 'Refresh Session Data'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.operationButton, styles.secondaryButton]}
              onPress={() => handleSessionOperation('logout_device')}
              activeOpacity={0.7}
            >
              <Text style={styles.operationButtonText}>
                Simulate Device Logout
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.operationButton, styles.secondaryButton]}
              onPress={() => handleSessionOperation('logout_all_others')}
              activeOpacity={0.7}
            >
              <Text style={styles.operationButtonText}>
                Simulate Logout All Others
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Device Limits Section */}
        {sessionState.deviceLimits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Limits</Text>
            <View style={styles.limitsCard}>
              <View style={styles.limitsHeader}>
                <Text style={styles.limitsTitle}>Usage</Text>
                <Text style={styles.limitsCount}>
                  {sessionState.deviceLimits.currentDevices} / {sessionState.deviceLimits.maxDevices}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, (sessionState.deviceLimits.currentDevices / sessionState.deviceLimits.maxDevices) * 100)}%`,
                      backgroundColor: sessionState.deviceLimits.currentDevices >= sessionState.deviceLimits.maxDevices 
                        ? colors.error.main 
                        : colors.primary.main
                    }
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Active Sessions Section */}
        {sessionState.sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Sessions</Text>
            {sessionState.sessions.map((session, index) => (
              <View key={session.id || index} style={styles.sessionCard}>
                <Text style={styles.sessionName}>
                  {session.deviceName || `Device ${index + 1}`}
                </Text>
                <Text style={styles.sessionType}>
                  {session.deviceType || 'Unknown'} 
                  {session.isCurrent ? ' • Current' : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Debug Information */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debug Info</Text>
            <View style={styles.debugCard}>
              <Text style={styles.debugText}>
                Last Update: {sessionState.lastUpdate || 'Never'}
              </Text>
              <Text style={styles.debugText}>
                Network Retry Count: {networkStatus.retryCount}
              </Text>
              <Text style={styles.debugText}>
                Error: {sessionState.error || 'None'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Example of using the HOC wrapper
 */
const WrappedExample = withFullSessionNotifications(({ sessionState, networkStatus }) => (
  <View style={styles.container}>
    <Text style={styles.headerTitle}>HOC Wrapped Component</Text>
    <Text style={styles.statusText}>
      Sessions: {sessionState?.sessions?.length || 0}
    </Text>
    <Text style={styles.statusText}>
      Network: {networkStatus?.isOnline ? 'Online' : 'Offline'}
    </Text>
  </View>
));

/**
 * Example of using the hook version
 */
const HookExample = () => {
  const {
    sessions,
    deviceLimits,
    isOnline,
    isSessionLoading,
    hasSessionError,
    refreshSessionData
  } = useSessionNotificationData();

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Hook Data Example</Text>
      <Text style={styles.statusText}>Sessions: {sessions.length}</Text>
      <Text style={styles.statusText}>Online: {isOnline ? 'Yes' : 'No'}</Text>
      <Text style={styles.statusText}>Loading: {isSessionLoading ? 'Yes' : 'No'}</Text>
      <Text style={styles.statusText}>Error: {hasSessionError ? 'Yes' : 'No'}</Text>
      
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={refreshSessionData}
        activeOpacity={0.7}
      >
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.gray[100],
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  
  // Status Card
  statusCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  statusText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  
  // Button Grid
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  demoButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  successButton: {
    backgroundColor: colors.success.main,
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
  errorButton: {
    backgroundColor: colors.error.main,
  },
  infoButton: {
    backgroundColor: colors.primary.main,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.background.surface,
  },
  
  // Button Column
  buttonColumn: {
    gap: 12,
  },
  operationButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary.main,
  },
  secondaryButton: {
    backgroundColor: colors.gray[600],
  },
  operationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.background.surface,
  },
  refreshButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.background.surface,
  },
  
  // Limits Card
  limitsCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  limitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  limitsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  limitsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Session Card
  sessionCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  
  // Debug Card
  debugCard: {
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    padding: 12,
  },
  debugText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});

export default SessionNotificationExample;
export { WrappedExample, HookExample };