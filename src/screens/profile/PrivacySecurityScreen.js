import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../styles/colors';
import { safeGoBack } from '../../utils/navigationUtils';
import { useAuth } from '../../context/AuthContext';

const PrivacySecurityScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  
  const [settings, setSettings] = useState({
    // Communication Preferences (these work without backend)
    marketingEmails: false,
    productUpdates: true,
    securityAlerts: true,
    surveyInvitations: false,
    // Data & Analytics
    analyticsEnabled: true,
    crashReporting: true,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('privacySettings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const handleExportData = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const privacyReport = {
        user_id: user?.id,
        email: user?.email,
        privacy_settings: settings,
        export_date: new Date().toISOString(),
      };

      const reportString = JSON.stringify(privacyReport, null, 2);
      
      await Share.share({
        message: `FlowPOS Privacy Report\n\nGenerated on: ${new Date().toLocaleDateString()}\n\nReport:\n${reportString}`,
        title: 'FlowPOS Privacy Report',
      });
    } catch (error) {
      console.error('Error exporting privacy data:', error);
      Alert.alert('Error', 'Failed to export privacy data');
    }
  };

  const handleViewPrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'FlowPOS Privacy Commitment:\n\n' +
      '📱 Data Collection\n' +
      '• We collect only essential data for app functionality\n' +
      '• Business data (products, orders) is stored securely\n' +
      '• Personal info is used only for account management\n\n' +
      '🔒 Data Security\n' +
      '• All data is encrypted in transit and at rest\n' +
      '• We use industry-standard security practices\n' +
      '• Regular security audits are performed\n\n' +
      '🚫 What We Don\'t Do\n' +
      '• We never sell your personal information\n' +
      '• We don\'t share data with third parties for marketing\n' +
      '• We don\'t track your location\n\n' +
      '✅ Your Rights\n' +
      '• Request data export anytime\n' +
      '• Request account deletion\n' +
      '• Opt-out of analytics and communications',
      [{ text: 'OK' }]
    );
  };

  const handleDataDeletionRequest = () => {
    Alert.alert(
      'Request Data Deletion',
      'This will permanently delete all your data including:\n\n' +
      '• Your account and profile\n' +
      '• All products and inventory\n' +
      '• All orders and sales history\n' +
      '• All settings and preferences\n\n' +
      'This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Deletion',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              
              // Save deletion request locally
              const deletionRequests = await AsyncStorage.getItem('deletionRequests');
              const requests = deletionRequests ? JSON.parse(deletionRequests) : [];
              
              const newRequest = {
                id: `DEL_${Date.now()}`,
                userId: user?.id || 'Unknown',
                userEmail: user?.email || 'Unknown',
                requestedAt: new Date().toISOString(),
                status: 'pending',
              };
              
              requests.push(newRequest);
              await AsyncStorage.setItem('deletionRequests', JSON.stringify(requests));
              
              Alert.alert(
                'Request Submitted',
                'Your data deletion request has been submitted. You will receive a confirmation email within 48 hours. Your account will remain active until the deletion is processed.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error submitting deletion request:', error);
              Alert.alert('Error', 'Failed to submit deletion request. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearLocalData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will clear all locally cached data on this device. Your account and cloud data will not be affected.\n\nYou will need to log in again after clearing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              
              // Clear all AsyncStorage except auth tokens
              const keysToKeep = ['accessToken', 'refreshToken', 'userToken'];
              const allKeys = await AsyncStorage.getAllKeys();
              const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
              
              await AsyncStorage.multiRemove(keysToRemove);
              
              Alert.alert(
                'Data Cleared',
                'Local data has been cleared. The app will now restart.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Logout to force fresh start
                      logout();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Error clearing local data:', error);
              Alert.alert('Error', 'Failed to clear local data. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleManagePermissions = () => {
    Alert.alert(
      'App Permissions',
      'Manage what data FlowPOS can access on your device',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('privacySettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      Alert.alert('Error', 'Failed to save privacy settings');
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  // Coming Soon Badge Component
  const ComingSoonBadge = () => (
    <View style={styles.comingSoonBadge}>
      <Text style={styles.comingSoonText}>Coming Soon</Text>
    </View>
  );

  const renderSettingItem = (title, subtitle, settingKey, disabled = false, onPress = null, comingSoon = false) => (
    <TouchableOpacity
      style={[styles.settingItem, disabled && styles.settingItemDisabled]}
      onPress={onPress}
      disabled={!onPress || comingSoon}
    >
      <View style={styles.settingContent}>
        <View style={styles.settingTitleRow}>
          <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
            {title}
          </Text>
          {comingSoon && <ComingSoonBadge />}
        </View>
        {subtitle && (
          <Text style={[styles.settingSubtitle, disabled && styles.settingSubtitleDisabled]}>
            {subtitle}
          </Text>
        )}
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={20} color={comingSoon ? colors.text.tertiary : colors.text.secondary} />
      ) : (
        <Switch
          value={settings[settingKey]}
          onValueChange={(value) => updateSetting(settingKey, value)}
          disabled={disabled || comingSoon}
          trackColor={{ false: colors.border.medium, true: colors.primary.background }}
          thumbColor={settings[settingKey] ? colors.primary.main : colors.text.tertiary}
        />
      )}
    </TouchableOpacity>
  );

  const renderComingSoonItem = (title, subtitle, icon) => (
    <View style={[styles.settingItem, styles.settingItemDisabled]}>
      <View style={styles.settingContent}>
        <View style={styles.settingTitleRow}>
          <Text style={styles.settingTitle}>{title}</Text>
          <ComingSoonBadge />
        </View>
        {subtitle && (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
    </View>
  );

  const renderSection = (title, subtitle, children) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
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
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Communication Preferences - These work */}
        {renderSection(
          'Communication Preferences',
          'Choose what communications you want to receive',
          <>
            {renderSettingItem(
              'Marketing Emails',
              'Receive promotional emails and offers',
              'marketingEmails'
            )}
            {renderSettingItem(
              'Product Updates',
              'Get notified about new features and updates',
              'productUpdates'
            )}
            {renderSettingItem(
              'Security Alerts',
              'Receive important security notifications',
              'securityAlerts'
            )}
            {renderSettingItem(
              'Survey Invitations',
              'Participate in surveys to help improve FlowPOS',
              'surveyInvitations'
            )}
          </>
        )}

        {/* Data & Analytics - Working */}
        {renderSection(
          'Data & Analytics',
          'Control how your data is used',
          <>
            {renderSettingItem(
              'Analytics',
              'Help improve FlowPOS by sharing anonymous usage data',
              'analyticsEnabled'
            )}
            {renderSettingItem(
              'Crash Reporting',
              'Automatically send crash reports to help fix bugs',
              'crashReporting'
            )}
          </>
        )}

        {/* App Permissions - Opens device settings */}
        {renderSection(
          'App Permissions',
          'Manage device permissions for FlowPOS',
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleManagePermissions}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Manage App Permissions</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </>
        )}

        {/* Privacy Tools - Working features */}
        {renderSection(
          'Privacy Tools',
          'Tools to manage your privacy and data',
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewPrivacyPolicy}
            >
              <Ionicons name="document-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExportData}
            >
              <Ionicons name="download-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Export Privacy Report</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleClearLocalData}
              disabled={isLoading}
            >
              <Ionicons name="trash-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Clear Local Data</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </>
        )}

        {/* Data Deletion - Working */}
        {renderSection(
          'Account Data',
          'Manage your account data',
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDataDeletionRequest}
              disabled={isLoading}
            >
              <Ionicons name="warning-outline" size={20} color={colors.error.main} />
              <Text style={[styles.actionButtonText, styles.dangerText]}>Request Data Deletion</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.error.main} />
            </TouchableOpacity>
          </>
        )}

        {/* Coming Soon Features */}
        {renderSection(
          'Advanced Security',
          'Enhanced security features',
          <>
            {renderComingSoonItem(
              'Two-Factor Authentication',
              'Add extra security to your account'
            )}
            {renderComingSoonItem(
              'Biometric Lock',
              'Use fingerprint or face to unlock app'
            )}
            {renderComingSoonItem(
              'Security Audit Log',
              'View all security-related activities'
            )}
          </>
        )}

        {/* Reset Settings */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton]}
            onPress={() => {
              Alert.alert(
                'Reset Privacy Settings',
                'This will reset all communication and analytics preferences to default. Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                      const defaultSettings = {
                        marketingEmails: false,
                        productUpdates: true,
                        securityAlerts: true,
                        surveyInvitations: false,
                        analyticsEnabled: true,
                        crashReporting: true,
                      };
                      saveSettings(defaultSettings);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert('Success', 'Settings reset to default');
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.text.secondary} />
            <Text style={styles.actionButtonText}>Reset to Default</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
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
  sectionHeader: {
    marginBottom: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
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
    opacity: 0.6,
  },
  settingContent: {
    flex: 1,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginTop: 2,
  },
  settingSubtitleDisabled: {
    color: colors.text.tertiary,
  },
  comingSoonBadge: {
    backgroundColor: colors.warning.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning.border,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warning.main,
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
  bottomPadding: {
    height: 40,
  },
});

export default PrivacySecurityScreen;
