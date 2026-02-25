import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import CustomAlert from '../../components/CustomAlert';
import { colors, componentColors } from '../../styles/colors';
import { createButtonStyle, createButtonTextStyle, createCardStyle, createInputStyle } from '../../styles/theme';
import { getCurrencySymbol, getSupportedCurrencies } from '../../utils/currencyUtils';

const StoreSetupScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const [setupCompleted, setSetupCompleted] = useState(false); // Track setup completion
  const scrollViewRef = useRef(null);
  // No animations needed

  // Store Information
  const [storeData, setStoreData] = useState({
    // Step 1: Basic Store Info
    storeName: '',
    ownerName: '',

    // Step 2: Business Details
    address: '',
    businessType: 'Retail Store',
    customBusinessType: '',
    hasGST: null, // null = not answered, true = yes, false = no
    enableGST: false, // Derived from hasGST
    gstNumber: '',
    gstPercentage: '',
    currency: 'INR',

    // Step 3: Payment Setup
    upiId: '',
    upiId2: '',
    upiId3: '',
    paymentMethods: [], // No default - user must explicitly select

    // Step 4: Business Preferences
    requireCustomerDetails: false, // Ask yes/no

    // Step 5: Overview
    timezone: 'Asia/Kolkata',
  });

  const steps = [
    {
      title: 'Store Information',
      subtitle: 'Tell us about your business',
      fields: ['storeName', 'ownerName'],
    },
    {
      title: 'Business Details',
      subtitle: 'Complete your business profile and currency',
      fields: ['address', 'businessType', 'currency'],
    },
    {
      title: 'Payment Setup',
      subtitle: 'Configure payment methods and UPI options',
      fields: ['paymentMethods', 'upiId'],
    },
    {
      title: 'Business Preferences',
      subtitle: 'Configure your business settings',
      fields: [],
    },
    {
      title: 'Setup Overview',
      subtitle: 'Review your store configuration',
      fields: [],
    },
  ];

  const businessTypes = [
    'Retail Store',
    'Restaurant/Cafe',
    'Grocery Store',
    'Pharmacy',
    'Electronics Store',
    'Clothing Store',
    'Service Business',
    'Other',
  ];

  // Use centralized currency utility
  const currencies = getSupportedCurrencies();

  const validateStep = (stepIndex) => {
    const step = steps[stepIndex];
    const requiredFields = step.fields;

    for (const field of requiredFields) {
      if (field === 'storeName' && !storeData.storeName.trim()) {
        return 'Store name is required';
      }
      if (field === 'ownerName' && !storeData.ownerName.trim()) {
        return 'Owner name is required';
      }
      if (field === 'address' && !storeData.address.trim()) {
        return 'Address is required';
      }
      if (field === 'businessType' && storeData.businessType === 'Other' && !storeData.customBusinessType.trim()) {
        return 'Please specify your business type';
      }
      if (field === 'currency' && !storeData.currency) {
        return 'Please select a currency';
      }
      if (field === 'paymentMethods') {
        console.log('🔍 Validating payment methods:', storeData.paymentMethods);
        if (!storeData.paymentMethods || storeData.paymentMethods.length === 0) {
          return 'Please select at least one payment method';
        }
      }
      if (field === 'upiId' && storeData.paymentMethods.includes('QR Pay')) {
        const hasValidUpiId = (storeData.upiId && storeData.upiId.trim()) || 
                             (storeData.upiId2 && storeData.upiId2.trim()) || 
                             (storeData.upiId3 && storeData.upiId3.trim());
        
        if (!hasValidUpiId) {
          return 'At least one UPI ID is required when QR Pay is selected';
        }
      }
    }



    // GST validation - only if user said yes to having GST
    if (storeData.hasGST === true) {
      if (!storeData.gstNumber || !storeData.gstNumber.trim()) {
        return 'Please enter GST number';
      }
      if (!storeData.gstPercentage) {
        return 'Please enter GST percentage';
      }
      if (isNaN(storeData.gstPercentage) || storeData.gstPercentage < 0 || storeData.gstPercentage > 100) {
        return 'GST percentage must be a number between 0 and 100';
      }
    }

    // UPI ID validation
    if (storeData.upiId && !isValidUpiId(storeData.upiId)) {
      return 'Please enter a valid UPI ID (e.g., yourname@paytm)';
    }
    if (storeData.upiId2 && !isValidUpiId(storeData.upiId2)) {
      return 'Please enter a valid secondary UPI ID';
    }
    if (storeData.upiId3 && !isValidUpiId(storeData.upiId3)) {
      return 'Please enter a valid tertiary UPI ID';
    }

    return null;
  };



  const isValidUpiId = (upiId) => {
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    return upiRegex.test(upiId);
  };

  const handleNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      setAlertConfig({
        title: 'Validation Error',
        message: error,
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
      return;
    }

    if (currentStep < steps.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep + 1);
      // Scroll to top when moving to next step
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep - 1);
      // Scroll to top when moving to previous step
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const handleComplete = async () => {
    try {
      // Mark setup as completed FIRST to disable back prevention immediately
      setSetupCompleted(true);
      
      // Save store information to AsyncStorage
      const storeInfoData = {
        store_name: storeData.storeName,
        name: storeData.storeName, // Keep for backward compatibility
        ownerName: storeData.ownerName,
        store_address: storeData.address,
        address: storeData.address, // Keep for backward compatibility
        businessType: storeData.businessType === 'Other' ? storeData.customBusinessType : storeData.businessType,
        originalBusinessType: storeData.businessType,
        customBusinessType: storeData.customBusinessType,
        hasGST: storeData.hasGST,
        enableGST: storeData.hasGST === true,
        gst_number: storeData.hasGST === true ? storeData.gstNumber : '',
        gstNumber: storeData.hasGST === true ? storeData.gstNumber : '', // Keep for backward compatibility
        gstPercentage: storeData.hasGST === true ? storeData.gstPercentage : '',
        hasGst: storeData.hasGST === true && !!(storeData.gstNumber && storeData.gstNumber.trim()),
        upiId: storeData.upiId,
        upiId2: storeData.upiId2,
        upiId3: storeData.upiId3,
        paymentMethods: storeData.paymentMethods,
        currency: storeData.currency,
        timezone: storeData.timezone,
        requireCustomerDetails: storeData.requireCustomerDetails,
        setupCompleted: true,
        setupDate: new Date().toISOString(),
      };

      await AsyncStorage.setItem('storeInfo', JSON.stringify(storeInfoData));

      // Sync store data to backend immediately after onboarding
      try {
        const { apiCallWithFallback } = require('../../config/apiConfig');
        const authToken = await AsyncStorage.getItem('authToken');
        
        if (authToken) {
          console.log('📤 Syncing store data to backend...');
          
          const backendStoreData = {
            store_name: storeData.storeName,
            store_address: storeData.address,
            business_type: storeData.businessType === 'Other' ? storeData.customBusinessType : storeData.businessType,
            gst_number: storeData.hasGST === true ? (storeData.gstNumber || null) : null,
            currency: storeData.currency,
            upi_id: storeData.upiId || null,
            upi_id_2: storeData.upiId2 || null,
            upi_id_3: storeData.upiId3 || null,
            payment_methods: storeData.paymentMethods, // REQUIRED: User must select at least one
            tax_settings: {
              enableGST: storeData.hasGST === true,
              gstRate: storeData.hasGST === true ? (parseFloat(storeData.gstPercentage) || 18) : 0,
              includeTaxInPrice: false,
            },
            app_settings: {
              requireCustomerDetails: storeData.requireCustomerDetails === true,
              notifications: true,
              showStoreNameOnInvoice: false, // Default OFF for new users
              whatsappMethod: 'flowpos',
              sendInvoiceEnabled: false,
            },
          };
          
          console.log('📤 Backend store data:', JSON.stringify(backendStoreData, null, 2));
          console.log('📤 Payment methods being sent:', backendStoreData.payment_methods);
          console.log('📤 requireCustomerDetails being sent:', backendStoreData.app_settings.requireCustomerDetails);
          
          const response = await apiCallWithFallback('/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(backendStoreData),
          });
          
          const responseData = await response.json();
          
          if (response.ok && responseData.success) {
            console.log('✅ Store data synced to backend successfully');
          } else {
            console.warn('⚠️ Failed to sync store data to backend:', responseData.message || 'Unknown error');
            throw new Error(responseData.message || 'Backend sync failed');
          }
        } else {
          throw new Error('No auth token available');
        }
      } catch (syncError) {
        console.error('❌ Error syncing store data to backend:', syncError);
        // Show error to user but allow retry
        Alert.alert(
          'Setup Error',
          `Failed to save store data: ${syncError.message}. Please try again.`,
          [
            { text: 'Retry', onPress: () => handleComplete() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return; // Stop the flow
      }

      // Mark onboarding as completed
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      await AsyncStorage.setItem('storeSetupCompleted', 'true');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setAlertConfig({
        title: 'Setup Complete! 🎉',
        message: `Welcome to FlowPOS, ${storeData.ownerName}! Your store "${storeData.storeName}" is ready to go. Next, let's add some products to get started.`,
        type: 'success',
        buttons: [{
          text: 'Add Products',
          style: 'default',
          onPress: () => navigation.navigate('ProductOnboarding')
        }],
      });
      setShowAlert(true);
    } catch (error) {
      console.error('Error saving store setup:', error);
      // Re-enable back prevention if there's an error
      setSetupCompleted(false);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to save store information. Please try again.',
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
    }
  };

  const updateStoreData = (field, value) => {
    setStoreData(prev => ({ ...prev, [field]: value }));
  };

  // Ensure scroll to top when step changes
  React.useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep]);

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (currentStep) {
      case 0:
        return (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Store Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your store name"
                value={storeData.storeName}
                onChangeText={(text) => updateStoreData('storeName', text)}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Owner Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter owner/manager name"
                value={storeData.ownerName}
                onChangeText={(text) => updateStoreData('ownerName', text)}
                autoCapitalize="words"
              />
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Address *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter your business address"
                value={storeData.address}
                onChangeText={(text) => updateStoreData('address', text)}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.businessTypeScroll}>
                {businessTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.businessTypeOption,
                      storeData.businessType === type && styles.businessTypeOptionSelected
                    ]}
                    onPress={() => updateStoreData('businessType', type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.businessTypeText,
                      storeData.businessType === type && styles.businessTypeTextSelected
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {storeData.businessType === 'Other' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Specify Business Type *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your business type"
                  value={storeData.customBusinessType}
                  onChangeText={(text) => updateStoreData('customBusinessType', text)}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Currency</Text>
              <View style={styles.currencyGrid}>
                {currencies.map((currency) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyOption,
                      storeData.currency === currency.code && styles.currencyOptionSelected
                    ]}
                    onPress={() => {
                      updateStoreData('currency', currency.code);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.currencySymbol,
                      storeData.currency === currency.code && styles.currencySymbolSelected
                    ]}>
                      {currency.symbol}
                    </Text>
                    <Text style={[
                      styles.currencyCode,
                      storeData.currency === currency.code && styles.currencyCodeSelected
                    ]}>
                      {currency.code}
                    </Text>
                    <Text style={styles.currencyName}>{currency.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.formContainer}>
            {storeData.paymentMethods.includes('QR Pay') && (
              <View style={styles.upiInfo}>
                <Text style={styles.upiInfoTitle}>💡 UPI ID Tips</Text>
                <Text style={styles.upiInfoText}>
                  • Use different UPI apps for backup (Paytm, GPay, PhonePe){'\n'}
                  • Ensure all UPI IDs are active and working{'\n'}
                  • Customers can choose which UPI ID to pay to{'\n'}
                  • QR codes will be generated automatically
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Methods</Text>
              <Text style={styles.inputHint}>
                Select which payment methods you want to accept
              </Text>
              <View style={styles.paymentMethodsGrid}>
                {[
                  { id: 'Cash', label: 'Cash', icon: 'cash-outline' },
                  { id: 'QR Pay', label: 'UPI/QR Pay', icon: 'qr-code-outline' },
                ].map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodOption,
                      storeData.paymentMethods.includes(method.id) && styles.paymentMethodOptionSelected
                    ]}
                    onPress={() => {
                      const currentMethods = storeData.paymentMethods;
                      let newMethods;
                      
                      console.log('🔍 Payment method toggle - Current:', currentMethods);
                      console.log('🔍 Payment method toggle - Clicked:', method.id);
                      
                      if (currentMethods.includes(method.id)) {
                        // Remove method - allow empty selection (validation will catch it)
                        newMethods = currentMethods.filter(m => m !== method.id);
                      } else {
                        // Add method
                        newMethods = [...currentMethods, method.id];
                      }
                      
                      console.log('🔍 Payment method toggle - New methods:', newMethods);
                      updateStoreData('paymentMethods', newMethods);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={method.icon} size={24} color={storeData.paymentMethods.includes(method.id) ? colors.primary.main : colors.text.secondary} />
                    <Text style={[
                      styles.paymentMethodText,
                      storeData.paymentMethods.includes(method.id) && styles.paymentMethodTextSelected
                    ]}>
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {storeData.paymentMethods.includes('QR Pay') && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Primary UPI ID *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="yourname@paytm"
                    value={storeData.upiId}
                    onChangeText={(text) => updateStoreData('upiId', text.toLowerCase())}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputHint}>
                    Enter your main UPI ID for receiving payments
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Secondary UPI ID (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="yourname@gpay"
                    value={storeData.upiId2}
                    onChangeText={(text) => updateStoreData('upiId2', text.toLowerCase())}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputHint}>
                    Backup UPI ID in case primary fails
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Third UPI ID (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="yourname@phonepe"
                    value={storeData.upiId3}
                    onChangeText={(text) => updateStoreData('upiId3', text.toLowerCase())}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputHint}>
                    Additional backup UPI ID for maximum reliability
                  </Text>
                </View>
              </>
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GST Registration</Text>
              <Text style={styles.inputHint}>
                Do you have a GST registration number?
              </Text>
              <View style={styles.yesNoContainer}>
                <TouchableOpacity
                  style={[
                    styles.yesNoOption,
                    storeData.hasGST === true && styles.yesNoOptionSelected
                  ]}
                  onPress={() => {
                    updateStoreData('hasGST', true);
                    updateStoreData('enableGST', true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.yesNoText,
                    storeData.hasGST === true && styles.yesNoTextSelected
                  ]}>
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.yesNoOption,
                    storeData.hasGST === false && styles.yesNoOptionSelected
                  ]}
                  onPress={() => {
                    updateStoreData('hasGST', false);
                    updateStoreData('enableGST', false);
                    updateStoreData('gstNumber', '');
                    updateStoreData('gstPercentage', '');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.yesNoText,
                    storeData.hasGST === false && styles.yesNoTextSelected
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {storeData.hasGST === true && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>GST Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter GST number"
                    value={storeData.gstNumber}
                    onChangeText={(text) => updateStoreData('gstNumber', text.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={15}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>GST Percentage *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter GST percentage (e.g., 18)"
                    value={storeData.gstPercentage}
                    onChangeText={(text) => updateStoreData('gstPercentage', text)}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <Text style={styles.inputHint}>
                    This percentage will be added to bills when GST is applicable
                  </Text>
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Customer Details Requirement</Text>
              <Text style={styles.inputHint}>
                Do you want to make customer name and phone number mandatory during checkout?
              </Text>
              <View style={styles.yesNoContainer}>
                <TouchableOpacity
                  style={[
                    styles.yesNoOption,
                    storeData.requireCustomerDetails === true && styles.yesNoOptionSelected
                  ]}
                  onPress={() => updateStoreData('requireCustomerDetails', true)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.yesNoText,
                    storeData.requireCustomerDetails === true && styles.yesNoTextSelected
                  ]}>
                    Yes, Required
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.yesNoOption,
                    storeData.requireCustomerDetails === false && styles.yesNoOptionSelected
                  ]}
                  onPress={() => updateStoreData('requireCustomerDetails', false)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.yesNoText,
                    storeData.requireCustomerDetails === false && styles.yesNoTextSelected
                  ]}>
                    No, Optional
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>
                {storeData.requireCustomerDetails 
                  ? 'Customers must provide their details before checkout' 
                  : 'Customer details will be optional during checkout'}
              </Text>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.formContainer}>
            <View style={styles.overviewContainer}>
              <Text style={styles.overviewTitle}>🎉 Setup Complete!</Text>
              <Text style={styles.overviewSubtitle}>
                Review your store configuration below. You can always change these settings later.
              </Text>
            </View>

            <View style={styles.setupSummary}>
              <Text style={styles.summaryTitle}>Store Information</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Store Name:</Text>
                <Text style={styles.summaryValue}>{storeData.storeName}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Business Type:</Text>
                <Text style={styles.summaryValue}>
                  {storeData.businessType === 'Other' ? storeData.customBusinessType : storeData.businessType}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Currency:</Text>
                <Text style={styles.summaryValue}>{getCurrencySymbol(storeData.currency)} {storeData.currency}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>GST Enabled:</Text>
                <Text style={styles.summaryValue}>{storeData.hasGST === true ? 'Yes' : 'No'}</Text>
              </View>
              {storeData.hasGST === true && storeData.gstNumber && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>GST Details:</Text>
                  <Text style={styles.summaryValue}>{storeData.gstNumber} ({storeData.gstPercentage}%)</Text>
                </View>
              )}
            </View>

            <View style={styles.setupSummary}>
              <Text style={styles.summaryTitle}>Business Preferences</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Customer Details:</Text>
                <Text style={styles.summaryValue}>
                  {storeData.requireCustomerDetails ? 'Required' : 'Optional'}
                </Text>
              </View>
            </View>

            <View style={styles.setupSummary}>
              <Text style={styles.summaryTitle}>Payment Methods</Text>
              <View style={styles.paymentMethodsSummary}>
                {storeData.paymentMethods.map((method, index) => (
                  <View key={method} style={styles.paymentMethodSummaryItem}>
                    <Text style={styles.paymentMethodSummaryIcon}>
                      {method === 'Cash' ? '💵' : method === 'Card' ? '💳' : '📲'}
                    </Text>
                    <Text style={styles.paymentMethodSummaryText}>{method}</Text>
                  </View>
                ))}
              </View>
              {storeData.paymentMethods.includes('QR Pay') && storeData.upiId && (
                <View style={styles.upiSummary}>
                  <Text style={styles.upiSummaryTitle}>UPI IDs:</Text>
                  <Text style={styles.upiSummaryText}>• {storeData.upiId}</Text>
                  {storeData.upiId2 && <Text style={styles.upiSummaryText}>• {storeData.upiId2}</Text>}
                  {storeData.upiId3 && <Text style={styles.upiSummaryText}>• {storeData.upiId3}</Text>}
                </View>
              )}
            </View>

            <View style={styles.nextStepsContainer}>
              <Text style={styles.nextStepsTitle}>What's Next?</Text>
              <Text style={styles.nextStepsText}>
                • Add your first products to start selling{'\n'}
                • Set up optional PIN security{'\n'}
                • Take a quick app tour to learn the features
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.stepCounter}>Step {currentStep + 1} of {steps.length}</Text>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / steps.length) * 100}%` }
              ]}
            />
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          <View style={styles.content}>
            {renderStepContent()}
          </View>
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigation}>
          <View style={styles.navigationButtons}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextButton, currentStep === 0 && styles.nextButtonFull]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Alert */}
        <CustomAlert
          visible={showAlert}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          buttons={alertConfig.buttons}
          onClose={() => setShowAlert(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerContent: {
    alignItems: 'center',
  },
  stepCounter: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  businessTypeScroll: {
    marginTop: 8,
    paddingVertical: 4,
  },
  businessTypeOption: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessTypeOptionSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  businessTypeText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  businessTypeTextSelected: {
    color: colors.background.surface,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  currencyOption: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    marginBottom: 12,
    minHeight: 100,
  },
  currencyOptionSelected: {
    backgroundColor: colors.primary.background,
    borderColor: colors.primary.main,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  currencySymbolSelected: {
    color: colors.primary.main,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
    textAlign: 'center',
  },
  currencyCodeSelected: {
    color: colors.primary.main,
  },
  currencyName: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  setupSummary: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  inputHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  upiInfo: {
    backgroundColor: colors.primary.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.primary.border,
  },
  upiInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
    marginBottom: 8,
  },
  upiInfoText: {
    fontSize: 14,
    color: colors.primary.main,
    lineHeight: 20,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  paymentMethodOption: {
    backgroundColor: colors.background.surface,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    flex: 1,
  },
  paymentMethodOptionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.background,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  paymentMethodTextSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  navigation: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.gray[100],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  nextButton: {
    flex: 2,
    backgroundColor: colors.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  overviewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  overviewSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  paymentMethodsSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  paymentMethodSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paymentMethodSummaryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  paymentMethodSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  upiSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  upiSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  upiSummaryText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  nextStepsContainer: {
    backgroundColor: colors.success.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.success.border,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success.main,
    marginBottom: 8,
  },
  nextStepsText: {
    fontSize: 14,
    color: colors.success.main,
    lineHeight: 20,
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  yesNoOption: {
    flex: 1,
    backgroundColor: colors.background.surface,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesNoOptionSelected: {
    borderColor: colors.primary.main,
    borderWidth: 2,
    backgroundColor: colors.primary.background,
  },
  yesNoText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  yesNoTextSelected: {
    color: colors.primary.main,
    fontWeight: '700',
  },
});

export default StoreSetupScreen;