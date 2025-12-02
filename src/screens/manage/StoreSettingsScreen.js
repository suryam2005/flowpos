import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import { colors } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const StoreSettingsScreen = ({ navigation }) => {
  const { user, getStore, updateStore } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Enhanced store information with all fields from profile
  const [storeInfo, setStoreInfo] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    store_email: '',
    store_website: '',
    business_type: '',
    gst_number: '',
    pan_number: '',
    // Local settings (not in backend)
    currency: 'INR',
    currencySymbol: '₹',
    qrCodeUri: '',
    upiId: '',
    upiId2: '',
    upiId3: '',
  });
  
  const [originalData, setOriginalData] = useState({});

  const [taxSettings, setTaxSettings] = useState({
    enableGST: true,
    gstRate: 18,
    includeTaxInPrice: false,
  });

  const [receiptSettings, setReceiptSettings] = useState({
    showLogo: false,
    showAddress: true,
    showPhone: true,
    showEmail: false,
    showGST: true,
    footerMessage: 'Thank you for your business!',
  });

  const [businessSettings, setBusinessSettings] = useState({
    lowStockThreshold: 5,
    enableNotifications: true,
    autoBackup: false,
    workingHours: {
      start: '09:00',
      end: '21:00',
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load from backend first
      await loadStoreDataFromBackend();
      
      // Then load local settings
      const [tax, receipt, business, localStore] = await Promise.all([
        AsyncStorage.getItem('taxSettings'),
        AsyncStorage.getItem('receiptSettings'),
        AsyncStorage.getItem('businessSettings'),
        AsyncStorage.getItem('storeInfo'),
      ]);

      if (tax) setTaxSettings(JSON.parse(tax));
      if (receipt) setReceiptSettings(JSON.parse(receipt));
      if (business) setBusinessSettings(JSON.parse(business));
      
      // Merge local settings (currency, UPI, etc.) with backend data
      if (localStore) {
        const localData = JSON.parse(localStore);
        setStoreInfo(prev => ({
          ...prev,
          currency: localData.currency || 'INR',
          currencySymbol: localData.currencySymbol || '₹',
          qrCodeUri: localData.qrCodeUri || '',
          upiId: localData.upiId || '',
          upiId2: localData.upiId2 || '',
          upiId3: localData.upiId3 || '',
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load store settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStoreDataFromBackend = async () => {
    try {
      console.log('🔄 Loading store data from backend via AuthContext...');
      
      const storeData = await getStore();
      
      if (storeData) {
        console.log('✅ Store data found, updating form...');
        const backendData = {
          store_name: storeData.store_name || '',
          store_address: storeData.store_address || '',
          store_phone: storeData.store_phone || '',
          store_email: storeData.store_email || '',
          store_website: storeData.store_website || '',
          business_type: storeData.business_type || '',
          gst_number: storeData.gst_number || '',
          pan_number: storeData.pan_number || '',
          // Additional fields from database
          currency: storeData.currency || 'INR',
          currencySymbol: storeData.currency_symbol || '₹',
          upiId: storeData.upi_id || '',
          upiId2: storeData.upi_id_2 || '',
          upiId3: storeData.upi_id_3 || '',
          qrCodeUri: storeData.qr_code_uri || '',
        };
        
        // Update settings from database if available with safe defaults
        if (storeData.tax_settings && typeof storeData.tax_settings === 'object') {
          setTaxSettings(prev => ({
            ...prev,
            ...storeData.tax_settings,
            gstRate: storeData.tax_settings.gstRate || prev.gstRate || 18
          }));
        }
        if (storeData.receipt_settings && typeof storeData.receipt_settings === 'object') {
          setReceiptSettings(prev => ({
            ...prev,
            ...storeData.receipt_settings
          }));
        }
        if (storeData.business_settings && typeof storeData.business_settings === 'object') {
          setBusinessSettings(prev => ({
            ...prev,
            ...storeData.business_settings,
            lowStockThreshold: storeData.business_settings.lowStockThreshold || prev.lowStockThreshold || 5
          }));
        }
        
        setStoreInfo(prev => ({ ...prev, ...backendData }));
        setOriginalData(backendData);
        console.log('✅ Store data loaded successfully');
      } else {
        console.log('⚠️ No store data found');
      }
    } catch (error) {
      console.error('❌ Error loading store data from backend:', error);
      // Don't show alert here, just log the error
    }
  };

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

      // Prepare data for backend (all store-related fields)
      const backendData = {
        store_name: storeInfo.store_name.trim(),
        store_address: storeInfo.store_address?.trim() || '',
        store_phone: storeInfo.store_phone?.trim() || '',
        store_email: storeInfo.store_email?.trim() || '',
        store_website: storeInfo.store_website?.trim() || '',
        business_type: storeInfo.business_type?.trim() || '',
        gst_number: storeInfo.gst_number?.trim() || '',
        pan_number: storeInfo.pan_number?.trim() || '',
        // Additional fields
        currency: storeInfo.currency || 'INR',
        currency_symbol: storeInfo.currencySymbol || '₹',
        upi_id: storeInfo.upiId?.trim() || '',
        upi_id_2: storeInfo.upiId2?.trim() || '',
        upi_id_3: storeInfo.upiId3?.trim() || '',
        qr_code_uri: storeInfo.qrCodeUri || '',
        tax_settings: taxSettings,
        receipt_settings: receiptSettings,
        business_settings: businessSettings,
      };

      // Save to backend via AuthContext
      console.log('💾 Saving store data to backend via AuthContext...', backendData);
      
      const result = await updateStore(backendData);
      
      if (!result) {
        throw new Error('Failed to save store information');
      }
      
      console.log('📤 Store save successful:', result);

      // Save local settings and all data to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('storeInfo', JSON.stringify(storeInfo)),
        AsyncStorage.setItem('taxSettings', JSON.stringify(taxSettings)),
        AsyncStorage.setItem('receiptSettings', JSON.stringify(receiptSettings)),
        AsyncStorage.setItem('businessSettings', JSON.stringify(businessSettings)),
      ]);

      setOriginalData(backendData);
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
    setStoreInfo(prev => ({ ...prev, ...originalData }));
    setIsEditing(false);
  };



  const handleQRUpload = () => {
    Alert.alert(
      'Upload UPI QR Code',
      'Choose how you want to add your UPI QR code',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => handleQRCamera() },
        { text: 'Choose from Gallery', onPress: () => handleQRGallery() },
      ]
    );
  };

  const handleQRCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await saveQRImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleQRGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Gallery permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await saveQRImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const saveQRImage = async (imageUri) => {
    try {
      // Create a permanent file path
      const fileName = `upi_qr_${Date.now()}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Copy the image to permanent storage
      await FileSystem.copyAsync({
        from: imageUri,
        to: permanentUri,
      });

      // Update store info with the new QR code URI
      const updatedStoreInfo = { ...storeInfo, qrCodeUri: permanentUri };
      setStoreInfo(updatedStoreInfo);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'UPI QR code uploaded successfully!');
    } catch (error) {
      console.error('Error saving QR image:', error);
      Alert.alert('Error', 'Failed to save QR code. Please try again.');
    }
  };

  const handleQRRemove = () => {
    Alert.alert(
      'Remove QR Code',
      'Are you sure you want to remove the uploaded QR code?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setStoreInfo({ ...storeInfo, qrCodeUri: '' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleUPIRedirect = () => {
    if (!storeInfo.upiId) {
      Alert.alert('UPI ID Required', 'Please enter your UPI ID first to generate payment links.');
      return;
    }

    const amount = '100'; // Default amount, can be customized
    const note = encodeURIComponent(`Payment to ${storeInfo.name || 'Store'}`);
    
    // Create UPI payment URL
    const upiUrl = `upi://pay?pa=${storeInfo.upiId}&pn=${encodeURIComponent(storeInfo.name || 'Store')}&am=${amount}&cu=INR&tn=${note}`;
    
    Alert.alert(
      'UPI Payment Options',
      'Choose how you want to use your UPI ID:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Test Payment Link',
          onPress: () => {
            Linking.openURL(upiUrl).catch(() => {
              Alert.alert('Error', 'No UPI apps found on this device.');
            });
          },
        },
        {
          text: 'Generate QR Code',
          onPress: () => {
            Alert.alert(
              'QR Code Generator',
              `Use this UPI ID to generate a QR code:\n\n${storeInfo.upiId}\n\nYou can use any QR code generator app or website to create a payment QR code with this UPI ID.`
            );
          },
        },
      ]
    );
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
        trackColor={{ false: colors.gray[100], true: isEditing ? '#8b5cf6' : colors.gray[200] }}
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
                  {isSaving ? (
                    <LoadingSpinner size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveHeaderButtonText}>Save</Text>
                  )}
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
              {renderInputField('Business Type', storeInfo.business_type, (text) =>
                setStoreInfo({ ...storeInfo, business_type: text }),
                { placeholder: 'e.g., Retail, Restaurant, Service', editable: isEditing }
              )}
              {renderInputField('Address', storeInfo.store_address, (text) =>
                setStoreInfo({ ...storeInfo, store_address: text }),
                { multiline: true, numberOfLines: 3, editable: isEditing }
              )}
              {renderInputField('Phone Number', storeInfo.store_phone, (text) =>
                setStoreInfo({ ...storeInfo, store_phone: text }),
                { keyboardType: 'phone-pad', editable: isEditing }
              )}
              {renderInputField('Email', storeInfo.store_email, (text) =>
                setStoreInfo({ ...storeInfo, store_email: text }),
                { keyboardType: 'email-address', editable: isEditing }
              )}
              {renderInputField('Website', storeInfo.store_website, (text) =>
                setStoreInfo({ ...storeInfo, store_website: text }),
                { placeholder: 'https://yourstore.com', editable: isEditing }
              )}
              {renderInputField('GST Number', storeInfo.gst_number, (text) =>
                setStoreInfo({ ...storeInfo, gst_number: text }),
                { editable: isEditing }
              )}
              {renderInputField('PAN Number', storeInfo.pan_number, (text) =>
                setStoreInfo({ ...storeInfo, pan_number: text }),
                { editable: isEditing }
              )}
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
                {renderInputField('GST Rate (%)', (taxSettings.gstRate || 0).toString(), (text) =>
                  setTaxSettings({ ...taxSettings, gstRate: parseFloat(text) || 0 }),
                  { keyboardType: 'numeric' }
                )}
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

        {/* Receipt Settings */}
        {renderSection('Receipt Settings', (
          <>
            {renderSwitchField(
              'Show Store Address',
              'Display address on receipts',
              receiptSettings.showAddress,
              (value) => setReceiptSettings({ ...receiptSettings, showAddress: value })
            )}
            {renderSwitchField(
              'Show Phone Number',
              'Display phone on receipts',
              receiptSettings.showPhone,
              (value) => setReceiptSettings({ ...receiptSettings, showPhone: value })
            )}
            {renderSwitchField(
              'Show Email',
              'Display email on receipts',
              receiptSettings.showEmail,
              (value) => setReceiptSettings({ ...receiptSettings, showEmail: value })
            )}
            {renderSwitchField(
              'Show GST Number',
              'Display GST number on receipts',
              receiptSettings.showGST,
              (value) => setReceiptSettings({ ...receiptSettings, showGST: value })
            )}
            {renderInputField('Footer Message', receiptSettings.footerMessage, (text) =>
              setReceiptSettings({ ...receiptSettings, footerMessage: text }),
              { multiline: true, numberOfLines: 2 }
            )}
          </>
        ))}

        {/* Business Settings */}
        {renderSection('Business Settings', (
          <>
            {renderInputField('Low Stock Threshold', (businessSettings.lowStockThreshold || 5).toString(), (text) =>
              setBusinessSettings({ ...businessSettings, lowStockThreshold: parseInt(text) || 5 }),
              { keyboardType: 'numeric' }
            )}
            {renderSwitchField(
              'Enable Notifications',
              'Get alerts for low stock and other events',
              businessSettings.enableNotifications,
              (value) => setBusinessSettings({ ...businessSettings, enableNotifications: value })
            )}
            {renderSwitchField(
              'Auto Backup',
              'Automatically backup data daily',
              businessSettings.autoBackup,
              (value) => setBusinessSettings({ ...businessSettings, autoBackup: value })
            )}
          </>
        ))}

        {/* Currency Settings */}
        {renderSection('Currency Settings', (
          <>
            <View style={styles.currencyGroup}>
              <Text style={styles.inputLabel}>Currency</Text>
              <View style={styles.currencyOptions}>
                {[
                  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
                  { code: 'USD', symbol: '$', name: 'US Dollar' },
                  { code: 'EUR', symbol: '€', name: 'Euro' },
                  { code: 'GBP', symbol: '£', name: 'British Pound' },
                ].map((currency) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyOption,
                      storeInfo.currency === currency.code && styles.currencyOptionSelected
                    ]}
                                        onPress={isEditing ? () => setStoreInfo({
                      ...storeInfo,
                      currency: currency.code,
                      currencySymbol: currency.symbol
                    }) : undefined}
                    disabled={!isEditing}
                  >
                    <Text style={[
                      styles.currencyOptionText,
                      storeInfo.currency === currency.code && styles.currencyOptionTextSelected
                    ]}>
                      {currency.symbol} {currency.code}
                    </Text>
                    <Text style={styles.currencyName}>{currency.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ))}

        {/* Payment Settings */}
        {renderSection('Payment Settings', (
          <>
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
              <TextInput
                style={styles.upiInput}
                value={storeInfo.upiId2}
                onChangeText={isEditing ? (text) => setStoreInfo({ ...storeInfo, upiId2: text.toLowerCase() }) : undefined}
                editable={isEditing}
                placeholder="yourname@gpay"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.paymentSection}>
              <Text style={styles.inputLabel}>Third UPI ID (Optional)</Text>
              <Text style={styles.paymentDescription}>
                Additional backup UPI ID for maximum reliability
              </Text>
              <TextInput
                style={styles.upiInput}
                value={storeInfo.upiId3}
                onChangeText={isEditing ? (text) => setStoreInfo({ ...storeInfo, upiId3: text.toLowerCase() }) : undefined}
                editable={isEditing}
                placeholder="yourname@phonepe"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.qrSection}>
              <Text style={styles.inputLabel}>UPI QR Code</Text>
              <Text style={styles.qrDescription}>
                Upload your UPI QR code for quick digital payments
              </Text>

              <TouchableOpacity
                style={styles.qrUploadButton}
                onPress={isEditing ? handleQRUpload : undefined}
                disabled={!isEditing}
                activeOpacity={0.8}
              >
                <Text style={styles.qrUploadIcon}>📷</Text>
                <Text style={styles.qrUploadText}>Upload QR Code</Text>
              </TouchableOpacity>

              {storeInfo.qrCodeUri && (
                <View style={styles.qrPreview}>
                  <View style={styles.qrImageContainer}>
                    <Image 
                      source={{ uri: storeInfo.qrCodeUri }} 
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.qrPreviewActions}>
                    <Text style={styles.qrPreviewText}>✅ UPI QR Code uploaded</Text>
                    <TouchableOpacity
                      style={styles.qrRemoveButton}
                      onPress={handleQRRemove}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.qrRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </>
        ))}
        </ScrollView>
      </KeyboardAvoidingView>
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
  currencyGroup: {
    marginBottom: 16,
  },
  currencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyOption: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    minWidth: '48%',
    alignItems: 'center',
  },
  currencyOptionSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: colors.gray[100],
  },
  currencyOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 2,
  },
  currencyOptionTextSelected: {
    color: '#8b5cf6',
  },
  currencyName: {
    fontSize: 12,
    color: colors.text.tertiary,
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
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upiTestText: {
    color: colors.background.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  qrSection: {
    marginBottom: 16,
  },
  qrDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  qrUploadButton: {
    backgroundColor: colors.background.surface,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  qrUploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  qrUploadText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  qrPreview: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 12,
  },
  qrImageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  qrImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.background.surface,
  },
  qrPreviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrPreviewText: {
    fontSize: 14,
    color: '#15803d',
    fontWeight: '500',
  },
  qrRemoveButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  qrRemoveText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
});

export default StoreSettingsScreen;