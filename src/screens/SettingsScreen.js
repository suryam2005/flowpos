import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { clearAllAppData } from '../utils/dataUtils';
import { setItemAsync, getItemAsync, deleteItemAsync } from '../utils/secureStorage';
import { safeGoBack } from '../utils/navigationUtils';
import { useAppTour } from '../hooks/useAppTour';
import { colors } from '../styles/colors';

const SettingsScreen = ({ navigation }) => {
  const [darkTheme, setDarkTheme] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(true);
  const [autoPaymentDetection, setAutoPaymentDetection] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoWhatsAppInvoice, setAutoWhatsAppInvoice] = useState(true);
  const [requireCustomerDetails, setRequireCustomerDetails] = useState(true);

  // App tour guide
  const { startTour, skipAllTours } = useAppTour('Settings');

  useEffect(() => {
    loadSettings();
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const [darkThemeValue, biometric, pinSetup, autoDetection, notificationsValue, autoWhatsApp, customerDetailsRequired] = await Promise.all([
        AsyncStorage.getItem('darkTheme'),
        getItemAsync('biometricEnabled'),
        getItemAsync('pinSetupCompleted'),
        AsyncStorage.getItem('autoPaymentDetection'),
        AsyncStorage.getItem('notifications'),
        AsyncStorage.getItem('autoWhatsAppInvoice'),
        AsyncStorage.getItem('requireCustomerDetails')
      ]);
      
      if (darkThemeValue !== null) {
        setDarkTheme(JSON.parse(darkThemeValue));
      }
      if (biometric !== null) {
        setBiometricEnabled(JSON.parse(biometric));
      }
      if (pinSetup !== null) {
        setPinEnabled(JSON.parse(pinSetup));
      }
      if (autoDetection !== null) {
        setAutoPaymentDetection(JSON.parse(autoDetection));
      }
      if (notificationsValue !== null) {
        setNotifications(JSON.parse(notificationsValue));
      }
      if (autoWhatsApp !== null) {
        setAutoWhatsAppInvoice(JSON.parse(autoWhatsApp));
      }
      if (customerDetailsRequired !== null) {
        setRequireCustomerDetails(JSON.parse(customerDetailsRequired));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const handleDarkThemeToggle = (value) => {
    setDarkTheme(value);
    saveSetting('darkTheme', value);
    // Note: In a real implementation, you would apply the theme change here
    Alert.alert(
      'Theme Changed',
      'Dark theme will be applied after restarting the app.',
      [{ text: 'OK' }]
    );
  };

  const handleAutoPaymentDetectionToggle = (value) => {
    setAutoPaymentDetection(value);
    saveSetting('autoPaymentDetection', value);
  };

  const handleNotificationsToggle = (value) => {
    setNotifications(value);
    saveSetting('notifications', value);
  };

  const handleAutoWhatsAppInvoiceToggle = (value) => {
    setAutoWhatsAppInvoice(value);
    saveSetting('autoWhatsAppInvoice', value);
  };

  const handleRequireCustomerDetailsToggle = (value) => {
    setRequireCustomerDetails(value);
    saveSetting('requireCustomerDetails', value);
  };

  const handleBiometricToggle = async (value) => {
    if (value && biometricAvailable) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to enable biometric login',
          cancelLabel: 'Cancel',
        });
        
        if (result.success) {
          setBiometricEnabled(true);
          await setItemAsync('biometricEnabled', 'true');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error('Biometric authentication error:', error);
      }
    } else {
      setBiometricEnabled(false);
      await setItemAsync('biometricEnabled', 'false');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleResetAllData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all products, orders, revenue data, and cart items. This action cannot be undone.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Data',
          style: 'destructive',
          onPress: confirmResetData,
        },
      ]
    );
  };

  const confirmResetData = () => {
    Alert.alert(
      'Final Confirmation',
      'This is your last chance to cancel. All your business data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete Everything',
          style: 'destructive',
          onPress: performDataReset,
        },
      ]
    );
  };

  const handleChangePIN = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Change PIN',
      'You will be redirected to set up a new PIN. Your current PIN will be replaced.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change PIN',
          onPress: () => {
            navigation.navigate('PinSetup', { isChangingPin: true });
          },
        },
      ]
    );
  };

  const handleRemoveLock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'Remove App Lock',
      'This will disable PIN and biometric authentication. The app will no longer require authentication to access.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Lock',
          style: 'destructive',
          onPress: confirmRemoveLock,
        },
      ]
    );
  };

  const confirmRemoveLock = () => {
    Alert.alert(
      'Final Confirmation',
      'This will permanently remove all security locks from the app. Anyone with access to your device will be able to use FlowPOS.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Remove All Locks',
          style: 'destructive',
          onPress: performRemoveLock,
        },
      ]
    );
  };

  const performRemoveLock = async () => {
    try {
      // Remove all security settings
      await Promise.all([
        deleteItemAsync('pinSetupCompleted'),
        deleteItemAsync('userPin'),
        deleteItemAsync('biometricEnabled'),
      ]);
      
      setPinEnabled(false);
      setBiometricEnabled(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Security Removed',
        'All app locks have been removed. The app will no longer require authentication.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to main app
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error removing locks:', error);
      Alert.alert(
        'Error',
        'Failed to remove security locks. Please try again.'
      );
    }
  };

  const performDataReset = async () => {
    try {
      const success = await clearAllAppData();
      
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          'Data Reset Complete',
          'All data has been successfully deleted. The app will restart to the welcome screen.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to welcome screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
              },
            },
          ]
        );
      } else {
        throw new Error('Failed to clear data');
      }
    } catch (error) {
      console.error('Error resetting data:', error);
      Alert.alert(
        'Error',
        'Failed to reset data. Please try again or restart the app manually.'
      );
    }
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export all your business data to a file for backup or transfer.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: performDataExport },
      ]
    );
  };

  const performDataExport = async () => {
    try {
      // This would implement actual file export functionality
      Alert.alert('Coming Soon', 'Data export feature will be available in the next update.');
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleImportData = () => {
    Alert.alert(
      'Import Data',
      'Import business data from a previously exported file.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: performDataImport },
      ]
    );
  };

  const performDataImport = async () => {
    try {
      // This would implement actual file import functionality
      Alert.alert('Coming Soon', 'Data import feature will be available in the next update.');
    } catch (error) {
      Alert.alert('Error', 'Failed to import data');
    }
  };

  const handleBackupData = () => {
    Alert.alert('Coming Soon', 'Cloud backup feature will be available in the next update.');
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Need help? Contact our support team.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Email Support', onPress: () => {
          Alert.alert('Email', 'support@flowpos.com\n\nPlease describe your issue in detail.');
        }},
      ]
    );
  };

  const handleViewHelp = () => {
    Alert.alert(
      'Help & FAQ',
      'Common questions and answers:\n\n• How to add products?\n• How to process orders?\n• How to view reports?\n\nMore help available at flowpos.com/help'
    );
  };

  const handleShowAppTour = () => {
    Alert.alert(
      'App Tour',
      'Would you like to see the app tour again? This will show you how to use different features.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Tour', 
          onPress: () => {
            // Reset tour status and start from POS screen
            navigation.navigate('Main', { screen: 'POS' });
            setTimeout(() => {
              startTour();
            }, 500);
          }
        },
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate FlowPOS',
      'Enjoying FlowPOS? Please rate us on the Play Store!',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Rate Now', onPress: () => {
          Alert.alert('Thank You!', 'Your feedback helps us improve FlowPOS.');
        }},
      ]
    );
  };

  const SettingItem = ({ title, description, value, onToggle }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.gray[100], true: colors.primary.main }}
        thumbColor={value ? colors.background.surface : colors.background.surface}
        ios_backgroundColor={colors.gray[100]}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(navigation, 'Main', { screen: 'Manage' })}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <SettingItem
            title="Dark Theme"
            description="Use dark colors for better viewing in low light conditions"
            value={darkTheme}
            onToggle={handleDarkThemeToggle}
          />
          
          <SettingItem
            title="Notifications"
            description="Receive notifications for orders, payments, and app updates"
            value={notifications}
            onToggle={handleNotificationsToggle}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Features</Text>
          
          <SettingItem
            title="Auto Payment Detection"
            description="Automatically detect UPI payment confirmations from SMS messages"
            value={autoPaymentDetection}
            onToggle={handleAutoPaymentDetectionToggle}
          />
          
          <SettingItem
            title="Auto WhatsApp Invoice"
            description="Automatically send invoice via WhatsApp after payment completion"
            value={autoWhatsAppInvoice}
            onToggle={handleAutoWhatsAppInvoiceToggle}
          />
          
          <SettingItem
            title="Require Customer Details"
            description="Make customer name and phone number mandatory for checkout"
            value={requireCustomerDetails}
            onToggle={handleRequireCustomerDetailsToggle}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          {pinEnabled ? (
            <>
              <TouchableOpacity
                style={styles.settingButton}
                onPress={handleChangePIN}
                activeOpacity={0.7}
              >
                <View style={styles.settingButtonContent}>
                  <View style={styles.settingButtonInfo}>
                    <Text style={styles.settingButtonTitle}>Change PIN</Text>
                    <Text style={styles.settingButtonDescription}>
                      Update your app security PIN
                    </Text>
                  </View>
                  <Text style={styles.settingButtonArrow}>→</Text>
                </View>
              </TouchableOpacity>

              {biometricAvailable && (
                <SettingItem
                  title="Biometric Authentication"
                  description="Use fingerprint or face recognition to unlock the app"
                  value={biometricEnabled}
                  onToggle={handleBiometricToggle}
                />
              )}

              <TouchableOpacity
                style={[styles.settingButton, styles.dangerSettingButton]}
                onPress={handleRemoveLock}
                activeOpacity={0.7}
              >
                <View style={styles.settingButtonContent}>
                  <View style={styles.settingButtonInfo}>
                    <Text style={[styles.settingButtonTitle, styles.dangerSettingTitle]}>Remove App Lock</Text>
                    <Text style={styles.settingButtonDescription}>
                      Disable PIN and biometric authentication completely
                    </Text>
                  </View>
                  <Text style={styles.settingButtonArrow}>→</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noSecurityContainer}>
              <Text style={styles.noSecurityIcon}>🔓</Text>
              <Text style={styles.noSecurityTitle}>No Security Lock</Text>
              <Text style={styles.noSecurityText}>
                App lock is disabled. Anyone with access to your device can use FlowPOS.
              </Text>
              <TouchableOpacity
                style={styles.enableSecurityButton}
                onPress={() => navigation.navigate('PinSetup', { isFirstTime: true })}
                activeOpacity={0.8}
              >
                <Text style={styles.enableSecurityText}>Enable Security</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>FlowPOS v1</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Platform</Text>
            <Text style={styles.aboutValue}>React Native (Expo)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleExportData}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>📤 Export Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleImportData}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>📥 Import Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleBackupData}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>💾 Backup Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleResetAllData}
            activeOpacity={0.8}
          >
            <Text style={styles.dangerButtonText}>🗑️ Reset All Data</Text>
          </TouchableOpacity>
          
          <Text style={styles.warningText}>
            Reset will permanently delete all products, orders, and revenue data. This action cannot be undone.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleContactSupport}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>📧 Contact Support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewHelp}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>❓ Help & FAQ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShowAppTour}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>🎯 Show App Tour</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('WhatsAppSetup')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>📱 WhatsApp Setup</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleRateApp}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>⭐ Rate FlowPOS</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 20,
    color: colors.text.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  settingItem: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  aboutItem: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  aboutLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  aboutValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  settingButton: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingButtonContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingButtonInfo: {
    flex: 1,
  },
  settingButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  settingButtonDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  settingButtonArrow: {
    fontSize: 18,
    color: colors.text.tertiary,
    marginLeft: 12,
  },
  actionButton: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  dangerButton: {
    backgroundColor: colors.error.main,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  warningText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  dangerSettingButton: {
    borderWidth: 1,
    borderColor: colors.error.border,
    backgroundColor: '#fef2f2',
  },
  dangerSettingTitle: {
    color: '#dc2626',
  },
  noSecurityContainer: {
    backgroundColor: colors.warning.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  noSecurityIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noSecurityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
    textAlign: 'center',
  },
  noSecurityText: {
    fontSize: 14,
    color: '#b45309',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  enableSecurityButton: {
    backgroundColor: '#d97706',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  enableSecurityText: {
    color: colors.background.surface,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SettingsScreen;