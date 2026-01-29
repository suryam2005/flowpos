/**
 * MonitoringDashboard - Comprehensive monitoring dashboard for UI optimizations
 * 
 * This utility provides a centralized dashboard for monitoring performance metrics,
 * business logic compliance, and system health related to UI optimizations.
 * 
 * Requirements: All (Performance monitoring and documentation)
 */

import uiPerformanceMonitor from '../services/UIPerformanceMonitor';
import businessLogicMonitor from '../services/BusinessLogicMonitor';
import uiOptimizationConfig from '../services/UIOptimizationConfig';
import RollbackUtility from './RollbackUtility';

class MonitoringDashboard {
  constructor() {
    this.isInitialized = false;
    console.log('📊 [MonitoringDashboard] Initialized');
  }

  /**
   * Initialize the monitoring dashboard
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('📊 [MonitoringDashboard] Already initialized');
      return;
    }

    try {
      // Initialize all monitoring services
      await uiOptimizationConfig.initialize();
      await uiPerformanceMonitor.startMonitoring();
      businessLogicMonitor.startMonitoring();

      this.isInitialized = true;
      console.log('📊 [MonitoringDashboard] Initialization complete');

    } catch (error) {
      console.error('📊 [MonitoringDashboard] Error during initialization:', error);
    }
  }

  /**
   * Get comprehensive system status
   * @returns {Object} Complete system status
   */
  async getSystemStatus() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const [
        rollbackStatus,
        performanceMetrics,
        businessLogicStatus,
        configStatus
      ] = await Promise.all([
        RollbackUtility.getRollbackStatus(),
        Promise.resolve(uiPerformanceMonitor.getMetrics()),
        Promise.resolve(businessLogicMonitor.getStatus()),
        Promise.resolve(uiOptimizationConfig.getConfiguration())
      ]);

      return {
        timestamp: Date.now(),
        systemHealth: this.calculateSystemHealth(performanceMetrics, businessLogicStatus),
        rollback: rollbackStatus.success ? {
          isActive: rollbackStatus.rollbackMode,
          reason: rollbackStatus.rollbackReason,
          timestamp: rollbackStatus.rollbackTimestamp,
          age: rollbackStatus.rollbackAge
        } : { error: rollbackStatus.error },
        performance: {
          apiCallReduction: performanceMetrics.calculated?.apiCallReduction || 0,
          cacheHitRate: performanceMetrics.calculated?.cacheHitRate || 0,
          averageScreenLoadTime: performanceMetrics.calculated?.averageScreenLoadTime || 0,
          averageApiResponseTime: performanceMetrics.calculated?.averageApiResponseTime || 0,
          sessionDuration: performanceMetrics.calculated?.sessionDuration || 0
        },
        businessLogic: {
          isHealthy: businessLogicStatus.report?.isHealthy || false,
          totalOperations: businessLogicStatus.report?.totalOperations || 0,
          totalBypasses: businessLogicStatus.report?.totalBypasses || 0,
          bypassRate: businessLogicStatus.report?.bypassRate || 0,
          consecutiveBypasses: businessLogicStatus.report?.consecutiveBypasses || 0,
          recentBypasses: businessLogicStatus.recentBypasses?.length || 0
        },
        configuration: {
          sessionCaching: configStatus.sessionCachingEnabled,
          uiPropagation: configStatus.uiPropagationEnabled,
          computationReuse: configStatus.computationReuseEnabled,
          serviceStatusOptimization: configStatus.serviceStatusOptimizationEnabled,
          debugMode: configStatus.debugMode,
          configVersion: configStatus.configVersion
        },
        alerts: this.getActiveAlerts(performanceMetrics, businessLogicStatus)
      };

    } catch (error) {
      console.error('📊 [MonitoringDashboard] Error getting system status:', error);
      return {
        timestamp: Date.now(),
        error: error.message,
        systemHealth: 'ERROR'
      };
    }
  }

  /**
   * Calculate overall system health
   * @param {Object} performanceMetrics - Performance metrics
   * @param {Object} businessLogicStatus - Business logic status
   * @returns {string} Health status
   */
  calculateSystemHealth(performanceMetrics, businessLogicStatus) {
    const healthChecks = {
      rollbackMode: !uiOptimizationConfig.isRollbackMode(),
      businessLogicHealthy: businessLogicStatus.report?.isHealthy !== false,
      lowAlertCount: (performanceMetrics.businessLogicAlerts?.length || 0) < 5,
      goodCacheHitRate: (performanceMetrics.calculated?.cacheHitRate || 0) > 0.3,
      reasonableScreenLoadTime: (performanceMetrics.calculated?.averageScreenLoadTime || 0) < 3000
    };

    const healthyChecks = Object.values(healthChecks).filter(Boolean).length;
    const totalChecks = Object.keys(healthChecks).length;
    const healthPercentage = healthyChecks / totalChecks;

    if (healthPercentage >= 0.9) return 'EXCELLENT';
    if (healthPercentage >= 0.7) return 'GOOD';
    if (healthPercentage >= 0.5) return 'WARNING';
    return 'CRITICAL';
  }

  /**
   * Get active alerts
   * @param {Object} performanceMetrics - Performance metrics
   * @param {Object} businessLogicStatus - Business logic status
   * @returns {Array} Active alerts
   */
  getActiveAlerts(performanceMetrics, businessLogicStatus) {
    const alerts = [];

    // Rollback mode alert
    if (uiOptimizationConfig.isRollbackMode()) {
      alerts.push({
        type: 'ROLLBACK_ACTIVE',
        severity: 'WARNING',
        message: 'System is in rollback mode - optimizations disabled',
        timestamp: Date.now()
      });
    }

    // Business logic bypass alerts
    if (businessLogicStatus.report?.totalBypasses > 0) {
      alerts.push({
        type: 'BUSINESS_LOGIC_BYPASS',
        severity: 'CRITICAL',
        message: `${businessLogicStatus.report.totalBypasses} business logic bypasses detected`,
        timestamp: Date.now()
      });
    }

    // Performance alerts
    const cacheHitRate = performanceMetrics.calculated?.cacheHitRate || 0;
    if (cacheHitRate < 0.3) {
      alerts.push({
        type: 'LOW_CACHE_HIT_RATE',
        severity: 'WARNING',
        message: `Low cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`,
        timestamp: Date.now()
      });
    }

    const screenLoadTime = performanceMetrics.calculated?.averageScreenLoadTime || 0;
    if (screenLoadTime > 3000) {
      alerts.push({
        type: 'SLOW_SCREEN_LOAD',
        severity: 'WARNING',
        message: `Slow screen load time: ${screenLoadTime.toFixed(0)}ms`,
        timestamp: Date.now()
      });
    }

    // Recent business logic alerts
    const recentAlerts = performanceMetrics.businessLogicAlerts?.filter(
      alert => Date.now() - alert.timestamp < 300000 // Last 5 minutes
    ) || [];

    recentAlerts.forEach(alert => {
      alerts.push({
        type: alert.type,
        severity: alert.severity,
        message: `Recent alert: ${alert.type}`,
        timestamp: alert.timestamp
      });
    });

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate comprehensive monitoring report
   * @returns {Object} Detailed monitoring report
   */
  async generateReport() {
    const systemStatus = await this.getSystemStatus();
    const performanceReport = uiPerformanceMonitor.generateReport();
    const businessLogicReport = businessLogicMonitor.generateBypassReport();

    return {
      reportTimestamp: Date.now(),
      reportVersion: '1.0.0',
      
      executive_summary: {
        systemHealth: systemStatus.systemHealth,
        rollbackActive: systemStatus.rollback.isActive,
        totalAlerts: systemStatus.alerts.length,
        criticalAlerts: systemStatus.alerts.filter(a => a.severity === 'CRITICAL').length,
        optimizationsEnabled: !systemStatus.rollback.isActive,
        sessionDuration: Math.round(systemStatus.performance.sessionDuration / 1000 / 60) // minutes
      },
      
      performance_metrics: {
        api_optimization: {
          totalCalls: performanceReport.counts.totalApiCalls,
          cachedCalls: performanceReport.counts.cachedApiCalls,
          directCalls: performanceReport.counts.directApiCalls,
          failedCalls: performanceReport.counts.failedApiCalls,
          reductionRate: performanceReport.performance.apiCallReduction,
          averageResponseTime: performanceReport.performance.averageApiResponseTime
        },
        cache_performance: {
          hits: performanceReport.counts.cacheHits,
          misses: performanceReport.counts.cacheMisses,
          hitRate: performanceReport.performance.cacheHitRate,
          invalidations: performanceReport.counts.cacheInvalidations || 0
        },
        ui_performance: {
          averageScreenLoadTime: performanceReport.performance.averageScreenLoadTime,
          uiUpdatesPropagated: performanceReport.counts.uiUpdatesPropagated,
          uiUpdatesFailed: performanceReport.counts.uiUpdatesFailed,
          screensAffected: performanceReport.counts.screensAffected || 0
        }
      },
      
      business_logic_compliance: {
        overall: {
          totalOperations: businessLogicReport.totalOperations,
          totalBypasses: businessLogicReport.totalBypasses,
          bypassRate: `${(businessLogicReport.bypassRate * 100).toFixed(3)}%`,
          isCompliant: businessLogicReport.isHealthy,
          consecutiveBypasses: businessLogicReport.consecutiveBypasses
        },
        by_category: businessLogicReport.categories
      },
      
      system_configuration: {
        optimizations: systemStatus.configuration,
        rollback: systemStatus.rollback,
        monitoring: {
          performanceMonitoringActive: uiPerformanceMonitor.isMonitoring,
          businessLogicMonitoringActive: businessLogicMonitor.isMonitoring,
          dashboardInitialized: this.isInitialized
        }
      },
      
      alerts_and_warnings: {
        active_alerts: systemStatus.alerts,
        alert_summary: {
          total: systemStatus.alerts.length,
          critical: systemStatus.alerts.filter(a => a.severity === 'CRITICAL').length,
          warning: systemStatus.alerts.filter(a => a.severity === 'WARNING').length,
          info: systemStatus.alerts.filter(a => a.severity === 'INFO').length
        }
      },
      
      recommendations: this.generateRecommendations(systemStatus, performanceReport, businessLogicReport)
    };
  }

  /**
   * Generate recommendations based on current status
   * @param {Object} systemStatus - System status
   * @param {Object} performanceReport - Performance report
   * @param {Object} businessLogicReport - Business logic report
   * @returns {Array} Recommendations
   */
  generateRecommendations(systemStatus, performanceReport, businessLogicReport) {
    const recommendations = [];

    // Rollback recommendations
    if (systemStatus.rollback.isActive) {
      recommendations.push({
        priority: 'HIGH',
        category: 'ROLLBACK',
        message: 'System is in rollback mode. Investigate and resolve the underlying issue before re-enabling optimizations.',
        action: 'Review rollback reason and fix root cause'
      });
    }

    // Business logic recommendations
    if (businessLogicReport.totalBypasses > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'BUSINESS_LOGIC',
        message: `${businessLogicReport.totalBypasses} business logic bypasses detected. Immediate investigation required.`,
        action: 'Review bypass logs and ensure all critical operations hit backend'
      });
    }

    // Performance recommendations
    const cacheHitRate = parseFloat(performanceReport.performance.cacheHitRate.replace('%', '')) / 100;
    if (cacheHitRate < 0.5) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'PERFORMANCE',
        message: `Low cache hit rate (${performanceReport.performance.cacheHitRate}). Consider optimizing cache strategy.`,
        action: 'Review cache invalidation logic and user navigation patterns'
      });
    }

    // Screen load time recommendations
    const screenLoadTime = parseFloat(performanceReport.performance.averageScreenLoadTime.replace('ms', ''));
    if (screenLoadTime > 2000) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'PERFORMANCE',
        message: `Slow average screen load time (${performanceReport.performance.averageScreenLoadTime}). Optimization may not be effective.`,
        action: 'Review screen loading logic and consider additional optimizations'
      });
    }

    // Configuration recommendations
    if (!systemStatus.configuration.sessionCaching && !systemStatus.rollback.isActive) {
      recommendations.push({
        priority: 'LOW',
        category: 'CONFIGURATION',
        message: 'Session caching is disabled but system is not in rollback mode.',
        action: 'Consider enabling session caching for better performance'
      });
    }

    // Alert recommendations
    if (systemStatus.alerts.length > 10) {
      recommendations.push({
        priority: 'HIGH',
        category: 'MONITORING',
        message: `High number of active alerts (${systemStatus.alerts.length}). System may be unstable.`,
        action: 'Review and address active alerts to improve system stability'
      });
    }

    return recommendations;
  }

  /**
   * Print dashboard to console (for debugging)
   */
  async printDashboard() {
    const report = await this.generateReport();
    
    console.log('\n📊 ===== UI OPTIMIZATION MONITORING DASHBOARD =====');
    console.log(`📅 Report Generated: ${new Date(report.reportTimestamp).toISOString()}`);
    console.log(`🏥 System Health: ${report.executive_summary.systemHealth}`);
    console.log(`⏱️  Session Duration: ${report.executive_summary.sessionDuration} minutes`);
    
    console.log('\n🔄 ROLLBACK STATUS:');
    console.log(`   Active: ${report.executive_summary.rollbackActive ? '🔴 YES' : '🟢 NO'}`);
    if (report.system_configuration.rollback.reason) {
      console.log(`   Reason: ${report.system_configuration.rollback.reason}`);
    }
    
    console.log('\n📈 PERFORMANCE METRICS:');
    console.log(`   API Call Reduction: ${report.performance_metrics.api_optimization.reductionRate}`);
    console.log(`   Cache Hit Rate: ${report.performance_metrics.cache_performance.hitRate}`);
    console.log(`   Avg Screen Load: ${report.performance_metrics.ui_performance.averageScreenLoadTime}`);
    console.log(`   Avg API Response: ${report.performance_metrics.api_optimization.averageResponseTime}`);
    
    console.log('\n🛡️ BUSINESS LOGIC COMPLIANCE:');
    console.log(`   Total Operations: ${report.business_logic_compliance.overall.totalOperations}`);
    console.log(`   Total Bypasses: ${report.business_logic_compliance.overall.totalBypasses}`);
    console.log(`   Bypass Rate: ${report.business_logic_compliance.overall.bypassRate}`);
    console.log(`   Compliant: ${report.business_logic_compliance.overall.isCompliant ? '🟢 YES' : '🔴 NO'}`);
    
    console.log('\n🚨 ALERTS:');
    console.log(`   Total: ${report.alerts_and_warnings.alert_summary.total}`);
    console.log(`   Critical: ${report.alerts_and_warnings.alert_summary.critical}`);
    console.log(`   Warning: ${report.alerts_and_warnings.alert_summary.warning}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority}] ${rec.message}`);
        console.log(`      Action: ${rec.action}`);
      });
    }
    
    console.log('\n📊 ================================================\n');
  }

  /**
   * Export report to JSON string
   * @returns {string} JSON report
   */
  async exportReport() {
    const report = await this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Start continuous monitoring with periodic reports
   * @param {number} intervalMinutes - Report interval in minutes
   */
  startContinuousMonitoring(intervalMinutes = 15) {
    if (this.continuousInterval) {
      console.log('📊 [MonitoringDashboard] Continuous monitoring already active');
      return;
    }

    console.log(`📊 [MonitoringDashboard] Starting continuous monitoring (${intervalMinutes} min intervals)`);
    
    this.continuousInterval = setInterval(async () => {
      try {
        await this.printDashboard();
      } catch (error) {
        console.error('📊 [MonitoringDashboard] Error in continuous monitoring:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop continuous monitoring
   */
  stopContinuousMonitoring() {
    if (this.continuousInterval) {
      clearInterval(this.continuousInterval);
      this.continuousInterval = null;
      console.log('📊 [MonitoringDashboard] Continuous monitoring stopped');
    }
  }
}

// Create singleton instance
const monitoringDashboard = new MonitoringDashboard();

export default monitoringDashboard;