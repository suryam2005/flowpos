import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { typography, createTextStyle, spacing } from '../utils/typography';

const { width, height } = Dimensions.get('window');

const UPIPaymentModal = ({ 
  visible, 
  onClose, 
  totalAmount, 
  orderItems,
  onPaymentConfirmed 
}) => {
  const [qrCodeUri, setQrCodeUri] = useState(null);
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      loadQRCode();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadQRCode = async () => {
    try {
      const storeInfo = await AsyncStorage.getItem('storeInfo');
      if (storeInfo) {
        const parsedStoreInfo = JSON.parse(storeInfo);
        setQrCodeUri(parsedStoreInfo.qrCodeUri);
      }
    } catch (error) {
      console.error('Error loading QR code:', error);
    }
  };

  const handlePaymentInitiated = () => {
    setIsWaitingForPayment(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Start listening for payment confirmation
    // In a real app, this would listen to SMS or use UPI callback
    Alert.alert(
      'Payment Initiated',
      'Please complete the payment in your UPI app. The system will automatically detect the payment.',
      [
        { 
          text: 'Payment Completed', 
          onPress: handlePaymentCompleted 
        },
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => setIsWaitingForPayment(false)
        }
      ]
    );
  };

  const handlePaymentCompleted = () => {
    setIsWaitingForPayment(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (onPaymentConfirmed) {
      onPaymentConfirmed({
        amount: totalAmount,
        method: 'UPI',
        timestamp: Date.now(),
        transactionId: `UPI_${Date.now()}`, // In real app, get from UPI response
      });
    }
    
    onClose();
  };

  const handleManualConfirmation = () => {
    Alert.alert(
      'Confirm Payment',
      `Has the customer paid ₹${totalAmount} via UPI?`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Received', 
          onPress: handlePaymentCompleted 
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { opacity: fadeAnim }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>UPI Payment</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Amount Display */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>₹{totalAmount}</Text>
            <Text style={styles.itemCount}>
              {orderItems.length} item{orderItems.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* QR Code Display */}
          <View style={styles.qrContainer}>
            {qrCodeUri ? (
              <>
                <Text style={styles.qrLabel}>Scan QR Code to Pay</Text>
                <View style={styles.qrImageContainer}>
                  <Image 
                    source={{ uri: qrCodeUri }} 
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.qrInstructions}>
                  Open any UPI app and scan this QR code to pay ₹{totalAmount}
                </Text>
              </>
            ) : (
              <View style={styles.noQrContainer}>
                <Text style={styles.noQrIcon}>📱</Text>
                <Text style={styles.noQrTitle}>No UPI QR Code</Text>
                <Text style={styles.noQrText}>
                  Please upload your UPI QR code in Store Settings to accept UPI payments.
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {qrCodeUri ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.paymentButton,
                    isWaitingForPayment && styles.paymentButtonWaiting
                  ]}
                  onPress={handlePaymentInitiated}
                  disabled={isWaitingForPayment}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.paymentButtonText,
                    isWaitingForPayment && styles.paymentButtonTextWaiting
                  ]}>
                    {isWaitingForPayment ? 'Waiting for Payment...' : 'Customer Scanned QR'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.manualButton}
                  onPress={handleManualConfirmation}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manualButtonText}>Manual Confirmation</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => {
                  onClose();
                  // Navigate to settings - this would need navigation prop
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.settingsButtonText}>Go to Settings</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Payment Status */}
          {isWaitingForPayment && (
            <View style={styles.statusContainer}>
              <View style={styles.statusIndicator}>
                <Text style={styles.statusText}>🔄 Listening for payment confirmation...</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    ...createTextStyle('h4', '#1f2937'),
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: '#f8fafc',
  },
  amountLabel: {
    ...createTextStyle('body2', '#6b7280'),
    marginBottom: 4,
  },
  amountValue: {
    ...createTextStyle('h1', '#2563eb'),
    marginBottom: 4,
  },
  itemCount: {
    ...createTextStyle('caption', '#9ca3af'),
  },
  qrContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  qrLabel: {
    ...createTextStyle('h6', '#1f2937'),
    marginBottom: spacing.md,
  },
  qrImageContainer: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.md,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrInstructions: {
    ...createTextStyle('body2', '#6b7280'),
    textAlign: 'center',
    lineHeight: 20,
  },
  noQrContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noQrIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  noQrTitle: {
    ...createTextStyle('h5', '#1f2937'),
    marginBottom: spacing.sm,
  },
  noQrText: {
    ...createTextStyle('body2', '#6b7280'),
    textAlign: 'center',
    lineHeight: 20,
  },
  actionContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  paymentButton: {
    backgroundColor: '#10b981',
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  paymentButtonWaiting: {
    backgroundColor: '#f59e0b',
  },
  paymentButtonText: {
    ...createTextStyle('button', '#ffffff'),
  },
  paymentButtonTextWaiting: {
    color: '#ffffff',
  },
  manualButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  manualButtonText: {
    ...createTextStyle('button', '#6b7280'),
  },
  settingsButton: {
    backgroundColor: '#2563eb',
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  settingsButtonText: {
    ...createTextStyle('button', '#ffffff'),
  },
  statusContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statusIndicator: {
    backgroundColor: '#eff6ff',
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    ...createTextStyle('caption', '#2563eb'),
  },
});

export default UPIPaymentModal;