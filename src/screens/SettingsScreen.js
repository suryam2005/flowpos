import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { clearAllAppData } from '../utils/dataUtils';
import { setItemAsync, getItemAsync } from '../utils/secureStorage';
import { safeGoBack } from '../utils/navigationUtils';

const SettingsScreen = ({ navigation }) => {
  const [useAppleFont, setUseAppleFont] = useState(false);
  const [useAppleEmoji, setUseAppleEmoji] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

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
      const [appleFont, appleEmoji, biometric] = await Promise.all([
        AsyncStorage.getItem('useAppleFont'),
        AsyncStorage.getItem('useAppleEmoji'),
        getItemAsync('biometricEnabled')
      ]);
      
      if (appleFont !== null) {
        setUseAppleFont(JSON.parse(appleFont));
      }
      if (appleEmoji !== null) {
        setUseAppleEmoji(JSON.parse(appleEmoji));
      }
      if (biometric !== null) {
        setBiometricEnabled(JSON.parse(biometric));
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

  const handleAppleFontToggle = (value) => {
    setUseAppleFont(value);
    saveSetting('useAppleFont', value);
  };

  const handleAppleEmojiToggle = (value) => {
    setUseAppleEmoji(value);
    saveSetting('useAppleEmoji', value);
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

  const handleRateApp = () => {
    Alert.alert(
      'Rate FlowPOS',
      'Enjoying FlowPOS? Please rate us on the App Store!',
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
        trackColor={{ false: '#f3f4f6', true: '#8b5cf6' }}
        thumbColor={value ? '#ffffff' : '#ffffff'}
        ios_backgroundColor="#f3f4f6"
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
            title="Apple Font (SF Pro)"
            description="Use Apple's San Francisco Pro font family for a cleaner look"
            value={useAppleFont}
            onToggle={handleAppleFontToggle}
          />
          
          <SettingItem
            title="Apple Emoji Style"
            description="Use Apple-style emoji rendering for consistent appearance"
            value={useAppleEmoji}
            onToggle={handleAppleEmojiToggle}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 20,
    color: '#1f2937',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
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
    color: '#1f2937',
    marginBottom: 16,
  },
  settingItem: {
    backgroundColor: '#ffffff',
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
    color: '#1f2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  aboutItem: {
    backgroundColor: '#ffffff',
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
    color: '#6b7280',
  },
  aboutValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingButton: {
    backgroundColor: '#ffffff',
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
    color: '#1f2937',
    marginBottom: 4,
  },
  settingButtonDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  settingButtonArrow: {
    fontSize: 18,
    color: '#9ca3af',
    marginLeft: 12,
  },
  actionButton: {
    backgroundColor: '#ffffff',
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
    borderColor: '#e5e7eb',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  warningText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
});

export default SettingsScreen;