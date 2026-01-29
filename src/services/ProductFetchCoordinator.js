/**
 * ProductFetchCoordinator - Centralized product fetching with session-level caching
 * 
 * Core Principles:
 * - Coordinates product fetching across all screens
 * - Uses SessionProductStore for caching
 * - Handles cache hit/miss logic
 * - Provides post-success update methods
 * - Never changes API contracts or business logic
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import sessionProductStore from './SessionProductStore';
import productsService from './ProductsService';
import uiOptimizationConfig from './UIOptimizationConfig';
import notificationService from './NotificationService';

class ProductFetchCoordinator {
  constructor() {
    this.isInitialized = false;
    this.ongoingFetch = null; // Prevent duplicate concurrent fetches

    console.log('🎯 [ProductFetchCoordinator] Initialized');
  }

  /**
   * Initialize the coordinator (called on app start/login)
   */
  initialize() {
    if (this.isInitialized) {
      console.log('🎯 [ProductFetchCoordinator] Already initialized');
      return;
    }

    // Clear any existing session data on initialization
    sessionProductStore.clear();
    this.ongoingFetch = null;
    this.isInitialized = true;

    // Initialize notification service
    notificationService.init().catch(err => console.error('Failed to init notifications:', err));

    console.log('🎯 [ProductFetchCoordinator] Initialized and session cleared');
  }

  /**
   * Clear session data (called on logout/restart)
   */
  clearSession() {
    console.log('🎯 [ProductFetchCoordinator] Clearing session');

    sessionProductStore.clear();
    this.ongoingFetch = null;
    this.isInitialized = false;

    console.log('🎯 [ProductFetchCoordinator] Session cleared');
  }

  /**
   * Primary fetch method used by all screens
   * @param {Object} options - Fetch options
   * @param {boolean} options.forceRefresh - Force API call, bypass cache
   * @param {string} options.screenName - Name of requesting screen (for logging)
   * @param {Object} options.apiOptions - Options to pass to ProductsService
   * @returns {Promise<Array>} Products array
   */
  async fetchProducts(options = {}) {
    const {
      forceRefresh = false,
      screenName = 'Unknown',
      apiOptions = {}
    } = options;

    console.log('🎯 [ProductFetchCoordinator] fetchProducts called:', {
      screenName,
      forceRefresh,
      hasCache: sessionProductStore.hasData(),
      ongoingFetch: !!this.ongoingFetch
    });

    // Check if session caching is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isSessionCachingEnabled()) {
      console.log('🔄 [ProductFetchCoordinator] Session caching disabled - using direct API call');
      return await this._fetchFromAPI(apiOptions, screenName);
    }

    // If there's an ongoing fetch, wait for it to complete
    if (this.ongoingFetch && !forceRefresh) {
      console.log('🎯 [ProductFetchCoordinator] Waiting for ongoing fetch to complete');
      try {
        return await this.ongoingFetch;
      } catch (error) {
        console.error('🎯 [ProductFetchCoordinator] Ongoing fetch failed:', error);
        // Continue to try fresh fetch
      }
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && sessionProductStore.hasData()) {
      const cachedProducts = sessionProductStore.getProducts();
      console.log('🎯 [ProductFetchCoordinator] Cache hit - returning cached data:', {
        screenName,
        count: cachedProducts.length,
        lastFetch: sessionProductStore.getLastFetchTime()
      });
      return cachedProducts;
    }

    // Cache miss or force refresh - fetch from API
    console.log('🎯 [ProductFetchCoordinator] Cache miss or force refresh - fetching from API:', {
      screenName,
      forceRefresh,
      hasCache: sessionProductStore.hasData()
    });

    // Create fetch promise to prevent duplicate concurrent requests
    this.ongoingFetch = this._fetchFromAPI(apiOptions, screenName);

    try {
      const products = await this.ongoingFetch;

      // Store in session cache with current timestamp (only if caching is enabled)
      if (uiOptimizationConfig.isSessionCachingEnabled()) {
        sessionProductStore.setProducts(products, Date.now());
        console.log('🎯 [ProductFetchCoordinator] API fetch successful and cached:', {
          screenName,
          count: products.length,
          cached: true
        });
      } else {
        console.log('🎯 [ProductFetchCoordinator] API fetch successful (caching disabled):', {
          screenName,
          count: products.length,
          cached: false
        });
      }

      // Check for low stock alerts (fire and forget)
      notificationService.checkLowStock(products);

      return products;

    } catch (error) {
      console.error('🎯 [ProductFetchCoordinator] API fetch failed:', {
        screenName,
        error: error.message
      });

      // If we have cached data and API fails during forced refresh, return cached data
      // (only if caching is enabled)
      if (forceRefresh && uiOptimizationConfig.isSessionCachingEnabled() && sessionProductStore.hasData()) {
        const cachedProducts = sessionProductStore.getProducts();
        console.log('🎯 [ProductFetchCoordinator] API failed during force refresh, returning cached data:', {
          screenName,
          count: cachedProducts.length
        });
        return cachedProducts;
      }

      // No cached data available, propagate error
      throw error;

    } finally {
      // Clear ongoing fetch promise
      this.ongoingFetch = null;
    }
  }

  /**
   * Internal method to fetch from API
   * @param {Object} apiOptions - Options for ProductsService
   * @param {string} screenName - Requesting screen name
   * @returns {Promise<Array>} Products from API
   */
  async _fetchFromAPI(apiOptions, screenName) {
    console.log('🎯 [ProductFetchCoordinator] Calling ProductsService.getProducts:', {
      screenName,
      apiOptions
    });

    // Call the existing ProductsService - no API contract changes
    const products = await productsService.getProducts(apiOptions);

    console.log('🎯 [ProductFetchCoordinator] ProductsService returned:', {
      screenName,
      count: products.length,
      isArray: Array.isArray(products)
    });

    return products;
  }

  /**
   * Post-success update method for product creation
   * Called ONLY after successful API operation
   * @param {Object} product - Created product
   */
  onProductCreated(product) {
    if (!product || !product.id) {
      console.error('🎯 [ProductFetchCoordinator] onProductCreated: Invalid product data');
      return;
    }

    // Check if session caching is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isSessionCachingEnabled()) {
      console.log('🔄 [ProductFetchCoordinator] Session caching disabled - skipping cache update');
      return;
    }

    console.log('🎯 [ProductFetchCoordinator] Product created - updating cache:', {
      productId: product.id,
      productName: product.name
    });

    sessionProductStore.addProduct(product);
  }

  /**
   * Post-success update method for product updates
   * Called ONLY after successful API operation
   * @param {string} productId - Updated product ID
   * @param {Object} updates - Product updates
   */
  onProductUpdated(productId, updates) {
    if (!productId || !updates) {
      console.error('🎯 [ProductFetchCoordinator] onProductUpdated: Invalid parameters');
      return;
    }

    // Check if session caching is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isSessionCachingEnabled()) {
      console.log('🔄 [ProductFetchCoordinator] Session caching disabled - skipping cache update');
      return;
    }

    console.log('🎯 [ProductFetchCoordinator] Product updated - updating cache:', {
      productId,
      updates: Object.keys(updates)
    });

    sessionProductStore.updateProduct(productId, updates);

    // Check for low stock alerts
    notificationService.checkLowStock(sessionProductStore.getProducts());
  }

  /**
   * Post-success update method for product deletion
   * Called ONLY after successful API operation
   * @param {string} productId - Deleted product ID
   */
  onProductDeleted(productId) {
    if (!productId) {
      console.error('🎯 [ProductFetchCoordinator] onProductDeleted: Invalid product ID');
      return;
    }

    // Check if session caching is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isSessionCachingEnabled()) {
      console.log('🔄 [ProductFetchCoordinator] Session caching disabled - skipping cache update');
      return;
    }

    console.log('🎯 [ProductFetchCoordinator] Product deleted - updating cache:', {
      productId
    });

    sessionProductStore.removeProduct(productId);
  }

  /**
   * Post-success update method for order creation
   * Called ONLY after successful order API operation
   * Updates product stock in session store (UI only)
   * @param {Object} orderData - Created order data
   */
  onOrderCreated(orderData) {
    if (!orderData || !orderData.items) {
      console.error('🎯 [ProductFetchCoordinator] onOrderCreated: Invalid order data');
      return;
    }

    // Check if session caching is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isSessionCachingEnabled()) {
      console.log('🔄 [ProductFetchCoordinator] Session caching disabled - skipping stock update');
      return;
    }

    console.log('🎯 [ProductFetchCoordinator] Order created - updating product stock in cache:', {
      orderId: orderData.id,
      itemCount: orderData.items.length
    });

    // Update product stock in session store (UI only)
    sessionProductStore.updateStockAfterOrder(orderData.items);

    // Check for low stock alerts
    notificationService.checkLowStock(sessionProductStore.getProducts());
  }

  /**
   * Get cache statistics for debugging
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      ...sessionProductStore.getStats(),
      coordinatorInitialized: this.isInitialized,
      ongoingFetch: !!this.ongoingFetch
    };
  }

  /**
   * Force clear cache (for testing/debugging)
   */
  forceClearCache() {
    console.log('🎯 [ProductFetchCoordinator] Force clearing cache');
    sessionProductStore.clear();
  }

  /**
   * Check if coordinator is properly initialized
   * @returns {boolean} True if initialized
   */
  isReady() {
    return this.isInitialized;
  }
}

// Create singleton instance
const productFetchCoordinator = new ProductFetchCoordinator();

export default productFetchCoordinator;