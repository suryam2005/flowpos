// FlowPOS Subscription Plans Configuration (Frontend)

export const SUBSCRIPTION_PLANS = {
  trial: {
    name: 'Free Trial',
    price: 0,
    currency: 'INR',
    billing: 'trial',
    duration: '7 days',
    description: 'Experience all core features before choosing a paid plan',
    features: {
      maxProducts: 10,
      maxTransactions: 50,
      maxLocations: 1,
      maxDevices: 1,
      inventoryTracking: true,
      basicReports: true,
      basicInvoice: true,
      basicAnalytics: true,
      cloudBackup: true,
      storageGB: 0.1, // 100 MB
      advancedReports: false,
      multiDeviceSync: false,
      prioritySupport: false,
      customBranding: false,
      integrations: {
        whatsapp: false,
        email_reports: false
      }
    },
    limits: {
      dailyTransactions: 10,
      monthlyTransactions: 50,
      trialDays: 7
    }
  },
  
  starter: {
    name: 'Starter Plan',
    price: 99,
    currency: 'INR',
    billing: 'monthly',
    description: 'Perfect for small businesses beginning their digital journey',
    features: {
      maxProducts: 50,
      maxTransactions: 100,
      maxLocations: 1,
      maxDevices: 1,
      inventoryTracking: true,
      basicReports: true,
      basicInvoice: true,
      basicAnalytics: true,
      dailyWeeklyAnalytics: true,
      cloudBackup: true,
      storageGB: 0.5, // 500 MB
      advancedReports: false,
      multiDeviceSync: false,
      prioritySupport: false,
      customBranding: false,
      integrations: {
        whatsapp: false,
        email_reports: false
      }
    },
    limits: {
      dailyTransactions: 100,
      monthlyTransactions: 100
    }
  },
  
  growth: {
    name: 'Growth Plan',
    price: 499,
    currency: 'INR',
    billing: 'monthly',
    description: 'Designed for growing businesses needing customization and deeper insights',
    features: {
      maxProducts: 500,
      maxTransactions: 2000,
      maxLocations: 1,
      maxDevices: 3,
      inventoryTracking: true,
      basicReports: true,
      basicInvoice: true,
      customBranding: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      dailyWeeklyAnalytics: true,
      cloudBackup: true,
      storageGB: 5, // 5 GB
      dataExport: true,
      multiDeviceSync: true,
      prioritySupport: false,
      integrations: {
        whatsapp: true,
        email_reports: true
      }
    },
    limits: {
      dailyTransactions: 200,
      monthlyTransactions: 2000
    }
  },
  
  enterprise: {
    name: 'Enterprise Plan',
    price: 999,
    currency: 'INR',
    billing: 'monthly',
    description: 'For high-volume stores requiring maximum scale and advanced reporting',
    features: {
      maxProducts: 'unlimited',
      maxTransactions: 'unlimited',
      maxLocations: 'unlimited',
      maxDevices: 10,
      inventoryTracking: true,
      basicReports: true,
      basicInvoice: true,
      customBranding: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      performanceInsights: true,
      pdfReports: true,
      dailyWeeklyAnalytics: true,
      monthlyReports: true,
      cloudBackup: true,
      storageGB: 50, // 50 GB
      dataExport: true,
      csvPdfExport: true,
      multiDeviceSync: true,
      prioritySupport: true,
      integrations: {
        whatsapp: true,
        email_reports: true
      }
    },
    limits: {
      dailyTransactions: 'unlimited',
      monthlyTransactions: 'unlimited'
    }
  }
};

// Helper function to get plan details
export const getPlanDetails = (planName) => {
  return SUBSCRIPTION_PLANS[planName] || SUBSCRIPTION_PLANS.trial;
};

// Helper function to check if user can perform action
export const canUserPerformAction = (userPlan, action, currentUsage = {}) => {
  const plan = getPlanDetails(userPlan);
  
  switch (action) {
    case 'add_product':
      return plan.features.maxProducts === 'unlimited' || 
             (currentUsage.products || 0) < plan.features.maxProducts;
             
    case 'create_transaction':
      return plan.features.maxTransactions === 'unlimited' || 
             (currentUsage.monthlyTransactions || 0) < plan.features.maxTransactions;
             
    case 'add_location':
      return plan.features.maxLocations === 'unlimited' || 
             (currentUsage.locations || 0) < plan.features.maxLocations;
             
    case 'add_device':
      return plan.features.maxDevices === 'unlimited' || 
             (currentUsage.devices || 0) < plan.features.devices;
             
    case 'view_advanced_reports':
      return plan.features.advancedReports;
      

      
    case 'multi_user':
      return plan.features.multiUser;
      
    default:
      return true;
  }
};

// Helper function to get plan comparison
export const getPlanComparison = () => {
  return Object.keys(SUBSCRIPTION_PLANS).map(key => ({
    id: key,
    ...SUBSCRIPTION_PLANS[key]
  }));
};