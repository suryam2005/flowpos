import { useEffect, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import notificationPaymentReader from '../services/NotificationPaymentReader';
import * as Haptics from 'expo-haptics';

export const useNotificationPaymentReader = () => {
  const [isListening, setIsListening] = useState(false);
  const [activePayments, setActivePayments] = useState(0);
  const [lastConfirmation, setLastConfirmation] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Start listening for payment notifications
  const startListening = useCallback(async () => {
    try {
      const success = await notificationPaymentReader.startListening();
      setIsListening(success);
      
      if (success) {
        console.log('✅ Enhanced SMS payment reader started successfully');
      } else {
        console.log('❌ Failed to start SMS payment reader');
      }
      
      return success;
    } catch (error) {
      console.error('Error starting notification payment reader:', error);
      return false;
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    notificationPaymentReader.stopListening();
    setIsListening(false);
    console.log('🛑 Enhanced SMS payment reader stopped');
  }, []);

  // Add payment to track
  const trackPayment = useCallback((paymentId, amount, upiId, customerName = '') => {
    notificationPaymentReader.addPaymentToTrack(paymentId, amount, upiId, customerName);
    setActivePayments(notificationPaymentReader.getActivePaymentsCount());
    console.log(`📱 Now tracking payment: ${paymentId} for ₹${amount}`);
  }, []);

  // Remove payment from tracking
  const stopTrackingPayment = useCallback((paymentId) => {
    notificationPaymentReader.removePaymentFromTrack(paymentId);
    setActivePayments(notificationPaymentReader.getActivePaymentsCount());
    console.log(`🗑️ Stopped tracking payment: ${paymentId}`);
  }, []);

  // Manual confirmation (fallback)
  const confirmPaymentManually = useCallback((paymentId, amount) => {
    const success = notificationPaymentReader.manualConfirmPayment(paymentId, amount);
    if (success) {
      setActivePayments(notificationPaymentReader.getActivePaymentsCount());
      console.log(`✅ Payment manually confirmed: ${paymentId}`);
    }
    return success;
  }, []);

  // Get payment history
  const getPaymentHistory = useCallback(async () => {
    try {
      const history = await notificationPaymentReader.getPaymentHistory();
      setPaymentHistory(history);
      return history;
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }, []);

  // Subscribe to payment confirmations
  useEffect(() => {
    const unsubscribe = notificationPaymentReader.subscribe((paymentData) => {
      console.log('💰 Payment confirmation received:', paymentData);
      
      // Haptic feedback for confirmation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Update state
      setLastConfirmation(paymentData);
      setActivePayments(notificationPaymentReader.getActivePaymentsCount());
      
      // Handle different types of confirmations
      if (paymentData.autoConfirmed) {
        // Auto-confirmed payment - show success notification
        console.log(`🎉 Payment auto-confirmed: ₹${paymentData.amount}`);
        
        // Don't show alert for auto-confirmed payments in QR flow
        // The QR component will handle the UI feedback
        
      } else if (paymentData.requiresManualConfirmation) {
        // Requires manual confirmation
        Alert.alert(
          '💰 Payment Detected',
          `₹${paymentData.amount} payment detected with ${paymentData.confidence}% confidence. Please verify this matches your expected payment.`,
          [
            { 
              text: 'Not This Payment', 
              style: 'cancel',
              onPress: () => {
                console.log('❌ Payment confirmation rejected by user');
              }
            },
            { 
              text: 'Confirm Payment', 
              style: 'default',
              onPress: () => {
                confirmPaymentManually(paymentData.paymentId, paymentData.amount);
              }
            }
          ]
        );
        
      } else if (paymentData.manual) {
        // Manual confirmation
        console.log(`✅ Payment manually confirmed: ₹${paymentData.amount}`);
        
      } else if (paymentData.confidence >= 85) {
        // High confidence auto-confirmation
        Alert.alert(
          '✅ Payment Confirmed!',
          `Received ₹${paymentData.amount}${paymentData.sender ? ` from ${paymentData.sender}` : ''}${paymentData.upiApp ? ` via ${paymentData.upiApp}` : ''}`,
          [{ text: 'OK', style: 'default' }]
        );
      }

      // Update payment history
      getPaymentHistory();
    });

    return unsubscribe;
  }, [confirmPaymentManually, getPaymentHistory]);

  // Cleanup old payments periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      notificationPaymentReader.cleanupOldPayments();
      setActivePayments(notificationPaymentReader.getActivePaymentsCount());
    }, 60000); // Every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  // Auto-start listening when component mounts
  useEffect(() => {
    startListening();

    return () => {
      stopListening();
    };
  }, [startListening, stopListening]);

  // Load payment history on mount
  useEffect(() => {
    getPaymentHistory();
  }, [getPaymentHistory]);

  return {
    isListening,
    activePayments,
    lastConfirmation,
    paymentHistory,
    startListening,
    stopListening,
    trackPayment,
    stopTrackingPayment,
    confirmPaymentManually,
    getPaymentHistory,
  };
};