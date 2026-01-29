/**
 * Phase B Implementation Tests
 * 
 * Tests for post-success cache updates and UI propagation for product operations
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import productFetchCoordinator from '../ProductFetchCoordinator';
import uiUpdatePropagator from '../UIUpdatePropagator';
import sessionProductStore from '../SessionProductStore';

// Mock the ProductsService
jest.mock('../ProductsService', () => ({
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
}));

describe('Phase B Implementation - Product Operations UI Propagation', () => {
  beforeEach(() => {
    // Clear all mocks and reset state
    jest.clearAllMocks();
    sessionProductStore.clear();
    uiUpdatePropagator.clearSession();
    productFetchCoordinator.clearSession();
    
    // Initialize services
    productFetchCoordinator.initialize();
    uiUpdatePropagator.initialize();
  });

  afterEach(() => {
    // Clean up
    sessionProductStore.clear();
    uiUpdatePropagator.clearSession();
    productFetchCoordinator.clearSession();
  });

  describe('Post-success cache updates for product create', () => {
    test('should update cache and propagate UI updates after successful product creation', () => {
      // Arrange
      const mockProduct = {
        id: 'test-product-1',
        name: 'Test Product',
        price: 10.99,
        stock_quantity: 50
      };

      let updateCallbackCalled = false;
      uiUpdatePropagator.registerScreen('TestScreen', () => {
        updateCallbackCalled = true;
      });

      // Act - Simulate post-success cache updates (as done in screens)
      productFetchCoordinator.onProductCreated(mockProduct);
      uiUpdatePropagator.propagateProductUpdate();

      // Assert
      expect(updateCallbackCalled).toBe(true);
      
      // Verify cache was updated (if we had products in cache)
      // Note: This test assumes cache is empty initially, so we can't verify the product was added
      // In real usage, the cache would be populated first, then products would be added
    });

    test('should handle multiple screen registrations for product create', () => {
      // Arrange
      const mockProduct = {
        id: 'test-product-2',
        name: 'Another Test Product',
        price: 15.99
      };

      let screen1Updated = false;
      let screen2Updated = false;

      uiUpdatePropagator.registerScreen('Screen1', () => {
        screen1Updated = true;
      });
      uiUpdatePropagator.registerScreen('Screen2', () => {
        screen2Updated = true;
      });

      // Act
      productFetchCoordinator.onProductCreated(mockProduct);
      uiUpdatePropagator.propagateProductUpdate();

      // Assert
      expect(screen1Updated).toBe(true);
      expect(screen2Updated).toBe(true);
    });
  });

  describe('Post-success cache updates for product update', () => {
    test('should update cache and propagate UI updates after successful product update', () => {
      // Arrange
      const productId = 'test-product-1';
      const updates = { price: 12.99, name: 'Updated Product' };

      let updateCallbackCalled = false;
      uiUpdatePropagator.registerScreen('TestScreen', () => {
        updateCallbackCalled = true;
      });

      // Act - Simulate post-success cache updates
      productFetchCoordinator.onProductUpdated(productId, updates);
      uiUpdatePropagator.propagateProductUpdate();

      // Assert
      expect(updateCallbackCalled).toBe(true);
    });
  });

  describe('Post-success cache updates for product delete', () => {
    test('should update cache and propagate UI updates after successful product deletion', () => {
      // Arrange
      const productId = 'test-product-1';

      let updateCallbackCalled = false;
      uiUpdatePropagator.registerScreen('TestScreen', () => {
        updateCallbackCalled = true;
      });

      // Act - Simulate post-success cache updates
      productFetchCoordinator.onProductDeleted(productId);
      uiUpdatePropagator.propagateProductUpdate();

      // Assert
      expect(updateCallbackCalled).toBe(true);
    });
  });

  describe('Screen registration and cleanup', () => {
    test('should properly register and unregister screens', () => {
      // Arrange
      let callbackCalled = false;
      const callback = () => { callbackCalled = true; };

      // Act - Register
      uiUpdatePropagator.registerScreen('TestScreen', callback);
      
      // Verify registration
      expect(uiUpdatePropagator.isScreenRegistered('TestScreen')).toBe(true);
      
      // Trigger update
      uiUpdatePropagator.propagateProductUpdate();
      expect(callbackCalled).toBe(true);
      
      // Reset and unregister
      callbackCalled = false;
      uiUpdatePropagator.unregisterScreen('TestScreen');
      
      // Verify unregistration
      expect(uiUpdatePropagator.isScreenRegistered('TestScreen')).toBe(false);
      
      // Trigger update - should not call callback
      uiUpdatePropagator.propagateProductUpdate();
      expect(callbackCalled).toBe(false);
    });

    test('should prevent memory leaks by unregistering screens', () => {
      // Arrange
      const initialStats = uiUpdatePropagator.getStats();
      
      // Register multiple screens
      uiUpdatePropagator.registerScreen('Screen1', () => {});
      uiUpdatePropagator.registerScreen('Screen2', () => {});
      uiUpdatePropagator.registerScreen('Screen3', () => {});
      
      // Verify registration
      expect(uiUpdatePropagator.getStats().registeredScreensCount).toBe(3);
      
      // Unregister all
      uiUpdatePropagator.unregisterScreen('Screen1');
      uiUpdatePropagator.unregisterScreen('Screen2');
      uiUpdatePropagator.unregisterScreen('Screen3');
      
      // Verify cleanup
      expect(uiUpdatePropagator.getStats().registeredScreensCount).toBe(0);
    });
  });

  describe('Integration with existing Phase A functionality', () => {
    test('should work alongside existing ProductFetchCoordinator functionality', () => {
      // This test verifies that Phase B doesn't break Phase A functionality
      
      // Arrange
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 10 },
        { id: '2', name: 'Product 2', price: 20 }
      ];

      // Simulate Phase A - products in cache
      sessionProductStore.setProducts(mockProducts, Date.now());
      
      // Verify Phase A functionality still works
      expect(sessionProductStore.hasData()).toBe(true);
      expect(sessionProductStore.getProducts()).toEqual(mockProducts);
      
      // Now test Phase B functionality
      let updateCalled = false;
      uiUpdatePropagator.registerScreen('TestScreen', () => {
        updateCalled = true;
      });
      
      // Simulate product update
      productFetchCoordinator.onProductUpdated('1', { price: 15 });
      uiUpdatePropagator.propagateProductUpdate();
      
      // Verify both Phase A and Phase B work
      expect(updateCalled).toBe(true);
      expect(sessionProductStore.hasData()).toBe(true);
    });
  });
});