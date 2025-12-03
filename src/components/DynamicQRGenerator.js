import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Share,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { getDeviceInfo } from '../utils/deviceUtils';
import ResponsiveText from './ResponsiveText';
import { useNotificationPaymentReader } from '../hooks/useNotificationPaymentReader';
import { colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';

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
  const { isTablet } = getDeviceInfo();
  const { getStore } = useAuth();
  
  // Enhanced notification payment reader hook
  const { 
    isListening, 
    trackPayment, 
    stopTrackingPayment, 
    lastConfirmation,
    confirmPaymentManually
  } = useNotificationPaymentReader();

  useEffect(() => {
    if (visible) {
      loadStoreInfo();
      // Generate unique payment ID
      const newPaymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setPaymentId(newPaymentId);
    } else {
      // Stop tracking immediately when modal closes
      if (paymentId && isAutoListening) {
        stopTrackingPayment(paymentId);
        setIsAutoListening(false);
      }
      // Reset payment ID
      setPaymentId('');
    }
  }, [visible]);

  useEffect(() => {
    if (storeInfo && amount && visible && selectedUpiId) {
      generateQRCode();
    }
  }, [storeInfo, amount, visible, selectedUpiId]);

  const loadStoreInfo = async () => {
    try {
      console.log('🔄 Loading store info from backend for QR generation...');
      
      // Get store information from backend
      const storeData = await getStore();
      
      if (!storeData) {
        setShowUpiError(true);
        Alert.alert(
          'Store Setup Required',
          'Please set up your store information first to generate QR codes.',
          [
            { text: 'Cancel', onPress: onClose },
            { 
              text: 'Go to Settings', 
              onPress: () => {
                onClose();
                if (onNavigateToSettings) {
                  onNavigateToSettings();
                }
              }
            }
          ]
        );
        return;
      }

      console.log('📊 Store data loaded for QR:', storeData);
      setStoreInfo(storeData);
      
      // Set up available UPI IDs from backend store data
      const upiIds = [];
      if (storeData.upi_id) {
        upiIds.push(storeData.upi_id);
      }
      if (storeData.upi_id_2) {
        upiIds.push(storeData.upi_id_2);
      }
      if (storeData.upi_id_3) {
        upiIds.push(storeData.upi_id_3);
      }
      
      console.log('📱 Available UPI IDs:', upiIds);
      
      if (upiIds.length === 0) {
        setShowUpiError(true);
        Alert.alert(
          'UPI ID Required',
          'Please add your UPI ID in Store Settings to generate QR codes for UPI payments.',
          [
            { text: 'Cancel', onPress: onClose },
            { 
              text: 'Add UPI ID', 
              onPress: () => {
                onClose();
                if (onNavigateToSettings) {
                  onNavigateToSettings();
                }
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
      console.error('Error loading store info from backend:', error);
      setShowUpiError(true);
      Alert.alert(
        'Error',
        'Failed to load store information from server. Please check your connection and try again.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  };

  const generateQRCode = () => {
    if (!selectedUpiId) {
      setShowUpiError(true);
      Alert.alert(
        'UPI ID Required',
        'Please set up your UPI ID in Store Settings first to generate QR codes.',
        [
          { text: 'Cancel', onPress: onClose },
          { 
            text: 'Add UPI ID', 
            onPress: () => {
              onClose();
              if (onNavigateToSettings) {
                onNavigateToSettings();
              }
            }
          }
        ]
      );
      return;
    }

    // Prevent regenerating if already generating or if QR already exists for same params
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);

    try {
      // Create UPI payment URL with all parameters
      const storeName = storeInfo.store_name || storeInfo.name || 'FlowPOS Store';
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
      
      // Start tracking this payment for automatic confirmation
      if (paymentId && isListening && !isAutoListening) {
        trackPayment(paymentId, amount, selectedUpiId, customerName);
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
  };

  const handleUpiIdChange = (upiId) => {
    setSelectedUpiId(upiId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePaymentReceived = () => {
    Alert.alert(
      'Payment Confirmation',
      'Have you received the payment confirmation?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Received',
          onPress: () => {
            // Stop tracking
            if (paymentId && isAutoListening) {
              stopTrackingPayment(paymentId);
              setIsAutoListening(false);
            }
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (onPaymentComplete) {
              onPaymentComplete();
            }
            onClose();
          }
        }
      ]
    );
  };

  // Handle automatic payment confirmation
  useEffect(() => {
    if (lastConfirmation && paymentId && isAutoListening && visible) {
      // Check if this confirmation is for our current payment (exact amount match)
      if (lastConfirmation.activePayment && 
          lastConfirmation.paymentId === paymentId &&
          Math.abs(lastConfirmation.amount - amount) < 0.01) {
        
        // Stop tracking immediately
        stopTrackingPayment(paymentId);
        setIsAutoListening(false);
        
        // Auto-complete payment and redirect to home
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        if (onPaymentComplete) {
          onPaymentComplete();
        }
        
        // Close QR modal immediately
        onClose();
        
        // Show success message briefly
        Alert.alert(
          '✅ Payment Received!',
          `₹${lastConfirmation.amount} received successfully${lastConfirmation.sender ? ` from ${lastConfirmation.sender}` : ''}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to home (POS screen)
                // This will be handled by the parent component
              }
            }
          ]
        );
      }
    }
  }, [lastConfirmation]);

  // Cleanup effect - only run on unmount
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts - use current values
      if (paymentId && isAutoListening) {
        stopTrackingPayment(paymentId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <Modal
      animationType="none"
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
                    UPI ID: {selectedUpiId}
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
                    {availableUpiIds.map((upiId, index) => (
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
                    size={isTablet ? 250 : 200}
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
                        Auto-detecting payment from notifications...
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
                ✅ Payment Received
              </ResponsiveText>
            </TouchableOpacity>

            <ResponsiveText variant="small" style={styles.disclaimer}>
              Show this QR code to customer for scanning. 
              {isListening && isAutoListening 
                ? 'Payment will be auto-detected from notifications and SMS.' 
                : 'Confirm payment receipt before completing the order.'
              }
            </ResponsiveText>
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
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.background.surface,
    borderRadius: 20,
    maxHeight: '90%',
  },
  tabletModalContainer: {
    maxWidth: 500,
    width: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    color: colors.text.primary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.gray['100'],
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  modalContent: {
    padding: 20,
  },
  paymentDetails: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    color: colors.text.secondary,
    marginBottom: 4,
  },
  amountValue: {
    color: '#059669',
    fontWeight: '700',
  },
  storeDetails: {
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  upiId: {
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  customerName: {
    color: colors.primary.main,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  qrCodeWrapper: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  qrInstructions: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 12,
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background.surface,
    fontWeight: '600',
  },

  confirmButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonText: {
    color: colors.background.surface,
  },
  disclaimer: {
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  upiSelection: {
    marginTop: 16,
    alignItems: 'center',
  },
  upiSelectionLabel: {
    color: colors.text.secondary,
    marginBottom: 8,
  },
  upiOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  upiOption: {
    backgroundColor: colors.gray['100'],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
  },
  upiOptionTextSelected: {
    color: colors.background.surface,
  },
  autoListenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  autoListenIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  autoListenText: {
    color: '#15803d',
    fontWeight: '500',
  },
});

export default DynamicQRGenerator;