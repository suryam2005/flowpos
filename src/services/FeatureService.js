import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class FeatureService {
  constructor() {
    this.userPlan = 'free'; // Default to free plan
    this.features = {};
    this.limits = {};
    this.isInitialized = false;
  }

  // Plan configurations
  PLAN_CONFIGS = {
    free: {
      features: {
        cash_payments: true,
        card_payments: true,
        upi_payments: true,
        sms_detection: true,
        cloud_backup: false,
        multi_device_sync: false,
        advanced_analytics: false,
        custom_branding: false,
        api_access: false,
        priority_support: false,
      },
      limits: {
        products: 50,
        orders_per_month: 100,
        storage_gb: 0,
        devices: 1,
      },
      price: 0,
      name: 'Free Plan'
    },
    starter: {
      features: {
        cash_payments: true,
        card_payments: true,
        upi_payments: true,
        sms_detection: true,
        cloud_backup: true,
        multi_device_sync: false,
        advanced_analytics: false,
        custom_branding: false,
        api_access: false,
        priority_support: false,
      },
      limits: {
        products: 500,
        orders_per_month: 1000,
        storage_gb: 1,
        devices: 2,
      },
      price: 299,
      name: 'Starter Plan'
    },
    business: {
      features: {
        cash_payments: true,
        card_payments: true,
        upi_payments: true,
        sms_detection: true,
        cloud_backup: true,
        multi_device_sync: true,
        advanced_analytics: true,
        custom_branding: true,
        api_access: false,
        priority_support: true,
      },
      limits: {
        products: 2000,
        orders_per_month: 5000,
        storage_gb: 5,
        devices: 5,
      },
      price: 599,
      name: 'Business Plan'
    },
    enterprise: {
      features: {
        cash_payments: true,
        card_payments: true,
        upi_payments: true,
        sms_detection: true,
        cloud_backup: true,
        multi_device_sync: true,
        advanced_analytics: true,
        custom_branding: true,
        api_access: true,
        priority_support: true,
      },
      limits: {
        products: -1, // unlimited
        orders_per_month: -1, // unlimited
        storage_gb: -1, // unlimited
        devices: -1, // unlimited
      },
      price: 1299,
      name: 'Enterprise Plan'
    }
  };

  // Initialize feature service
  async initialize() {
    try {
      await this.loadUserPlan();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing FeatureService:', error);
      // Fallback to free plan
      this.userPlan = 'free';
      this.updateFeatures();
    }
  }

  // Load user plan from storage or API
  async loadUserPlan() {
    try {
      // First try to load from local storage
      const storedPlan = await AsyncStorage.getItem('userPlan');
      if (storedPlan) {
        this.userPlan = storedPlan;
      }

      // TODO: In production, fetch from API
      // const response = await api.get('/user/subscription');
      // this.userPlan = response.data.plan;
      // await AsyncStorage.setItem('userPlan', this.userPlan);

      this.updateFeatures();
    } catch (error) {
      console.error('Error loading user plan:', error);
      this.userPlan = 'free';
      this.updateFeatures();
    }
  }

  // Update features based on current plan
  updateFeatures() {
    const planConfig = this.PLAN_CONFIGS[this.userPlan] || this.PLAN_CONFIGS.free;
    this.features = planConfig.features;
    this.limits = planConfig.limits;
  }

  // Check if user can use a specific feature
  canUseFeature(featureName) {
    if (!this.isInitialized) {
      console.warn('FeatureService not initialized');
      return false;
    }
    return this.features[featureName] === true;
  }

  // Get limit for a specific resource
  getLimit(limitName) {
    if (!this.isInitialized) {
      return 0;
    }
    return this.limits[limitName] || 0;
  }

  // Check if user has reached a limit
  async hasReachedLimit(limitName) {
    const limit = this.getLimit(limitName);
    if (limit === -1) return false; // unlimited

    const currentUsage = await this.getCurrentUsage(limitName);
    return currentUsage >= limit;
  }

  // Get current usage for a limit
  async getCurrentUsage(limitName) {
    try {
      switch (limitName) {
        case 'products':
          const products = await AsyncStorage.getItem('products');
          return products ? JSON.parse(products).length : 0;

        case 'orders_per_month':
          const orders = await AsyncStorage.getItem('orders');
          if (!orders) return 0;
          
          const orderList = JSON.parse(orders);
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          
          return orderList.filter(order => {
            const orderDate = new Date(order.timestamp);
            return orderDate.getMonth() === currentMonth && 
                   orderDate.getFullYear() === currentYear;
          }).length;

        case 'devices':
          // TODO: Implement device tracking
          return 1;

        default:
          return 0;
      }
    } catch (error) {
      console.error('Error getting current usage:', error);
      return 0;
    }
  }

  // Show upgrade prompt
  showUpgradePrompt(featureName, context = {}) {
    const upgradeMessages = {
      products: {
        title: 'Product Limit Reached',
        message: `You've reached your limit of ${this.getLimit('products')} products. Upgrade to add more products and grow your business.`,
        suggestedPlan: this.userPlan === 'free' ? 'starter' : 'business'
      },
      orders_per_month: {
        title: 'Monthly Order Limit Reached',
        message: `You've processed ${this.getLimit('orders_per_month')} orders this month. Upgrade to handle more orders.`,
        suggestedPlan: this.userPlan === 'free' ? 'starter' : 'business'
      },
      upi_payments: {
        title: 'Unlock UPI Payments',
        message: 'Accept UPI payments and increase your sales by up to 40%. Customers love the convenience of digital payments.',
        suggestedPlan: 'starter'
      },
      sms_detection: {
        title: 'Auto Payment Detection',
        message: 'Automatically detect UPI payment confirmations from SMS. No more manual confirmation needed.',
        suggestedPlan: 'starter'
      },
      advanced_analytics: {
        title: 'Advanced Analytics',
        message: 'Get detailed insights into your sales, best-selling products, and customer behavior.',
        suggestedPlan: 'business'
      },
      cloud_backup: {
        title: 'Cloud Backup',
        message: 'Secure your business data with automatic cloud backup. Never lose your important information.',
        suggestedPlan: 'starter'
      },
      multi_device_sync: {
        title: 'Multi-Device Sync',
        message: 'Access your POS from multiple devices. Perfect for businesses with multiple counters or staff.',
        suggestedPlan: 'business'
      }
    };

    const config = upgradeMessages[featureName] || {
      title: 'Upgrade Required',
      message: 'This feature requires a paid plan.',
      suggestedPlan: 'starter'
    };

    const suggestedPlanConfig = this.PLAN_CONFIGS[config.suggestedPlan];

    Alert.alert(
      config.title,
      config.message,
      [
        { text: 'Maybe Later', style: 'cancel' },
        {
          text: `Upgrade to ${suggestedPlanConfig.name} (₹${suggestedPlanConfig.price}/month)`,
          onPress: () => this.navigateToUpgrade(config.suggestedPlan)
        }
      ]
    );
  }

  // Navigate to upgrade screen
  navigateToUpgrade(suggestedPlan) {
    // TODO: Implement navigation to upgrade screen
    console.log('Navigate to upgrade:', suggestedPlan);
    Alert.alert(
      'Upgrade Coming Soon',
      'Subscription and upgrade functionality will be available in the next update. Stay tuned!'
    );
  }

  // Get available payment methods based on plan
  getAvailablePaymentMethods() {
    const methods = ['Cash']; // Always available

    if (this.canUseFeature('card_payments')) {
      methods.push('Card');
    }

    if (this.canUseFeature('upi_payments')) {
      methods.push('QR Pay');
    }

    return methods;
  }

  // Check if user can add more products
  async canAddProduct() {
    if (await this.hasReachedLimit('products')) {
      this.showUpgradePrompt('products');
      return false;
    }
    return true;
  }

  // Check if user can process more orders
  async canProcessOrder() {
    if (await this.hasReachedLimit('orders_per_month')) {
      this.showUpgradePrompt('orders_per_month');
      return false;
    }
    return true;
  }

  // Get plan information
  getPlanInfo() {
    return {
      currentPlan: this.userPlan,
      planName: this.PLAN_CONFIGS[this.userPlan]?.name || 'Free Plan',
      price: this.PLAN_CONFIGS[this.userPlan]?.price || 0,
      features: this.features,
      limits: this.limits
    };
  }

  // Get usage statistics
  async getUsageStats() {
    const stats = {};
    
    for (const limitName of Object.keys(this.limits)) {
      const limit = this.getLimit(limitName);
      const usage = await this.getCurrentUsage(limitName);
      
      stats[limitName] = {
        current: usage,
        limit: limit,
        percentage: limit === -1 ? 0 : Math.round((usage / limit) * 100),
        unlimited: limit === -1
      };
    }

    return stats;
  }

  // Simulate plan upgrade (for testing)
  async upgradePlan(newPlan) {
    if (this.PLAN_CONFIGS[newPlan]) {
      this.userPlan = newPlan;
      await AsyncStorage.setItem('userPlan', newPlan);
      this.updateFeatures();
      
      Alert.alert(
        'Plan Upgraded!',
        `You've been upgraded to ${this.PLAN_CONFIGS[newPlan].name}. Enjoy your new features!`
      );
    }
  }
}

// Create singleton instance
const featureService = new FeatureService();

export default featureService;