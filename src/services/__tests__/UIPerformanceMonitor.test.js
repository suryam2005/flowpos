/**
 * UIPerformanceMonitor.test.js - Test performance monitoring functionality
 * 
 * Tests the performance metrics collection, business logic bypass detection,
 * and emergency rollback capabilities of the UI performance uiPerformanceMonitor.
 * 
 * Requirements: All (Performance monitoring and alerting)
 */

import uiPerformanceMonitor from '../UIPerformanceMonitor';
import uiOptimizationConfig from '../UIOptimizationConfig';

// Mock dependencies
jest.mock('../UIOptimizationConfig');

describe('UIPerformanceMonitor', () => {
  beforeEach(() => {
    // Reset uiPerformanceMonitor state for each test
    uiPerformanceMonitor.isMonitoring = false;
    uiPerformanceMonitor.resetMetrics();
    
    if (uiPerformanceMonitor.reportingInterval) {
      clearInterval(uiPerformanceMonitor.reportingInterval);
      uiPerformanceMonitor.reportingInterval = null;
    }
    
    // Mock config
    uiOptimizationConfig.isInitialized = true;
    uiOptimizationConfig.initialize = jest.fn().mockResolvedValue();
    uiOptimizationConfig.isRollbackMode = jest.fn().mockReturnValue(false);
    
    // Clear console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    uiPerformanceMonitor.stopMonitoring();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Monitoring Lifecycle', () => {
    test('should start monitoring successfully', async () => {
      expect(uiPerformanceMonitor.isMonitoring).toBe(false);
      
      await uiPerformanceMonitor.startMonitoring();
      
      expect(uiPerformanceMonitor.isMonitoring).toBe(true);
      expect(uiOptimizationConfig.initialize).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Monitoring started')
      );
    });

    test('should not start monitoring twice', async () => {
      await uiPerformanceMonitor.startMonitoring();
      const firstStartTime = uiPerformanceMonitor.metrics.session.startTime;
      
      await uiPerformanceMonitor.startMonitoring();
      
      expect(uiPerformanceMonitor.metrics.session.startTime).toBe(firstStartTime);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Already monitoring')
      );
    });

    test('should stop monitoring successfully', async () => {
      await uiPerformanceMonitor.startMonitoring();
      expect(uiPerformanceMonitor.isMonitoring).toBe(true);
      
      uiPerformanceMonitor.stopMonitoring();
      
      expect(uiPerformanceMonitor.isMonitoring).toBe(false);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Monitoring stopped')
      );
    });
  });

  describe('API Call Tracking', () => {
    beforeEach(async () => {
      await uiPerformanceMonitor.startMonitoring();
    });

    test('should track cached API calls', () => {
      uiPerformanceMonitor.trackApiCall('cached', '/api/products', 150);
      
      expect(uiPerformanceMonitor.metrics.apiCalls.total).toBe(1);
      expect(uiPerformanceMonitor.metrics.apiCalls.cached).toBe(1);
      expect(uiPerformanceMonitor.metrics.apiCalls.direct).toBe(0);
      expect(uiPerformanceMonitor.metrics.apiCalls.failed).toBe(0);
    });

    test('should track direct API calls', () => {
      uiPerformanceMonitor.trackApiCall('direct', '/api/orders', 800);
      
      expect(uiPerformanceMonitor.metrics.apiCalls.total).toBe(1);
      expect(uiPerformanceMonitor.metrics.apiCalls.cached).toBe(0);
      expect(uiPerformanceMonitor.metrics.apiCalls.direct).toBe(1);
      expect(uiPerformanceMonitor.metrics.apiCalls.failed).toBe(0);
    });

    test('should track failed API calls', () => {
      uiPerformanceMonitor.trackApiCall('failed', '/api/products', 0, { error: 'Network error' });
      
      expect(uiPerformanceMonitor.metrics.apiCalls.total).toBe(1);
      expect(uiPerformanceMonitor.metrics.apiCalls.cached).toBe(0);
      expect(uiPerformanceMonitor.metrics.apiCalls.direct).toBe(0);
      expect(uiPerformanceMonitor.metrics.apiCalls.failed).toBe(1);
    });

    test('should track response times', () => {
      uiPerformanceMonitor.trackApiCall('direct', '/api/products', 500);
      
      expect(uiPerformanceMonitor.metrics.timings.apiResponses).toHaveLength(1);
      expect(uiPerformanceMonitor.metrics.timings.apiResponses[0]).toMatchObject({
        endpoint: '/api/products',
        responseTime: 500,
        type: 'direct'
      });
    });

    test('should detect business logic bypass in API calls', () => {
      const spy = jest.spyOn(uiPerformanceMonitor, 'recordBusinessLogicAlert');
      
      uiPerformanceMonitor.trackApiCall('cached', '/api/inventory', 100, {
        bypassedBusinessLogic: true
      });
      
      expect(spy).toHaveBeenCalledWith('API_BYPASS', expect.objectContaining({
        endpoint: '/api/inventory',
        type: 'cached'
      }));
    });
  });

  describe('Cache Performance Tracking', () => {
    beforeEach(async () => {
      await uiPerformanceMonitor.startMonitoring();
    });

    test('should track cache hits', () => {
      uiPerformanceMonitor.trackCacheOperation('hit', 'products');
      
      expect(uiPerformanceMonitor.metrics.cache.hits).toBe(1);
      expect(uiPerformanceMonitor.metrics.cache.misses).toBe(0);
    });

    test('should track cache misses', () => {
      uiPerformanceMonitor.trackCacheOperation('miss', 'analytics');
      
      expect(uiPerformanceMonitor.metrics.cache.hits).toBe(0);
      expect(uiPerformanceMonitor.metrics.cache.misses).toBe(1);
    });

    test('should track cache invalidations', () => {
      uiPerformanceMonitor.trackCacheOperation('invalidation', 'products');
      
      expect(uiPerformanceMonitor.metrics.cache.invalidations).toBe(1);
    });

    test('should track cache size updates', () => {
      uiPerformanceMonitor.trackCacheOperation('size_update', 'products', { size: 50 });
      
      expect(uiPerformanceMonitor.metrics.cache.size).toBe(50);
    });

    test('should track cache operation timings', () => {
      uiPerformanceMonitor.trackCacheOperation('hit', 'products', { operationTime: 5 });
      
      expect(uiPerformanceMonitor.metrics.timings.cacheOperations).toHaveLength(1);
      expect(uiPerformanceMonitor.metrics.timings.cacheOperations[0]).toMatchObject({
        operation: 'hit',
        cacheType: 'products',
        operationTime: 5
      });
    });
  });

  describe('UI Update Tracking', () => {
    beforeEach(async () => {
      await uiPerformanceMonitor.startMonitoring();
    });

    test('should track successful UI updates', () => {
      uiPerformanceMonitor.trackUIUpdate('POSScreen', true);
      
      expect(uiPerformanceMonitor.metrics.uiUpdates.propagated).toBe(1);
      expect(uiPerformanceMonitor.metrics.uiUpdates.failed).toBe(0);
      expect(uiPerformanceMonitor.metrics.uiUpdates.screens.has('POSScreen')).toBe(true);
    });

    test('should track failed UI updates', () => {
      uiPerformanceMonitor.trackUIUpdate('ManageScreen', false);
      
      expect(uiPerformanceMonitor.metrics.uiUpdates.propagated).toBe(0);
      expect(uiPerformanceMonitor.metrics.uiUpdates.failed).toBe(1);
      expect(uiPerformanceMonitor.metrics.uiUpdates.screens.has('ManageScreen')).toBe(false);
    });
  });

  describe('Screen Load Performance', () => {
    beforeEach(async () => {
      await uiPerformanceMonitor.startMonitoring();
    });

    test('should track screen load times', () => {
      uiPerformanceMonitor.trackScreenLoad('POSScreen', 1200);
      
      expect(uiPerformanceMonitor.metrics.timings.screenLoads).toHaveLength(1);
      expect(uiPerformanceMonitor.metrics.timings.screenLoads[0]).toMatchObject({
        screenName: 'POSScreen',
        loadTime: 1200
      });
    });

    test('should alert on slow screen loads', () => {
      const spy = jest.spyOn(uiPerformanceMonitor, 'recordBusinessLogicAlert');
      
      uiPerformanceMonitor.trackScreenLoad('SlowScreen', 5000); // 5 seconds
      
      expect(spy).toHaveBeenCalledWith('SLOW_SCREEN_LOAD', expect.objectContaining({
        screenName: 'SlowScreen',
        loadTime: 5000,
        threshold: 3000
      }));
    });
  });

  describe('Business Logic Alerts', () => {
    beforeEach(async () => {
      await uiPerformanceMonitor.startMonitoring();
    });

    test('should record business logic alerts', () => {
      uiPerformanceMonitor.recordBusinessLogicAlert('API_BYPASS', {
        endpoint: '/api/inventory',
        operation: 'stockCheck'
      });
      
      expect(uiPerformanceMonitor.metrics.businessLogicAlerts).toHaveLength(1);
      expect(uiPerformanceMonitor.metrics.businessLogicAlerts[0]).toMatchObject({
        type: 'API_BYPASS',
        severity: 'CRITICAL',
        details: {
          endpoint: '/api/inventory',
          operation: 'stockCheck'
        }
      });
    });

    test('should determine correct alert severity', () => {
      expect(uiPerformanceMonitor.getAlertSeverity('API_BYPASS')).toBe('CRITICAL');
      expect(uiPerformanceMonitor.getAlertSeverity('INVENTORY_BYPASS')).toBe('CRITICAL');
      expect(uiPerformanceMonitor.getAlertSeverity('SLOW_SCREEN_LOAD')).toBe('WARNING');
      expect(uiPerformanceMonitor.getAlertSeverity('UNKNOWN_ALERT')).toBe('INFO');
    });

    test('should trigger emergency rollback on too many alerts', async () => {
      const spy = jest.spyOn(uiPerformanceMonitor, 'triggerEmergencyRollback');
      
      // Generate alerts beyond threshold
      for (let i = 0; i < 6; i++) {
        uiPerformanceMonitor.recordBusinessLogicAlert('API_BYPASS', { test: i });
      }
      
      expect(spy).toHaveBeenCalledWith('Too many business logic alerts');
    });
  });

  describe('Metrics Calculation', () => {
    beforeEach(async () => {
      await uiPerformanceMonitor.startMonitoring();
    });

    test('should calculate cache hit rate correctly', () => {
      uiPerformanceMonitor.trackCacheOperation('hit', 'products');
      uiPerformanceMonitor.trackCacheOperation('hit', 'products');
      uiPerformanceMonitor.trackCacheOperation('miss', 'products');
      
      const metrics = uiPerformanceMonitor.getMetrics();
      expect(metrics.calculated.cacheHitRate).toBeCloseTo(0.667, 2); // 2/3
    });

    test('should calculate API call reduction correctly', () => {
      uiPerformanceMonitor.trackApiCall('cached', '/api/products', 100);
      uiPerformanceMonitor.trackApiCall('cached', '/api/products', 100);
      uiPerformanceMonitor.trackApiCall('direct', '/api/products', 500);
      
      const metrics = uiPerformanceMonitor.getMetrics();
      expect(metrics.calculated.apiCallReduction).toBeCloseTo(0.667, 2); // 2/3
    });

    test('should calculate average screen load time', () => {
      uiPerformanceMonitor.trackScreenLoad('Screen1', 1000);
      uiPerformanceMonitor.trackScreenLoad('Screen2', 2000);
      uiPerformanceMonitor.trackScreenLoad('Screen3', 3000);
      
      const metrics = uiPerformanceMonitor.getMetrics();
      expect(metrics.calculated.averageScreenLoadTime).toBe(2000);
    });

    test('should calculate average API response time', () => {
      uiPerformanceMonitor.trackApiCall('direct', '/api/products', 500);
      uiPerformanceMonitor.trackApiCall('direct', '/api/orders', 1000);
      uiPerformanceMonitor.trackApiCall('cached', '/api/analytics', 100);
      
      const metrics = uiPerformanceMonitor.getMetrics();
      expect(metrics.calculated.averageApiResponseTime).toBeCloseTo(533.33, 1);
    });
  });

  describe('Performance Reports', () => {
    beforeEach(async () => {
      await uiPerformanceMonitor.startMonitoring();
    });

    test('should generate comprehensive performance report', () => {
      // Add some test data
      uiPerformanceMonitor.trackApiCall('cached', '/api/products', 100);
      uiPerformanceMonitor.trackApiCall('direct', '/api/orders', 500);
      uiPerformanceMonitor.trackCacheOperation('hit', 'products');
      uiPerformanceMonitor.trackCacheOperation('miss', 'analytics');
      uiPerformanceMonitor.trackUIUpdate('POSScreen', true);
      uiPerformanceMonitor.trackScreenLoad('POSScreen', 1200);
      
      const report = uiPerformanceMonitor.generateReport();
      
      expect(report).toMatchObject({
        timestamp: expect.any(Number),
        sessionDuration: expect.any(Number),
        optimizationsEnabled: expect.any(Boolean),
        rollbackMode: expect.any(Boolean),
        performance: {
          apiCallReduction: expect.any(String),
          cacheHitRate: expect.any(String),
          averageScreenLoadTime: expect.any(String),
          averageApiResponseTime: expect.any(String)
        },
        counts: {
          totalApiCalls: 2,
          cachedApiCalls: 1,
          directApiCalls: 1,
          failedApiCalls: 0,
          cacheHits: 1,
          cacheMisses: 1,
          uiUpdatesPropagated: 1,
          uiUpdatesFailed: 0
        },
        health: expect.objectContaining({
          cacheHitRateHealthy: expect.any(Boolean),
          apiFailureRateHealthy: expect.any(Boolean),
          alertRateHealthy: expect.any(Boolean),
          screenLoadHealthy: expect.any(Boolean)
        })
      });
    });

    test('should identify unhealthy conditions in report', () => {
      // Create unhealthy conditions
      uiPerformanceMonitor.trackCacheOperation('miss', 'products');
      uiPerformanceMonitor.trackCacheOperation('miss', 'products');
      uiPerformanceMonitor.trackCacheOperation('miss', 'products');
      uiPerformanceMonitor.trackCacheOperation('hit', 'products'); // 25% hit rate
      
      uiPerformanceMonitor.trackScreenLoad('SlowScreen', 5000); // Slow load
      
      for (let i = 0; i < 15; i++) {
        uiPerformanceMonitor.trackApiCall('failed', '/api/test', 0); // Many failures
      }
      
      const report = uiPerformanceMonitor.generateReport();
      
      expect(report.health.cacheHitRateHealthy).toBe(false);
      expect(report.health.apiFailureRateHealthy).toBe(false);
      expect(report.health.screenLoadHealthy).toBe(false);
    });
  });

  describe('Metrics Reset', () => {
    beforeEach(async () => {
      await uiPerformanceMonitor.startMonitoring();
    });

    test('should reset all metrics', () => {
      // Add some data
      uiPerformanceMonitor.trackApiCall('cached', '/api/products', 100);
      uiPerformanceMonitor.trackCacheOperation('hit', 'products');
      uiPerformanceMonitor.trackUIUpdate('POSScreen', true);
      uiPerformanceMonitor.recordBusinessLogicAlert('TEST_ALERT', { test: true });
      
      expect(uiPerformanceMonitor.metrics.apiCalls.total).toBe(1);
      expect(uiPerformanceMonitor.metrics.cache.hits).toBe(1);
      expect(uiPerformanceMonitor.metrics.uiUpdates.propagated).toBe(1);
      expect(uiPerformanceMonitor.metrics.businessLogicAlerts).toHaveLength(1);
      
      uiPerformanceMonitor.resetMetrics();
      
      expect(uiPerformanceMonitor.metrics.apiCalls.total).toBe(0);
      expect(uiPerformanceMonitor.metrics.cache.hits).toBe(0);
      expect(uiPerformanceMonitor.metrics.uiUpdates.propagated).toBe(0);
      expect(uiPerformanceMonitor.metrics.businessLogicAlerts).toHaveLength(0);
    });
  });

  describe('Export Functionality', () => {
    beforeEach(async () => {
      await uiPerformanceMonitor.startMonitoring();
    });

    test('should export metrics for external analysis', () => {
      uiPerformanceMonitor.trackApiCall('cached', '/api/products', 100);
      
      const exported = uiPerformanceMonitor.exportMetrics();
      
      expect(exported).toMatchObject({
        exportTimestamp: expect.any(Number),
        configVersion: expect.any(String),
        apiCalls: expect.objectContaining({
          total: 1,
          cached: 1
        }),
        calculated: expect.objectContaining({
          apiCallReduction: expect.any(Number)
        })
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', async () => {
      uiOptimizationConfig.initialize.mockRejectedValue(new Error('Init failed'));
      
      await uiPerformanceMonitor.startMonitoring();
      
      // Should still be monitoring despite init error
      expect(uiPerformanceMonitor.isMonitoring).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error starting monitoring')
      );
    });

    test('should not track when monitoring is stopped', () => {
      expect(uiPerformanceMonitor.isMonitoring).toBe(false);
      
      uiPerformanceMonitor.trackApiCall('cached', '/api/products', 100);
      
      expect(uiPerformanceMonitor.metrics.apiCalls.total).toBe(0);
    });
  });
});
