import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class FeatureService {
  constructor() {
    this.userPlan = 'trial'; // Default to trial plan
    this.features = {};
    this.limits = {};
    this.isInitialized = false;
  }

  // Plan configurations
  PLAN_CONFIGS = {
    trial: {
      features: {
        // Trial gets ALL enterprise features for the trial period
        cash_payments: true,
        upi_payments: true,
        basic_invoice: true,
        basic_analytics: true,
        advanced_analytics: true,
        performance_insights: true,
        pdf_reports: true,
        daily_weekly_analytics: true,
        monthly_reports: true,
        cloud_backup: true,
        whatsapp_integration: true,
        email_reports: true,
        data_export: true,
        csv_pdf_export: true,
        multi_device_sync: true,
        custom_branding: true,
      },
      limits: {
        products: -1, // unlimited during trial
        orders_per_month: -1, // unlimited during trial
        devices: 2, // Allow 2 devices during trial
        storage_gb: 5,
        trial_days: 7,
      },
      price: 0,
      name: 'Free Trial',
      description: 'Experience ALL features free for 7 days',
      duration: '7 days'
    },
    expired_trial: {
      features: {
        // Expired trial - very limited features to encourage upgrade
        cash_payments: true,
        upi_payments: true,
        basic_invoice: true,
        basic_analytics: false,
        advanced_analytics: false,
        performance_insights: false,
        pdf_reports: false,
        daily_weekly_analytics: false,
        monthly_reports: false,
        cloud_backup: false,
        whatsapp_integration: false,
        email_reports: false,
        data_export: false,
        csv_pdf_export: false,
        multi_device_sync: false,
        custom_branding: false,
      },
      limits: {
        products: 5, // Very limited
        orders_per_month: 10, // Very limited
        devices: 1,
        storage_gb: 0.05, // 50 MB
      },
      price: 0,
      name: 'Trial Expired',
      description: 'Your trial has expired. Upgrade to continue using FlowPOS.',
      isExpired: true
    },
    starter: {
      features: {
        cash_payments: true,
        upi_payments: true,
        basic_invoice: true,
        basic_analytics: true,
        daily_weekly_analytics: true,
        cloud_backup: true,
        multi_device_sync: false,
        advanced_analytics: false,
        custom_branding: false,
        whatsapp_integration: false,
        email_reports: false,
        data_export: false,
      },
      limits: {
        products: 50,
        orders_per_month: 100,
        devices: 1,
        storage_gb: 0.5,
      },
      price: 99,
      name: 'Starter Plan',
      description: 'Perfect for small businesses beginning their digital journey'
    },
    growth: {
      features: {
        cash_payments: true,
        upi_payments: true,
        basic_invoice: true,
        basic_analytics: true,
        advanced_analytics: true,
        daily_weekly_analytics: true,
        cloud_backup: true,
        whatsapp_integration: true,
        email_reports: true,
        data_export: true,
        multi_device_sync: true,
        custom_branding: true, // Store name in invoices implemented
      },
      limits: {
        products: 500,
        orders_per_month: 2000,
        devices: 3,
        storage_gb: 5,
      },
      price: 499,
      name: 'Growth Plan',
      description: 'Designed for growing businesses needing customization and deeper insights'
    },
    enterprise: {
      features: {
        cash_payments: true,
        upi_payments: true,
        basic_invoice: true,
        basic_analytics: true,
        advanced_analytics: true,
        performance_insights: true,
        pdf_reports: true,
        daily_weekly_analytics: true,
        cloud_backup: true,
        whatsapp_integration: true,
        email_reports: true,
        monthly_reports: true,
        data_export: true,
        csv_pdf_export: true,
        multi_device_sync: true,
        custom_branding: true,
      },
      limits: {
        products: -1, // unlimited
        orders_per_month: -1, // unlimited
        devices: 10,
        storage_gb: 50,
      },
      price: 999,
      name: 'Enterprise Plan',
      description: 'For high-volume stores requiring maximum scale and advanced reporting'
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

  // Load user plan from database via AuthContext
  async loadUserPlan() {
    try {
      // Import AuthContext dynamically to avoid circular dependency
      const { useAuth } = await import('../context/AuthContext');
      
      // Try to get from AsyncStorage first (for offline support)
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        if (userData.subscription_plan) {
          this.userPlan = userData.subscription_plan;
          await AsyncStorage.setItem('userPlan', this.userPlan);
        }
      }

      // If no plan found, default to trial
      if (!this.userPlan) {
        this.userPlan = 'trial';
        await AsyncStorage.setItem('userPlan', this.userPlan);
      }

      this.updateFeatures();
    } catch (error) {
      console.error('Error loading user plan:', error);
      this.userPlan = 'trial';
      this.updateFeatures();
    }
  }

  // Update features based on current plan
  updateFeatures() {
    const planConfig = this.PLAN_CONFIGS[this.userPlan] || this.PLAN_CONFIGS.trial;
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
          // Fetch real count from backend via ProductsService
          try {
            const productsService = require('./ProductsService').default;
            const products = await productsService.getProducts();
            console.log('📊 [FeatureService] Real products count:', products.length);
            return products.length;
          } catch (error) {
            console.error('Error fetching products count:', error);
            
            // Handle token expiration - don't fallback, let it bubble up
            if (error.message.includes('Session expired') || 
                error.message.includes('Invalid or expired token') ||
                error.message.includes('Authentication expired')) {
              throw error;
            }
            
            // For other errors, fallback to AsyncStorage
            const products = await AsyncStorage.getItem('products');
            return products ? JSON.parse(products).length : 0;
          }

        case 'orders_per_month':
          // Fetch real count from backend via OrdersService
          try {
            const ordersService = require('./OrdersService').default;
            const orders = await ordersService.getOrders();
            
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const thisMonthOrders = orders.filter(order => {
              const orderDate = new Date(order.timestamp || order.createdAt || order.created_at);
              return orderDate.getMonth() === currentMonth && 
                     orderDate.getFullYear() === currentYear;
            });
            
            console.log('📊 [FeatureService] Real orders this month:', thisMonthOrders.length);
            return thisMonthOrders.length;
          } catch (error) {
            console.error('Error fetching orders count:', error);
            
            // Handle token expiration - don't fallback, let it bubble up
            if (error.message.includes('Session expired') || 
                error.message.includes('Invalid or expired token') ||
                error.message.includes('Authentication expired')) {
              throw error;
            }
            
            // For other errors, fallback to AsyncStorage
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
          }

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
        suggestedPlan: this.userPlan === 'trial' ? 'starter' : this.userPlan === 'starter' ? 'growth' : 'enterprise'
      },
      orders_per_month: {
        title: 'Monthly Order Limit Reached',
        message: `You've processed ${this.getLimit('orders_per_month')} orders this month. Upgrade to handle more orders.`,
        suggestedPlan: this.userPlan === 'trial' ? 'starter' : this.userPlan === 'starter' ? 'growth' : 'enterprise'
      },

      daily_weekly_analytics: {
        title: 'Daily & Weekly Analytics',
        message: 'Track your business performance with detailed daily and weekly analytics. See trends, compare periods, and make data-driven decisions.',
        suggestedPlan: 'starter'
      },
      advanced_analytics: {
        title: 'Advanced Analytics',
        message: 'Get detailed insights into your sales, best-selling products, and customer behavior.',
        suggestedPlan: 'growth'
      },
      customizable_invoice: {
        title: 'Customizable Invoice',
        message: 'Create professional invoices with your business branding and custom fields.',
        suggestedPlan: 'growth'
      },
      whatsapp_integration: {
        title: 'WhatsApp Integration',
        message: 'Send invoices and updates directly to customers via WhatsApp.',
        suggestedPlan: 'growth'
      },
      email_reports: {
        title: 'Email Reports',
        message: 'Get automated weekly and monthly business reports via email.',
        suggestedPlan: 'growth'
      },
      data_export: {
        title: 'Data Export',
        message: 'Export your sales data in CSV format for analysis and accounting.',
        suggestedPlan: 'growth'
      },
      performance_insights: {
        title: 'Performance Insights',
        message: 'Get advanced performance insights with graphs and detailed analytics.',
        suggestedPlan: 'enterprise'
      },
      pdf_reports: {
        title: 'PDF Reports',
        message: 'Generate detailed PDF performance reports for your business.',
        suggestedPlan: 'enterprise'
      },
      multi_device_sync: {
        title: 'Multi-Device Access',
        message: 'Access your POS from multiple devices. Perfect for businesses with multiple counters or staff.',
        suggestedPlan: 'growth'
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

  // Update plan (called after successful backend upgrade)
  async upgradePlan(newPlan) {
    if (this.PLAN_CONFIGS[newPlan]) {
      this.userPlan = newPlan;
      await AsyncStorage.setItem('userPlan', newPlan);
      this.updateFeatures();
      console.log(`✅ FeatureService updated to plan: ${newPlan}`);
    }
  }
}

// Create singleton instance
const featureService = new FeatureService();

export default featureService;