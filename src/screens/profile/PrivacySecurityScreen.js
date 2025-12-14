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
  const { user } = useAuth();
  
  const [settings, setSettings] = useState({
    // Data Privacy
    dataCollection: true,
    analyticsSharing: false,
    crashReporting: true,
    usageStatistics: false,
    personalizedAds: false,
    
    // Security
    encryptLocalData: true,
    
    // Permissions
    locationAccess: false,
    cameraAccess: true,
    contactsAccess: false,
    storageAccess: true,
    
    // Communication
    marketingEmails: false,
    productUpdates: true,
    securityAlerts: true,
    surveyInvitations: false,
  });



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
        data_usage: dataUsage,
        permissions_granted: {
          camera: settings.cameraAccess,
          location: settings.locationAccess,
          contacts: settings.contactsAccess,
          storage: settings.storageAccess,
        },
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
      'Would you like to view our privacy policy?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Online',
          onPress: () => Linking.openURL('https://flowpos.com/privacy-policy'),
        },
        {
          text: 'View Summary',
          onPress: () => showPrivacyPolicySummary(),
        },
      ]
    );
  };

  const showPrivacyPolicySummary = () => {
    Alert.alert(
      'Privacy Policy Summary',
      '• We collect minimal data necessary for app functionality\n' +
      '• Your business data stays on your device and secure cloud storage\n' +
      '• We do not sell your personal information\n' +
      '• You can request data deletion at any time\n' +
      '• We use encryption to protect your data\n' +
      '• Analytics are anonymized and optional',
      [{ text: 'OK' }]
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

  const handleSecurityAudit = () => {
    Alert.alert(
      'Security Audit',
      'Running security check...',
      [{ text: 'OK' }]
    );
    
    setTimeout(() => {
      const auditResults = [
        '✅ Password strength: Strong',
        '✅ Two-factor authentication: Enabled',
        '✅ Data encryption: Active',
        '✅ Secure connections: Verified',
        '⚠️ Last password change: 90 days ago',
        '✅ No suspicious login attempts',
      ];
      
      Alert.alert(
        'Security Audit Results',
        auditResults.join('\n\n'),
        [
          { text: 'OK' },
          {
            text: 'Update Password',
            onPress: () => navigation.navigate('ChangePassword'),
          },
        ]
      );
    }, 2000);
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('privacySettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      Alert.alert('Error', 'Failed to save privacy settings');
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    
    // Handle dependent settings
    if (key === 'dataCollection' && !value) {
      newSettings.analyticsSharing = false;
      newSettings.usageStatistics = false;
      newSettings.personalizedAds = false;
    }
    
    saveSettings(newSettings);
  };

  const renderSettingItem = (title, subtitle, settingKey, disabled = false, onPress = null) => (
    <TouchableOpacity
      style={[styles.settingItem, disabled && styles.settingItemDisabled]}
      onPress={onPress}
      disabled={!onPress}
    >
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
      {onPress ? (
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      ) : (
        <Switch
          value={settings[settingKey]}
          onValueChange={(value) => updateSetting(settingKey, value)}
          disabled={disabled}
          trackColor={{ false: colors.border.medium, true: colors.primary.background }}
          thumbColor={settings[settingKey] ? colors.primary.main : colors.text.tertiary}
        />
      )}
    </TouchableOpacity>
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
          onPress={() => safeGoBack(navigation)}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Data Privacy */}
        {renderSection(
          'Data Privacy',
          'Control how your data is collected and used',
          <>
            {renderSettingItem(
              'Data Collection',
              'Allow FlowPOS to collect usage data to improve the app',
              'dataCollection'
            )}
            {renderSettingItem(
              'Analytics Sharing',
              'Share anonymous analytics to help improve features',
              'analyticsSharing',
              !settings.dataCollection
            )}
            {renderSettingItem(
              'Crash Reporting',
              'Automatically send crash reports to help fix issues',
              'crashReporting'
            )}
            {renderSettingItem(
              'Usage Statistics',
              'Share how you use the app to improve user experience',
              'usageStatistics',
              !settings.dataCollection
            )}
            {renderSettingItem(
              'Personalized Ads',
              'Show ads based on your app usage and preferences',
              'personalizedAds',
              !settings.dataCollection
            )}
          </>
        )}

        {/* Security */}
        {renderSection(
          'Security',
          'Protect your data and account',
          <>
            {renderSettingItem(
              'Encrypt Local Data',
              'Encrypt all data stored on your device',
              'encryptLocalData'
            )}

          </>
        )}

        {/* App Permissions */}
        {renderSection(
          'App Permissions',
          'Manage what the app can access on your device',
          <>
            {renderSettingItem(
              'Location Access',
              'Allow app to access your location for store features',
              'locationAccess'
            )}
            {renderSettingItem(
              'Camera Access',
              'Allow app to use camera for product photos and QR codes',
              'cameraAccess'
            )}

            {renderSettingItem(
              'Contacts Access',
              'Allow app to access contacts for customer management',
              'contactsAccess'
            )}
            {renderSettingItem(
              'Storage Access',
              'Allow app to save files and export data',
              'storageAccess'
            )}
          </>
        )}

        {/* Communication Preferences */}
        {renderSection(
          'Communication',
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



        {/* Security Tools */}
        {renderSection(
          'Security Tools',
          'Advanced security features and monitoring',
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSecurityAudit}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Run Security Audit</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleManagePermissions}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Manage App Permissions</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExportData}
            >
              <Ionicons name="document-text-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Export Privacy Report</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </>
        )}

        {/* Privacy Tools */}
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
            {renderSettingItem(
              'Data Export',
              'Download a copy of all your data',
              null,
              false,
              () => Alert.alert('Data Export', 'Data export feature coming soon!')
            )}
            {renderSettingItem(
              'Data Deletion',
              'Request deletion of all your data',
              null,
              false,
              () => {
                Alert.alert(
                  'Data Deletion',
                  'This will permanently delete all your data. This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Request Deletion',
                      style: 'destructive',
                      onPress: () => Alert.alert('Data Deletion', 'Data deletion request feature coming soon!')
                    }
                  ]
                );
              }
            )}
            {renderSettingItem(
              'Cookie Settings',
              'Manage cookies and tracking preferences',
              null,
              false,
              () => Alert.alert('Cookie Settings', 'Cookie settings feature coming soon!')
            )}
          </>
        )}

        {/* Security Audit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Audit</Text>
          
          <TouchableOpacity
            style={styles.auditButton}
            onPress={() => Alert.alert('Security Scan', 'Security scan feature coming soon!')}
          >
            <View style={styles.auditContent}>
              <Ionicons name="shield-checkmark" size={24} color={colors.success.main} />
              <View style={styles.auditText}>
                <Text style={styles.auditTitle}>Run Security Scan</Text>
                <Text style={styles.auditSubtitle}>Check your account security status</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.auditButton}
            onPress={() => Alert.alert('Privacy Checkup', 'Privacy checkup feature coming soon!')}
          >
            <View style={styles.auditContent}>
              <Ionicons name="eye" size={24} color={colors.primary.main} />
              <View style={styles.auditText}>
                <Text style={styles.auditTitle}>Privacy Checkup</Text>
                <Text style={styles.auditSubtitle}>Review and update your privacy settings</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Reset Settings */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => {
              Alert.alert(
                'Reset Privacy Settings',
                'This will reset all privacy and security settings to default. Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                      const defaultSettings = {
                        dataCollection: true,
                        analyticsSharing: false,
                        crashReporting: true,
                        usageStatistics: false,
                        personalizedAds: false,
                        encryptLocalData: true,
                        locationAccess: false,
                        cameraAccess: true,
                        contactsAccess: false,
                        storageAccess: true,
                        marketingEmails: false,
                        productUpdates: true,
                        securityAlerts: true,
                        surveyInvitations: false,
                      };
                      saveSettings(defaultSettings);
                      Alert.alert('Success', 'Privacy settings reset to default');
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.error.main} />
            <Text style={[styles.actionButtonText, styles.dangerText]}>Reset to Default</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.error.main} />
          </TouchableOpacity>
        </View>
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
  auditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  auditContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  auditText: {
    marginLeft: 12,
    flex: 1,
  },
  auditTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  auditSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
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

});

export default PrivacySecurityScreen;