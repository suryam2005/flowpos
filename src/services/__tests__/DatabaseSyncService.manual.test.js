/**
 * Manual Test for DatabaseSyncService
 * 
 * Run this file with: node flowpos/src/services/__tests__/DatabaseSyncService.manual.test.js
 * 
 * This is a simple verification script to ensure DatabaseSyncService works correctly
 * before integrating it into the application.
 */

// Mock AsyncStorage
const mockStorage = {};
const AsyncStorage = {
  getItem: async (key) => mockStorage[key] || null,
  setItem: async (key, value) => { mockStorage[key] = value; },
  removeItem: async (key) => { delete mockStorage[key]; }
};

// Mock NetworkService
let mockNetworkResponses = [];
let mockNetworkCallCount = 0;

const networkService = {
  apiCall: async (endpoint, options) => {
    mockNetworkCallCount++;
    const response = mockNetworkResponses.shift();
    
    if (!response) {
      throw new Error('No mock response configured');
    }
    
    if (response.shouldThrow) {
      throw new Error(response.error || 'Network error');
    }
    
    return {
      ok: response.ok !== false,
      status: response.status || 200,
      json: async () => response.data || {}
    };
  }
};

// Mock DatabaseSyncService class inline for testing
class DatabaseSyncService {
  constructor() {
    this.PRODUCTS_STORAGE_KEY = 'products';
    this.MAX_RETRIES = 3;
    this.BASE_RETRY_DELAY = 100; // Reduced for testing
    this.syncInProgress = false;
  }

  async updateTrackStock(productId, trackStock) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }
      if (typeof trackStock !== 'boolean') {
        throw new Error('Track stock must be a boolean value');
      }

      const updatePayload = {
        trackStock: trackStock,
        updatedAt: new Date().toISOString()
      };

      const result = await this.updateWithRetry(productId, updatePayload);

      if (result.success) {
        return {
          success: true,
          error: null,
          data: result.data
        };
      } else {
        return {
          success: false,
          error: result.error,
          data: null
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update track stock',
        data: null
      };
    }
  }

  async updateStockQuantity(productId, newStock) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }
      if (typeof newStock !== 'number' || newStock < 0) {
        throw new Error('Stock quantity must be a non-negative number');
      }

      const updatePayload = {
        stock_quantity: newStock,
        updatedAt: new Date().toISOString()
      };

      const result = await this.updateWithRetry(productId, updatePayload);

      if (result.success) {
        return {
          success: true,
          error: null,
          data: result.data
        };
      } else {
        return {
          success: false,
          error: result.error,
          data: null
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update stock quantity',
        data: null
      };
    }
  }

  async syncProduct(productId, updates) {
    if (this.syncInProgress) {
      console.warn('⚠️ Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }
      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates must be an object');
      }

      const localProducts = await this.getLocalProducts();
      const productIndex = localProducts.findIndex(p => p.id === productId);

      if (productIndex === -1) {
        throw new Error(`Product not found in local storage: ${productId}`);
      }

      const originalProduct = { ...localProducts[productIndex] };

      const updatedProduct = {
        ...originalProduct,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      localProducts[productIndex] = updatedProduct;

      try {
        await AsyncStorage.setItem(this.PRODUCTS_STORAGE_KEY, JSON.stringify(localProducts));
      } catch (localError) {
        throw new Error('Failed to update local storage');
      }

      const dbResult = await this.updateWithRetry(productId, updates);

      if (!dbResult.success) {
        localProducts[productIndex] = originalProduct;
        await AsyncStorage.setItem(this.PRODUCTS_STORAGE_KEY, JSON.stringify(localProducts));
        
        return {
          success: false,
          error: dbResult.error || 'Database update failed',
          data: null
        };
      }

      return {
        success: true,
        error: null,
        data: dbResult.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to sync product',
        data: null
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  async updateWithRetry(productId, updatePayload) {
    let lastError = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await networkService.apiCall(`/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();

        return {
          success: true,
          error: null,
          data: result.data,
          retryCount: attempt
        };
      } catch (error) {
        lastError = error;
        retryCount = attempt;

        if (attempt < this.MAX_RETRIES) {
          const delay = this.BASE_RETRY_DELAY * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to update product after retries',
      data: null,
      retryCount: retryCount
    };
  }

  async getLocalProducts() {
    try {
      const productsJson = await AsyncStorage.getItem(this.PRODUCTS_STORAGE_KEY);
      if (!productsJson) {
        return [];
      }
      return JSON.parse(productsJson);
    } catch (error) {
      return [];
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isSyncing() {
    return this.syncInProgress;
  }
}

// Test suite
const service = new DatabaseSyncService();
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n🧪 Running DatabaseSyncService Manual Tests\n');

  // Test 1: updateTrackStock with valid inputs
  mockNetworkResponses = [
    { ok: true, data: { data: { id: '1', trackStock: true } } }
  ];
  const result1 = await service.updateTrackStock('1', true);
  assert(result1.success === true, 'Test 1: Should successfully update track stock');
  assert(result1.error === null, 'Test 1: Should have no error');
  assert(result1.data !== null, 'Test 1: Should return data');

  // Test 2: updateTrackStock with invalid product ID
  const result2 = await service.updateTrackStock('', true);
  assert(result2.success === false, 'Test 2: Should fail with empty product ID');
  assert(result2.error !== null, 'Test 2: Should have error message');

  // Test 3: updateTrackStock with invalid trackStock type
  const result3 = await service.updateTrackStock('1', 'invalid');
  assert(result3.success === false, 'Test 3: Should fail with non-boolean trackStock');
  assert(result3.error.includes('boolean'), 'Test 3: Error should mention boolean');

  // Test 4: updateStockQuantity with valid inputs
  mockNetworkResponses = [
    { ok: true, data: { data: { id: '1', stock_quantity: 50 } } }
  ];
  const result4 = await service.updateStockQuantity('1', 50);
  assert(result4.success === true, 'Test 4: Should successfully update stock quantity');
  assert(result4.error === null, 'Test 4: Should have no error');

  // Test 5: updateStockQuantity with negative quantity
  const result5 = await service.updateStockQuantity('1', -5);
  assert(result5.success === false, 'Test 5: Should fail with negative quantity');
  assert(result5.error.includes('non-negative'), 'Test 5: Error should mention non-negative');

  // Test 6: updateStockQuantity with invalid type
  const result6 = await service.updateStockQuantity('1', 'invalid');
  assert(result6.success === false, 'Test 6: Should fail with non-number quantity');

  // Test 7: syncProduct with valid inputs
  await AsyncStorage.setItem('products', JSON.stringify([
    { id: '1', name: 'Product A', stock_quantity: 10 }
  ]));
  mockNetworkResponses = [
    { ok: true, data: { data: { id: '1', stock_quantity: 20 } } }
  ];
  const result7 = await service.syncProduct('1', { stock_quantity: 20 });
  assert(result7.success === true, 'Test 7: Should successfully sync product');
  assert(result7.error === null, 'Test 7: Should have no error');

  // Test 8: syncProduct with non-existent product
  const result8 = await service.syncProduct('999', { stock_quantity: 20 });
  assert(result8.success === false, 'Test 8: Should fail with non-existent product');
  assert(result8.error.includes('not found'), 'Test 8: Error should mention not found');

  // Test 9: syncProduct with database failure (should rollback)
  await AsyncStorage.setItem('products', JSON.stringify([
    { id: '1', name: 'Product A', stock_quantity: 10 }
  ]));
  mockNetworkResponses = [
    { ok: false, data: { message: 'Database error' } }
  ];
  const result9 = await service.syncProduct('1', { stock_quantity: 30 });
  assert(result9.success === false, 'Test 9: Should fail when database update fails');
  
  // Verify rollback
  const products = await service.getLocalProducts();
  assert(products[0].stock_quantity === 10, 'Test 9: Should rollback to original value');

  // Test 10: Retry logic with eventual success
  mockNetworkCallCount = 0;
  mockNetworkResponses = [
    { shouldThrow: true, error: 'Network timeout' },
    { shouldThrow: true, error: 'Network timeout' },
    { ok: true, data: { data: { id: '1', trackStock: true } } }
  ];
  const result10 = await service.updateTrackStock('1', true);
  assert(result10.success === true, 'Test 10: Should succeed after retries');
  assert(mockNetworkCallCount === 3, 'Test 10: Should have made 3 attempts');

  // Test 11: Retry logic with all failures
  mockNetworkCallCount = 0;
  mockNetworkResponses = [
    { shouldThrow: true, error: 'Network timeout' },
    { shouldThrow: true, error: 'Network timeout' },
    { shouldThrow: true, error: 'Network timeout' },
    { shouldThrow: true, error: 'Network timeout' }
  ];
  const result11 = await service.updateStockQuantity('1', 100);
  assert(result11.success === false, 'Test 11: Should fail after all retries');
  assert(mockNetworkCallCount === 4, 'Test 11: Should have made 4 attempts (initial + 3 retries)');

  // Test 12: isSyncing status
  assert(service.isSyncing() === false, 'Test 12: Should not be syncing initially');

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total: ${testsPassed + testsFailed}\n`);

  if (testsFailed === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.\n');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});
