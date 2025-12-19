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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { clearAllAppData } from '../utils/dataUtils';
import { safeGoBack } from '../utils/navigationUtils';
import { useAppTour } from '../hooks/useAppTour';
import { colors } from '../styles/colors';
import featureService from '../services/FeatureService';
import { useAuth } from '../context/AuthContext';

const SettingsScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [autoPaymentDetection, setAutoPaymentDetection] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [requireCustomerDetails, setRequireCustomerDetails] = useState(true);
  
  // Invoice Settings
  const [showStoreNameOnInvoice, setShowStoreNameOnInvoice] = useState(true);
  
  // WhatsApp Settings
  const [whatsappMethod, setWhatsappMethod] = useState('flowpos');
  const [sendInvoiceEnabled, setSendInvoiceEnabled] = useState(true);

  // App tour guide
  const { startTour, skipAllTours } = useAppTour('Settings');

  useEffect(() => {
    loadSettings();
    initializeFeatureService();
  }, []);

  const initializeFeatureService = async () => {
    try {
      await featureService.initialize();
    } catch (error) {
      console.error('Error initializing FeatureService:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const [autoDetection, notificationsValue, customerDetailsRequired, invoiceStoreName, whatsappMethodValue, sendInvoiceValue] = await Promise.all([
        AsyncStorage.getItem('autoPaymentDetection'),
        AsyncStorage.getItem('notifications'),
        AsyncStorage.getItem('requireCustomerDetails'),
        AsyncStorage.getItem('showStoreNameOnInvoice'),
        AsyncStorage.getItem('whatsappMethod'),
        AsyncStorage.getItem('sendInvoiceEnabled')
      ]);
      
      if (autoDetection !== null) {
        setAutoPaymentDetection(JSON.parse(autoDetection));
      }
      if (notificationsValue !== null) {
        setNotifications(JSON.parse(notificationsValue));
      }
      if (customerDetailsRequired !== null) {
        setRequireCustomerDetails(JSON.parse(customerDetailsRequired));
      }
      if (invoiceStoreName !== null) {
        setShowStoreNameOnInvoice(JSON.parse(invoiceStoreName));
      }
      if (whatsappMethodValue !== null) {
        setWhatsappMethod(whatsappMethodValue);
      }
      if (sendInvoiceValue !== null) {
        setSendInvoiceEnabled(JSON.parse(sendInvoiceValue));
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



  const handleAutoPaymentDetectionToggle = (value) => {
    setAutoPaymentDetection(value);
    saveSetting('autoPaymentDetection', value);
  };

  const handleNotificationsToggle = (value) => {
    setNotifications(value);
    saveSetting('notifications', value);
  };



  const handleRequireCustomerDetailsToggle = (value) => {
    setRequireCustomerDetails(value);
    saveSetting('requireCustomerDetails', value);
  };

  const handleShowStoreNameToggle = async (value) => {
    setShowStoreNameOnInvoice(value);
    await saveSetting('showStoreNameOnInvoice', value);
  };

  const handleWhatsAppMethodChange = async (method) => {
    setWhatsappMethod(method);
    await AsyncStorage.setItem('whatsappMethod', method);
    
    // Also update the WhatsApp service
    const WhatsAppService = require('../services/WhatsAppService').default;
    await WhatsAppService.setWhatsAppMethod(method);
  };

  const handleSendInvoiceToggle = async (value) => {
    setSendInvoiceEnabled(value);
    await saveSetting('sendInvoiceEnabled', value);
    
    // Also update the WhatsApp service
    const WhatsAppService = require('../services/WhatsAppService').default;
    await WhatsAppService.setSendInvoiceEnabled(value);
  };



  const handleResetAllData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'Reset All Data',
      'This will log you out of the app. You can log back in anytime with your credentials.\n\nYour data remains safe on the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const performLogout = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Simply logout the user
      await logout();
      
      Alert.alert(
        'Logged Out',
        'You have been logged out successfully. You can log back in anytime.',
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
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert(
        'Error',
        'Failed to logout. Please try again.'
      );
    }
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

  const handleShowAppTour = async () => {
    Alert.alert(
      'App Tour',
      'Would you like to see the app tour again? This will show you how to use different features.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Tour', 
          onPress: async () => {
            try {
              console.log('🎯 [Settings] Resetting tour status and starting from POS');
              
              // Reset tour completion status to allow tour to show again
              await AsyncStorage.removeItem('hasSeenAppTour');
              await AsyncStorage.removeItem('completedTours');
              
              // Navigate to POS screen and trigger tour
              navigation.navigate('Main', { 
                screen: 'POS',
                params: { startTour: true }
              });
              
            } catch (error) {
              console.error('Error resetting tour status:', error);
              Alert.alert('Error', 'Failed to start tour. Please try again.');
            }
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

  const SettingItem = ({ title, description, value, onToggle, disabled = false, isPremium = false }) => (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingInfo}>
        <View style={styles.settingTitleRow}>
          <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
            {title}
          </Text>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={12} color="#FFD700" />
              <Text style={styles.premiumText}>PRO</Text>
            </View>
          )}
        </View>
        <Text style={[styles.settingDescription, disabled && styles.settingDescriptionDisabled]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onToggle}
        trackColor={{ false: colors.gray[100], true: disabled ? colors.gray[100] : colors.primary.main }}
        thumbColor={value ? (disabled ? colors.gray[400] : colors.background.surface) : colors.background.surface}
        ios_backgroundColor={colors.gray[100]}
        disabled={disabled}
      />
    </View>
  );

  const SettingItemWithNavigation = ({ title, description, value, onToggle, onNavigate }) => (
    <TouchableOpacity 
      style={styles.settingItem}
      onPress={onNavigate}
      activeOpacity={0.7}
    >
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <View style={styles.settingActions}>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.gray[100], true: colors.primary.main }}
          thumbColor={value ? colors.background.surface : colors.background.surface}
          ios_backgroundColor={colors.gray[100]}
        />
        <Text style={styles.settingArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(navigation, 'Main', { screen: 'Manage' })}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Settings</Text>
          
          <SettingItem
            title="Auto Payment Detection"
            description="Automatically detect UPI payment confirmations from SMS messages"
            value={autoPaymentDetection}
            onToggle={handleAutoPaymentDetectionToggle}
          />
          
          <SettingItem
            title="Require Customer Details"
            description="Make customer name and phone number mandatory for checkout"
            value={requireCustomerDetails}
            onToggle={handleRequireCustomerDetailsToggle}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WhatsApp Settings</Text>
          
          {/* Send Invoice Setting - Master Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Send Invoice via WhatsApp</Text>
              <Text style={styles.settingDescription}>
                Enable or disable invoice sending functionality
              </Text>
            </View>
            <Switch
              value={sendInvoiceEnabled}
              onValueChange={handleSendInvoiceToggle}
              trackColor={{ false: colors.gray[300], true: colors.primary.light }}
              thumbColor={sendInvoiceEnabled ? colors.primary.main : colors.gray[400]}
            />
          </View>

          {/* WhatsApp Method Selection - Only show when Send Invoice is enabled */}
          {sendInvoiceEnabled && (
            <View style={styles.whatsappMethodSection}>
              <Text style={styles.whatsappMethodTitle}>WhatsApp Method</Text>
              <Text style={styles.whatsappMethodDescription}>Choose how to send invoices via WhatsApp</Text>
              
              <TouchableOpacity
                style={[
                  styles.whatsappMethodOption,
                  whatsappMethod === 'flowpos' && styles.whatsappMethodSelected
                ]}
                onPress={() => handleWhatsAppMethodChange('flowpos')}
                activeOpacity={0.7}
              >
                <View style={styles.whatsappMethodContent}>
                  <View style={styles.whatsappMethodInfo}>
                    <Text style={styles.whatsappMethodName}>FlowPOS WhatsApp (Recommended)</Text>
                    <Text style={styles.whatsappMethodDesc}>Automatic sending via FlowPOS servers</Text>
                  </View>
                  <View style={[
                    styles.whatsappMethodRadio,
                    whatsappMethod === 'flowpos' && styles.whatsappMethodRadioSelected
                  ]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.whatsappMethodOption,
                  whatsappMethod === 'device' && styles.whatsappMethodSelected
                ]}
                onPress={() => handleWhatsAppMethodChange('device')}
                activeOpacity={0.7}
              >
                <View style={styles.whatsappMethodContent}>
                  <View style={styles.whatsappMethodInfo}>
                    <Text style={styles.whatsappMethodName}>Device WhatsApp</Text>
                    <Text style={styles.whatsappMethodDesc}>Opens your WhatsApp app to send manually</Text>
                  </View>
                  <View style={[
                    styles.whatsappMethodRadio,
                    whatsappMethod === 'device' && styles.whatsappMethodRadioSelected
                  ]} />
                </View>
              </TouchableOpacity>
            </View>
          )}
          
          {/* WhatsApp Setup - Only show when Send Invoice is enabled */}
          {sendInvoiceEnabled && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('WhatsAppSetup')}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>WhatsApp Setup</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Settings</Text>
          
          <SettingItem
            title="Show Store Name on Invoice"
            description="Display your store name on all invoices"
            value={showStoreNameOnInvoice}
            onToggle={handleShowStoreNameToggle}
          />
        </View>



        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('DataExport')}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={20} color={colors.primary.main} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Export Data (CSV)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PDFReports')}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.primary.main} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>PDF Reports</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PerformanceInsights')}
            activeOpacity={0.8}
          >
            <Ionicons name="analytics-outline" size={20} color={colors.primary.main} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Performance Insights</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('StorageManagement')}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-outline" size={20} color={colors.primary.main} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Storage Management</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleResetAllData}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.background.surface} style={{ marginRight: 8 }} />
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
          
          <Text style={styles.warningText}>
            This will log you out of the app. Your data remains safe and you can log back in anytime.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleContactSupport}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={20} color={colors.primary.main} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Contact Support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewHelp}
            activeOpacity={0.8}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.primary.main} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Help & FAQ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShowAppTour}
            activeOpacity={0.8}
          >
            <Ionicons name="compass-outline" size={20} color={colors.primary.main} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Show App Tour</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleRateApp}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={20} color={colors.primary.main} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Rate FlowPOS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About FlowPOS</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>FlowPOS v1.0 Enhanced</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Platform</Text>
            <Text style={styles.aboutValue}>React Native (Expo)</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Features</Text>
            <Text style={styles.aboutValue}>POS • Analytics • Inventory • Reports</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Database</Text>
            <Text style={styles.aboutValue}>Supabase (PostgreSQL)</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert(
              'FlowPOS Credits',
              'Developed with love for small businesses\n\n• Modern POS System\n• Real-time Analytics\n• Secure Data Management\n• Multi-platform Support\n\nThank you for using FlowPOS!'
            )}
            activeOpacity={0.8}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.primary.main} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>App Information</Text>
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
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingRow: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.shadow.default,
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
  settingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingArrow: {
    fontSize: 20,
    color: colors.text.secondary,
    fontWeight: '300',
  },
  aboutItem: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadow.default,
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
    shadowColor: colors.shadow.default,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.shadow.default,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.error.background,
  },
  dangerSettingTitle: {
    color: colors.error.main,
  },

  settingItemDisabled: {
    opacity: 0.6,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTitleDisabled: {
    color: colors.text.disabled,
  },
  settingDescriptionDisabled: {
    color: colors.text.disabled,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    gap: 2,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B8860B',
    letterSpacing: 0.5,
  },
  whatsappMethodSection: {
    marginBottom: 20,
  },
  whatsappMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  whatsappMethodDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  whatsappMethodOption: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  whatsappMethodSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.gray[50],
  },
  whatsappMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  whatsappMethodInfo: {
    flex: 1,
  },
  whatsappMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  whatsappMethodDesc: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  whatsappMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.background.surface,
  },
  whatsappMethodRadioSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main,
  },
});

export default SettingsScreen;