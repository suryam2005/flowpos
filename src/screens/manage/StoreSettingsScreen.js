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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Linking, Platform } from 'react-native';

const StoreSettingsScreen = () => {
  const [storeInfo, setStoreInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
    currency: 'INR',
    currencySymbol: '₹',
    qrCodeUri: '',
    upiId: '',
    upiId2: '',
    upiId3: '',
  });

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
      const [store, tax, receipt, business] = await Promise.all([
        AsyncStorage.getItem('storeInfo'),
        AsyncStorage.getItem('taxSettings'),
        AsyncStorage.getItem('receiptSettings'),
        AsyncStorage.getItem('businessSettings'),
      ]);

      if (store) setStoreInfo(JSON.parse(store));
      if (tax) setTaxSettings(JSON.parse(tax));
      if (receipt) setReceiptSettings(JSON.parse(receipt));
      if (business) setBusinessSettings(JSON.parse(business));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem('storeInfo', JSON.stringify(storeInfo)),
        AsyncStorage.setItem('taxSettings', JSON.stringify(taxSettings)),
        AsyncStorage.setItem('receiptSettings', JSON.stringify(receiptSettings)),
        AsyncStorage.setItem('businessSettings', JSON.stringify(businessSettings)),
      ]);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
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
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={options.placeholder || `Enter ${label.toLowerCase()}`}
        keyboardType={options.keyboardType || 'default'}
        multiline={options.multiline || false}
        numberOfLines={options.numberOfLines || 1}
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
        onValueChange={onValueChange}
        trackColor={{ false: '#f3f4f6', true: '#8b5cf6' }}
        thumbColor={value ? '#ffffff' : '#ffffff'}
        ios_backgroundColor="#f3f4f6"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Store Information */}
        {renderSection('Store Information', (
          <>
            {renderInputField('Store Name', storeInfo.name, (text) =>
              setStoreInfo({ ...storeInfo, name: text })
            )}
            {renderInputField('Address', storeInfo.address, (text) =>
              setStoreInfo({ ...storeInfo, address: text }),
              { multiline: true, numberOfLines: 3 }
            )}
            {renderInputField('Phone Number', storeInfo.phone, (text) =>
              setStoreInfo({ ...storeInfo, phone: text }),
              { keyboardType: 'phone-pad' }
            )}
            {renderInputField('Email', storeInfo.email, (text) =>
              setStoreInfo({ ...storeInfo, email: text }),
              { keyboardType: 'email-address' }
            )}
            {renderInputField('GST Number', storeInfo.gstNumber, (text) =>
              setStoreInfo({ ...storeInfo, gstNumber: text })
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
                {renderInputField('GST Rate (%)', taxSettings.gstRate.toString(), (text) =>
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
            {renderInputField('Low Stock Threshold', businessSettings.lowStockThreshold.toString(), (text) =>
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
                    onPress={() => setStoreInfo({
                      ...storeInfo,
                      currency: currency.code,
                      currencySymbol: currency.symbol
                    })}
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
              <TextInput
                style={styles.upiInput}
                value={storeInfo.upiId2}
                onChangeText={(text) => setStoreInfo({ ...storeInfo, upiId2: text.toLowerCase() })}
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
                onChangeText={(text) => setStoreInfo({ ...storeInfo, upiId3: text.toLowerCase() })}
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
                onPress={handleQRUpload}
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

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
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
    color: '#1f2937',
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
    backgroundColor: '#ffffff',
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
  switchGroup: {
    backgroundColor: '#ffffff',
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
    color: '#1f2937',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 14,
    color: '#6b7280',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    minWidth: '48%',
    alignItems: 'center',
  },
  currencyOptionSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3f4f6',
  },
  currencyOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  currencyOptionTextSelected: {
    color: '#8b5cf6',
  },
  currencyName: {
    fontSize: 12,
    color: '#9ca3af',
  },
  saveContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  paymentSection: {
    marginBottom: 24,
  },
  paymentDescription: {
    fontSize: 14,
    color: '#6b7280',
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
    backgroundColor: '#ffffff',
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
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  qrSection: {
    marginBottom: 16,
  },
  qrDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  qrUploadButton: {
    backgroundColor: '#ffffff',
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
    color: '#6b7280',
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
    backgroundColor: '#ffffff',
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