/**
 * UI Performance Optimization Integration Tests
 * 
 * Tests the complete integration of SessionProductStore + ProductFetchCoordinator
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import productFetchCoordinator from '../ProductFetchCoordinator';
import productsService from '../ProductsService';
import {
  examplePOSScreenProductFetch,
  exampleManageScreenProductFetch,
  examplePullToRefresh,
  exampleProductOperations,
  exampleScreenUsagePattern
} from '../UIPerformanceOptimizationExample';

// Mock ProductsService
jest.mock('../ProductsService', () => ({
  getProducts: jest.fn()
}));

describe('UI Performance Optimization Integration', () => {
  beforeEach(() => {
    // Clear coordinator and reset mocks
    productFetchCoordinator.clearSession();
    productFetchCoordinator.initialize();
    jest.clearAllMocks();
  });

  describe('Multi-Screen Cache Sharing', () => {
    test('should share cache between different screens', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 10 },
        { id: '2', name: 'Product 2', price: 20 }
      ];
      
      productsService.getProducts.mockResolvedValue(mockProducts);

      // First screen fetches data
      const posProducts = await examplePOSScreenProductFetch();
      
      // Second screen should get cached data
      const manageProducts = await exampleManageScreenProductFetch();

      expect(posProducts).toEqual(mockProducts);
      expect(manageProducts).toEqual(mockProducts);
      expect(productsService.getProducts).toHaveBeenCalledTimes(1); // Only one API call
    });

    test('should handle different API options per screen', async () => {
      const mockProducts = [{ id: '1', name: 'Product 1', price: 10 }];
      
      productsService.getProducts.mockResolvedValue(mockProducts);

      // Each screen can pass different options, but cache is shared
      await examplePOSScreenProductFetch();
      await exampleManageScreenProductFetch();

      // Verify API was called with different options but cache was shared
      expect(productsService.getProducts).toHaveBeenCalledTimes(1);
      expect(productsService.getProducts).toHaveBeenCalledWith({
        active: true,
        sortBy: 'name'
      });
    });
  });

  describe('Manual Refresh Override', () => {
    test('should bypass cache on pull-to-refresh', async () => {
      const mockProducts1 = [{ id: '1', name: 'Product 1', price: 10 }];
      const mockProducts2 = [{ id: '2', name: 'Product 2', price: 20 }];
      
      productsService.getProducts
        .mockResolvedValueOnce(mockProducts1)
        .mockResolvedValueOnce(mockProducts2);

      // Initial fetch
      const initialProducts = await examplePOSScreenProductFetch();
      
      // Pull-to-refresh should bypass cache
      const refreshedProducts = await examplePullToRefresh('POSScreen');

      expect(initialProducts).toEqual(mockProducts1);
      expect(refreshedProducts).toEqual(mockProducts2);
      expect(productsService.getProducts).toHaveBeenCalledTimes(2);
    });

    test('should update cache after successful pull-to-refresh', async () => {
      const mockProducts1 = [{ id: '1', name: 'Product 1', price: 10 }];
      const mockProducts2 = [{ id: '2', name: 'Product 2', price: 20 }];
      
      productsService.getProducts
        .mockResolvedValueOnce(mockProducts1)
        .mockResolvedValueOnce(mockProducts2);

      // Initial fetch
      await examplePOSScreenProductFetch();
      
      // Pull-to-refresh updates cache
      await examplePullToRefresh('POSScreen');
      
      // Subsequent fetch should use updated cache
      const cachedProducts = await exampleManageScreenProductFetch();

      expect(cachedProducts).toEqual(mockProducts2);
      expect(productsService.getProducts).toHaveBeenCalledTimes(2); // No third call
    });
  });

  describe('Post-Success Cache Updates', () => {
    beforeEach(async () => {
      // Setup initial cache
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 10 },
        { id: '2', name: 'Product 2', price: 20 }
      ];
      productsService.getProducts.mockResolvedValue(mockProducts);
      await examplePOSScreenProductFetch();
    });

    test('should update cache after product creation', async () => {
      const newProduct = { id: '3', name: 'Product 3', price: 30 };
      
      // Simulate successful product creation
      exampleProductOperations.afterProductCreated(newProduct);
      
      // Cache should now include new product
      const products = await exampleManageScreenProductFetch();
      
      expect(products).toHaveLength(3);
      expect(products.find(p => p.id === '3')).toEqual(newProduct);
      expect(productsService.getProducts).toHaveBeenCalledTimes(1); // No additional API call
    });

    test('should update cache after product modification', async () => {
      // Simulate successful product update
      exampleProductOperations.afterProductUpdated('1', { 
        price: 15, 
        name: 'Updated Product 1' 
      });
      
      // Cache should reflect updates
      const products = await exampleManageScreenProductFetch();
      const updatedProduct = products.find(p => p.id === '1');
      
      expect(updatedProduct.price).toBe(15);
      expect(updatedProduct.name).toBe('Updated Product 1');
      expect(productsService.getProducts).toHaveBeenCalledTimes(1); // No additional API call
    });

    test('should update cache after product deletion', async () => {
      // Simulate successful product deletion
      exampleProductOperations.afterProductDeleted('1');
      
      // Cache should no longer include deleted product
      const products = await exampleManageScreenProductFetch();
      
      expect(products).toHaveLength(1);
      expect(products.find(p => p.id === '1')).toBeUndefined();
      expect(productsService.getProducts).toHaveBeenCalledTimes(1); // No additional API call
    });
  });

  describe('Complete Screen Usage Pattern', () => {
    test('should handle typical screen lifecycle', async () => {
      const mockProducts = [{ id: '1', name: 'Product 1', price: 10 }];
      const refreshedProducts = [
        { id: '1', name: 'Product 1', price: 10 },
        { id: '2', name: 'Product 2', price: 20 }
      ];
      
      productsService.getProducts
        .mockResolvedValueOnce(mockProducts)
        .mockResolvedValueOnce(refreshedProducts);

      // Screen mount - initial fetch
      const initialProducts = await exampleScreenUsagePattern.onScreenMount();
      expect(initialProducts).toEqual(mockProducts);
      
      // Pull-to-refresh - force fresh data
      const refreshed = await exampleScreenUsagePattern.onPullToRefresh();
      expect(refreshed).toEqual(refreshedProducts);
      
      // Product creation - update cache
      const newProduct = { id: '3', name: 'Product 3', price: 30 };
      exampleScreenUsagePattern.onProductCreated(newProduct);
      
      // Verify cache status
      const stats = exampleScreenUsagePattern.getCacheStatus();
      expect(stats.hasData).toBe(true);
      expect(stats.productCount).toBe(3); // Original 2 + 1 new
      
      expect(productsService.getProducts).toHaveBeenCalledTimes(2);
    });
  });

  describe('Session Lifecycle', () => {
    test('should clear cache on session clear', async () => {
      const mockProducts = [{ id: '1', name: 'Product 1', price: 10 }];
      productsService.getProducts.mockResolvedValue(mockProducts);

      // Populate cache
      await examplePOSScreenProductFetch();
      
      // Verify cache has data
      let stats = productFetchCoordinator.getCacheStats();
      expect(stats.hasData).toBe(true);
      
      // Clear session (simulates logout)
      productFetchCoordinator.clearSession();
      
      // Verify cache is cleared
      stats = productFetchCoordinator.getCacheStats();
      expect(stats.hasData).toBe(false);
      expect(stats.coordinatorInitialized).toBe(false);
    });

    test('should require initialization after session clear', async () => {
      const mockProducts = [{ id: '1', name: 'Product 1', price: 10 }];
      productsService.getProducts.mockResolvedValue(mockProducts);

      // Clear session
      productFetchCoordinator.clearSession();
      
      // Should not be ready
      expect(productFetchCoordinator.isReady()).toBe(false);
      
      // Initialize again (simulates login)
      productFetchCoordinator.initialize();
      
      // Should be ready and work normally
      expect(productFetchCoordinator.isReady()).toBe(true);
      const products = await examplePOSScreenProductFetch();
      expect(products).toEqual(mockProducts);
    });
  });
});