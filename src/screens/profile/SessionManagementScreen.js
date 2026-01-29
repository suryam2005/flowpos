// Session Management Screen - Demonstrates frontend notification mechanisms
// Requirements: 10.2, 10.3, 10.4, 10.5 - Session state change notifications and user feedback

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';
import useSessionNotifications from '../../hooks/useSessionNotifications';
import SessionNotificationDisplay, { 
  NetworkStatusIndicator, 
  SessionStatusIndicator 
} from '../../components/SessionNotificationDisplay';
import LoadingSpinner from '../../components/LoadingSpinner';

const SessionManagementScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const {
    sessionState,
    notifications,
    networkStatus,
    removeNotification,
    clearNotifications,
    refreshSessionData,
    performSessionOperation,
    isLoading,
    hasError,
    isOnline
  } = useSessionNotifications();

  const [refreshing, setRefreshing] = useState(false);

  /**
   * Handle pull-to-refresh
   * Requirements: 10.5 - Immediate feedback for user actions
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshSessionData();
    } catch (error) {
      console.error('Error refreshing session data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshSessionData]);

  /**
   * Handle logout from specific device
   * Requirements: 10.5 - Immediate feedback for user actions
   */
  const handleLogoutDevice = useCallback(async (sessionId, deviceName) => {
    Alert.alert(
      'Logout Device',
      `Are you sure you want to logout "${deviceName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await performSessionOperation('logout_device', sessionId);
            } catch (error) {
              console.error('Error logging out device:', error);
            }
          }
        }
      ]
    );
  }, [performSessionOperation]);

  /**
   * Handle logout all other devices
   * Requirements: 10.5 - Immediate feedback for user actions
   */
  const handleLogoutAllOthers = useCallback(async () => {
    const otherDevices = sessionState.sessions.filter(s => !s.isCurrent);
    
    if (otherDevices.length === 0) {
      Alert.alert('No Other Devices', 'You are only logged in on this device.');
      return;
    }

    Alert.alert(
      'Logout All Other Devices',
      `This will logout ${otherDevices.length} other device${otherDevices.length !== 1 ? 's' : ''}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout All',
          style: 'destructive',
          onPress: async () => {
            try {
              await performSessionOperation('logout_all_others');
            } catch (error) {
              console.error('Error logging out all other devices:', error);
            }
          }
        }
      ]
    );
  }, [sessionState.sessions, performSessionOperation]);

  /**
   * Format device type for display
   */
  const formatDeviceType = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      case 'desktop': return '💻';
      default: return '📱';
    }
  };

  /**
   * Format last activity time
   */
  const formatLastActivity = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const currentSession = sessionState.sessions.find(s => s.isCurrent);
  const otherSessions = sessionState.sessions.filter(s => !s.isCurrent);

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Management</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearNotifications}
          activeOpacity={0.7}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.userCard}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userPlan}>
              Plan: {user?.subscription_plan || 'trial'}
            </Text>
          </View>
        </View>

        {/* Device Limits */}
        {sessionState.deviceLimits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Usage</Text>
            <View style={styles.limitsCard}>
              <View style={styles.limitsHeader}>
                <Text style={styles.limitsTitle}>Active Devices</Text>
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
              {sessionState.deviceLimits.currentDevices >= sessionState.deviceLimits.maxDevices && (
                <Text style={styles.limitWarning}>
                  ⚠️ Device limit reached. Logout other devices to add new ones.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Current Session */}
        {currentSession && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Device</Text>
            <View style={[styles.sessionCard, styles.currentSessionCard]}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionIcon}>
                  {formatDeviceType(currentSession.deviceType)}
                </Text>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionName}>
                    {currentSession.deviceName || 'This Device'}
                  </Text>
                  <Text style={styles.sessionType}>
                    {currentSession.deviceType || 'Unknown'} • Current
                  </Text>
                </View>
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              </View>
              <Text style={styles.sessionActivity}>
                Last activity: {formatLastActivity(currentSession.lastActivity)}
              </Text>
            </View>
          </View>
        )}

        {/* Other Sessions */}
        {otherSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Other Devices</Text>
              <TouchableOpacity
                style={styles.logoutAllButton}
                onPress={handleLogoutAllOthers}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutAllButtonText}>Logout All</Text>
              </TouchableOpacity>
            </View>
            
            {otherSessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionIcon}>
                    {formatDeviceType(session.deviceType)}
                  </Text>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName}>
                      {session.deviceName || 'Unknown Device'}
                    </Text>
                    <Text style={styles.sessionType}>
                      {session.deviceType || 'Unknown'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => handleLogoutDevice(session.id, session.deviceName)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.logoutButtonText}>Logout</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.sessionActivity}>
                  Last activity: {formatLastActivity(session.lastActivity)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="small" />
            <Text style={styles.loadingText}>Updating session data...</Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && sessionState.sessions.length === 0 && !hasError && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📱</Text>
            <Text style={styles.emptyStateTitle}>No Active Sessions</Text>
            <Text style={styles.emptyStateMessage}>
              You don't have any active sessions at the moment.
            </Text>
          </View>
        )}

        {/* Network Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Network:</Text>
              <Text style={[
                styles.statusValue,
                { color: isOnline ? colors.success.main : colors.error.main }
              ]}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </Text>
            </View>
            {sessionState.lastUpdate && (
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Last Update:</Text>
                <Text style={styles.statusValue}>
                  {new Date(sessionState.lastUpdate).toLocaleTimeString()}
                </Text>
              </View>
            )}
            {networkStatus.retryCount > 0 && (
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Retry Count:</Text>
                <Text style={styles.statusValue}>{networkStatus.retryCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Debug Info (Development only) */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debug Information</Text>
            <View style={styles.debugCard}>
              <Text style={styles.debugText}>
                Sessions: {sessionState.sessions.length}
              </Text>
              <Text style={styles.debugText}>
                Notifications: {notifications.length}
              </Text>
              <Text style={styles.debugText}>
                Loading: {isLoading ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.debugText}>
                Error: {hasError ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: colors.text.primary,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  
  // User Card
  userCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  userPlan: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '500',
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
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  limitWarning: {
    fontSize: 12,
    color: colors.error.main,
    fontStyle: 'italic',
  },
  
  // Session Cards
  sessionCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  currentSessionCard: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  sessionType: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  sessionActivity: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  currentBadge: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.background.surface,
  },
  
  // Buttons
  logoutAllButton: {
    backgroundColor: colors.error.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.background.surface,
  },
  logoutButton: {
    backgroundColor: colors.error.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.error.main,
  },
  
  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: colors.text.secondary,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Status Card
  statusCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statusItem: {
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
  
  // Debug Card
  debugCard: {
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    padding: 12,
  },
  debugText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
});

export default SessionManagementScreen;