import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';

const StoreSettingsScreen = ({ navigation }) => {
  const { user } = useAuth();
  
  // Use StoreSettingsContext for all store settings
  const {
    storeSettings,
    isLoading: contextLoading,
    getStoreProfile,
    getPaymentSettings,
    getTaxSettings,
    getBusinessSettings,
    updateStoreSettings: contextUpdateStoreSettings,
    refreshSettings,
  } = useStoreSettings();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Store information state (excludes phone/email - they come from AuthContext)
  const [storeInfo, setStoreInfo] = useState({
    store_name: '',
    store_address: '',
    store_website: '',
    business_type: '',
    gst_number: '',
    currency: 'INR',
    upiId: '',
    upiId2: '',
    upiId3: '',
    paymentMethods: ['Cash', 'QR Pay'],
  });
  
  const [originalData, setOriginalData] = useState({});

  const [taxSettings, setTaxSettings] = useState({
    enableGST: false,
    gstRate: 18,
    includeTaxInPrice: false,
  });

  const [receiptSettings, setReceiptSettings] = useState({
    showAddress: true,
    showPhone: true,
    showEmail: false,
    showGST: true,
  });

  const [businessSettings, setBusinessSettings] = useState({
    lowStockThreshold: 10,
    enableNotifications: true,
  });

  // Load settings from context on mount and when context updates
  useEffect(() => {
    loadSettingsFromContext();
  }, [storeSettings]);

  // Reload settings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we have stale data or no data
      if (!storeSettings) {
        refreshSettings();
      }
    }, [storeSettings, refreshSettings])
  );

  // Update loading state based on context
  useEffect(() => {
    if (!contextLoading) {
      setIsLoading(false);
    }
  }, [contextLoading]);

  /**
   * Load settings from StoreSettingsContext into local state
   * Uses getter functions with proper boolean handling
   */
  const loadSettingsFromContext = () => {
    if (!storeSettings) {
      setIsLoading(contextLoading);
      return;
    }

    try {
      // Get store profile (6 fields - excludes phone/email)
      const profile = getStoreProfile();
      
      // Get payment settings
      const payment = getPaymentSettings();
      
      // Get tax settings with proper boolean handling
      const tax = getTaxSettings();
      
      // Get business settings with proper boolean handling
      const business = getBusinessSettings();
      
      // Get receipt settings from context (with proper boolean handling)
      const receipt = storeSettings?.receipt_settings || {};
      
      // Build store info state
      const storeData = {
        store_name: profile.store_name || '',
        store_address: profile.store_address || '',
        store_website: profile.store_website || '',
        business_type: profile.business_type || '',
        gst_number: profile.gst_number || '',
        currency: profile.currency || 'INR',
        upiId: payment.upi_id || '',
        upiId2: payment.upi_id_2 || '',
        upiId3: payment.upi_id_3 || '',
        paymentMethods: payment.payment_methods || ['Cash', 'QR Pay'],
      };
      
      setStoreInfo(storeData);
      setOriginalData(storeData);
      
      // Set tax settings with proper defaults
      setTaxSettings({
        enableGST: tax.enableGST,
        gstRate: tax.gstRate,
        includeTaxInPrice: tax.includeTaxInPrice,
      });
      
      // Set receipt settings with proper boolean handling
      setReceiptSettings({
        showAddress: receipt.showAddress !== undefined ? receipt.showAddress : true,
        showPhone: receipt.showPhone !== undefined ? receipt.showPhone : true,
        showEmail: receipt.showEmail !== undefined ? receipt.showEmail : false,
        showGST: receipt.showGST !== undefined ? receipt.showGST : true,
      });
      
      // Set business settings with proper defaults
      setBusinessSettings({
        lowStockThreshold: business.lowStockThreshold,
        enableNotifications: business.enableNotifications,
      });
      
      setIsLoading(false);
      console.log('✅ Settings loaded from StoreSettingsContext');
    } catch (error) {
      console.error('Error loading settings from context:', error);
      setIsLoading(false);
    }
  };

  /**
   * Save settings using write-through pattern via StoreSettingsContext
   * Handles NO_NETWORK error with user-friendly message
   */
  const saveSettings = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      return;
    }

    try {
      setIsSaving(true);
      
      // Validate required fields
      if (!storeInfo.store_name?.trim()) {
        Alert.alert('Validation Error', 'Store name is required.');
        return;
      }

      // Validate GST number if provided
      if (storeInfo.gst_number && storeInfo.gst_number.trim()) {
        const gstRegex = /^[0-9A-Z]{15}$/;
        if (!gstRegex.test(storeInfo.gst_number.trim())) {
          Alert.alert('Validation Error', 'GST number must be exactly 15 alphanumeric characters.');
          return;
        }
      }

      // Validate website URL if provided
      if (storeInfo.store_website && storeInfo.store_website.trim()) {
        const urlRegex = /^https?:\/\/.+/;
        if (!urlRegex.test(storeInfo.store_website.trim())) {
          Alert.alert('Validation Error', 'Website URL must start with http:// or https://');
          return;
        }
      }

      // Prepare data for backend (all store-related fields)
      // NOTE: phone/email are excluded - they're auth-bound in AuthContext
      const updateData = {
        store_name: storeInfo.store_name.trim(),
        store_address: storeInfo.store_address?.trim() || '',
        store_website: storeInfo.store_website?.trim() || '',
        business_type: storeInfo.business_type?.trim() || '',
        gst_number: storeInfo.gst_number?.trim() || '',
        currency: storeInfo.currency || 'INR',
        upi_id: storeInfo.upiId?.trim() || '',
        upi_id_2: storeInfo.upiId2?.trim() || '',
        upi_id_3: storeInfo.upiId3?.trim() || '',
        payment_methods: storeInfo.paymentMethods || ['Cash', 'QR Pay'],
        tax_settings: taxSettings,
        receipt_settings: receiptSettings,
        business_settings: businessSettings,
      };

      console.log('💾 Saving store data via StoreSettingsContext...', Object.keys(updateData));
      
      // Use write-through update from context (backend first, then cache)
      const result = await contextUpdateStoreSettings(updateData);
      
      if (!result.success) {
        // Handle specific error types
        if (result.error === 'NO_NETWORK') {
          Alert.alert(
            'No Network Connection',
            'Please check your internet connection and try again. Settings cannot be saved offline.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        if (result.error === 'NO_AUTH' || result.error === 'AUTH_ERROR') {
          Alert.alert('Authentication Error', 'Your session has expired. Please log in again.');
          return;
        }
        
        // Generic error
        Alert.alert('Error', result.message || 'Failed to save settings. Please try again.');
        return;
      }

      // Success - update local state
      setOriginalData({ ...storeInfo });
      setIsEditing(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Store settings saved successfully!');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', error.message || 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setStoreInfo({ ...originalData });
    // Reset tax/receipt/business settings from context
    loadSettingsFromContext();
    setIsEditing(false);
  };

  const handleUPITest = (upiId) => {
    if (!upiId) {
      Alert.alert('UPI ID Required', 'Please enter a UPI ID first to test.');
      return;
    }

    const amount = '10';
    const note = encodeURIComponent(`Test payment to ${storeInfo.store_name || 'Store'}`);
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeInfo.store_name || 'Store')}&am=${amount}&cu=INR&tn=${note}`;
    
    Linking.openURL(upiUrl).catch(() => {
      Alert.alert('Error', 'No UPI apps found on this device.');
    });
  };

  const handleUPIRedirect = () => {
    handleUPITest(storeInfo.upiId);
  };

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderInputField = (label, value, onChangeText, options = {}) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          (!isEditing || options.editable === false) && styles.textInputDisabled
        ]}
        value={value || ''}
        onChangeText={onChangeText}
        placeholder={options.placeholder || `Enter ${label.toLowerCase().replace(' *', '')}`}
        keyboardType={options.keyboardType || 'default'}
        multiline={options.multiline || false}
        numberOfLines={options.numberOfLines || 1}
        editable={isEditing && options.editable !== false}
      />
    </View>
  );

  const renderSwitchField = (label, description, value, onValueChange) => (
    <View style={styles.switchGroup}>
      <View style={styles.switchInfo}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description && <Text style={styles.switchDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={isEditing ? onValueChange : undefined}
        disabled={!isEditing}
        trackColor={{ false: colors.gray[100], true: isEditing ? colors.primary.main : colors.gray[200] }}
        thumbColor={value ? (isEditing ? colors.background.surface : colors.gray[300]) : colors.background.surface}
        ios_backgroundColor={colors.gray[100]}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Loading store settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header with Edit/Save buttons */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Store Settings</Text>
          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveHeaderButton, isSaving && styles.buttonDisabled]}
                  onPress={saveSettings}
                  disabled={isSaving}
                >
                  <Text style={styles.saveHeaderButtonText}>Save</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>

          {/* Store Information */}
          {renderSection('Store Information', (
            <>
              {renderInputField('Store Name *', storeInfo.store_name, (text) =>
                setStoreInfo({ ...storeInfo, store_name: text }),
                { editable: isEditing }
              )}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Type</Text>
                <View style={styles.businessTypeOptions}>
                  {[
                    'Retail Store',
                    'Restaurant',
                    'Cafe',
                    'Grocery Store',
                    'Pharmacy',
                    'Electronics Store',
                    'Clothing Store',
                    'Service Business',
                    'Other'
                  ].map((type) => {
                    const isSelected = storeInfo.business_type === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.businessTypeOption,
                          isSelected && styles.businessTypeOptionSelected,
                          !isEditing && !isSelected && styles.businessTypeOptionDisabled
                        ]}
                        onPress={isEditing ? () => setStoreInfo({
                          ...storeInfo,
                          business_type: type
                        }) : undefined}
                        disabled={!isEditing}
                      >
                        <Text style={[
                          styles.businessTypeOptionText,
                          isSelected && styles.businessTypeOptionTextSelected,
                          !isEditing && !isSelected && styles.businessTypeOptionTextDisabled
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {renderInputField('Address', storeInfo.store_address, (text) =>
                setStoreInfo({ ...storeInfo, store_address: text }),
                { multiline: true, numberOfLines: 3, editable: isEditing }
              )}
              {renderInputField('Website', storeInfo.store_website, (text) =>
                setStoreInfo({ ...storeInfo, store_website: text }),
                { placeholder: 'https://yourstore.com', editable: isEditing }
              )}
              {renderInputField('GST Number (15 characters)', storeInfo.gst_number, (text) => {
                const formattedText = text.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
                setStoreInfo({ ...storeInfo, gst_number: formattedText });
              }, { 
                editable: isEditing,
                placeholder: '22AAAAA0000A1Z5',
                autoCapitalize: 'characters'
              })}
            </>
          ))}

        {/* Tax Settings */}
        {renderSection('Tax Settings', (
          <>
            {renderSwitchField(
              'Enable GST',
              'Apply GST to all transactions',
              taxSettings.enableGST,
              (value) => setTaxSettings({ ...taxSettings, enableGST: value })
            )}
            {taxSettings.enableGST && (
              <>
                {renderInputField('GST Rate (%)', (taxSettings.gstRate || 18).toString(), (text) => {
                  const rate = parseFloat(text) || 0;
                  if (rate >= 0 && rate <= 100) {
                    setTaxSettings({ ...taxSettings, gstRate: rate });
                  }
                }, { 
                  keyboardType: 'numeric',
                  placeholder: '18'
                })}
                {renderSwitchField(
                  'Include Tax in Price',
                  'Show prices with tax included',
                  taxSettings.includeTaxInPrice,
                  (value) => setTaxSettings({ ...taxSettings, includeTaxInPrice: value })
                )}
              </>
            )}
          </>
        ))}

        {/* Business Settings */}
        {renderSection('Business Settings', (
          <>
            {renderInputField('Low Stock Threshold', (businessSettings.lowStockThreshold || 10).toString(), (text) => {
              const threshold = parseInt(text) || 10;
              if (threshold >= 1 && threshold <= 1000) {
                setBusinessSettings({ ...businessSettings, lowStockThreshold: threshold });
              }
            }, { 
              keyboardType: 'numeric',
              placeholder: '10'
            })}
            {renderSwitchField(
              'Enable Notifications',
              'Get alerts for low stock and other events',
              businessSettings.enableNotifications,
              (value) => setBusinessSettings({ ...businessSettings, enableNotifications: value })
            )}
          </>
        ))}

        {/* Payment Settings */}
        {renderSection('Payment Settings', (
          <>
            {/* Payment Methods Selection */}
            <View style={styles.paymentSection}>
              <Text style={styles.inputLabel}>Accepted Payment Methods</Text>
              <Text style={styles.paymentDescription}>
                Select which payment methods you want to accept at checkout
              </Text>
              <View style={styles.paymentMethodsGrid}>
                {[
                  { id: 'Cash', label: 'Cash', icon: 'cash-outline' },
                  { id: 'QR Pay', label: 'UPI/QR Pay', icon: 'qr-code-outline' },
                ].map((method) => {
                  const isSelected = storeInfo.paymentMethods?.includes(method.id);
                  return (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.paymentMethodOption,
                        isSelected && styles.paymentMethodOptionSelected,
                        !isEditing && styles.paymentMethodOptionDisabled
                      ]}
                      onPress={isEditing ? () => {
                        const currentMethods = storeInfo.paymentMethods || [];
                        let newMethods;
                        
                        if (currentMethods.includes(method.id)) {
                          newMethods = currentMethods.filter(m => m !== method.id);
                          if (newMethods.length === 0) {
                            newMethods = ['Cash'];
                          }
                        } else {
                          newMethods = [...currentMethods, method.id];
                        }
                        
                        setStoreInfo({ ...storeInfo, paymentMethods: newMethods });
                      } : undefined}
                      disabled={!isEditing}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={method.icon} 
                        size={24} 
                        color={isSelected ? colors.primary.main : colors.text.secondary} 
                      />
                      <Text style={[
                        styles.paymentMethodText,
                        isSelected && styles.paymentMethodTextSelected
                      ]}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.paymentSection}>
              <Text style={styles.inputLabel}>Primary UPI ID</Text>
              <Text style={styles.paymentDescription}>
                Enter your main UPI ID for digital payments and QR code generation
              </Text>
              <View style={styles.upiInputContainer}>
                <TextInput
                  style={styles.upiInput}
                  value={storeInfo.upiId}
                  onChangeText={isEditing ? (text) => setStoreInfo({ ...storeInfo, upiId: text.toLowerCase() }) : undefined}
                  editable={isEditing}
                  placeholder="yourname@paytm"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {storeInfo.upiId && (
                  <TouchableOpacity
                    style={styles.upiTestButton}
                    onPress={handleUPIRedirect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.upiTestText}>Test</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.paymentSection}>
              <Text style={styles.inputLabel}>Secondary UPI ID (Optional)</Text>
              <Text style={styles.paymentDescription}>
                Backup UPI ID in case primary fails
              </Text>
              <View style={styles.upiInputContainer}>
                <TextInput
                  style={[styles.upiInput, { flex: 1 }]}
                  value={storeInfo.upiId2}
                  onChangeText={isEditing ? (text) => setStoreInfo({ ...storeInfo, upiId2: text.toLowerCase() }) : undefined}
                  editable={isEditing}
                  placeholder="yourname@gpay"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {storeInfo.upiId2 && (
                  <TouchableOpacity
                    style={styles.upiTestButton}
                    onPress={() => handleUPITest(storeInfo.upiId2)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.upiTestText}>Test</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.paymentSection}>
              <Text style={styles.inputLabel}>Third UPI ID (Optional)</Text>
              <Text style={styles.paymentDescription}>
                Additional backup UPI ID for maximum reliability
              </Text>
              <View style={styles.upiInputContainer}>
                <TextInput
                  style={[styles.upiInput, { flex: 1 }]}
                  value={storeInfo.upiId3}
                  onChangeText={isEditing ? (text) => setStoreInfo({ ...storeInfo, upiId3: text.toLowerCase() }) : undefined}
                  editable={isEditing}
                  placeholder="yourname@phonepe"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {storeInfo.upiId3 && (
                  <TouchableOpacity
                    style={styles.upiTestButton}
                    onPress={() => handleUPITest(storeInfo.upiId3)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.upiTestText}>Test</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      {isSaving && <LoadingSpinner />}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveHeaderButton: {
    backgroundColor: colors.success.main,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveHeaderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textInputDisabled: {
    backgroundColor: colors.gray[50],
    color: colors.text.secondary,
    borderColor: colors.border.light,
  },
  switchGroup: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  paymentSection: {
    marginBottom: 24,
  },
  paymentDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  upiInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upiInput: {
    flex: 1,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  upiTestButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upiTestText: {
    color: colors.background.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  businessTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  businessTypeOption: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '30%',
    alignItems: 'center',
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  businessTypeOptionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.background,
    borderWidth: 2,
  },
  businessTypeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
  },
  businessTypeOptionTextSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  businessTypeOptionDisabled: {
    opacity: 0.7,
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
  },
  businessTypeOptionTextDisabled: {
    color: colors.gray[400],
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  paymentMethodOption: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '45%',
    flexDirection: 'row',
    gap: 8,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentMethodOptionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.background,
    borderWidth: 2,
  },
  paymentMethodOptionDisabled: {
    opacity: 0.7,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  paymentMethodTextSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
});

export default StoreSettingsScreen;
