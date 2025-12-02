import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { safeGoBack } from '../../utils/navigationUtils';

const NotificationsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    // Push Notifications
    pushNotifications: true,
    orderNotifications: true,
    paymentNotifications: true,
    inventoryAlerts: true,
    dailyReports: false,
    weeklyReports: true,
    
    // Email Notifications
    emailNotifications: true,
    emailOrderUpdates: true,
    emailPaymentConfirmations: true,
    emailInventoryAlerts: false,
    emailReports: true,
    emailMarketing: false,
    
    // SMS Notifications
    smsNotifications: false,
    smsOrderUpdates: false,
    smsPaymentConfirmations: true,
    smsInventoryAlerts: false,
    
    // Sound & Vibration
    soundEnabled: true,
    vibrationEnabled: true,
    
    // Quiet Hours
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    
    // Handle dependent settings
    if (key === 'pushNotifications' && !value) {
      // Disable all push notification subcategories
      newSettings.orderNotifications = false;
      newSettings.paymentNotifications = false;
      newSettings.inventoryAlerts = false;
      newSettings.dailyReports = false;
      newSettings.weeklyReports = false;
    }
    
    if (key === 'emailNotifications' && !value) {
      // Disable all email notification subcategories
      newSettings.emailOrderUpdates = false;
      newSettings.emailPaymentConfirmations = false;
      newSettings.emailInventoryAlerts = false;
      newSettings.emailReports = false;
      newSettings.emailMarketing = false;
    }
    
    if (key === 'smsNotifications' && !value) {
      // Disable all SMS notification subcategories
      newSettings.smsOrderUpdates = false;
      newSettings.smsPaymentConfirmations = false;
      newSettings.smsInventoryAlerts = false;
    }
    
    saveSettings(newSettings);
  };

  const renderSettingItem = (title, subtitle, settingKey, disabled = false) => (
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
        onValueChange={(value) => updateSetting(settingKey, value)}
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Push Notifications */}
        {renderSection('Push Notifications', (
          <>
            {renderSettingItem(
              'Push Notifications',
              'Receive notifications on your device',
              'pushNotifications'
            )}
            {renderSettingItem(
              'Order Notifications',
              'Get notified when orders are placed',
              'orderNotifications',
              !settings.pushNotifications
            )}
            {renderSettingItem(
              'Payment Notifications',
              'Get notified about payment confirmations',
              'paymentNotifications',
              !settings.pushNotifications
            )}
            {renderSettingItem(
              'Inventory Alerts',
              'Get notified when stock is low',
              'inventoryAlerts',
              !settings.pushNotifications
            )}
            {renderSettingItem(
              'Daily Reports',
              'Receive daily sales summaries',
              'dailyReports',
              !settings.pushNotifications
            )}
            {renderSettingItem(
              'Weekly Reports',
              'Receive weekly business insights',
              'weeklyReports',
              !settings.pushNotifications
            )}
          </>
        ))}

        {/* Email Notifications */}
        {renderSection('Email Notifications', (
          <>
            {renderSettingItem(
              'Email Notifications',
              'Receive notifications via email',
              'emailNotifications'
            )}
            {renderSettingItem(
              'Order Updates',
              'Email notifications for new orders',
              'emailOrderUpdates',
              !settings.emailNotifications
            )}
            {renderSettingItem(
              'Payment Confirmations',
              'Email confirmations for payments',
              'emailPaymentConfirmations',
              !settings.emailNotifications
            )}
            {renderSettingItem(
              'Inventory Alerts',
              'Email alerts for low stock items',
              'emailInventoryAlerts',
              !settings.emailNotifications
            )}
            {renderSettingItem(
              'Business Reports',
              'Email reports and analytics',
              'emailReports',
              !settings.emailNotifications
            )}
            {renderSettingItem(
              'Marketing Updates',
              'Promotional emails and feature updates',
              'emailMarketing',
              !settings.emailNotifications
            )}
          </>
        ))}

        {/* SMS Notifications */}
        {renderSection('SMS Notifications', (
          <>
            {renderSettingItem(
              'SMS Notifications',
              'Receive notifications via SMS',
              'smsNotifications'
            )}
            {renderSettingItem(
              'Order Updates',
              'SMS notifications for new orders',
              'smsOrderUpdates',
              !settings.smsNotifications
            )}
            {renderSettingItem(
              'Payment Confirmations',
              'SMS confirmations for payments',
              'smsPaymentConfirmations',
              !settings.smsNotifications
            )}
            {renderSettingItem(
              'Inventory Alerts',
              'SMS alerts for critical stock levels',
              'smsInventoryAlerts',
              !settings.smsNotifications
            )}
          </>
        ))}

        {/* Sound & Vibration */}
        {renderSection('Sound & Vibration', (
          <>
            {renderSettingItem(
              'Sound',
              'Play sound for notifications',
              'soundEnabled'
            )}
            {renderSettingItem(
              'Vibration',
              'Vibrate for notifications',
              'vibrationEnabled'
            )}
          </>
        ))}

        {/* Quiet Hours */}
        {renderSection('Quiet Hours', (
          <>
            {renderSettingItem(
              'Enable Quiet Hours',
              'Silence notifications during specified hours',
              'quietHoursEnabled'
            )}
            {settings.quietHoursEnabled && (
              <View style={styles.quietHoursConfig}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => Alert.alert('Time Picker', 'Time picker feature coming soon!')}
                >
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <Text style={styles.timeValue}>{settings.quietHoursStart}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => Alert.alert('Time Picker', 'Time picker feature coming soon!')}
                >
                  <Text style={styles.timeLabel}>End Time</Text>
                  <Text style={styles.timeValue}>{settings.quietHoursEnd}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ))}

        {/* Notification History */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Notification History', 'Notification history feature coming soon!')}
          >
            <Ionicons name="time-outline" size={20} color={colors.text.primary} />
            <Text style={styles.actionButtonText}>Notification History</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Test Notification', 'Test notification sent!')}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text.primary} />
            <Text style={styles.actionButtonText}>Send Test Notification</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Reset Settings */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => {
              Alert.alert(
                'Reset Notification Settings',
                'This will reset all notification settings to default. Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                      const defaultSettings = {
                        pushNotifications: true,
                        orderNotifications: true,
                        paymentNotifications: true,
                        inventoryAlerts: true,
                        dailyReports: false,
                        weeklyReports: true,
                        emailNotifications: true,
                        emailOrderUpdates: true,
                        emailPaymentConfirmations: true,
                        emailInventoryAlerts: false,
                        emailReports: true,
                        emailMarketing: false,
                        smsNotifications: false,
                        smsOrderUpdates: false,
                        smsPaymentConfirmations: true,
                        smsInventoryAlerts: false,
                        soundEnabled: true,
                        vibrationEnabled: true,
                        quietHoursEnabled: false,
                        quietHoursStart: '22:00',
                        quietHoursEnd: '08:00',
                      };
                      saveSettings(defaultSettings);
                      Alert.alert('Success', 'Notification settings reset to default');
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
  quietHoursConfig: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  timeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  timeLabel: {
    fontSize: 16,
    color: colors.text.primary,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary.main,
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

export default NotificationsScreen;