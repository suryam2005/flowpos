/**
 * SessionProductStore Tests
 * 
 * Tests for the in-memory session-level product store
 * Requirements: 1.1, 1.2, 1.5, 1.6, 1.7
 */

import sessionProductStore from '../SessionProductStore';

describe('SessionProductStore', () => {
  beforeEach(() => {
    // Clear store before each test
    sessionProductStore.clear();
  });

  describe('Basic Operations', () => {
    test('should start empty', () => {
      expect(sessionProductStore.hasData()).toBe(false);
      expect(sessionProductStore.getProducts()).toBeNull();
      expect(sessionProductStore.getLastFetchTime()).toBeNull();
    });

    test('should store and retrieve products', () => {
      const products = [
        { id: '1', name: 'Product 1', price: 10 },
        { id: '2', name: 'Product 2', price: 20 }
      ];
      const timestamp = Date.now();

      sessionProductStore.setProducts(products, timestamp);

      expect(sessionProductStore.hasData()).toBe(true);
      expect(sessionProductStore.getProducts()).toEqual(products);
      expect(sessionProductStore.getLastFetchTime()).toBe(timestamp);
    });

    test('should clear all data', () => {
      const products = [{ id: '1', name: 'Product 1', price: 10 }];
      sessionProductStore.setProducts(products);

      sessionProductStore.clear();

      expect(sessionProductStore.hasData()).toBe(false);
      expect(sessionProductStore.getProducts()).toBeNull();
      expect(sessionProductStore.getLastFetchTime()).toBeNull();
    });
  });

  describe('Product Updates', () => {
    beforeEach(() => {
      const products = [
        { id: '1', name: 'Product 1', price: 10 },
        { id: '2', name: 'Product 2', price: 20 }
      ];
      sessionProductStore.setProducts(products);
    });

    test('should update existing product', () => {
      sessionProductStore.updateProduct('1', { price: 15, name: 'Updated Product 1' });

      const products = sessionProductStore.getProducts();
      const updatedProduct = products.find(p => p.id === '1');
      
      expect(updatedProduct.price).toBe(15);
      expect(updatedProduct.name).toBe('Updated Product 1');
      expect(updatedProduct.updatedAt).toBeDefined();
    });

    test('should add new product', () => {
      const newProduct = { id: '3', name: 'Product 3', price: 30 };
      sessionProductStore.addProduct(newProduct);

      const products = sessionProductStore.getProducts();
      expect(products).toHaveLength(3);
      expect(products.find(p => p.id === '3')).toEqual(newProduct);
    });

    test('should remove product', () => {
      sessionProductStore.removeProduct('1');

      const products = sessionProductStore.getProducts();
      expect(products).toHaveLength(1);
      expect(products.find(p => p.id === '1')).toBeUndefined();
    });

    test('should handle operations on empty store gracefully', () => {
      sessionProductStore.clear();

      // These should not throw errors
      sessionProductStore.updateProduct('1', { price: 15 });
      sessionProductStore.removeProduct('1');
      
      expect(sessionProductStore.hasData()).toBe(false);
    });
  });

  describe('Data Validation', () => {
    test('should reject invalid products array', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      sessionProductStore.setProducts('not an array');
      
      expect(sessionProductStore.hasData()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should reject invalid product for addition', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      sessionProductStore.addProduct(null);
      sessionProductStore.addProduct({ name: 'No ID' });
      
      expect(sessionProductStore.hasData()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      consoleSpy.mockRestore();
    });
  });

  describe('In-Memory Only Validation', () => {
    test('should validate in-memory only storage', () => {
      const validation = sessionProductStore.validateInMemoryOnly();
      
      expect(validation.inMemoryOnly).toBe(true);
      expect(validation.storageType).toBe('memory');
    });

    test('should provide stats', () => {
      const products = [{ id: '1', name: 'Product 1', price: 10 }];
      const timestamp = Date.now();
      sessionProductStore.setProducts(products, timestamp);

      const stats = sessionProductStore.getStats();
      
      expect(stats.hasData).toBe(true);
      expect(stats.productCount).toBe(1);
      expect(stats.lastFetchTime).toBe(timestamp);
      expect(stats.lastFetchAge).toBeGreaterThanOrEqual(0);
      expect(stats.isInitialized).toBe(true);
    });
  });
});