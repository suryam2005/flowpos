import AsyncStorage from '@react-native-async-storage/async-storage';
import networkService from './NetworkService';

/**
 * DatabaseSyncService
 * 
 * Handles synchronization between local storage and Supabase database for product data.
 * Implements retry logic with exponential backoff for network failures.
 * Ensures atomic updates across local storage and database.
 */
class DatabaseSyncService {
  constructor() {
    this.PRODUCTS_STORAGE_KEY = 'products';
    this.MAX_RETRIES = 3;
    this.BASE_RETRY_DELAY = 1000; // 1 second
    this.syncInProgress = false;
  }

  /**
   * Updates track stock setting in database
   * @param {string} productId - Product identifier
   * @param {boolean} trackStock - New track stock value
   * @returns {Promise<Object>} { success: boolean, error: string|null, data: Object|null }
   */
  async updateTrackStock(productId, trackStock) {
    console.log('🔄 DatabaseSyncService: Updating track stock', { productId, trackStock });

    try {
      // Validate inputs
      if (!productId) {
        throw new Error('Product ID is required');
      }
      if (typeof trackStock !== 'boolean') {
        throw new Error('Track stock must be a boolean value');
      }

      // Prepare update payload
      const updatePayload = {
        trackStock: trackStock,
        updatedAt: new Date().toISOString()
      };

      // Update in database with retry logic
      const result = await this.updateWithRetry(productId, updatePayload);

      if (result.success) {
        console.log('✅ Track stock updated successfully:', productId);
        return {
          success: true,
          error: null,
          data: result.data
        };
      } else {
        console.error('❌ Failed to update track stock:', result.error);
        return {
          success: false,
          error: result.error,
          data: null
        };
      }

    } catch (error) {
      console.error('❌ Error in updateTrackStock:', error);
      return {
        success: false,
        error: error.message || 'Failed to update track stock',
        data: null
      };
    }
  }

  /**
   * Updates stock quantity in database
   * @param {string} productId - Product identifier
   * @param {number} newStock - New stock quantity
   * @returns {Promise<Object>} { success: boolean, error: string|null, data: Object|null }
   */
  async updateStockQuantity(productId, newStock) {
    console.log('🔄 DatabaseSyncService: Updating stock quantity', { productId, newStock });

    try {
      // Validate inputs
      if (!productId) {
        throw new Error('Product ID is required');
      }
      if (typeof newStock !== 'number' || newStock < 0) {
        throw new Error('Stock quantity must be a non-negative number');
      }

      // Prepare update payload
      const updatePayload = {
        stock_quantity: newStock,
        updatedAt: new Date().toISOString()
      };

      // Update in database with retry logic
      const result = await this.updateWithRetry(productId, updatePayload);

      if (result.success) {
        console.log('✅ Stock quantity updated successfully:', productId);
        return {
          success: true,
          error: null,
          data: result.data
        };
      } else {
        console.error('❌ Failed to update stock quantity:', result.error);
        return {
          success: false,
          error: result.error,
          data: null
        };
      }

    } catch (error) {
      console.error('❌ Error in updateStockQuantity:', error);
      return {
        success: false,
        error: error.message || 'Failed to update stock quantity',
        data: null
      };
    }
  }

  /**
   * Syncs product data atomically between local storage and database
   * @param {string} productId - Product identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} { success: boolean, error: string|null, data: Object|null }
   */
  async syncProduct(productId, updates) {
    console.log('🔄 DatabaseSyncService: Syncing product atomically', { productId, updates });

    if (this.syncInProgress) {
      console.warn('⚠️ Sync already in progress, queuing request');
    }

    this.syncInProgress = true;

    try {
      // Validate inputs
      if (!productId) {
        throw new Error('Product ID is required');
      }
      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates must be an object');
      }

      // Step 1: Get current local products
      const localProducts = await this.getLocalProducts();
      const productIndex = localProducts.findIndex(p => p.id === productId);

      if (productIndex === -1) {
        throw new Error(`Product not found in local storage: ${productId}`);
      }

      // Store original product for rollback
      const originalProduct = { ...localProducts[productIndex] };

      // Step 2: Update local storage first
      const updatedProduct = {
        ...originalProduct,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      localProducts[productIndex] = updatedProduct;

      try {
        await AsyncStorage.setItem(this.PRODUCTS_STORAGE_KEY, JSON.stringify(localProducts));
        console.log('✅ Local storage updated');
      } catch (localError) {
        console.error('❌ Failed to update local storage:', localError);
        throw new Error('Failed to update local storage');
      }

      // Step 3: Update database with retry logic
      const dbResult = await this.updateWithRetry(productId, updates);

      if (!dbResult.success) {
        // Rollback local storage on database failure
        console.warn('⚠️ Database update failed, rolling back local storage');
        localProducts[productIndex] = originalProduct;
        await AsyncStorage.setItem(this.PRODUCTS_STORAGE_KEY, JSON.stringify(localProducts));
        
        return {
          success: false,
          error: dbResult.error || 'Database update failed',
          data: null
        };
      }

      console.log('✅ Product synced atomically:', productId);
      return {
        success: true,
        error: null,
        data: dbResult.data
      };

    } catch (error) {
      console.error('❌ Error in syncProduct:', error);
      return {
        success: false,
        error: error.message || 'Failed to sync product',
        data: null
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Updates product in database with exponential backoff retry logic
   * @param {string} productId - Product identifier
   * @param {Object} updatePayload - Data to update
   * @returns {Promise<Object>} { success: boolean, error: string|null, data: Object|null, retryCount: number }
   */
  async updateWithRetry(productId, updatePayload) {
    let lastError = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1}/${this.MAX_RETRIES + 1} to update product ${productId}`);

        // Make API call to update product
        const response = await networkService.apiCall(`/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log(`✅ Update successful on attempt ${attempt + 1}`);

        return {
          success: true,
          error: null,
          data: result.data,
          retryCount: attempt
        };

      } catch (error) {
        lastError = error;
        retryCount = attempt;

        console.error(`❌ Attempt ${attempt + 1} failed:`, error.message);

        // Don't retry on last attempt
        if (attempt < this.MAX_RETRIES) {
          // Calculate exponential backoff delay
          const delay = this.BASE_RETRY_DELAY * Math.pow(2, attempt);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    console.error(`❌ All ${this.MAX_RETRIES + 1} attempts failed for product ${productId}`);
    return {
      success: false,
      error: lastError?.message || 'Failed to update product after retries',
      data: null,
      retryCount: retryCount
    };
  }

  /**
   * Gets products from local storage
   * @returns {Promise<Array>} Array of products
   */
  async getLocalProducts() {
    try {
      const productsJson = await AsyncStorage.getItem(this.PRODUCTS_STORAGE_KEY);
      if (!productsJson) {
        return [];
      }
      return JSON.parse(productsJson);
    } catch (error) {
      console.error('❌ Error reading local products:', error);
      return [];
    }
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets sync status
   * @returns {boolean} Whether sync is in progress
   */
  isSyncing() {
    return this.syncInProgress;
  }
}

// Create singleton instance
const databaseSyncService = new DatabaseSyncService();

export default databaseSyncService;
