/**
 * ProductFetchCoordinator Tests
 * 
 * Tests for the centralized product fetching coordinator
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import productFetchCoordinator from '../ProductFetchCoordinator';
import productsService from '../ProductsService';

// Mock ProductsService
jest.mock('../ProductsService', () => ({
  getProducts: jest.fn()
}));

describe('ProductFetchCoordinator', () => {
  beforeEach(() => {
    // Clear coordinator and reset mocks
    productFetchCoordinator.clearSession();
    jest.clearAllMocks();
  });

  describe('Initialization and Lifecycle', () => {
    test('should initialize and clear session properly', () => {
      expect(productFetchCoordinator.isReady()).toBe(false);

      productFetchCoordinator.initialize();
      expect(productFetchCoordinator.isReady()).toBe(true);

      productFetchCoordinator.clearSession();
      expect(productFetchCoordinator.isReady()).toBe(false);
    });

    test('should handle multiple initializations gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      productFetchCoordinator.initialize();
      productFetchCoordinator.initialize(); // Second call should be ignored

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Already initialized'));
      consoleSpy.mockRestore();
    });
  });

  describe('Product Fetching', () => {
    beforeEach(() => {
      productFetchCoordinator.initialize();
    });

    test('should fetch from API on cache miss', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 10 },
        { id: '2', name: 'Product 2', price: 20 }
      ];
      
      productsService.getProducts.mockResolvedValue(mockProducts);

      const result = await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen'
      });

      expect(result).toEqual(mockProducts);
      expect(productsService.getProducts).toHaveBeenCalledTimes(1);
    });

    test('should return cached data on cache hit', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 10 },
        { id: '2', name: 'Product 2', price: 20 }
      ];
      
      productsService.getProducts.mockResolvedValue(mockProducts);

      // First call - should hit API
      const result1 = await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen1'
      });

      // Second call - should use cache
      const result2 = await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen2'
      });

      expect(result1).toEqual(mockProducts);
      expect(result2).toEqual(mockProducts);
      expect(productsService.getProducts).toHaveBeenCalledTimes(1); // Only called once
    });

    test('should bypass cache on force refresh', async () => {
      const mockProducts1 = [{ id: '1', name: 'Product 1', price: 10 }];
      const mockProducts2 = [{ id: '2', name: 'Product 2', price: 20 }];
      
      productsService.getProducts
        .mockResolvedValueOnce(mockProducts1)
        .mockResolvedValueOnce(mockProducts2);

      // First call - populate cache
      await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen1' });

      // Second call with force refresh - should bypass cache
      const result = await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen2',
        forceRefresh: true
      });

      expect(result).toEqual(mockProducts2);
      expect(productsService.getProducts).toHaveBeenCalledTimes(2);
    });

    test('should return cached data if API fails during force refresh', async () => {
      const mockProducts = [{ id: '1', name: 'Product 1', price: 10 }];
      
      productsService.getProducts
        .mockResolvedValueOnce(mockProducts)
        .mockRejectedValueOnce(new Error('API Error'));

      // First call - populate cache
      await productFetchCoordinator.fetchProducts({ screenName: 'TestScreen1' });

      // Second call with force refresh that fails - should return cached data
      const result = await productFetchCoordinator.fetchProducts({
        screenName: 'TestScreen2',
        forceRefresh: true
      });

      expect(result).toEqual(mockProducts);
    });

    test('should handle concurrent requests properly', async () => {
      const mockProducts = [{ id: '1', name: 'Product 1', price: 10 }];
      
      productsService.getProducts.mockResolvedValue(mockProducts);

      // Make multiple concurrent requests
      const promises = [
        productFetchCoordinator.fetchProducts({ screenName: 'Screen1' }),
        productFetchCoordinator.fetchProducts({ screenName: 'Screen2' }),
        productFetchCoordinator.fetchProducts({ screenName: 'Screen3' })
      ];

      const results = await Promise.all(promises);

      // All should return same data
      results.forEach(result => {
        expect(result).toEqual(mockProducts);
      });

      // API should only be called once
      expect(productsService.getProducts).toHaveBeenCalledTimes(1);
    });
  });

  describe('Post-Success Updates', () => {
    beforeEach(() => {
      productFetchCoordinator.initialize();
      
      // Populate cache with initial data
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 10 },
        { id: '2', name: 'Product 2', price: 20 }
      ];
      productsService.getProducts.mockResolvedValue(mockProducts);
      
      return productFetchCoordinator.fetchProducts({ screenName: 'Setup' });
    });

    test('should update product in cache', async () => {
      productFetchCoordinator.onProductUpdated('1', { price: 15, name: 'Updated Product' });

      const products = await productFetchCoordinator.fetchProducts({ screenName: 'Test' });
      const updatedProduct = products.find(p => p.id === '1');
      
      expect(updatedProduct.price).toBe(15);
      expect(updatedProduct.name).toBe('Updated Product');
    });

    test('should add product to cache', async () => {
      const newProduct = { id: '3', name: 'Product 3', price: 30 };
      productFetchCoordinator.onProductCreated(newProduct);

      const products = await productFetchCoordinator.fetchProducts({ screenName: 'Test' });
      
      expect(products).toHaveLength(3);
      expect(products.find(p => p.id === '3')).toEqual(newProduct);
    });

    test('should remove product from cache', async () => {
      productFetchCoordinator.onProductDeleted('1');

      const products = await productFetchCoordinator.fetchProducts({ screenName: 'Test' });
      
      expect(products).toHaveLength(1);
      expect(products.find(p => p.id === '1')).toBeUndefined();
    });

    test('should handle invalid update parameters gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      productFetchCoordinator.onProductCreated(null);
      productFetchCoordinator.onProductUpdated(null, {});
      productFetchCoordinator.onProductDeleted(null);

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });
  });

  describe('Cache Statistics', () => {
    test('should provide cache statistics', () => {
      productFetchCoordinator.initialize();
      
      const stats = productFetchCoordinator.getCacheStats();
      
      expect(stats).toHaveProperty('hasData');
      expect(stats).toHaveProperty('productCount');
      expect(stats).toHaveProperty('coordinatorInitialized');
      expect(stats).toHaveProperty('ongoingFetch');
      expect(stats.coordinatorInitialized).toBe(true);
    });

    test('should force clear cache', async () => {
      productFetchCoordinator.initialize();
      
      const mockProducts = [{ id: '1', name: 'Product 1', price: 10 }];
      productsService.getProducts.mockResolvedValue(mockProducts);
      
      // Populate cache
      await productFetchCoordinator.fetchProducts({ screenName: 'Test' });
      
      // Force clear
      productFetchCoordinator.forceClearCache();
      
      const stats = productFetchCoordinator.getCacheStats();
      expect(stats.hasData).toBe(false);
    });
  });
});