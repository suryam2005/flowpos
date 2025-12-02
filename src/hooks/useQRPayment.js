import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

export const useQRPayment = () => {
  const { getStore } = useAuth();
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

      // Get store information from backend
      console.log('🔄 Fetching store info from backend for QR generation...');
      const storeInfo = await getStore();
      
      if (!storeInfo) {
        throw new Error('Store information not found. Please set up your store first.');
      }

      console.log('📊 Store info retrieved:', storeInfo);

      // Check for any available UPI ID from backend store data
      const hasUpiId = storeInfo.upi_id || storeInfo.upi_id_2 || storeInfo.upi_id_3;
      
      if (!hasUpiId) {
        throw new Error('UPI ID not configured. Please add your UPI ID in Store Settings.');
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