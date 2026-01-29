import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUBSCRIPTION_PLANS } from '../config/subscriptionPlans';

class CloudStorageService {
  constructor() {
    this.STORAGE_KEYS = {
      USAGE: 'cloud_storage_usage',
      LAST_CALCULATED: 'storage_last_calculated',
      QUOTA_WARNINGS: 'quota_warnings_shown'
    };
  }

  /**
   * Calculate storage usage for all data types
   * @returns {Object} Storage usage breakdown in bytes
   */
  async calculateStorageUsage() {
    try {
      const storageData = {};
      let totalBytes = 0;

      // Get all stored data
      const [products, orders, storeInfo, invoices, reports, exports] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('orders'),
        AsyncStorage.getItem('storeInfo'),
        AsyncStorage.getItem('generated_invoices'),
        AsyncStorage.getItem('generated_reports'),
        AsyncStorage.getItem('exported_data')
      ]);

      // Calculate size for each data type (using string length as approximation)
      if (products) {
        const size = new TextEncoder().encode(products).length;
        storageData.products = { size, count: JSON.parse(products).length };
        totalBytes += size;
      }

      if (orders) {
        const size = new TextEncoder().encode(orders).length;
        storageData.orders = { size, count: JSON.parse(orders).length };
        totalBytes += size;
      }

      if (storeInfo) {
        const size = new TextEncoder().encode(storeInfo).length;
        storageData.storeInfo = { size };
        totalBytes += size;
      }

      if (invoices) {
        const size = new TextEncoder().encode(invoices).length;
        storageData.invoices = { size, count: JSON.parse(invoices).length };
        totalBytes += size;
      }

      if (reports) {
        const size = new TextEncoder().encode(reports).length;
        storageData.reports = { size, count: JSON.parse(reports).length };
        totalBytes += size;
      }

      if (exports) {
        const size = new TextEncoder().encode(exports).length;
        storageData.exports = { size, count: JSON.parse(exports).length };
        totalBytes += size;
      }

      // Store usage data
      const usageData = {
        totalBytes,
        totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
        totalGB: (totalBytes / (1024 * 1024 * 1024)).toFixed(3),
        breakdown: storageData,
        lastCalculated: new Date().toISOString()
      };

      await AsyncStorage.setItem(this.STORAGE_KEYS.USAGE, JSON.stringify(usageData));
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_CALCULATED, Date.now().toString());

      return usageData;
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return { totalBytes: 0, totalMB: '0.00', totalGB: '0.000', breakdown: {} };
    }
  }

  /**
   * Get current storage usage (cached or calculate if needed)
   * @param {boolean} forceRecalculate - Force recalculation
   * @returns {Object} Storage usage data
   */
  async getStorageUsage(forceRecalculate = false) {
    try {
      const lastCalculated = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_CALCULATED);
      const now = Date.now();
      
      // Recalculate if forced or if last calculation was more than 1 hour ago
      if (forceRecalculate || !lastCalculated || (now - parseInt(lastCalculated)) > 3600000) {
        return await this.calculateStorageUsage();
      }

      // Return cached data
      const cachedUsage = await AsyncStorage.getItem(this.STORAGE_KEYS.USAGE);
      return cachedUsage ? JSON.parse(cachedUsage) : await this.calculateStorageUsage();
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return await this.calculateStorageUsage();
    }
  }

  /**
   * Get storage quota for user's subscription plan
   * @param {string} planName - User's subscription plan
   * @returns {Object} Quota information
   */
  getStorageQuota(planName = 'trial') {
    const plan = SUBSCRIPTION_PLANS[planName] || SUBSCRIPTION_PLANS.trial;
    const quotaGB = plan.features.storageGB || 0.1;
    
    return {
      quotaGB,
      quotaMB: quotaGB * 1024,
      quotaBytes: quotaGB * 1024 * 1024 * 1024,
      planName: plan.name
    };
  }

  /**
   * Check if user is within storage quota
   * @param {string} planName - User's subscription plan
   * @param {Object} usage - Current usage data (optional)
   * @returns {Object} Quota status
   */
  async checkQuotaStatus(planName = 'trial', usage = null) {
    try {
      const currentUsage = usage || await this.getStorageUsage();
      const quota = this.getStorageQuota(planName);
      
      const usedPercentage = (currentUsage.totalBytes / quota.quotaBytes) * 100;
      const remainingBytes = quota.quotaBytes - currentUsage.totalBytes;
      const remainingMB = remainingBytes / (1024 * 1024);
      const remainingGB = remainingBytes / (1024 * 1024 * 1024);

      return {
        withinQuota: currentUsage.totalBytes <= quota.quotaBytes,
        usedPercentage: Math.min(usedPercentage, 100),
        usedBytes: currentUsage.totalBytes,
        usedMB: parseFloat(currentUsage.totalMB),
        usedGB: parseFloat(currentUsage.totalGB),
        quotaBytes: quota.quotaBytes,
        quotaMB: quota.quotaMB,
        quotaGB: quota.quotaGB,
        remainingBytes: Math.max(remainingBytes, 0),
        remainingMB: Math.max(remainingMB, 0),
        remainingGB: Math.max(remainingGB, 0),
        isNearLimit: usedPercentage >= 80,
        isOverLimit: usedPercentage >= 100,
        planName: quota.planName
      };
    } catch (error) {
      console.error('Error checking quota status:', error);
      return {
        withinQuota: true,
        usedPercentage: 0,
        usedBytes: 0,
        usedMB: 0,
        usedGB: 0,
        quotaBytes: 0,
        quotaMB: 0,
        quotaGB: 0,
        remainingBytes: 0,
        remainingMB: 0,
        remainingGB: 0,
        isNearLimit: false,
        isOverLimit: false,
        planName: 'Unknown'
      };
    }
  }

  /**
   * Check if user can store additional data
   * @param {string} planName - User's subscription plan
   * @param {number} additionalBytes - Bytes to be added
   * @returns {Object} Permission status
   */
  async canStoreAdditionalData(planName = 'trial', additionalBytes = 0) {
    try {
      const quotaStatus = await this.checkQuotaStatus(planName);
      const wouldExceed = (quotaStatus.usedBytes + additionalBytes) > quotaStatus.quotaBytes;
      
      return {
        canStore: !wouldExceed,
        wouldExceed,
        currentUsage: quotaStatus.usedBytes,
        additionalBytes,
        totalAfterAddition: quotaStatus.usedBytes + additionalBytes,
        quota: quotaStatus.quotaBytes,
        remainingSpace: quotaStatus.remainingBytes
      };
    } catch (error) {
      console.error('Error checking storage permission:', error);
      return { canStore: false, wouldExceed: true };
    }
  }

  /**
   * Get storage optimization suggestions
   * @param {Object} usage - Current usage data
   * @returns {Array} Optimization suggestions
   */
  getOptimizationSuggestions(usage) {
    const suggestions = [];
    
    if (usage.breakdown?.orders && usage.breakdown.orders.size > 1024 * 1024) { // > 1MB
      suggestions.push({
        type: 'orders',
        message: 'Consider archiving old orders to free up space',
        potentialSavings: `${(usage.breakdown.orders.size / (1024 * 1024)).toFixed(1)} MB`,
        action: 'archive_old_orders'
      });
    }

    if (usage.breakdown?.reports && usage.breakdown.reports.size > 512 * 1024) { // > 512KB
      suggestions.push({
        type: 'reports',
        message: 'Delete old generated reports to save space',
        potentialSavings: `${(usage.breakdown.reports.size / (1024 * 1024)).toFixed(1)} MB`,
        action: 'clear_old_reports'
      });
    }

    if (usage.breakdown?.exports && usage.breakdown.exports.size > 512 * 1024) { // > 512KB
      suggestions.push({
        type: 'exports',
        message: 'Clear old exported data files',
        potentialSavings: `${(usage.breakdown.exports.size / (1024 * 1024)).toFixed(1)} MB`,
        action: 'clear_exports'
      });
    }

    return suggestions;
  }

  /**
   * Clean up old data to free space
   * @param {string} type - Type of cleanup ('orders', 'reports', 'exports')
   * @param {number} daysOld - Remove data older than X days
   * @returns {Object} Cleanup result
   */
  async cleanupOldData(type, daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let cleaned = false;
      let freedBytes = 0;

      switch (type) {
        case 'orders':
          const orders = await AsyncStorage.getItem('orders');
          if (orders) {
            const orderList = JSON.parse(orders);
            const oldSize = new TextEncoder().encode(orders).length;
            const filteredOrders = orderList.filter(order => 
              new Date(order.timestamp) > cutoffDate
            );
            await AsyncStorage.setItem('orders', JSON.stringify(filteredOrders));
            const newSize = new TextEncoder().encode(JSON.stringify(filteredOrders)).length;
            freedBytes = oldSize - newSize;
            cleaned = true;
          }
          break;

        case 'reports':
          const reportsData = await AsyncStorage.getItem('generated_reports');
          if (reportsData) {
            freedBytes = new TextEncoder().encode(reportsData).length;
          }
          await AsyncStorage.removeItem('generated_reports');
          cleaned = true;
          break;

        case 'exports':
          const exportsData = await AsyncStorage.getItem('exported_data');
          if (exportsData) {
            freedBytes = new TextEncoder().encode(exportsData).length;
          }
          await AsyncStorage.removeItem('exported_data');
          cleaned = true;
          break;
      }

      // Recalculate usage after cleanup
      if (cleaned) {
        await this.calculateStorageUsage();
      }

      return {
        success: cleaned,
        freedBytes,
        freedMB: (freedBytes / (1024 * 1024)).toFixed(2),
        type
      };
    } catch (error) {
      console.error('Error cleaning up data:', error);
      return { success: false, freedBytes: 0, freedMB: '0.00', type };
    }
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get storage usage summary for display
   * @param {string} planName - User's subscription plan
   * @returns {Object} Display-ready storage summary
   */
  async getStorageSummary(planName = 'trial') {
    try {
      const usage = await this.getStorageUsage();
      const quotaStatus = await this.checkQuotaStatus(planName, usage);
      const suggestions = this.getOptimizationSuggestions(usage);

      return {
        usage: {
          used: this.formatBytes(quotaStatus.usedBytes),
          quota: this.formatBytes(quotaStatus.quotaBytes),
          remaining: this.formatBytes(quotaStatus.remainingBytes),
          percentage: quotaStatus.usedPercentage.toFixed(1)
        },
        status: {
          withinQuota: quotaStatus.withinQuota,
          isNearLimit: quotaStatus.isNearLimit,
          isOverLimit: quotaStatus.isOverLimit
        },
        breakdown: usage.breakdown,
        suggestions,
        planName: quotaStatus.planName,
        lastCalculated: usage.lastCalculated
      };
    } catch (error) {
      console.error('Error getting storage summary:', error);
      return null;
    }
  }
}

export default new CloudStorageService();