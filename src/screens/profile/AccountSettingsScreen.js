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

  useEffect(() => {
    loadAccountSettings();
    fetchStorageUsage();
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
                      ` (${dataUsage.breakdown.products.count})`}
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
                      ` (${dataUsage.breakdown.orders.count})`}
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
  clearCacheText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
});

export default AccountSettingsScreen;