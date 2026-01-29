/**
 * BusinessLogicMonitor.test.js - Test business logic bypass monitoring
 * 
 * Tests the monitoring of critical business operations to ensure that
 * UI optimizations never bypass essential business rules, inventory validation,
 * order processing, or authentication checks.
 * 
 * Requirements: 8.3, 8.4, 8.5, 8.6, 8.7, 8.8 (API Contract Preservation)
 */

import businessLogicMonitor from '../BusinessLogicMonitor';
import uiPerformanceMonitor from '../UIPerformanceMonitor';
import RollbackUtility from '../../utils/RollbackUtility';

// Mock dependencies
jest.mock('../UIPerformanceMonitor');
jest.mock('../../utils/RollbackUtility');

describe('BusinessLogicMonitor', () => {
  beforeEach(() => {
    // Reset businessLogicMonitor state for each test
    businessLogicMonitor.isMonitoring = false;
    businessLogicMonitor.consecutiveBypasses = 0;
    businessLogicMonitor.recentBypasses = [];
    
    // Reset critical operations
    for (const category of Object.values(businessLogicMonitor.criticalOperations)) {
      for (const operation of Object.values(category)) {
        operation.bypassed = 0;
        operation.total = 0;
      }
    }
    
    if (businessLogicMonitor.checkInterval) {
      clearInterval(businessLogicMonitor.checkInterval);
      businessLogicMonitor.checkInterval = null;
    }
    
    // Mock performance businessLogicMonitor
    uiPerformanceMonitor.recordBusinessLogicAlert = jest.fn();
    
    // Mock rollback utility
    RollbackUtility.enableRollback = jest.fn().mockResolvedValue({ success: true });
    
    // Clear console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    businessLogicMonitor.stopMonitoring();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Monitoring Lifecycle', () => {
    test('should start monitoring successfully', () => {
      expect(businessLogicMonitor.isMonitoring).toBe(false);
      
      businessLogicMonitor.startMonitoring();
      
      expect(businessLogicMonitor.isMonitoring).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Business logic monitoring started')
      );
    });

    test('should not start monitoring twice', () => {
      businessLogicMonitor.startMonitoring();
      businessLogicMonitor.startMonitoring();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Already monitoring')
      );
    });

    test('should stop monitoring successfully', () => {
      businessLogicMonitor.startMonitoring();
      expect(businessLogicMonitor.isMonitoring).toBe(true);
      
      businessLogicMonitor.stopMonitoring();
      
      expect(businessLogicMonitor.isMonitoring).toBe(false);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Business logic monitoring stopped')
      );
    });
  });

  describe('Inventory Validation Tracking', () => {
    beforeEach(() => {
      businessLogicMonitor.startMonitoring();
    });

    test('should track successful inventory validation', () => {
      businessLogicMonitor.trackInventoryValidation('product-123', 5, true, { available: 10 });
      
      const operation = businessLogicMonitor.criticalOperations.inventory.stockValidation;
      expect(operation.total).toBe(1);
      expect(operation.bypassed).toBe(0);
      expect(businessLogicMonitor.consecutiveBypasses).toBe(0);
    });

    test('should detect inventory validation bypass', () => {
      const alertSpy = jest.spyOn(businessLogicMonitor, 'alertBusinessLogicBypass');
      
      businessLogicMonitor.trackInventoryValidation('product-123', 5, false, { error: 'Bypassed' });
      
      const operation = businessLogicMonitor.criticalOperations.inventory.stockValidation;
      expect(operation.total).toBe(1);
      expect(operation.bypassed).toBe(1);
      expect(businessLogicMonitor.consecutiveBypasses).toBe(1);
      expect(alertSpy).toHaveBeenCalled();
    });

    test('should reset consecutive bypasses on successful validation', () => {
      // Create some bypasses
      businessLogicMonitor.trackInventoryValidation('product-1', 1, false);
      businessLogicMonitor.trackInventoryValidation('product-2', 1, false);
      expect(businessLogicMonitor.consecutiveBypasses).toBe(2);
      
      // Successful validation should reset counter
      businessLogicMonitor.trackInventoryValidation('product-3', 1, true);
      expect(businessLogicMonitor.consecutiveBypasses).toBe(0);
    });
  });

  describe('Order Creation Tracking', () => {
    beforeEach(() => {
      businessLogicMonitor.startMonitoring();
    });

    test('should track successful order creation', () => {
      const items = [{ id: 'product-1', quantity: 2 }];
      businessLogicMonitor.trackOrderCreation('order-123', items, true, { total: 100 });
      
      const operation = businessLogicMonitor.criticalOperations.orders.orderCreation;
      expect(operation.total).toBe(1);
      expect(operation.bypassed).toBe(0);
    });

    test('should detect order creation bypass', () => {
      const alertSpy = jest.spyOn(businessLogicMonitor, 'alertBusinessLogicBypass');
      const items = [{ id: 'product-1', quantity: 2 }];
      
      businessLogicMonitor.trackOrderCreation('order-123', items, false, { error: 'Bypassed' });
      
      const operation = businessLogicMonitor.criticalOperations.orders.orderCreation;
      expect(operation.total).toBe(1);
      expect(operation.bypassed).toBe(1);
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  describe('Authentication Tracking', () => {
    beforeEach(() => {
      businessLogicMonitor.startMonitoring();
    });

    test('should track successful login authentication', () => {
      businessLogicMonitor.trackAuthentication('user-123', 'login', true, { token: 'abc123' });
      
      const operation = businessLogicMonitor.criticalOperations.auth.loginValidation;
      expect(operation.total).toBe(1);
      expect(operation.bypassed).toBe(0);
    });

    test('should track successful token validation', () => {
      businessLogicMonitor.trackAuthentication('user-123', 'token', true, { valid: true });
      
      const operation = businessLogicMonitor.criticalOperations.auth.tokenValidation;
      expect(operation.total).toBe(1);
      expect(operation.bypassed).toBe(0);
    });

    test('should detect authentication bypass', () => {
      const alertSpy = jest.spyOn(businessLogicMonitor, 'alertBusinessLogicBypass');
      
      businessLogicMonitor.trackAuthentication('user-123', 'login', false, { error: 'Bypassed' });
      
      const operation = businessLogicMonitor.criticalOperations.auth.loginValidation;
      expect(operation.total).toBe(1);
      expect(operation.bypassed).toBe(1);
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  describe('API Contract Tracking', () => {
    beforeEach(() => {
      businessLogicMonitor.startMonitoring();
    });

    test('should track compliant API calls', () => {
      businessLogicMonitor.trackApiContract('/api/products', { filter: 'active' }, true, { status: 200 });
      
      const operation = businessLogicMonitor.criticalOperations.api.endpointCalls;
      expect(operation.total).toBe(1);
      expect(operation.bypassed).toBe(0);
    });

    test('should detect API contract violations', () => {
      const alertSpy = jest.spyOn(businessLogicMonitor, 'alertBusinessLogicBypass');
      
      businessLogicMonitor.trackApiContract('/api/products', { filter: 'active' }, false, { status: 400 });
      
      const operation = businessLogicMonitor.criticalOperations.api.endpointCalls;
      expect(operation.total).toBe(1);
      expect(operation.bypassed).toBe(1);
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  describe('Business Logic Alerts', () => {
    beforeEach(() => {
      businessLogicMonitor.startMonitoring();
    });

    test('should alert on business logic bypass', () => {
      const bypassEvent = {
        category: 'inventory',
        operation: 'stockValidation',
        timestamp: Date.now(),
        metadata: { productId: 'test-123' },
        severity: 'CRITICAL'
      };
      
      businessLogicMonitor.alertBusinessLogicBypass(bypassEvent);
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: Business logic bypassed'),
        expect.any(String),
        bypassEvent
      );
      
      expect(uiPerformanceMonitor.recordBusinessLogicAlert).toHaveBeenCalledWith(
        'BUSINESS_LOGIC_BYPASS',
        expect.objectContaining({
          category: 'inventory',
          operation: 'stockValidation'
        })
      );
    });

    test('should send external alerts', () => {
      const sendSpy = jest.spyOn(businessLogicMonitor, 'sendExternalAlert');
      const bypassEvent = {
        category: 'orders',
        operation: 'orderCreation',
        timestamp: Date.now(),
        severity: 'CRITICAL'
      };
      
      businessLogicMonitor.alertBusinessLogicBypass(bypassEvent);
      
      expect(sendSpy).toHaveBeenCalledWith(bypassEvent);
    });
  });

  describe('Emergency Thresholds', () => {
    beforeEach(() => {
      businessLogicMonitor.startMonitoring();
    });

    test('should trigger emergency rollback on too many total bypasses', async () => {
      const triggerSpy = jest.spyOn(businessLogicMonitor, 'triggerEmergencyRollback');
      
      // Generate bypasses beyond emergency threshold (10)
      for (let i = 0; i < 11; i++) {
        businessLogicMonitor.recentBypasses.push({
          category: 'inventory',
          operation: 'stockValidation',
          timestamp: Date.now(),
          severity: 'CRITICAL'
        });
      }
      
      await businessLogicMonitor.checkEmergencyThresholds();
      
      expect(triggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Too many business logic bypasses: 11')
      );
    });

    test('should trigger emergency rollback on too many consecutive bypasses', async () => {
      const triggerSpy = jest.spyOn(businessLogicMonitor, 'triggerEmergencyRollback');
      
      businessLogicMonitor.consecutiveBypasses = 4; // Beyond threshold of 3
      
      await businessLogicMonitor.checkEmergencyThresholds();
      
      expect(triggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Too many consecutive bypasses: 4')
      );
    });

    test('should trigger emergency rollback on high bypass rate per minute', async () => {
      const triggerSpy = jest.spyOn(businessLogicMonitor, 'triggerEmergencyRollback');
      const now = Date.now();
      
      // Generate 6 bypasses in the last minute (beyond threshold of 5)
      for (let i = 0; i < 6; i++) {
        businessLogicMonitor.recentBypasses.push({
          category: 'inventory',
          operation: 'stockValidation',
          timestamp: now - (i * 5000), // 5 seconds apart
          severity: 'CRITICAL'
        });
      }
      
      await businessLogicMonitor.checkEmergencyThresholds();
      
      expect(triggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Too many bypasses per minute: 6')
      );
    });

    test('should not trigger rollback below thresholds', async () => {
      const triggerSpy = jest.spyOn(businessLogicMonitor, 'triggerEmergencyRollback');
      
      // Add some bypasses but below thresholds
      businessLogicMonitor.recentBypasses.push({
        category: 'inventory',
        operation: 'stockValidation',
        timestamp: Date.now(),
        severity: 'CRITICAL'
      });
      businessLogicMonitor.consecutiveBypasses = 2;
      
      await businessLogicMonitor.checkEmergencyThresholds();
      
      expect(triggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('Emergency Rollback', () => {
    beforeEach(() => {
      businessLogicMonitor.startMonitoring();
    });

    test('should trigger emergency rollback successfully', async () => {
      await businessLogicMonitor.triggerEmergencyRollback('Test emergency');
      
      expect(RollbackUtility.enableRollback).toHaveBeenCalledWith(
        'Emergency rollback: Test emergency'
      );
      
      expect(uiPerformanceMonitor.recordBusinessLogicAlert).toHaveBeenCalledWith(
        'EMERGENCY_ROLLBACK',
        expect.objectContaining({
          reason: 'Test emergency'
        })
      );
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('TRIGGERING EMERGENCY ROLLBACK'),
        'Test emergency'
      );
    });

    test('should handle rollback errors gracefully', async () => {
      RollbackUtility.enableRollback.mockRejectedValue(new Error('Rollback failed'));
      
      await businessLogicMonitor.triggerEmergencyRollback('Test emergency');
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error triggering emergency rollback'),
        expect.any(Error)
      );
    });
  });

  describe('Bypass Report Generation', () => {
    beforeEach(() => {
      businessLogicMonitor.startMonitoring();
    });

    test('should generate comprehensive bypass report', () => {
      // Add some test data
      businessLogicMonitor.trackInventoryValidation('product-1', 1, true);
      businessLogicMonitor.trackInventoryValidation('product-2', 1, false);
      businessLogicMonitor.trackOrderCreation('order-1', [], true);
      businessLogicMonitor.trackAuthentication('user-1', 'login', true);
      
      const report = businessLogicMonitor.generateBypassReport();
      
      expect(report).toMatchObject({
        timestamp: expect.any(Number),
        totalOperations: 3,
        totalBypasses: 1,
        bypassRate: expect.any(Number),
        recentBypasses: expect.any(Number),
        consecutiveBypasses: expect.any(Number),
        categories: expect.objectContaining({
          inventory: expect.objectContaining({
            total: 2,
            bypassed: 1,
            bypassRate: 0.5
          }),
          orders: expect.objectContaining({
            total: 1,
            bypassed: 0,
            bypassRate: 0
          }),
          auth: expect.objectContaining({
            total: 1,
            bypassed: 0,
            bypassRate: 0
          })
        }),
        thresholds: expect.any(Object),
        isHealthy: expect.any(Boolean)
      });
    });

    test('should calculate bypass rates correctly', () => {
      // 2 successful, 1 bypass = 33.33% bypass rate
      businessLogicMonitor.trackInventoryValidation('product-1', 1, true);
      businessLogicMonitor.trackInventoryValidation('product-2', 1, true);
      businessLogicMonitor.trackInventoryValidation('product-3', 1, false);
      
      const report = businessLogicMonitor.generateBypassReport();
      
      expect(report.totalOperations).toBe(3);
      expect(report.totalBypasses).toBe(1);
      expect(report.bypassRate).toBeCloseTo(0.333, 2);
      expect(report.categories.inventory.bypassRate).toBeCloseTo(0.333, 2);
    });

    test('should determine health status correctly', () => {
      // Healthy scenario
      businessLogicMonitor.trackInventoryValidation('product-1', 1, true);
      businessLogicMonitor.trackOrderCreation('order-1', [], true);
      
      let report = businessLogicMonitor.generateBypassReport();
      expect(report.isHealthy).toBe(true);
      
      // Unhealthy scenario - high bypass rate
      for (let i = 0; i < 10; i++) {
        businessLogicMonitor.trackInventoryValidation(`product-${i}`, 1, false);
      }
      
      report = businessLogicMonitor.generateBypassReport();
      expect(report.isHealthy).toBe(false);
    });
  });

  describe('Periodic Checks', () => {
    beforeEach(() => {
      businessLogicMonitor.startMonitoring();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should perform periodic checks', () => {
      const checkSpy = jest.spyOn(businessLogicMonitor, 'performPeriodicCheck');
      
      // Fast-forward time by 1 minute
      jest.advanceTimersByTime(60000);
      
      expect(checkSpy).toHaveBeenCalled();
    });

    test('should alert on high bypass rate during periodic check', () => {
      // Create high bypass rate scenario
      for (let i = 0; i < 10; i++) {
        businessLogicMonitor.trackInventoryValidation(`product-${i}`, 1, false);
      }
      businessLogicMonitor.trackInventoryValidation('product-success', 1, true);
      
      businessLogicMonitor.performPeriodicCheck();
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('High bypass rate detected')
      );
      
      expect(uiPerformanceMonitor.recordBusinessLogicAlert).toHaveBeenCalledWith(
        'HIGH_BYPASS_RATE',
        expect.objectContaining({
          bypassRate: expect.any(Number),
          threshold: businessLogicMonitor.alertThresholds.maxBypassRate
        })
      );
    });
  });

  describe('Configuration and Management', () => {
    test('should update alert thresholds', () => {
      const newThresholds = {
        maxBypassRate: 0.02,
        maxConsecutiveBypasses: 5
      };
      
      businessLogicMonitor.updateThresholds(newThresholds);
      
      expect(businessLogicMonitor.alertThresholds.maxBypassRate).toBe(0.02);
      expect(businessLogicMonitor.alertThresholds.maxConsecutiveBypasses).toBe(5);
      expect(businessLogicMonitor.alertThresholds.maxBypassesPerMinute).toBe(5); // Unchanged
    });

    test('should reset statistics', () => {
      businessLogicMonitor.startMonitoring();
      
      // Add some data
      businessLogicMonitor.trackInventoryValidation('product-1', 1, false);
      businessLogicMonitor.trackOrderCreation('order-1', [], false);
      businessLogicMonitor.consecutiveBypasses = 3;
      businessLogicMonitor.recentBypasses = [{ test: true }];
      
      expect(businessLogicMonitor.criticalOperations.inventory.stockValidation.total).toBe(1);
      expect(businessLogicMonitor.criticalOperations.orders.orderCreation.bypassed).toBe(1);
      expect(businessLogicMonitor.consecutiveBypasses).toBe(3);
      expect(businessLogicMonitor.recentBypasses).toHaveLength(1);
      
      businessLogicMonitor.resetStatistics();
      
      expect(businessLogicMonitor.criticalOperations.inventory.stockValidation.total).toBe(0);
      expect(businessLogicMonitor.criticalOperations.orders.orderCreation.bypassed).toBe(0);
      expect(businessLogicMonitor.consecutiveBypasses).toBe(0);
      expect(businessLogicMonitor.recentBypasses).toHaveLength(0);
    });

    test('should get current status', () => {
      businessLogicMonitor.startMonitoring();
      businessLogicMonitor.trackInventoryValidation('product-1', 1, true);
      
      const status = businessLogicMonitor.getStatus();
      
      expect(status).toMatchObject({
        isMonitoring: true,
        report: expect.objectContaining({
          totalOperations: 1,
          totalBypasses: 0,
          isHealthy: true
        }),
        recentBypasses: expect.any(Array),
        thresholds: expect.any(Object)
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown operations gracefully', () => {
      businessLogicMonitor.startMonitoring();
      
      businessLogicMonitor.trackOperation('unknown', 'unknownOp', true);
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown operation'),
        { category: 'unknown', operation: 'unknownOp' }
      );
    });

    test('should not track when monitoring is stopped', () => {
      expect(businessLogicMonitor.isMonitoring).toBe(false);
      
      businessLogicMonitor.trackInventoryValidation('product-1', 1, false);
      
      expect(businessLogicMonitor.criticalOperations.inventory.stockValidation.total).toBe(0);
    });

    test('should clean old bypasses automatically', () => {
      businessLogicMonitor.startMonitoring();
      
      const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      const recentTimestamp = Date.now() - (2 * 60 * 1000); // 2 minutes ago
      
      businessLogicMonitor.recentBypasses = [
        { timestamp: oldTimestamp, category: 'old' },
        { timestamp: recentTimestamp, category: 'recent' }
      ];
      
      businessLogicMonitor.cleanOldBypasses();
      
      expect(businessLogicMonitor.recentBypasses).toHaveLength(1);
      expect(businessLogicMonitor.recentBypasses[0].category).toBe('recent');
    });
  });
});
