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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import notificationPaymentReader from '../../services/NotificationPaymentReader';

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
    paymentMethods: [], // No default - user must explicitly select payment methods
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
    console.log('🔄 StoreSettingsScreen: Loading settings - VERSION 2.0');
    loadSettingsFromContext();
  }, [storeSettings]);

  // REMOVED: Focus-based refresh to eliminate tab switch API calls
  // The context already loads data on mount and maintains cache
  // Tab switches should use cached data instead of triggering API calls

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
        paymentMethods: payment.payment_methods || [], // No default - use exactly what's saved
      };

      console.log('🔍 Loaded business_type from profile:', profile.business_type); // Debug log

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

      // Validate at least one payment method is selected
      if (!storeInfo.paymentMethods || storeInfo.paymentMethods.length === 0) {
        Alert.alert('Validation Error', 'Please select at least one payment method.');
        return;
      }

      // Validate UPI ID if QR Pay is selected - check all three UPI ID fields
      if (storeInfo.paymentMethods.includes('QR Pay')) {
        const hasValidUpiId = (storeInfo.upiId && storeInfo.upiId.trim()) || 
                             (storeInfo.upiId2 && storeInfo.upiId2.trim()) || 
                             (storeInfo.upiId3 && storeInfo.upiId3.trim());
        
        if (!hasValidUpiId) {
          Alert.alert('Validation Error', 'At least one UPI ID is required when QR Pay is selected.');
          return;
        }
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
        payment_methods: storeInfo.paymentMethods || [], // No default - save exactly what user selected
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
      <View pointerEvents={(!isEditing || options.editable === false) ? 'none' : 'auto'}>
        <TextInput
          style={[
            styles.textInput,
            (!isEditing || options.editable === false) && styles.textInputDisabled
          ]}
          value={value || ''}
          onChangeText={onChangeText}
          placeholder={options.placeholder || `Enter ${label.toLowerCase().replace(' *', '')}`}
          placeholderTextColor={colors.text.secondary}
          keyboardType={options.keyboardType || 'default'}
          multiline={options.multiline || false}
          numberOfLines={options.numberOfLines || 1}
          autoCapitalize={options.autoCapitalize || 'sentences'}
        />
      </View>
    </View>
  );


  const renderSwitchField = (label, description, value, onValueChange, customDisabled = false) => (
    <View style={styles.switchGroup}>
      <View style={styles.switchInfo}>
        <Text style={[styles.switchLabel, (customDisabled || !isEditing) && styles.switchLabelDisabled]}>{label}</Text>
        {description && <Text style={[styles.switchDescription, (customDisabled || !isEditing) && styles.switchDescriptionDisabled]}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(isEditing && !customDisabled) ? onValueChange : undefined}
        disabled={!isEditing || customDisabled}
        trackColor={{ false: colors.gray[100], true: (isEditing && !customDisabled) ? colors.primary.main : colors.gray[200] }}
        thumbColor={value ? ((isEditing && !customDisabled) ? colors.background.surface : colors.gray[300]) : colors.background.surface}
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
                {/* Show selected business type when not editing - styled like Store Name field */}
                {!isEditing && storeInfo.business_type && (
                  <View style={[styles.textInput, styles.textInputDisabled]}>
                    <Text style={styles.selectedBusinessTypeText}>{storeInfo.business_type}</Text>
                  </View>
                )}
                {/* Show all options when editing */}
                {isEditing && (
                  <View style={styles.businessTypeOptions}>
                    {[
                      'Retail Store',
                      'Restaurant/Cafe',
                      'Grocery Store',
                      'Pharmacy',
                      'Electronics Store',
                      'Clothing Store',
                      'Fashion & Apparel',
                      'Service Business',
                      'Other'
                    ].map((type) => {
                      // Clean both values for comparison - trim whitespace and normalize
                      const cleanType = type.trim();
                      const cleanCurrent = (storeInfo.business_type || '').trim();
                      const isSelected = cleanCurrent === cleanType;
                      
                      console.log(`🔍 Business Type Debug: "${cleanType}" vs Current: "${cleanCurrent}" = ${isSelected}`);
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.businessTypeOption,
                            isSelected && styles.businessTypeOptionSelected,
                          ]}
                          onPress={() => {
                            console.log(`✅ Selecting business type: ${type}`);
                            setStoreInfo({
                              ...storeInfo,
                              business_type: type
                            });
                          }}
                        >
                          <Text style={[
                            styles.businessTypeOptionText,
                            isSelected && styles.businessTypeOptionTextSelected,
                          ]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
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
              {/* Show warning if GST number is missing */}
              {(!storeInfo.gst_number || storeInfo.gst_number.trim() === '') && (
                <View style={styles.warningBox}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.warning.main} />
                  <Text style={styles.warningText}>
                    Please enter your GST Number above to enable tax settings
                  </Text>
                </View>
              )}

              {renderSwitchField(
                'Enable GST',
                'Apply GST to all transactions',
                taxSettings.enableGST,
                (value) => setTaxSettings({ ...taxSettings, enableGST: value }),
                !storeInfo.gst_number || storeInfo.gst_number.trim() === '' // Disabled when no GST number
              )}
              
              {/* GST Rate - Disabled when no GST number */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, (!storeInfo.gst_number || storeInfo.gst_number.trim() === '') && styles.inputLabelDisabled]}>
                  GST Rate (%)
                </Text>
                <View pointerEvents={(!isEditing || !storeInfo.gst_number || storeInfo.gst_number.trim() === '') ? 'none' : 'auto'}>
                  <TextInput
                    style={[
                      styles.textInput,
                      (!isEditing || !storeInfo.gst_number || storeInfo.gst_number.trim() === '') && styles.textInputDisabled
                    ]}
                    value={(taxSettings.gstRate || 18).toString()}
                    onChangeText={(text) => {
                      const rate = parseFloat(text) || 0;
                      if (rate >= 0 && rate <= 100) {
                        setTaxSettings({ ...taxSettings, gstRate: rate });
                      }
                    }}
                    placeholder="18"
                    placeholderTextColor={colors.text.secondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {renderSwitchField(
                'Include Tax in Price',
                'Show prices with tax included',
                taxSettings.includeTaxInPrice,
                (value) => setTaxSettings({ ...taxSettings, includeTaxInPrice: value }),
                !storeInfo.gst_number || storeInfo.gst_number.trim() === '' // Disabled when no GST number
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
                            // Remove method - allow empty (validation will catch it on save)
                            newMethods = currentMethods.filter(m => m !== method.id);
                          } else {
                            // Add method
                            newMethods = [...currentMethods, method.id];
                          }

                          // UPDATE STATE FIRST - so selection is saved immediately
                          setStoreInfo({ ...storeInfo, paymentMethods: newMethods });

                          // THEN prompt for notification access (in background)
                          // Only if QR Pay was just enabled
                          if (method.id === 'QR Pay' && !currentMethods.includes(method.id) && Platform.OS === 'android') {
                            // Check and prompt for notification listener permission
                            // This runs asynchronously without blocking the UI
                            setTimeout(() => {
                              notificationPaymentReader.promptNotificationAccess().then((granted) => {
                                if (granted) {
                                  console.log('✅ Notification access granted for payment detection');
                                } else {
                                  // Show info about manual payment confirmation
                                  Alert.alert(
                                    'Auto Payment Detection',
                                    'For automatic payment detection from GPay, PhonePe, and Paytm, you can enable notification access later in Settings.\n\nYou can still confirm payments manually.',
                                    [{ text: 'OK' }]
                                  );
                                }
                              });
                            }, 100); // Small delay to ensure UI updates first
                          }
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

              {/* Only show UPI fields when QR Pay is selected */}
              {storeInfo.paymentMethods?.includes('QR Pay') && (
                <>
                  <View style={styles.paymentSection}>
                    <Text style={styles.inputLabel}>Primary UPI ID *</Text>
                    <Text style={styles.paymentDescription}>
                      Enter your main UPI ID for digital payments and QR code generation
                    </Text>
                    <View style={styles.upiInputContainer} pointerEvents={isEditing ? 'auto' : 'none'}>
                      <TextInput
                        style={styles.upiInput}
                        value={storeInfo.upiId}
                        onChangeText={(text) => setStoreInfo({ ...storeInfo, upiId: text.toLowerCase() })}
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
                    <View style={styles.upiInputContainer} pointerEvents={isEditing ? 'auto' : 'none'}>
                      <TextInput
                        style={[styles.upiInput, { flex: 1 }]}
                        value={storeInfo.upiId2}
                        onChangeText={(text) => setStoreInfo({ ...storeInfo, upiId2: text.toLowerCase() })}
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
                    <View style={styles.upiInputContainer} pointerEvents={isEditing ? 'auto' : 'none'}>
                      <TextInput
                        style={[styles.upiInput, { flex: 1 }]}
                        value={storeInfo.upiId3}
                        onChangeText={(text) => setStoreInfo({ ...storeInfo, upiId3: text.toLowerCase() })}
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
              )}
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
    marginTop: 8,
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
    backgroundColor: colors.primary.main,
    borderWidth: 2,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  businessTypeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
  },
  businessTypeOptionTextSelected: {
    color: colors.background.surface,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning.background || '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning.main,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.warning.text || '#92400E',
    lineHeight: 20,
  },
  switchLabelDisabled: {
    color: colors.gray[400],
    opacity: 0.6,
  },
  switchDescriptionDisabled: {
    color: colors.gray[400],
    opacity: 0.6,
  },
  inputLabelDisabled: {
    color: colors.gray[400],
    opacity: 0.6,
  },
  selectedBusinessTypeText: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
});

export default StoreSettingsScreen;
