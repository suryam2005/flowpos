import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  Modal,
  Linking,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from '../../styles/colors';
import { safeGoBack } from '../../utils/navigationUtils';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import networkService from '../../services/NetworkService';
import sessionStateManager from '../../services/SessionStateManager';

const AccountSettingsScreen = ({ navigation }) => {
  const { changePassword, deleteAccount } = useAuth();
  
  const [settings, setSettings] = useState({
    autoLockEnabled: true,
    autoLockTime: 5, // minutes
    sessionTimeout: 30, // minutes
    loginNotifications: true,
    deviceManagement: true,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  });

  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deletePassword, setDeletePassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  // Eye button states for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [dataUsage, setDataUsage] = useState({
    totalStorage: '0 B',
    quotaStorage: '100 MB',
    usedPercentage: 0,
    breakdown: {
      products: { size: '0 B', percentage: 0 },
      orders: { size: '0 B', percentage: 0 },
      images: { size: '0 B', percentage: 0 },
    },
    subscription: {
      plan: 'trial',
      planName: 'Free Trial'
    }
  });
  const [deviceSessions, setDeviceSessions] = useState({
    count: 0,
    sessions: [],
    loading: true,
  });

  useEffect(() => {
    loadAccountSettings();
    fetchStorageUsage();
    fetchDeviceSessions();

    // Add SessionStateManager listener for real-time updates (Requirements 4.1, 4.2)
    console.log('🔄 Setting up SessionStateManager listener...');
    const removeListener = sessionStateManager.addListener((eventType, data) => {
      console.log(`📱 Session state event: ${eventType}`, data);
      
      switch (eventType) {
        case 'sessions_updated':
        case 'session_operation_completed':
          // Update device sessions with fresh data
          if (data.sessions) {
            setDeviceSessions({
              count: data.sessions.length,
              sessions: data.sessions,
              loading: false,
            });
          }
          break;
        
        case 'logout_completed':
        case 'cache_invalidated':
          // Refresh session data after operations
          fetchDeviceSessions();
          break;
        
        default:
          // Handle other events if needed
          break;
      }
    });

    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setDeviceSessions(prev => {
        if (prev.loading) {
          console.log('⏰ Device sessions loading timeout, setting to not loading');
          return {
            ...prev,
            loading: false,
          };
        }
        return prev;
      });
    }, 20000); // Increased to 20 seconds for initial load

    // Cleanup listener and timeout on unmount
    return () => {
      console.log('🧹 Cleaning up SessionStateManager listener and timeout...');
      removeListener();
      clearTimeout(loadingTimeout);
    };
  }, []);

  // FIXED: Back prevention during critical operations (password change, account deletion)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isLoading) {
        // Prevent back during loading operations
        Alert.alert(
          'Operation in Progress',
          'Please wait for the current operation to complete.',
          [{ text: 'OK', style: 'default' }]
        );
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [isLoading]);

  const loadAccountSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('accountSettings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading account settings:', error);
    }
  };

  // Fetch real storage usage from backend API
  const fetchStorageUsage = async () => {
    try {
      setIsLoadingStorage(true);
      console.log('📊 Fetching storage usage from API...');
      
      const response = await networkService.apiCall('/subscription/storage', {
        method: 'GET'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('✅ Storage data received:', result.data);
          setDataUsage(result.data);
        }
      } else {
        console.log('⚠️ Failed to fetch storage, using fallback calculation');
        await calculateLocalStorageUsage();
      }
    } catch (error) {
      console.error('Error fetching storage usage:', error);
      // Fallback to local calculation
      await calculateLocalStorageUsage();
    } finally {
      setIsLoadingStorage(false);
    }
  };

  // Fallback: Calculate local storage usage if API fails
  const calculateLocalStorageUsage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }
      
      // Format size
      const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      setDataUsage(prev => ({
        ...prev,
        totalStorage: formatBytes(totalSize),
        totalStorageBytes: totalSize,
        quotaStorage: '100 MB',
        quotaStorageBytes: 100 * 1024 * 1024,
        usedPercentage: Math.round((totalSize / (100 * 1024 * 1024)) * 100),
        breakdown: {
          products: { size: formatBytes(totalSize * 0.3), percentage: 30 },
          orders: { size: formatBytes(totalSize * 0.4), percentage: 40 },
          images: { size: formatBytes(totalSize * 0.3), percentage: 30 },
        }
      }));
    } catch (error) {
      console.error('Error calculating local data usage:', error);
    }
  };

  // Fetch active device sessions using SessionStateManager with improved error handling
  const fetchDeviceSessions = async () => {
    try {
      setDeviceSessions(prev => ({ ...prev, loading: true }));
      console.log('📱 Fetching active device sessions via SessionStateManager...');
      
      // Check if we have a valid token first
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        console.log('⚠️ No access token found, cannot fetch device sessions');
        setDeviceSessions({
          count: 0,
          sessions: [],
          loading: false,
        });
        return;
      }
      
      console.log('🔑 Access token found, proceeding with API call...');
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SessionStateManager timeout')), 15000) // Increased to 15 seconds
      );
      
      // Use SessionStateManager for consistent session data (Requirements 4.1, 4.2, 4.3)
      const sessionsPromise = sessionStateManager.fetchActiveSessions();
      const sessions = await Promise.race([sessionsPromise, timeoutPromise]);
      
      console.log(`✅ Device sessions received via SessionStateManager: ${sessions.length} sessions`);
      setDeviceSessions({
        count: sessions.length,
        sessions: sessions,
        loading: false,
      });
      
    } catch (error) {
      console.error('❌ Error fetching device sessions via SessionStateManager:', error);
      
      // Fallback to direct API call if SessionStateManager fails
      console.log('🔄 Falling back to direct API call...');
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Fallback API timeout')), 12000) // Increased to 12 seconds
        );
        
        const apiPromise = networkService.apiCall('/devices/sessions', {
          method: 'GET'
        });
        
        const response = await Promise.race([apiPromise, timeoutPromise]);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.sessions) {
            console.log('✅ Device sessions received via fallback:', result.sessions);
            setDeviceSessions({
              count: result.totalSessions || result.sessions.length,
              sessions: result.sessions,
              loading: false,
            });
          } else {
            console.log('⚠️ No device sessions found');
            setDeviceSessions({
              count: 0,
              sessions: [],
              loading: false,
            });
          }
        } else {
          console.log('⚠️ Failed to fetch device sessions, setting empty state');
          setDeviceSessions({
            count: 0,
            sessions: [],
            loading: false,
          });
        }
      } catch (fallbackError) {
        console.error('❌ Fallback API call also failed:', fallbackError);
        // CRITICAL FIX: Always set loading to false, even on complete failure
        setDeviceSessions({
          count: 0,
          sessions: [],
          loading: false,
        });
      }
    }
  };

  // Simple direct API call for device sessions (bypass SessionStateManager)
  const fetchDeviceSessionsDirect = async () => {
    try {
      setDeviceSessions(prev => ({ ...prev, loading: true }));
      console.log('📱 Fetching device sessions directly from API...');
      
      const response = await networkService.apiCall('/devices/sessions', {
        method: 'GET'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.sessions) {
          console.log('✅ Device sessions received directly:', result.sessions);
          setDeviceSessions({
            count: result.totalSessions || result.sessions.length,
            sessions: result.sessions,
            loading: false,
          });
        } else {
          console.log('⚠️ No device sessions found in direct call');
          setDeviceSessions({
            count: 0,
            sessions: [],
            loading: false,
          });
        }
      } else {
        console.log('⚠️ Direct API call failed:', response.status);
        setDeviceSessions({
          count: 0,
          sessions: [],
          loading: false,
        });
      }
    } catch (error) {
      console.error('❌ Direct API call failed:', error);
      setDeviceSessions({
        count: 0,
        sessions: [],
        loading: false,
      });
    }
  };

  // Logout all other devices using enhanced session management
  const handleLogoutAllOtherDevices = () => {
    const otherDevicesCount = Math.max(0, deviceSessions.count - 1);
    
    if (otherDevicesCount === 0) {
      Alert.alert(
        'No Other Devices',
        'You are only logged in on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Logout All Other Devices',
      `This will log you out from ${otherDevicesCount} other device${otherDevicesCount !== 1 ? 's' : ''}. You will remain logged in on this device.\n\nThis action will:\n• End all other active sessions\n• Clear session data from database\n• Keep your current session active`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log('🚪 Logging out all other devices with enhanced session management...');
              
              // First try SessionStateManager for consistent state management
              try {
                const result = await sessionStateManager.handleLogoutAllOthers();
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                // SessionStateManager will automatically update the UI via listeners
                setIsLoading(false);
                
                Alert.alert(
                  'Success',
                  result.message || `Successfully logged out from ${result.loggedOutCount || otherDevicesCount} other device${(result.loggedOutCount || otherDevicesCount) !== 1 ? 's' : ''}. All session data has been cleared from the database.`,
                  [{ text: 'OK' }]
                );
                
              } catch (sessionManagerError) {
                console.error('SessionStateManager failed, trying direct API:', sessionManagerError);
                
                // Fallback to direct API call with enhanced error handling
                try {
                  const response = await networkService.apiCall('/devices/sessions/all/others', {
                    method: 'DELETE'
                  });

                  if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Logged out from other devices via direct API:', result);
                    
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    
                    // Force refresh session data after successful logout
                    setTimeout(async () => {
                      try {
                        sessionStateManager.invalidateSessionCache();
                        await fetchDeviceSessions();
                      } catch (refreshError) {
                        console.error('Error refreshing sessions after logout:', refreshError);
                      }
                      
                      Alert.alert(
                        'Success',
                        `Successfully logged out from ${result.loggedOutCount || otherDevicesCount} other device${(result.loggedOutCount || otherDevicesCount) !== 1 ? 's' : ''}. All session data has been cleared.`,
                        [{ text: 'OK' }]
                      );
                    }, 1000);
                  } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}: Failed to logout other devices`);
                  }
                } catch (directApiError) {
                  console.error('❌ Direct API also failed:', directApiError);
                  throw directApiError;
                }
              }
              
            } catch (error) {
              console.error('❌ Complete failure logging out other devices:', error);
              setIsLoading(false);
              
              // CRITICAL FIX: If logout completely fails, try to clear local session cache anyway
              try {
                console.log('🔄 Clearing local session cache as fallback...');
                sessionStateManager.invalidateSessionCache();
                await fetchDeviceSessions();
                
                Alert.alert(
                  'Logout Partially Failed',
                  `Failed to logout other devices from server: ${error.message}\n\nLocal session data has been cleared. Other devices may still be logged in. Please check your connection and try again, or contact support if the issue persists.`,
                  [
                    { text: 'OK' },
                    {
                      text: 'Refresh & Retry',
                      onPress: async () => {
                        await fetchDeviceSessions();
                        // Allow user to try again after refresh
                      }
                    }
                  ]
                );
              } catch (fallbackError) {
                console.error('❌ Even fallback cache clear failed:', fallbackError);
                
                Alert.alert(
                  'Logout Failed',
                  `Failed to logout other devices: ${error.message}\n\nUnable to clear local cache. Please restart the app and try again. If the problem persists, contact support.`,
                  [
                    { text: 'OK' },
                    {
                      text: 'Refresh & Retry',
                      onPress: async () => {
                        await fetchDeviceSessions();
                        // Allow user to try again after refresh
                      }
                    }
                  ]
                );
              }
            }
          },
        },
      ]
    );
  };





  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('accountSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving account settings:', error);
      Alert.alert('Error', 'Failed to save account settings');
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };



  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      // Use the new changePassword API
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      // Success - close modal and reset form
      setChangePasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Password Changed',
        'Your password has been successfully updated.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error changing password:', error);
      
      // Handle specific error messages
      let errorMessage = 'Failed to change password. Please try again.';
      if (error.message.includes('Current password is incorrect')) {
        errorMessage = 'Current password is incorrect. Please check and try again.';
      } else if (error.message.includes('timeout') || error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.\n\nYou will need to enter your password to confirm.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => setDeleteAccountModal(true),
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Password Required', 'Please enter your password to delete your account');
      return;
    }

    setIsLoading(true);
    try {
      await deleteAccount(deletePassword);
      
      // Close modal immediately
      setDeleteAccountModal(false);
      setDeletePassword('');
      
      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted. You will now be signed out.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to initial screen after account deletion
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Delete account error:', error);
      
      let errorMessage = 'Failed to delete account. Please try again.';
      if (error.message.includes('Invalid password')) {
        errorMessage = 'Invalid password. Please enter your current password.';
      } else if (error.message.includes('User not found')) {
        errorMessage = 'Account not found or already deleted.';
      }
      
      Alert.alert('Delete Account Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to contact our support team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email Support',
          onPress: () => Linking.openURL('mailto:support@flowpos.com?subject=Account Support Request'),
        },
        {
          text: 'WhatsApp Support',
          onPress: () => Linking.openURL('https://wa.me/919876543210?text=Hi, I need help with my FlowPOS account'),
        },
      ]
    );
  };

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(navigation, 'Profile')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Security */}
        {renderSection('Security', (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setChangePasswordModal(true)}
            >
              <Ionicons name="key-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </>
        ))}

        {/* Logged In Devices */}
        {renderSection('Logged In Devices', (
          <>
            <View style={styles.deviceSessionsCard}>
              <View style={styles.deviceSessionsHeader}>
                <View style={styles.deviceSessionsInfo}>
                  <Ionicons name="phone-portrait-outline" size={24} color={colors.primary.main} />
                  <View style={styles.deviceSessionsTextContainer}>
                    <Text style={styles.deviceSessionsTitle}>Active Devices</Text>
                    <Text style={styles.deviceSessionsSubtitle}>
                      {deviceSessions.loading 
                        ? 'Loading device information...' 
                        : deviceSessions.count === 0 && deviceSessions.sessions.length === 0
                          ? 'No active devices found. Try refreshing or check your connection.'
                          : deviceSessions.count === 1
                            ? 'Only this device is currently logged in'
                            : `${deviceSessions.count} devices currently logged in (including this device)`
                      }
                    </Text>
                  </View>
                </View>
                <View style={styles.deviceCountBadge}>
                  <Text style={styles.deviceCountText}>
                    {deviceSessions.loading ? '...' : deviceSessions.count}
                  </Text>
                </View>
              </View>
              
              {!deviceSessions.loading && deviceSessions.sessions.length > 0 && (
                <View style={styles.deviceSessionsList}>
                  {deviceSessions.sessions.slice(0, 3).map((session, index) => (
                    <View key={session.id || index} style={styles.deviceSessionItem}>
                      <Ionicons 
                        name={session.isCurrent ? "phone-portrait" : "phone-portrait-outline"} 
                        size={16} 
                        color={session.isCurrent ? colors.success.main : colors.text.secondary} 
                      />
                      <Text style={styles.deviceSessionName}>
                        {session.deviceName || 'Unknown Device'}
                        {session.isCurrent && ' (This device)'}
                      </Text>
                    </View>
                  ))}
                  {deviceSessions.sessions.length > 3 && (
                    <Text style={styles.moreDevicesText}>
                      +{deviceSessions.sessions.length - 3} more device{deviceSessions.sessions.length - 3 > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              )}
              
              {!deviceSessions.loading && deviceSessions.sessions.length === 0 && (
                <View style={styles.noDevicesContainer}>
                  <Text style={styles.noDevicesText}>
                    No active devices found. Try refreshing or check your connection.
                  </Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={async () => {
                  // Force refresh via SessionStateManager (Requirements 4.1, 4.3)
                  console.log('🔄 Force refreshing sessions via SessionStateManager...');
                  setDeviceSessions(prev => ({ ...prev, loading: true }));
                  
                  try {
                    sessionStateManager.invalidateSessionCache();
                    await fetchDeviceSessions();
                  } catch (error) {
                    console.error('❌ Error during manual refresh:', error);
                    // Ensure loading state is cleared even on error
                    setDeviceSessions(prev => ({ ...prev, loading: false }));
                  }
                }}
                disabled={deviceSessions.loading}
              >
                {deviceSessions.loading ? (
                  <Text style={styles.refreshButtonText}>Loading...</Text>
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color={colors.primary.main} />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {/* Direct API Refresh Button (fallback) */}
              {!deviceSessions.loading && deviceSessions.count === 0 && (
                <TouchableOpacity 
                  style={[styles.refreshButton, { marginTop: 8 }]}
                  onPress={fetchDeviceSessionsDirect}
                >
                  <Ionicons name="cloud-download-outline" size={16} color={colors.info.main} />
                  <Text style={[styles.refreshButtonText, { color: colors.info.main }]}>
                    Try Direct Connection
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Logout All Other Devices Button */}
              {!deviceSessions.loading && deviceSessions.count > 1 && (
                <TouchableOpacity 
                  style={styles.logoutAllButton}
                  onPress={handleLogoutAllOtherDevices}
                  disabled={isLoading}
                >
                  <Ionicons name="log-out-outline" size={16} color={colors.error.main} />
                  <Text style={styles.logoutAllButtonText}>
                    {isLoading ? 'Logging out...' : 'Logout All Other Devices'}
                  </Text>
                </TouchableOpacity>
              )}
              

            </View>
          </>
        ))}

        {/* Data Usage */}
        {renderSection('Data Usage', (
          <>
            <View style={styles.dataUsageCard}>
              <View style={styles.dataUsageHeader}>
                <View>
                  <Text style={styles.dataUsageTitle}>Storage Usage</Text>
                  <Text style={styles.dataUsagePlan}>
                    {dataUsage.subscription?.planName || 'Free Trial'}
                  </Text>
                </View>
                <View style={styles.dataUsageTotalContainer}>
                  <Text style={styles.dataUsageTotal}>{dataUsage.totalStorage}</Text>
                  <Text style={styles.dataUsageQuota}>/ {dataUsage.quotaStorage}</Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${Math.min(dataUsage.usedPercentage || 0, 100)}%`,
                      backgroundColor: dataUsage.isOverLimit 
                        ? colors.error.main 
                        : dataUsage.isNearLimit 
                          ? colors.warning.main 
                          : colors.primary.main
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {dataUsage.usedPercentage?.toFixed(1) || 0}% used
                {dataUsage.isNearLimit && !dataUsage.isOverLimit && ' - Near limit'}
                {dataUsage.isOverLimit && ' - Over limit!'}
              </Text>
              
              <View style={styles.dataUsageBreakdown}>
                <View style={styles.dataUsageItem}>
                  <View style={styles.dataUsageItemLeft}>
                    <Ionicons name="cube-outline" size={16} color={colors.primary.main} />
                    <Text style={styles.dataUsageLabel}>Products</Text>
                  </View>
                  <Text style={styles.dataUsageValue}>
                    {dataUsage.breakdown?.products?.size || '0 B'}
                    {dataUsage.breakdown?.products?.count !== undefined && 
                      ` (${dataUsage.breakdown?.products?.count})`}
                  </Text>
                </View>
                <View style={styles.dataUsageItem}>
                  <View style={styles.dataUsageItemLeft}>
                    <Ionicons name="receipt-outline" size={16} color={colors.success.main} />
                    <Text style={styles.dataUsageLabel}>Orders</Text>
                  </View>
                  <Text style={styles.dataUsageValue}>
                    {dataUsage.breakdown?.orders?.size || '0 B'}
                    {dataUsage.breakdown?.orders?.count !== undefined && 
                      ` (${dataUsage.breakdown?.orders?.count})`}
                  </Text>
                </View>
                <View style={styles.dataUsageItem}>
                  <View style={styles.dataUsageItemLeft}>
                    <Ionicons name="storefront-outline" size={16} color={colors.text.secondary} />
                    <Text style={styles.dataUsageLabel}>Store Info</Text>
                  </View>
                  <Text style={styles.dataUsageValue}>
                    {dataUsage.breakdown?.store?.size || '0 B'}
                  </Text>
                </View>
              </View>
              
              {/* Refresh Button */}
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchStorageUsage}
                disabled={isLoadingStorage}
              >
                {isLoadingStorage ? (
                  <Text style={styles.refreshButtonText}>Loading...</Text>
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color={colors.primary.main} />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ))}

        {/* Account Actions */}
        {renderSection('Account Actions', (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleContactSupport}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Contact Support</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </>
        ))}

        {/* Danger Zone */}
        {renderSection('Danger Zone', (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error.main} />
              <Text style={[styles.actionButtonText, styles.dangerText]}>Delete Account</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.error.main} />
            </TouchableOpacity>
          </>
        ))}
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={changePasswordModal}
        onRequestClose={() => {
          // FIXED: Prevent closing modal during loading
          if (!isLoading) {
            setChangePasswordModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                style={[styles.closeButton, isLoading && styles.closeButtonDisabled]}
                onPress={() => !isLoading && setChangePasswordModal(false)}
                disabled={isLoading}
              >
                <Ionicons name="close" size={24} color={isLoading ? colors.text.tertiary : colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChangeText={(text) => setPasswordForm({...passwordForm, currentPassword: text})}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showCurrentPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color={colors.text.secondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password"
                    value={passwordForm.newPassword}
                    onChangeText={(text) => setPasswordForm({...passwordForm, newPassword: text})}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showNewPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color={colors.text.secondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChangeText={(text) => setPasswordForm({...passwordForm, confirmPassword: text})}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color={colors.text.secondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deleteAccountModal}
        onRequestClose={() => {
          // FIXED: Prevent closing modal during loading
          if (!isLoading) {
            setDeleteAccountModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <TouchableOpacity
                style={[styles.closeButton, isLoading && styles.closeButtonDisabled]}
                onPress={() => !isLoading && setDeleteAccountModal(false)}
                disabled={isLoading}
              >
                <Ionicons name="close" size={24} color={isLoading ? colors.text.tertiary : colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.warningText}>
                ⚠️ This action cannot be undone. All your data will be permanently deleted.
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Enter your password to confirm</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    placeholder="Current password"
                    secureTextEntry={!showDeletePassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowDeletePassword(!showDeletePassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showDeletePassword ? "eye-off" : "eye"} 
                      size={20} 
                      color={colors.text.secondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.deleteButton, !deletePassword.trim() && styles.disabledButton]}
                onPress={confirmDeleteAccount}
                disabled={!deletePassword.trim() || isLoading}
              >
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      <LoadingSpinner visible={isLoading} />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingTitleDisabled: {
    color: colors.text.secondary,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  settingSubtitleDisabled: {
    color: colors.text.tertiary,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  timeSelectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginRight: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dangerButton: {
    borderBottomWidth: 0,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: 12,
  },
  dangerText: {
    color: colors.error.main,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    padding: 20,
  },
  warningText: {
    fontSize: 14,
    color: colors.error.main,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: colors.error.main,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: colors.border.light,
    opacity: 0.6,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  eyeButton: {
    padding: 12,
  },
  saveButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  dataUsageCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginHorizontal: 20,
  },
  dataUsageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dataUsageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  dataUsagePlan: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  dataUsageTotalContainer: {
    alignItems: 'flex-end',
  },
  dataUsageTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.main,
  },
  dataUsageQuota: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border.light,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  dataUsageBreakdown: {
    marginBottom: 12,
  },
  dataUsageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dataUsageItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataUsageLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  dataUsageValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  logoutAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: colors.error.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error.main,
  },
  logoutAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error.main,
  },

  clearCacheText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  deviceSessionsCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginHorizontal: 20,
  },
  deviceSessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceSessionsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  deviceSessionsTextContainer: {
    flex: 1,
  },
  deviceSessionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  deviceSessionsSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  deviceCountBadge: {
    backgroundColor: colors.primary.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary.main,
  },
  deviceSessionsList: {
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  deviceSessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  deviceSessionName: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  moreDevicesText: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 24,
  },
  noDevicesContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  noDevicesText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AccountSettingsScreen;