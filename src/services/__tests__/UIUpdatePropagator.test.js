/**
 * UIUpdatePropagator Tests
 * 
 * Tests the UI update propagation system for Phase B of UI Performance Optimization
 */

import uiUpdatePropagator from '../UIUpdatePropagator';

describe('UIUpdatePropagator', () => {
  beforeEach(() => {
    // Clear any existing registrations before each test
    uiUpdatePropagator.forceUnregisterAll();
    uiUpdatePropagator.initialize();
  });

  afterEach(() => {
    // Clean up after each test
    uiUpdatePropagator.clearSession();
  });

  describe('Initialization', () => {
    test('should initialize properly', () => {
      expect(uiUpdatePropagator.isReady()).toBe(true);
      expect(uiUpdatePropagator.getRegisteredScreens()).toEqual([]);
    });

    test('should clear session properly', () => {
      // Register a screen first
      const mockCallback = jest.fn();
      uiUpdatePropagator.registerScreen('TestScreen', mockCallback);
      expect(uiUpdatePropagator.getRegisteredScreens()).toContain('TestScreen');

      // Clear session
      uiUpdatePropagator.clearSession();
      expect(uiUpdatePropagator.isReady()).toBe(false);
      expect(uiUpdatePropagator.getRegisteredScreens()).toEqual([]);
    });
  });

  describe('Screen Registration', () => {
    test('should register screen with valid parameters', () => {
      const mockCallback = jest.fn();
      uiUpdatePropagator.registerScreen('POSScreen', mockCallback);

      expect(uiUpdatePropagator.isScreenRegistered('POSScreen')).toBe(true);
      expect(uiUpdatePropagator.getRegisteredScreens()).toContain('POSScreen');
    });

    test('should handle invalid screen name', () => {
      const mockCallback = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      uiUpdatePropagator.registerScreen('', mockCallback);
      uiUpdatePropagator.registerScreen(null, mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid screen name')
      );
      expect(uiUpdatePropagator.getRegisteredScreens()).toEqual([]);

      consoleSpy.mockRestore();
    });

    test('should handle invalid callback', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      uiUpdatePropagator.registerScreen('TestScreen', null);
      uiUpdatePropagator.registerScreen('TestScreen', 'not a function');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid update callback')
      );
      expect(uiUpdatePropagator.getRegisteredScreens()).toEqual([]);

      consoleSpy.mockRestore();
    });

    test('should unregister screen properly', () => {
      const mockCallback = jest.fn();
      uiUpdatePropagator.registerScreen('TestScreen', mockCallback);
      expect(uiUpdatePropagator.isScreenRegistered('TestScreen')).toBe(true);

      uiUpdatePropagator.unregisterScreen('TestScreen');
      expect(uiUpdatePropagator.isScreenRegistered('TestScreen')).toBe(false);
      expect(uiUpdatePropagator.getRegisteredScreens()).toEqual([]);
    });

    test('should handle unregistering non-existent screen', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      uiUpdatePropagator.unregisterScreen('NonExistentScreen');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Screen was not registered'),
        'NonExistentScreen'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Update Propagation', () => {
    test('should propagate product updates to registered screens', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      uiUpdatePropagator.registerScreen('POSScreen', mockCallback1);
      uiUpdatePropagator.registerScreen('ManageScreen', mockCallback2);

      uiUpdatePropagator.propagateProductUpdate();

      expect(mockCallback1).toHaveBeenCalledTimes(1);
      expect(mockCallback2).toHaveBeenCalledTimes(1);
    });

    test('should propagate order updates to registered screens', () => {
      const mockCallback = jest.fn();
      uiUpdatePropagator.registerScreen('OrdersScreen', mockCallback);

      uiUpdatePropagator.propagateOrderUpdate();

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('should propagate inventory updates to registered screens', () => {
      const mockCallback = jest.fn();
      uiUpdatePropagator.registerScreen('InventoryScreen', mockCallback);

      uiUpdatePropagator.propagateInventoryUpdate();

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('should handle no registered screens gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      uiUpdatePropagator.propagateProductUpdate();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No screens registered for updates')
      );

      consoleSpy.mockRestore();
    });

    test('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test callback error');
      });
      const workingCallback = jest.fn();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      uiUpdatePropagator.registerScreen('ErrorScreen', errorCallback);
      uiUpdatePropagator.registerScreen('WorkingScreen', workingCallback);

      uiUpdatePropagator.propagateProductUpdate();

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(workingCallback).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error triggering update for screen'),
        expect.objectContaining({
          screenName: 'ErrorScreen',
          updateType: 'PRODUCT_UPDATE',
          error: 'Test callback error'
        })
      );

      consoleSpy.mockRestore();
    });

    test('should unregister screens with stale callbacks', () => {
      const staleCallback = jest.fn(() => {
        throw new Error('Cannot read properties of undefined');
      });

      uiUpdatePropagator.registerScreen('StaleScreen', staleCallback);
      expect(uiUpdatePropagator.isScreenRegistered('StaleScreen')).toBe(true);

      uiUpdatePropagator.propagateProductUpdate();

      // Screen should be automatically unregistered due to stale callback
      expect(uiUpdatePropagator.isScreenRegistered('StaleScreen')).toBe(false);
    });
  });

  describe('Statistics and Debugging', () => {
    test('should provide accurate statistics', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      uiUpdatePropagator.registerScreen('Screen1', mockCallback1);
      uiUpdatePropagator.registerScreen('Screen2', mockCallback2);

      const stats = uiUpdatePropagator.getStats();

      expect(stats.isInitialized).toBe(true);
      expect(stats.registeredScreensCount).toBe(2);
      expect(stats.registeredScreens).toContain('Screen1');
      expect(stats.registeredScreens).toContain('Screen2');
      expect(stats.memoryLeakRisk).toBe(false);
    });

    test('should detect memory leak risk', () => {
      // Register more than 10 screens to trigger memory leak warning
      for (let i = 0; i < 12; i++) {
        uiUpdatePropagator.registerScreen(`Screen${i}`, jest.fn());
      }

      const stats = uiUpdatePropagator.getStats();
      expect(stats.memoryLeakRisk).toBe(true);
    });

    test('should validate memory leak prevention', () => {
      const mockCallback = jest.fn();
      uiUpdatePropagator.registerScreen('TestScreen', mockCallback);

      const validation = uiUpdatePropagator.validateMemoryLeakPrevention();

      expect(validation.registeredScreensCount).toBe(1);
      expect(validation.memoryLeakRisk).toBe(false);
      expect(validation.recommendation).toContain('Memory usage looks healthy');
      expect(validation.registeredScreens).toContain('TestScreen');
    });
  });

  describe('Multiple Screen Scenarios', () => {
    test('should handle multiple screens registering and unregistering', () => {
      const callbacks = {
        pos: jest.fn(),
        manage: jest.fn(),
        inventory: jest.fn(),
        orders: jest.fn()
      };

      // Register multiple screens
      Object.keys(callbacks).forEach(screenName => {
        uiUpdatePropagator.registerScreen(screenName, callbacks[screenName]);
      });

      expect(uiUpdatePropagator.getRegisteredScreens()).toHaveLength(4);

      // Propagate update - all should be called
      uiUpdatePropagator.propagateProductUpdate();
      Object.values(callbacks).forEach(callback => {
        expect(callback).toHaveBeenCalledTimes(1);
      });

      // Unregister some screens
      uiUpdatePropagator.unregisterScreen('pos');
      uiUpdatePropagator.unregisterScreen('manage');

      expect(uiUpdatePropagator.getRegisteredScreens()).toHaveLength(2);

      // Propagate again - only remaining screens should be called
      jest.clearAllMocks();
      uiUpdatePropagator.propagateOrderUpdate();

      expect(callbacks.pos).not.toHaveBeenCalled();
      expect(callbacks.manage).not.toHaveBeenCalled();
      expect(callbacks.inventory).toHaveBeenCalledTimes(1);
      expect(callbacks.orders).toHaveBeenCalledTimes(1);
    });
  });
});