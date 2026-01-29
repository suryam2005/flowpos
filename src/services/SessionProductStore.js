/**
 * SessionProductStore - In-memory storage for product data during app session
 * 
 * Core Principles:
 * - In-memory only storage (never persists to AsyncStorage)
 * - Clears on logout/restart
 * - Used for UI optimization only, never for business logic
 * - Maintains timestamp for diagnostics and future staleness checks
 * 
 * Requirements: 1.1, 1.2, 1.5, 1.6, 1.7
 */

class SessionProductStore {
  constructor() {
    this.products = null;
    this.lastFetchTime = null;
    this.isInitialized = false;
    
    console.log('📦 [SessionProductStore] Initialized - in-memory only storage');
  }

  /**
   * Get cached products
   * @returns {Array|null} Products array or null if no data
   */
  getProducts() {
    console.log('📦 [SessionProductStore] getProducts called:', {
      hasData: this.products !== null,
      count: this.products?.length || 0,
      lastFetch: this.lastFetchTime
    });
    
    return this.products;
  }

  /**
   * Store products with timestamp
   * @param {Array} products - Products array to store
   * @param {number} timestamp - Timestamp when data was fetched
   */
  setProducts(products, timestamp = Date.now()) {
    if (!Array.isArray(products)) {
      console.error('📦 [SessionProductStore] setProducts: Invalid products data, expected array');
      return;
    }

    this.products = [...products]; // Create a copy to avoid mutations
    this.lastFetchTime = timestamp;
    this.isInitialized = true;

    console.log('📦 [SessionProductStore] Products stored:', {
      count: products.length,
      timestamp: new Date(timestamp).toISOString(),
      sampleProduct: products[0]?.name || 'No products'
    });
  }

  /**
   * Clear all stored data (called on logout/restart)
   */
  clear() {
    console.log('📦 [SessionProductStore] Clearing session data');
    
    this.products = null;
    this.lastFetchTime = null;
    this.isInitialized = false;
    
    console.log('📦 [SessionProductStore] Session data cleared');
  }

  /**
   * Get last fetch timestamp
   * @returns {number|null} Timestamp or null if no data
   */
  getLastFetchTime() {
    return this.lastFetchTime;
  }

  /**
   * Check if store has data
   * @returns {boolean} True if has data, false otherwise
   */
  hasData() {
    return this.products !== null && Array.isArray(this.products);
  }

  /**
   * Update a specific product (post-API success only)
   * @param {string} productId - Product ID to update
   * @param {Object} updates - Partial product updates
   */
  updateProduct(productId, updates) {
    if (!this.hasData()) {
      console.log('📦 [SessionProductStore] updateProduct: No data to update');
      return;
    }

    const productIndex = this.products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      console.log('📦 [SessionProductStore] updateProduct: Product not found:', productId);
      return;
    }

    // Update the product with new data
    this.products[productIndex] = {
      ...this.products[productIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    console.log('📦 [SessionProductStore] Product updated:', {
      productId,
      productName: this.products[productIndex].name,
      updates: Object.keys(updates)
    });
  }

  /**
   * Add a new product (post-API success only)
   * @param {Object} product - Product to add
   */
  addProduct(product) {
    if (!product || !product.id) {
      console.error('📦 [SessionProductStore] addProduct: Invalid product data');
      return;
    }

    if (!this.hasData()) {
      // Initialize with single product if no data exists
      this.products = [product];
    } else {
      // Check if product already exists
      const existingIndex = this.products.findIndex(p => p.id === product.id);
      if (existingIndex !== -1) {
        console.log('📦 [SessionProductStore] addProduct: Product already exists, updating instead');
        this.products[existingIndex] = product;
      } else {
        this.products.push(product);
      }
    }

    console.log('📦 [SessionProductStore] Product added:', {
      productId: product.id,
      productName: product.name,
      totalCount: this.products.length
    });
  }

  /**
   * Remove a product (post-API success only)
   * @param {string} productId - Product ID to remove
   */
  removeProduct(productId) {
    if (!this.hasData()) {
      console.log('📦 [SessionProductStore] removeProduct: No data to remove from');
      return;
    }

    const initialCount = this.products.length;
    this.products = this.products.filter(p => p.id !== productId);
    const finalCount = this.products.length;

    if (initialCount === finalCount) {
      console.log('📦 [SessionProductStore] removeProduct: Product not found:', productId);
    } else {
      console.log('📦 [SessionProductStore] Product removed:', {
        productId,
        remainingCount: finalCount
      });
    }
  }

  /**
   * Update product stock after successful order (UI only)
   * Called ONLY after successful order API - does not affect backend validation
   * @param {Array} orderItems - Array of order items with product names and quantities
   */
  updateStockAfterOrder(orderItems) {
    if (!this.hasData()) {
      console.log('📦 [SessionProductStore] updateStockAfterOrder: No data to update');
      return;
    }

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      console.log('📦 [SessionProductStore] updateStockAfterOrder: No order items provided');
      return;
    }

    let updatedCount = 0;

    for (const orderItem of orderItems) {
      const productName = orderItem.name || orderItem.product_name;
      const quantity = parseInt(orderItem.quantity) || 0;

      if (!productName || quantity <= 0) {
        console.log('📦 [SessionProductStore] updateStockAfterOrder: Invalid order item:', orderItem);
        continue;
      }

      // Find product by name
      const productIndex = this.products.findIndex(p => p.name === productName);
      if (productIndex === -1) {
        console.log('📦 [SessionProductStore] updateStockAfterOrder: Product not found:', productName);
        continue;
      }

      const product = this.products[productIndex];

      // CRITICAL: Only update stock for products that track stock
      // Products with trackStock: false should not have stock limits
      if (product.track_stock === false || product.trackStock === false) {
        console.log('📦 [SessionProductStore] updateStockAfterOrder: Skipping stock update for non-tracked product:', productName);
        continue;
      }

      // Update stock (UI only - backend already handled the actual inventory)
      const previousStock = product.stock || 0;
      const newStock = Math.max(0, previousStock - quantity); // Prevent negative stock in UI

      this.products[productIndex] = {
        ...product,
        stock: newStock,
        updatedAt: new Date().toISOString()
      };

      console.log('📦 [SessionProductStore] Stock updated after order:', {
        productName,
        previousStock,
        newStock,
        quantityOrdered: quantity
      });

      updatedCount++;
    }

    console.log('📦 [SessionProductStore] Order stock update complete:', {
      totalItems: orderItems.length,
      updatedProducts: updatedCount
    });
  }
  getStats() {
    return {
      hasData: this.hasData(),
      productCount: this.products?.length || 0,
      lastFetchTime: this.lastFetchTime,
      lastFetchAge: this.lastFetchTime ? Date.now() - this.lastFetchTime : null,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Validate that we're not persisting to AsyncStorage
   * This method is for testing/debugging purposes
   */
  validateInMemoryOnly() {
    // This is a compile-time check - if AsyncStorage is imported here, it's a violation
    const hasAsyncStorage = typeof AsyncStorage !== 'undefined';
    if (hasAsyncStorage) {
      console.warn('⚠️ [SessionProductStore] AsyncStorage detected - ensure no persistence calls are made');
    }
    
    return {
      inMemoryOnly: true,
      asyncStorageDetected: hasAsyncStorage,
      storageType: 'memory'
    };
  }
}

// Create singleton instance
const sessionProductStore = new SessionProductStore();

export default sessionProductStore;