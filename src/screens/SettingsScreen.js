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
import AuthenticationService from '../services/AuthenticationService';

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

  const handleBiometricToggle = async (value) => {
    if (value) {
      // Enable biometric
      const result = await AuthenticationService.enableBiometric();
      
      if (result.success) {
        setBiometricEnabled(true);
        await setItemAsync('biometricEnabled', 'true');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Biometric authentication enabled');
      } else {
        Alert.alert('Error', result.error || 'Failed to enable biometric authentication');
      }
    } else {
      // Disable biometric
      Alert.alert(
        'Disable Biometric',
        'Are you sure you want to disable biometric authentication?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await AuthenticationService.disableBiometric();
              setBiometricEnabled(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    }
  };

  const handlePinToggle = async (value) => {
    if (value) {
      // Navigate to PIN setup
      navigation.navigate('PinSetup', { mode: 'setup' });
    } else {
      // Disable PIN
      Alert.alert(
        'Disable PIN',
        'Are you sure you want to disable PIN protection?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await AuthenticationService.disablePin();
              setPinEnabled(false);
              await deleteItemAsync('pinSetupCompleted');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    }
  };

  const handleChangePIN = () => {
    navigation.navigate('PinSetup', { mode: 'change' });
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

  const handleChangePINOld = () => {
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
      // Show loading state
      Alert.alert('Exporting Data', 'Please wait while we prepare your data...');
      
      // Gather all app data
      const [
        productsData,
        ordersData,
        revenueData,
        storeInfoData,
        userDataData
      ] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('orders'),
        AsyncStorage.getItem('revenue'),
        AsyncStorage.getItem('storeInfo'),
        AsyncStorage.getItem('userData')
      ]);

      // Create export data object
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        appVersion: '1.0.0',
        data: {
          products: productsData ? JSON.parse(productsData) : [],
          orders: ordersData ? JSON.parse(ordersData) : [],
          revenue: revenueData ? JSON.parse(revenueData) : { today: 0, week: 0, total: 0, orders: 0 },
          storeInfo: storeInfoData ? JSON.parse(storeInfoData) : null,
          userData: userDataData ? JSON.parse(userDataData) : null,
        },
        statistics: {
          totalProducts: productsData ? JSON.parse(productsData).length : 0,
          totalOrders: ordersData ? JSON.parse(ordersData).length : 0,
          totalRevenue: revenueData ? JSON.parse(revenueData).total || 0 : 0,
        }
      };

      // Convert to JSON string
      const exportString = JSON.stringify(exportData, null, 2);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const storeName = exportData.data.storeInfo?.name || 'FlowPOS';
      const filename = `${storeName.replace(/[^a-zA-Z0-9]/g, '_')}_backup_${timestamp}.json`;

      // Use React Native's Share API to export the data
      const { Share } = require('react-native');
      
      await Share.share({
        message: exportString,
        title: `${storeName} - Data Export`,
        subject: `FlowPOS Data Export - ${timestamp}`,
      });

      Alert.alert(
        'Export Successful!', 
        `Your business data has been exported successfully.\n\nFile: ${filename}\nProducts: ${exportData.statistics.totalProducts}\nOrders: ${exportData.statistics.totalOrders}\nRevenue: ₹${exportData.statistics.totalRevenue}\n\nSave this file securely for backup purposes.`
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
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
      // Show instructions for import
      Alert.alert(
        'Import Data Instructions',
        'To import data:\n\n1. Copy your FlowPOS backup JSON data\n2. Paste it in the next dialog\n3. Confirm to restore your data\n\n⚠️ This will replace all current data!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: showImportDialog }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to start import process');
    }
  };

  const showImportDialog = () => {
    Alert.prompt(
      'Paste Backup Data',
      'Paste your FlowPOS backup JSON data below:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: processImportData }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const processImportData = async (importText) => {
    if (!importText || !importText.trim()) {
      Alert.alert('Invalid Data', 'Please provide valid backup data.');
      return;
    }

    try {
      // Parse the imported JSON
      const importData = JSON.parse(importText.trim());
      
      // Validate the data structure
      if (!importData.data || !importData.version) {
        throw new Error('Invalid backup file format');
      }

      // Show confirmation with data preview
      const stats = importData.statistics || {};
      Alert.alert(
        'Confirm Data Import',
        `Import this backup?\n\nExport Date: ${new Date(importData.exportDate).toLocaleDateString()}\nProducts: ${stats.totalProducts || 0}\nOrders: ${stats.totalOrders || 0}\nRevenue: ₹${stats.totalRevenue || 0}\n\n⚠️ This will replace ALL current data!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Import', style: 'destructive', onPress: () => executeImport(importData) }
        ]
      );
    } catch (error) {
      console.error('Import parsing error:', error);
      Alert.alert(
        'Invalid Data Format', 
        'The provided data is not a valid FlowPOS backup file. Please check the format and try again.'
      );
    }
  };

  const executeImport = async (importData) => {
    try {
      // Show loading
      Alert.alert('Importing Data', 'Please wait while we restore your data...');

      // Import each data type
      const { data } = importData;
      
      const importPromises = [];
      
      if (data.products) {
        importPromises.push(AsyncStorage.setItem('products', JSON.stringify(data.products)));
      }
      
      if (data.orders) {
        importPromises.push(AsyncStorage.setItem('orders', JSON.stringify(data.orders)));
      }
      
      if (data.revenue) {
        importPromises.push(AsyncStorage.setItem('revenue', JSON.stringify(data.revenue)));
      }
      
      if (data.storeInfo) {
        importPromises.push(AsyncStorage.setItem('storeInfo', JSON.stringify(data.storeInfo)));
      }
      
      if (data.userData) {
        importPromises.push(AsyncStorage.setItem('userData', JSON.stringify(data.userData)));
      }

      // Execute all imports
      await Promise.all(importPromises);

      // Mark setup as completed if store info was imported
      if (data.storeInfo) {
        await AsyncStorage.setItem('storeSetupCompleted', 'true');
      }

      // Mark onboarding as completed if products were imported
      if (data.products && data.products.length > 0) {
        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        await AsyncStorage.setItem('productsOnboardingCompleted', 'true');
      }

      Alert.alert(
        'Import Successful!',
        `Your data has been restored successfully!\n\nProducts: ${data.products?.length || 0}\nOrders: ${data.orders?.length || 0}\nStore: ${data.storeInfo?.name || 'Not set'}\n\nPlease restart the app to see all changes.`,
        [
          { text: 'OK', onPress: () => {
            // Optionally trigger a refresh or navigation
            console.log('Data import completed successfully');
          }}
        ]
      );
    } catch (error) {
      console.error('Import execution error:', error);
      Alert.alert(
        'Import Failed', 
        'Failed to import data. Your existing data is safe. Please try again or contact support.'
      );
    }
  };

  const handleBackupData = async () => {
    Alert.alert(
      'Backup Options',
      'Choose how you want to backup your data:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Quick Export', onPress: performDataExport },
        { text: 'Email Backup', onPress: performEmailBackup },
      ]
    );
  };

  const performEmailBackup = async () => {
    try {
      // Gather all app data (same as export)
      const [
        productsData,
        ordersData,
        revenueData,
        storeInfoData,
        userDataData
      ] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('orders'),
        AsyncStorage.getItem('revenue'),
        AsyncStorage.getItem('storeInfo'),
        AsyncStorage.getItem('userData')
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        appVersion: '1.0.0',
        data: {
          products: productsData ? JSON.parse(productsData) : [],
          orders: ordersData ? JSON.parse(ordersData) : [],
          revenue: revenueData ? JSON.parse(revenueData) : { today: 0, week: 0, total: 0, orders: 0 },
          storeInfo: storeInfoData ? JSON.parse(storeInfoData) : null,
          userData: userDataData ? JSON.parse(userDataData) : null,
        },
        statistics: {
          totalProducts: productsData ? JSON.parse(productsData).length : 0,
          totalOrders: ordersData ? JSON.parse(ordersData).length : 0,
          totalRevenue: revenueData ? JSON.parse(revenueData).total || 0 : 0,
        }
      };

      const timestamp = new Date().toISOString().split('T')[0];
      const storeName = exportData.data.storeInfo?.name || 'FlowPOS';
      
      // Create email content
      const emailSubject = `FlowPOS Backup - ${storeName} - ${timestamp}`;
      const emailBody = `FlowPOS Data Backup
      
Store: ${storeName}
Backup Date: ${new Date().toLocaleDateString()}
      
Statistics:
• Products: ${exportData.statistics.totalProducts}
• Orders: ${exportData.statistics.totalOrders}  
• Total Revenue: ₹${exportData.statistics.totalRevenue}

BACKUP DATA (Copy and save this JSON data):
${JSON.stringify(exportData, null, 2)}

---
This backup was generated by FlowPOS. Keep this data secure and use it to restore your business data if needed.`;

      // Use Linking to open email client
      const { Linking } = require('react-native');
      const emailUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
        Alert.alert(
          'Email Backup Ready',
          'Your email client has opened with the backup data. Send this email to yourself or save it securely.'
        );
      } else {
        // Fallback to share if email not available
        const { Share } = require('react-native');
        await Share.share({
          message: emailBody,
          title: emailSubject,
          subject: emailSubject,
        });
      }
    } catch (error) {
      console.error('Email backup error:', error);
      Alert.alert('Backup Failed', 'Failed to create email backup. Please try the Quick Export option.');
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

  const handleSystemDiagnostics = async () => {
    try {
      // Gather system information
      const [
        productsData,
        ordersData,
        revenueData,
        storeInfoData,
        userDataData,
        hasOnboarding,
        storeSetup,
        productsOnboarding
      ] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('orders'),
        AsyncStorage.getItem('revenue'),
        AsyncStorage.getItem('storeInfo'),
        AsyncStorage.getItem('userData'),
        AsyncStorage.getItem('hasCompletedOnboarding'),
        AsyncStorage.getItem('storeSetupCompleted'),
        AsyncStorage.getItem('productsOnboardingCompleted')
      ]);

      const products = productsData ? JSON.parse(productsData) : [];
      const orders = ordersData ? JSON.parse(ordersData) : [];
      const revenue = revenueData ? JSON.parse(revenueData) : { today: 0, week: 0, total: 0, orders: 0 };
      const storeInfo = storeInfoData ? JSON.parse(storeInfoData) : null;
      const userData = userDataData ? JSON.parse(userDataData) : null;

      // Calculate storage usage (approximate)
      const storageSize = (
        (productsData?.length || 0) +
        (ordersData?.length || 0) +
        (revenueData?.length || 0) +
        (storeInfoData?.length || 0) +
        (userDataData?.length || 0)
      );

      // Get device info
      const { Platform, Dimensions } = require('react-native');
      const screenData = Dimensions.get('screen');

      const diagnostics = `FlowPOS System Diagnostics
      
📱 Device Information:
• Platform: ${Platform.OS} ${Platform.Version}
• Screen: ${screenData.width}x${screenData.height}
• Scale: ${screenData.scale}x

🏪 Store Information:
• Store Name: ${storeInfo?.name || 'Not set'}
• Business Type: ${storeInfo?.businessType || 'Not set'}
• Setup Complete: ${storeSetup ? '✅ Yes' : '❌ No'}

👤 User Information:
• User Name: ${userData?.name || 'Not set'}
• Email: ${userData?.email || 'Not set'}
• Phone: ${userData?.phone || 'Not set'}

📦 Data Statistics:
• Products: ${products.length}
• Orders: ${orders.length}
• Total Revenue: ₹${revenue.total || 0}
• Today Revenue: ₹${revenue.today || 0}

⚙️ App Status:
• Onboarding: ${hasOnboarding ? '✅ Complete' : '❌ Incomplete'}
• Store Setup: ${storeSetup ? '✅ Complete' : '❌ Incomplete'}
• Products Setup: ${productsOnboarding ? '✅ Complete' : '❌ Incomplete'}
• Storage Used: ~${Math.round(storageSize / 1024)} KB

🔧 Features Status:
• Biometric Lock: ${biometricEnabled ? '✅ Enabled' : '❌ Disabled'}
• PIN Lock: ${pinSetupCompleted ? '✅ Enabled' : '❌ Disabled'}
• Auto Detection: ${autoDetectionEnabled ? '✅ Enabled' : '❌ Disabled'}
• Notifications: ${notificationsEnabled ? '✅ Enabled' : '❌ Disabled'}

Generated: ${new Date().toLocaleString()}`;

      Alert.alert(
        'System Diagnostics',
        diagnostics,
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Share Report', onPress: () => shareSystemReport(diagnostics) }
        ]
      );
    } catch (error) {
      console.error('Diagnostics error:', error);
      Alert.alert('Error', 'Failed to generate system diagnostics.');
    }
  };

  const shareSystemReport = async (diagnostics) => {
    try {
      const { Share } = require('react-native');
      await Share.share({
        message: diagnostics,
        title: 'FlowPOS System Diagnostics',
        subject: 'FlowPOS System Report',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDataAnalytics = async () => {
    try {
      const [productsData, ordersData, revenueData] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('orders'),
        AsyncStorage.getItem('revenue')
      ]);

      const products = productsData ? JSON.parse(productsData) : [];
      const orders = ordersData ? JSON.parse(ordersData) : [];
      const revenue = revenueData ? JSON.parse(revenueData) : { today: 0, week: 0, total: 0, orders: 0 };

      // Calculate analytics
      const totalProducts = products.length;
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? Math.round(revenue.total / totalOrders) : 0;
      
      // Find most popular product
      const productSales = {};
      orders.forEach(order => {
        order.items?.forEach(item => {
          productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
        });
      });
      
      const topProduct = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)[0];

      // Calculate daily average
      const firstOrderDate = orders.length > 0 ? new Date(orders[0].timestamp) : new Date();
      const daysSinceFirst = Math.max(1, Math.ceil((new Date() - firstOrderDate) / (1000 * 60 * 60 * 24)));
      const dailyAvgRevenue = Math.round(revenue.total / daysSinceFirst);
      const dailyAvgOrders = Math.round(totalOrders / daysSinceFirst);

      const analytics = `📊 FlowPOS Data Analytics

💰 Revenue Insights:
• Total Revenue: ₹${revenue.total}
• Today's Revenue: ₹${revenue.today}
• This Week: ₹${revenue.week}
• Average Order Value: ₹${avgOrderValue}
• Daily Average: ₹${dailyAvgRevenue}

📈 Sales Performance:
• Total Orders: ${totalOrders}
• Daily Average Orders: ${dailyAvgOrders}
• Days in Business: ${daysSinceFirst}
• Success Rate: ${totalOrders > 0 ? '100%' : '0%'}

📦 Inventory Status:
• Total Products: ${totalProducts}
• Products with Stock: ${products.filter(p => p.trackStock && p.stock > 0).length}
• Low Stock Items: ${products.filter(p => p.trackStock && p.stock < 5).length}
• Out of Stock: ${products.filter(p => p.trackStock && p.stock === 0).length}

🏆 Top Performance:
• Best Selling Product: ${topProduct ? `${topProduct[0]} (${topProduct[1]} sold)` : 'No sales yet'}
• Peak Sales Day: ${orders.length > 0 ? new Date(orders[orders.length - 1].timestamp).toLocaleDateString() : 'No sales yet'}

Generated: ${new Date().toLocaleString()}`;

      Alert.alert(
        'Data Analytics',
        analytics,
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Share Report', onPress: () => shareAnalyticsReport(analytics) }
        ]
      );
    } catch (error) {
      console.error('Analytics error:', error);
      Alert.alert('Error', 'Failed to generate analytics report.');
    }
  };

  const shareAnalyticsReport = async (analytics) => {
    try {
      const { Share } = require('react-native');
      await Share.share({
        message: analytics,
        title: 'FlowPOS Analytics Report',
        subject: 'Business Analytics Report',
      });
    } catch (error) {
      console.error('Share analytics error:', error);
    }
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
          
          <SettingItemWithNavigation
            title="Notifications"
            description="Receive notifications for orders, payments, and app updates"
            value={notifications}
            onToggle={handleNotificationsToggle}
            onNavigate={() => navigation.navigate('Notifications')}
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
          
          <SettingItem
            title="PIN Lock"
            description="Require a 6-digit PIN to access the app"
            value={pinEnabled}
            onToggle={handlePinToggle}
          />

          {pinEnabled && (
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
          )}

          {biometricAvailable && (
            <SettingItem
              title="Biometric Authentication"
              description="Use fingerprint or face recognition to unlock the app"
              value={biometricEnabled}
              onToggle={handleBiometricToggle}
            />
          )}

          {!biometricAvailable && (
            <View style={styles.biometricUnavailable}>
              <Text style={styles.biometricUnavailableText}>
                Biometric authentication is not available on this device
              </Text>
            </View>
          )}
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
              'Developed with ❤️ for small businesses\n\n• Modern POS System\n• Real-time Analytics\n• Secure Data Management\n• Multi-platform Support\n\nThank you for using FlowPOS!'
            )}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>ℹ️ App Information</Text>
          </TouchableOpacity>
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
            style={styles.actionButton}
            onPress={handleDataAnalytics}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>📊 Data Analytics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleSystemDiagnostics}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>🔧 System Diagnostics</Text>
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
    alignItems: 'center',
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
    backgroundColor: colors.error.background,
  },
  dangerSettingTitle: {
    color: colors.error.main,
  },
  noSecurityContainer: {
    backgroundColor: colors.warning.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning.border,
  },
  noSecurityIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noSecurityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.warning.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  noSecurityText: {
    fontSize: 14,
    color: colors.warning.main,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  enableSecurityButton: {
    backgroundColor: colors.warning.main,
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