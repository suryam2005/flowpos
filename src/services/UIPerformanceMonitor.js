/**
 * UIPerformanceMonitor - Performance metrics collection for UI optimizations
 * 
 * This service collects and tracks performance metrics related to UI optimizations
 * including API call reduction, cache hit rates, and business logic bypass detection.
 * 
 * Requirements: All (Performance monitoring and alerting)
 */

import uiOptimizationConfig from './UIOptimizationConfig';

class UIPerformanceMonitor {
  constructor() {
    this.metrics = {
      // API call tracking
      apiCalls: {
        total: 0,
        cached: 0,
        direct: 0,
        failed: 0
      },
      
      // Cache performance
      cache: {
        hits: 0,
        misses: 0,
        invalidations: 0,
        size: 0
      },
      
      // UI propagation tracking
      uiUpdates: {
        propagated: 0,
        failed: 0,
        screens: new Set()
      },
      
      // Business logic bypass alerts
      businessLogicAlerts: [],
      
      // Performance timings
      timings: {
        screenLoads: [],
        apiResponses: [],
        cacheOperations: []
      },
      
      // Session tracking
      session: {
        startTime: Date.now(),
        optimizationsEnabled: true,
        rollbackEvents: []
      }
    };
    
    this.alertThresholds = {
      maxBusinessLogicAlerts: 5,
      maxFailedApiCalls: 10,
      minCacheHitRate: 0.3, // 30% minimum cache hit rate
      maxScreenLoadTime: 3000 // 3 seconds
    };
    
    this.isMonitoring = false;
    console.log('📊 [UIPerformanceMonitor] Initialized');
  }

  /**
   * Start performance monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('📊 [UIPerformanceMonitor] Already monitoring');
      return;
    }

    try {
      // Initialize config if needed
      if (!uiOptimizationConfig.isInitialized) {
        await uiOptimizationConfig.initialize();
      }

      this.isMonitoring = true;
      this.metrics.session.startTime = Date.now();
      this.metrics.session.optimizationsEnabled = !uiOptimizationConfig.isRollbackMode();
      
      console.log('📊 [UIPerformanceMonitor] Monitoring started', {
        optimizationsEnabled: this.metrics.session.optimizationsEnabled,
        rollbackMode: uiOptimizationConfig.isRollbackMode()
      });

      // Set up periodic reporting
      this.setupPeriodicReporting();

    } catch (error) {
      console.error('📊 [UIPerformanceMonitor] Error starting monitoring:', error);
    }
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }

    console.log('📊 [UIPerformanceMonitor] Monitoring stopped');
  }

  /**
   * Track API call metrics
   * @param {string} type - 'cached', 'direct', 'failed'
   * @param {string} endpoint - API endpoint called
   * @param {number} responseTime - Response time in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  trackApiCall(type, endpoint, responseTime = 0, metadata = {}) {
    if (!this.isMonitoring) return;

    this.metrics.apiCalls.total++;
    this.metrics.apiCalls[type]++;

    // Track response time
    if (responseTime > 0) {
      this.metrics.timings.apiResponses.push({
        endpoint,
        responseTime,
        timestamp: Date.now(),
        type,
        metadata
      });
    }

    // Check for business logic bypass alerts
    if (metadata.bypassedBusinessLogic) {
      this.recordBusinessLogicAlert('API_BYPASS', {
        endpoint,
        type,
        metadata,
        timestamp: Date.now()
      });
    }

    console.log('📊 [UIPerformanceMonitor] API call tracked:', {
      type,
      endpoint,
      responseTime,
      total: this.metrics.apiCalls.total
    });
  }

  /**
   * Track cache performance
   * @param {string} operation - 'hit', 'miss', 'invalidation', 'size_update'
   * @param {string} cacheType - Type of cache (products, analytics, etc.)
   * @param {Object} metadata - Additional metadata
   */
  trackCacheOperation(operation, cacheType, metadata = {}) {
    if (!this.isMonitoring) return;

    switch (operation) {
      case 'hit':
        this.metrics.cache.hits++;
        break;
      case 'miss':
        this.metrics.cache.misses++;
        break;
      case 'invalidation':
        this.metrics.cache.invalidations++;
        break;
      case 'size_update':
        this.metrics.cache.size = metadata.size || 0;
        break;
    }

    // Track timing for cache operations
    if (metadata.operationTime) {
      this.metrics.timings.cacheOperations.push({
        operation,
        cacheType,
        operationTime: metadata.operationTime,
        timestamp: Date.now(),
        metadata
      });
    }

    console.log('📊 [UIPerformanceMonitor] Cache operation tracked:', {
      operation,
      cacheType,
      hits: this.metrics.cache.hits,
      misses: this.metrics.cache.misses
    });
  }

  /**
   * Track UI update propagation
   * @param {string} screenName - Name of screen being updated
   * @param {boolean} success - Whether update was successful
   * @param {Object} metadata - Additional metadata
   */
  trackUIUpdate(screenName, success, metadata = {}) {
    if (!this.isMonitoring) return;

    if (success) {
      this.metrics.uiUpdates.propagated++;
      this.metrics.uiUpdates.screens.add(screenName);
    } else {
      this.metrics.uiUpdates.failed++;
    }

    console.log('📊 [UIPerformanceMonitor] UI update tracked:', {
      screenName,
      success,
      propagated: this.metrics.uiUpdates.propagated,
      failed: this.metrics.uiUpdates.failed
    });
  }

  /**
   * Track screen load performance
   * @param {string} screenName - Name of screen
   * @param {number} loadTime - Load time in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  trackScreenLoad(screenName, loadTime, metadata = {}) {
    if (!this.isMonitoring) return;

    this.metrics.timings.screenLoads.push({
      screenName,
      loadTime,
      timestamp: Date.now(),
      metadata
    });

    // Check for performance alerts
    if (loadTime > this.alertThresholds.maxScreenLoadTime) {
      this.recordBusinessLogicAlert('SLOW_SCREEN_LOAD', {
        screenName,
        loadTime,
        threshold: this.alertThresholds.maxScreenLoadTime,
        timestamp: Date.now()
      });
    }

    console.log('📊 [UIPerformanceMonitor] Screen load tracked:', {
      screenName,
      loadTime,
      threshold: this.alertThresholds.maxScreenLoadTime
    });
  }

  /**
   * Record business logic bypass alert
   * @param {string} alertType - Type of alert
   * @param {Object} details - Alert details
   */
  recordBusinessLogicAlert(alertType, details) {
    const alert = {
      id: `${alertType}_${Date.now()}`,
      type: alertType,
      details,
      timestamp: Date.now(),
      severity: this.getAlertSeverity(alertType)
    };

    this.metrics.businessLogicAlerts.push(alert);

    // Log critical alerts immediately
    if (alert.severity === 'CRITICAL') {
      console.error('🚨 [UIPerformanceMonitor] CRITICAL BUSINESS LOGIC ALERT:', alert);
    } else {
      console.warn('⚠️ [UIPerformanceMonitor] Business logic alert:', alert);
    }

    // Check if we've exceeded alert thresholds
    if (this.metrics.businessLogicAlerts.length > this.alertThresholds.maxBusinessLogicAlerts) {
      this.triggerEmergencyRollback('Too many business logic alerts');
    }
  }

  /**
   * Get alert severity level
   * @param {string} alertType - Type of alert
   * @returns {string} Severity level
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      'API_BYPASS': 'CRITICAL',
      'INVENTORY_BYPASS': 'CRITICAL',
      'ORDER_BYPASS': 'CRITICAL',
      'AUTH_BYPASS': 'CRITICAL',
      'SLOW_SCREEN_LOAD': 'WARNING',
      'CACHE_CORRUPTION': 'ERROR',
      'UI_UPDATE_FAILED': 'WARNING'
    };

    return severityMap[alertType] || 'INFO';
  }

  /**
   * Trigger emergency rollback due to critical issues
   * @param {string} reason - Reason for emergency rollback
   */
  async triggerEmergencyRollback(reason) {
    console.error('🚨 [UIPerformanceMonitor] TRIGGERING EMERGENCY ROLLBACK:', reason);

    try {
      // Record rollback event
      this.metrics.session.rollbackEvents.push({
        reason,
        timestamp: Date.now(),
        automatic: true,
        alertCount: this.metrics.businessLogicAlerts.length
      });

      // Enable rollback mode
      await uiOptimizationConfig.enableRollback(`Emergency rollback: ${reason}`);

      console.error('🚨 [UIPerformanceMonitor] EMERGENCY ROLLBACK ACTIVATED');

    } catch (error) {
      console.error('🚨 [UIPerformanceMonitor] Error triggering emergency rollback:', error);
    }
  }

  /**
   * Get current performance metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    const cacheHitRate = this.metrics.cache.hits + this.metrics.cache.misses > 0 
      ? this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses)
      : 0;

    const apiCallReduction = this.metrics.apiCalls.total > 0
      ? this.metrics.apiCalls.cached / this.metrics.apiCalls.total
      : 0;

    return {
      ...this.metrics,
      calculated: {
        cacheHitRate,
        apiCallReduction,
        averageScreenLoadTime: this.calculateAverageScreenLoadTime(),
        averageApiResponseTime: this.calculateAverageApiResponseTime(),
        sessionDuration: Date.now() - this.metrics.session.startTime,
        alertRate: this.metrics.businessLogicAlerts.length / Math.max(1, (Date.now() - this.metrics.session.startTime) / 60000) // alerts per minute
      }
    };
  }

  /**
   * Calculate average screen load time
   * @returns {number} Average load time in milliseconds
   */
  calculateAverageScreenLoadTime() {
    if (this.metrics.timings.screenLoads.length === 0) return 0;

    const total = this.metrics.timings.screenLoads.reduce((sum, load) => sum + load.loadTime, 0);
    return total / this.metrics.timings.screenLoads.length;
  }

  /**
   * Calculate average API response time
   * @returns {number} Average response time in milliseconds
   */
  calculateAverageApiResponseTime() {
    if (this.metrics.timings.apiResponses.length === 0) return 0;

    const total = this.metrics.timings.apiResponses.reduce((sum, response) => sum + response.responseTime, 0);
    return total / this.metrics.timings.apiResponses.length;
  }

  /**
   * Generate performance report
   * @returns {Object} Comprehensive performance report
   */
  generateReport() {
    const metrics = this.getMetrics();
    const now = Date.now();

    return {
      timestamp: now,
      sessionDuration: now - this.metrics.session.startTime,
      optimizationsEnabled: this.metrics.session.optimizationsEnabled,
      rollbackMode: uiOptimizationConfig.isRollbackMode(),
      
      performance: {
        apiCallReduction: `${(metrics.calculated.apiCallReduction * 100).toFixed(1)}%`,
        cacheHitRate: `${(metrics.calculated.cacheHitRate * 100).toFixed(1)}%`,
        averageScreenLoadTime: `${metrics.calculated.averageScreenLoadTime.toFixed(0)}ms`,
        averageApiResponseTime: `${metrics.calculated.averageApiResponseTime.toFixed(0)}ms`
      },
      
      counts: {
        totalApiCalls: metrics.apiCalls.total,
        cachedApiCalls: metrics.apiCalls.cached,
        directApiCalls: metrics.apiCalls.direct,
        failedApiCalls: metrics.apiCalls.failed,
        cacheHits: metrics.cache.hits,
        cacheMisses: metrics.cache.misses,
        uiUpdatesPropagated: metrics.uiUpdates.propagated,
        uiUpdatesFailed: metrics.uiUpdates.failed,
        businessLogicAlerts: metrics.businessLogicAlerts.length
      },
      
      alerts: {
        total: metrics.businessLogicAlerts.length,
        critical: metrics.businessLogicAlerts.filter(a => a.severity === 'CRITICAL').length,
        warnings: metrics.businessLogicAlerts.filter(a => a.severity === 'WARNING').length,
        recent: metrics.businessLogicAlerts.filter(a => now - a.timestamp < 300000) // last 5 minutes
      },
      
      health: {
        cacheHitRateHealthy: metrics.calculated.cacheHitRate >= this.alertThresholds.minCacheHitRate,
        apiFailureRateHealthy: metrics.apiCalls.failed <= this.alertThresholds.maxFailedApiCalls,
        alertRateHealthy: metrics.calculated.alertRate < 1, // less than 1 alert per minute
        screenLoadHealthy: metrics.calculated.averageScreenLoadTime <= this.alertThresholds.maxScreenLoadTime
      }
    };
  }

  /**
   * Set up periodic reporting
   */
  setupPeriodicReporting() {
    // Report every 5 minutes
    this.reportingInterval = setInterval(() => {
      if (this.isMonitoring) {
        const report = this.generateReport();
        console.log('📊 [UIPerformanceMonitor] Periodic Report:', {
          apiCallReduction: report.performance.apiCallReduction,
          cacheHitRate: report.performance.cacheHitRate,
          alerts: report.alerts.total,
          health: report.health
        });

        // Check health thresholds
        this.checkHealthThresholds(report);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Check health thresholds and trigger alerts if needed
   * @param {Object} report - Performance report
   */
  checkHealthThresholds(report) {
    // Check cache hit rate
    if (!report.health.cacheHitRateHealthy) {
      this.recordBusinessLogicAlert('LOW_CACHE_HIT_RATE', {
        currentRate: report.performance.cacheHitRate,
        threshold: `${(this.alertThresholds.minCacheHitRate * 100).toFixed(1)}%`,
        timestamp: Date.now()
      });
    }

    // Check API failure rate
    if (!report.health.apiFailureRateHealthy) {
      this.recordBusinessLogicAlert('HIGH_API_FAILURE_RATE', {
        failedCalls: report.counts.failedApiCalls,
        threshold: this.alertThresholds.maxFailedApiCalls,
        timestamp: Date.now()
      });
    }

    // Check screen load performance
    if (!report.health.screenLoadHealthy) {
      this.recordBusinessLogicAlert('SLOW_SCREEN_PERFORMANCE', {
        averageLoadTime: report.performance.averageScreenLoadTime,
        threshold: `${this.alertThresholds.maxScreenLoadTime}ms`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Reset metrics (useful for testing or new sessions)
   */
  resetMetrics() {
    console.log('📊 [UIPerformanceMonitor] Resetting metrics');

    this.metrics = {
      apiCalls: { total: 0, cached: 0, direct: 0, failed: 0 },
      cache: { hits: 0, misses: 0, invalidations: 0, size: 0 },
      uiUpdates: { propagated: 0, failed: 0, screens: new Set() },
      businessLogicAlerts: [],
      timings: { screenLoads: [], apiResponses: [], cacheOperations: [] },
      session: {
        startTime: Date.now(),
        optimizationsEnabled: !uiOptimizationConfig.isRollbackMode(),
        rollbackEvents: []
      }
    };
  }

  /**
   * Export metrics for external analysis
   * @returns {Object} Exportable metrics data
   */
  exportMetrics() {
    return {
      ...this.getMetrics(),
      exportTimestamp: Date.now(),
      configVersion: uiOptimizationConfig.getConfiguration().configVersion
    };
  }
}

// Create singleton instance
const uiPerformanceMonitor = new UIPerformanceMonitor();

export default uiPerformanceMonitor;