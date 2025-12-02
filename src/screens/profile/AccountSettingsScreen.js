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
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from '../../styles/colors';
import { safeGoBack } from '../../utils/navigationUtils';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const AccountSettingsScreen = ({ navigation }) => {
  const { user, logout, changePassword, deleteAccount } = useAuth();
  
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
  const [activeSessions, setActiveSessions] = useState([
    {
      id: 1,
      device: 'iPhone 14 Pro',
      location: 'Mumbai, India',
      lastActive: '2 minutes ago',
      current: true,
    },
    {
      id: 2,
      device: 'Chrome Browser',
      location: 'Mumbai, India', 
      lastActive: '1 hour ago',
      current: false,
    },
  ]);
  const [loginHistory, setLoginHistory] = useState([
    {
      id: 1,
      device: 'iPhone 14 Pro',
      location: 'Mumbai, India',
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      success: true,
    },
    {
      id: 2,
      device: 'Chrome Browser',
      location: 'Mumbai, India',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      success: true,
    },
    {
      id: 3,
      device: 'Unknown Device',
      location: 'Delhi, India',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      success: false,
    },
  ]);

  useEffect(() => {
    loadAccountSettings();
  }, []);

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

  const handleManageActiveSessions = () => {
    Alert.alert(
      'Active Sessions',
      `You have ${activeSessions.length} active sessions`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Details',
          onPress: () => showActiveSessionsModal(),
        },
        {
          text: 'End All Others',
          style: 'destructive',
          onPress: () => handleEndAllOtherSessions(),
        },
      ]
    );
  };

  const showActiveSessionsModal = () => {
    const sessionList = activeSessions
      .map(session => `${session.device} - ${session.location} (${session.lastActive})${session.current ? ' - Current' : ''}`)
      .join('\n\n');
    
    Alert.alert('Active Sessions', sessionList, [
      { text: 'OK' },
      {
        text: 'End All Others',
        style: 'destructive',
        onPress: () => handleEndAllOtherSessions(),
      },
    ]);
  };

  const handleEndAllOtherSessions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveSessions(prev => prev.filter(session => session.current));
    Alert.alert('Success', 'All other sessions have been terminated');
  };

  const handleViewLoginHistory = () => {
    const historyList = loginHistory
      .map(login => {
        const status = login.success ? '✅' : '❌';
        const time = login.timestamp.toLocaleString();
        return `${status} ${login.device}\n${login.location} - ${time}`;
      })
      .join('\n\n');
    
    Alert.alert('Login History', historyList, [{ text: 'OK' }]);
  };

  const handleDownloadData = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const userData = {
        profile: {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          phone: user?.phone,
          created_at: user?.created_at,
        },
        settings: settings,
        export_date: new Date().toISOString(),
      };

      const dataString = JSON.stringify(userData, null, 2);
      
      await Share.share({
        message: `FlowPOS Account Data Export\n\nExported on: ${new Date().toLocaleDateString()}\n\nData:\n${dataString}`,
        title: 'FlowPOS Account Data',
      });
    } catch (error) {
      console.error('Error sharing data:', error);
      Alert.alert('Error', 'Failed to export data');
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

  const renderSettingItem = (title, subtitle, settingKey, onToggle = null, disabled = false) => (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, disabled && styles.settingSubtitleDisabled]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Switch
        value={settings[settingKey]}
        onValueChange={onToggle || ((value) => updateSetting(settingKey, value))}
        disabled={disabled}
        trackColor={{ false: colors.border.medium, true: colors.primary.background }}
        thumbColor={settings[settingKey] ? colors.primary.main : colors.text.tertiary}
      />
    </View>
  );

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
          onPress={() => safeGoBack(navigation)}
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

        {/* Session Management */}
        {renderSection('Session Management', (
          <>
            {renderSettingItem(
              'Auto Lock',
              'Automatically lock the app when inactive',
              'autoLockEnabled'
            )}

            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Auto Lock Time</Text>
                <Text style={styles.settingSubtitle}>
                  Lock app after {settings.autoLockTime} minutes of inactivity
                </Text>
              </View>
              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => {
                  Alert.alert(
                    'Auto Lock Time',
                    'Select auto lock time',
                    [
                      { text: '1 minute', onPress: () => updateSetting('autoLockTime', 1) },
                      { text: '5 minutes', onPress: () => updateSetting('autoLockTime', 5) },
                      { text: '10 minutes', onPress: () => updateSetting('autoLockTime', 10) },
                      { text: '30 minutes', onPress: () => updateSetting('autoLockTime', 30) },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={styles.timeSelectorText}>{settings.autoLockTime}m</Text>
                <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Session Timeout</Text>
                <Text style={styles.settingSubtitle}>
                  Automatically sign out after {settings.sessionTimeout} minutes
                </Text>
              </View>
              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => {
                  Alert.alert(
                    'Session Timeout',
                    'Select session timeout',
                    [
                      { text: '15 minutes', onPress: () => updateSetting('sessionTimeout', 15) },
                      { text: '30 minutes', onPress: () => updateSetting('sessionTimeout', 30) },
                      { text: '1 hour', onPress: () => updateSetting('sessionTimeout', 60) },
                      { text: '4 hours', onPress: () => updateSetting('sessionTimeout', 240) },
                      { text: 'Never', onPress: () => updateSetting('sessionTimeout', 0) },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={styles.timeSelectorText}>
                  {settings.sessionTimeout === 0 ? 'Never' : 
                   settings.sessionTimeout < 60 ? `${settings.sessionTimeout}m` : 
                   `${Math.floor(settings.sessionTimeout / 60)}h`}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </>
        ))}

        {/* Privacy */}
        {renderSection('Privacy', (
          <>
            {renderSettingItem(
              'Login Notifications',
              'Get notified when someone signs into your account',
              'loginNotifications'
            )}

            {renderSettingItem(
              'Device Management',
              'Allow managing devices that can access your account',
              'deviceManagement'
            )}
          </>
        ))}

        {/* Notifications */}
        {renderSection('Notifications', (
          <>
            {renderSettingItem(
              'Email Notifications',
              'Receive account updates via email',
              'emailNotifications'
            )}

            {renderSettingItem(
              'Push Notifications',
              'Receive push notifications on this device',
              'pushNotifications'
            )}

            {renderSettingItem(
              'SMS Notifications',
              'Receive important alerts via SMS',
              'smsNotifications'
            )}
          </>
        ))}

        {/* Account Actions */}
        {renderSection('Account Actions', (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleManageActiveSessions}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>
                Manage Active Sessions ({activeSessions.length})
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewLoginHistory}
            >
              <Ionicons name="time-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Login History</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadData}
            >
              <Ionicons name="download-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Download My Data</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

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
        onRequestClose={() => setChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setChangePasswordModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm({...passwordForm, currentPassword: text})}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({...passwordForm, newPassword: text})}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({...passwordForm, confirmPassword: text})}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <LoadingSpinner size="small" color={colors.background.surface} />
                ) : (
                  <Text style={styles.saveButtonText}>Change Password</Text>
                )}
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
        onRequestClose={() => setDeleteAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDeleteAccountModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.warningText}>
                ⚠️ This action cannot be undone. All your data will be permanently deleted.
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Enter your password to confirm</Text>
                <TextInput
                  style={styles.input}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Current password"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.deleteButton, !deletePassword.trim() && styles.disabledButton]}
                onPress={confirmDeleteAccount}
                disabled={!deletePassword.trim() || isLoading}
              >
                {isLoading ? (
                  <LoadingSpinner size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete My Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
});

export default AccountSettingsScreen;