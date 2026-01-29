/**
 * ComputationCache Tests
 * 
 * Tests for Phase C: Computation Reuse Infrastructure
 * Validates analytics caching and feature flag caching functionality
 */

import computationCache from '../ComputationCache';

describe('ComputationCache', () => {
  beforeEach(() => {
    // Clear cache before each test
    computationCache.clearAll();
  });

  afterEach(() => {
    // Clean up after each test
    computationCache.clearAll();
  });

  describe('Hash Generation', () => {
    test('should generate consistent hash for same orders data', () => {
      const orders1 = [
        { id: '1', total: 100, timestamp: '2024-01-01', items: [{ name: 'Product A', quantity: 2, price: 50 }] },
        { id: '2', total: 200, timestamp: '2024-01-02', items: [{ name: 'Product B', quantity: 1, price: 200 }] }
      ];

      const orders2 = [
        { id: '1', total: 100, timestamp: '2024-01-01', items: [{ name: 'Product A', quantity: 2, price: 50 }] },
        { id: '2', total: 200, timestamp: '2024-01-02', items: [{ name: 'Product B', quantity: 1, price: 200 }] }
      ];

      const hash1 = computationCache.generateOrdersHash(orders1);
      const hash2 = computationCache.generateOrdersHash(orders2);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
    });

    test('should generate different hash when orders change', () => {
      const orders1 = [
        { id: '1', total: 100, timestamp: '2024-01-01', items: [{ name: 'Product A', quantity: 2, price: 50 }] }
      ];

      const orders2 = [
        { id: '1', total: 150, timestamp: '2024-01-01', items: [{ name: 'Product A', quantity: 3, price: 50 }] }
      ];

      const hash1 = computationCache.generateOrdersHash(orders1);
      const hash2 = computationCache.generateOrdersHash(orders2);

      expect(hash1).not.toBe(hash2);
    });

    test('should handle empty orders array', () => {
      const hash1 = computationCache.generateOrdersHash([]);
      const hash2 = computationCache.generateOrdersHash(null);
      const hash3 = computationCache.generateOrdersHash(undefined);

      expect(hash1).toBe('empty_orders');
      expect(hash2).toBe('empty_orders');
      expect(hash3).toBe('empty_orders');
    });

    test('should generate same hash regardless of order array sequence', () => {
      const orders1 = [
        { id: '2', total: 200, timestamp: '2024-01-02', items: [] },
        { id: '1', total: 100, timestamp: '2024-01-01', items: [] }
      ];

      const orders2 = [
        { id: '1', total: 100, timestamp: '2024-01-01', items: [] },
        { id: '2', total: 200, timestamp: '2024-01-02', items: [] }
      ];

      const hash1 = computationCache.generateOrdersHash(orders1);
      const hash2 = computationCache.generateOrdersHash(orders2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Analytics Caching', () => {
    test('should cache and retrieve analytics data', () => {
      const ordersHash = 'test_hash_123';
      const analyticsData = {
        totalRevenue: 1000,
        totalOrders: 10,
        averageOrderValue: 100
      };

      // Cache should be empty initially
      expect(computationCache.getAnalytics(ordersHash)).toBeNull();
      expect(computationCache.hasAnalytics(ordersHash)).toBe(false);

      // Set analytics data
      computationCache.setAnalytics(ordersHash, analyticsData);

      // Should retrieve cached data
      expect(computationCache.getAnalytics(ordersHash)).toEqual(analyticsData);
      expect(computationCache.hasAnalytics(ordersHash)).toBe(true);
    });

    test('should return null for non-existent analytics', () => {
      expect(computationCache.getAnalytics('non_existent_hash')).toBeNull();
      expect(computationCache.hasAnalytics('non_existent_hash')).toBe(false);
    });

    test('should handle invalid parameters gracefully', () => {
      expect(computationCache.getAnalytics(null)).toBeNull();
      expect(computationCache.getAnalytics('')).toBeNull();
      
      computationCache.setAnalytics(null, { data: 'test' });
      computationCache.setAnalytics('hash', null);
      
      // Should not crash and cache should remain empty
      expect(computationCache.getCacheStats().analytics.size).toBe(0);
    });

    test('should implement LRU eviction when cache is full', () => {
      // Set max cache size to 2 for testing
      computationCache.maxAnalyticsCacheSize = 2;

      // Fill cache to capacity
      computationCache.setAnalytics('hash1', { data: 'data1' });
      computationCache.setAnalytics('hash2', { data: 'data2' });
      
      expect(computationCache.hasAnalytics('hash1')).toBe(true);
      expect(computationCache.hasAnalytics('hash2')).toBe(true);

      // Add third item - should evict first
      computationCache.setAnalytics('hash3', { data: 'data3' });
      
      expect(computationCache.hasAnalytics('hash1')).toBe(false); // Evicted
      expect(computationCache.hasAnalytics('hash2')).toBe(true);
      expect(computationCache.hasAnalytics('hash3')).toBe(true);
    });

    test('should clear analytics cache', () => {
      computationCache.setAnalytics('hash1', { data: 'data1' });
      computationCache.setAnalytics('hash2', { data: 'data2' });
      
      expect(computationCache.getCacheStats().analytics.size).toBe(2);
      
      computationCache.clearAnalytics();
      
      expect(computationCache.getCacheStats().analytics.size).toBe(0);
      expect(computationCache.hasAnalytics('hash1')).toBe(false);
      expect(computationCache.hasAnalytics('hash2')).toBe(false);
    });
  });

  describe('Feature Flag Caching', () => {
    test('should cache and retrieve feature flags within render cycle', () => {
      const userId = 'user123';
      const featureFlags = {
        advanced_analytics: true,
        whatsapp_integration: false,
        pdf_reports: true
      };

      // Start render cycle
      computationCache.startRenderCycle();
      
      // Initially no flags cached
      expect(computationCache.getFeatureFlags(userId)).toBeNull();
      expect(computationCache.hasFeatureFlags(userId)).toBe(false);

      // Cache feature flags
      computationCache.setFeatureFlags(userId, featureFlags);

      // Should retrieve cached flags
      expect(computationCache.getFeatureFlags(userId)).toEqual(featureFlags);
      expect(computationCache.hasFeatureFlags(userId)).toBe(true);
    });

    test('should clear feature flags when starting new render cycle', () => {
      const userId = 'user123';
      const featureFlags = { feature1: true };

      // First render cycle
      computationCache.startRenderCycle();
      computationCache.setFeatureFlags(userId, featureFlags);
      expect(computationCache.hasFeatureFlags(userId)).toBe(true);

      // Start new render cycle - should clear previous flags
      computationCache.startRenderCycle();
      expect(computationCache.hasFeatureFlags(userId)).toBe(false);
      expect(computationCache.getFeatureFlags(userId)).toBeNull();
    });

    test('should handle multiple users in same render cycle', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      const flags1 = { feature1: true };
      const flags2 = { feature1: false, feature2: true };

      computationCache.startRenderCycle();
      
      computationCache.setFeatureFlags(user1, flags1);
      computationCache.setFeatureFlags(user2, flags2);

      expect(computationCache.getFeatureFlags(user1)).toEqual(flags1);
      expect(computationCache.getFeatureFlags(user2)).toEqual(flags2);
    });

    test('should return null without active render cycle', () => {
      const userId = 'user123';
      const featureFlags = { feature1: true };

      // No render cycle started
      computationCache.setFeatureFlags(userId, featureFlags);
      expect(computationCache.getFeatureFlags(userId)).toBeNull();
      expect(computationCache.hasFeatureFlags(userId)).toBe(false);
    });

    test('should handle invalid parameters gracefully', () => {
      computationCache.startRenderCycle();
      
      expect(computationCache.getFeatureFlags(null)).toBeNull();
      expect(computationCache.getFeatureFlags('')).toBeNull();
      
      computationCache.setFeatureFlags(null, { feature: true });
      computationCache.setFeatureFlags('user', null);
      
      // Should not crash
      expect(computationCache.getCacheStats().featureFlags.size).toBe(0);
    });

    test('should clear feature flags cache', () => {
      const userId = 'user123';
      
      computationCache.startRenderCycle();
      computationCache.setFeatureFlags(userId, { feature1: true });
      
      expect(computationCache.hasFeatureFlags(userId)).toBe(true);
      
      computationCache.clearFeatureFlags();
      
      expect(computationCache.hasFeatureFlags(userId)).toBe(false);
      expect(computationCache.getCacheStats().featureFlags.currentRenderCycle).toBeNull();
    });
  });

  describe('Cache Management', () => {
    test('should clear all caches', () => {
      const ordersHash = 'hash123';
      const userId = 'user123';

      // Set up both caches
      computationCache.setAnalytics(ordersHash, { data: 'analytics' });
      computationCache.startRenderCycle();
      computationCache.setFeatureFlags(userId, { feature: true });

      expect(computationCache.hasAnalytics(ordersHash)).toBe(true);
      expect(computationCache.hasFeatureFlags(userId)).toBe(true);

      // Clear all
      computationCache.clearAll();

      expect(computationCache.hasAnalytics(ordersHash)).toBe(false);
      expect(computationCache.hasFeatureFlags(userId)).toBe(false);
      expect(computationCache.getCacheStats().analytics.size).toBe(0);
      expect(computationCache.getCacheStats().featureFlags.size).toBe(0);
    });

    test('should provide accurate cache statistics', () => {
      const stats1 = computationCache.getCacheStats();
      expect(stats1.analytics.size).toBe(0);
      expect(stats1.featureFlags.size).toBe(0);
      expect(stats1.featureFlags.currentRenderCycle).toBeNull();

      // Add some data
      computationCache.setAnalytics('hash1', { data: 'data1' });
      computationCache.setAnalytics('hash2', { data: 'data2' });
      computationCache.startRenderCycle();
      computationCache.setFeatureFlags('user1', { feature: true });

      const stats2 = computationCache.getCacheStats();
      expect(stats2.analytics.size).toBe(2);
      expect(stats2.featureFlags.size).toBe(1);
      expect(stats2.featureFlags.currentRenderCycle).toBeTruthy();
    });
  });

  describe('Integration with Real Data', () => {
    test('should work with realistic orders data', () => {
      const orders = [
        {
          id: 'order_1',
          total: 250.50,
          timestamp: '2024-01-15T10:30:00Z',
          items: [
            { name: 'Coffee', quantity: 2, price: 5.50 },
            { name: 'Sandwich', quantity: 1, price: 12.00 }
          ]
        },
        {
          id: 'order_2',
          total: 75.25,
          createdAt: '2024-01-15T14:20:00Z',
          items: [
            { name: 'Tea', quantity: 3, price: 3.25 },
            { name: 'Cookie', quantity: 2, price: 2.50 }
          ]
        }
      ];

      const hash = computationCache.generateOrdersHash(orders);
      const analyticsData = {
        totalRevenue: 325.75,
        totalOrders: 2,
        averageOrderValue: 162.88,
        topProducts: ['Coffee', 'Sandwich', 'Tea', 'Cookie']
      };

      computationCache.setAnalytics(hash, analyticsData);
      
      expect(computationCache.getAnalytics(hash)).toEqual(analyticsData);
      
      // Same orders should produce same hash
      const sameOrdersHash = computationCache.generateOrdersHash([...orders]);
      expect(computationCache.getAnalytics(sameOrdersHash)).toEqual(analyticsData);
    });

    test('should work with realistic feature flags', () => {
      const userId = 'user_12345';
      const featureFlags = {
        cash_payments: true,
        upi_payments: true,
        basic_invoice: true,
        basic_analytics: true,
        advanced_analytics: false,
        performance_insights: false,
        pdf_reports: false,
        whatsapp_integration: false,
        email_reports: false,
        data_export: false,
        multi_device_sync: false,
        custom_branding: false
      };

      computationCache.startRenderCycle();
      computationCache.setFeatureFlags(userId, featureFlags);

      const cachedFlags = computationCache.getFeatureFlags(userId);
      expect(cachedFlags).toEqual(featureFlags);
      
      // Verify specific flags
      expect(cachedFlags.cash_payments).toBe(true);
      expect(cachedFlags.advanced_analytics).toBe(false);
      expect(cachedFlags.pdf_reports).toBe(false);
    });
  });
});