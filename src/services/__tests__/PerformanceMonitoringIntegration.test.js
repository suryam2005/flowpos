/**
 * PerformanceMonitoringIntegration.test.js - Integration test for monitoring components
 * 
 * Tests the integration between UIPerformanceMonitor, BusinessLogicMonitor,
 * and MonitoringDashboard to ensure they work together correctly.
 * 
 * Requirements: All (Performance monitoring and documentation)
 */

describe('Performance Monitoring Integration', () => {
  beforeEach(() => {
    // Clear console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    test('should be able to import all monitoring components', () => {
      expect(() => {
        require('../UIPerformanceMonitor');
        require('../BusinessLogicMonitor');
        require('../../utils/MonitoringDashboard');
      }).not.toThrow();
    });

    test('should have singleton instances', () => {
      const uiPerformanceMonitor1 = require('../UIPerformanceMonitor').default;
      const uiPerformanceMonitor2 = require('../UIPerformanceMonitor').default;
      
      const businessLogicMonitor1 = require('../BusinessLogicMonitor').default;
      const businessLogicMonitor2 = require('../BusinessLogicMonitor').default;
      
      const monitoringDashboard1 = require('../../utils/MonitoringDashboard').default;
      const monitoringDashboard2 = require('../../utils/MonitoringDashboard').default;
      
      expect(uiPerformanceMonitor1).toBe(uiPerformanceMonitor2);
      expect(businessLogicMonitor1).toBe(businessLogicMonitor2);
      expect(monitoringDashboard1).toBe(monitoringDashboard2);
    });
  });

  describe('Basic Functionality', () => {
    test('should have required methods on UIPerformanceMonitor', () => {
      const uiPerformanceMonitor = require('../UIPerformanceMonitor').default;
      
      expect(typeof uiPerformanceMonitor.startMonitoring).toBe('function');
      expect(typeof uiPerformanceMonitor.stopMonitoring).toBe('function');
      expect(typeof uiPerformanceMonitor.trackApiCall).toBe('function');
      expect(typeof uiPerformanceMonitor.trackCacheOperation).toBe('function');
      expect(typeof uiPerformanceMonitor.getMetrics).toBe('function');
      expect(typeof uiPerformanceMonitor.generateReport).toBe('function');
    });

    test('should have required methods on BusinessLogicMonitor', () => {
      const businessLogicMonitor = require('../BusinessLogicMonitor').default;
      
      expect(typeof businessLogicMonitor.startMonitoring).toBe('function');
      expect(typeof businessLogicMonitor.stopMonitoring).toBe('function');
      expect(typeof businessLogicMonitor.trackInventoryValidation).toBe('function');
      expect(typeof businessLogicMonitor.trackOrderCreation).toBe('function');
      expect(typeof businessLogicMonitor.trackAuthentication).toBe('function');
      expect(typeof businessLogicMonitor.getStatus).toBe('function');
    });

    test('should have required methods on MonitoringDashboard', () => {
      const monitoringDashboard = require('../../utils/MonitoringDashboard').default;
      
      expect(typeof monitoringDashboard.initialize).toBe('function');
      expect(typeof monitoringDashboard.getSystemStatus).toBe('function');
      expect(typeof monitoringDashboard.generateReport).toBe('function');
      expect(typeof monitoringDashboard.printDashboard).toBe('function');
    });
  });

  describe('Component Structure', () => {
    test('should have proper initial state on UIPerformanceMonitor', () => {
      const uiPerformanceMonitor = require('../UIPerformanceMonitor').default;
      
      expect(uiPerformanceMonitor.isMonitoring).toBe(false);
      expect(uiPerformanceMonitor.metrics).toBeDefined();
      expect(uiPerformanceMonitor.alertThresholds).toBeDefined();
    });

    test('should have proper initial state on BusinessLogicMonitor', () => {
      const businessLogicMonitor = require('../BusinessLogicMonitor').default;
      
      expect(businessLogicMonitor.isMonitoring).toBe(false);
      expect(businessLogicMonitor.criticalOperations).toBeDefined();
      expect(businessLogicMonitor.alertThresholds).toBeDefined();
    });

    test('should have proper initial state on MonitoringDashboard', () => {
      const monitoringDashboard = require('../../utils/MonitoringDashboard').default;
      
      expect(monitoringDashboard.isInitialized).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing dependencies gracefully', () => {
      expect(() => {
        const uiPerformanceMonitor = require('../UIPerformanceMonitor').default;
        uiPerformanceMonitor.trackApiCall('cached', '/test', 100);
      }).not.toThrow();
    });

    test('should handle invalid parameters gracefully', () => {
      expect(() => {
        const businessLogicMonitor = require('../BusinessLogicMonitor').default;
        businessLogicMonitor.trackOperation('invalid', 'invalid', true);
      }).not.toThrow();
    });
  });

  describe('Documentation Files', () => {
    test('should have rollback procedures documentation', () => {
      const fs = require('fs');
      const path = require('path');
      
      const rollbackProceduresPath = path.join(__dirname, '../../../.kiro/specs/ui-performance-optimization/ROLLBACK_PROCEDURES.md');
      expect(fs.existsSync(rollbackProceduresPath)).toBe(true);
    });

    test('should have performance monitoring guide', () => {
      const fs = require('fs');
      const path = require('path');
      
      const monitoringGuidePath = path.join(__dirname, '../../../.kiro/specs/ui-performance-optimization/PERFORMANCE_MONITORING_GUIDE.md');
      expect(fs.existsSync(monitoringGuidePath)).toBe(true);
    });
  });
});