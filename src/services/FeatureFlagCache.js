/**
 * FeatureFlagCache - Phase C: Feature Flag Computation Reuse
 * 
 * Purpose: Cache feature flag evaluations per render cycle to avoid redundant
 * permission checks within the same screen render.
 * 
 * Key Principles:
 * - Feature flag results are cached per render cycle only
 * - No persistence across screens or sessions
 * - Cache is cleared at the start of each new render cycle
 * - All caching is in-memory only
 * - Maintains exact same behavior as direct FeatureService calls
 */

import featureService from './FeatureService';
import computationCache from './ComputationCache';

class FeatureFlagCache {
  constructor() {
    this.isRenderCycleActive = false;
  }

  /**
   * Start a new render cycle for feature flag caching
   * This should be called at the beginning of each screen render
   */
  startRenderCycle() {
    computationCache.startRenderCycle();
    this.isRenderCycleActive = true;
  }

  /**
   * End the current render cycle
   * This clears the feature flag cache
   */
  endRenderCycle() {
    computationCache.clearFeatureFlags();
    this.isRenderCycleActive = false;
  }

  /**
   * Check if user can use a specific feature (with caching)
   * @param {string} featureName - Name of the feature to check
   * @param {string} userId - User identifier for cache scoping
   * @returns {boolean} True if user can use the feature
   */
  async canUseFeature(featureName, userId) {
    if (!featureName || !userId) {
      // Fallback to direct service call for invalid inputs
      return featureService.canUseFeature(featureName);
    }

    // If no render cycle is active, use direct service call
    if (!this.isRenderCycleActive) {
      return featureService.canUseFeature(featureName);
    }

    // Try to get cached feature flags for this user in current render cycle
    const cachedFlags = computationCache.getFeatureFlags(userId);
    
    if (cachedFlags && cachedFlags.hasOwnProperty(featureName)) {
      // Return cached result
      return cachedFlags[featureName];
    }

    // Cache miss - evaluate the feature flag
    const canUse = featureService.canUseFeature(featureName);

    // Store result in cache for this render cycle (only if render cycle is active)
    if (this.isRenderCycleActive) {
      const existingFlags = cachedFlags || {};
      const updatedFlags = {
        ...existingFlags,
        [featureName]: canUse
      };

      computationCache.setFeatureFlags(userId, updatedFlags);
    }

    return canUse;
  }

  /**
   * Get limit for a specific resource (with caching)
   * @param {string} limitName - Name of the limit to check
   * @param {string} userId - User identifier for cache scoping
   * @returns {number} The limit value
   */
  async getLimit(limitName, userId) {
    if (!limitName || !userId) {
      // Fallback to direct service call for invalid inputs
      return featureService.getLimit(limitName);
    }

    // If no render cycle is active, use direct service call
    if (!this.isRenderCycleActive) {
      return featureService.getLimit(limitName);
    }

    // Try to get cached feature flags for this user in current render cycle
    const cachedFlags = computationCache.getFeatureFlags(userId);
    const limitKey = `limit_${limitName}`;
    
    if (cachedFlags && cachedFlags.hasOwnProperty(limitKey)) {
      // Return cached result
      return cachedFlags[limitKey];
    }

    // Cache miss - get the limit
    const limit = featureService.getLimit(limitName);

    // Store result in cache for this render cycle (only if render cycle is active)
    if (this.isRenderCycleActive) {
      const existingFlags = cachedFlags || {};
      const updatedFlags = {
        ...existingFlags,
        [limitKey]: limit
      };

      computationCache.setFeatureFlags(userId, updatedFlags);
    }

    return limit;
  }

  /**
   * Check if user has reached a limit (with caching)
   * Note: This method involves async operations and current usage checks,
   * so it's not cached as it may change during the render cycle
   * @param {string} limitName - Name of the limit to check
   * @returns {Promise<boolean>} True if limit is reached
   */
  async hasReachedLimit(limitName) {
    // This method involves real-time usage checks, so we don't cache it
    // as the usage might change during the render cycle
    return featureService.hasReachedLimit(limitName);
  }

  /**
   * Get available payment methods (with caching)
   * @param {string} userId - User identifier for cache scoping
   * @returns {Array<string>} Available payment methods
   */
  async getAvailablePaymentMethods(userId) {
    if (!userId) {
      // Fallback to direct service call for invalid inputs
      return featureService.getAvailablePaymentMethods();
    }

    // If no render cycle is active, use direct service call
    if (!this.isRenderCycleActive) {
      return featureService.getAvailablePaymentMethods();
    }

    // Try to get cached feature flags for this user in current render cycle
    const cachedFlags = computationCache.getFeatureFlags(userId);
    const paymentMethodsKey = 'available_payment_methods';
    
    if (cachedFlags && cachedFlags.hasOwnProperty(paymentMethodsKey)) {
      // Return cached result
      return cachedFlags[paymentMethodsKey];
    }

    // Cache miss - get available payment methods
    const methods = featureService.getAvailablePaymentMethods();

    // Store result in cache for this render cycle (only if render cycle is active)
    if (this.isRenderCycleActive) {
      const existingFlags = cachedFlags || {};
      const updatedFlags = {
        ...existingFlags,
        [paymentMethodsKey]: methods
      };

      computationCache.setFeatureFlags(userId, updatedFlags);
    }

    return methods;
  }

  /**
   * Show upgrade prompt (no caching needed - this is a UI action)
   * @param {string} featureName - Feature that requires upgrade
   * @param {Object} context - Additional context for the prompt
   */
  showUpgradePrompt(featureName, context = {}) {
    // No caching needed for UI actions
    return featureService.showUpgradePrompt(featureName, context);
  }

  /**
   * Get plan information (with caching)
   * @param {string} userId - User identifier for cache scoping
   * @returns {Object} Plan information
   */
  async getPlanInfo(userId) {
    if (!userId) {
      // Fallback to direct service call for invalid inputs
      return featureService.getPlanInfo();
    }

    // If no render cycle is active, use direct service call
    if (!this.isRenderCycleActive) {
      return featureService.getPlanInfo();
    }

    // Try to get cached feature flags for this user in current render cycle
    const cachedFlags = computationCache.getFeatureFlags(userId);
    const planInfoKey = 'plan_info';
    
    if (cachedFlags && cachedFlags.hasOwnProperty(planInfoKey)) {
      // Return cached result
      return cachedFlags[planInfoKey];
    }

    // Cache miss - get plan information
    const planInfo = featureService.getPlanInfo();

    // Store result in cache for this render cycle (only if render cycle is active)
    if (this.isRenderCycleActive) {
      const existingFlags = cachedFlags || {};
      const updatedFlags = {
        ...existingFlags,
        [planInfoKey]: planInfo
      };

      computationCache.setFeatureFlags(userId, updatedFlags);
    }

    return planInfo;
  }

  /**
   * Pass-through methods that don't need caching
   */

  async initialize() {
    return featureService.initialize();
  }

  async canAddProduct() {
    return featureService.canAddProduct();
  }

  async canProcessOrder() {
    return featureService.canProcessOrder();
  }

  async getUsageStats() {
    // Usage stats change frequently, so no caching
    return featureService.getUsageStats();
  }

  async upgradePlan(newPlan) {
    // Clear cache when plan changes
    this.endRenderCycle();
    return featureService.upgradePlan(newPlan);
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      renderCycleActive: this.isRenderCycleActive,
      computationCacheStats: computationCache.getCacheStats()
    };
  }
}

// Create singleton instance
const featureFlagCache = new FeatureFlagCache();

export default featureFlagCache;