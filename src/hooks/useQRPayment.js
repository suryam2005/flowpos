import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useQRPayment = () => {
  const [isQRVisible, setIsQRVisible] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    customerName: '',
    orderNote: '',
    orderId: null,
  });

  const generatePaymentQR = useCallback(async (orderData) => {
    try {
      // Validate required data
      if (!orderData.amount || orderData.amount <= 0) {
        throw new Error('Invalid amount');
      }

      // Check if UPI ID is configured
      const storeInfo = await AsyncStorage.getItem('storeInfo');
      if (!storeInfo) {
        throw new Error('Store information not found');
      }

      const parsedStore = JSON.parse(storeInfo);
      if (!parsedStore.upiId) {
        throw new Error('UPI ID not configured');
      }

      // Set payment data and show QR
      setPaymentData({
        amount: orderData.amount,
        customerName: orderData.customerName || '',
        orderNote: orderData.orderNote || `Payment for Order #${orderData.orderId || Date.now()}`,
        orderId: orderData.orderId,
      });

      setIsQRVisible(true);
      return true;
    } catch (error) {
      console.error('Error generating payment QR:', error);
      return false;
    }
  }, []);

  const closeQR = useCallback(() => {
    setIsQRVisible(false);
    setPaymentData({
      amount: 0,
      customerName: '',
      orderNote: '',
      orderId: null,
    });
  }, []);

  const handlePaymentComplete = useCallback(async () => {
    try {
      // Save payment record
      const paymentRecord = {
        id: Date.now().toString(),
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        customerName: paymentData.customerName,
        method: 'UPI',
        timestamp: new Date().toISOString(),
        status: 'completed',
      };

      // Get existing payments
      const existingPayments = await AsyncStorage.getItem('payments');
      const payments = existingPayments ? JSON.parse(existingPayments) : [];
      
      // Add new payment
      payments.unshift(paymentRecord);
      
      // Save updated payments
      await AsyncStorage.setItem('payments', JSON.stringify(payments));

      return paymentRecord;
    } catch (error) {
      console.error('Error saving payment record:', error);
      return null;
    }
  }, [paymentData]);

  return {
    isQRVisible,
    paymentData,
    generatePaymentQR,
    closeQR,
    handlePaymentComplete,
  };
};