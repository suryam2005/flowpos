/**
 * Analytics Computation Caching Integration Tests
 * 
 * Tests for Phase C: Analytics Computation Reuse
 * Validates that analytics computations are cached and reused correctly
 */

import computationCache from '../ComputationCache';

describe('Analytics Computation Caching Integration', () => {
  beforeEach(() => {
    // Clear cache before each test
    computationCache.clearAll();
  });

  afterEach(() => {
    // Clean up after each test
    computationCache.clearAll();
  });

  describe('Analytics Caching Workflow', () => {
    test('should cache analytics computation results', () => {
      // Simulate orders data
      const ordersData = [
        {
          id: 'order_1',
          total: 100,
          timestamp: '2024-01-15T10:30:00Z',
          items: [
            { id: 'prod_1', name: 'Coffee', quantity: 2, price: 50 }
          ]
        },
        {
          id: 'order_2',
          total: 200,
          timestamp: '2024-01-16T14:20:00Z',
          items: [
            { id: 'prod_2', name: 'Sandwich', quantity: 1, price: 200 }
          ]
        }
      ];

      // Generate hash for orders
      const ordersHash = computationCache.generateOrdersHash(ordersData);
      expect(ordersHash).toBeTruthy();

      // Initially no cached analytics
      expect(computationCache.hasAnalytics(ordersHash)).toBe(false);
      expect(computationCache.getAnalytics(ordersHash)).toBeNull();

      // Simulate analytics computation results
      const analyticsResult = {
        todayRevenue: 0,
        weekRevenue: 300,
        monthRevenue: 300,
        totalRevenue: 300,
        todayOrders: 0,
        weekOrders: 2,
        monthOrders: 2,
        totalOrders: 2,
        avgOrderValue: 150,
        totalProducts: 10,
        popularProducts: [
          { id: 'prod_1', name: 'Coffee', quantity: 2 },
          { id: 'prod_2', name: 'Sandwich', quantity: 1 }
        ],
        topCategories: [
          { category: 'Beverages', count: 2 },
          { category: 'Food', count: 1 }
        ]
      };

      const chartDataResult = {
        revenueChart: [
          { day: 'Mon', revenue: 100, orders: 1 },
          { day: 'Tue', revenue: 200, orders: 1 }
        ],
        orderTrends: [
          { hour: '10 AM', orders: 1 },
          { hour: '2 PM', orders: 1 }
        ],
        topProducts: [
          { id: 'prod_1', name: 'Coffee', value: 2 },
          { id: 'prod_2', name: 'Sandwich', value: 1 }
        ]
      };

      // Cache the computed results
      computationCache.setAnalytics(ordersHash, {
        analytics: analyticsResult,
        chartData: chartDataResult
      });

      // Verify analytics are cached
      expect(computationCache.hasAnalytics(ordersHash)).toBe(true);
      
      const cachedData = computationCache.getAnalytics(ordersHash);
      expect(cachedData).toBeTruthy();
      expect(cachedData.analytics).toEqual(analyticsResult);
      expect(cachedData.chartData).toEqual(chartDataResult);
    });

    test('should generate different hash when orders change', () => {
      const orders1 = [
        { id: 'order_1', total: 100, timestamp: '2024-01-15', items: [] }
      ];

      const orders2 = [
        { id: 'order_1', total: 100, timestamp: '2024-01-15', items: [] },
        { id: 'order_2', total: 200, timestamp: '2024-01-16', items: [] }
      ];

      const hash1 = computationCache.generateOrdersHash(orders1);
      const hash2 = computationCache.generateOrdersHash(orders2);

      expect(hash1).not.toBe(hash2);

      // Cache analytics for first set of orders
      const analytics1 = { totalRevenue: 100, totalOrders: 1 };
      computationCache.setAnalytics(hash1, { analytics: analytics1 });

      // Verify first analytics are cached
      expect(computationCache.hasAnalytics(hash1)).toBe(true);
      expect(computationCache.getAnalytics(hash1).analytics).toEqual(analytics1);

      // Verify second hash has no cached data (different orders)
      expect(computationCache.hasAnalytics(hash2)).toBe(false);
      expect(computationCache.getAnalytics(hash2)).toBeNull();
    });

    test('should handle cache hit scenario', () => {
      const ordersData = [
        { id: 'order_1', total: 150, timestamp: '2024-01-15', items: [] }
      ];

      const ordersHash = computationCache.generateOrdersHash(ordersData);
      const analyticsData = {
        analytics: { totalRevenue: 150, totalOrders: 1 },
        chartData: { revenueChart: [] }
      };

      // First computation - cache miss
      expect(computationCache.hasAnalytics(ordersHash)).toBe(false);
      
      // Simulate caching the result
      computationCache.setAnalytics(ordersHash, analyticsData);

      // Second request - cache hit
      expect(computationCache.hasAnalytics(ordersHash)).toBe(true);
      const cachedResult = computationCache.getAnalytics(ordersHash);
      expect(cachedResult).toEqual(analyticsData);
    });

    test('should handle manual refresh scenario', () => {
      const ordersData = [
        { id: 'order_1', total: 100, timestamp: '2024-01-15', items: [] }
      ];

      const ordersHash = computationCache.generateOrdersHash(ordersData);
      const initialAnalytics = {
        analytics: { totalRevenue: 100, totalOrders: 1 },
        chartData: { revenueChart: [] }
      };

      // Cache initial analytics
      computationCache.setAnalytics(ordersHash, initialAnalytics);
      expect(computationCache.hasAnalytics(ordersHash)).toBe(true);

      // Manual refresh scenario - should bypass cache and recompute
      // In real implementation, isRefresh=true would skip cache check
      const refreshedAnalytics = {
        analytics: { totalRevenue: 100, totalOrders: 1, refreshed: true },
        chartData: { revenueChart: [{ day: 'Today', revenue: 100 }] }
      };

      // Simulate manual refresh overwriting cache
      computationCache.setAnalytics(ordersHash, refreshedAnalytics);
      
      const result = computationCache.getAnalytics(ordersHash);
      expect(result.analytics.refreshed).toBe(true);
      expect(result.chartData.revenueChart).toHaveLength(1);
    });

    test('should handle empty orders gracefully', () => {
      const emptyOrders = [];
      const nullOrders = null;
      const undefinedOrders = undefined;

      const hash1 = computationCache.generateOrdersHash(emptyOrders);
      const hash2 = computationCache.generateOrdersHash(nullOrders);
      const hash3 = computationCache.generateOrdersHash(undefinedOrders);

      // All should generate the same 'empty_orders' hash
      expect(hash1).toBe('empty_orders');
      expect(hash2).toBe('empty_orders');
      expect(hash3).toBe('empty_orders');

      // Should be able to cache analytics for empty orders
      const emptyAnalytics = {
        analytics: { totalRevenue: 0, totalOrders: 0 },
        chartData: { revenueChart: [] }
      };

      computationCache.setAnalytics(hash1, emptyAnalytics);
      expect(computationCache.hasAnalytics(hash1)).toBe(true);
      expect(computationCache.getAnalytics(hash1)).toEqual(emptyAnalytics);
    });
  });

  describe('Cache Management', () => {
    test('should clear analytics cache', () => {
      const ordersHash = 'test_hash';
      const analyticsData = {
        analytics: { totalRevenue: 100 },
        chartData: { revenueChart: [] }
      };

      computationCache.setAnalytics(ordersHash, analyticsData);
      expect(computationCache.hasAnalytics(ordersHash)).toBe(true);

      computationCache.clearAnalytics();
      expect(computationCache.hasAnalytics(ordersHash)).toBe(false);
      expect(computationCache.getAnalytics(ordersHash)).toBeNull();
    });

    test('should provide cache statistics', () => {
      const stats1 = computationCache.getCacheStats();
      expect(stats1.analytics.size).toBe(0);

      // Add some analytics
      computationCache.setAnalytics('hash1', { analytics: {}, chartData: {} });
      computationCache.setAnalytics('hash2', { analytics: {}, chartData: {} });

      const stats2 = computationCache.getCacheStats();
      expect(stats2.analytics.size).toBe(2);
    });
  });

  describe('Real-world Integration Scenarios', () => {
    test('should work with realistic orders data structure', () => {
      const realisticOrders = [
        {
          id: 'ord_1642234567890',
          total: 275.50,
          timestamp: '2024-01-15T10:30:00.000Z',
          createdAt: '2024-01-15T10:30:00.000Z',
          items: [
            {
              id: 'prod_coffee_001',
              name: 'Cappuccino',
              quantity: 2,
              price: 4.50,
              category: 'Beverages'
            },
            {
              id: 'prod_food_001',
              name: 'Croissant',
              quantity: 1,
              price: 3.25,
              category: 'Pastries'
            }
          ]
        },
        {
          id: 'ord_1642234567891',
          total: 125.75,
          timestamp: '2024-01-15T14:20:00.000Z',
          createdAt: '2024-01-15T14:20:00.000Z',
          items: [
            {
              id: 'prod_coffee_002',
              name: 'Latte',
              quantity: 1,
              price: 5.00,
              category: 'Beverages'
            }
          ]
        }
      ];

      const ordersHash = computationCache.generateOrdersHash(realisticOrders);
      expect(ordersHash).toBeTruthy();
      expect(ordersHash).not.toBe('empty_orders');

      // Simulate realistic analytics computation
      const realisticAnalytics = {
        analytics: {
          todayRevenue: 401.25,
          weekRevenue: 401.25,
          monthRevenue: 401.25,
          totalRevenue: 401.25,
          todayOrders: 2,
          weekOrders: 2,
          monthOrders: 2,
          totalOrders: 2,
          avgOrderValue: 200.63,
          totalProducts: 15,
          popularProducts: [
            { id: 'prod_coffee_001', name: 'Cappuccino', quantity: 2, category: 'Beverages' },
            { id: 'prod_coffee_002', name: 'Latte', quantity: 1, category: 'Beverages' },
            { id: 'prod_food_001', name: 'Croissant', quantity: 1, category: 'Pastries' }
          ],
          topCategories: [
            { category: 'Beverages', count: 3 },
            { category: 'Pastries', count: 1 }
          ]
        },
        chartData: {
          revenueChart: [
            { day: 'Mon', date: '2024-01-15', revenue: 401.25, orders: 2 }
          ],
          orderTrends: [
            { hour: '10 AM', orders: 1 },
            { hour: '2 PM', orders: 1 }
          ],
          topProducts: [
            { id: 'prod_coffee_001', name: 'Cappuccino', value: 2 },
            { id: 'prod_coffee_002', name: 'Latte', value: 1 },
            { id: 'prod_food_001', name: 'Croissant', value: 1 }
          ]
        }
      };

      // Cache and retrieve
      computationCache.setAnalytics(ordersHash, realisticAnalytics);
      const cachedResult = computationCache.getAnalytics(ordersHash);

      expect(cachedResult).toEqual(realisticAnalytics);
      expect(cachedResult.analytics.totalRevenue).toBe(401.25);
      expect(cachedResult.analytics.popularProducts).toHaveLength(3);
      expect(cachedResult.chartData.revenueChart[0].revenue).toBe(401.25);
    });
  });
});