import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { authColors as colors } from '../../styles/authColors';
import { buttonStyles } from '../../styles/buttonStyles';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useBackPrevention } from '../../hooks/useBackPrevention';
import { useStoreSettings } from '../../context/StoreSettingsContext';

// Enhanced input validation and security utilities for Store Setup
const StoreValidation = {
  // Sanitize input to prevent XSS and injection attacks
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 500); // Limit length to prevent buffer overflow
  },

  // Store name validation
  validateStoreName: (name) => {
    const sanitized = StoreValidation.sanitizeInput(name);
    if (!sanitized) return { isValid: false, error: 'Store name is required' };
    if (sanitized.length < 2) return { isValid: false, error: 'Store name must be at least 2 characters' };
    if (sanitized.length > 100) return { isValid: false, error: 'Store name is too long (max 100 characters)' };
    
    // Check for valid characters (letters, numbers, spaces, basic punctuation)
    const validNameRegex = /^[a-zA-Z0-9\s\-\.\&\'\,]+$/;
    if (!validNameRegex.test(sanitized)) {
      return { isValid: false, error: 'Store name contains invalid characters' };
    }
    
    return { isValid: true, sanitized };
  },

  // Business type validation
  validateBusinessType: (type, validTypes) => {
    if (!type) return { isValid: false, error: 'Business type is required' };
    if (!validTypes.some(bt => bt.type === type)) {
      return { isValid: false, error: 'Please select a valid business type' };
    }
    return { isValid: true };
  },

  // Address validation
  validateAddress: (address) => {
    const sanitized = StoreValidation.sanitizeInput(address);
    if (!sanitized) return { isValid: false, error: 'Store address is required' };
    if (sanitized.length < 10) return { isValid: false, error: 'Please enter a complete address' };
    if (sanitized.length > 300) return { isValid: false, error: 'Address is too long (max 300 characters)' };
    
    return { isValid: true, sanitized };
  },

  // Phone validation - Indian 10-digit mobile numbers only
  validatePhone: (phone) => {
    const sanitized = phone.replace(/\s/g, ''); // Remove spaces
    if (!sanitized) return { isValid: false, error: 'Phone number is required' };
    
    // Indian 10-digit mobile number validation (starts with 6,7,8,9)
    const phoneRegex = /^[6-9][0-9]{9}$/;
    if (!phoneRegex.test(sanitized)) {
      return { isValid: false, error: 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9' };
    }
    
    return { isValid: true, sanitized };
  },

  // Email validation
  validateEmail: (email) => {
    if (!email || !email.trim()) return { isValid: true, sanitized: '' }; // Optional field
    
    const sanitized = StoreValidation.sanitizeInput(email);
    if (sanitized.length > 100) return { isValid: false, error: 'Email is too long' };
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    
    return { isValid: true, sanitized: sanitized.toLowerCase() };
  },

  // Website validation
  validateWebsite: (website) => {
    if (!website || !website.trim()) return { isValid: true, sanitized: '' }; // Optional field
    
    const sanitized = StoreValidation.sanitizeInput(website);
    if (sanitized.length > 200) return { isValid: false, error: 'Website URL is too long' };
    
    // Basic URL validation
    const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    if (!urlRegex.test(sanitized)) {
      return { isValid: false, error: 'Please enter a valid website URL (include http:// or https://)' };
    }
    
    return { isValid: true, sanitized };
  },

  // UPI ID validation
  validateUpiId: (upiId, isRequired = false) => {
    if (!upiId || !upiId.trim()) {
      if (isRequired) return { isValid: false, error: 'UPI ID is required when UPI payment is enabled' };
      return { isValid: true, sanitized: '' };
    }
    
    const sanitized = upiId.trim().toLowerCase();
    if (sanitized.length > 50) return { isValid: false, error: 'UPI ID is too long' };
    
    // UPI ID format validation
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,50}@[a-zA-Z]{2,20}$/;
    if (!upiRegex.test(sanitized)) {
      return { isValid: false, error: 'Please enter a valid UPI ID (e.g., yourname@paytm)' };
    }
    
    return { isValid: true, sanitized };
  },

  // GST number validation
  validateGstNumber: (gstNumber) => {
    if (!gstNumber || !gstNumber.trim()) return { isValid: true, sanitized: '' }; // Optional field
    
    const sanitized = gstNumber.trim().toUpperCase();
    if (sanitized.length !== 15) return { isValid: false, error: 'GST number must be exactly 15 characters' };
    
    // GST format validation
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(sanitized)) {
      return { isValid: false, error: 'Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)' };
    }
    
    return { isValid: true, sanitized };
  },

  // Description validation
  validateDescription: (description) => {
    if (!description || !description.trim()) return { isValid: true, sanitized: '' }; // Optional field
    
    const sanitized = StoreValidation.sanitizeInput(description);
    if (sanitized.length > 500) return { isValid: false, error: 'Description is too long (max 500 characters)' };
    
    return { isValid: true, sanitized };
  }
};

const { width } = Dimensions.get('window');

const StoreSetupScreen = ({ navigation, route }) => {
  const { createStore, user } = useAuth();
  const { refreshSettings } = useStoreSettings();
  const { isOnboarding = true } = route.params || {};
  
  const [storeData, setStoreData] = useState({
    store_name: '',
    store_description: '',
    store_address: '',
    store_phone: '',
    store_email: user?.email || '',
    store_website: '',
    business_type: '',
    gst_number: '',
    // Payment methods (Cash and UPI selected by default)
    accepts_cash: true,
    accepts_upi: true,
    upi_id: '',
    upi_id_2: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Prevent back navigation during store setup completion
  useBackPrevention(isLoading, {
    message: 'Store setup is in progress. Please wait for completion to avoid losing your setup data.',
    title: 'Setting Up Store',
    hardBlock: true // No cancellation allowed during store setup
  });
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const totalSteps = 4;

  // Validation error states
  const [validationErrors, setValidationErrors] = useState({});

  // Clear validation error for specific field
  const clearValidationError = (field) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const businessTypes = [
    { type: 'Retail Store', icon: 'storefront', color: '#4CAF50', description: 'General merchandise, clothing, accessories' },
    { type: 'Restaurant', icon: 'restaurant', color: '#FF9800', description: 'Food service, dining, takeaway' },
    { type: 'Grocery Store', icon: 'local-grocery-store', color: '#8BC34A', description: 'Food items, daily essentials' },
    { type: 'Fashion & Apparel', icon: 'checkroom', color: '#E91E63', description: 'Clothing, shoes, fashion accessories' },
    { type: 'Electronics', icon: 'devices', color: '#2196F3', description: 'Mobile, computers, gadgets' },
    { type: 'Beauty & Wellness', icon: 'spa', color: '#9C27B0', description: 'Cosmetics, salon, spa services' },
    { type: 'Pharmacy', icon: 'local-pharmacy', color: '#00BCD4', description: 'Medicines, health products' },
    { type: 'Bookstore', icon: 'menu-book', color: '#795548', description: 'Books, stationery, educational' },
    { type: 'Professional Services', icon: 'business-center', color: '#607D8B', description: 'Consulting, repair, maintenance' },
    { type: 'Cafe & Bakery', icon: 'local-cafe', color: '#FF5722', description: 'Coffee, pastries, light meals' },
    { type: 'Automotive', icon: 'directions-car', color: '#795548', description: 'Car parts, service, accessories' },
    { type: 'Other', icon: 'business', color: '#757575', description: 'Custom business type' }
  ];

  const handleInputChange = (field, value) => {
    setStoreData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error when user starts typing
    clearValidationError(field);
  };

  const validateStep = (step) => {
    const errors = {};
    let isValid = true;

    switch (step) {
      case 1:
        // Validate store name
        const storeNameValidation = StoreValidation.validateStoreName(storeData.store_name);
        if (!storeNameValidation.isValid) {
          errors.store_name = storeNameValidation.error;
          isValid = false;
        }

        // Validate business type
        const businessTypeValidation = StoreValidation.validateBusinessType(storeData.business_type, businessTypes);
        if (!businessTypeValidation.isValid) {
          errors.business_type = businessTypeValidation.error;
          isValid = false;
        }

        // Validate description (optional)
        const descriptionValidation = StoreValidation.validateDescription(storeData.store_description);
        if (!descriptionValidation.isValid) {
          errors.store_description = descriptionValidation.error;
          isValid = false;
        }
        break;

      case 2:
        // Validate address
        const addressValidation = StoreValidation.validateAddress(storeData.store_address);
        if (!addressValidation.isValid) {
          errors.store_address = addressValidation.error;
          isValid = false;
        }

        // Validate phone
        const phoneValidation = StoreValidation.validatePhone(storeData.store_phone);
        if (!phoneValidation.isValid) {
          errors.store_phone = phoneValidation.error;
          isValid = false;
        }

        // Validate email (optional)
        const emailValidation = StoreValidation.validateEmail(storeData.store_email);
        if (!emailValidation.isValid) {
          errors.store_email = emailValidation.error;
          isValid = false;
        }

        // Validate website (optional)
        const websiteValidation = StoreValidation.validateWebsite(storeData.store_website);
        if (!websiteValidation.isValid) {
          errors.store_website = websiteValidation.error;
          isValid = false;
        }
        break;

      case 3:
        // Validate UPI ID if UPI is enabled
        if (storeData.accepts_upi) {
          const upiValidation = StoreValidation.validateUpiId(storeData.upi_id, true);
          if (!upiValidation.isValid) {
            errors.upi_id = upiValidation.error;
            isValid = false;
          }
        }

        // Validate secondary UPI ID (optional)
        const upi2Validation = StoreValidation.validateUpiId(storeData.upi_id_2, false);
        if (!upi2Validation.isValid) {
          errors.upi_id_2 = upi2Validation.error;
          isValid = false;
        }
        break;

      case 4:
        // Validate GST number (optional)
        const gstValidation = StoreValidation.validateGstNumber(storeData.gst_number);
        if (!gstValidation.isValid) {
          errors.gst_number = gstValidation.error;
          isValid = false;
        }
        break;

      default:
        return true;
    }

    // Set validation errors
    setValidationErrors(errors);

    // Show first error in alert
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      Alert.alert('Validation Error', firstError);
    }

    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      // During onboarding, show confirmation but don't allow exit
      if (isOnboarding) {
        Alert.alert(
          'Store Setup Required',
          'Store setup is required to continue using FlowPOS. Please complete the setup to access all features.',
          [
            { text: 'Continue Setup', style: 'default' }
          ]
        );
      } else {
        navigation.goBack();
      }
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Prepare store data (Frontend-only - SQL schema fields only)
      const completeStoreData = {
        store_name: storeData.store_name.trim(),
        store_description: storeData.store_description?.trim() || '',
        store_address: storeData.store_address?.trim() || '',
        store_phone: storeData.store_phone?.trim() || '',
        store_email: storeData.store_email?.trim() || '',
        store_website: storeData.store_website?.trim() || '',
        business_type: storeData.business_type || '',
        gst_number: storeData.gst_number?.trim() || '',
        // Payment method data
        upi_id: storeData.accepts_upi ? storeData.upi_id?.trim() || '' : '',
        upi_id_2: storeData.accepts_upi ? storeData.upi_id_2?.trim() || '' : '',
        // Additional fields
        store_logo_url: null,
        social_media: {}
      };

      // 🔍 Store setup with backend integration
      console.log('🔍 Store setup with backend API:');
      console.log('📊 Complete store data:', JSON.stringify(completeStoreData, null, 2));
      
      // Validation
      if (!completeStoreData.store_name || completeStoreData.store_name.trim() === '') {
        Alert.alert(
          'Validation Error',
          'Store name is required.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      console.log('🏪 Creating store via backend API');
      
      let result;
      let isOfflineMode = false;
      
      try {
        result = await createStore(completeStoreData);
        console.log('✅ Store creation result:', result);
      } catch (backendError) {
        console.error('❌ Backend store creation failed:', backendError.message);
        
        // Enhanced error handling for different scenarios
        if (backendError.message.includes('Cannot connect to server') || 
            backendError.message.includes('Network request failed') ||
            backendError.message.includes('timeout') ||
            backendError.message.includes('All connection attempts failed')) {
          
          // Network issues - save locally and continue
          console.log('🔄 Network issue detected, saving store data locally...');
          
          // Save store data to AsyncStorage as fallback
          const storeInfoWithCompat = {
            ...completeStoreData,
            // Backward compatibility fields
            name: completeStoreData.store_name,
            address: completeStoreData.store_address,
            phone: completeStoreData.store_phone,
            gstin: completeStoreData.gst_number,
            businessType: completeStoreData.business_type, // For ProductOnboardingScreen
          };
          
          await AsyncStorage.setItem('storeInfo', JSON.stringify(storeInfoWithCompat));
          await AsyncStorage.setItem('storeSetupCompleted', 'true');
          
          isOfflineMode = true;
          result = { success: true, offline: true };
          
        } else if (backendError.message.includes('Authentication') || 
                   backendError.message.includes('token')) {
          // Auth issues - show specific error
          Alert.alert(
            'Authentication Error', 
            'Your session has expired. Please log in again.',
            [{ text: 'OK' }]
          );
          return;
        } else {
          // Other backend errors - show error but don't allow skip during onboarding
          if (isOnboarding) {
            Alert.alert(
              'Setup Failed',
              `Failed to set up store: ${backendError.message}. Store setup is required to continue.`,
              [
                { text: 'Retry', onPress: () => handleSubmit() }
              ]
            );
            return;
          } else {
            throw backendError;
          }
        }
      }
      
      // Success message based on mode
      const successTitle = isOfflineMode ? 'Store Setup Saved Locally!' : 'Store Setup Complete!';
      const successMessage = isOfflineMode 
        ? 'Your store has been set up locally. It will sync when you\'re online. Welcome to FlowPOS!'
        : 'Your store has been set up successfully. Welcome to FlowPOS!';
      
      Alert.alert(
        successTitle,
        successMessage,
        [
          {
            text: 'Continue',
            onPress: async () => {
              if (isOnboarding) {
                try {
                  // Mark store setup as completed but not full onboarding yet
                  await AsyncStorage.setItem('storeSetupCompleted', 'true');
                  
                  // Refresh StoreSettingsContext cache with new store data
                  try {
                    await refreshSettings();
                    console.log('✅ StoreSettingsContext cache refreshed');
                  } catch (cacheError) {
                    console.warn('⚠️ Failed to refresh store settings cache:', cacheError);
                  }
                  
                  console.log('✅ Store setup marked as completed - navigating to product onboarding');
                  
                  // Navigate to ProductOnboardingScreen to let user choose sample products
                  navigation.navigate('ProductOnboarding');
                } catch (navError) {
                  console.error('Navigation error:', navError);
                  navigation.navigate('ProductOnboarding');
                }
              } else {
                // Refresh cache for non-onboarding flow too
                try {
                  await refreshSettings();
                } catch (cacheError) {
                  console.warn('⚠️ Failed to refresh store settings cache:', cacheError);
                }
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Store setup error:', error);
      
      // Enhanced error messages
      let errorMessage = 'Failed to set up store. Please try again.';
      
      if (error.message.includes('Cannot connect to server')) {
        errorMessage = 'Cannot connect to server. Please check your network connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your network and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // During onboarding, don't allow skip
      if (isOnboarding) {
        Alert.alert(
          'Setup Failed',
          `${errorMessage} Store setup is required to continue using FlowPOS.`,
          [
            { text: 'Retry', onPress: () => handleSubmit() }
          ]
        );
      } else {
        Alert.alert(
          'Setup Failed',
          errorMessage,
          [
            { text: 'Retry', onPress: () => handleSubmit() },
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
          ]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Skip function removed - store setup is now mandatory
  const handleSkip = () => {
    Alert.alert(
      'Store Setup Required',
      'Store setup is mandatory to use FlowPOS. Please complete the setup to access all features.',
      [
        { text: 'Continue Setup', style: 'default' }
      ]
    );
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${(currentStep / totalSteps) * 100}%` }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="storefront" size={32} color={colors.primary.main} />
        </View>
        <Text style={styles.stepTitle}>Basic Information</Text>
        <Text style={styles.stepDescription}>
          Let's start with the basics about your store
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Store Name <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputContainer, validationErrors.store_name && styles.inputError]}>
          <Ionicons name="storefront-outline" size={20} color={validationErrors.store_name ? colors.error : colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.store_name}
            onChangeText={(value) => handleInputChange('store_name', value)}
            placeholder="Enter your store name"
            autoCapitalize="words"
            maxLength={100}
            editable={!isLoading}
          />
        </View>
        {validationErrors.store_name ? (
          <Text style={styles.errorText}>{validationErrors.store_name}</Text>
        ) : (
          <Text style={styles.inputHint}>This will be displayed to your customers</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Business Type <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[
            styles.businessTypeSelector,
            storeData.business_type && styles.businessTypeSelectorSelected
          ]}
          onPress={() => setShowBusinessTypeModal(true)}
        >
          {storeData.business_type ? (
            <View style={styles.selectedBusinessType}>
              <View style={[
                styles.selectedBusinessTypeIcon,
                { backgroundColor: businessTypes.find(b => b.type === storeData.business_type)?.color + '20' }
              ]}>
                <MaterialIcons 
                  name={businessTypes.find(b => b.type === storeData.business_type)?.icon || 'business'} 
                  size={24} 
                  color={businessTypes.find(b => b.type === storeData.business_type)?.color || colors.primary.main} 
                />
              </View>
              <View style={styles.selectedBusinessTypeText}>
                <Text style={styles.selectedBusinessTypeName}>{storeData.business_type}</Text>
                <Text style={styles.selectedBusinessTypeDesc}>
                  {businessTypes.find(b => b.type === storeData.business_type)?.description}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.businessTypePlaceholder}>
              <Ionicons name="business-outline" size={24} color={colors.text.secondary} />
              <Text style={styles.businessTypePlaceholderText}>Select your business type</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Store Description</Text>
        <View style={[styles.inputContainer, validationErrors.store_description && styles.inputError]}>
          <Ionicons name="document-text-outline" size={20} color={validationErrors.store_description ? colors.error : colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.inputWithIcon, styles.textArea]}
            value={storeData.store_description}
            onChangeText={(value) => handleInputChange('store_description', value)}
            placeholder="Brief description of your store (optional)"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={500}
            editable={!isLoading}
          />
        </View>
        {validationErrors.store_description ? (
          <Text style={styles.errorText}>{validationErrors.store_description}</Text>
        ) : (
          <Text style={styles.inputHint}>
            {storeData.store_description.length}/500 characters
          </Text>
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="location" size={32} color={colors.primary.main} />
        </View>
        <Text style={styles.stepTitle}>Contact Information</Text>
        <Text style={styles.stepDescription}>
          How can customers reach your store?
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Store Address <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputContainer, styles.inputContainerMultiline, validationErrors.store_address && styles.inputError]}>
          <Ionicons name="location-outline" size={20} color={validationErrors.store_address ? colors.error : colors.textSecondary} style={styles.inputIconMultiline} />
          <TextInput
            style={styles.textAreaInput}
            value={storeData.store_address}
            onChangeText={(value) => handleInputChange('store_address', value)}
            placeholder="Enter your complete store address&#10;Include street, city, state, and postal code"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
            editable={!isLoading}
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </View>
        {validationErrors.store_address ? (
          <Text style={styles.errorText}>{validationErrors.store_address}</Text>
        ) : (
          <Text style={styles.inputHint}>Include street, city, state, and postal code</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Phone Number <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputContainer, validationErrors.store_phone && styles.inputError]}>
          <Ionicons name="call-outline" size={20} color={validationErrors.store_phone ? colors.error : colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.store_phone}
            onChangeText={(value) => {
              // Only allow digits, remove any non-digit characters
              const cleanValue = value.replace(/\D/g, '');
              handleInputChange('store_phone', cleanValue);
            }}
            placeholder="9876543210"
            keyboardType="phone-pad"
            maxLength={10}
            editable={!isLoading}
          />
        </View>
        {validationErrors.store_phone ? (
          <Text style={styles.errorText}>{validationErrors.store_phone}</Text>
        ) : (
          <Text style={styles.inputHint}>10-digit mobile number without country code</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Store Email</Text>
        <View style={[styles.inputContainer, validationErrors.store_email && styles.inputError]}>
          <Ionicons name="mail-outline" size={20} color={validationErrors.store_email ? colors.error : colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.store_email}
            onChangeText={(value) => handleInputChange('store_email', value)}
            placeholder="store@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={100}
            editable={!isLoading}
          />
        </View>
        {validationErrors.store_email ? (
          <Text style={styles.errorText}>{validationErrors.store_email}</Text>
        ) : (
          <Text style={styles.inputHint}>For customer inquiries and receipts</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Website</Text>
        <View style={[styles.inputContainer, validationErrors.store_website && styles.inputError]}>
          <Ionicons name="globe-outline" size={20} color={validationErrors.store_website ? colors.error : colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.store_website}
            onChangeText={(value) => handleInputChange('store_website', value)}
            placeholder="https://yourstore.com"
            keyboardType="url"
            autoCapitalize="none"
            maxLength={200}
            editable={!isLoading}
          />
        </View>
        {validationErrors.store_website ? (
          <Text style={styles.errorText}>{validationErrors.store_website}</Text>
        ) : (
          <Text style={styles.inputHint}>Your online presence (optional)</Text>
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="time" size={32} color={colors.primary.main} />
        </View>
        <Text style={styles.stepTitle}>Business Operations</Text>
        <Text style={styles.stepDescription}>
          Set up your operating hours and payment methods
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Store Tagline</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="pricetag-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.store_tagline}
            onChangeText={(value) => handleInputChange('store_tagline', value)}
            placeholder="Your store's catchy tagline"
            maxLength={100}
          />
        </View>
        <Text style={styles.inputHint}>A memorable phrase that describes your store</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Payment Methods Accepted</Text>
        <Text style={styles.paymentMethodsHelpText}>
          💡 Cash and UPI are pre-selected. Tap to toggle on/off.
        </Text>
        <View style={styles.paymentMethodsContainer}>
          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              storeData.accepts_cash && styles.paymentMethodCardSelected
            ]}
            onPress={() => handleInputChange('accepts_cash', !storeData.accepts_cash)}
            activeOpacity={0.7}
          >
            <View style={styles.paymentMethodHeader}>
              <FontAwesome5 name="money-bill-wave" size={24} color={colors.success} />
              {storeData.accepts_cash && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={16} color={colors.surface} />
                </View>
              )}
            </View>
            <Text style={styles.paymentMethodText}>Cash</Text>
            <Text style={[
              styles.paymentMethodStatus,
              { color: storeData.accepts_cash ? colors.success.main : colors.text.secondary }
            ]}>
              {storeData.accepts_cash ? 'ENABLED' : 'DISABLED'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              storeData.accepts_upi && styles.paymentMethodCardSelected
            ]}
            onPress={() => handleInputChange('accepts_upi', !storeData.accepts_upi)}
            activeOpacity={0.7}
          >
            <View style={styles.paymentMethodHeader}>
              <FontAwesome5 name="mobile-alt" size={24} color={colors.warning} />
              {storeData.accepts_upi && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={16} color={colors.surface} />
                </View>
              )}
            </View>
            <Text style={styles.paymentMethodText}>UPI</Text>
            <Text style={[
              styles.paymentMethodStatus,
              { color: storeData.accepts_upi ? colors.success.main : colors.text.secondary }
            ]}>
              {storeData.accepts_upi ? 'ENABLED' : 'DISABLED'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* UPI IDs Input - Show only when UPI is selected */}
        {storeData.accepts_upi && (
          <View style={styles.upiInputContainer}>
            <Text style={styles.inputLabel}>Primary UPI ID *</Text>
            <View style={[styles.inputContainer, validationErrors.upi_id && styles.inputError]}>
              <Ionicons name="card-outline" size={20} color={validationErrors.upi_id ? colors.error : colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Enter your primary UPI ID (e.g., yourname@paytm)"
                value={storeData.upi_id}
                onChangeText={(text) => handleInputChange('upi_id', text.toLowerCase())}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={50}
                editable={!isLoading}
              />
            </View>
            {validationErrors.upi_id ? (
              <Text style={styles.errorText}>{validationErrors.upi_id}</Text>
            ) : (
              <Text style={styles.upiHelpText}>
                💡 This will be used for digital payments and QR code generation
              </Text>
            )}
            
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Secondary UPI ID (Optional)</Text>
            <View style={[styles.inputContainer, validationErrors.upi_id_2 && styles.inputError]}>
              <Ionicons name="card-outline" size={20} color={validationErrors.upi_id_2 ? colors.error : colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Enter secondary UPI ID (e.g., business@gpay)"
                value={storeData.upi_id_2}
                onChangeText={(text) => handleInputChange('upi_id_2', text.toLowerCase())}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={50}
                editable={!isLoading}
              />
            </View>
            {validationErrors.upi_id_2 ? (
              <Text style={styles.errorText}>{validationErrors.upi_id_2}</Text>
            ) : (
              <Text style={styles.upiHelpText}>
                💡 Optional backup UPI ID for additional payment options
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Service Options and Operating Hours removed as requested */}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="document" size={32} color={colors.primary.main} />
        </View>
        <Text style={styles.stepTitle}>Business Details</Text>
        <Text style={styles.stepDescription}>
          Optional business registration details for compliance
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>GST Number</Text>
        <View style={[styles.inputContainer, validationErrors.gst_number && styles.inputError]}>
          <Ionicons name="receipt-outline" size={20} color={validationErrors.gst_number ? colors.error : colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.gst_number}
            onChangeText={(value) => handleInputChange('gst_number', value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
            autoCapitalize="characters"
            maxLength={15}
            editable={!isLoading}
          />
        </View>
        {validationErrors.gst_number ? (
          <Text style={styles.errorText}>{validationErrors.gst_number}</Text>
        ) : (
          <Text style={styles.inputHint}>15-digit GST identification number (optional)</Text>
        )}
      </View>

      <View style={styles.completionCard}>
        <View style={styles.completionIconContainer}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success.main} />
        </View>
        <Text style={styles.completionTitle}>Almost Done!</Text>
        <Text style={styles.completionText}>
          Your store setup is almost complete. You can always update these details later from your store settings.
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={colors.primary.main} />
        <Text style={styles.infoText}>
          Additional features like opening hours, social media links, store logo, and payment methods can be configured later from your store settings.
        </Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  const renderBusinessTypeModal = () => (
    <Modal
      visible={showBusinessTypeModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowBusinessTypeModal(false)}
          >
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Business Type</Text>
          <View style={styles.modalCloseButton} />
        </View>

        <ScrollView style={styles.modalContent}>
          {businessTypes.map((business) => (
            <TouchableOpacity
              key={business.type}
              style={[
                styles.businessTypeModalCard,
                storeData.business_type === business.type && styles.businessTypeModalCardSelected
              ]}
              onPress={() => {
                handleInputChange('business_type', business.type);
                setShowBusinessTypeModal(false);
              }}
            >
              <View style={[
                styles.businessTypeModalIcon,
                { backgroundColor: business.color + '20' }
              ]}>
                <MaterialIcons 
                  name={business.icon} 
                  size={24} 
                  color={business.color} 
                />
              </View>
              <View style={styles.businessTypeModalText}>
                <Text style={styles.businessTypeModalName}>{business.type}</Text>
                <Text style={styles.businessTypeModalDesc}>{business.description}</Text>
              </View>
              {storeData.business_type === business.type && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary.main} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons 
              name={currentStep > 1 ? "chevron-back" : "close"} 
              size={24} 
              color={colors.text} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Store Setup</Text>
            <Text style={styles.headerSubtitle}>
              {isOnboarding ? 'Welcome to FlowPOS!' : 'Set up your store'}
            </Text>
          </View>

          {/* Skip button removed - store setup is now mandatory */}
          <View style={styles.skipButton} />
        </View>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={buttonStyles.primary}
            onPress={handleNext}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={buttonStyles.primaryText}>
              {currentStep === totalSteps ? 'Complete Setup' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      {renderBusinessTypeModal()}

      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    paddingVertical: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  inputContainerMultiline: {
    alignItems: 'flex-start', // Changed from 'center' for multiline
    paddingVertical: 4, // Add vertical padding for multiline
  },
  inputIcon: {
    marginRight: 12,
    color: colors.textSecondary,
  },
  inputIconMultiline: {
    marginRight: 12,
    marginTop: 16, // Align with first line of text
    color: colors.textSecondary,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  textAreaInput: {
    flex: 1,
    paddingVertical: 16,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
    lineHeight: 20,
    minHeight: 80,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.surface,
  },
  inputHint: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  businessTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  businessTypeCard: {
    width: (width - 80) / 2,
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  businessTypeCardSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  businessTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  businessTypeCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  businessTypeCardTextSelected: {
    color: colors.surface,
  },
  completionCard: {
    backgroundColor: colors.success.light,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  completionIconContainer: {
    marginBottom: 12,
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success.dark,
    marginBottom: 8,
  },
  completionText: {
    fontSize: 14,
    color: colors.success.dark,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary.light,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary.dark,
    marginLeft: 12,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  // Button styles removed - using standardized buttonStyles
  // Business Type Selector
  businessTypeSelector: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.background.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  businessTypeSelectorSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  selectedBusinessType: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedBusinessTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedBusinessTypeText: {
    flex: 1,
  },
  selectedBusinessTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  selectedBusinessTypeDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  businessTypePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessTypePlaceholderText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginLeft: 12,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  businessTypeModalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.surface,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  businessTypeModalCardSelected: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.main,
  },
  businessTypeModalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  businessTypeModalText: {
    flex: 1,
  },
  businessTypeModalName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  businessTypeModalDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  // Payment Methods
  paymentMethodsHelpText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentMethodCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.surface,
    borderWidth: 2,
    borderColor: colors.border.light,
    minHeight: 100,
  },
  paymentMethodCardSelected: {
    borderColor: colors.primary.main,
    borderWidth: 3,
  },
  paymentMethodHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.success.main,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background.surface,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  paymentMethodTextSelected: {
    color: colors.text.primary,
  },
  paymentMethodStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  paymentMethodStatusSelected: {
    color: colors.surface,
  },
  // UPI Input
  upiInputContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary.light,
  },
  upiHelpText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Service Options
  serviceOptionsContainer: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 4,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  serviceOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceOptionText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 12,
    fontWeight: '500',
  },
  // Operating Hours Button
  operatingHoursButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginTop: 8,
  },
  operatingHoursButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  operatingHoursButtonText: {
    fontSize: 16,
    color: colors.primary.main,
    marginLeft: 12,
    fontWeight: '500',
  },
  // Validation error styles
  inputError: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  // Text input style for UPI inputs
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});

export default StoreSetupScreen;