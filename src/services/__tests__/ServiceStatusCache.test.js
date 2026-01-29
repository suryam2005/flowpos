/**
 * ServiceStatusCache Tests
 * 
 * Tests for Phase D Service Status Optimization
 * Requirements: 7.1, 7.2, 7.3
 */

import serviceStatusCache from '../ServiceStatusCache';

describe('ServiceStatusCache', () => {
  beforeEach(() => {
    // Clear cache before each test
    serviceStatusCache.clear();
  });

  describe('Basic Cache Operations', () => {
    test('should start with empty cache', () => {
      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(false);
      expect(serviceStatusCache.getServiceStatus('whatsapp')).toBeNull();
    });

    test('should store and retrieve service status', () => {
      const whatsappStatus = {
        configured: true,
        ready: true,
        fromNumber: '+1234567890'
      };

      serviceStatusCache.setServiceStatus('whatsapp', whatsappStatus);

      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(true);
      expect(serviceStatusCache.getServiceStatus('whatsapp')).toEqual(whatsappStatus);
    });

    test('should store timestamp with service status', () => {
      const status = { configured: true };
      const timestamp = Date.now();

      serviceStatusCache.setServiceStatus('whatsapp', status, timestamp);

      expect(serviceStatusCache.getLastFetchTime('whatsapp')).toBe(timestamp);
    });

    test('should handle multiple services', () => {
      const whatsappStatus = { configured: true };
      const emailStatus = { initialized: true };

      serviceStatusCache.setServiceStatus('whatsapp', whatsappStatus);
      serviceStatusCache.setServiceStatus('email', emailStatus);

      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(true);
      expect(serviceStatusCache.hasServiceStatus('email')).toBe(true);
      expect(serviceStatusCache.getServiceStatus('whatsapp')).toEqual(whatsappStatus);
      expect(serviceStatusCache.getServiceStatus('email')).toEqual(emailStatus);
    });
  });

  describe('Cache Management', () => {
    test('should clear all service status data', () => {
      serviceStatusCache.setServiceStatus('whatsapp', { configured: true });
      serviceStatusCache.setServiceStatus('email', { initialized: true });

      serviceStatusCache.clear();

      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(false);
      expect(serviceStatusCache.hasServiceStatus('email')).toBe(false);
      expect(serviceStatusCache.getCachedServices()).toEqual([]);
    });

    test('should clear specific service status', () => {
      serviceStatusCache.setServiceStatus('whatsapp', { configured: true });
      serviceStatusCache.setServiceStatus('email', { initialized: true });

      serviceStatusCache.clearService('whatsapp');

      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(false);
      expect(serviceStatusCache.hasServiceStatus('email')).toBe(true);
    });

    test('should return cached service names', () => {
      serviceStatusCache.setServiceStatus('whatsapp', { configured: true });
      serviceStatusCache.setServiceStatus('email', { initialized: true });

      const cachedServices = serviceStatusCache.getCachedServices();
      expect(cachedServices).toContain('whatsapp');
      expect(cachedServices).toContain('email');
      expect(cachedServices).toHaveLength(2);
    });
  });

  describe('Data Integrity', () => {
    test('should create copy of status object to prevent mutations', () => {
      const originalStatus = { configured: true, ready: false };
      serviceStatusCache.setServiceStatus('whatsapp', originalStatus);

      // Modify original object
      originalStatus.ready = true;

      // Cached version should be unchanged
      const cachedStatus = serviceStatusCache.getServiceStatus('whatsapp');
      expect(cachedStatus.ready).toBe(false);
    });

    test('should handle invalid parameters gracefully', () => {
      // Invalid service name
      serviceStatusCache.setServiceStatus('', { configured: true });
      expect(serviceStatusCache.hasServiceStatus('')).toBe(false);

      // Invalid status object - should not crash but also not store
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      serviceStatusCache.setServiceStatus('whatsapp', null);
      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('Statistics and Debugging', () => {
    test('should provide cache statistics', () => {
      const whatsappStatus = { configured: true };
      const emailStatus = { initialized: true };

      serviceStatusCache.setServiceStatus('whatsapp', whatsappStatus);
      serviceStatusCache.setServiceStatus('email', emailStatus);

      const stats = serviceStatusCache.getStats();

      expect(stats.isInitialized).toBe(true);
      expect(stats.serviceCount).toBe(2);
      expect(stats.services.whatsapp).toBeDefined();
      expect(stats.services.email).toBeDefined();
      expect(stats.services.whatsapp.statusKeys).toEqual(['configured']);
      expect(stats.services.email.statusKeys).toEqual(['initialized']);
    });

    test('should validate in-memory only storage', () => {
      const validation = serviceStatusCache.validateInMemoryOnly();

      expect(validation.inMemoryOnly).toBe(true);
      expect(validation.storageType).toBe('memory');
    });
  });

  describe('Requirements Validation', () => {
    test('should treat status as session-known after first check (Requirement 7.1)', () => {
      // First check - no cache
      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(false);

      // Store status (simulates first API call)
      serviceStatusCache.setServiceStatus('whatsapp', { configured: true });

      // Subsequent checks - cache available
      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(true);
      expect(serviceStatusCache.getServiceStatus('whatsapp')).toEqual({ configured: true });
    });

    test('should support manual refresh by clearing specific service (Requirement 7.2)', () => {
      // Store initial status
      serviceStatusCache.setServiceStatus('whatsapp', { configured: true });
      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(true);

      // Manual refresh - clear specific service
      serviceStatusCache.clearService('whatsapp');
      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(false);

      // Can store fresh status after manual refresh
      serviceStatusCache.setServiceStatus('whatsapp', { configured: false });
      expect(serviceStatusCache.getServiceStatus('whatsapp')).toEqual({ configured: false });
    });

    test('should clear all cache on logout/restart (Requirement 7.3)', () => {
      // Store multiple service statuses
      serviceStatusCache.setServiceStatus('whatsapp', { configured: true });
      serviceStatusCache.setServiceStatus('email', { initialized: true });

      // Simulate logout/restart
      serviceStatusCache.clear();

      // All cache should be cleared
      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(false);
      expect(serviceStatusCache.hasServiceStatus('email')).toBe(false);
      expect(serviceStatusCache.getCachedServices()).toEqual([]);
    });
  });
});