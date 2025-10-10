import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SMS from 'expo-sms';
import SmsListener from 'react-native-android-sms-listener';

class UPIPaymentListener {
  constructor() {
    this.isListening = false;
    this.activePayments = new Map(); // Track active payments
    this.listeners = new Set(); // Payment confirmation listeners
    this.smsListener = null;
  }

  // Add a payment to track
  addPaymentToTrack(paymentId, amount, upiId, customerName = '') {
    this.activePayments.set(paymentId, {
      amount: parseFloat(amount),
      upiId: upiId.toLowerCase(),
      customerName,
      timestamp: Date.now(),
      status: 'pending'
    });

    console.log(`Tracking payment: ${paymentId} for ₹${amount} to ${upiId}`);
  }

  // Remove payment from tracking
  removePaymentFromTrack(paymentId) {
    this.activePayments.delete(paymentId);
    console.log(`Stopped tracking payment: ${paymentId}`);
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

  // Request SMS permissions with proper explanation
  async requestSMSPermissions() {
    if (Platform.OS === 'android') {
      try {
        // Check if permissions are already granted
        const readSmsGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
        const receiveSmsGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
        
        if (readSmsGranted && receiveSmsGranted) {
          return true;
        }

        // Request permissions with clear rationale
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        ], {
          title: 'SMS Permissions for Payment Detection',
          message: 'FlowPOS needs SMS access to automatically detect UPI payment confirmations from your bank. This helps confirm payments instantly without manual verification.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        });

        return (
          granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (error) {
        console.error('Error requesting SMS permissions:', error);
        return false;
      }
    }
    return true; // iOS doesn't need explicit SMS permissions for this use case
  }

  // Parse UPI payment confirmation message
  parsePaymentMessage(message) {
    const messageText = message.toLowerCase();

    // Common UPI payment confirmation patterns
    const patterns = [
      // GPay patterns
      /(?:received|credited).*?rs\.?\s*(\d+(?:\.\d{2})?)/i,
      /(?:received|credited).*?₹\s*(\d+(?:\.\d{2})?)/i,

      // PhonePe patterns
      /(?:money received|payment received).*?rs\.?\s*(\d+(?:\.\d{2})?)/i,
      /(?:money received|payment received).*?₹\s*(\d+(?:\.\d{2})?)/i,

      // Paytm patterns
      /(?:received|credited).*?rs\.?\s*(\d+(?:\.\d{2})?)/i,
      /(?:payment.*?received).*?₹\s*(\d+(?:\.\d{2})?)/i,

      // Bank SMS patterns
      /(?:credited|received).*?(?:rs\.?|₹)\s*(\d+(?:\.\d{2})?)/i,
      /(?:upi.*?credit).*?(?:rs\.?|₹)\s*(\d+(?:\.\d{2})?)/i,

      // Generic patterns
      /(?:received|credited|paid).*?(\d+(?:\.\d{2})?).*?(?:rupees|rs|₹)/i,
    ];

    // Check for payment confirmation keywords
    const confirmationKeywords = [
      'received', 'credited', 'payment received', 'money received',
      'upi credit', 'transaction successful', 'payment successful'
    ];

    const hasConfirmationKeyword = confirmationKeywords.some(keyword =>
      messageText.includes(keyword)
    );

    if (!hasConfirmationKeyword) {
      return null;
    }

    // Extract amount
    let amount = null;
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        amount = parseFloat(match[1]);
        break;
      }
    }

    if (!amount) {
      return null;
    }

    // Extract UPI reference or transaction ID
    const upiRefPattern = /(?:upi ref|ref no|transaction id|txn id)[\s:]*([a-zA-Z0-9]+)/i;
    const upiRefMatch = message.match(upiRefPattern);
    const upiRef = upiRefMatch ? upiRefMatch[1] : null;

    // Extract sender info if available
    const fromPattern = /(?:from|by)\s+([a-zA-Z\s]+?)(?:\s|$|\.)/i;
    const fromMatch = message.match(fromPattern);
    const sender = fromMatch ? fromMatch[1].trim() : null;

    return {
      amount,
      upiRef,
      sender,
      timestamp: Date.now(),
      originalMessage: message
    };
  }

  // Check if parsed payment matches any active payment
  matchActivePayment(parsedPayment) {
    for (const [paymentId, activePayment] of this.activePayments.entries()) {
      // Check exact amount match (very strict for auto-confirmation)
      const amountDiff = Math.abs(parsedPayment.amount - activePayment.amount);
      const amountMatches = amountDiff < 0.01;

      // Check timing (within last 5 minutes for better accuracy)
      const timeDiff = Date.now() - activePayment.timestamp;
      const timeMatches = timeDiff < 5 * 60 * 1000; // 5 minutes

      if (amountMatches && timeMatches) {
        return {
          paymentId,
          activePayment,
          confidence: this.calculateMatchConfidence(parsedPayment, activePayment)
        };
      }
    }
    return null;
  }

  // Calculate confidence score for payment match
  calculateMatchConfidence(parsedPayment, activePayment) {
    let confidence = 0;

    // Exact amount match (most important for auto-confirmation)
    const amountDiff = Math.abs(parsedPayment.amount - activePayment.amount);
    if (amountDiff < 0.01) confidence += 85; // Very high confidence for exact match
    else if (amountDiff < 1) confidence += 40;

    // Time proximity (recent payments get higher confidence)
    const timeDiff = Date.now() - activePayment.timestamp;
    if (timeDiff < 1 * 60 * 1000) confidence += 15; // Within 1 minute
    else if (timeDiff < 3 * 60 * 1000) confidence += 10; // Within 3 minutes
    else if (timeDiff < 5 * 60 * 1000) confidence += 5; // Within 5 minutes

    // UPI reference or transaction ID match (if available)
    if (parsedPayment.upiRef && activePayment.upiRef) {
      if (parsedPayment.upiRef === activePayment.upiRef) {
        confidence += 10;
      }
    }

    return Math.min(confidence, 100); // Cap at 100%
  }

  // Start listening for SMS messages
  async startListening() {
    if (this.isListening) {
      return true;
    }

    // Request permissions
    const hasPermissions = await this.requestSMSPermissions();
    if (!hasPermissions) {
      Alert.alert(
        'SMS Permissions Required',
        'To automatically detect UPI payments, please grant SMS permissions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permissions', onPress: () => this.requestSMSPermissions() }
        ]
      );
      return false;
    }

    try {
      // For Android, we'll use a different approach since react-native-sms-listener
      // might not be available in Expo managed workflow
      if (Platform.OS === 'android') {
        this.startAndroidSMSListening();
      } else {
        // iOS doesn't allow SMS listening, so we'll use manual confirmation
        console.log('iOS: SMS listening not available, using manual confirmation');
      }

      this.isListening = true;
      console.log('UPI Payment Listener started');
      return true;
    } catch (error) {
      console.error('Error starting SMS listener:', error);
      return false;
    }
  }

  // Android SMS listening implementation
  startAndroidSMSListening() {
    // Since we're in Expo managed workflow, we'll implement a polling mechanism
    // to check for recent SMS messages periodically
    this.smsPollingInterval = setInterval(async () => {
      try {
        await this.checkRecentSMS();
      } catch (error) {
        console.error('Error checking SMS:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  // Check recent SMS messages (fallback method)
  async checkRecentSMS() {
    // This is a simplified implementation
    // In a production app, you might want to use a native module
    // or implement a more sophisticated SMS checking mechanism

    // For now, we'll simulate SMS checking by looking at stored messages
    try {
      const recentMessages = await AsyncStorage.getItem('recentSMSMessages');
      if (recentMessages) {
        const messages = JSON.parse(recentMessages);
        const now = Date.now();

        // Check messages from last 2 minutes
        const recentSMS = messages.filter(msg =>
          now - msg.timestamp < 2 * 60 * 1000
        );

        for (const sms of recentSMS) {
          this.processSMSMessage(sms.body, sms.sender);
        }
      }
    } catch (error) {
      console.error('Error checking recent SMS:', error);
    }
  }

  // Process incoming SMS message
  processSMSMessage(messageBody, sender) {
    const parsedPayment = this.parsePaymentMessage(messageBody);

    if (!parsedPayment) {
      return; // Not a payment confirmation message
    }

    console.log('Detected payment confirmation:', parsedPayment);

    // Check if this matches any active payment
    const match = this.matchActivePayment(parsedPayment);

    if (match && match.confidence >= 85) { // Higher threshold for auto-confirmation
      console.log(`Payment auto-confirmed with ${match.confidence}% confidence`);

      // Update payment status
      const activePayment = match.activePayment;
      activePayment.status = 'confirmed';
      activePayment.confirmationData = parsedPayment;

      // Notify listeners immediately
      this.notifyListeners({
        paymentId: match.paymentId,
        amount: parsedPayment.amount,
        upiRef: parsedPayment.upiRef,
        sender: parsedPayment.sender,
        confidence: match.confidence,
        timestamp: parsedPayment.timestamp,
        activePayment,
        autoConfirmed: true
      });

      // Remove from active tracking immediately
      this.removePaymentFromTrack(match.paymentId);

      // Save confirmation record
      this.savePaymentConfirmation(match.paymentId, parsedPayment);
    } else if (match && match.confidence >= 60) {
      // Lower confidence - don't auto-confirm, just log
      console.log(`Possible payment detected with ${match.confidence}% confidence - manual confirmation required`);
    }
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

      // Keep only last 100 confirmations
      if (confirmationList.length > 100) {
        confirmationList.splice(100);
      }

      await AsyncStorage.setItem('paymentConfirmations', JSON.stringify(confirmationList));
    } catch (error) {
      console.error('Error saving payment confirmation:', error);
    }
  }

  // Stop listening
  stopListening() {
    if (this.smsPollingInterval) {
      clearInterval(this.smsPollingInterval);
      this.smsPollingInterval = null;
    }

    this.isListening = false;
    console.log('UPI Payment Listener stopped');
  }

  // Clean up old payments (remove payments older than 30 minutes)
  cleanupOldPayments() {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    for (const [paymentId, payment] of this.activePayments.entries()) {
      if (now - payment.timestamp > thirtyMinutes) {
        this.removePaymentFromTrack(paymentId);
      }
    }
  }

  // Get active payments count
  getActivePaymentsCount() {
    return this.activePayments.size;
  }

  // Manual payment confirmation (fallback)
  manualConfirmPayment(paymentId, amount) {
    const activePayment = this.activePayments.get(paymentId);
    if (activePayment) {
      this.notifyListeners({
        paymentId,
        amount,
        confidence: 100,
        timestamp: Date.now(),
        activePayment,
        manual: true
      });

      this.removePaymentFromTrack(paymentId);
      return true;
    }
    return false;
  }
}

// Create singleton instance
const upiPaymentListener = new UPIPaymentListener();

export default upiPaymentListener;