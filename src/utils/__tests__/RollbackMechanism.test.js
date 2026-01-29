/**
 * RollbackMechanism.test.js - Test rollback mechanism functionality
 * 
 * Tests the ability to disable session reuse and return to direct API reads
 * Ensures clean rollback without data loss
 * Validates simple rollback process
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

import RollbackUtility from '../RollbackUtility';
import uiOptimizationConfig from '../../services/UIOptimizationConfig';

// Mock AsyncStorage for testing
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('RollbackMechanism', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset configuration to defaults
    uiOptimizationConfig.isInitialized = false;
    uiOptimizationConfig.config = {
      sessionCachingEnabled: true,
      uiPropagationEnabled: true,
      computationReuseEnabled: true,
      serviceStatusOptimizationEnabled: true,
      rollbackMode: false,
      rollbackReason: null,
      rollbackTimestamp: null,
      debugMode: false,
      performanceMonitoring: true,
      configVersion: '1.0.0',
      lastUpdated: null
    };
  });

  describe('Rollback Enablement', () => {
    test('should enable rollback mode successfully', async () => {
      // Mock AsyncStorage to return null (no stored config)
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await RollbackUtility.enableRollback('Test rollback');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Rollback mode enabled successfully');
      expect(result.reason).toBe('Test rollback');
      expect(result.optimizationStatus.rollbackMode).toBe(true);
      expect(result.optimizationStatus.allOptimizationsActive).toBe(false);
    });

    test('should disable all optimizations when rollback is enabled', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      await RollbackUtility.enableRollback('Test rollback');

      const status = await RollbackUtility.getRollbackStatus();
      
      expect(status.optimizationStatus.sessionCaching).toBe(false);
      expect(status.optimizationStatus.uiPropagation).toBe(false);
      expect(status.optimizationStatus.computationReuse).toBe(false);
      expect(status.optimizationStatus.serviceStatusOptimization).toBe(false);
      expect(status.optimizationStatus.rollbackMode).toBe(true);
    });

    test('should store rollback reason and timestamp', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      const testReason = 'Performance issues detected';
      const beforeTime = Date.now();
      
      await RollbackUtility.enableRollback(testReason);
      
      const afterTime = Date.now();
      const status = await RollbackUtility.getRollbackStatus();

      expect(status.rollbackReason).toBe(testReason);
      expect(status.rollbackTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(status.rollbackTimestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Rollback Disablement', () => {
    test('should disable rollback mode successfully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      // First enable rollback
      await RollbackUtility.enableRollback('Test rollback');
      
      // Then disable it
      const result = await RollbackUtility.disableRollback();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Rollback mode disabled successfully');
      expect(result.optimizationStatus.rollbackMode).toBe(false);
      expect(result.optimizationStatus.allOptimizationsActive).toBe(true);
    });

    test('should re-enable all optimizations when rollback is disabled', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      // Enable rollback first
      await RollbackUtility.enableRollback('Test rollback');
      
      // Disable rollback
      await RollbackUtility.disableRollback();

      const status = await RollbackUtility.getRollbackStatus();
      
      expect(status.optimizationStatus.sessionCaching).toBe(true);
      expect(status.optimizationStatus.uiPropagation).toBe(true);
      expect(status.optimizationStatus.computationReuse).toBe(true);
      expect(status.optimizationStatus.serviceStatusOptimization).toBe(true);
      expect(status.optimizationStatus.rollbackMode).toBe(false);
    });

    test('should clear rollback reason and timestamp', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      // Enable rollback first
      await RollbackUtility.enableRollback('Test rollback');
      
      // Disable rollback
      await RollbackUtility.disableRollback();

      const status = await RollbackUtility.getRollbackStatus();

      expect(status.rollbackReason).toBeNull();
      expect(status.rollbackTimestamp).toBeNull();
      expect(status.rollbackAge).toBeNull();
    });
  });

  describe('Configuration Persistence', () => {
    test('should persist rollback configuration to AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      await RollbackUtility.enableRollback('Test rollback');

      // Verify AsyncStorage.setItem was called with correct configuration
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'ui_optimization_config',
        expect.stringContaining('"rollbackMode":true')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'ui_optimization_config',
        expect.stringContaining('"rollbackReason":"Test rollback"')
      );
    });

    test('should load rollback configuration from AsyncStorage', async () => {
      const storedConfig = JSON.stringify({
        sessionCachingEnabled: true,
        uiPropagationEnabled: true,
        computationReuseEnabled: true,
        serviceStatusOptimizationEnabled: true,
        rollbackMode: true,
        rollbackReason: 'Stored rollback',
        rollbackTimestamp: 1234567890,
        debugMode: false,
        performanceMonitoring: true,
        configVersion: '1.0.0'
      });

      mockAsyncStorage.getItem.mockResolvedValue(storedConfig);

      const status = await RollbackUtility.getRollbackStatus();

      expect(status.rollbackMode).toBe(true);
      expect(status.rollbackReason).toBe('Stored rollback');
      expect(status.rollbackTimestamp).toBe(1234567890);
    });
  });

  describe('Feature Toggle', () => {
    test('should toggle individual features', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      // Toggle session caching off
      const result = await RollbackUtility.toggleFeature('sessionCaching', false);

      expect(result.success).toBe(true);
      expect(result.feature).toBe('sessionCaching');
      expect(result.enabled).toBe(false);
      expect(result.optimizationStatus.sessionCaching).toBe(false);
      expect(result.optimizationStatus.uiPropagation).toBe(true); // Others should remain enabled
    });

    test('should reject invalid feature names', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await RollbackUtility.toggleFeature('invalidFeature', true);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid feature name');
      expect(result.validFeatures).toEqual([
        'sessionCaching',
        'uiPropagation', 
        'computationReuse',
        'serviceStatusOptimization'
      ]);
    });
  });

  describe('Configuration Reset', () => {
    test('should reset configuration to defaults', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      // Enable rollback first
      await RollbackUtility.enableRollback('Test rollback');
      
      // Reset to defaults
      const result = await RollbackUtility.resetToDefaults();

      expect(result.success).toBe(true);
      expect(result.optimizationStatus.rollbackMode).toBe(false);
      expect(result.optimizationStatus.allOptimizationsActive).toBe(true);
    });

    test('should clear stored configuration when requested', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      mockAsyncStorage.removeItem.mockResolvedValue();

      await RollbackUtility.resetToDefaults(true);

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('ui_optimization_config');
    });
  });

  describe('System Status', () => {
    test('should provide comprehensive system status', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      const status = await RollbackUtility.getSystemStatus();

      expect(status.success).toBe(true);
      expect(status).toHaveProperty('rollback');
      expect(status).toHaveProperty('optimizations');
      expect(status).toHaveProperty('configuration');
      expect(status).toHaveProperty('validation');
      expect(status).toHaveProperty('timestamp');
    });

    test('should validate configuration integrity', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const validation = await RollbackUtility.validateConfiguration();

      expect(validation.success).toBe(true);
      expect(validation.validation.isValid).toBe(true);
      expect(validation.validation.issues).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await RollbackUtility.enableRollback('Test rollback');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });

    test('should handle configuration save errors', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Save error'));

      const result = await RollbackUtility.enableRollback('Test rollback');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Save error');
    });
  });

  describe('Debug Mode', () => {
    test('should enable debug mode', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await RollbackUtility.setDebugMode(true);

      expect(result.success).toBe(true);
      expect(result.debugMode).toBe(true);
      expect(result.message).toContain('enabled');
    });

    test('should disable debug mode', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await RollbackUtility.setDebugMode(false);

      expect(result.success).toBe(true);
      expect(result.debugMode).toBe(false);
      expect(result.message).toContain('disabled');
    });
  });
});

describe('Integration with Optimization Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  test('should affect ProductFetchCoordinator behavior', async () => {
    // This test would require mocking the ProductFetchCoordinator
    // For now, we'll test that the configuration is properly set
    await RollbackUtility.enableRollback('Integration test');

    const status = await RollbackUtility.getRollbackStatus();
    expect(status.optimizationStatus.sessionCaching).toBe(false);
  });

  test('should affect UIUpdatePropagator behavior', async () => {
    // This test would require mocking the UIUpdatePropagator
    // For now, we'll test that the configuration is properly set
    await RollbackUtility.enableRollback('Integration test');

    const status = await RollbackUtility.getRollbackStatus();
    expect(status.optimizationStatus.uiPropagation).toBe(false);
  });

  test('should affect ComputationCache behavior', async () => {
    // This test would require mocking the ComputationCache
    // For now, we'll test that the configuration is properly set
    await RollbackUtility.enableRollback('Integration test');

    const status = await RollbackUtility.getRollbackStatus();
    expect(status.optimizationStatus.computationReuse).toBe(false);
  });

  test('should affect ServiceStatusCache behavior', async () => {
    // This test would require mocking the ServiceStatusCache
    // For now, we'll test that the configuration is properly set
    await RollbackUtility.enableRollback('Integration test');

    const status = await RollbackUtility.getRollbackStatus();
    expect(status.optimizationStatus.serviceStatusOptimization).toBe(false);
  });
});