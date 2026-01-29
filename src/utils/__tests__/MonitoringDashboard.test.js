/**
 * MonitoringDashboard.test.js - Test comprehensive monitoring monitoringDashboard
 * 
 * Tests the centralized monitoring monitoringDashboard that provides system status,
 * performance metrics, business logic compliance, and recommendations.
 * 
 * Requirements: All (Performance monitoring and documentation)
 */

import monitoringDashboard from '../MonitoringDashboard';
import uiPerformanceMonitor from '../../services/UIPerformanceMonitor';
import businessLogicMonitor from '../../services/BusinessLogicMonitor';
import uiOptimizationConfig from '../../services/UIOptimizationConfig';
import RollbackUtility from '../RollbackUtility';

// Mock dependencies
jest.mock('../../services/UIPerformanceMonitor');
jest.mock('../../services/BusinessLogicMonitor');
jest.mock('../../services/UIOptimizationConfig');
jest.mock('../RollbackUtility');

describe('MonitoringDashboard', () => {
  beforeEach(() => {
    // Reset monitoringDashboard state for each test
    monitoringDashboard.isInitialized = false;
    if (monitoringDashboard.continuousInterval) {
      clearInterval(monitoringDashboard.continuousInterval);
      monitoringDashboard.continuousInterval = null;
    }
    
    // Mock UI optimization config
    uiOptimizationConfig.initialize = jest.fn().mockResolvedValue();
    uiOptimizationConfig.isRollbackMode = jest.fn().mockReturnValue(false);
    uiOptimizationConfig.getConfiguration = jest.fn().mockReturnValue({
      sessionCachingEnabled: true,
      uiPropagationEnabled: true,
      computationReuseEnabled: true,
      serviceStatusOptimizationEnabled: true,
      debugMode: false,
      configVersion: '1.0.0'
    });
    
    // Mock performance monitor
    uiPerformanceMonitor.startMonitoring = jest.fn().mockResolvedValue();
    uiPerformanceMonitor.isMonitoring = true;
    uiPerformanceMonitor.getMetrics = jest.fn().mockReturnValue({
      apiCalls: { total: 10, cached: 7, direct: 2, failed: 1 },
      cache: { hits: 15, misses: 5, invalidations: 2, size: 100 },
      uiUpdates: { propagated: 8, failed: 1, screens: new Set(['POSScreen', 'ManageScreen']) },
      businessLogicAlerts: [],
      timings: {
        screenLoads: [{ screenName: 'POSScreen', loadTime: 1200 }],
        apiResponses: [{ endpoint: '/api/products', responseTime: 300 }],
        cacheOperations: []
      },
      session: { startTime: Date.now() - 60000, optimizationsEnabled: true },
      calculated: {
        cacheHitRate: 0.75,
        apiCallReduction: 0.7,
        averageScreenLoadTime: 1200,
        averageApiResponseTime: 300,
        sessionDuration: 60000,
        alertRate: 0
      }
    });
    
    // Mock business logic monitor
    businessLogicMonitor.startMonitoring = jest.fn();
    businessLogicMonitor.isMonitoring = true;
    businessLogicMonitor.getStatus = jest.fn().mockReturnValue({
      isMonitoring: true,
      report: {
        totalOperations: 50,
        totalBypasses: 0,
        bypassRate: 0,
        consecutiveBypasses: 0,
        isHealthy: true,
        categories: {
          inventory: { total: 20, bypassed: 0, bypassRate: 0 },
          orders: { total: 15, bypassed: 0, bypassRate: 0 },
          auth: { total: 10, bypassed: 0, bypassRate: 0 },
          api: { total: 5, bypassed: 0, bypassRate: 0 }
        }
      },
      recentBypasses: [],
      thresholds: {
        maxBypassRate: 0.01,
        maxConsecutiveBypasses: 3,
        maxBypassesPerMinute: 5,
        emergencyBypassCount: 10
      }
    });
    
    // Mock rollback utility
    RollbackUtility.getRollbackStatus = jest.fn().mockResolvedValue({
      success: true,
      rollbackMode: false,
      rollbackReason: null,
      rollbackTimestamp: null,
      rollbackAge: null,
      optimizationStatus: {
        sessionCaching: true,
        uiPropagation: true,
        computationReuse: true,
        serviceStatusOptimization: true,
        rollbackMode: false,
        allOptimizationsActive: true
      },
      configuration: {
        sessionCaching: true,
        uiPropagation: true,
        computationReuse: true,
        serviceStatusOptimization: true,
        debugMode: false,
        configVersion: '1.0.0'
      }
    });
    
    // Clear console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    if (monitoringDashboard.continuousInterval) {
      monitoringDashboard.stopContinuousMonitoring();
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      expect(monitoringDashboard.isInitialized).toBe(false);
      
      await monitoringDashboard.initialize();
      
      expect(monitoringDashboard.isInitialized).toBe(true);
      expect(uiOptimizationConfig.initialize).toHaveBeenCalled();
      expect(uiPerformanceMonitor.startMonitoring).toHaveBeenCalled();
      expect(businessLogicMonitor.startMonitoring).toHaveBeenCalled();
    });

    test('should not initialize twice', async () => {
      await monitoringDashboard.initialize();
      const firstInitTime = monitoringDashboard.isInitialized;
      
      await monitoringDashboard.initialize();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Already initialized')
      );
    });

    test('should handle initialization errors gracefully', async () => {
      uiOptimizationConfig.initialize.mockRejectedValue(new Error('Init failed'));
      
      await monitoringDashboard.initialize();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during initialization')
      );
    });
  });

  describe('System Status', () => {
    beforeEach(async () => {
      await monitoringDashboard.initialize();
    });

    test('should get comprehensive system status', async () => {
      const status = await monitoringDashboard.getSystemStatus();
      
      expect(status).toMatchObject({
        timestamp: expect.any(Number),
        systemHealth: expect.any(String),
        rollback: {
          isActive: false,
          reason: null,
          timestamp: null,
          age: null
        },
        performance: {
          apiCallReduction: 0.7,
          cacheHitRate: 0.75,
          averageScreenLoadTime: 1200,
          averageApiResponseTime: 300,
          sessionDuration: 60000
        },
        businessLogic: {
          isHealthy: true,
          totalOperations: 50,
          totalBypasses: 0,
          bypassRate: 0,
          consecutiveBypasses: 0,
          recentBypasses: 0
        },
        configuration: {
          sessionCaching: true,
          uiPropagation: true,
          computationReuse: true,
          serviceStatusOptimization: true,
          debugMode: false,
          configVersion: '1.0.0'
        },
        alerts: expect.any(Array)
      });
    });

    test('should handle rollback status errors', async () => {
      RollbackUtility.getRollbackStatus.mockResolvedValue({
        success: false,
        error: 'Rollback status error'
      });
      
      const status = await monitoringDashboard.getSystemStatus();
      
      expect(status.rollback).toEqual({
        error: 'Rollback status error'
      });
    });

    test('should handle system status errors gracefully', async () => {
      uiPerformanceMonitor.getMetrics.mockImplementation(() => {
        throw new Error('Metrics error');
      });
      
      const status = await monitoringDashboard.getSystemStatus();
      
      expect(status).toMatchObject({
        timestamp: expect.any(Number),
        error: 'Metrics error',
        systemHealth: 'ERROR'
      });
    });
  });

  describe('System Health Calculation', () => {
    beforeEach(async () => {
      await monitoringDashboard.initialize();
    });

    test('should calculate EXCELLENT health for optimal conditions', () => {
      const performanceMetrics = {
        businessLogicAlerts: [],
        calculated: {
          cacheHitRate: 0.8,
          averageScreenLoadTime: 1000
        }
      };
      
      const businessLogicStatus = {
        report: { isHealthy: true }
      };
      
      const health = monitoringDashboard.calculateSystemHealth(performanceMetrics, businessLogicStatus);
      expect(health).toBe('EXCELLENT');
    });

    test('should calculate CRITICAL health for poor conditions', () => {
      uiOptimizationConfig.isRollbackMode.mockReturnValue(true);
      
      const performanceMetrics = {
        businessLogicAlerts: Array(10).fill({}), // Many alerts
        calculated: {
          cacheHitRate: 0.1, // Poor cache hit rate
          averageScreenLoadTime: 5000 // Slow screens
        }
      };
      
      const businessLogicStatus = {
        report: { isHealthy: false }
      };
      
      const health = monitoringDashboard.calculateSystemHealth(performanceMetrics, businessLogicStatus);
      expect(health).toBe('CRITICAL');
    });

    test('should calculate WARNING health for moderate conditions', () => {
      const performanceMetrics = {
        businessLogicAlerts: Array(3).fill({}), // Some alerts
        calculated: {
          cacheHitRate: 0.4, // Moderate cache hit rate
          averageScreenLoadTime: 2500 // Moderate screen load time
        }
      };
      
      const businessLogicStatus = {
        report: { isHealthy: true }
      };
      
      const health = monitoringDashboard.calculateSystemHealth(performanceMetrics, businessLogicStatus);
      expect(health).toBe('WARNING');
    });
  });

  describe('Active Alerts', () => {
    beforeEach(async () => {
      await monitoringDashboard.initialize();
    });

    test('should detect rollback mode alert', () => {
      uiOptimizationConfig.isRollbackMode.mockReturnValue(true);
      
      const alerts = monitoringDashboard.getActiveAlerts({}, {});
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'ROLLBACK_ACTIVE',
          severity: 'WARNING',
          message: expect.stringContaining('rollback mode')
        })
      );
    });

    test('should detect business logic bypass alerts', () => {
      const businessLogicStatus = {
        report: { totalBypasses: 3 }
      };
      
      const alerts = monitoringDashboard.getActiveAlerts({}, businessLogicStatus);
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'BUSINESS_LOGIC_BYPASS',
          severity: 'CRITICAL',
          message: expect.stringContaining('3 business logic bypasses')
        })
      );
    });

    test('should detect low cache hit rate alerts', () => {
      const performanceMetrics = {
        calculated: { cacheHitRate: 0.2 } // Below 30% threshold
      };
      
      const alerts = monitoringDashboard.getActiveAlerts(performanceMetrics, {});
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'LOW_CACHE_HIT_RATE',
          severity: 'WARNING',
          message: expect.stringContaining('Low cache hit rate')
        })
      );
    });

    test('should detect slow screen load alerts', () => {
      const performanceMetrics = {
        calculated: { averageScreenLoadTime: 4000 } // Above 3000ms threshold
      };
      
      const alerts = monitoringDashboard.getActiveAlerts(performanceMetrics, {});
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'SLOW_SCREEN_LOAD',
          severity: 'WARNING',
          message: expect.stringContaining('Slow screen load time')
        })
      );
    });

    test('should include recent business logic alerts', () => {
      const recentTimestamp = Date.now() - 60000; // 1 minute ago
      const performanceMetrics = {
        businessLogicAlerts: [
          {
            type: 'API_BYPASS',
            severity: 'CRITICAL',
            timestamp: recentTimestamp
          }
        ]
      };
      
      const alerts = monitoringDashboard.getActiveAlerts(performanceMetrics, {});
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'API_BYPASS',
          severity: 'CRITICAL',
          message: expect.stringContaining('Recent alert')
        })
      );
    });

    test('should sort alerts by timestamp descending', () => {
      const oldTimestamp = Date.now() - 300000; // 5 minutes ago
      const newTimestamp = Date.now() - 60000; // 1 minute ago
      
      const performanceMetrics = {
        businessLogicAlerts: [
          { type: 'OLD_ALERT', severity: 'WARNING', timestamp: oldTimestamp },
          { type: 'NEW_ALERT', severity: 'CRITICAL', timestamp: newTimestamp }
        ]
      };
      
      const alerts = monitoringDashboard.getActiveAlerts(performanceMetrics, {});
      
      // Should be sorted with newest first
      const recentAlerts = alerts.filter(a => a.type.includes('_ALERT'));
      expect(recentAlerts[0].type).toBe('NEW_ALERT');
      expect(recentAlerts[1].type).toBe('OLD_ALERT');
    });
  });

  describe('Report Generation', () => {
    beforeEach(async () => {
      await monitoringDashboard.initialize();
    });

    test('should generate comprehensive monitoring report', async () => {
      const report = await monitoringDashboard.generateReport();
      
      expect(report).toMatchObject({
        reportTimestamp: expect.any(Number),
        reportVersion: '1.0.0',
        executive_summary: {
          systemHealth: expect.any(String),
          rollbackActive: false,
          totalAlerts: expect.any(Number),
          criticalAlerts: expect.any(Number),
          optimizationsEnabled: true,
          sessionDuration: expect.any(Number)
        },
        performance_metrics: {
          api_optimization: {
            totalCalls: 10,
            cachedCalls: 7,
            directCalls: 2,
            failedCalls: 1,
            reductionRate: expect.any(String),
            averageResponseTime: expect.any(String)
          },
          cache_performance: {
            hits: 15,
            misses: 5,
            hitRate: expect.any(String),
            invalidations: 2
          },
          ui_performance: {
            averageScreenLoadTime: expect.any(String),
            uiUpdatesPropagated: 8,
            uiUpdatesFailed: 1
          }
        },
        business_logic_compliance: {
          overall: {
            totalOperations: 50,
            totalBypasses: 0,
            bypassRate: '0.000%',
            isCompliant: true,
            consecutiveBypasses: 0
          },
          by_category: expect.any(Object)
        },
        system_configuration: {
          optimizations: expect.any(Object),
          rollback: expect.any(Object),
          monitoring: {
            performanceMonitoringActive: true,
            businessLogicMonitoringActive: true,
            dashboardInitialized: true
          }
        },
        alerts_and_warnings: {
          active_alerts: expect.any(Array),
          alert_summary: {
            total: expect.any(Number),
            critical: expect.any(Number),
            warning: expect.any(Number),
            info: expect.any(Number)
          }
        },
        recommendations: expect.any(Array)
      });
    });

    test('should include performance report data', async () => {
      uiPerformanceMonitor.generateReport = jest.fn().mockReturnValue({
        timestamp: Date.now(),
        sessionDuration: 60000,
        optimizationsEnabled: true,
        rollbackMode: false,
        performance: {
          apiCallReduction: '70.0%',
          cacheHitRate: '75.0%',
          averageScreenLoadTime: '1200ms',
          averageApiResponseTime: '300ms'
        },
        counts: {
          totalApiCalls: 10,
          cachedApiCalls: 7,
          directApiCalls: 2,
          failedApiCalls: 1,
          cacheHits: 15,
          cacheMisses: 5,
          uiUpdatesPropagated: 8,
          uiUpdatesFailed: 1,
          businessLogicAlerts: 0
        },
        health: {
          cacheHitRateHealthy: true,
          apiFailureRateHealthy: true,
          alertRateHealthy: true,
          screenLoadHealthy: true
        }
      });
      
      const report = await monitoringDashboard.generateReport();
      
      expect(report.performance_metrics.api_optimization.reductionRate).toBe('70.0%');
      expect(report.performance_metrics.cache_performance.hitRate).toBe('75.0%');
    });
  });

  describe('Recommendations', () => {
    beforeEach(async () => {
      await monitoringDashboard.initialize();
    });

    test('should recommend rollback investigation when in rollback mode', () => {
      const systemStatus = {
        rollback: { isActive: true, reason: 'Test rollback' }
      };
      
      const recommendations = monitoringDashboard.generateRecommendations(systemStatus, {}, {});
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'HIGH',
          category: 'ROLLBACK',
          message: expect.stringContaining('rollback mode'),
          action: expect.stringContaining('Review rollback reason')
        })
      );
    });

    test('should recommend business logic investigation when bypasses detected', () => {
      const businessLogicReport = { totalBypasses: 5 };
      
      const recommendations = monitoringDashboard.generateRecommendations({}, {}, businessLogicReport);
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'CRITICAL',
          category: 'BUSINESS_LOGIC',
          message: expect.stringContaining('5 business logic bypasses'),
          action: expect.stringContaining('Review bypass logs')
        })
      );
    });

    test('should recommend cache optimization for low hit rate', () => {
      const performanceReport = {
        performance: { cacheHitRate: '30.0%' }
      };
      
      const recommendations = monitoringDashboard.generateRecommendations({}, performanceReport, {});
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'MEDIUM',
          category: 'PERFORMANCE',
          message: expect.stringContaining('Low cache hit rate'),
          action: expect.stringContaining('Review cache invalidation logic')
        })
      );
    });

    test('should recommend screen load optimization for slow performance', () => {
      const performanceReport = {
        performance: { averageScreenLoadTime: '3500ms' }
      };
      
      const recommendations = monitoringDashboard.generateRecommendations({}, performanceReport, {});
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'MEDIUM',
          category: 'PERFORMANCE',
          message: expect.stringContaining('Slow average screen load time'),
          action: expect.stringContaining('Review screen loading logic')
        })
      );
    });

    test('should recommend enabling session caching when disabled', () => {
      const systemStatus = {
        configuration: { sessionCaching: false },
        rollback: { isActive: false }
      };
      
      const recommendations = monitoringDashboard.generateRecommendations(systemStatus, {}, {});
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'LOW',
          category: 'CONFIGURATION',
          message: expect.stringContaining('Session caching is disabled'),
          action: expect.stringContaining('Consider enabling session caching')
        })
      );
    });

    test('should recommend alert review for high alert count', () => {
      const systemStatus = {
        alerts: Array(15).fill({ type: 'TEST_ALERT', severity: 'WARNING' })
      };
      
      const recommendations = monitoringDashboard.generateRecommendations(systemStatus, {}, {});
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'HIGH',
          category: 'MONITORING',
          message: expect.stringContaining('High number of active alerts (15)'),
          action: expect.stringContaining('Review and address active alerts')
        })
      );
    });
  });

  describe('monitoringDashboard Display', () => {
    beforeEach(async () => {
      await monitoringDashboard.initialize();
    });

    test('should print monitoringDashboard to console', async () => {
      await monitoringDashboard.printDashboard();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('UI OPTIMIZATION MONITORING monitoringDashboard')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('System Health:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('PERFORMANCE METRICS:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('BUSINESS LOGIC COMPLIANCE:')
      );
    });

    test('should export report as JSON string', async () => {
      const jsonReport = await monitoringDashboard.exportReport();
      
      expect(typeof jsonReport).toBe('string');
      
      const parsedReport = JSON.parse(jsonReport);
      expect(parsedReport).toMatchObject({
        reportTimestamp: expect.any(Number),
        reportVersion: '1.0.0',
        executive_summary: expect.any(Object)
      });
    });
  });

  describe('Continuous Monitoring', () => {
    beforeEach(async () => {
      await monitoringDashboard.initialize();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should start continuous monitoring', () => {
      expect(monitoringDashboard.continuousInterval).toBeUndefined();
      
      monitoringDashboard.startContinuousMonitoring(5); // 5 minutes
      
      expect(monitoringDashboard.continuousInterval).toBeDefined();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting continuous monitoring (5 min intervals)')
      );
    });

    test('should not start continuous monitoring twice', () => {
      monitoringDashboard.startContinuousMonitoring(5);
      monitoringDashboard.startContinuousMonitoring(10);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Continuous monitoring already active')
      );
    });

    test('should perform periodic monitoringDashboard prints', async () => {
      const printSpy = jest.spyOn(monitoringDashboard, 'printDashboard').mockResolvedValue();
      
      monitoringDashboard.startContinuousMonitoring(5); // 5 minutes
      
      // Fast-forward time by 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);
      
      // Wait for async operations
      await Promise.resolve();
      
      expect(printSpy).toHaveBeenCalled();
    });

    test('should handle errors in continuous monitoring', async () => {
      jest.spyOn(monitoringDashboard, 'printDashboard').mockRejectedValue(new Error('Print error'));
      
      monitoringDashboard.startContinuousMonitoring(5);
      
      // Fast-forward time by 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);
      
      // Wait for async operations
      await Promise.resolve();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in continuous monitoring')
      );
    });

    test('should stop continuous monitoring', () => {
      monitoringDashboard.startContinuousMonitoring(5);
      expect(monitoringDashboard.continuousInterval).toBeDefined();
      
      monitoringDashboard.stopContinuousMonitoring();
      
      expect(monitoringDashboard.continuousInterval).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Continuous monitoring stopped')
      );
    });

    test('should handle stopping when not started', () => {
      expect(monitoringDashboard.continuousInterval).toBeUndefined();
      
      monitoringDashboard.stopContinuousMonitoring();
      
      // Should not throw error or log anything
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Continuous monitoring stopped')
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle uninitialized monitoringDashboard gracefully', async () => {
      expect(monitoringDashboard.isInitialized).toBe(false);
      
      const status = await monitoringDashboard.getSystemStatus();
      
      expect(monitoringDashboard.isInitialized).toBe(true);
      expect(status).toMatchObject({
        timestamp: expect.any(Number),
        systemHealth: expect.any(String)
      });
    });

    test('should handle missing performance metrics', async () => {
      await monitoringDashboard.initialize();
      
      uiPerformanceMonitor.getMetrics.mockReturnValue({
        // Missing calculated field
        apiCalls: { total: 0 },
        cache: { hits: 0, misses: 0 },
        uiUpdates: { propagated: 0, failed: 0 },
        businessLogicAlerts: [],
        timings: { screenLoads: [], apiResponses: [], cacheOperations: [] },
        session: { startTime: Date.now() }
      });
      
      const status = await monitoringDashboard.getSystemStatus();
      
      expect(status.performance.apiCallReduction).toBe(0);
      expect(status.performance.cacheHitRate).toBe(0);
    });

    test('should handle missing business logic status', async () => {
      await monitoringDashboard.initialize();
      
      businessLogicMonitor.getStatus.mockReturnValue({
        isMonitoring: true,
        // Missing report field
        recentBypasses: [],
        thresholds: {}
      });
      
      const status = await monitoringDashboard.getSystemStatus();
      
      expect(status.businessLogic.isHealthy).toBe(false);
      expect(status.businessLogic.totalOperations).toBe(0);
    });
  });
});
