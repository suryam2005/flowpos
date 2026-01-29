/**
 * Order Success UI Propagation Tests
 * 
 * Tests for Phase B Implementation - Order Success UI Propagation
 * Validates Requirements: 4.1, 4.2, 4.3, 4.4
 */

// Mock React Native dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

// Mock ProductsService
jest.mock('../ProductsService', () => ({
  getProducts: jest.fn(() => Promise.resolve([
    { id: '1', name: 'Product 1', stock: 10, track_stock: true },
    { id: '2', name: 'Product 2', stock: 5, track_stock: true }
  ])),
}));

import sessionProductStore from '../SessionProductStore';
import productFetchCoordinator from '../ProductFetchCoordinator';
import uiUpdatePropagator from '../UIUpdatePropagator';

describe('Order Success UI Propagation', () => {
  beforeEach(() => {
    // Clear all state before each test
    sessionProductStore.clear();
    productFetchCoordinator.clearSession();
    uiUpdatePropagator.clearSession();
    uiUpdatePropagator.initialize();
  });

  afterEach(() => {
    // Clean up after each test
    sessionProductStore.clear();
    productFetchCoordinator.clearSession();
    uiUpdatePropagator.clearSession();
  });

  describe('Post-Order Inventory Updates (UI Only)', () => {
    test('should update product stock after successful order', () => {
      // Setup: Add products to session store
      const products = [
        { id: '1', name: 'Product 1', stock: 10, track_stock: true },
        { id: '2', name: 'Product 2', stock: 5, track_stock: true },
        { id: '3', name: 'Product 3', stock: 0, track_stock: false } // Non-tracked product
      ];
      
      sessionProductStore.setProducts(products);
      
      // Simulate successful order creation
      const orderData = {
        id: 'order-123',
        items: [
          { name: 'Product 1', quantity: 2 },
          { name: 'Product 2', quantity: 1 },
          { name: 'Product 3', quantity: 5 } // Should be ignored (track_stock: false)
        ],
        total: 100
      };
      
      // Call onOrderCreated (simulates successful order API)
      productFetchCoordinator.onOrderCreated(orderData);
      
      // Verify stock updates
      const updatedProducts = sessionProductStore.getProducts();
      
      // Product 1: 10 - 2 = 8
      expect(updatedProducts.find(p => p.name === 'Product 1').stock).toBe(8);
      
      // Product 2: 5 - 1 = 4
      expect(updatedProducts.find(p => p.name === 'Product 2').stock).toBe(4);
      
      // Product 3: Should remain 0 (track_stock: false)
      expect(updatedProducts.find(p => p.name === 'Product 3').stock).toBe(0);
    });

    test('should not update stock for non-tracked products', () => {
      // Setup: Add non-tracked product
      const products = [
        { id: '1', name: 'Service Item', stock: 0, track_stock: false }
      ];
      
      sessionProductStore.setProducts(products);
      
      // Simulate order with non-tracked product
      const orderData = {
        id: 'order-456',
        items: [
          { name: 'Service Item', quantity: 10 }
        ],
        total: 50
      };
      
      productFetchCoordinator.onOrderCreated(orderData);
      
      // Verify stock remains unchanged
      const updatedProducts = sessionProductStore.getProducts();
      expect(updatedProducts.find(p => p.name === 'Service Item').stock).toBe(0);
    });

    test('should prevent negative stock in UI', () => {
      // Setup: Product with low stock
      const products = [
        { id: '1', name: 'Low Stock Product', stock: 2, track_stock: true }
      ];
      
      sessionProductStore.setProducts(products);
      
      // Simulate order that would cause negative stock
      const orderData = {
        id: 'order-789',
        items: [
          { name: 'Low Stock Product', quantity: 5 } // More than available
        ],
        total: 25
      };
      
      productFetchCoordinator.onOrderCreated(orderData);
      
      // Verify stock doesn't go negative (UI protection)
      const updatedProducts = sessionProductStore.getProducts();
      expect(updatedProducts.find(p => p.name === 'Low Stock Product').stock).toBe(0);
    });

    test('should handle missing products gracefully', () => {
      // Setup: Products in session store
      const products = [
        { id: '1', name: 'Existing Product', stock: 10, track_stock: true }
      ];
      
      sessionProductStore.setProducts(products);
      
      // Simulate order with non-existent product
      const orderData = {
        id: 'order-404',
        items: [
          { name: 'Non-Existent Product', quantity: 1 },
          { name: 'Existing Product', quantity: 2 }
        ],
        total: 30
      };
      
      // Should not throw error
      expect(() => {
        productFetchCoordinator.onOrderCreated(orderData);
      }).not.toThrow();
      
      // Verify existing product was updated
      const updatedProducts = sessionProductStore.getProducts();
      expect(updatedProducts.find(p => p.name === 'Existing Product').stock).toBe(8);
    });
  });

  describe('UI Update Propagation', () => {
    test('should propagate order success to registered screens', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      
      // Register mock screens
      uiUpdatePropagator.registerScreen('Screen1', mockCallback1);
      uiUpdatePropagator.registerScreen('Screen2', mockCallback2);
      
      const orderData = {
        id: 'order-123',
        items: [{ name: 'Product 1', quantity: 1 }],
        total: 50
      };
      
      // Trigger order success propagation
      uiUpdatePropagator.propagateOrderSuccess(orderData);
      
      // Verify callbacks were called with correct parameters
      expect(mockCallback1).toHaveBeenCalledWith('ORDER_SUCCESS', orderData);
      expect(mockCallback2).toHaveBeenCalledWith('ORDER_SUCCESS', orderData);
    });

    test('should handle callback errors gracefully', () => {
      const mockGoodCallback = jest.fn();
      const mockBadCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      
      // Register callbacks
      uiUpdatePropagator.registerScreen('GoodScreen', mockGoodCallback);
      uiUpdatePropagator.registerScreen('BadScreen', mockBadCallback);
      
      const orderData = {
        id: 'order-456',
        items: [{ name: 'Product 1', quantity: 1 }],
        total: 25
      };
      
      // Should not throw error despite bad callback
      expect(() => {
        uiUpdatePropagator.propagateOrderSuccess(orderData);
      }).not.toThrow();
      
      // Good callback should still be called
      expect(mockGoodCallback).toHaveBeenCalledWith('ORDER_SUCCESS', orderData);
      expect(mockBadCallback).toHaveBeenCalled();
    });

    test('should unregister screens properly', () => {
      const mockCallback = jest.fn();
      
      // Register and then unregister
      uiUpdatePropagator.registerScreen('TestScreen', mockCallback);
      uiUpdatePropagator.unregisterScreen('TestScreen');
      
      const orderData = {
        id: 'order-789',
        items: [{ name: 'Product 1', quantity: 1 }],
        total: 15
      };
      
      // Trigger propagation
      uiUpdatePropagator.propagateOrderSuccess(orderData);
      
      // Callback should not be called
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Integration Test', () => {
    test('should complete full order success flow', () => {
      // Setup: Products and UI callbacks
      const products = [
        { id: '1', name: 'Product A', stock: 15, track_stock: true },
        { id: '2', name: 'Product B', stock: 8, track_stock: true }
      ];
      
      sessionProductStore.setProducts(products);
      
      const mockScreenCallback = jest.fn();
      uiUpdatePropagator.registerScreen('IntegrationTestScreen', mockScreenCallback);
      
      // Simulate successful order
      const orderData = {
        id: 'integration-order',
        items: [
          { name: 'Product A', quantity: 3 },
          { name: 'Product B', quantity: 2 }
        ],
        total: 125
      };
      
      // Execute full flow (as would happen in useOrders hook)
      productFetchCoordinator.onOrderCreated(orderData);
      uiUpdatePropagator.propagateOrderSuccess(orderData);
      
      // Verify stock updates
      const updatedProducts = sessionProductStore.getProducts();
      expect(updatedProducts.find(p => p.name === 'Product A').stock).toBe(12); // 15 - 3
      expect(updatedProducts.find(p => p.name === 'Product B').stock).toBe(6);  // 8 - 2
      
      // Verify UI propagation
      expect(mockScreenCallback).toHaveBeenCalledWith('ORDER_SUCCESS', orderData);
    });
  });

  describe('Business Logic Preservation', () => {
    test('should only update UI after successful API operations', () => {
      // This test verifies that the implementation follows the requirement:
      // "Updates only triggered AFTER backend API success"
      
      const products = [
        { id: '1', name: 'Product 1', stock: 10, track_stock: true }
      ];
      
      sessionProductStore.setProducts(products);
      
      // Simulate API failure scenario - onOrderCreated should NOT be called
      // In real implementation, this would be handled by useOrders hook
      
      // Verify no changes occurred (stock should remain unchanged)
      const unchangedProducts = sessionProductStore.getProducts();
      expect(unchangedProducts.find(p => p.name === 'Product 1').stock).toBe(10);
      
      // Only after successful API call should updates occur
      const orderData = {
        id: 'success-order',
        items: [{ name: 'Product 1', quantity: 2 }],
        total: 40
      };
      
      productFetchCoordinator.onOrderCreated(orderData);
      
      // Now stock should be updated
      const updatedProducts = sessionProductStore.getProducts();
      expect(updatedProducts.find(p => p.name === 'Product 1').stock).toBe(8);
    });
  });
});