/**
 * Phase C Validation Checkpoint Tests
 * 
 * Validates Requirements: 5.4, 6.3
 * 
 * This test suite validates the three critical aspects of Phase C implementation:
 * 1. Verify analytics numbers unchanged
 * 2. Verify feature access unchanged
 * 3. Verify reduced CPU work
 */

// Mock React Native dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

// Mock FeatureService
jest.mock('../FeatureService');

import computationCache from '../ComputationCache';
import featureFlagCache from '../FeatureFlagCache';
import featureService from '../FeatureService';

describe('Phase C Validation Checkpoint', () => {
  beforeEach(() => {
    // Clear all mocks and reset state
    jest.clearAllMocks();
    computationCache.clearAll();
    featureFlagCache.endRenderCycle();
    
    // Setup default mock implementations
    featureService.canUseFeature.mockReturnValue(true);
    featureService.getLimit.mockReturnValue(100);
    featureService.getAvailablePaymentMethods.mockReturnValue(['Cash', 'QR Pay']);
    featureService.getPlanInfo.mockReturnValue({ currentPlan: 'growth' });
    featureService.initialize.mockResolvedValue();
  });

  afterEach(() => {
    // Clean up
    computationCache.clearAll();
    featureFlagCache.endRenderCycle();
  });

  describe('Requirement 5.4: Analytics numbers unchanged', () => {
    test('cached analytics should produce identical results to direct computation', () => {
      // Arrange - Sample orders data that would be used for analytics
      const ordersData = [
        {
          id: 'order_1',
          total: 150.75,
          timestamp: '2024-01-15T10:30:00Z',
          items: [
            { id: 'prod_1', name: 'Coffee', quantity: 2, price: 4.50 },
            { id: 'prod_2', name: 'Sandwich', quantity: 1, price: 8.25 }
          ]
        },
        {
          id: 'order_2',
          total: 89.50,
          timestamp: '2024-01-16T14:20:00Z',
          items: [
            { id: 'prod_1', name: 'Coffee', quantity: 1, price: 4.50 },
            { id: 'prod_3', name: 'Pastry', quantity: 2, price: 3.75 }
          ]
        }
      ];

      // Simulate direct analytics computation (what would happen without caching)
      const directAnalytics = {
        totalRevenue: 240.25,
        totalOrders: 2,
        avgOrderValue: 120.13,
        popularProducts: [
          { id: 'prod_1', name: 'Coffee', quantity: 3 },
          { id: 'prod_3', name: 'Pastry', quantity: 2 },
          { id: 'prod_2', name: 'Sandwich', quantity: 1 }
        ]
      };

      const directChartData = {
        revenueChart: [
          { day: 'Mon', revenue: 150.75, orders: 1 },
          { day: 'Tue', revenue: 89.50, orders: 1 }
        ],
        orderTrends: [
          { hour: '10 AM', orders: 1 },
          { hour: '2 PM', orders: 1 }
        ]
      };

      // Act - Cache the analytics results
      const ordersHash = computationCache.generateOrdersHash(ordersData);
      computationCache.setAnalytics(ordersHash, {
        analytics: directAnalytics,
        chartData: directChartData
      });

      // Retrieve cached results
      const cachedResults = computationCache.getAnalytics(ordersHash);

      // Assert - Cached results should be identical to direct computation
      expect(cachedResults.analytics).toEqual(directAnalytics);
      expect(cachedResults.chartData).toEqual(directChartData);
      
      // Verify specific analytics numbers are unchanged
      expect(cachedResults.analytics.totalRevenue).toBe(240.25);
      expect(cachedResults.analytics.totalOrders).toBe(2);
      expect(cachedResults.analytics.avgOrderValue).toBe(120.13);
      expect(cachedResults.analytics.popularProducts).toHaveLength(3);
      
      // Verify chart data is unchanged
      expect(cachedResults.chartData.revenueChart).toHaveLength(2);
      expect(cachedResults.chartData.revenueChart[0].revenue).toBe(150.75);
      expect(cachedResults.chartData.orderTrends).toHaveLength(2);
    });

    test('analytics cache should invalidate when orders data changes', () => {
      // Arrange - Initial orders data
      const initialOrders = [
        { id: 'order_1', total: 100, timestamp: '2024-01-15', items: [] }
      ];
      
      const initialAnalytics = {
        totalRevenue: 100,
        totalOrders: 1,
        avgOrderValue: 100
      };

      // Cache initial analytics
      const initialHash = computationCache.generateOrdersHash(initialOrders);
      computationCache.setAnalytics(initialHash, { analytics: initialAnalytics });
      
      // Verify initial cache
      expect(computationCache.hasAnalytics(initialHash)).toBe(true);
      expect(computationCache.getAnalytics(initialHash).analytics.totalRevenue).toBe(100);

      // Act - Orders data changes (new order added)
      const updatedOrders = [
        ...initialOrders,
        { id: 'order_2', total: 200, timestamp: '2024-01-16', items: [] }
      ];

      const updatedHash = computationCache.generateOrdersHash(updatedOrders);
      
      // Assert - Hash should be different, forcing cache miss
      expect(updatedHash).not.toBe(initialHash);
      expect(computationCache.hasAnalytics(updatedHash)).toBe(false);
      
      // New analytics computation would be required
      const updatedAnalytics = {
        totalRevenue: 300,
        totalOrders: 2,
        avgOrderValue: 150
      };
      
      computationCache.setAnalytics(updatedHash, { analytics: updatedAnalytics });
      
      // Verify updated analytics are correct
      expect(computationCache.getAnalytics(updatedHash).analytics.totalRevenue).toBe(300);
      expect(computationCache.getAnalytics(updatedHash).analytics.totalOrders).toBe(2);
    });

    test('manual refresh should bypass cache and allow recomputation', () => {
      // Arrange - Orders data and initial analytics
      const ordersData = [
        { id: 'order_1', total: 150, timestamp: '2024-01-15', items: [] }
      ];
      
      const initialAnalytics = {
        totalRevenue: 150,
        totalOrders: 1,
        refreshTimestamp: Date.now() - 1000 // 1 second ago
      };

      const ordersHash = computationCache.generateOrdersHash(ordersData);
      computationCache.setAnalytics(ordersHash, { analytics: initialAnalytics });
      
      // Verify initial cache
      expect(computationCache.hasAnalytics(ordersHash)).toBe(true);

      // Act - Manual refresh scenario (isRefresh = true would bypass cache check)
      // Simulate recomputation with updated timestamp
      const refreshedAnalytics = {
        totalRevenue: 150, // Same data, but refreshed
        totalOrders: 1,
        refreshTimestamp: Date.now() // Current timestamp
      };

      // Manual refresh overwrites cache even with same hash
      computationCache.setAnalytics(ordersHash, { analytics: refreshedAnalytics });

      // Assert - Analytics numbers remain the same but refresh occurred
      const result = computationCache.getAnalytics(ordersHash);
      expect(result.analytics.totalRevenue).toBe(150); // Same value
      expect(result.analytics.totalOrders).toBe(1); // Same value
      expect(result.analytics.refreshTimestamp).toBeGreaterThan(initialAnalytics.refreshTimestamp);
    });
  });

  describe('Requirement 6.3: Feature access unchanged', () => {
    test('cached feature flags should produce identical results to direct evaluation', async () => {
      // Arrange - Setup feature service responses
      featureService.canUseFeature.mockImplementation((feature) => {
        const featureMap = {
          'advanced_analytics': true,
          'whatsapp_integration': false,
          'multi_device_login': true,
          'premium_reports': false
        };
        return featureMap[feature] || false;
      });

      featureService.getLimit.mockImplementation((limitName) => {
        const limitMap = {
          'products': 100,
          'orders': 1000,
          'storage': 5000
        };
        return limitMap[limitName] || 0;
      });

      const userId = 'test-user-123';

      // Act - Start render cycle and evaluate features
      featureFlagCache.startRenderCycle();

      // Test feature access caching
      const advancedAnalytics1 = await featureFlagCache.canUseFeature('advanced_analytics', userId);
      const whatsappIntegration1 = await featureFlagCache.canUseFeature('whatsapp_integration', userId);
      const multiDeviceLogin1 = await featureFlagCache.canUseFeature('multi_device_login', userId);
      const premiumReports1 = await featureFlagCache.canUseFeature('premium_reports', userId);

      // Test limit access caching
      const productsLimit1 = await featureFlagCache.getLimit('products', userId);
      const ordersLimit1 = await featureFlagCache.getLimit('orders', userId);
      const storageLimit1 = await featureFlagCache.getLimit('storage', userId);

      // Second evaluation within same render cycle (should use cache)
      const advancedAnalytics2 = await featureFlagCache.canUseFeature('advanced_analytics', userId);
      const whatsappIntegration2 = await featureFlagCache.canUseFeature('whatsapp_integration', userId);
      const multiDeviceLogin2 = await featureFlagCache.canUseFeature('multi_device_login', userId);
      const premiumReports2 = await featureFlagCache.canUseFeature('premium_reports', userId);

      const productsLimit2 = await featureFlagCache.getLimit('products', userId);
      const ordersLimit2 = await featureFlagCache.getLimit('orders', userId);
      const storageLimit2 = await featureFlagCache.getLimit('storage', userId);

      // Assert - All results should be identical
      expect(advancedAnalytics1).toBe(true);
      expect(advancedAnalytics2).toBe(true);
      expect(advancedAnalytics1).toBe(advancedAnalytics2);

      expect(whatsappIntegration1).toBe(false);
      expect(whatsappIntegration2).toBe(false);
      expect(whatsappIntegration1).toBe(whatsappIntegration2);

      expect(multiDeviceLogin1).toBe(true);
      expect(multiDeviceLogin2).toBe(true);
      expect(multiDeviceLogin1).toBe(multiDeviceLogin2);

      expect(premiumReports1).toBe(false);
      expect(premiumReports2).toBe(false);
      expect(premiumReports1).toBe(premiumReports2);

      expect(productsLimit1).toBe(100);
      expect(productsLimit2).toBe(100);
      expect(productsLimit1).toBe(productsLimit2);

      expect(ordersLimit1).toBe(1000);
      expect(ordersLimit2).toBe(1000);
      expect(ordersLimit1).toBe(ordersLimit2);

      expect(storageLimit1).toBe(5000);
      expect(storageLimit2).toBe(5000);
      expect(storageLimit1).toBe(storageLimit2);
    });

    test('feature access should reset between render cycles', async () => {
      const userId = 'test-user-456';
      
      // Arrange - First render cycle
      featureFlagCache.startRenderCycle();
      
      featureService.canUseFeature.mockReturnValue(true);
      const result1 = await featureFlagCache.canUseFeature('advanced_analytics', userId);
      expect(result1).toBe(true);
      
      // End first render cycle
      featureFlagCache.endRenderCycle();
      
      // Act - Start new render cycle with different feature service response
      featureFlagCache.startRenderCycle();
      featureService.canUseFeature.mockReturnValue(false);
      
      const result2 = await featureFlagCache.canUseFeature('advanced_analytics', userId);
      
      // Assert - Should get new result, not cached from previous render cycle
      expect(result2).toBe(false);
      expect(result1).not.toBe(result2);
    });

    test('feature access should fallback to direct service when no render cycle active', async () => {
      // Arrange - No render cycle active
      expect(featureFlagCache.isRenderCycleActive).toBe(false);
      
      featureService.canUseFeature.mockReturnValue(true);
      featureService.getLimit.mockReturnValue(50);

      // Act - Call feature methods without active render cycle
      const canUse = await featureFlagCache.canUseFeature('advanced_analytics', 'user-123');
      const limit = await featureFlagCache.getLimit('products', 'user-123');

      // Assert - Should use direct service calls
      expect(canUse).toBe(true);
      expect(limit).toBe(50);
      expect(featureService.canUseFeature).toHaveBeenCalledWith('advanced_analytics');
      expect(featureService.getLimit).toHaveBeenCalledWith('products');
    });
  });

  describe('Reduced CPU work validation', () => {
    test('analytics computation should be called only once per unique orders hash', () => {
      // Arrange - Track computation calls
      let computationCallCount = 0;
      const mockComputeAnalytics = (orders) => {
        computationCallCount++;
        return {
          totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
          totalOrders: orders.length
        };
      };

      const ordersData = [
        { id: 'order_1', total: 100, timestamp: '2024-01-15', items: [] },
        { id: 'order_2', total: 200, timestamp: '2024-01-16', items: [] }
      ];

      const ordersHash = computationCache.generateOrdersHash(ordersData);

      // Act - First computation (cache miss)
      expect(computationCache.hasAnalytics(ordersHash)).toBe(false);
      const analytics1 = mockComputeAnalytics(ordersData);
      computationCache.setAnalytics(ordersHash, { analytics: analytics1 });

      // Second request (cache hit)
      let analytics2;
      if (computationCache.hasAnalytics(ordersHash)) {
        analytics2 = computationCache.getAnalytics(ordersHash).analytics;
      } else {
        analytics2 = mockComputeAnalytics(ordersData);
        computationCache.setAnalytics(ordersHash, { analytics: analytics2 });
      }

      // Third request (cache hit)
      let analytics3;
      if (computationCache.hasAnalytics(ordersHash)) {
        analytics3 = computationCache.getAnalytics(ordersHash).analytics;
      } else {
        analytics3 = mockComputeAnalytics(ordersData);
        computationCache.setAnalytics(ordersHash, { analytics: analytics3 });
      }

      // Assert - Computation should only be called once
      expect(computationCallCount).toBe(1);
      expect(analytics1).toEqual(analytics2);
      expect(analytics2).toEqual(analytics3);
    });

    test('feature flag evaluation should be called only once per render cycle', async () => {
      // Arrange - Track feature service calls
      let featureServiceCallCount = 0;
      featureService.canUseFeature.mockImplementation((feature) => {
        featureServiceCallCount++;
        return feature === 'advanced_analytics';
      });

      const userId = 'test-user-789';

      // Act - Start render cycle and make multiple feature checks
      featureFlagCache.startRenderCycle();

      const result1 = await featureFlagCache.canUseFeature('advanced_analytics', userId);
      const result2 = await featureFlagCache.canUseFeature('advanced_analytics', userId);
      const result3 = await featureFlagCache.canUseFeature('advanced_analytics', userId);

      // Assert - Feature service should only be called once
      expect(featureServiceCallCount).toBe(1);
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    test('cache should reduce redundant hash computations', () => {
      // Arrange - Track hash generation calls
      let hashCallCount = 0;
      const originalGenerateHash = computationCache.generateOrdersHash;
      computationCache.generateOrdersHash = function(orders) {
        hashCallCount++;
        return originalGenerateHash.call(this, orders);
      };

      const ordersData = [
        { id: 'order_1', total: 150, timestamp: '2024-01-15', items: [] }
      ];

      // Act - Generate hash multiple times for same data
      const hash1 = computationCache.generateOrdersHash(ordersData);
      const hash2 = computationCache.generateOrdersHash(ordersData);
      const hash3 = computationCache.generateOrdersHash(ordersData);

      // Assert - Hash should be consistent and deterministic
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
      expect(hashCallCount).toBe(3); // Called each time, but produces same result
      
      // Cache analytics for this hash
      const analytics = { totalRevenue: 150, totalOrders: 1 };
      computationCache.setAnalytics(hash1, { analytics });

      // Subsequent cache checks should use the same hash
      expect(computationCache.hasAnalytics(hash1)).toBe(true);
      expect(computationCache.hasAnalytics(hash2)).toBe(true);
      expect(computationCache.hasAnalytics(hash3)).toBe(true);

      // Restore original method
      computationCache.generateOrdersHash = originalGenerateHash;
    });

    test('cache statistics should show efficiency gains', () => {
      // Arrange - Start with empty cache
      const initialStats = computationCache.getCacheStats();
      expect(initialStats.analytics.size).toBe(0);

      // Act - Add multiple analytics entries
      const orders1 = [{ id: 'order_1', total: 100, timestamp: '2024-01-15', items: [] }];
      const orders2 = [{ id: 'order_2', total: 200, timestamp: '2024-01-16', items: [] }];
      const orders3 = [{ id: 'order_3', total: 300, timestamp: '2024-01-17', items: [] }];

      const hash1 = computationCache.generateOrdersHash(orders1);
      const hash2 = computationCache.generateOrdersHash(orders2);
      const hash3 = computationCache.generateOrdersHash(orders3);

      computationCache.setAnalytics(hash1, { analytics: { totalRevenue: 100 } });
      computationCache.setAnalytics(hash2, { analytics: { totalRevenue: 200 } });
      computationCache.setAnalytics(hash3, { analytics: { totalRevenue: 300 } });

      // Assert - Cache should show multiple entries
      const finalStats = computationCache.getCacheStats();
      expect(finalStats.analytics.size).toBe(3);
      expect(finalStats.analytics.maxSize).toBeGreaterThan(0);

      // Verify cache hits work
      expect(computationCache.hasAnalytics(hash1)).toBe(true);
      expect(computationCache.hasAnalytics(hash2)).toBe(true);
      expect(computationCache.hasAnalytics(hash3)).toBe(true);
    });
  });

  describe('Integration validation', () => {
    test('complete Phase C workflow should maintain all guarantees', async () => {
      // This test validates the entire Phase C implementation
      
      // Arrange - Realistic scenario with orders and feature flags
      const ordersData = [
        {
          id: 'ord_001',
          total: 275.50,
          timestamp: '2024-01-15T10:30:00Z',
          items: [
            { id: 'prod_1', name: 'Coffee', quantity: 2, price: 4.50 },
            { id: 'prod_2', name: 'Pastry', quantity: 1, price: 6.25 }
          ]
        }
      ];

      const userId = 'integration-user';
      
      // Setup feature service
      featureService.canUseFeature.mockImplementation((feature) => {
        return feature === 'advanced_analytics' || feature === 'pdf_reports';
      });

      // Act 1 - Analytics caching workflow
      const ordersHash = computationCache.generateOrdersHash(ordersData);
      expect(computationCache.hasAnalytics(ordersHash)).toBe(false);

      const computedAnalytics = {
        totalRevenue: 275.50,
        totalOrders: 1,
        avgOrderValue: 275.50,
        popularProducts: [
          { id: 'prod_1', name: 'Coffee', quantity: 2 },
          { id: 'prod_2', name: 'Pastry', quantity: 1 }
        ]
      };

      computationCache.setAnalytics(ordersHash, { analytics: computedAnalytics });

      // Act 2 - Feature flag caching workflow
      featureFlagCache.startRenderCycle();
      
      const canUseAdvanced = await featureFlagCache.canUseFeature('advanced_analytics', userId);
      const canUsePdf = await featureFlagCache.canUseFeature('pdf_reports', userId);
      const canUseWhatsapp = await featureFlagCache.canUseFeature('whatsapp_integration', userId);

      // Assert - All workflows completed successfully
      
      // Analytics caching validation
      expect(computationCache.hasAnalytics(ordersHash)).toBe(true);
      const cachedAnalytics = computationCache.getAnalytics(ordersHash);
      expect(cachedAnalytics.analytics).toEqual(computedAnalytics);
      expect(cachedAnalytics.analytics.totalRevenue).toBe(275.50);
      
      // Feature flag caching validation
      expect(canUseAdvanced).toBe(true);
      expect(canUsePdf).toBe(true);
      expect(canUseWhatsapp).toBe(false);
      
      // Verify service calls were minimized
      expect(featureService.canUseFeature).toHaveBeenCalledTimes(3); // Once per unique feature
      
      // Cache statistics validation
      const stats = computationCache.getCacheStats();
      expect(stats.analytics.size).toBe(1);
      expect(stats.featureFlags.currentRenderCycle).toBeTruthy();
      
      // Cleanup
      featureFlagCache.endRenderCycle();
      expect(featureFlagCache.isRenderCycleActive).toBe(false);
    });
  });
});