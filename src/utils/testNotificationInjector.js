// Test utility to simulate payment notifications for development and testing

class TestNotificationInjector {
  constructor() {
    this.paymentReader = null;
  }

  // Set the payment reader instance
  setPaymentReader(paymentReader) {
    this.paymentReader = paymentReader;
  }

  // Simulate a Google Pay notification
  simulateGooglePayNotification(amount, senderName = 'Test Customer') {
    if (!this.paymentReader) {
      console.error('Payment reader not set');
      return;
    }

    const notification = {
      request: {
        identifier: `gpay_${Date.now()}`,
        content: {
          title: 'Google Pay',
          body: `You received ₹${amount} from ${senderName}. UPI transaction ID: ${this.generateUPIRef()}`
        }
      }
    };

    console.log('🧪 Simulating Google Pay notification:', notification);
    this.paymentReader.processNotification(notification);
  }

  // Simulate a PhonePe notification
  simulatePhonePeNotification(amount, senderName = 'Test Customer') {
    if (!this.paymentReader) {
      console.error('Payment reader not set');
      return;
    }

    const notification = {
      request: {
        identifier: `phonepe_${Date.now()}`,
        content: {
          title: 'PhonePe',
          body: `Payment received! ₹${amount} credited from ${senderName}. Ref: ${this.generateUPIRef()}`
        }
      }
    };

    console.log('🧪 Simulating PhonePe notification:', notification);
    this.paymentReader.processNotification(notification);
  }

  // Simulate a Paytm notification
  simulatePaytmNotification(amount, senderName = 'Test Customer') {
    if (!this.paymentReader) {
      console.error('Payment reader not set');
      return;
    }

    const notification = {
      request: {
        identifier: `paytm_${Date.now()}`,
        content: {
          title: 'Paytm',
          body: `Money received: ₹${amount} from ${senderName}. Transaction successful. ID: ${this.generateUPIRef()}`
        }
      }
    };

    console.log('🧪 Simulating Paytm notification:', notification);
    this.paymentReader.processNotification(notification);
  }

  // Simulate a BHIM UPI notification
  simulateBHIMNotification(amount, senderName = 'Test Customer') {
    if (!this.paymentReader) {
      console.error('Payment reader not set');
      return;
    }

    const notification = {
      request: {
        identifier: `bhim_${Date.now()}`,
        content: {
          title: 'BHIM UPI',
          body: `UPI Credit: Rs.${amount} received from ${senderName}. Txn ID: ${this.generateUPIRef()}`
        }
      }
    };

    console.log('🧪 Simulating BHIM notification:', notification);
    this.paymentReader.processNotification(notification);
  }

  // Simulate a bank SMS
  simulateBankSMS(amount, bankName = 'Test Bank') {
    if (!this.paymentReader) {
      console.error('Payment reader not set');
      return;
    }

    const smsContent = `${bankName}: Your account has been credited with Rs.${amount} via UPI. Transaction ID: ${this.generateUPIRef()}. Available balance: Rs.10,000.00`;

    console.log('🧪 Simulating bank SMS:', smsContent);
    this.paymentReader.processSMSMessage(smsContent, bankName, Date.now());
  }

  // Simulate a generic UPI notification
  simulateGenericUPINotification(amount, appName = 'UPI App') {
    if (!this.paymentReader) {
      console.error('Payment reader not set');
      return;
    }

    const notification = {
      request: {
        identifier: `upi_${Date.now()}`,
        content: {
          title: appName,
          body: `UPI transaction successful. Amount: ₹${amount}. Reference: ${this.generateUPIRef()}`
        }
      }
    };

    console.log('🧪 Simulating generic UPI notification:', notification);
    this.paymentReader.processNotification(notification);
  }

  // Generate a random UPI reference ID
  generateUPIRef() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Test all notification types for a specific amount
  testAllNotificationTypes(amount) {
    console.log(`🧪 Testing all notification types for ₹${amount}`);
    
    setTimeout(() => this.simulateGooglePayNotification(amount), 1000);
    setTimeout(() => this.simulatePhonePeNotification(amount), 2000);
    setTimeout(() => this.simulatePaytmNotification(amount), 3000);
    setTimeout(() => this.simulateBHIMNotification(amount), 4000);
    setTimeout(() => this.simulateBankSMS(amount), 5000);
    setTimeout(() => this.simulateGenericUPINotification(amount), 6000);
  }

  // Test with different confidence scenarios
  testConfidenceScenarios(amount) {
    console.log(`🧪 Testing confidence scenarios for ₹${amount}`);

    // High confidence - exact amount with clear UPI keywords
    setTimeout(() => {
      const notification = {
        request: {
          identifier: `high_conf_${Date.now()}`,
          content: {
            title: 'Google Pay',
            body: `UPI payment received! ₹${amount} credited successfully. Transaction ID: ${this.generateUPIRef()}`
          }
        }
      };
      this.paymentReader.processNotification(notification);
    }, 1000);

    // Medium confidence - amount present but less clear context
    setTimeout(() => {
      const notification = {
        request: {
          identifier: `med_conf_${Date.now()}`,
          content: {
            title: 'Payment App',
            body: `Amount ₹${amount} received. Check your account.`
          }
        }
      };
      this.paymentReader.processNotification(notification);
    }, 3000);

    // Low confidence - unclear notification
    setTimeout(() => {
      const notification = {
        request: {
          identifier: `low_conf_${Date.now()}`,
          content: {
            title: 'App Notification',
            body: `Transaction completed for ${amount} rupees.`
          }
        }
      };
      this.paymentReader.processNotification(notification);
    }, 5000);
  }

  // Test duplicate notification handling
  testDuplicateHandling(amount) {
    console.log(`🧪 Testing duplicate notification handling for ₹${amount}`);

    const notificationId = `duplicate_test_${Date.now()}`;
    const notification = {
      request: {
        identifier: notificationId,
        content: {
          title: 'Google Pay',
          body: `You received ₹${amount}. UPI ID: ${this.generateUPIRef()}`
        }
      }
    };

    // Send same notification twice
    console.log('🧪 Sending first notification...');
    this.paymentReader.processNotification(notification);

    setTimeout(() => {
      console.log('🧪 Sending duplicate notification (should be ignored)...');
      this.paymentReader.processNotification(notification);
    }, 2000);
  }

  // Test timing scenarios
  testTimingScenarios(amount) {
    console.log(`🧪 Testing timing scenarios for ₹${amount}`);

    // Immediate notification (within 1 minute)
    setTimeout(() => {
      console.log('🧪 Immediate notification...');
      this.simulateGooglePayNotification(amount);
    }, 1000);

    // Delayed notification (5 minutes later)
    setTimeout(() => {
      console.log('🧪 Delayed notification (should still match)...');
      this.simulatePhonePeNotification(amount);
    }, 5 * 60 * 1000);

    // Very late notification (15 minutes later - should not match)
    setTimeout(() => {
      console.log('🧪 Very late notification (should not match)...');
      this.simulatePaytmNotification(amount);
    }, 15 * 60 * 1000);
  }
}

// Create singleton instance
const testNotificationInjector = new TestNotificationInjector();

export default testNotificationInjector;