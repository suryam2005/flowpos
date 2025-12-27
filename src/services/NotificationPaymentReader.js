import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

class NotificationPaymentReader {
  constructor() {
    this.isListening = false;
    this.activePayments = new Map();
    this.listeners = new Set();
    this.notificationListener = null;
    this.smsListener = null;
    this.lastProcessedNotifications = new Set();
    this.notificationHistory = [];
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

    console.log(`📱 Tracking payment: ${paymentId} for ₹${amount} to ${upiId}`);
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

  // Request necessary permissions
  async requestPermissions() {
    try {
      // Request notification permissions first
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      const hasNotificationPermissions = notificationStatus === 'granted';

      if (Platform.OS === 'android') {
        // Request SMS permissions for Android
        const smsPermissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        ], {
          title: 'SMS Permissions for Payment Detection',
          message: 'FlowPOS needs SMS access to automatically detect UPI payment confirmations from your bank. This helps confirm payments instantly without manual verification.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        });

        const hasSMSPermissions = 
          smsPermissions['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
          smsPermissions['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED;

        return {
          notifications: hasNotificationPermissions,
          sms: hasSMSPermissions
        };
      }

      return {
        notifications: hasNotificationPermissions,
        sms: false // iOS doesn't support SMS reading
      };
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return { notifications: false, sms: false };
    }
  }

  // Parse payment notification/SMS content
  parsePaymentContent(content, source = 'notification') {
    const text = content.toLowerCase();

    // Enhanced UPI payment patterns
    const paymentPatterns = [
      // Amount patterns
      /(?:received|credited|paid).*?(?:rs\.?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:rs\.?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?).*?(?:received|credited|paid)/i,
      /(?:amount|sum).*?(?:rs\.?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      
      // UPI specific patterns
      /upi.*?(?:received|credited).*?(?:rs\.?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:gpay|phonepe|paytm|bhim).*?(?:received|credited).*?(?:rs\.?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      
      // Bank SMS patterns
      /(?:account|a\/c).*?credited.*?(?:rs\.?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:transaction|txn).*?successful.*?(?:rs\.?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    ];

    // Payment confirmation keywords
    const confirmationKeywords = [
      'received', 'credited', 'payment received', 'money received',
      'upi credit', 'transaction successful', 'payment successful',
      'amount credited', 'payment completed', 'transfer received'
    ];

    // Check for confirmation keywords
    const hasConfirmationKeyword = confirmationKeywords.some(keyword =>
      text.includes(keyword)
    );

    if (!hasConfirmationKeyword) {
      return null;
    }

    // Extract amount
    let amount = null;
    for (const pattern of paymentPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        // Remove commas and parse
        amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    if (!amount || amount <= 0) {
      return null;
    }

    // Extract additional information
    const upiRefPattern = /(?:upi ref|ref no|transaction id|txn id|reference)[\s:]*([a-zA-Z0-9]+)/i;
    const upiRefMatch = content.match(upiRefPattern);
    const upiRef = upiRefMatch ? upiRefMatch[1] : null;

    // Extract sender/payer info
    const fromPatterns = [
      /(?:from|by|payer)[\s:]+([a-zA-Z\s]+?)(?:\s|$|\.|,)/i,
      /(?:received from)[\s:]+([a-zA-Z\s]+?)(?:\s|$|\.|,)/i,
      /([a-zA-Z\s]+?)(?:\s+has sent|\s+sent you)/i
    ];

    let sender = null;
    for (const pattern of fromPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        sender = match[1].trim();
        break;
      }
    }

    // Extract UPI app info
    const upiAppPattern = /(?:via|using|through)\s+(gpay|phonepe|paytm|bhim|googlepay|amazon pay)/i;
    const upiAppMatch = content.match(upiAppPattern);
    const upiApp = upiAppMatch ? upiAppMatch[1] : null;

    return {
      amount,
      upiRef,
      sender,
      upiApp,
      source,
      timestamp: Date.now(),
      originalContent: content,
      confidence: this.calculateContentConfidence(content, amount)
    };
  }

  // Calculate confidence based on content analysis
  calculateContentConfidence(content, amount) {
    let confidence = 50; // Base confidence

    const text = content.toLowerCase();

    // High confidence indicators
    if (text.includes('upi') || text.includes('bhim')) confidence += 20;
    if (text.includes('transaction successful') || text.includes('payment successful')) confidence += 15;
    if (text.includes('credited to account') || text.includes('amount credited')) confidence += 15;
    if (text.includes('reference') || text.includes('txn id')) confidence += 10;

    // UPI app mentions
    if (text.includes('gpay') || text.includes('phonepe') || text.includes('paytm')) confidence += 10;

    // Bank SMS indicators
    if (text.includes('bank') || text.includes('account')) confidence += 5;

    // Amount format confidence
    if (amount && amount.toString().includes('.')) confidence += 5; // Decimal amounts are more specific

    return Math.min(confidence, 100);
  }

  // Match parsed payment with active payments - STRICT INTEGER AMOUNT MATCHING
  matchActivePayment(parsedPayment) {
    for (const [paymentId, activePayment] of this.activePayments.entries()) {
      // STRICT: Amount must match exactly as integers (no decimals)
      const expectedAmount = Math.round(activePayment.amount);
      const receivedAmount = Math.round(parsedPayment.amount);
      const amountMatches = expectedAmount === receivedAmount;

      // Time window check - payment must be within 10 minutes
      const timeDiff = Date.now() - activePayment.timestamp;
      const timeMatches = timeDiff < 10 * 60 * 1000; // 10 minutes window

      // Only proceed if BOTH amount AND time match
      if (amountMatches && timeMatches) {
        const matchConfidence = this.calculateMatchConfidence(parsedPayment, activePayment);
        
        return {
          paymentId,
          activePayment,
          confidence: matchConfidence,
          parsedPayment,
          amountMatched: true
        };
      }
    }
    return null;
  }

  // Calculate match confidence - Amount match is MANDATORY (integers only)
  calculateMatchConfidence(parsedPayment, activePayment) {
    let confidence = 0;

    // MANDATORY: Exact integer amount match (already verified in matchActivePayment)
    const expectedAmount = Math.round(activePayment.amount);
    const receivedAmount = Math.round(parsedPayment.amount);
    
    if (expectedAmount !== receivedAmount) {
      // Amount doesn't match - return 0 confidence
      return 0;
    }
    
    // Amount matches exactly - start with 70% base confidence
    confidence = 70;

    // Time proximity bonus (up to 20%)
    const timeDiff = Date.now() - activePayment.timestamp;
    if (timeDiff < 1 * 60 * 1000) confidence += 20;       // Within 1 minute
    else if (timeDiff < 2 * 60 * 1000) confidence += 15;  // Within 2 minutes
    else if (timeDiff < 5 * 60 * 1000) confidence += 10;  // Within 5 minutes
    else if (timeDiff < 10 * 60 * 1000) confidence += 5;  // Within 10 minutes

    // Content quality bonus (up to 10%)
    if (parsedPayment.confidence >= 80) confidence += 10;
    else if (parsedPayment.confidence >= 60) confidence += 5;

    return Math.min(confidence, 100);
  }

  // Start listening for notifications and SMS
  async startListening() {
    if (this.isListening) {
      return true;
    }

    console.log('🔄 Starting notification payment reader...');

    const permissions = await this.requestPermissions();
    
    try {
      // Start notification listening if permissions granted
      if (permissions.notifications) {
        this.startNotificationListening();
        console.log('✅ Notification listening started');
      } else {
        console.log('⚠️ Notification permissions not granted');
      }

      // Start SMS listening (Android only)
      if (permissions.sms && Platform.OS === 'android') {
        this.startSMSListening();
        console.log('✅ SMS listening started');
      } else {
        console.log('⚠️ SMS listening not available on this platform');
      }

      // Start even if only one permission is granted
      if (permissions.notifications || permissions.sms) {
        this.isListening = true;
        console.log('✅ Payment reader started with available permissions');
        return true;
      } else {
        Alert.alert(
          'Permissions Required',
          'To automatically detect UPI payments, please grant notification or SMS permissions. This allows FlowPOS to detect payment confirmations automatically.',
          [
            { text: 'Continue Manually', style: 'cancel' },
            { text: 'Grant Permissions', onPress: () => this.requestPermissions() }
          ]
        );
        // Still start in manual mode
        this.isListening = true;
        return true;
      }
    } catch (error) {
      console.error('Error starting notification reader:', error);
      return false;
    }
  }

  // Start listening for notifications
  startNotificationListening() {
    try {
      // Listen for incoming notifications
      this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
        this.processNotification(notification);
      });

      console.log('📱 Notification listener started');
    } catch (error) {
      console.error('Error starting notification listener:', error);
    }
  }

  // Process incoming notification
  processNotification(notification) {
    try {
      const notificationId = notification.request.identifier;
      
      // Prevent duplicate processing
      if (this.lastProcessedNotifications.has(notificationId)) {
        return;
      }
      
      this.lastProcessedNotifications.add(notificationId);
      
      // Keep only last 100 notification IDs to prevent memory issues
      if (this.lastProcessedNotifications.size > 100) {
        const firstId = this.lastProcessedNotifications.values().next().value;
        this.lastProcessedNotifications.delete(firstId);
      }

      console.log('📱 Processing notification:', notification.request.content.title);

      // Extract notification content
      const title = notification.request.content.title || '';
      const body = notification.request.content.body || '';
      const content = `${title} ${body}`;

      // Parse payment information
      const parsedPayment = this.parsePaymentContent(content, 'notification');
      
      if (parsedPayment) {
        // Add notification metadata
        parsedPayment.notificationId = notificationId;
        parsedPayment.appName = this.extractAppName(title, body);
        
        this.processPaymentConfirmation(parsedPayment);
      }
    } catch (error) {
      console.error('Error processing notification:', error);
    }
  }

  // Extract app name from notification
  extractAppName(title, body) {
    const content = `${title} ${body}`.toLowerCase();
    
    if (content.includes('google pay') || content.includes('gpay')) return 'Google Pay';
    if (content.includes('phonepe')) return 'PhonePe';
    if (content.includes('paytm')) return 'Paytm';
    if (content.includes('bhim')) return 'BHIM UPI';
    if (content.includes('amazon pay')) return 'Amazon Pay';
    if (content.includes('mobikwik')) return 'MobiKwik';
    if (content.includes('freecharge')) return 'FreeCharge';
    
    return 'UPI App';
  }

  // Start SMS listening (Android)
  startSMSListening() {
    // Enhanced SMS listening with better pattern recognition
    this.smsCheckInterval = setInterval(() => {
      this.checkRecentSMS();
    }, 2000); // Check every 2 seconds for faster detection

    console.log('📨 Enhanced SMS listener started');
  }

  // Process incoming SMS (enhanced implementation)
  processSMSMessage(messageBody, sender, timestamp) {
    try {
      console.log('📨 Processing SMS from:', sender);

      // Check if it's a payment confirmation SMS
      const parsedPayment = this.parsePaymentContent(messageBody, 'sms');
      
      if (parsedPayment) {
        // Add sender and timestamp info
        parsedPayment.sender = parsedPayment.sender || sender;
        parsedPayment.timestamp = timestamp || Date.now();
        
        this.processPaymentConfirmation(parsedPayment);
      }
    } catch (error) {
      console.error('Error processing SMS:', error);
    }
  }

  // Check recent SMS messages
  async checkRecentSMS() {
    try {
      // This is a simplified implementation
      // In production, you'd want to use a native module for real SMS access
      const recentSMS = await AsyncStorage.getItem('recentSMSMessages');
      
      if (recentSMS) {
        const messages = JSON.parse(recentSMS);
        const now = Date.now();
        
        // Process messages from last 3 minutes for faster detection
        const recentMessages = messages.filter(msg => 
          now - msg.timestamp < 3 * 60 * 1000
        );

        for (const sms of recentMessages) {
          this.processSMSMessage(sms.body, sms.sender, sms.timestamp);
        }
      }
    } catch (error) {
      console.error('Error checking SMS:', error);
    }
  }

  // Process payment confirmation
  processPaymentConfirmation(parsedPayment) {
    console.log('💰 Payment confirmation detected:', parsedPayment);

    const match = this.matchActivePayment(parsedPayment);

    if (match && match.confidence >= 95) {
      console.log(`✅ Payment auto-confirmed with ${match.confidence}% confidence`);

      // Update payment status
      match.activePayment.status = 'confirmed';
      match.activePayment.confirmationData = parsedPayment;

      // Notify listeners
      this.notifyListeners({
        paymentId: match.paymentId,
        amount: parsedPayment.amount,
        upiRef: parsedPayment.upiRef,
        sender: parsedPayment.sender,
        upiApp: parsedPayment.upiApp,
        confidence: match.confidence,
        timestamp: parsedPayment.timestamp,
        activePayment: match.activePayment,
        autoConfirmed: true,
        source: parsedPayment.source
      });

      // Remove from tracking
      this.removePaymentFromTrack(match.paymentId);

      // Save confirmation record
      this.savePaymentConfirmation(match.paymentId, parsedPayment);

    } else if (match && match.confidence >= 85) {
      console.log(`⚠️ Possible payment detected with ${match.confidence}% confidence`);
      
      // Don't auto-confirm, but notify for manual verification
      this.notifyListeners({
        paymentId: match.paymentId,
        amount: parsedPayment.amount,
        confidence: match.confidence,
        requiresManualConfirmation: true,
        parsedPayment,
        activePayment: match.activePayment
      });
    }
  }

  // Save payment confirmation
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

  // Stop listening
  stopListening() {
    // Stop notification listener
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    // Stop SMS checking
    if (this.smsCheckInterval) {
      clearInterval(this.smsCheckInterval);
      this.smsCheckInterval = null;
    }

    this.isListening = false;
    console.log('🛑 Enhanced payment reader stopped');
  }

  // Clean up old payments
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

  // Manual confirmation
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

  // Get payment history
  async getPaymentHistory() {
    try {
      const confirmations = await AsyncStorage.getItem('paymentConfirmations');
      return confirmations ? JSON.parse(confirmations) : [];
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }
}

// Create singleton instance
const notificationPaymentReader = new NotificationPaymentReader();

export default notificationPaymentReader;