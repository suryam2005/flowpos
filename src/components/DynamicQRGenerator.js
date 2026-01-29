import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { getDeviceInfo } from '../utils/deviceUtils';
import ResponsiveText from './ResponsiveText';
import { useNotificationPaymentReader } from '../hooks/useNotificationPaymentReader';
import { colors } from '../styles/colors';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useAppSettingsContext } from '../context/AppSettingsContext';

const DynamicQRGenerator = ({ 
  amount, 
  visible, 
  onClose, 
  customerName = '', 
  orderNote = '',
  onPaymentComplete,
  onNavigateToSettings // New prop to handle navigation to settings
}) => {
  const [storeInfo, setStoreInfo] = useState(null);
  const [qrValue, setQrValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedUpiId, setSelectedUpiId] = useState('');
  const [availableUpiIds, setAvailableUpiIds] = useState([]);
  const [paymentId, setPaymentId] = useState('');
  const [isAutoListening, setIsAutoListening] = useState(false);
  const [showUpiError, setShowUpiError] = useState(false);
  // Default to FALSE for safety - auto-detection should be explicitly enabled
  const [autoPaymentDetectionEnabled, setAutoPaymentDetectionEnabled] = useState(false);
  
  const { isTablet } = getDeviceInfo();
  const { getSetting } = useAppSettingsContext();
  
  // Use StoreSettingsContext for UPI IDs (migrated from getStore())
  const { storeSettings, getPaymentSettings, getStoreProfile } = useStoreSettings();
  
  // Use refs to store callback functions and avoid dependency issues
  const onCloseRef = useRef(onClose);
  const onPaymentCompleteRef = useRef(onPaymentComplete);
  const onNavigateToSettingsRef = useRef(onNavigateToSettings);
  const paymentIdRef = useRef('');
  const isAutoListeningRef = useRef(false);
  
  // Enhanced notification payment reader hook
  const { 
    isListening, 
    startListening,
    stopListening,
    trackPayment, 
    stopTrackingPayment, 
    lastConfirmation
  } = useNotificationPaymentReader();
  
  const stopTrackingPaymentRef = useRef(stopTrackingPayment);
  const startListeningRef = useRef(startListening);
  const stopListeningRef = useRef(stopListening);
  
  // Keep startListening/stopListening refs in sync
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);
  
  useEffect(() => {
    stopListeningRef.current = stopListening;
  }, [stopListening]);

  // Keep refs in sync with props
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  
  useEffect(() => {
    onPaymentCompleteRef.current = onPaymentComplete;
  }, [onPaymentComplete]);
  
  useEffect(() => {
    onNavigateToSettingsRef.current = onNavigateToSettings;
  }, [onNavigateToSettings]);
  
  useEffect(() => {
    stopTrackingPaymentRef.current = stopTrackingPayment;
  }, [stopTrackingPayment]);

  // Keep state refs in sync
  useEffect(() => {
    paymentIdRef.current = paymentId;
  }, [paymentId]);
  
  useEffect(() => {
    isAutoListeningRef.current = isAutoListening;
  }, [isAutoListening]);

  useEffect(() => {
    if (visible) {
      loadStoreInfo();
      // Generate unique payment ID
      const newPaymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      setPaymentId(newPaymentId);
    } else {
      // Stop tracking immediately when modal closes
      if (paymentIdRef.current && isAutoListeningRef.current) {
        stopTrackingPaymentRef.current(paymentIdRef.current);
        setIsAutoListening(false);
      }
      // Reset state
      setPaymentId('');
      setStoreInfo(null);
      setQrValue('');
      setSelectedUpiId('');
      setAvailableUpiIds([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (storeInfo && amount && visible && selectedUpiId && !qrValue) {
      generateQRCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeInfo, amount, visible, selectedUpiId]);

  // Load auto payment detection setting from AppSettingsContext
  useEffect(() => {
    const loadAutoDetectionSetting = () => {
      try {
        // Use getSetting from context (preferred method)
        const autoDetection = getSetting('autoPaymentDetection');
        
        if (autoDetection !== undefined) {
          setAutoPaymentDetectionEnabled(autoDetection);
          console.log('📱 [DynamicQRGenerator] autoPaymentDetection from context:', autoDetection);
        } else {
          // Fallback to AsyncStorage (backward compatibility)
          AsyncStorage.getItem('autoPaymentDetection').then(setting => {
            if (setting !== null) {
              setAutoPaymentDetectionEnabled(JSON.parse(setting));
              console.log('📱 [DynamicQRGenerator] autoPaymentDetection from AsyncStorage:', JSON.parse(setting));
            } else {
              // Default to FALSE if no setting exists - user must explicitly enable
              setAutoPaymentDetectionEnabled(false);
              console.log('📱 [DynamicQRGenerator] autoPaymentDetection using default: false');
            }
          });
        }
      } catch (error) {
        console.error('Error loading auto payment detection setting:', error);
        setAutoPaymentDetectionEnabled(false); // Default to disabled on error for safety
      }
    };
    loadAutoDetectionSetting();
  }, [getSetting]);

  // Start/stop notification listening based on setting and visibility
  // Only start listening when QR is visible AND auto-detection is enabled
  useEffect(() => {
    if (visible && autoPaymentDetectionEnabled) {
      console.log('📱 [DynamicQRGenerator] Starting notification listener (setting enabled)');
      startListeningRef.current();
    } else if (!visible || !autoPaymentDetectionEnabled) {
      // Stop listening when QR closes or setting is disabled
      if (isListening) {
        console.log('📱 [DynamicQRGenerator] Stopping notification listener');
        stopListeningRef.current();
      }
    }
  }, [visible, autoPaymentDetectionEnabled, isListening]);

  const loadStoreInfo = async () => {
    try {
      console.log('🔄 Loading store info from StoreSettingsContext for QR generation...');
      
      // Get store information from StoreSettingsContext (migrated from getStore())
      const storeProfile = getStoreProfile();
      const paymentSettings = getPaymentSettings();
      
      // Check if store settings are available
      if (!storeSettings) {
        setShowUpiError(true);
        Alert.alert(
          'Store Setup Required',
          'Please set up your store information first to generate QR codes.',
          [
            { text: 'Cancel', onPress: () => onCloseRef.current?.() },
            { 
              text: 'Go to Settings', 
              onPress: () => {
                onCloseRef.current?.();
                onNavigateToSettingsRef.current?.();
              }
            }
          ]
        );
        return;
      }

      // Combine store profile and payment settings for storeData
      const storeData = {
        ...storeProfile,
        ...paymentSettings
      };

      console.log('📊 Store data loaded for QR from context:', storeData);
      setStoreInfo(storeData);
      
      // Set up available UPI IDs from context
      const upiIds = [];
      if (paymentSettings.upi_id) {
        upiIds.push(paymentSettings.upi_id);
      }
      if (paymentSettings.upi_id_2) {
        upiIds.push(paymentSettings.upi_id_2);
      }
      if (paymentSettings.upi_id_3) {
        upiIds.push(paymentSettings.upi_id_3);
      }
      
      console.log('📱 Available UPI IDs from context:', upiIds);
      
      if (upiIds.length === 0) {
        setShowUpiError(true);
        Alert.alert(
          'UPI ID Required',
          'Please add your UPI ID in Store Settings to generate QR codes for UPI payments.',
          [
            { text: 'Cancel', onPress: () => onCloseRef.current?.() },
            { 
              text: 'Add UPI ID', 
              onPress: () => {
                onCloseRef.current?.();
                onNavigateToSettingsRef.current?.();
              }
            }
          ]
        );
        return;
      }
      
      setAvailableUpiIds(upiIds);
      setSelectedUpiId(upiIds[0] || ''); // Default to first UPI ID
      setShowUpiError(false);
    } catch (error) {
      console.error('Error loading store info from context:', error);
      setShowUpiError(true);
      Alert.alert(
        'Error',
        'Failed to load store information. Please check your connection and try again.',
        [{ text: 'OK', onPress: () => onCloseRef.current?.() }]
      );
    }
  };

  const generateQRCode = useCallback(() => {
    if (!selectedUpiId) {
      setShowUpiError(true);
      Alert.alert(
        'UPI ID Required',
        'Please set up your UPI ID in Store Settings first to generate QR codes.',
        [
          { text: 'Cancel', onPress: () => onCloseRef.current?.() },
          { 
            text: 'Add UPI ID', 
            onPress: () => {
              onCloseRef.current?.();
              onNavigateToSettingsRef.current?.();
            }
          }
        ]
      );
      return;
    }

    // Prevent regenerating if already generating
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);

    try {
      // Create UPI payment URL with all parameters
      const storeName = storeInfo?.store_name || storeInfo?.name || 'FlowPOS Store';
      const upiParams = {
        pa: selectedUpiId, // Payee address (UPI ID)
        pn: encodeURIComponent(storeName), // Payee name
        am: amount.toString(), // Amount
        cu: 'INR', // Currency
        tn: encodeURIComponent(
          orderNote || 
          `Payment to ${storeName}${customerName ? ` for ${customerName}` : ''}`
        ), // Transaction note
      };

      // Build UPI URL
      const upiUrl = `upi://pay?${Object.entries(upiParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')}`;

      setQrValue(upiUrl);
      setShowUpiError(false);
      
      // Start tracking this payment for automatic confirmation (only if enabled)
      if (paymentIdRef.current && isListening && !isAutoListeningRef.current && autoPaymentDetectionEnabled) {
        trackPayment(paymentIdRef.current, amount, selectedUpiId, customerName);
        setIsAutoListening(true);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setShowUpiError(true);
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedUpiId, storeInfo, amount, orderNote, customerName, isGenerating, isListening, autoPaymentDetectionEnabled, trackPayment]);

  const handleUpiIdChange = useCallback((upiId) => {
    setSelectedUpiId(upiId);
    setQrValue(''); // Reset QR value to trigger regeneration
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePaymentReceived = useCallback(() => {
    Alert.alert(
      'Payment Confirmation',
      'Have you received the payment confirmation?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Received',
          onPress: () => {
            // Stop tracking
            if (paymentIdRef.current && isAutoListeningRef.current) {
              stopTrackingPaymentRef.current(paymentIdRef.current);
              setIsAutoListening(false);
            }
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onPaymentCompleteRef.current?.();
            onCloseRef.current?.();
          }
        }
      ]
    );
  }, []);

  // Handle automatic payment confirmation
  useEffect(() => {
    if (lastConfirmation && paymentIdRef.current && isAutoListeningRef.current && visible && autoPaymentDetectionEnabled) {
      // Check if this confirmation is for our current payment (exact amount match)
      if (lastConfirmation.activePayment && 
          lastConfirmation.paymentId === paymentIdRef.current &&
          Math.abs(lastConfirmation.amount - amount) < 0.01) {
        
        // Stop tracking immediately
        stopTrackingPaymentRef.current(paymentIdRef.current);
        setIsAutoListening(false);
        
        // Auto-complete payment and redirect to home
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        onPaymentCompleteRef.current?.();
        onCloseRef.current?.();
        
        // Show success message briefly
        Alert.alert(
          'Payment Received!',
          `₹${lastConfirmation.amount} received successfully${lastConfirmation.sender ? ` from ${lastConfirmation.sender}` : ''}`,
          [{ text: 'OK' }]
        );
      }
    }
  }, [lastConfirmation, visible, autoPaymentDetectionEnabled, amount]);

  // Cleanup effect - only run on unmount
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts - use refs for current values
      if (paymentIdRef.current && isAutoListeningRef.current) {
        stopTrackingPaymentRef.current(paymentIdRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  // Show loading state while store info is being fetched
  const isLoadingStore = visible && !storeInfo && !showUpiError;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, isTablet && styles.tabletModalContainer]}>
          <View style={styles.modalHeader}>
            <ResponsiveText variant="title" style={styles.modalTitle}>
              Payment QR Code
            </ResponsiveText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
          {isLoadingStore ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading payment details...</Text>
            </View>
          ) : (
            <>
            {/* Payment Details */}
            <View style={styles.paymentDetails}>
              <View style={styles.amountContainer}>
                <ResponsiveText variant="caption" style={styles.amountLabel}>
                  Amount to Pay
                </ResponsiveText>
                <ResponsiveText variant="title" style={styles.amountValue}>
                  ₹{amount}
                </ResponsiveText>
              </View>

              {storeInfo && (
                <View style={styles.storeDetails}>
                  <ResponsiveText variant="body" style={styles.storeName}>
                    {storeInfo.store_name || storeInfo.name || 'FlowPOS Store'}
                  </ResponsiveText>
                  <ResponsiveText variant="caption" style={styles.upiId}>
                    UPI: {selectedUpiId}
                  </ResponsiveText>
                </View>
              )}

              {/* UPI ID Selection */}
              {availableUpiIds.length > 1 && (
                <View style={styles.upiSelection}>
                  <ResponsiveText variant="caption" style={styles.upiSelectionLabel}>
                    Select UPI ID:
                  </ResponsiveText>
                  <View style={styles.upiOptions}>
                    {availableUpiIds.map((upiId) => (
                      <TouchableOpacity
                        key={upiId}
                        style={[
                          styles.upiOption,
                          selectedUpiId === upiId && styles.upiOptionSelected
                        ]}
                        onPress={() => handleUpiIdChange(upiId)}
                        activeOpacity={0.7}
                      >
                        <ResponsiveText 
                          variant="small" 
                          style={[
                            styles.upiOptionText,
                            selectedUpiId === upiId && styles.upiOptionTextSelected
                          ]}
                        >
                          {upiId}
                        </ResponsiveText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {customerName && (
                <ResponsiveText variant="caption" style={styles.customerName}>
                  Customer: {customerName}
                </ResponsiveText>
              )}
            </View>

            {/* QR Code */}
            <View style={styles.qrContainer}>
              {isGenerating ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Generating QR Code...</Text>
                </View>
              ) : qrValue ? (
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={qrValue}
                    size={isTablet ? 220 : 180}
                    backgroundColor="white"
                    color="black"
                    logoSize={30}
                    logoBackgroundColor="transparent"
                  />
                  <ResponsiveText variant="caption" style={styles.qrInstructions}>
                    Scan with any UPI app to pay ₹{amount}
                  </ResponsiveText>
                  
                  {isListening && isAutoListening && (
                    <View style={styles.autoListenIndicator}>
                      <Text style={styles.autoListenIcon}>🔔</Text>
                      <ResponsiveText variant="small" style={styles.autoListenText}>
                        {autoPaymentDetectionEnabled 
                          ? 'Auto-detecting payment...'
                          : 'Manual confirmation required'
                        }
                      </ResponsiveText>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Unable to generate QR code</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={generateQRCode}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Payment Confirmation */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handlePaymentReceived}
              activeOpacity={0.8}
            >
              <ResponsiveText variant="button" style={styles.confirmButtonText}>
                Payment Received
              </ResponsiveText>
            </TouchableOpacity>

            <ResponsiveText variant="small" style={styles.disclaimer}>
              Show QR to customer. {isListening && isAutoListening 
                ? 'Payment auto-detected.' 
                : 'Confirm receipt manually.'
              }
            </ResponsiveText>
            </>
          )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.background.surface,
    borderRadius: 16,
  },
  tabletModalContainer: {
    maxWidth: 450,
    width: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    color: colors.text.primary,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
  },
  closeButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  modalContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  paymentDetails: {
    alignItems: 'center',
    marginBottom: 12,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    color: colors.text.secondary,
    marginBottom: 2,
  },
  amountValue: {
    color: '#059669',
    fontWeight: '700',
  },
  storeDetails: {
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  upiId: {
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  customerName: {
    color: colors.primary.main,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  qrCodeWrapper: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  qrInstructions: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
  },
  errorContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: colors.background.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmButtonText: {
    color: colors.background.surface,
  },
  disclaimer: {
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 14,
    fontSize: 11,
  },
  upiSelection: {
    marginTop: 8,
    alignItems: 'center',
  },
  upiSelectionLabel: {
    color: colors.text.secondary,
    marginBottom: 6,
    fontSize: 12,
  },
  upiOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  upiOption: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  upiOptionSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  upiOptionText: {
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
  },
  upiOptionTextSelected: {
    color: colors.background.surface,
  },
  autoListenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  autoListenIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  autoListenText: {
    color: '#15803d',
    fontWeight: '500',
    fontSize: 11,
  },
});

export default DynamicQRGenerator;