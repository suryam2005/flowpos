import AsyncStorage from '@react-native-async-storage/async-storage';

// Test SMS injector for development and testing
class TestSMSInjector {
  // Inject a test SMS message for payment confirmation testing
  static async injectTestSMS(amount, sender = 'GPay', upiRef = null) {
    try {
      const testSMS = {
        body: this.generateTestSMSBody(amount, sender, upiRef),
        sender: sender,
        timestamp: Date.now()
      };

      // Get existing messages
      const existingMessages = await AsyncStorage.getItem('recentSMSMessages');
      const messages = existingMessages ? JSON.parse(existingMessages) : [];

      // Add test message
      messages.unshift(testSMS);

      // Keep only last 10 messages
      if (messages.length > 10) {
        messages.splice(10);
      }

      // Save back to storage
      await AsyncStorage.setItem('recentSMSMessages', JSON.stringify(messages));

      console.log('📱 Test SMS injected:', testSMS);
      return testSMS;
    } catch (error) {
      console.error('Error injecting test SMS:', error);
      return null;
    }
  }

  // Generate realistic test SMS body
  static generateTestSMSBody(amount, sender, upiRef) {
    const ref = upiRef || `${Date.now().toString().slice(-6)}`;
    
    const templates = {
      'GPay': `You received ₹${amount} from a payment. UPI Ref: ${ref}. Download Google Pay to send money back instantly.`,
      'PhonePe': `Money received! ₹${amount} credited to your account. UPI Ref: ${ref}. Thank you for using PhonePe.`,
      'Paytm': `₹${amount} received in your Paytm Wallet from UPI. Transaction ID: ${ref}. Keep transacting with Paytm.`,
      'Bank': `Your account has been credited with ₹${amount}. UPI Ref No: ${ref}. Available balance updated.`,
      'BHIM': `₹${amount} received via BHIM UPI. Reference: ${ref}. Transaction successful.`
    };

    return templates[sender] || templates['GPay'];
  }

  // Clear all test SMS messages
  static async clearTestSMS() {
    try {
      await AsyncStorage.removeItem('recentSMSMessages');
      console.log('🗑️ Test SMS messages cleared');
    } catch (error) {
      console.error('Error clearing test SMS:', error);
    }
  }

  // Inject multiple test SMS for different scenarios
  static async injectTestScenarios() {
    const scenarios = [
      { amount: 150.00, sender: 'GPay' },
      { amount: 250.50, sender: 'PhonePe' },
      { amount: 100.00, sender: 'Paytm' },
      { amount: 75.25, sender: 'Bank' },
      { amount: 300.00, sender: 'BHIM' }
    ];

    for (const scenario of scenarios) {
      await this.injectTestSMS(scenario.amount, scenario.sender);
      // Small delay between injections
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('📱 Multiple test SMS scenarios injected');
  }
}

export default TestSMSInjector;