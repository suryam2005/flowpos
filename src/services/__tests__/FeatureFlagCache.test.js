/**
 * FeatureFlagCache Tests - Phase C: Feature Flag Computation Reuse
 * 
 * Tests the feature flag caching functionality to ensure:
 * - Feature flags are evaluated once per render cycle
 * - Results are cached and reused within the same render cycle
 * - Cache is cleared between render cycles
 * - Fallback behavior works correctly
 */

import featureFlagCache from '../FeatureFlagCache';
import featureService from '../FeatureService';
import computationCache from '../ComputationCache';

// Mock the dependencies
jest.mock('../FeatureService');
jest.mock('../ComputationCache');

describe('FeatureFlagCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Ensure clean state for each test
    featureFlagCache.endRenderCycle();
    
    // Setup default mock implementations
    computationCache.startRenderCycle.mockImplementation(() => {});
    computationCache.clearFeatureFlags.mockImplementation(() => {});
    computationCache.getFeatureFlags.mockReturnValue(null);
    computationCache.setFeatureFlags.mockImplementation(() => {});
    
    featureService.canUseFeature.mockReturnValue(true);
    featureService.getLimit.mockReturnValue(100);
    featureService.getAvailablePaymentMethods.mockReturnValue(['Cash', 'QR Pay']);
    featureService.getPlanInfo.mockReturnValue({ currentPlan: 'growth' });
    featureService.showUpgradePrompt.mockImplementation(() => {});
  });

  describe('Render Cycle Management', () => {
    test('should start render cycle correctly', () => {
      featureFlagCache.startRenderCycle();
      
      expect(computationCache.startRenderCycle).toHaveBeenCalledTimes(1);
      expect(featureFlagCache.isRenderCycleActive).toBe(true);
    });

    test('should end render cycle correctly', () => {
      featureFlagCache.startRenderCycle();
      
      // Clear the mock call count from startRenderCycle
      computationCache.clearFeatureFlags.mockClear();
      
      featureFlagCache.endRenderCycle();
      
      expect(computationCache.clearFeatureFlags).toHaveBeenCalledTimes(1);
      expect(featureFlagCache.isRenderCycleActive).toBe(false);
    });
  });

  describe('Feature Flag Caching', () => {
    test('should cache feature flag evaluation results', async () => {
      const userId = 'test-user';
      const featureName = 'advanced_analytics';
      
      featureFlagCache.startRenderCycle();
      featureService.canUseFeature.mockReturnValue(true);
      
      // First call should evaluate and cache
      const result1 = await featureFlagCache.canUseFeature(featureName, userId);
      expect(result1).toBe(true);
      expect(featureService.canUseFeature).toHaveBeenCalledWith(featureName);
      expect(computationCache.setFeatureFlags).toHaveBeenCalledWith(userId, {
        [featureName]: true
      });
      
      // Second call should use cached result
      computationCache.getFeatureFlags.mockReturnValue({ [featureName]: true });
      const result2 = await featureFlagCache.canUseFeature(featureName, userId);
      expect(result2).toBe(true);
      expect(featureService.canUseFeature).toHaveBeenCalledTimes(1); // Not called again
    });

    test('should cache multiple feature flags for same user', async () => {
      const userId = 'test-user';
      
      featureFlagCache.startRenderCycle();
      featureService.canUseFeature.mockImplementation((feature) => {
        return feature === 'advanced_analytics' ? true : false;
      });
      
      // First feature
      await featureFlagCache.canUseFeature('advanced_analytics', userId);
      expect(computationCache.setFeatureFlags).toHaveBeenCalledWith(userId, {
        'advanced_analytics': true
      });
      
      // Second feature - should merge with existing cache
      computationCache.getFeatureFlags.mockReturnValue({ 'advanced_analytics': true });
      await featureFlagCache.canUseFeature('whatsapp_integration', userId);
      expect(computationCache.setFeatureFlags).toHaveBeenCalledWith(userId, {
        'advanced_analytics': true,
        'whatsapp_integration': false
      });
    });

    test('should fallback to direct service call when no render cycle active', async () => {
      const userId = 'test-user';
      const featureName = 'advanced_analytics';
      
      // No render cycle started
      featureService.canUseFeature.mockReturnValue(false);
      
      const result = await featureFlagCache.canUseFeature(featureName, userId);
      expect(result).toBe(false);
      expect(featureService.canUseFeature).toHaveBeenCalledWith(featureName);
      expect(computationCache.setFeatureFlags).not.toHaveBeenCalled();
    });

    test('should fallback to direct service call for invalid inputs', async () => {
      featureFlagCache.startRenderCycle();
      featureService.canUseFeature.mockReturnValue(true);
      
      // Test with null userId
      const result1 = await featureFlagCache.canUseFeature('test_feature', null);
      expect(result1).toBe(true);
      expect(featureService.canUseFeature).toHaveBeenCalledWith('test_feature');
      
      // Test with null featureName
      const result2 = await featureFlagCache.canUseFeature(null, 'user123');
      expect(result2).toBe(true);
      expect(featureService.canUseFeature).toHaveBeenCalledWith(null);
    });
  });

  describe('Limit Caching', () => {
    test('should cache limit evaluation results', async () => {
      const userId = 'test-user';
      const limitName = 'products';
      
      featureFlagCache.startRenderCycle();
      featureService.getLimit.mockReturnValue(500);
      
      // First call should evaluate and cache
      const result1 = await featureFlagCache.getLimit(limitName, userId);
      expect(result1).toBe(500);
      expect(featureService.getLimit).toHaveBeenCalledWith(limitName);
      expect(computationCache.setFeatureFlags).toHaveBeenCalledWith(userId, {
        'limit_products': 500
      });
      
      // Second call should use cached result
      computationCache.getFeatureFlags.mockReturnValue({ 'limit_products': 500 });
      const result2 = await featureFlagCache.getLimit(limitName, userId);
      expect(result2).toBe(500);
      expect(featureService.getLimit).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('Payment Methods Caching', () => {
    test('should cache available payment methods', async () => {
      const userId = 'test-user';
      const expectedMethods = ['Cash', 'QR Pay'];
      
      featureFlagCache.startRenderCycle();
      featureService.getAvailablePaymentMethods.mockReturnValue(expectedMethods);
      
      // First call should evaluate and cache
      const result1 = await featureFlagCache.getAvailablePaymentMethods(userId);
      expect(result1).toEqual(expectedMethods);
      expect(featureService.getAvailablePaymentMethods).toHaveBeenCalledTimes(1);
      expect(computationCache.setFeatureFlags).toHaveBeenCalledWith(userId, {
        'available_payment_methods': expectedMethods
      });
      
      // Second call should use cached result
      computationCache.getFeatureFlags.mockReturnValue({ 'available_payment_methods': expectedMethods });
      const result2 = await featureFlagCache.getAvailablePaymentMethods(userId);
      expect(result2).toEqual(expectedMethods);
      expect(featureService.getAvailablePaymentMethods).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('Plan Info Caching', () => {
    test('should cache plan information', async () => {
      const userId = 'test-user';
      const expectedPlanInfo = { currentPlan: 'enterprise', price: 999 };
      
      featureFlagCache.startRenderCycle();
      featureService.getPlanInfo.mockReturnValue(expectedPlanInfo);
      
      // First call should evaluate and cache
      const result1 = await featureFlagCache.getPlanInfo(userId);
      expect(result1).toEqual(expectedPlanInfo);
      expect(featureService.getPlanInfo).toHaveBeenCalledTimes(1);
      expect(computationCache.setFeatureFlags).toHaveBeenCalledWith(userId, {
        'plan_info': expectedPlanInfo
      });
      
      // Second call should use cached result
      computationCache.getFeatureFlags.mockReturnValue({ 'plan_info': expectedPlanInfo });
      const result2 = await featureFlagCache.getPlanInfo(userId);
      expect(result2).toEqual(expectedPlanInfo);
      expect(featureService.getPlanInfo).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('Pass-through Methods', () => {
    test('should pass through showUpgradePrompt without caching', () => {
      const featureName = 'advanced_analytics';
      const context = { source: 'test' };
      
      featureFlagCache.showUpgradePrompt(featureName, context);
      
      expect(featureService.showUpgradePrompt).toHaveBeenCalledWith(featureName, context);
    });

    test('should pass through initialize without caching', async () => {
      featureService.initialize.mockResolvedValue(true);
      
      const result = await featureFlagCache.initialize();
      
      expect(featureService.initialize).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    test('should pass through hasReachedLimit without caching', async () => {
      featureService.hasReachedLimit.mockResolvedValue(false);
      
      const result = await featureFlagCache.hasReachedLimit('products');
      
      expect(featureService.hasReachedLimit).toHaveBeenCalledWith('products');
      expect(result).toBe(false);
    });

    test('should clear cache when upgrading plan', async () => {
      featureFlagCache.startRenderCycle();
      featureService.upgradePlan.mockResolvedValue(true);
      
      // Clear the mock call count from beforeEach
      computationCache.clearFeatureFlags.mockClear();
      
      const result = await featureFlagCache.upgradePlan('enterprise');
      
      expect(featureService.upgradePlan).toHaveBeenCalledWith('enterprise');
      expect(computationCache.clearFeatureFlags).toHaveBeenCalledTimes(1);
      expect(featureFlagCache.isRenderCycleActive).toBe(false);
      expect(result).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    test('should return cache statistics', () => {
      const mockStats = {
        analytics: { size: 5, maxSize: 50 },
        featureFlags: { size: 3, currentRenderCycle: 'render_123' }
      };
      
      computationCache.getCacheStats.mockReturnValue(mockStats);
      featureFlagCache.startRenderCycle();
      
      const stats = featureFlagCache.getCacheStats();
      
      expect(stats).toEqual({
        renderCycleActive: true,
        computationCacheStats: mockStats
      });
    });
  });
});