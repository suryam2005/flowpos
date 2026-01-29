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
        // Trial gets ALL features for the trial period
        cash_payments: true,
        upi_payments: true,
        basic_invoice: true,
        customizable_invoice: true,
        basic_analytics: true,
        advanced_analytics: true,
        performance_insights: true,
        pdf_reports: true,
        monthly_reports: true,
        whatsapp_integration: true,
        multi_device_sync: true,
        csv_exports: true,
      },
      limits: {
        products: -1, // unlimited during trial
        orders_per_month: -1, // unlimited during trial
        devices: -1, // unlimited during trial
        storage_mb: -1, // unlimited during trial
        trial_days: 7,
      },
      price: 0,
      name: 'Free Trial',
      description: 'Experience ALL features free for 7 days',
      duration: '7 days'
    },
    starter: {
      features: {
        cash_payments: true,
        upi_payments: true,
        basic_invoice: true,
        customizable_invoice: false,
        basic_analytics: true,
        advanced_analytics: false,
        performance_insights: false,
        pdf_reports: false,
        monthly_reports: false,
        whatsapp_integration: false,
        multi_device_sync: false,
        csv_exports: false,
      },
      limits: {
        products: 50,
        orders_per_month: 100,
        devices: 1,
        storage_mb: 500, // 500 MB
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
        customizable_invoice: true,
        basic_analytics: true,
        advanced_analytics: true,
        performance_insights: true,
        pdf_reports: true,
        monthly_reports: true,
        whatsapp_integration: true,
        multi_device_sync: true,
        csv_exports: true,
      },
      limits: {
        products: 500,
        orders_per_month: 2000,
        devices: 3,
        storage_mb: 5000, // 5 GB = 5000 MB
      },
      price: 299,
      name: 'Growth Plan',
      description: 'Scale your business with advanced features and integrations'
    },
    enterprise: {
      features: {
        cash_payments: true,
        upi_payments: true,
        basic_invoice: true,
        customizable_invoice: true,
        basic_analytics: true,
        advanced_analytics: true,
        performance_insights: true,
        pdf_reports: true,
        monthly_reports: true,
        whatsapp_integration: true,
        multi_device_sync: true,
        csv_exports: true,
      },
      limits: {
        products: -1, // unlimited
        orders_per_month: -1, // unlimited
        devices: 10,
        storage_mb: 51200, // 50 GB = 51200 MB
      },
      price: 999,
      name: 'Enterprise Plan',
      description: 'Complete business solution with unlimited access and premium support'
    }
  };

  // Initialize feature service
  async initialize() {
    try {
      await this.loadUserPlan();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing FeatureService:', error);
      // Fallback to trial plan
      this.userPlan = 'trial';
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
      // Even if not initialized, default trial to true if userPlan is trial
      if (this.userPlan === 'trial' || this.userPlan === 'enterprise') return true;
      return false;
    }

    // Explicitly allow all features for trial and enterprise
    if (this.userPlan === 'trial' || this.userPlan === 'enterprise') {
      return true;
    }

    return this.features[featureName] === true;
  }

  // Check if user can login from a new device (enforce session limit)
  async canLoginFromDevice() {
    try {
      const limit = this.getLimit('devices');
      if (limit === -1) return true; // Unlimited devices

      // Get current active sessions
      const activeSessions = await this.getCurrentUsage('devices');

      // If active sessions exceed the limit, return false
      const canLogin = activeSessions <= limit;
      
      console.log(`📱 [FeatureService] Device limit check: ${activeSessions}/${limit} devices, canLogin: ${canLogin}`);
      
      return canLogin;
    } catch (error) {
      console.error('❌ [FeatureService] Device limit check failed:', error);
      
      // CRITICAL FIX: Don't fail login due to device limit check errors
      // This is especially important during development when backend might be unreachable
      console.warn('⚠️ [FeatureService] Allowing login due to device limit check failure');
      return true; // Allow login when check fails
    }
  }

  // Check if user has enough storage space
  async canUploadFile(fileSizeMB) {
    const limit = this.getLimit('storage_mb');
    if (limit === -1) return true; // Unlimited

    const currentUsage = await this.getCurrentUsage('storage_mb');
    return (currentUsage + fileSizeMB) <= limit;
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
          // Fetch real device count from backend
          try {
            const { apiCallWithFallback } = require('../config/apiConfig');
            const token = await AsyncStorage.getItem('accessToken');

            if (!token) {
              console.warn('[FeatureService] No auth token for device count');
              return 1; // Fallback to 1 if no token
            }

            console.log('📱 [FeatureService] Fetching device sessions from backend...');
            
            const response = await apiCallWithFallback('/devices/sessions', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              const activeDevices = data.sessions ? data.sessions.length : 1;
              console.log('📱 [FeatureService] Real active devices count:', activeDevices);
              return activeDevices;
            } else {
              console.error('[FeatureService] Failed to fetch device sessions, status:', response.status);
              
              // Try to get error details
              try {
                const errorData = await response.json();
                console.error('[FeatureService] Device sessions error:', errorData);
              } catch (e) {
                console.error('[FeatureService] Could not parse error response');
              }
              
              return 1; // Fallback
            }
          } catch (error) {
            console.error('[FeatureService] Error fetching device count:', error);

            // Handle token expiration - don't fallback, let it bubble up
            if (error.message.includes('Session expired') ||
              error.message.includes('Invalid or expired token') ||
              error.message.includes('Authentication expired')) {
              throw error;
            }

            // Handle network errors gracefully
            if (error.message.includes('Cannot connect to backend server') ||
                error.message.includes('Network request failed') ||
                error.message.includes('All API endpoints failed')) {
              console.warn('[FeatureService] Network error during device count fetch, using fallback');
              return 1; // Fallback for network errors
            }

            return 1; // Fallback for other errors
          }

        case 'storage_mb':
          // Fetch real storage usage from CloudStorageService
          try {
            const CloudStorageService = require('./CloudStorageService').default;
            const usage = await CloudStorageService.getStorageUsage();
            console.log('💾 [FeatureService] Real storage usage (MB):', usage.totalSizeMB);
            return usage.totalSizeMB || 0;
          } catch (error) {
            console.error('[FeatureService] Error fetching storage usage:', error);
            return 0;
          }

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
      storage_mb: {
        title: 'Storage Limit Reached',
        message: `You've used ${this.getLimit('storage_mb')} MB of storage. Upgrade to get more storage space.`,
        suggestedPlan: this.userPlan === 'trial' ? 'starter' : this.userPlan === 'starter' ? 'growth' : 'enterprise'
      },
      devices: {
        title: 'Device Limit Reached',
        message: `You've reached your device limit. Upgrade to access from multiple devices.`,
        suggestedPlan: this.userPlan === 'starter' ? 'growth' : 'enterprise'
      },

      basic_analytics: {
        title: 'Basic Analytics',
        message: 'Track your daily business performance with basic analytics.',
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
      monthly_reports: {
        title: 'Monthly Email Reports',
        message: 'Get automated monthly business reports via email.',
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
        suggestedPlan: 'growth'
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
    // Navigate to subscription screen with suggested plan
    console.log('[FeatureService] Navigating to upgrade:', suggestedPlan);

    // Show alert to navigate manually since navigationRef is not available
    Alert.alert(
      'Upgrade Required',
      `Please navigate to Settings > Subscription to upgrade to ${this.PLAN_CONFIGS[suggestedPlan]?.name || 'a higher plan'}.`
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

  // Check if user can upload more files
  async canUploadFile(fileSizeMB) {
    const currentUsage = await this.getCurrentUsage('storage_mb');
    const limit = this.getLimit('storage_mb');

    if (limit === -1) return true; // unlimited

    if (currentUsage + fileSizeMB > limit) {
      this.showUpgradePrompt('storage_mb');
      return false;
    }
    return true;
  }

  // Check if user can login from new device
  async canLoginFromDevice() {
    if (await this.hasReachedLimit('devices')) {
      this.showUpgradePrompt('devices');
      return false;
    }
    return true;
  }

  // Get plan information
  getPlanInfo() {
    return {
      currentPlan: this.userPlan,
      planName: this.PLAN_CONFIGS[this.userPlan]?.name || 'Trial Plan',
      price: this.PLAN_CONFIGS[this.userPlan]?.price || 0,
      features: this.features,
      limits: this.limits
    };
  }

  // Get usage statistics
  async getUsageStats() {
    const stats = {};

    for (const limitName of Object.keys(this.limits)) {
      if (limitName === 'trial_days') continue; // Skip trial_days

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