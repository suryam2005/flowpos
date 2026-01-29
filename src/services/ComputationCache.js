/**
 * ComputationCache - Phase C: Computation Reuse Infrastructure
 * 
 * Purpose: Cache expensive computations like analytics and feature flag evaluations
 * to avoid redundant calculations when source data hasn't changed.
 * 
 * Key Principles:
 * - Analytics caching uses deterministic hash keys based on orders data
 * - Feature flag caching is scoped to render cycle only (never persist across screens/sessions)
 * - All caching is in-memory only, cleared on logout/restart
 * - Cache keys must be deterministic and change when data meaningfully changes
 * - Respects rollback configuration to disable computation reuse
 */

import uiOptimizationConfig from './UIOptimizationConfig';

// Simple hash function for React Native compatibility
// Using djb2 hash algorithm for deterministic string hashing

class ComputationCache {
  constructor() {
    this.analyticsCache = new Map();
    this.featureFlagsCache = new Map();
    this.renderCycleId = null;
    this.maxAnalyticsCacheSize = 50; // LRU eviction limit
  }

  /**
   * Simple hash function for React Native compatibility
   * Uses djb2 algorithm for deterministic string hashing
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate deterministic hash for orders data
   * Hash changes when orders meaningfully change (content, not just order)
   * @param {Array} orders - Array of order objects
   * @returns {string} Deterministic hash string
   */
  generateOrdersHash(orders) {
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return 'empty_orders';
    }

    // Create a deterministic representation of orders data
    // Sort by ID to ensure consistent ordering, then extract meaningful fields
    const ordersForHash = orders
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''))
      .map(order => ({
        id: order.id,
        total: order.total,
        timestamp: order.timestamp || order.createdAt || order.created_at,
        items: order.items ? order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })).sort((a, b) => a.name.localeCompare(b.name)) : []
      }));

    const dataString = JSON.stringify(ordersForHash);
    return this.simpleHash(dataString);
  }

  /**
   * Get cached analytics data
   * @param {string} ordersHash - Deterministic hash of orders data
   * @returns {Object|null} Cached analytics data or null if not found/expired
   */
  getAnalytics(ordersHash) {
    // Check if computation reuse is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isComputationReuseEnabled()) {
      return null; // Force recomputation when disabled
    }

    if (!ordersHash) {
      return null;
    }

    const cached = this.analyticsCache.get(ordersHash);
    if (!cached) {
      return null;
    }

    // Analytics cache doesn't expire based on time, only on data changes
    // The hash key ensures we only get results when data hasn't changed
    return cached.data;
  }

  /**
   * Set analytics data in cache
   * @param {string} ordersHash - Deterministic hash of orders data
   * @param {Object} analytics - Analytics computation results
   */
  setAnalytics(ordersHash, analytics) {
    // Check if computation reuse is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isComputationReuseEnabled()) {
      console.log('🔄 [ComputationCache] Computation reuse disabled - skipping analytics cache');
      return;
    }

    if (!ordersHash || !analytics) {
      return;
    }

    // Implement LRU eviction if cache gets too large
    if (this.analyticsCache.size >= this.maxAnalyticsCacheSize) {
      const firstKey = this.analyticsCache.keys().next().value;
      this.analyticsCache.delete(firstKey);
    }

    this.analyticsCache.set(ordersHash, {
      data: analytics,
      timestamp: Date.now()
    });
  }

  /**
   * Generate render cycle ID for feature flag scoping
   * @returns {string} Unique render cycle identifier
   */
  generateRenderCycleId() {
    return `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start new render cycle (clears previous feature flag cache)
   */
  startRenderCycle() {
    this.renderCycleId = this.generateRenderCycleId();
    this.featureFlagsCache.clear(); // Clear previous render cycle flags
  }

  /**
   * Get cached feature flags for current render cycle
   * @param {string} userId - User identifier
   * @returns {Object|null} Cached feature flags or null if not found
   */
  getFeatureFlags(userId) {
    // Check if computation reuse is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isComputationReuseEnabled()) {
      return null; // Force re-evaluation when disabled
    }

    if (!this.renderCycleId || !userId) {
      return null;
    }

    const cacheKey = `${userId}_${this.renderCycleId}`;
    const cached = this.featureFlagsCache.get(cacheKey);
    
    return cached ? cached.data : null;
  }

  /**
   * Set feature flags in cache for current render cycle
   * @param {string} userId - User identifier
   * @param {Object} flags - Feature flags evaluation results
   */
  setFeatureFlags(userId, flags) {
    // Check if computation reuse is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isComputationReuseEnabled()) {
      console.log('🔄 [ComputationCache] Computation reuse disabled - skipping feature flags cache');
      return;
    }

    if (!this.renderCycleId || !userId || !flags) {
      return;
    }

    const cacheKey = `${userId}_${this.renderCycleId}`;
    this.featureFlagsCache.set(cacheKey, {
      data: flags,
      timestamp: Date.now()
    });
  }

  /**
   * Clear analytics cache
   */
  clearAnalytics() {
    this.analyticsCache.clear();
  }

  /**
   * Clear feature flags cache
   */
  clearFeatureFlags() {
    this.featureFlagsCache.clear();
    this.renderCycleId = null;
  }

  /**
   * Clear all caches (called on logout/restart)
   */
  clearAll() {
    this.clearAnalytics();
    this.clearFeatureFlags();
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      analytics: {
        size: this.analyticsCache.size,
        maxSize: this.maxAnalyticsCacheSize
      },
      featureFlags: {
        size: this.featureFlagsCache.size,
        currentRenderCycle: this.renderCycleId
      }
    };
  }

  /**
   * Check if analytics are cached for given orders hash
   * @param {string} ordersHash - Orders data hash
   * @returns {boolean} True if cached data exists
   */
  hasAnalytics(ordersHash) {
    return this.analyticsCache.has(ordersHash);
  }

  /**
   * Check if feature flags are cached for current render cycle
   * @param {string} userId - User identifier
   * @returns {boolean} True if cached flags exist
   */
  hasFeatureFlags(userId) {
    if (!this.renderCycleId || !userId) {
      return false;
    }
    const cacheKey = `${userId}_${this.renderCycleId}`;
    return this.featureFlagsCache.has(cacheKey);
  }
}

// Create singleton instance
const computationCache = new ComputationCache();

export default computationCache;