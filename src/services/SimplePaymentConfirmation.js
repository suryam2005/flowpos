import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class SimplePaymentConfirmation {
  constructor() {
    this.activePayments = new Map();
    this.listeners = new Set();
    this.isListening = false;
  }

  // Add payment to track
  addPaymentToTrack(paymentId, amount, upiId, customerName = '') {
    this.activePayments.set(paymentId, {
      amount: parseFloat(amount),
      upiId: upiId.toLowerCase(),
      customerName,
      timestamp: Date.now(),
      status: 'pending'
    });

    console.log(`📱 Tracking payment: ${paymentId} for ₹${amount}`);
  }

  // Remove payment from tracking
  removePaymentFromTrack(paymentId) {
    this.activePayments.delete(paymentId);
    console.log(`🗑️ Stopped tracking payment: ${paymentId}`);
  }

  // Subscribe to payment confirmations
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(paymentData) {
    this.listeners.forEach(callback => {
      try {
        callback(paymentData);
      } catch (error) {
        console.error('Error in payment listener callback:', error);
      }
    });
  }

  // Manual payment confirmation
  confirmPayment(paymentId, amount, additionalInfo = {}) {
    const activePayment = this.activePayments.get(paymentId);
    
    if (activePayment) {
      console.log(`✅ Payment manually confirmed: ${paymentId} for ₹${amount}`);
      
      // Create confirmation data
      const confirmationData = {
        paymentId,
        amount: parseFloat(amount),
        timestamp: Date.now(),
        activePayment,
        manual: true,
        confidence: 100,
        ...additionalInfo
      };

      // Notify listeners
      this.notifyListeners(confirmationData);

      // Remove from tracking
      this.removePaymentFromTrack(paymentId);

      // Save confirmation record
      this.savePaymentConfirmation(paymentId, confirmationData);

      return true;
    }

    console.log(`❌ Payment not found for confirmation: ${paymentId}`);
    return false;
  }

  // Auto-confirm payment (for testing or when SMS is detected)
  autoConfirmPayment(paymentId, amount, smsData = {}) {
    const activePayment = this.activePayments.get(paymentId);
    
    if (activePayment) {
      console.log(`🤖 Payment auto-confirmed: ${paymentId} for ₹${amount}`);
      
      // Create confirmation data
      const confirmationData = {
        paymentId,
        amount: parseFloat(amount),
        timestamp: Date.now(),
        activePayment,
        autoConfirmed: true,
        confidence: 95,
        smsData,
        ...smsData
      };

      // Notify listeners
      this.notifyListeners(confirmationData);

      // Remove from tracking
      this.removePaymentFromTrack(paymentId);

      // Save confirmation record
      this.savePaymentConfirmation(paymentId, confirmationData);

      return true;
    }

    return false;
  }

  // Save payment confirmation record
  async savePaymentConfirmation(paymentId, confirmationData) {
    try {
      const confirmations = await AsyncStorage.getItem('paymentConfirmations');
      const confirmationList = confirmations ? JSON.parse(confirmations) : [];

      confirmationList.unshift({
        paymentId,
        ...confirmationData,
        confirmedAt: Date.now()
      });

      // Keep only last 50 confirmations
      if (confirmationList.length > 50) {
        confirmationList.splice(50);
      }

      await AsyncStorage.setItem('paymentConfirmations', JSON.stringify(confirmationList));
      console.log('💾 Payment confirmation saved');
    } catch (error) {
      console.error('Error saving payment confirmation:', error);
    }
  }

  // Get active payments count
  getActivePaymentsCount() {
    return this.activePayments.size;
  }

  // Get active payments list
  getActivePayments() {
    return Array.from(this.activePayments.entries()).map(([id, payment]) => ({
      id,
      ...payment
    }));
  }

  // Clean up old payments (remove payments older than 15 minutes)
  cleanupOldPayments() {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    for (const [paymentId, payment] of this.activePayments.entries()) {
      if (now - payment.timestamp > fifteenMinutes) {
        console.log(`🧹 Cleaning up old payment: ${paymentId}`);
        this.removePaymentFromTrack(paymentId);
      }
    }
  }

  // Start listening (simplified)
  async startListening() {
    if (this.isListening) {
      return true;
    }

    console.log('🔄 Starting simple payment confirmation system...');
    
    // Start cleanup timer
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldPayments();
    }, 60000); // Every minute

    this.isListening = true;
    console.log('✅ Simple payment confirmation system started');
    return true;
  }

  // Stop listening
  stopListening() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.paymentReminderInterval) {
      clearInterval(this.paymentReminderInterval);
      this.paymentReminderInterval = null;
    }

    this.isListening = false;
    console.log('🛑 Simple payment confirmation system stopped');
  }

  // Check pending payments and log status
  checkPendingPayments() {
    const activePaymentsList = this.getActivePayments();
    
    if (activePaymentsList.length > 0) {
      console.log(`⏳ ${activePaymentsList.length} payment(s) pending confirmation:`);
      activePaymentsList.forEach(payment => {
        const timeWaiting = Math.round((Date.now() - payment.timestamp) / 1000);
        console.log(`   - ₹${payment.amount} (waiting ${timeWaiting}s)`);
      });
    }
  }

  // Test function to simulate payment confirmation
  async testPaymentConfirmation(amount) {
    // Find a matching active payment
    for (const [paymentId, activePayment] of this.activePayments.entries()) {
      if (Math.abs(activePayment.amount - amount) < 0.01) {
        console.log(`🧪 Test: Auto-confirming payment ${paymentId} for ₹${amount}`);
        
        return this.autoConfirmPayment(paymentId, amount, {
          sender: 'Test SMS',
          upiRef: `TEST${Date.now()}`,
          testMode: true
        });
      }
    }

    console.log(`❌ No matching payment found for ₹${amount}`);
    return false;
  }
}

// Create singleton instance
const simplePaymentConfirmation = new SimplePaymentConfirmation();

export default simplePaymentConfirmation;