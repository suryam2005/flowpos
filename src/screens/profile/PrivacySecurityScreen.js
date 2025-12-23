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
    // Communication Preferences (these work without backend)
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
          </>
        )}

        {/* Coming Soon Features */}
        {renderSection(
          'Advanced Security',
          'Enhanced security features',
          <>
            {renderComingSoonItem(
              'Data Encryption',
              'End-to-end encryption for all your data'
            )}
            {renderComingSoonItem(
              'Two-Factor Authentication',
              'Add extra security to your account'
            )}
            {renderComingSoonItem(
              'Security Audit',
              'Run comprehensive security checks'
            )}
            {renderComingSoonItem(
              'Data Deletion Request',
              'Request permanent deletion of your data'
            )}
          </>
        )}

        {/* Reset Settings */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => {
              Alert.alert(
                'Reset Privacy Settings',
                'This will reset all communication preferences to default. Are you sure?',
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
                      };
                      saveSettings(defaultSettings);
                      Alert.alert('Success', 'Settings reset to default');
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
