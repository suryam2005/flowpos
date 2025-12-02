import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import networkService from './NetworkService';

class ProductsService {
  constructor() {
    this.PRODUCTS_STORAGE_KEY = 'products';
    this.PENDING_SYNC_KEY = 'pendingProductsSync';
    this.LAST_SYNC_KEY = 'lastProductsSync';
    this.isOnline = true;
    this.syncInProgress = false;
    this.abortController = null;
    
    // Initialize network monitoring
    this.initNetworkMonitoring();
  }

  // Initialize network monitoring (SYNC DISABLED)
  initNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      console.log('📡 Products - Network status:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        isOnline: this.isOnline
      });

      // Auto-sync DISABLED - using direct Supabase only
      if (this.isOnline) {
        console.log('🌐 Network restored - Direct Supabase mode (no sync needed)');
      }
    });
  }

  // Generate local product ID
  generateLocalProductId() {
    return `local_product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate product SKU
  generateProductSKU(name) {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanName.substring(0, 6)}-${timestamp}`;
  }

  // Create product (DIRECT TO SUPABASE - NO LOCAL STORAGE)
  async createProduct(productData) {
    try {
      console.log('🚨🚨🚨 PRODUCTSSERVICE.CREATEPRODUCT CALLED! 🚨🚨🚨');
      console.log('📦 [MOBILE DEBUG] Creating product DIRECTLY in Supabase (NO LOCAL STORAGE):', productData);
      console.log('📦 [MOBILE DEBUG] Network status:', this.isOnline);

      if (!this.isOnline) {
        console.error('❌ [MOBILE DEBUG] Offline - cannot create product');
        throw new Error('Cannot create products while offline. Please check your internet connection.');
      }

      // Prepare product data for Supabase
      const product = {
        name: productData.name,
        description: productData.description || '',
        price: parseFloat(productData.price) || 0,
        category: productData.category || 'General',
        sku: productData.sku || this.generateProductSKU(productData.name),
        stock_quantity: parseInt(productData.stock_quantity) || 0,
        low_stock_threshold: parseInt(productData.low_stock_threshold) || 5,
        image_url: productData.image_url || '',
        barcode: productData.barcode || '',
        cost_price: parseFloat(productData.cost_price) || 0,
        tax_rate: parseFloat(productData.tax_rate) || 0,
        discount_percentage: parseFloat(productData.discount_percentage) || 0,
        weight: parseFloat(productData.weight) || 0,
        dimensions: productData.dimensions || {},
        tags: productData.tags || [],
        is_active: productData.is_active !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('📦 [MOBILE DEBUG] Prepared product data:', product);

      // Create DIRECTLY in Supabase - NO LOCAL STORAGE
      console.log('📦 [MOBILE DEBUG] Calling createProductInCloud...');
      const cloudProduct = await this.createProductInCloud(product);
      
      console.log('✅ [MOBILE DEBUG] Product created directly in Supabase:', cloudProduct);
      console.log('✅ [MOBILE DEBUG] Product ID:', cloudProduct.id);
      return cloudProduct;

    } catch (error) {
      console.error('❌ [MOBILE DEBUG] Error creating product in Supabase:', error);
      console.error('❌ [MOBILE DEBUG] Error details:', error.message);
      console.error('❌ [MOBILE DEBUG] Error stack:', error.stack);
      throw error;
    }
  }

  // Get all products (CLOUD ONLY - NO CACHE)
  async getProducts(options = {}) {
    try {
      console.log('📦 [MOBILE DEBUG] Fetching products DIRECTLY from Supabase (NO CACHE):', options);
      console.log('📦 [MOBILE DEBUG] Network status:', this.isOnline);

      if (!this.isOnline) {
        console.log('📱 [MOBILE DEBUG] Offline - cannot fetch products without internet');
        return [];
      }

      // Don't use abortController to prevent request cancellation issues
      // Removed problematic abort controller logic
      
      // Always fetch fresh data from Supabase - NO LOCAL CACHE
      console.log('📦 [MOBILE DEBUG] Calling getProductsFromCloud...');
      const products = await this.getProductsFromCloud(options);
      console.log('✅ [MOBILE DEBUG] Fresh products fetched directly from Supabase:', products.length);
      console.log('✅ [MOBILE DEBUG] Products data:', products);

      // Apply client-side filtering if needed
      let filteredProducts = products;

      if (options.category) {
        filteredProducts = filteredProducts.filter(product => 
          product.category?.toLowerCase() === options.category.toLowerCase()
        );
      }

      if (options.active !== undefined) {
        filteredProducts = filteredProducts.filter(product => product.is_active === options.active);
      }

      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
          product.name?.toLowerCase().includes(searchTerm) ||
          product.sku?.toLowerCase().includes(searchTerm) ||
          product.barcode?.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by name or created date
      filteredProducts.sort((a, b) => {
        if (options.sortBy === 'name') {
          return a.name?.localeCompare(b.name) || 0;
        }
        // Sort by created date (newest first)
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateB - dateA;
      });

      console.log('📊 Returning fresh products from Supabase:', filteredProducts.length);
      return filteredProducts;

    } catch (error) {
      console.error('❌ Error fetching fresh products from Supabase:', error);
      
      // If it's an AbortError, don't throw - just return empty
      if (error.name === 'AbortError') {
        console.log('🔄 Request was cancelled, returning empty array');
        return [];
      }
      
      console.log('🔄 Returning empty array due to error');
      return [];
    }
  }

  // Get products from cloud with timeout
  async getProductsFromCloudWithTimeout(options = {}, timeout = 10000) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);

      try {
        const products = await this.getProductsFromCloud(options);
        clearTimeout(timeoutId);
        resolve(products);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  // Update product (DIRECT TO SUPABASE - NO LOCAL STORAGE)
  async updateProduct(productId, updateData) {
    try {
      console.log('📝 Updating product DIRECTLY in Supabase (NO LOCAL STORAGE):', productId, updateData);

      if (!this.isOnline) {
        throw new Error('Cannot update products while offline. Please check your internet connection.');
      }

      // Prepare update data for Supabase
      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      // Update DIRECTLY in Supabase - NO LOCAL STORAGE
      const updatedProduct = await this.updateProductInCloud(productId, updatePayload);
      
      console.log('✅ Product updated directly in Supabase:', updatedProduct.id);
      return updatedProduct;

    } catch (error) {
      console.error('❌ Error updating product in Supabase:', error);
      throw error;
    }
  }

  // Delete product (DIRECT TO SUPABASE - NO LOCAL STORAGE)
  async deleteProduct(productId) {
    try {
      console.log('🗑️ Deleting product DIRECTLY from Supabase (NO LOCAL STORAGE):', productId);

      if (!this.isOnline) {
        throw new Error('Cannot delete products while offline. Please check your internet connection.');
      }

      // Delete DIRECTLY from Supabase - NO LOCAL STORAGE
      await this.deleteProductFromCloud(productId);
      
      console.log('✅ Product deleted directly from Supabase:', productId);
      return true;

    } catch (error) {
      console.error('❌ Error deleting product from Supabase:', error);
      throw error;
    }
  }

  // Sync disabled - Direct Supabase only
  async syncPendingProducts() {
    console.log('🚫 SYNC DISABLED - Using direct Supabase sync only');
    return;
  }

  // Remove duplicate products before syncing
  async removeDuplicateProducts(products) {
    try {
      const cloudProducts = await this.getProductsFromCloud({ limit: 1000 });
      
      const cloudSKUs = new Set(cloudProducts.map(p => p.sku));
      const cloudLocalIds = new Set(cloudProducts.map(p => p.localId).filter(Boolean));
      
      const uniqueProducts = products.filter(product => {
        const isDuplicateBySKU = cloudSKUs.has(product.sku);
        const isDuplicateByLocalId = cloudLocalIds.has(product.localId || product.id);
        
        if (isDuplicateBySKU || isDuplicateByLocalId) {
          console.log(`🗑️ Removing duplicate product: ${product.name} (${product.sku})`);
          return false;
        }
        
        return true;
      });
      
      return uniqueProducts;
      
    } catch (error) {
      console.log('⚠️ Could not check for duplicate products, proceeding with all:', error.message);
      return products;
    }
  }

  // Local storage operations (DISABLED - DIRECT SUPABASE ONLY)
  async saveProductLocally(product) {
    console.log('🚫 Local storage disabled - products go directly to Supabase');
    return;
  }

  async getProductsFromLocal() {
    console.log('🚫 Local storage disabled - returning empty array');
    return [];
  }

  async getProductFromLocal(productId) {
    console.log('🚫 Local storage disabled - returning null');
    return null;
  }

  async updateProductLocally(updatedProduct) {
    console.log('🚫 Local storage disabled - products update directly in Supabase');
    return;
  }

  async removeProductLocally(productId) {
    console.log('🚫 Local storage disabled - products delete directly from Supabase');
    return;
  }

  async cacheProductsLocally(products) {
    console.log('🚫 Local caching disabled - products fetched directly from Supabase');
    return;
  }

  // Cloud operations
  async createProductInCloud(productData) {
    try {
      console.log('🌐 [MOBILE DEBUG] createProductInCloud called with:', productData);
      
      const requestBody = {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        category: productData.category,
        sku: productData.sku,
        stock_quantity: productData.stock_quantity,
        image_url: productData.image_url
      };
      
      console.log('🌐 [MOBILE DEBUG] Request body:', requestBody);
      console.log('🌐 [MOBILE DEBUG] Making API call to /products...');
      
      const response = await networkService.apiCall('/products', {
        method: 'POST',
        body: JSON.stringify(requestBody)
        // Removed abort signal to prevent cancellation
      });

      console.log('🌐 [MOBILE DEBUG] API response status:', response.status);
      console.log('🌐 [MOBILE DEBUG] API response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [MOBILE DEBUG] API error response:', errorData);
        throw new Error(errorData.message || 'Failed to create product in cloud');
      }

      const result = await response.json();
      console.log('✅ [MOBILE DEBUG] API success response:', result);
      console.log('✅ [MOBILE DEBUG] Returning product data:', result.data);
      return result.data;

    } catch (error) {
      console.error('❌ [MOBILE DEBUG] Error in createProductInCloud:', error);
      console.error('❌ [MOBILE DEBUG] Error message:', error.message);
      throw error;
    }
  }

  async getProductsFromCloud(options = {}) {
    console.log('📦 [MOBILE DEBUG] getProductsFromCloud called with options:', options);
    
    try {
      // Check if networkService exists and has apiCall method
      if (!networkService || typeof networkService.apiCall !== 'function') {
        console.error('❌ NetworkService or apiCall method not available');
        throw new Error('NetworkService not properly initialized');
      }

      console.log('📦 [MOBILE DEBUG] Calling networkService.apiCall...');
      
      // Don't use abortController signal to prevent premature cancellation
      const response = await networkService.apiCall('/products', {
        method: 'GET'
        // Removed: signal: this.abortController?.signal
      });

      console.log('📦 [MOBILE DEBUG] Got response:', response.status, response.ok);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('📦 [MOBILE DEBUG] Parsed result:', result);
      
      const products = result.data || [];
      console.log('📦 [MOBILE DEBUG] Returning products count:', products.length);
      
      return products;

    } catch (error) {
      console.error('❌ Error fetching products from cloud:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  async updateProductInCloud(productId, updateData) {
    try {
      const response = await networkService.apiCall(`/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
        // Removed abort signal to prevent cancellation
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product in cloud');
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('Error updating product in cloud:', error);
      throw error;
    }
  }

  async deleteProductFromCloud(productId) {
    try {
      const response = await networkService.apiCall(`/products/${productId}`, {
        method: 'DELETE'
        // Removed abort signal to prevent cancellation
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product from cloud');
      }

      return true;

    } catch (error) {
      console.error('Error deleting product from cloud:', error);
      throw error;
    }
  }

  // Pending sync operations (DISABLED - DIRECT SUPABASE ONLY)
  async addToPendingSync(product) {
    console.log('🚫 Pending sync disabled - using direct Supabase only');
    return;
  }

  async getPendingProducts() {
    console.log('🚫 Pending sync disabled - returning empty array');
    return [];
  }

  async removeSyncedFromPending(syncedResults) {
    try {
      const pending = await this.getPendingProducts();
      const syncedLocalIds = syncedResults.map(r => r.localId);
      
      const remaining = pending.filter(product => 
        !syncedLocalIds.includes(product.localId || product.id)
      );

      await AsyncStorage.setItem(this.PENDING_SYNC_KEY, JSON.stringify(remaining));
      console.log('🗑️ Removed synced products from pending:', syncedLocalIds.length);

    } catch (error) {
      console.error('Error removing synced products from pending:', error);
    }
  }

  async clearPendingSync() {
    try {
      await AsyncStorage.setItem(this.PENDING_SYNC_KEY, JSON.stringify([]));
      console.log('🗑️ Cleared all pending product syncs');
    } catch (error) {
      console.error('Error clearing pending product sync:', error);
    }
  }

  // Utility methods
  mergeProducts(cloudProducts, localProducts) {
    const merged = [...cloudProducts];
    
    // Add local products that aren't in cloud
    for (const localProduct of localProducts) {
      const existsInCloud = cloudProducts.some(cloudProduct => 
        cloudProduct.id === localProduct.cloudId ||
        cloudProduct.localId === localProduct.localId ||
        cloudProduct.localId === localProduct.id ||
        cloudProduct.sku === localProduct.sku
      );
      
      if (!existsInCloud) {
        merged.push(localProduct);
      }
    }

    return merged;
  }

  // Public methods for manual sync (DISABLED)
  async forceSyncNow() {
    console.log('🚫 Force sync disabled - Using direct Supabase only');
    return;
  }

  async getPendingCount() {
    const pending = await this.getPendingProducts();
    return pending.length;
  }

  async getLastSyncTime() {
    try {
      const lastSync = await AsyncStorage.getItem(this.LAST_SYNC_KEY);
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      return null;
    }
  }

  // Clear all local data (for testing/reset)
  async clearLocalData() {
    try {
      await AsyncStorage.multiRemove([
        this.PRODUCTS_STORAGE_KEY,
        this.PENDING_SYNC_KEY,
        this.LAST_SYNC_KEY
      ]);
      console.log('🗑️ Local products data cleared');
    } catch (error) {
      console.error('Error clearing local products data:', error);
    }
  }

  // Cancel any ongoing requests
  cancelOngoingRequests() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      console.log('🚫 Cancelled ongoing product requests');
    }
  }
}

// Create singleton instance
const productsService = new ProductsService();

export default productsService;