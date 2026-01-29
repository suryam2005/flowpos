/**
 * BusinessLogicMonitor - Monitoring and alerting for business logic bypasses
 * 
 * This service monitors critical business logic operations to ensure that
 * UI optimizations never bypass essential business rules, inventory validation,
 * order processing, or authentication checks.
 * 
 * Requirements: 8.3, 8.4, 8.5, 8.6, 8.7, 8.8 (API Contract Preservation)
 */

import uiPerformanceMonitor from './UIPerformanceMonitor';
import RollbackUtility from '../utils/RollbackUtility';

class BusinessLogicMonitor {
  constructor() {
    this.criticalOperations = {
      // Inventory operations that must always hit backend
      inventory: {
        stockValidation: { required: true, bypassed: 0, total: 0 },
        stockUpdate: { required: true, bypassed: 0, total: 0 },
        lowStockCheck: { required: true, bypassed: 0, total: 0 }
      },
      
      // Order operations that must always hit backend
      orders: {
        orderCreation: { required: true, bypassed: 0, total: 0 },
        orderValidation: { required: true, bypassed: 0, total: 0 },
        paymentProcessing: { required: true, bypassed: 0, total: 0 },
        inventoryDeduction: { required: true, bypassed: 0, total: 0 }
      },
      
      // Authentication operations that must always hit backend
      auth: {
        loginValidation: { required: true, bypassed: 0, total: 0 },
        tokenValidation: { required: true, bypassed: 0, total: 0 },
        sessionManagement: { required: true, bypassed: 0, total: 0 }
      },
      
      // API contract operations that must remain unchanged
      api: {
        endpointCalls: { required: true, bypassed: 0, total: 0 },
        payloadIntegrity: { required: true, bypassed: 0, total: 0 },
        responseHandling: { required: true, bypassed: 0, total: 0 }
      }
    };
    
    this.alertThresholds = {
      maxBypassRate: 0.01, // 1% maximum bypass rate
      maxConsecutiveBypasses: 3,
      maxBypassesPerMinute: 5,
      emergencyBypassCount: 10
    };
    
    this.recentBypasses = [];
    this.consecutiveBypasses = 0;
    this.isMonitoring = false;
    
    console.log('🛡️ [BusinessLogicMonitor] Initialized');
  }

  /**
   * Start business logic monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('🛡️ [BusinessLogicMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    console.log('🛡️ [BusinessLogicMonitor] Business logic monitoring started');
    
    // Set up periodic bypass rate checking
    this.setupPeriodicChecks();
  }

  /**
   * Stop business logic monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('🛡️ [BusinessLogicMonitor] Business logic monitoring stopped');
  }

  /**
   * Track a critical business logic operation
   * @param {string} category - Category of operation (inventory, orders, auth, api)
   * @param {string} operation - Specific operation name
   * @param {boolean} backendCalled - Whether backend was called
   * @param {Object} metadata - Additional metadata
   */
  trackOperation(category, operation, backendCalled, metadata = {}) {
    if (!this.isMonitoring) return;

    const operationConfig = this.criticalOperations[category]?.[operation];
    if (!operationConfig) {
      console.warn('🛡️ [BusinessLogicMonitor] Unknown operation:', { category, operation });
      return;
    }

    operationConfig.total++;

    if (operationConfig.required && !backendCalled) {
      // Critical bypass detected!
      operationConfig.bypassed++;
      this.consecutiveBypasses++;
      
      const bypassEvent = {
        category,
        operation,
        timestamp: Date.now(),
        metadata,
        severity: 'CRITICAL'
      };
      
      this.recentBypasses.push(bypassEvent);
      
      // Clean old bypasses (keep only last 5 minutes)
      this.cleanOldBypasses();
      
      // Alert about the bypass
      this.alertBusinessLogicBypass(bypassEvent);
      
      // Check if we need emergency action
      this.checkEmergencyThresholds();
      
    } else if (backendCalled) {
      // Reset consecutive bypass counter on successful backend call
      this.consecutiveBypasses = 0;
    }

    console.log('🛡️ [BusinessLogicMonitor] Operation tracked:', {
      category,
      operation,
      backendCalled,
      bypassed: operationConfig.bypassed,
      total: operationConfig.total,
      consecutiveBypasses: this.consecutiveBypasses
    });
  }

  /**
   * Track inventory validation operation
   * @param {string} productId - Product ID being validated
   * @param {number} requestedQuantity - Requested quantity
   * @param {boolean} backendValidated - Whether backend validation occurred
   * @param {Object} result - Validation result
   */
  trackInventoryValidation(productId, requestedQuantity, backendValidated, result = {}) {
    this.trackOperation('inventory', 'stockValidation', backendValidated, {
      productId,
      requestedQuantity,
      validationResult: result,
      timestamp: Date.now()
    });
  }

  /**
   * Track order creation operation
   * @param {string} orderId - Order ID
   * @param {Array} items - Order items
   * @param {boolean} backendProcessed - Whether backend processed the order
   * @param {Object} result - Processing result
   */
  trackOrderCreation(orderId, items, backendProcessed, result = {}) {
    this.trackOperation('orders', 'orderCreation', backendProcessed, {
      orderId,
      itemCount: items.length,
      totalValue: result.total,
      processingResult: result,
      timestamp: Date.now()
    });
  }

  /**
   * Track authentication operation
   * @param {string} userId - User ID
   * @param {string} authType - Type of authentication (login, token, session)
   * @param {boolean} backendValidated - Whether backend validated
   * @param {Object} result - Authentication result
   */
  trackAuthentication(userId, authType, backendValidated, result = {}) {
    const operationMap = {
      login: 'loginValidation',
      token: 'tokenValidation',
      session: 'sessionManagement'
    };

    const operation = operationMap[authType] || 'loginValidation';
    
    this.trackOperation('auth', operation, backendValidated, {
      userId,
      authType,
      authResult: result,
      timestamp: Date.now()
    });
  }

  /**
   * Track API contract compliance
   * @param {string} endpoint - API endpoint
   * @param {Object} payload - Request payload
   * @param {boolean} contractCompliant - Whether API contract was followed
   * @param {Object} response - API response
   */
  trackApiContract(endpoint, payload, contractCompliant, response = {}) {
    this.trackOperation('api', 'endpointCalls', contractCompliant, {
      endpoint,
      payloadSize: JSON.stringify(payload).length,
      responseStatus: response.status,
      responseSize: response.data ? JSON.stringify(response.data).length : 0,
      timestamp: Date.now()
    });
  }

  /**
   * Alert about business logic bypass
   * @param {Object} bypassEvent - Bypass event details
   */
  alertBusinessLogicBypass(bypassEvent) {
    const alertMessage = `CRITICAL: Business logic bypassed - ${bypassEvent.category}.${bypassEvent.operation}`;
    
    console.error('🚨 [BusinessLogicMonitor]', alertMessage, bypassEvent);
    
    // Record alert in performance monitor
    if (uiPerformanceMonitor) {
      uiPerformanceMonitor.recordBusinessLogicAlert('BUSINESS_LOGIC_BYPASS', {
        category: bypassEvent.category,
        operation: bypassEvent.operation,
        metadata: bypassEvent.metadata,
        consecutiveBypasses: this.consecutiveBypasses,
        recentBypassCount: this.recentBypasses.length
      });
    }
    
    // Send to external monitoring if configured
    this.sendExternalAlert(bypassEvent);
  }

  /**
   * Check emergency thresholds and trigger rollback if needed
   */
  async checkEmergencyThresholds() {
    const totalBypasses = this.recentBypasses.length;
    const bypassesPerMinute = this.recentBypasses.filter(
      bypass => Date.now() - bypass.timestamp < 60000
    ).length;

    // Check emergency conditions
    if (totalBypasses >= this.alertThresholds.emergencyBypassCount) {
      await this.triggerEmergencyRollback(`Too many business logic bypasses: ${totalBypasses}`);
    } else if (this.consecutiveBypasses >= this.alertThresholds.maxConsecutiveBypasses) {
      await this.triggerEmergencyRollback(`Too many consecutive bypasses: ${this.consecutiveBypasses}`);
    } else if (bypassesPerMinute >= this.alertThresholds.maxBypassesPerMinute) {
      await this.triggerEmergencyRollback(`Too many bypasses per minute: ${bypassesPerMinute}`);
    }
  }

  /**
   * Trigger emergency rollback due to business logic bypasses
   * @param {string} reason - Reason for emergency rollback
   */
  async triggerEmergencyRollback(reason) {
    console.error('🚨 [BusinessLogicMonitor] TRIGGERING EMERGENCY ROLLBACK:', reason);

    try {
      await RollbackUtility.enableRollback(`Emergency rollback: ${reason}`);
      
      // Record the emergency rollback
      if (uiPerformanceMonitor) {
        uiPerformanceMonitor.recordBusinessLogicAlert('EMERGENCY_ROLLBACK', {
          reason,
          totalBypasses: this.recentBypasses.length,
          consecutiveBypasses: this.consecutiveBypasses,
          timestamp: Date.now()
        });
      }

      console.error('🚨 [BusinessLogicMonitor] EMERGENCY ROLLBACK ACTIVATED');

    } catch (error) {
      console.error('🚨 [BusinessLogicMonitor] Error triggering emergency rollback:', error);
    }
  }

  /**
   * Clean old bypass events (keep only last 5 minutes)
   */
  cleanOldBypasses() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    this.recentBypasses = this.recentBypasses.filter(
      bypass => bypass.timestamp > fiveMinutesAgo
    );
  }

  /**
   * Set up periodic checks for bypass rates
   */
  setupPeriodicChecks() {
    // Check every minute
    this.checkInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.performPeriodicCheck();
      }
    }, 60 * 1000); // 1 minute
  }

  /**
   * Perform periodic bypass rate check
   */
  performPeriodicCheck() {
    const report = this.generateBypassReport();
    
    // Log periodic status
    console.log('🛡️ [BusinessLogicMonitor] Periodic Check:', {
      totalOperations: report.totalOperations,
      totalBypasses: report.totalBypasses,
      bypassRate: report.bypassRate,
      recentBypasses: report.recentBypasses,
      consecutiveBypasses: this.consecutiveBypasses
    });

    // Check if bypass rate is too high
    if (report.bypassRate > this.alertThresholds.maxBypassRate) {
      console.warn('⚠️ [BusinessLogicMonitor] High bypass rate detected:', {
        rate: report.bypassRate,
        threshold: this.alertThresholds.maxBypassRate
      });

      if (uiPerformanceMonitor) {
        uiPerformanceMonitor.recordBusinessLogicAlert('HIGH_BYPASS_RATE', {
          bypassRate: report.bypassRate,
          threshold: this.alertThresholds.maxBypassRate,
          totalBypasses: report.totalBypasses,
          totalOperations: report.totalOperations
        });
      }
    }
  }

  /**
   * Generate bypass report
   * @returns {Object} Bypass report
   */
  generateBypassReport() {
    let totalOperations = 0;
    let totalBypasses = 0;
    const categoryReports = {};

    // Calculate totals for each category
    for (const [category, operations] of Object.entries(this.criticalOperations)) {
      let categoryTotal = 0;
      let categoryBypasses = 0;

      for (const [operation, stats] of Object.entries(operations)) {
        categoryTotal += stats.total;
        categoryBypasses += stats.bypassed;
      }

      totalOperations += categoryTotal;
      totalBypasses += categoryBypasses;

      categoryReports[category] = {
        total: categoryTotal,
        bypassed: categoryBypasses,
        bypassRate: categoryTotal > 0 ? categoryBypasses / categoryTotal : 0
      };
    }

    const overallBypassRate = totalOperations > 0 ? totalBypasses / totalOperations : 0;

    return {
      timestamp: Date.now(),
      totalOperations,
      totalBypasses,
      bypassRate: overallBypassRate,
      recentBypasses: this.recentBypasses.length,
      consecutiveBypasses: this.consecutiveBypasses,
      categories: categoryReports,
      thresholds: this.alertThresholds,
      isHealthy: overallBypassRate <= this.alertThresholds.maxBypassRate &&
                 this.consecutiveBypasses < this.alertThresholds.maxConsecutiveBypasses
    };
  }

  /**
   * Send external alert (placeholder for external monitoring integration)
   * @param {Object} bypassEvent - Bypass event to alert about
   */
  sendExternalAlert(bypassEvent) {
    // Placeholder for external monitoring integration
    // Could integrate with services like Sentry, DataDog, etc.
    console.log('📡 [BusinessLogicMonitor] External alert would be sent:', bypassEvent);
  }

  /**
   * Get current monitoring status
   * @returns {Object} Current monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      report: this.generateBypassReport(),
      recentBypasses: this.recentBypasses.slice(-10), // Last 10 bypasses
      thresholds: this.alertThresholds
    };
  }

  /**
   * Reset monitoring statistics
   */
  resetStatistics() {
    console.log('🛡️ [BusinessLogicMonitor] Resetting statistics');

    for (const category of Object.values(this.criticalOperations)) {
      for (const operation of Object.values(category)) {
        operation.bypassed = 0;
        operation.total = 0;
      }
    }

    this.recentBypasses = [];
    this.consecutiveBypasses = 0;
  }

  /**
   * Update alert thresholds
   * @param {Object} newThresholds - New threshold values
   */
  updateThresholds(newThresholds) {
    console.log('🛡️ [BusinessLogicMonitor] Updating thresholds:', newThresholds);
    
    this.alertThresholds = {
      ...this.alertThresholds,
      ...newThresholds
    };
  }
}

// Create singleton instance
const businessLogicMonitor = new BusinessLogicMonitor();

export default businessLogicMonitor;