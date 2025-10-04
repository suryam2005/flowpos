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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import CustomAlert from '../../components/CustomAlert';

const StoreSetupScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  // No animations needed

  // Store Information
  const [storeData, setStoreData] = useState({
    // Step 1: Basic Store Info
    storeName: '',
    ownerName: '',
    phone: '',
    email: '',

    // Step 2: Business Details
    address: '',
    businessType: 'Retail Store',
    gstNumber: '',

    // Step 3: Payment Setup
    upiId: '',
    upiId2: '',
    upiId3: '',
    paymentMethods: ['Cash'], // Default to Cash

    // Step 4: Preferences
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
  });

  const steps = [
    {
      title: 'Store Information',
      subtitle: 'Tell us about your business',
      fields: ['storeName', 'ownerName', 'phone', 'email'],
    },
    {
      title: 'Business Details',
      subtitle: 'Complete your business profile',
      fields: ['address', 'businessType', 'gstNumber'],
    },
    {
      title: 'Payment Setup',
      subtitle: 'Configure payment methods and UPI options',
      fields: ['paymentMethods', 'upiId'],
    },
    {
      title: 'Preferences',
      subtitle: 'Set your business preferences',
      fields: ['currency', 'timezone'],
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

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
  ];

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
      if (field === 'phone' && !storeData.phone.trim()) {
        return 'Phone number is required';
      }
      if (field === 'address' && !storeData.address.trim()) {
        return 'Address is required';
      }
      if (field === 'paymentMethods' && storeData.paymentMethods.length === 0) {
        return 'Please select at least one payment method';
      }
      if (field === 'upiId' && storeData.paymentMethods.includes('QR Pay') && !storeData.upiId.trim()) {
        return 'UPI ID is required when QR Pay is selected';
      }
    }

    // Email validation (optional but if provided, should be valid)
    if (storeData.email && !isValidEmail(storeData.email)) {
      return 'Please enter a valid email address';
    }

    // Phone validation
    if (storeData.phone && storeData.phone.length < 10) {
      return 'Please enter a valid phone number';
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

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Save store information
      await AsyncStorage.setItem('storeInfo', JSON.stringify({
        name: storeData.storeName,
        ownerName: storeData.ownerName,
        phone: storeData.phone,
        email: storeData.email,
        address: storeData.address,
        businessType: storeData.businessType,
        gstNumber: storeData.gstNumber,
        upiId: storeData.upiId,
        upiId2: storeData.upiId2,
        upiId3: storeData.upiId3,
        paymentMethods: storeData.paymentMethods,
        currency: storeData.currency,
        currencySymbol: storeData.currencySymbol,
        timezone: storeData.timezone,
        setupCompleted: true,
        setupDate: new Date().toISOString(),
      }));

      // Mark onboarding as completed
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      await AsyncStorage.setItem('storeSetupCompleted', 'true');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setAlertConfig({
        title: 'Setup Complete!',
        message: `Welcome to FlowPOS, ${storeData.ownerName}! Your store "${storeData.storeName}" is ready to go.`,
        type: 'success',
        buttons: [{
          text: 'Set Up Security',
          style: 'default',
          onPress: () => navigation.navigate('PinSetup', { isFirstTime: true })
        }],
      });
      setShowAlert(true);
    } catch (error) {
      console.error('Error saving store setup:', error);
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter phone number"
                value={storeData.phone}
                onChangeText={(text) => updateStoreData('phone', text)}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter email address"
                value={storeData.email}
                onChangeText={(text) => updateStoreData('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GST Number (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter GST number if applicable"
                value={storeData.gstNumber}
                onChangeText={(text) => updateStoreData('gstNumber', text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={15}
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Methods</Text>
              <Text style={styles.inputHint}>
                Select which payment methods you want to accept
              </Text>
              <View style={styles.paymentMethodsGrid}>
                {[
                  { id: 'Cash', label: 'Cash', icon: '💵' },
                  { id: 'Card', label: 'Card', icon: '💳' },
                  { id: 'QR Pay', label: 'UPI/QR Pay', icon: '📲' },
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
                      
                      if (currentMethods.includes(method.id)) {
                        // Remove method (but keep at least Cash)
                        newMethods = currentMethods.filter(m => m !== method.id);
                        if (newMethods.length === 0) {
                          newMethods = ['Cash']; // Always keep Cash as fallback
                        }
                      } else {
                        // Add method
                        newMethods = [...currentMethods, method.id];
                      }
                      
                      updateStoreData('paymentMethods', newMethods);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
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

            <View style={styles.upiInfo}>
              <Text style={styles.upiInfoTitle}>💡 UPI ID Tips</Text>
              <Text style={styles.upiInfoText}>
                • Use different UPI apps for backup (Paytm, GPay, PhonePe)
                • Ensure all UPI IDs are active and working
                • Customers can choose which UPI ID to pay to
                • QR codes will be generated automatically
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
                      updateStoreData('currencySymbol', currency.symbol);
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

            <View style={styles.setupSummary}>
              <Text style={styles.summaryTitle}>Setup Summary</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Store:</Text>
                <Text style={styles.summaryValue}>{storeData.storeName}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Owner:</Text>
                <Text style={styles.summaryValue}>{storeData.ownerName}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Type:</Text>
                <Text style={styles.summaryValue}>{storeData.businessType}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Currency:</Text>
                <Text style={styles.summaryValue}>{storeData.currencySymbol} {storeData.currency}</Text>
              </View>
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
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
    backgroundColor: '#f8fafc',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    alignItems: 'center',
  },
  stepCounter: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  scrollContainer: {
    flex: 1,
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
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  businessTypeScroll: {
    marginTop: 8,
  },
  businessTypeOption: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  businessTypeOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  businessTypeText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  businessTypeTextSelected: {
    color: '#ffffff',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  currencyOption: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: '45%',
  },
  currencyOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 4,
  },
  currencySymbolSelected: {
    color: '#2563eb',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  currencyCodeSelected: {
    color: '#2563eb',
  },
  currencyName: {
    fontSize: 12,
    color: '#9ca3af',
  },
  setupSummary: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
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
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  inputHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  upiInfo: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  upiInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  upiInfoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  paymentMethodOption: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    flex: 1,
  },
  paymentMethodOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  paymentMethodTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  navigation: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#2563eb',
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
    color: '#ffffff',
  },
});

export default StoreSetupScreen;