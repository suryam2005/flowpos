/**
 * Phase A Validation Checkpoint Tests
 * 
 * This test suite validates that Phase A implementation meets all requirements:
 * - App restart → products API called
 * - Logout → products cleared
 * - Navigation between screens → no refetch
 * - Pull-to-refresh → API always called
 * 
 * Requirements: 10.1, 10.2, 10.3
 */

import productFetchCoordinator from '../ProductFetchCoordinator';
import sessionProductStore from '../SessionProductStore';
import productsService from '../ProductsService';

// Mock ProductsService to track API calls
jest.mock('../ProductsService', () => ({
  getProducts: jest.fn()
}));

describe('Phase A Validation Checkpoint', () => {
  let mockProducts;
  let apiCallCount;

  beforeEach(() => {
    // Reset mocks and counters
    jest.clearAllMocks();
    apiCallCount = 0;
    
    // Mock products data
    mockProducts = [
      { id: '1', name: 'Product 1', price: 10.00, stock_quantity: 5 },
      { id: '2', name: 'Product 2', price: 20.00, stock_quantity: 3 },
      { id: '3', name: 'Product 3', price: 15.00, stock_quantity: 8 }
    ];

    // Mock ProductsService.getProducts to track calls
    productsService.getProducts.mockImplementation(() => {
      apiCallCount++;
      console.log(`🧪 [Test] API call #${apiCallCount} to ProductsService.getProducts`);
      return Promise.resolve([...mockProducts]);
    });

    // Clear session store and coordinator
    productFetchCoordinator.clearSession();
    sessionProductStore.clear();
  });

  afterEach(() => {
    // Clean up after each test
    productFetchCoordinator.clearSession();
    sessionProductStore.clear();
  });

  describe('Requirement 10.1: App restart → products API called', () => {
    test('should call API on first fetch after app restart/initialization', async () => {
      console.log('🧪 [Test] Testing app restart behavior...');
      
      // Simulate app restart by initializing coordinator
      productFetchCoordinator.initialize();
      
      // Verify session store is empty after restart
      expect(sessionProductStore.hasData()).toBe(false);
      expect(sessionProductStore.getProducts()).toBeNull();
      
      // First fetch should call API
      const products = await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen',
        forceRefresh: false
      });
      
      // Verify API was called
      expect(apiCallCount).toBe(1);
      expect(productsService.getProducts).toHaveBeenCalledTimes(1);
      expect(products).toEqual(mockProducts);
      
      // Verify data is now cached
      expect(sessionProductStore.hasData()).toBe(true);
      expect(sessionProductStore.getProducts()).toEqual(mockProducts);
      
      console.log('✅ [Test] App restart behavior verified');
    });

    test('should call API again after coordinator is cleared and reinitialized', async () => {
      console.log('🧪 [Test] Testing multiple restart cycles...');
      
      // First initialization and fetch
      productFetchCoordinator.initialize();
      await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen1' });
      expect(apiCallCount).toBe(1);
      
      // Simulate app restart
      productFetchCoordinator.clearSession();
      productFetchCoordinator.initialize();
      
      // Should call API again after restart
      await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen2' });
      expect(apiCallCount).toBe(2);
      
      console.log('✅ [Test] Multiple restart cycles verified');
    });
  });

  describe('Requirement 10.2: Logout → products cleared', () => {
    test('should clear session store on logout/clearSession', async () => {
      console.log('🧪 [Test] Testing logout behavior...');
      
      // Initialize and populate cache
      productFetchCoordinator.initialize();
      await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen' });
      
      // Verify cache is populated
      expect(sessionProductStore.hasData()).toBe(true);
      expect(sessionProductStore.getProducts()).toEqual(mockProducts);
      expect(apiCallCount).toBe(1);
      
      // Simulate logout
      productFetchCoordinator.clearSession();
      
      // Verify cache is cleared
      expect(sessionProductStore.hasData()).toBe(false);
      expect(sessionProductStore.getProducts()).toBeNull();
      expect(sessionProductStore.getLastFetchTime()).toBeNull();
      
      // Verify coordinator is not initialized
      expect(productFetchCoordinator.isReady()).toBe(false);
      
      console.log('✅ [Test] Logout behavior verified');
    });

    test('should require API call after logout and re-login', async () => {
      console.log('🧪 [Test] Testing logout and re-login cycle...');
      
      // Initial login and fetch
      productFetchCoordinator.initialize();
      await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen1' });
      expect(apiCallCount).toBe(1);
      
      // Logout
      productFetchCoordinator.clearSession();
      
      // Re-login and fetch
      productFetchCoordinator.initialize();
      await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen2' });
      
      // Should have made another API call
      expect(apiCallCount).toBe(2);
      
      console.log('✅ [Test] Logout and re-login cycle verified');
    });
  });

  describe('Requirement 10.3: Navigation between screens → no refetch', () => {
    test('should use cached data for subsequent screen requests', async () => {
      console.log('🧪 [Test] Testing navigation between screens...');
      
      productFetchCoordinator.initialize();
      
      // First screen fetches from API
      const products1 = await productFetchCoordinator.fetchProducts({
        screenName: 'POSScreen',
        forceRefresh: false
      });
      expect(apiCallCount).toBe(1);
      expect(products1).toEqual(mockProducts);
      
      // Second screen should use cache (no API call)
      const products2 = await productFetchCoordinator.fetchProducts({
        screenName: 'ManageScreen',
        forceRefresh: false
      });
      expect(apiCallCount).toBe(1); // Still 1, no additional API call
      expect(products2).toEqual(mockProducts);
      
      // Third screen should also use cache
      const products3 = await productFetchCoordinator.fetchProducts({
        screenName: 'InventoryScreen',
        forceRefresh: false
      });
      expect(apiCallCount).toBe(1); // Still 1, no additional API call
      expect(products3).toEqual(mockProducts);
      
      // Fourth screen should also use cache
      const products4 = await productFetchCoordinator.fetchProducts({
        screenName: 'ProductOnboardingScreen',
        forceRefresh: false
      });
      expect(apiCallCount).toBe(1); // Still 1, no additional API call
      expect(products4).toEqual(mockProducts);
      
      console.log('✅ [Test] Navigation between screens verified - only 1 API call for 4 screens');
    });

    test('should handle rapid navigation between screens without duplicate API calls', async () => {
      console.log('🧪 [Test] Testing rapid navigation...');
      
      productFetchCoordinator.initialize();
      
      // Simulate rapid navigation - multiple screens requesting data simultaneously
      const promises = [
        productFetchCoordinator.fetchProducts({ screenName: 'POSScreen' }),
        productFetchCoordinator.fetchProducts({ screenName: 'ManageScreen' }),
        productFetchCoordinator.fetchProducts({ screenName: 'InventoryScreen' }),
        productFetchCoordinator.fetchProducts({ screenName: 'ProductOnboardingScreen' })
      ];
      
      const results = await Promise.all(promises);
      
      // Should only make one API call despite multiple concurrent requests
      expect(apiCallCount).toBe(1);
      
      // All results should be identical
      results.forEach(products => {
        expect(products).toEqual(mockProducts);
      });
      
      console.log('✅ [Test] Rapid navigation verified - only 1 API call for concurrent requests');
    });
  });

  describe('Pull-to-refresh → API always called', () => {
    test('should always call API when forceRefresh is true', async () => {
      console.log('🧪 [Test] Testing pull-to-refresh behavior...');
      
      productFetchCoordinator.initialize();
      
      // Initial fetch
      await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen',
        forceRefresh: false
      });
      expect(apiCallCount).toBe(1);
      
      // Pull-to-refresh should call API even with cache
      await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen',
        forceRefresh: true
      });
      expect(apiCallCount).toBe(2);
      
      // Another pull-to-refresh should call API again
      await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen',
        forceRefresh: true
      });
      expect(apiCallCount).toBe(3);
      
      console.log('✅ [Test] Pull-to-refresh behavior verified - API called every time');
    });

    test('should update cache after successful pull-to-refresh', async () => {
      console.log('🧪 [Test] Testing cache update after pull-to-refresh...');
      
      productFetchCoordinator.initialize();
      
      // Initial fetch
      await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen' });
      const initialTimestamp = sessionProductStore.getLastFetchTime();
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Update mock data for pull-to-refresh
      const updatedProducts = [
        ...mockProducts,
        { id: '4', name: 'New Product', price: 25.00, stock_quantity: 2 }
      ];
      productsService.getProducts.mockResolvedValueOnce(updatedProducts);
      
      // Pull-to-refresh
      const refreshedProducts = await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen',
        forceRefresh: true
      });
      
      // Verify cache was updated
      expect(refreshedProducts).toEqual(updatedProducts);
      expect(sessionProductStore.getProducts()).toEqual(updatedProducts);
      expect(sessionProductStore.getLastFetchTime()).toBeGreaterThan(initialTimestamp);
      
      console.log('✅ [Test] Cache update after pull-to-refresh verified');
    });

    test('should return cached data if pull-to-refresh API fails', async () => {
      console.log('🧪 [Test] Testing pull-to-refresh API failure...');
      
      productFetchCoordinator.initialize();
      
      // Initial successful fetch
      await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen' });
      expect(apiCallCount).toBe(1);
      
      // Mock API failure for pull-to-refresh - need to track the call manually
      productsService.getProducts.mockImplementationOnce(() => {
        apiCallCount++;
        console.log(`🧪 [Test] API call #${apiCallCount} to ProductsService.getProducts (will fail)`);
        return Promise.reject(new Error('Network error'));
      });
      
      // Pull-to-refresh with API failure should return cached data
      const products = await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen',
        forceRefresh: true
      });
      
      expect(apiCallCount).toBe(2); // API was called but failed
      expect(products).toEqual(mockProducts); // Should return cached data
      expect(sessionProductStore.getProducts()).toEqual(mockProducts); // Cache unchanged
      
      console.log('✅ [Test] Pull-to-refresh API failure handling verified');
    });
  });

  describe('Integration: Complete Phase A Workflow', () => {
    test('should demonstrate complete Phase A workflow', async () => {
      console.log('🧪 [Test] Testing complete Phase A workflow...');
      
      // 1. App starts - coordinator not initialized
      expect(productFetchCoordinator.isReady()).toBe(false);
      expect(sessionProductStore.hasData()).toBe(false);
      
      // 2. User logs in - coordinator initialized
      productFetchCoordinator.initialize();
      expect(productFetchCoordinator.isReady()).toBe(true);
      
      // 3. First screen (POSScreen) loads - API called
      await productFetchCoordinator.fetchProducts({ screenName: 'POSScreen' });
      expect(apiCallCount).toBe(1);
      expect(sessionProductStore.hasData()).toBe(true);
      
      // 4. Navigate to ManageScreen - uses cache
      await productFetchCoordinator.fetchProducts({ screenName: 'ManageScreen' });
      expect(apiCallCount).toBe(1); // No additional API call
      
      // 5. Navigate to InventoryScreen - uses cache
      await productFetchCoordinator.fetchProducts({ screenName: 'InventoryScreen' });
      expect(apiCallCount).toBe(1); // No additional API call
      
      // 6. Pull-to-refresh on InventoryScreen - API called
      await productFetchCoordinator.fetchProducts({
        screenName: 'InventoryScreen',
        forceRefresh: true
      });
      expect(apiCallCount).toBe(2); // API called for refresh
      
      // 7. Navigate to ProductOnboardingScreen - uses cache
      await productFetchCoordinator.fetchProducts({ screenName: 'ProductOnboardingScreen' });
      expect(apiCallCount).toBe(2); // No additional API call
      
      // 8. User logs out - session cleared
      productFetchCoordinator.clearSession();
      expect(productFetchCoordinator.isReady()).toBe(false);
      expect(sessionProductStore.hasData()).toBe(false);
      
      // 9. User logs in again - coordinator reinitialized
      productFetchCoordinator.initialize();
      expect(productFetchCoordinator.isReady()).toBe(true);
      
      // 10. First screen after re-login - API called again
      await productFetchCoordinator.fetchProducts({ screenName: 'POSScreen' });
      expect(apiCallCount).toBe(3); // New API call after re-login
      
      console.log('✅ [Test] Complete Phase A workflow verified');
      console.log(`📊 [Test] Total API calls: ${apiCallCount} (expected: 3)`);
    });
  });

  describe('Cache Statistics and Debugging', () => {
    test('should provide accurate cache statistics', async () => {
      console.log('🧪 [Test] Testing cache statistics...');
      
      // Initial state
      let stats = productFetchCoordinator.getCacheStats();
      expect(stats.hasData).toBe(false);
      expect(stats.productCount).toBe(0);
      expect(stats.coordinatorInitialized).toBe(false);
      
      // After initialization
      productFetchCoordinator.initialize();
      stats = productFetchCoordinator.getCacheStats();
      expect(stats.coordinatorInitialized).toBe(true);
      expect(stats.hasData).toBe(false);
      
      // After first fetch
      await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen' });
      stats = productFetchCoordinator.getCacheStats();
      expect(stats.hasData).toBe(true);
      expect(stats.productCount).toBe(mockProducts.length);
      expect(stats.lastFetchTime).toBeGreaterThan(0);
      expect(stats.lastFetchAge).toBeGreaterThanOrEqual(0);
      
      console.log('✅ [Test] Cache statistics verified');
    });
  });

  describe('Memory Management', () => {
    test('should validate in-memory only storage', () => {
      console.log('🧪 [Test] Testing memory-only storage validation...');
      
      const validation = sessionProductStore.validateInMemoryOnly();
      expect(validation.inMemoryOnly).toBe(true);
      expect(validation.storageType).toBe('memory');
      
      console.log('✅ [Test] Memory-only storage validated');
    });

    test('should handle large product datasets without memory leaks', async () => {
      console.log('🧪 [Test] Testing large dataset handling...');
      
      // Create large mock dataset
      const largeProductSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i}`,
        price: Math.random() * 100,
        stock_quantity: Math.floor(Math.random() * 50)
      }));
      
      productsService.getProducts.mockResolvedValueOnce(largeProductSet);
      
      productFetchCoordinator.initialize();
      const products = await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen' });
      
      expect(products).toHaveLength(1000);
      expect(sessionProductStore.getProducts()).toHaveLength(1000);
      
      // Clear and verify cleanup
      productFetchCoordinator.clearSession();
      expect(sessionProductStore.hasData()).toBe(false);
      
      console.log('✅ [Test] Large dataset handling verified');
    });
  });
});