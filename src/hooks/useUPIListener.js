import { useEffect, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import upiPaymentListener from '../services/UPIPaymentListener';
import * as Haptics from 'expo-haptics';

export const useUPIListener = () => {
  const [isListening, setIsListening] = useState(false);
  const [activePayments, setActivePayments] = useState(0);
  const [lastConfirmation, setLastConfirmation] = useState(null);

  // Start listening for UPI confirmations
  const startListening = useCallback(async () => {
    try {
      const success = await upiPaymentListener.startListening();
      setIsListening(success);
      return success;
    } catch (error) {
      console.error('Error starting UPI listener:', error);
      return false;
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    upiPaymentListener.stopListening();
    setIsListening(false);
  }, []);

  // Add payment to track
  const trackPayment = useCallback((paymentId, amount, upiId, customerName = '') => {
    upiPaymentListener.addPaymentToTrack(paymentId, amount, upiId, customerName);
    setActivePayments(upiPaymentListener.getActivePaymentsCount());
  }, []);

  // Remove payment from tracking
  const stopTrackingPayment = useCallback((paymentId) => {
    upiPaymentListener.removePaymentFromTrack(paymentId);
    setActivePayments(upiPaymentListener.getActivePaymentsCount());
  }, []);

  // Manual confirmation (fallback)
  const confirmPaymentManually = useCallback((paymentId, amount) => {
    const success = upiPaymentListener.manualConfirmPayment(paymentId, amount);
    if (success) {
      setActivePayments(upiPaymentListener.getActivePaymentsCount());
    }
    return success;
  }, []);

  // Subscribe to payment confirmations
  useEffect(() => {
    const unsubscribe = upiPaymentListener.subscribe((paymentData) => {
      console.log('Payment confirmed via SMS:', paymentData);
      
      // Haptic feedback for confirmation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Update state
      setLastConfirmation(paymentData);
      setActivePayments(upiPaymentListener.getActivePaymentsCount());
      
      // Only show alerts for non-auto-confirmed payments
      if (!paymentData.autoConfirmed) {
        if (paymentData.confidence >= 85) {
          Alert.alert(
            '✅ Payment Confirmed!',
            `Received ₹${paymentData.amount} ${paymentData.sender ? `from ${paymentData.sender}` : ''}`,
            [{ text: 'OK', style: 'default' }]
          );
        } else if (paymentData.confidence >= 60) {
          Alert.alert(
            '💰 Possible Payment Detected',
            `₹${paymentData.amount} - Please verify this matches your expected payment`,
            [
              { text: 'Not This Payment', style: 'cancel' },
              { text: 'Confirm Payment', style: 'default' }
            ]
          );
        }
      }
    });

    return unsubscribe;
  }, []);

  // Cleanup old payments periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      upiPaymentListener.cleanupOldPayments();
      setActivePayments(upiPaymentListener.getActivePaymentsCount());
    }, 60000); // Every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  // Auto-start listening when component mounts
  useEffect(() => {
    if (Platform.OS === 'android') {
      startListening();
    }

    return () => {
      stopListening();
    };
  }, [startListening, stopListening]);

  return {
    isListening,
    activePayments,
    lastConfirmation,
    startListening,
    stopListening,
    trackPayment,
    stopTrackingPayment,
    confirmPaymentManually,
  };
};