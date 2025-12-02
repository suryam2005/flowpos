import React, { useState, useEffect } from 'react';
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
  Image,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { authColors as colors } from '../../styles/authColors';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const StoreSetupScreen = ({ navigation, route }) => {
  const { createStore, user } = useAuth();
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
    pan_number: '',
    // Payment methods
    accepts_cash: true,
    accepts_cards: false,
    accepts_upi: false,
    upi_id: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  // Removed showOperatingHours state - not needed anymore
  const totalSteps = 4;

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
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!storeData.store_name.trim()) {
          Alert.alert('Store Name Required', 'Please enter your store name to continue');
          return false;
        }
        if (storeData.store_name.trim().length < 2) {
          Alert.alert('Invalid Store Name', 'Store name must be at least 2 characters long');
          return false;
        }
        if (!storeData.business_type) {
          Alert.alert('Business Type Required', 'Please select your business type to continue');
          return false;
        }
        return true;
      case 2:
        if (!storeData.store_address.trim()) {
          Alert.alert('Address Required', 'Please enter your store address to continue');
          return false;
        }
        if (!storeData.store_phone.trim()) {
          Alert.alert('Phone Required', 'Please enter your store phone number to continue');
          return false;
        }
        // Validate phone number format
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(storeData.store_phone.replace(/\s/g, ''))) {
          Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
          return false;
        }
        // Validate email if provided
        if (storeData.store_email && storeData.store_email.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(storeData.store_email)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address');
            return false;
          }
        }
        return true;
      case 3:
        // Business operations step - validate UPI ID if UPI is selected
        if (storeData.accepts_upi && !storeData.upi_id.trim()) {
          Alert.alert('UPI ID Required', 'Please enter your UPI ID since you selected UPI as a payment method');
          return false;
        }
        if (storeData.accepts_upi && storeData.upi_id.trim()) {
          // Basic UPI ID validation (should contain @ symbol and valid format)
          const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
          if (!upiRegex.test(storeData.upi_id)) {
            Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g., yourname@paytm)');
            return false;
          }
        }
        return true;
      case 4:
        // Optional step - validate GST and PAN if provided
        if (storeData.gst_number && storeData.gst_number.trim()) {
          const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          if (!gstRegex.test(storeData.gst_number.toUpperCase())) {
            Alert.alert('Invalid GST Number', 'Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)');
            return false;
          }
        }
        if (storeData.pan_number && storeData.pan_number.trim()) {
          const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
          if (!panRegex.test(storeData.pan_number.toUpperCase())) {
            Alert.alert('Invalid PAN Number', 'Please enter a valid PAN number (e.g., ABCDE1234F)');
            return false;
          }
        }
        return true;
      default:
        return true;
    }
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
      // Don't allow going back to signup during onboarding
      if (isOnboarding) {
        Alert.alert(
          'Exit Setup?',
          'Are you sure you want to exit store setup? You can complete this later from settings.',
          [
            { text: 'Continue Setup', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: () => handleSkip() }
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
        pan_number: storeData.pan_number?.trim() || '',
        // Payment method data
        upi_id: storeData.accepts_upi ? storeData.upi_id?.trim() || '' : '',
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
      
      const result = await createStore(completeStoreData);
      console.log('✅ Store creation result:', result);
      
      Alert.alert(
        'Store Setup Complete!',
        'Your store has been set up successfully. Welcome to FlowPOS!',
        [
          {
            text: 'Get Started',
            onPress: async () => {
              if (isOnboarding) {
                try {
                  // Mark onboarding and store setup as completed to enable app tour
                  await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
                  await AsyncStorage.setItem('storeSetupCompleted', 'true');
                  console.log('✅ Onboarding and store setup marked as completed - app tour will be available');
                  
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Main', params: { screen: 'POS', params: { startTour: true } } }],
                  });
                } catch (navError) {
                  console.error('Navigation error:', navError);
                  navigation.navigate('Main', { screen: 'POS', params: { startTour: true } });
                }
              } else {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Store setup error:', error);
      Alert.alert(
        'Setup Failed',
        error.message || 'Failed to set up store. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

    const handleSkip = () => {
    Alert.alert(
      'Skip Store Setup?',
      'You can set up your store information later from the settings menu. You\'ll still be able to use FlowPOS with basic features.',
      [
        { text: 'Continue Setup', style: 'cancel' },
        {
          text: 'Skip for Now',
          onPress: async () => {
            if (isOnboarding) {
              try {
                // Mark onboarding and store setup as completed even when skipped
                await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
                await AsyncStorage.setItem('storeSetupCompleted', 'true');
                console.log('✅ Onboarding and store setup marked as completed (skipped) - app tour will be available');
                
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main', params: { screen: 'POS', params: { startTour: true } } }],
                });
              } catch (navError) {
                console.error('Skip navigation error:', navError);
                navigation.navigate('Main');
              }
            } else {
              navigation.goBack();
            }
          },
        },
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
        <View style={styles.inputContainer}>
          <Ionicons name="storefront-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.store_name}
            onChangeText={(value) => handleInputChange('store_name', value)}
            placeholder="Enter your store name"
            autoCapitalize="words"
            maxLength={100}
          />
        </View>
        <Text style={styles.inputHint}>This will be displayed to your customers</Text>
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
        <View style={styles.inputContainer}>
          <Ionicons name="document-text-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.inputWithIcon, styles.textArea]}
            value={storeData.store_description}
            onChangeText={(value) => handleInputChange('store_description', value)}
            placeholder="Brief description of your store (optional)"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>
        <Text style={styles.inputHint}>
          {storeData.store_description.length}/500 characters
        </Text>
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
        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.inputWithIcon, styles.textArea]}
            value={storeData.store_address}
            onChangeText={(value) => handleInputChange('store_address', value)}
            placeholder="Enter your complete store address"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={300}
          />
        </View>
        <Text style={styles.inputHint}>Include street, city, state, and postal code</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Phone Number <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.store_phone}
            onChangeText={(value) => handleInputChange('store_phone', value)}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>
        <Text style={styles.inputHint}>Include country code for better reach</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Store Email</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.store_email}
            onChangeText={(value) => handleInputChange('store_email', value)}
            placeholder="store@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={100}
          />
        </View>
        <Text style={styles.inputHint}>For customer inquiries and receipts</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Website</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="globe-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.store_website}
            onChangeText={(value) => handleInputChange('store_website', value)}
            placeholder="https://yourstore.com"
            keyboardType="url"
            autoCapitalize="none"
            maxLength={200}
          />
        </View>
        <Text style={styles.inputHint}>Your online presence (optional)</Text>
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
        <View style={styles.paymentMethodsContainer}>
          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              storeData.accepts_cash && styles.paymentMethodCardSelected
            ]}
            onPress={() => handleInputChange('accepts_cash', !storeData.accepts_cash)}
          >
            <FontAwesome5 name="money-bill-wave" size={20} color={storeData.accepts_cash ? '#fff' : '#4CAF50'} />
            <Text style={[
              styles.paymentMethodText,
              storeData.accepts_cash && styles.paymentMethodTextSelected
            ]}>Cash</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              storeData.accepts_cards && styles.paymentMethodCardSelected
            ]}
            onPress={() => handleInputChange('accepts_cards', !storeData.accepts_cards)}
          >
            <FontAwesome5 name="credit-card" size={20} color={storeData.accepts_cards ? '#fff' : '#2196F3'} />
            <Text style={[
              styles.paymentMethodText,
              storeData.accepts_cards && styles.paymentMethodTextSelected
            ]}>Cards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              storeData.accepts_upi && styles.paymentMethodCardSelected
            ]}
            onPress={() => handleInputChange('accepts_upi', !storeData.accepts_upi)}
          >
            <FontAwesome5 name="mobile-alt" size={20} color={storeData.accepts_upi ? '#fff' : '#FF9800'} />
            <Text style={[
              styles.paymentMethodText,
              storeData.accepts_upi && styles.paymentMethodTextSelected
            ]}>UPI</Text>
          </TouchableOpacity>
        </View>
        
        {/* UPI ID Input - Show only when UPI is selected */}
        {storeData.accepts_upi && (
          <View style={styles.upiInputContainer}>
            <Text style={styles.inputLabel}>UPI ID *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your UPI ID (e.g., yourname@paytm)"
              value={storeData.upi_id}
              onChangeText={(text) => handleInputChange('upi_id', text.toLowerCase())}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.upiHelpText}>
              💡 This will be used for digital payments and QR code generation
            </Text>
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
        <View style={styles.inputContainer}>
          <Ionicons name="receipt-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.gst_number}
            onChangeText={(value) => handleInputChange('gst_number', value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
            autoCapitalize="characters"
            maxLength={15}
          />
        </View>
        <Text style={styles.inputHint}>15-digit GST identification number (optional)</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>PAN Number</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="card-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={storeData.pan_number}
            onChangeText={(value) => handleInputChange('pan_number', value.toUpperCase())}
            placeholder="ABCDE1234F"
            autoCapitalize="characters"
            maxLength={10}
          />
        </View>
        <Text style={styles.inputHint}>10-character PAN card number (optional)</Text>
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

          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
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
            style={[styles.nextButton, isLoading && styles.disabledButton]}
            onPress={handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === totalSteps ? 'Complete Setup' : 'Next'}
                </Text>
                {currentStep < totalSteps && (
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      {renderBusinessTypeModal()}
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
  },
  inputIcon: {
    marginRight: 12,
    color: colors.textSecondary,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
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
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
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
    color: '#fff',
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
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
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
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethodCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.surface,
    borderWidth: 2,
    borderColor: colors.border.light,
    marginHorizontal: 4,
  },
  paymentMethodCardSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
  },
  paymentMethodTextSelected: {
    color: '#fff',
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
});

export default StoreSetupScreen;