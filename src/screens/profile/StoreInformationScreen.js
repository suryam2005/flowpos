import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import ResponsiveText from '../../components/ResponsiveText';
import { getDeviceInfo } from '../../utils/deviceUtils';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { colors } from '../../styles/colors';
import * as Sharing from 'expo-sharing';
// Removed API import - now frontend-only

const StoreInformationScreen = ({ navigation }) => {
  const { storeSettings, getStoreProfile, updateStoreSettings } = useStoreSettings();
  const { isTablet } = getDeviceInfo();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Start in view mode
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [storeData, setStoreData] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    store_email: '',
    store_website: '',
    business_type: '',
    gst_number: ''
  });
  const [originalData, setOriginalData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Loading store data from StoreSettingsContext...');
      
      // Get store info from StoreSettingsContext (single source of truth)
      const storeProfile = getStoreProfile();
      
      if (storeProfile && storeProfile.store_name) {
        console.log('✅ Store data found in context, updating form...');
        const loadedData = {
          store_name: storeProfile.store_name || '',
          store_address: storeProfile.store_address || '',
          store_phone: storeSettings?.store_phone || '', // phone/email from storeSettings if available
          store_email: storeSettings?.store_email || '',
          store_website: storeProfile.store_website || '',
          business_type: storeProfile.business_type || '',
          gst_number: storeProfile.gst_number || ''
        };
        setStoreData(loadedData);
        setOriginalData(loadedData); // Save original data for cancel functionality
      } else {
        console.log('⚠️ No store data found in context - store may not be set up yet');
        // No fallback to getStore() - StoreSettingsContext is the single source of truth
        // If context is empty, the store hasn't been set up yet
      }
    } catch (error) {
      console.error('❌ Error loading store data:', error);
      Alert.alert('Error', 'Failed to load store information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setStoreData(originalData); // Restore original data
    setValidationErrors({}); // Clear validation errors
    setIsEditing(false);
  };

  const generateStoreQR = async () => {
    try {
      setIsGeneratingQR(true);
      
      // Create store information string for QR
      const storeInfo = {
        name: storeData.store_name || 'FlowPOS Store',
        address: storeData.store_address || '',
        phone: storeData.store_phone || '',
        email: storeData.store_email || '',
        website: storeData.store_website || '',
        type: storeData.business_type || ''
      };
      
      // Create a formatted string for QR code
      const qrData = `STORE INFO
Name: ${storeInfo.name}
${storeInfo.address ? `Address: ${storeInfo.address}` : ''}
${storeInfo.phone ? `Phone: ${storeInfo.phone}` : ''}
${storeInfo.email ? `Email: ${storeInfo.email}` : ''}
${storeInfo.website ? `Website: ${storeInfo.website}` : ''}
${storeInfo.type ? `Type: ${storeInfo.type}` : ''}

Powered by FlowPOS`;

      // Generate QR code using a simple QR API
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      
      // Share the QR code URL
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(qrUrl, {
          dialogTitle: 'Share Store QR Code',
          mimeType: 'image/png'
        });
      } else {
        Alert.alert(
          'QR Code Generated',
          'QR code has been generated successfully. You can access it at: ' + qrUrl,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert(
        'Error',
        'Failed to generate QR code. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleSave = async () => {
    // Comprehensive validation before save
    const allErrors = {};
    Object.keys(storeData).forEach(field => {
      const fieldErrors = validateField(field, storeData[field]);
      Object.assign(allErrors, fieldErrors);
    });
    
    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(allErrors);
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    if (!storeData.store_name.trim()) {
      Alert.alert('Validation Error', 'Store name is required');
      return;
    }

    try {
      setIsSaving(true);
      
      console.log('💾 Saving store data via StoreSettingsContext:', storeData);
      
      // Use StoreSettingsContext for write-through update (migrated from updateStore)
      const result = await updateStoreSettings(storeData);
      
      if (result.success) {
        setOriginalData(storeData); // Update original data
        setValidationErrors({}); // Clear validation errors
        setIsEditing(false);
        Alert.alert('Success', 'Store information saved successfully');
      } else {
        // Handle specific errors from StoreSettingsContext
        if (result.error === 'NO_NETWORK') {
          Alert.alert('No Network', result.message || 'Network connection required to save settings.');
        } else {
          Alert.alert('Error', result.message || 'Failed to save store information');
        }
      }
    } catch (error) {
      console.error('Error saving store data:', error);
      Alert.alert('Error', error.message || 'Failed to save store information');
    } finally {
      setIsSaving(false);
    }
  };

  const validateField = (field, value) => {
    const errors = {};
    
    switch (field) {
      case 'store_name':
        if (!value.trim()) {
          errors.store_name = 'Store name is required';
        } else if (value.trim().length < 2) {
          errors.store_name = 'Store name must be at least 2 characters';
        } else if (value.trim().length > 50) {
          errors.store_name = 'Store name must be less than 50 characters';
        }
        break;
        
      case 'store_phone':
        if (value.trim()) {
          const phoneRegex = /^[6-9][0-9]{9}$/;
          if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            errors.store_phone = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
          }
        }
        break;
        
      case 'store_email':
        if (value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value.trim())) {
            errors.store_email = 'Enter a valid email address';
          }
        }
        break;
        
      case 'store_website':
        if (value.trim()) {
          const urlRegex = /^https?:\/\/.+\..+/;
          if (!urlRegex.test(value.trim())) {
            errors.store_website = 'Enter a valid website URL (e.g., https://example.com)';
          }
        }
        break;
        
      case 'gst_number':
        if (value.trim()) {
          const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          if (!gstRegex.test(value.trim().toUpperCase())) {
            errors.gst_number = 'Enter a valid GST number (15 characters)';
          }
        }
        break;
        
      case 'store_address':
        if (value.trim() && value.trim().length > 300) {
          errors.store_address = 'Address must be less than 300 characters';
        }
        break;
        
      case 'business_type':
        if (value.trim() && value.trim().length > 50) {
          errors.business_type = 'Business type must be less than 50 characters';
        }
        break;
    }
    
    return errors;
  };

  const updateField = (field, value) => {
    // Handle phone number formatting
    if (field === 'store_phone') {
      // Only allow digits and limit to 10 characters
      const cleanValue = value.replace(/\D/g, '').slice(0, 10);
      value = cleanValue;
    }
    
    // Handle GST number formatting
    if (field === 'gst_number') {
      value = value.toUpperCase().slice(0, 15);
    }
    
    setStoreData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Real-time validation
    const fieldErrors = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      ...fieldErrors,
      // Clear error if field is now valid
      ...(Object.keys(fieldErrors).length === 0 && { [field]: undefined })
    }));
  };

  const renderField = (label, field, placeholder, multiline = false, keyboardType = 'default') => (
    <View style={styles.fieldContainer}>
      <ResponsiveText variant="body" style={styles.label}>
        {label}
      </ResponsiveText>
      {isEditing ? (
        <View>
          <TextInput
            style={[
              styles.input,
              multiline && styles.multilineInput,
              isTablet && styles.tabletInput,
              validationErrors[field] && styles.inputError
            ]}
            value={storeData[field]}
            onChangeText={(value) => updateField(field, value)}
            placeholder={placeholder}
            placeholderTextColor={colors.text.disabled}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            keyboardType={keyboardType}
            maxLength={
              field === 'store_name' ? 50 :
              field === 'store_phone' ? 10 :
              field === 'gst_number' ? 15 :
              field === 'business_type' ? 50 :
              field === 'store_address' ? 300 :
              undefined
            }
          />
          {validationErrors[field] && (
            <Text style={styles.errorText}>{validationErrors[field]}</Text>
          )}
          {(field === 'store_name' || field === 'business_type' || field === 'store_address') && (
            <Text style={styles.characterCount}>
              {storeData[field].length}/{
                field === 'store_name' ? 50 :
                field === 'business_type' ? 50 :
                field === 'store_address' ? 300 : 0
              }
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.valueContainer}>
          <ResponsiveText variant="body" style={styles.value}>
            {storeData[field] || 'Not set'}
          </ResponsiveText>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <ResponsiveText variant="title" style={styles.headerTitle}>
            Store Information
          </ResponsiveText>
        </View>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <ResponsiveText variant="body" style={styles.loadingText}>
            Loading store information...
          </ResponsiveText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <ResponsiveText variant="title" style={styles.headerTitle}>
            Store Information
          </ResponsiveText>
          
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <ResponsiveText variant="button" style={styles.cancelButtonText}>
                  Cancel
                </ResponsiveText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <LoadingSpinner size="small" color={colors.text.inverse} />
                ) : (
                  <ResponsiveText variant="button" style={styles.saveButtonText}>
                    Save
                  </ResponsiveText>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.qrButton}
                onPress={generateStoreQR}
                disabled={isGeneratingQR}
              >
                {isGeneratingQR ? (
                  <LoadingSpinner size="small" color={colors.primary.main} />
                ) : (
                  <>
                    <Ionicons name="qr-code-outline" size={16} color={colors.primary.main} />
                    <ResponsiveText variant="button" style={styles.qrButtonText}>
                      QR Code
                    </ResponsiveText>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEdit}
              >
                <ResponsiveText variant="button" style={styles.editButtonText}>
                  Edit
                </ResponsiveText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.section}>
            <ResponsiveText variant="subtitle" style={styles.sectionTitle}>
              Basic Information
            </ResponsiveText>
            
            {renderField('Store Name *', 'store_name', 'Enter your store name')}
            {renderField('Business Type', 'business_type', 'e.g., Retail, Restaurant, Service')}
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <ResponsiveText variant="subtitle" style={styles.sectionTitle}>
              Contact Information
            </ResponsiveText>
            
            {renderField('Address', 'store_address', 'Enter your store address', true)}
            {renderField('Phone Number', 'store_phone', '9876543210', false, 'phone-pad')}
            {renderField('Email', 'store_email', 'store@example.com', false, 'email-address')}
            {renderField('Website', 'store_website', 'https://yourstore.com')}
          </View>

          {/* Business Details */}
          <View style={styles.section}>
            <ResponsiveText variant="subtitle" style={styles.sectionTitle}>
              Business Details
            </ResponsiveText>
            
            {renderField('GST Number', 'gst_number', 'Enter GST number (optional)')}
          </View>



          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderRadius: 8,
    backgroundColor: colors.gray[100],
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text.primary,
    marginHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  qrButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary.main,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qrButtonText: {
    color: colors.primary.main,
    fontWeight: '600',
    fontSize: 14,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.success.main,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 14,
  },
  valueContainer: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  value: {
    color: colors.text.primary,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: 16,
    color: colors.text.secondary,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow.md,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    color: colors.text.primary,
    marginBottom: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  sectionNote: {
    color: colors.text.secondary,
    marginBottom: 12,
    fontSize: 14,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    color: colors.text.primary,
    marginBottom: 8,
    fontWeight: '500',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.background.surface,
    color: colors.text.primary,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  tabletInput: {
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  bottomSpacing: {
    height: 40,
  },
  inputError: {
    borderColor: colors.error.main,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: colors.error.main,
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
});

export default StoreInformationScreen;