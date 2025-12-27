import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { clearAllAppData } from '../utils/dataUtils';
import { safeGoBack } from '../utils/navigationUtils';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacingStyles';
import featureService from '../services/FeatureService';
import { useAuth } from '../context/AuthContext';
import { useAppSettingsContext } from '../context/AppSettingsContext';
import { useStoreSettings } from '../context/StoreSettingsContext';

const SettingsScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const { settings, getSetting, updateSetting, isLoading: settingsLoading, refreshSettings } = useAppSettingsContext();
  const { getReceiptSettings, updateReceiptSettings } = useStoreSettings();
  
  // Local state for UI (initialized to null - will be set from context)
  // Using null as initial state to distinguish "not loaded" from "loaded as false"
  const [autoPaymentDetection, setAutoPaymentDetection] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [requireCustomerDetails, setRequireCustomerDetails] = useState(null);
  
  // Invoice Settings
  const [showStoreNameOnInvoice, setShowStoreNameOnInvoice] = useState(null);
  
  // Receipt Settings (now from StoreSettingsContext)
  const [receiptSettings, setReceiptSettings] = useState({
    showAddress: true,
    showPhone: true,
    showEmail: false,
    showGST: true,
  });
  
  // WhatsApp Settings
  const [whatsappMethod, setWhatsappMethod] = useState(null);
  const [sendInvoiceEnabled, setSendInvoiceEnabled] = useState(null);

  // Load settings from context on mount and when settings change
  useEffect(() => {
    loadSettingsFromContext();
    loadReceiptSettings(); // Receipt settings still from AsyncStorage
    initializeFeatureService();
  }, [settings]);

  // Reload settings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSettingsFromContext();
      loadReceiptSettings();
    }, [settings])
  );

  const initializeFeatureService = async () => {
    try {
      await featureService.initialize();
    } catch (error) {
      console.error('Error initializing FeatureService:', error);
    }
  };

  /**
   * Load the 6 cached settings from AppSettingsContext
   * These settings are persisted to database and cached locally
   * 
   * IMPORTANT: We distinguish between:
   * - null: settings object is null (not loaded yet, keep local state as null for loading UI)
   * - {}: empty object (loaded from backend, but user hasn't set any settings - use defaults)
   * - {key: value}: settings loaded from backend (use actual values)
   */
  const loadSettingsFromContext = () => {
    // If settings object is null, context hasn't loaded yet - don't override local state
    // This prevents showing wrong values before backend data arrives
    if (settings === null) {
      console.log('[SettingsScreen] Settings not loaded yet, keeping current state');
      return;
    }
    
    // Read from context cache (no async needed - already in memory)
    const autoDetection = getSetting('autoPaymentDetection');
    const notificationsValue = getSetting('notifications');
    const customerDetailsRequired = getSetting('requireCustomerDetails');
    const invoiceStoreName = getSetting('showStoreNameOnInvoice');
    const whatsappMethodValue = getSetting('whatsappMethod');
    const sendInvoiceValue = getSetting('sendInvoiceEnabled');
    
    console.log('[SettingsScreen] Loading settings from context:', {
      autoDetection,
      notificationsValue,
      customerDetailsRequired,
      invoiceStoreName,
      whatsappMethodValue,
      sendInvoiceValue
    });
    
    // Update local state from context
    // If value is undefined (not set in DB), default to true for better UX
    // If value is explicitly false, use false
    setAutoPaymentDetection(autoDetection !== undefined ? autoDetection : true);
    setNotifications(notificationsValue !== undefined ? notificationsValue : true);
    setRequireCustomerDetails(customerDetailsRequired !== undefined ? customerDetailsRequired : true);
    setShowStoreNameOnInvoice(invoiceStoreName !== undefined ? invoiceStoreName : true);
    setWhatsappMethod(whatsappMethodValue !== undefined ? whatsappMethodValue : 'flowpos');
    setSendInvoiceEnabled(sendInvoiceValue !== undefined ? sendInvoiceValue : true);
  };

  /**
   * Load receipt settings from StoreSettingsContext
   * Receipt settings are now part of the store settings cache
   */
  const loadReceiptSettings = () => {
    try {
      // Get receipt settings from context with proper boolean handling
      const contextReceiptSettings = getReceiptSettings();
      setReceiptSettings(contextReceiptSettings);
    } catch (error) {
      console.error('Error loading receipt settings:', error);
    }
  };



  /**
   * Handle auto payment detection toggle
   * Uses write-through cache update via context
   */
  const handleAutoPaymentDetectionToggle = async (value) => {
    const previousValue = autoPaymentDetection;
    // Optimistic UI update
    setAutoPaymentDetection(value);
    
    // Write-through to backend via context
    const success = await updateSetting('autoPaymentDetection', value);
    if (!success) {
      // Revert on failure
      setAutoPaymentDetection(previousValue);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
    }
  };

  /**
   * Handle notifications toggle
   * Uses write-through cache update via context
   */
  const handleNotificationsToggle = async (value) => {
    const previousValue = notifications;
    // Optimistic UI update
    setNotifications(value);
    
    // Write-through to backend via context
    const success = await updateSetting('notifications', value);
    if (!success) {
      // Revert on failure
      setNotifications(previousValue);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
    }
  };

  /**
   * Handle require customer details toggle
   * Uses write-through cache update via context
   */
  const handleRequireCustomerDetailsToggle = async (value) => {
    const previousValue = requireCustomerDetails;
    // Optimistic UI update
    setRequireCustomerDetails(value);
    
    // Write-through to backend via context
    const success = await updateSetting('requireCustomerDetails', value);
    if (!success) {
      // Revert on failure
      setRequireCustomerDetails(previousValue);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
    }
  };

  /**
   * Handle show store name on invoice toggle
   * Uses write-through cache update via context
   */
  const handleShowStoreNameToggle = async (value) => {
    const previousValue = showStoreNameOnInvoice;
    // Optimistic UI update
    setShowStoreNameOnInvoice(value);
    
    // Write-through to backend via context
    const success = await updateSetting('showStoreNameOnInvoice', value);
    if (!success) {
      // Revert on failure
      setShowStoreNameOnInvoice(previousValue);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
    }
  };

  /**
   * Handle WhatsApp method change
   * Uses write-through cache update via context
   */
  const handleWhatsAppMethodChange = async (method) => {
    const previousValue = whatsappMethod;
    // Optimistic UI update
    setWhatsappMethod(method);
    
    // Write-through to backend via context
    const success = await updateSetting('whatsappMethod', method);
    if (!success) {
      // Revert on failure
      setWhatsappMethod(previousValue);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
      return;
    }
    
    // Also update the WhatsApp service
    const WhatsAppService = require('../services/WhatsAppService').default;
    await WhatsAppService.setWhatsAppMethod(method);
  };

  /**
   * Handle send invoice toggle
   * Uses write-through cache update via context
   */
  const handleSendInvoiceToggle = async (value) => {
    const previousValue = sendInvoiceEnabled;
    // Optimistic UI update
    setSendInvoiceEnabled(value);
    
    // Write-through to backend via context
    const success = await updateSetting('sendInvoiceEnabled', value);
    if (!success) {
      // Revert on failure
      setSendInvoiceEnabled(previousValue);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
      return;
    }
    
    // Also update the WhatsApp service
    const WhatsAppService = require('../services/WhatsAppService').default;
    await WhatsAppService.setSendInvoiceEnabled(value);
  };

  /**
   * Handle receipt setting changes with write-through to backend
   * Receipt settings are now part of StoreSettingsContext
   */
  const handleReceiptSettingChange = async (settingKey, value) => {
    const newReceiptSettings = { ...receiptSettings, [settingKey]: value };
    setReceiptSettings(newReceiptSettings);
    
    try {
      // Write-through to backend via StoreSettingsContext
      const result = await updateReceiptSettings({ [settingKey]: value });
      if (result.success) {
        console.log(`✅ Receipt setting ${settingKey} updated to ${value}`);
      } else {
        // Revert on failure
        setReceiptSettings(receiptSettings);
        if (result.error === 'NO_NETWORK') {
          Alert.alert('No Network', 'Please check your internet connection and try again.');
        } else {
          Alert.alert('Error', 'Failed to save receipt setting. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving receipt setting:', error);
      // Revert on error
      setReceiptSettings(receiptSettings);
    }
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

  const SettingItem = ({ title, description, value, onToggle, disabled = false, isPremium = false }) => {
    // Handle null value (settings not loaded yet) - show as false and disabled
    const isLoading = value === null;
    const effectiveValue = value === null ? false : value;
    const effectiveDisabled = disabled || isLoading;
    
    return (
      <View style={[styles.settingItem, effectiveDisabled && styles.settingItemDisabled]}>
        <View style={styles.settingInfo}>
          <View style={styles.settingTitleRow}>
            <Text style={[styles.settingTitle, effectiveDisabled && styles.settingTitleDisabled]}>
              {title}
            </Text>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={12} color="#FFD700" />
                <Text style={styles.premiumText}>PRO</Text>
              </View>
            )}
            {isLoading && (
              <Text style={styles.loadingText}>Loading...</Text>
            )}
          </View>
          <Text style={[styles.settingDescription, effectiveDisabled && styles.settingDescriptionDisabled]}>
            {description}
          </Text>
        </View>
        <Switch
          value={effectiveValue}
          onValueChange={effectiveDisabled ? undefined : onToggle}
          trackColor={{ false: colors.gray[100], true: effectiveDisabled ? colors.gray[100] : colors.primary.main }}
          thumbColor={effectiveValue ? (effectiveDisabled ? colors.gray[400] : colors.background.surface) : colors.background.surface}
          ios_backgroundColor={colors.gray[100]}
          disabled={effectiveDisabled}
        />
      </View>
    );
  };

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

  // Locked Badge Component for premium features
  const LockedBadge = () => (
    <View style={styles.lockedBadge}>
      <Ionicons name="lock-closed" size={12} color={colors.warning.main} />
      <Text style={styles.lockedText}>Upgrade</Text>
    </View>
  );

  // Feature Button with lock check
  const FeatureButton = ({ title, icon, featureKey, onPress }) => {
    const isLocked = !featureService.canUseFeature(featureKey);
    
    const handlePress = () => {
      if (isLocked) {
        featureService.showUpgradePrompt(featureKey);
      } else {
        onPress();
      }
    };
    
    return (
      <TouchableOpacity 
        style={[styles.actionButton, isLocked && styles.actionButtonLocked]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.featureButtonContent}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={isLocked ? colors.text.tertiary : colors.primary.main} 
            style={styles.iconStyle} 
          />
          <Text style={[styles.actionButtonText, isLocked && styles.actionButtonTextLocked]}>
            {title}
          </Text>
        </View>
        {isLocked && <LockedBadge />}
      </TouchableOpacity>
    );
  };

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
          
          {/* Check if WhatsApp feature is available */}
          {!featureService.canUseFeature('whatsapp_integration') ? (
            <TouchableOpacity 
              style={[styles.settingItem, styles.settingItemDisabled]}
              onPress={() => featureService.showUpgradePrompt('whatsapp_integration')}
              activeOpacity={0.8}
            >
              <View style={styles.settingInfo}>
                <View style={styles.settingTitleRow}>
                  <Text style={styles.settingTitle}>Send Invoice via WhatsApp</Text>
                  <LockedBadge />
                </View>
                <Text style={styles.settingDescription}>
                  Upgrade to Growth plan to send invoices via WhatsApp
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : (
            <>
              {/* Send Invoice Setting - Master Toggle */}
              <View style={[styles.settingRow, sendInvoiceEnabled === null && styles.settingItemDisabled]}>
                <View style={styles.settingInfo}>
                  <View style={styles.settingTitleRow}>
                    <Text style={[styles.settingTitle, sendInvoiceEnabled === null && styles.settingTitleDisabled]}>
                      Send Invoice via WhatsApp
                    </Text>
                    {sendInvoiceEnabled === null && (
                      <Text style={styles.loadingText}>Loading...</Text>
                    )}
                  </View>
                  <Text style={[styles.settingDescription, sendInvoiceEnabled === null && styles.settingDescriptionDisabled]}>
                    Enable or disable invoice sending functionality
                  </Text>
                </View>
                <Switch
                  value={sendInvoiceEnabled === null ? false : sendInvoiceEnabled}
                  onValueChange={sendInvoiceEnabled === null ? undefined : handleSendInvoiceToggle}
                  trackColor={{ false: colors.gray[300], true: sendInvoiceEnabled === null ? colors.gray[300] : colors.primary.light }}
                  thumbColor={sendInvoiceEnabled ? colors.primary.main : colors.gray[400]}
                  disabled={sendInvoiceEnabled === null}
                />
              </View>

              {/* WhatsApp Method Selection - Only show when Send Invoice is enabled and not null */}
              {sendInvoiceEnabled === true && (
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
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Settings</Text>
          
          {/* Custom branding feature check */}
          {!featureService.canUseFeature('custom_branding') ? (
            <TouchableOpacity 
              style={[styles.settingItem, styles.settingItemDisabled]}
              onPress={() => featureService.showUpgradePrompt('customizable_invoice')}
              activeOpacity={0.8}
            >
              <View style={styles.settingInfo}>
                <View style={styles.settingTitleRow}>
                  <Text style={styles.settingTitle}>Invoice Customization</Text>
                  <LockedBadge />
                </View>
                <Text style={styles.settingDescription}>
                  Upgrade to Growth plan to customize your invoices
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : (
            <>
              <SettingItem
                title="Show Store Name on Invoice"
                description="Display your store name on all invoices"
                value={showStoreNameOnInvoice}
                onToggle={handleShowStoreNameToggle}
              />

              <SettingItem
                title="Show Store Address"
                description="Display store address on invoices and receipts"
                value={receiptSettings.showAddress}
                onToggle={(value) => handleReceiptSettingChange('showAddress', value)}
              />

              <SettingItem
                title="Show Phone Number"
                description="Display store phone number on invoices and receipts"
                value={receiptSettings.showPhone}
                onToggle={(value) => handleReceiptSettingChange('showPhone', value)}
              />

              <SettingItem
                title="Show Email"
                description="Display store email on invoices and receipts"
                value={receiptSettings.showEmail}
                onToggle={(value) => handleReceiptSettingChange('showEmail', value)}
              />

              <SettingItem
                title="Show GST Number"
                description="Display GST number on invoices and receipts"
                value={receiptSettings.showGST}
                onToggle={(value) => handleReceiptSettingChange('showGST', value)}
              />
            </>
          )}
        </View>



        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <FeatureButton
            title="Export Data (CSV)"
            icon="download-outline"
            featureKey="data_export"
            onPress={() => navigation.navigate('DataExport')}
          />
          
          <FeatureButton
            title="PDF Reports"
            icon="document-text-outline"
            featureKey="pdf_reports"
            onPress={() => navigation.navigate('PDFReports')}
          />
          
          <FeatureButton
            title="Performance Insights"
            icon="analytics-outline"
            featureKey="performance_insights"
            onPress={() => navigation.navigate('PerformanceInsights')}
          />
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('StorageManagement')}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-outline" size={20} color={colors.primary.main} style={styles.iconStyle} />
            <Text style={styles.actionButtonText}>Storage Management</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleResetAllData}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.background.surface} style={styles.iconStyle} />
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
            <Ionicons name="mail-outline" size={20} color={colors.primary.main} style={styles.iconStyle} />
            <Text style={styles.actionButtonText}>Contact Support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewHelp}
            activeOpacity={0.8}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.primary.main} style={styles.iconStyle} />
            <Text style={styles.actionButtonText}>Help & FAQ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShowAppTour}
            activeOpacity={0.8}
          >
            <Ionicons name="compass-outline" size={20} color={colors.primary.main} style={styles.iconStyle} />
            <Text style={styles.actionButtonText}>Show App Tour</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleRateApp}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={20} color={colors.primary.main} style={styles.iconStyle} />
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
            <Ionicons name="information-circle-outline" size={20} color={colors.primary.main} style={styles.iconStyle} />
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
    padding: 12,
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
  loadingText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  iconStyle: {
    marginRight: spacing.sm, // 8px - standardized
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
  // Locked feature styles
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.warning.border,
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warning.main,
  },
  actionButtonLocked: {
    backgroundColor: colors.gray[50],
    borderColor: colors.border.medium,
  },
  actionButtonTextLocked: {
    color: colors.text.tertiary,
  },
  featureButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
});

export default SettingsScreen;