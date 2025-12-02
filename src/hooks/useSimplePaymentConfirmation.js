import { useEffect, useState, useCallback } from 'react';
import simplePaymentConfirmation from '../services/SimplePaymentConfirmation';
import * as Haptics from 'expo-haptics';

export const useSimplePaymentConfirmation = () => {
  const [isListening, setIsListening] = useState(false);
  const [activePayments, setActivePayments] = useState(0);
  const [lastConfirmation, setLastConfirmation] = useState(null);

  // Start the payment confirmation system
  const startListening = useCallback(async () => {
    try {
      const success = await simplePaymentConfirmation.startListening();
      setIsListening(success);
      return success;
    } catch (error) {
      console.error('Error starting payment confirmation system:', error);
      return false;
    }
  }, []);

  // Stop the system
  const stopListening = useCallback(() => {
    simplePaymentConfirmation.stopListening();
    setIsListening(false);
  }, []);

  // Add payment to track
  const trackPayment = useCallback((paymentId, amount, upiId, customerName = '') => {
    simplePaymentConfirmation.addPaymentToTrack(paymentId, amount, upiId, customerName);
    setActivePayments(simplePaymentConfirmation.getActivePaymentsCount());
  }, []);

  // Remove payment from tracking
  const stopTrackingPayment = useCallback((paymentId) => {
    simplePaymentConfirmation.removePaymentFromTrack(paymentId);
    setActivePayments(simplePaymentConfirmation.getActivePaymentsCount());
  }, []);

  // Manual confirmation
  const confirmPaymentManually = useCallback((paymentId, amount, additionalInfo = {}) => {
    const success = simplePaymentConfirmation.confirmPayment(paymentId, amount, additionalInfo);
    if (success) {
      setActivePayments(simplePaymentConfirmation.getActivePaymentsCount());
    }
    return success;
  }, []);

  // Test payment confirmation (for development)
  const testPaymentConfirmation = useCallback(async (amount) => {
    return await simplePaymentConfirmation.testPaymentConfirmation(amount);
  }, []);

  // Get active payments
  const getActivePayments = useCallback(() => {
    return simplePaymentConfirmation.getActivePayments();
  }, []);

  // Subscribe to payment confirmations
  useEffect(() => {
    const unsubscribe = simplePaymentConfirmation.subscribe((paymentData) => {
      console.log('💰 Payment confirmation received:', paymentData);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Update state
      setLastConfirmation(paymentData);
      setActivePayments(simplePaymentConfirmation.getActivePaymentsCount());
    });

    return unsubscribe;
  }, []);

  // Auto-start listening
  useEffect(() => {
    startListening();
    return () => stopListening();
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
    testPaymentConfirmation,
    getActivePayments,
  };
};