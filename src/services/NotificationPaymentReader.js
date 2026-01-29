import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Import Android SMS Listener for payment detection
let SmsListener = null;
if (Platform.OS === 'android') {
  try {
    SmsListener = require('react-native-android-sms-listener').default;
  } catch (e) {
    console.log('SMS Listener not available:', e.message);
  }
}

// Import Notification Listener for payment app notifications (GPay, PhonePe, Paytm)
let RNNotificationListener = null;
if (Platform.OS === 'android') {
  try {
    RNNotificationListener = require('react-native-notification-listener');
  } catch (e) {
    console.log('Notification Listener not available:', e.message);
  }
}

// Payment app package names to monitor
const PAYMENT_APP_PACKAGES = [
  'com.google.android.apps.nbu.paisa.user', // Google Pay
  'com.phonepe.app',                         // PhonePe
  'net.one97.paytm',                         // Paytm
  'in.org.npci.upiapp',                      // BHIM
  'com.amazon.mShop.android.shopping',       // Amazon Pay
  'com.whatsapp',                            // WhatsApp Pay
  'com.freecharge.android',                  // Freecharge
  'com.mobikwik_new',                        // MobiKwik
];

class NotificationPaymentReader {
  constructor() {
    this.isListening = false;
    this.activePayments = new Map();
    this.listeners = new Set();
    this.notificationListener = null;
    this.smsSubscription = null;
    this.notificationSubscription = null;
    this.lastProcessedNotifications = new Set();
    this.lastProcessedSMS = new Set();
    this.notificationHistory = [];
    this.hasNotificationAccess = false;
  }

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

  removePaymentFromTrack(paymentId) {
    this.activePayments.delete(paymentId);
    console.log(`🗑️ Stopped tracking payment: ${paymentId}`);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(paymentData) {
    this.listeners.forEach(callback => {
      try {
        callback(paymentData);
      } catch (error) {
        console.error('Error in payment listener callback:', error);
      }
    });
  }


  async checkNotificationListenerPermission() {
    if (Platform.OS !== 'android' || !RNNotificationListener) {
      return false;
    }
    try {
      const status = await RNNotificationListener.getPermissionStatus();
      this.hasNotificationAccess = status === 'authorized';
      console.log('🔔 Notification listener permission status:', status);
      return this.hasNotificationAccess;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  async requestNotificationListenerPermission() {
    if (Platform.OS !== 'android' || !RNNotificationListener) {
      return false;
    }
    try {
      const hasPermission = await this.checkNotificationListenerPermission();
      if (hasPermission) return true;

      return new Promise((resolve) => {
        Alert.alert(
          'Enable Notification Access',
          'To automatically detect UPI payments from GPay, PhonePe, and Paytm, FlowPOS needs notification access.\n\nThis allows instant payment confirmation without waiting for bank SMS.',
          [
            { text: 'Not Now', style: 'cancel', onPress: () => resolve(false) },
            { 
              text: 'Enable', 
              onPress: async () => {
                try {
                  await RNNotificationListener.requestPermission();
                  setTimeout(async () => {
                    const granted = await this.checkNotificationListenerPermission();
                    resolve(granted);
                  }, 1000);
                } catch (e) {
                  console.error('Error opening notification settings:', e);
                  resolve(false);
                }
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async requestPermissions() {
    console.log('🔄 [DEBUG] requestPermissions called');
    try {
      console.log('🔄 [DEBUG] Requesting notification permissions...');
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      const hasNotificationPermissions = notificationStatus === 'granted';
      console.log('🔄 [DEBUG] Notification permissions result:', hasNotificationPermissions);
      
      let hasSMSPermissions = false;
      let hasNotificationListenerPermission = false;

      if (Platform.OS === 'android') {
        console.log('🔄 [DEBUG] Requesting SMS permissions...');
        try {
          // Create timeout promise to prevent hanging
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('SMS permission request timeout after 15 seconds')), 15000);
          });

          // Create the actual permission request
          const permissionPromise = PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          ], {
            title: 'SMS Permissions for Payment Detection',
            message: 'FlowPOS needs SMS access to automatically detect UPI payment confirmations from your bank.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          });

          console.log('🔄 [DEBUG] Waiting for SMS permission response...');
          const smsPermissions = await Promise.race([permissionPromise, timeoutPromise]);
          console.log('🔄 [DEBUG] SMS permissions response:', smsPermissions);

          hasSMSPermissions = 
            smsPermissions && 
            smsPermissions['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
            smsPermissions['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED;

          console.log('🔄 [DEBUG] SMS permissions granted:', hasSMSPermissions);
        } catch (smsError) {
          console.error('🔄 [DEBUG] Error requesting SMS permissions:', smsError.message);
          hasSMSPermissions = false;
          
          // If timeout, still continue - don't block the entire flow
          if (smsError.message.includes('timeout')) {
            console.log('🔄 [DEBUG] SMS permission request timed out, continuing without SMS permissions');
          }
        }

        console.log('🔄 [DEBUG] Checking notification listener permission...');
        try {
          // Also add timeout for notification listener check
          const notifTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Notification listener check timeout')), 5000);
          });

          const notifCheckPromise = this.checkNotificationListenerPermission();
          hasNotificationListenerPermission = await Promise.race([notifCheckPromise, notifTimeoutPromise]);
          console.log('🔄 [DEBUG] Notification listener permission:', hasNotificationListenerPermission);
        } catch (notifError) {
          console.error('🔄 [DEBUG] Error checking notification listener permission:', notifError.message);
          hasNotificationListenerPermission = false;
        }

        const result = { 
          notifications: hasNotificationPermissions, 
          sms: hasSMSPermissions, 
          notificationListener: hasNotificationListenerPermission 
        };
        console.log('🔄 [DEBUG] Final permission result:', result);
        return result;
      }
      
      const result = { 
        notifications: hasNotificationPermissions, 
        sms: false, 
        notificationListener: false 
      };
      console.log('🔄 [DEBUG] Non-Android platform result:', result);
      return result;
    } catch (error) {
      console.error('🔄 [DEBUG] Error in requestPermissions:', error.message);
      // Return safe defaults on any error
      return { notifications: false, sms: false, notificationListener: false };
    }
  }


  parsePaymentContent(content, source = 'notification') {
    const text = content.toLowerCase();
    const paymentPatterns = [
      // UPI patterns
      /(?:received|credited|paid|got).*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?).*?(?:received|credited|paid)/i,
      /upi.*?(?:received|credited).*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:gpay|phonepe|paytm|bhim).*?(?:received|credited).*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      
      // Bank account patterns
      /(?:account|a\/c).*?credited.*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /credited.*?(?:account|a\/c).*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:bank|hdfc|icici|sbi|axis|kotak).*?credited.*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      
      // Transaction patterns
      /(?:transaction|txn).*?successful.*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:amount|sum).*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      
      // Generic patterns
      /(?:you received|you got|payment of).*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:received|credited|paid)/i,
      
      // IMPS/NEFT patterns
      /(?:imps|neft|rtgs).*?(?:received|credited).*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      
      // Mobile banking patterns
      /(?:mobile banking|net banking).*?(?:received|credited).*?(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    ];

    const confirmationKeywords = [
      'received', 'credited', 'payment received', 'money received',
      'upi credit', 'transaction successful', 'payment successful',
      'amount credited', 'payment completed', 'transfer received',
      'you received', 'you got', 'sent you', 'paid you',
      'account credited', 'bank credit', 'imps received',
      'neft received', 'rtgs received'
    ];

    const hasConfirmationKeyword = confirmationKeywords.some(keyword => text.includes(keyword));
    if (!hasConfirmationKeyword) return null;

    let amount = null;
    for (const pattern of paymentPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    if (!amount || amount <= 0) return null;

    const upiRefPattern = /(?:upi ref|ref no|transaction id|txn id|reference|utr|rrn)[\s:]*([a-zA-Z0-9]+)/i;
    const upiRefMatch = content.match(upiRefPattern);
    const upiRef = upiRefMatch ? upiRefMatch[1] : null;

    const fromPatterns = [
      /(?:from|by|payer)[\s:]+([a-zA-Z\s]+?)(?:\s|$|\.|,)/i,
      /(?:received from)[\s:]+([a-zA-Z\s]+?)(?:\s|$|\.|,)/i,
      /([a-zA-Z\s]+?)(?:\s+has sent|\s+sent you|\s+paid you)/i
    ];
    let sender = null;
    for (const pattern of fromPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        sender = match[1].trim();
        break;
      }
    }

    const upiAppPattern = /(?:via|using|through)\s+(gpay|phonepe|paytm|bhim|googlepay|amazon pay)/i;
    const upiAppMatch = content.match(upiAppPattern);
    const upiApp = upiAppMatch ? upiAppMatch[1] : null;

    return {
      amount, upiRef, sender, upiApp, source,
      timestamp: Date.now(),
      originalContent: content,
      confidence: this.calculateContentConfidence(content, amount, source)
    };
  }

  calculateContentConfidence(content, amount, source = 'sms') {
    let confidence = 50;
    const text = content.toLowerCase();

    // Source-based confidence
    if (source === 'payment_app') confidence += 15;
    if (source === 'sms') confidence += 10;
    
    // UPI-related keywords
    if (text.includes('upi') || text.includes('bhim')) confidence += 20;
    if (text.includes('gpay') || text.includes('google pay')) confidence += 10;
    if (text.includes('phonepe')) confidence += 10;
    if (text.includes('paytm')) confidence += 10;
    
    // Transaction success indicators
    if (text.includes('transaction successful') || text.includes('payment successful')) confidence += 15;
    if (text.includes('credited to account') || text.includes('amount credited')) confidence += 15;
    
    // Bank-related keywords
    if (text.includes('bank') || text.includes('account')) confidence += 5;
    if (text.includes('hdfc') || text.includes('icici') || text.includes('sbi') || text.includes('axis') || text.includes('kotak')) confidence += 10;
    if (text.includes('imps') || text.includes('neft') || text.includes('rtgs')) confidence += 10;
    
    // Reference number presence
    if (text.includes('reference') || text.includes('txn id') || text.includes('utr') || text.includes('rrn')) confidence += 10;
    
    // Amount precision
    if (amount && amount.toString().includes('.')) confidence += 5;
    
    // Mobile banking keywords
    if (text.includes('mobile banking') || text.includes('net banking')) confidence += 8;

    return Math.min(confidence, 100);
  }


  matchActivePayment(parsedPayment) {
    for (const [paymentId, activePayment] of this.activePayments.entries()) {
      const expectedAmount = Math.round(activePayment.amount);
      const receivedAmount = Math.round(parsedPayment.amount);
      const amountMatches = expectedAmount === receivedAmount;
      const timeDiff = Date.now() - activePayment.timestamp;
      const timeMatches = timeDiff < 10 * 60 * 1000;

      if (amountMatches && timeMatches) {
        const matchConfidence = this.calculateMatchConfidence(parsedPayment, activePayment);
        return { paymentId, activePayment, confidence: matchConfidence, parsedPayment, amountMatched: true };
      }
    }
    return null;
  }

  calculateMatchConfidence(parsedPayment, activePayment) {
    const expectedAmount = Math.round(activePayment.amount);
    const receivedAmount = Math.round(parsedPayment.amount);
    if (expectedAmount !== receivedAmount) return 0;
    
    let confidence = 70;
    if (parsedPayment.source === 'payment_app') confidence += 5;

    const timeDiff = Date.now() - activePayment.timestamp;
    if (timeDiff < 1 * 60 * 1000) confidence += 20;
    else if (timeDiff < 2 * 60 * 1000) confidence += 15;
    else if (timeDiff < 5 * 60 * 1000) confidence += 10;
    else if (timeDiff < 10 * 60 * 1000) confidence += 5;

    if (parsedPayment.confidence >= 80) confidence += 10;
    else if (parsedPayment.confidence >= 60) confidence += 5;

    return Math.min(confidence, 100);
  }

  async startListening() {
    if (this.isListening) return true;
    console.log('🔄 Starting payment reader (SMS + Notification based)...');

    const permissions = await this.requestPermissions();
    try {
      let smsStarted = false;
      let notificationStarted = false;

      if (permissions.sms && Platform.OS === 'android') {
        this.startSMSListening();
        smsStarted = true;
        console.log('✅ SMS listening started');
      }

      if (Platform.OS === 'android') {
        notificationStarted = await this.startNotificationListening();
        if (notificationStarted) {
          console.log('✅ Payment app notification listening started');
        }
      }

      if (Platform.OS === 'android' && !smsStarted && !notificationStarted) {
        Alert.alert(
          'Payment Detection Limited',
          'For automatic payment detection, please enable:\n\n• SMS permissions (for bank messages)\n• Notification access (for GPay/PhonePe/Paytm)\n\nYou can still confirm payments manually.',
          [
            { text: 'Continue Manually', style: 'cancel' },
            { text: 'Grant Permissions', onPress: () => this.requestPermissions() }
          ]
        );
      }

      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Error starting payment reader:', error);
      return false;
    }
  }

  startSMSListening() {
    if (Platform.OS !== 'android' || !SmsListener) {
      console.log('📨 SMS listening not available');
      return;
    }
    try {
      this.smsSubscription = SmsListener.addListener(message => {
        console.log('📨 SMS received:', message.originatingAddress);
        this.processSMSMessage(message.body, message.originatingAddress, Date.now());
      });
      console.log('📨 ✅ SMS listener started');
    } catch (error) {
      console.error('❌ Error starting SMS listener:', error);
    }
  }

  async startNotificationListening() {
    if (Platform.OS !== 'android' || !RNNotificationListener) {
      console.log('🔔 Notification listening not available');
      return false;
    }
    try {
      const hasPermission = await this.checkNotificationListenerPermission();
      if (!hasPermission) {
        console.log('🔔 Notification listener permission not granted');
        return false;
      }

      this.notificationSubscription = RNNotificationListener.default.addListener(
        'notification',
        (notification) => this.processAppNotification(notification)
      );
      console.log('🔔 ✅ Payment app notification listener started');
      return true;
    } catch (error) {
      console.error('❌ Error starting notification listener:', error);
      return false;
    }
  }


  processAppNotification(notification) {
    try {
      const { app, title, text, time } = notification;
      if (!PAYMENT_APP_PACKAGES.includes(app)) return;

      const notificationId = `${app}_${time}_${(title || '').substring(0, 20)}`;
      if (this.lastProcessedNotifications.has(notificationId)) {
        console.log('🔔 Skipping duplicate notification');
        return;
      }
      this.lastProcessedNotifications.add(notificationId);
      if (this.lastProcessedNotifications.size > 50) {
        const firstId = this.lastProcessedNotifications.values().next().value;
        this.lastProcessedNotifications.delete(firstId);
      }

      const appNames = {
        'com.google.android.apps.nbu.paisa.user': 'Google Pay',
        'com.phonepe.app': 'PhonePe',
        'net.one97.paytm': 'Paytm',
        'in.org.npci.upiapp': 'BHIM',
        'com.amazon.mShop.android.shopping': 'Amazon Pay',
        'com.whatsapp': 'WhatsApp Pay',
      };
      const appName = appNames[app] || app;

      console.log(`🔔 Payment app notification from ${appName}: ${title}`);
      const fullContent = `${title || ''} ${text || ''}`;
      const parsedPayment = this.parsePaymentContent(fullContent, 'payment_app');
      
      if (parsedPayment) {
        console.log('💰 Payment detected in notification:', parsedPayment);
        parsedPayment.appName = appName;
        parsedPayment.timestamp = time || Date.now();
        this.processPaymentConfirmation(parsedPayment);
      }
    } catch (error) {
      console.error('Error processing app notification:', error);
    }
  }

  processSMSMessage(messageBody, sender, timestamp) {
    try {
      const smsId = `${sender}_${timestamp}_${messageBody.substring(0, 20)}`;
      if (this.lastProcessedSMS.has(smsId)) {
        console.log('📨 Skipping duplicate SMS');
        return;
      }
      this.lastProcessedSMS.add(smsId);
      if (this.lastProcessedSMS.size > 50) {
        const firstId = this.lastProcessedSMS.values().next().value;
        this.lastProcessedSMS.delete(firstId);
      }

      console.log('📨 Processing SMS from:', sender);
      const parsedPayment = this.parsePaymentContent(messageBody, 'sms');
      
      if (parsedPayment) {
        console.log('💰 Payment detected in SMS:', parsedPayment);
        parsedPayment.sender = parsedPayment.sender || sender;
        parsedPayment.timestamp = timestamp || Date.now();
        this.processPaymentConfirmation(parsedPayment);
      }
    } catch (error) {
      console.error('Error processing SMS:', error);
    }
  }

  processPaymentConfirmation(parsedPayment) {
    console.log(`💰 Payment confirmation (source: ${parsedPayment.source}):`, parsedPayment);
    const match = this.matchActivePayment(parsedPayment);

    if (match && match.confidence >= 95) {
      console.log(`✅ Payment auto-confirmed with ${match.confidence}% confidence (via ${parsedPayment.source})`);
      match.activePayment.status = 'confirmed';
      match.activePayment.confirmationData = parsedPayment;

      this.notifyListeners({
        paymentId: match.paymentId,
        amount: parsedPayment.amount,
        upiRef: parsedPayment.upiRef,
        sender: parsedPayment.sender,
        upiApp: parsedPayment.upiApp || parsedPayment.appName,
        confidence: match.confidence,
        timestamp: parsedPayment.timestamp,
        activePayment: match.activePayment,
        autoConfirmed: true,
        source: parsedPayment.source
      });

      this.removePaymentFromTrack(match.paymentId);
      this.savePaymentConfirmation(match.paymentId, parsedPayment);
    } else if (match && match.confidence >= 85) {
      console.log(`⚠️ Possible payment with ${match.confidence}% confidence (via ${parsedPayment.source})`);
      this.notifyListeners({
        paymentId: match.paymentId,
        amount: parsedPayment.amount,
        confidence: match.confidence,
        requiresManualConfirmation: true,
        parsedPayment,
        activePayment: match.activePayment,
        source: parsedPayment.source
      });
    }
  }

  async savePaymentConfirmation(paymentId, confirmationData) {
    try {
      const confirmations = await AsyncStorage.getItem('paymentConfirmations');
      const confirmationList = confirmations ? JSON.parse(confirmations) : [];
      confirmationList.unshift({ paymentId, ...confirmationData, confirmedAt: Date.now() });
      if (confirmationList.length > 50) confirmationList.splice(50);
      await AsyncStorage.setItem('paymentConfirmations', JSON.stringify(confirmationList));
      console.log('💾 Payment confirmation saved');
    } catch (error) {
      console.error('Error saving payment confirmation:', error);
    }
  }

  stopListening() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.smsSubscription) {
      this.smsSubscription.remove();
      this.smsSubscription = null;
      console.log('📨 SMS listener stopped');
    }
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
      this.notificationSubscription = null;
      console.log('🔔 Notification listener stopped');
    }
    this.isListening = false;
    console.log('🛑 Payment reader stopped');
  }

  cleanupOldPayments() {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    for (const [paymentId, payment] of this.activePayments.entries()) {
      if (now - payment.timestamp > thirtyMinutes) {
        this.removePaymentFromTrack(paymentId);
      }
    }
  }

  getActivePaymentsCount() {
    return this.activePayments.size;
  }

  manualConfirmPayment(paymentId, amount) {
    const activePayment = this.activePayments.get(paymentId);
    if (activePayment) {
      this.notifyListeners({
        paymentId, amount, confidence: 100, timestamp: Date.now(),
        activePayment, manual: true, source: 'manual'
      });
      this.removePaymentFromTrack(paymentId);
      return true;
    }
    return false;
  }

  async getPaymentHistory() {
    try {
      const confirmations = await AsyncStorage.getItem('paymentConfirmations');
      return confirmations ? JSON.parse(confirmations) : [];
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }

  getListenerStatus() {
    return {
      isListening: this.isListening,
      smsEnabled: !!this.smsSubscription,
      notificationEnabled: !!this.notificationSubscription,
      hasNotificationAccess: this.hasNotificationAccess,
      activePaymentsCount: this.activePayments.size
    };
  }

  async promptNotificationAccess() {
    if (Platform.OS !== 'android') return false;
    const hasAccess = await this.checkNotificationListenerPermission();
    if (hasAccess) {
      await this.startNotificationListening();
      return true;
    }
    return await this.requestNotificationListenerPermission();
  }
}

const notificationPaymentReader = new NotificationPaymentReader();
export default notificationPaymentReader;
