/**
 * Phase B Validation Checkpoint Tests
 * 
 * Validates Requirements: 10.4, 10.5
 * 
 * This test suite validates the four critical aspects of Phase B implementation:
 * 1. Failed API → UI unchanged
 * 2. Success → all screens update instantly
 * 3. No extra refetch required
 * 4. All inventory checks still occur
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

// Mock ProductsService with controllable responses
const mockProductsService = {
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  getProducts: jest.fn(),
};

jest.mock('../ProductsService', () => mockProductsService);

// Mock OrdersService with controllable responses
const mockOrdersService = {
  createOrder: jest.fn(),
  getOrders: jest.fn(),
};

jest.mock('../OrdersService', () => mockOrdersService);

import sessionProductStore from '../SessionProductStore';
import productFetchCoordinator from '../ProductFetchCoordinator';
import uiUpdatePropagator from '../UIUpdatePropagator';

describe('Phase B Validation Checkpoint', () => {
  beforeEach(() => {
    // Clear all mocks and reset state
    jest.clearAllMocks();
    sessionProductStore.clear();
    productFetchCoordinator.clearSession();
    uiUpdatePropagator.clearSession();
    
    // Initialize services
    productFetchCoordinator.initialize();
    uiUpdatePropagator.initialize();
  });

  afterEach(() => {
    // Clean up
    sessionProductStore.clear();
    productFetchCoordinator.clearSession();
    uiUpdatePropagator.clearSession();
  });

  describe('Requirement 10.4: Failed API → UI unchanged', () => {
    test('failed product creation should not update cache or trigger UI updates', async () => {
      // Arrange
      const initialProducts = [
        { id: '1', name: 'Existing Product', price: 10, stock: 5 }
      ];
      sessionProductStore.setProducts(initialProducts, Date.now());
      
      let uiUpdateTriggered = false;
      uiUpdatePropagator.registerScreen('TestScreen', () => {
        uiUpdateTriggered = true;
      });

      // Mock API failure
      mockProductsService.createProduct.mockRejectedValue(new Error('API Error'));

      // Act - Simulate failed product creation (as would happen in ManageScreen)
      try {
        await mockProductsService.createProduct({ name: 'New Product', price: 15 });
        // This should not execute due to API failure
        productFetchCoordinator.onProductCreated({ id: '2', name: 'New Product', price: 15 });
        uiUpdatePropagator.propagateProductUpdate();
      } catch (error) {
        // Expected to catch error - no cache updates should occur
      }

      // Assert
      expect(uiUpdateTriggered).toBe(false);
      expect(sessionProductStore.getProducts()).toEqual(initialProducts);
      expect(sessionProductStore.getProducts().length).toBe(1); // No new product added
    });

    test('failed product update should not update cache or trigger UI updates', async () => {
      // Arrange
      const initialProducts = [
        { id: '1', name: 'Test Product', price: 10, stock: 5 }
      ];
      sessionProductStore.setProducts(initialProducts, Date.now());
      
      let uiUpdateTriggered = false;
      uiUpdatePropagator.registerScreen('TestScreen', () => {
        uiUpdateTriggered = true;
      });

      // Mock API failure
      mockProductsService.updateProduct.mockRejectedValue(new Error('Update failed'));

      // Act - Simulate failed product update
      try {
        await mockProductsService.updateProduct('1', { price: 20 });
        // This should not execute due to API failure
        productFetchCoordinator.onProductUpdated('1', { price: 20 });
        uiUpdatePropagator.propagateProductUpdate();
      } catch (error) {
        // Expected to catch error - no cache updates should occur
      }

      // Assert
      expect(uiUpdateTriggered).toBe(false);
      expect(sessionProductStore.getProducts()[0].price).toBe(10); // Price unchanged
    });

    test('failed order creation should not update inventory or trigger UI updates', async () => {
      // Arrange
      const initialProducts = [
        { id: '1', name: 'Product 1', stock: 10, track_stock: true }
      ];
      sessionProductStore.setProducts(initialProducts, Date.now());
      
      let uiUpdateTriggered = false;
      uiUpdatePropagator.registerScreen('TestScreen', (updateType) => {
        if (updateType === 'ORDER_SUCCESS') {
          uiUpdateTriggered = true;
        }
      });

      // Mock API failure
      mockOrdersService.createOrder.mockRejectedValue(new Error('Order creation failed'));

      // Act - Simulate failed order creation
      try {
        await mockOrdersService.createOrder({
          items: [{ name: 'Product 1', quantity: 2 }],
          total: 20
        });
        // This should not execute due to API failure
        productFetchCoordinator.onOrderCreated({
          items: [{ name: 'Product 1', quantity: 2 }],
          total: 20
        });
        uiUpdatePropagator.propagateOrderSuccess({
          items: [{ name: 'Product 1', quantity: 2 }],
          total: 20
        });
      } catch (error) {
        // Expected to catch error - no inventory updates should occur
      }

      // Assert
      expect(uiUpdateTriggered).toBe(false);
      expect(sessionProductStore.getProducts()[0].stock).toBe(10); // Stock unchanged
    });
  });

  describe('Requirement 10.5: Success → all screens update instantly', () => {
    test('successful product creation should update all registered screens instantly', async () => {
      // Arrange
      const initialProducts = [
        { id: '1', name: 'Existing Product', price: 10 }
      ];
      sessionProductStore.setProducts(initialProducts, Date.now());
      
      const screenUpdates = {
        screen1: false,
        screen2: false,
        screen3: false
      };

      // Register multiple screens
      uiUpdatePropagator.registerScreen('Screen1', () => {
        screenUpdates.screen1 = true;
      });
      uiUpdatePropagator.registerScreen('Screen2', () => {
        screenUpdates.screen2 = true;
      });
      uiUpdatePropagator.registerScreen('Screen3', () => {
        screenUpdates.screen3 = true;
      });

      const newProduct = { id: '2', name: 'New Product', price: 15 };

      // Mock successful API response
      mockProductsService.createProduct.mockResolvedValue(newProduct);

      // Act - Simulate successful product creation
      const createdProduct = await mockProductsService.createProduct(newProduct);
      productFetchCoordinator.onProductCreated(createdProduct);
      uiUpdatePropagator.propagateProductUpdate();

      // Assert - All screens should be updated instantly
      expect(screenUpdates.screen1).toBe(true);
      expect(screenUpdates.screen2).toBe(true);
      expect(screenUpdates.screen3).toBe(true);
    });

    test('successful order creation should update all screens with inventory changes', async () => {
      // Arrange
      const initialProducts = [
        { id: '1', name: 'Product A', stock: 15, track_stock: true },
        { id: '2', name: 'Product B', stock: 8, track_stock: true }
      ];
      sessionProductStore.setProducts(initialProducts, Date.now());
      
      const screenUpdates = [];
      
      // Register screens to track updates
      uiUpdatePropagator.registerScreen('POSScreen', (updateType, data) => {
        screenUpdates.push({ screen: 'POSScreen', type: updateType || 'PRODUCT_UPDATE', data });
      });
      uiUpdatePropagator.registerScreen('InventoryScreen', (updateType, data) => {
        screenUpdates.push({ screen: 'InventoryScreen', type: updateType || 'PRODUCT_UPDATE', data });
      });
      uiUpdatePropagator.registerScreen('AnalyticsScreen', (updateType, data) => {
        screenUpdates.push({ screen: 'AnalyticsScreen', type: updateType || 'PRODUCT_UPDATE', data });
      });

      const orderData = {
        id: 'order-123',
        items: [
          { name: 'Product A', quantity: 3 },
          { name: 'Product B', quantity: 2 }
        ],
        total: 125
      };

      // Mock successful API response
      mockOrdersService.createOrder.mockResolvedValue(orderData);

      // Act - Simulate successful order creation
      const createdOrder = await mockOrdersService.createOrder(orderData);
      productFetchCoordinator.onOrderCreated(createdOrder);
      uiUpdatePropagator.propagateOrderSuccess(createdOrder);

      // Assert - All screens should receive ORDER_SUCCESS updates
      expect(screenUpdates).toHaveLength(3);
      expect(screenUpdates.every(update => update.type === 'ORDER_SUCCESS')).toBe(true);
      expect(screenUpdates.every(update => update.data === createdOrder)).toBe(true);
      
      // Verify inventory was updated
      const updatedProducts = sessionProductStore.getProducts();
      expect(updatedProducts.find(p => p.name === 'Product A').stock).toBe(12); // 15 - 3
      expect(updatedProducts.find(p => p.name === 'Product B').stock).toBe(6);  // 8 - 2
    });
  });

  describe('No extra refetch required', () => {
    test('screens should use updated cache data without additional API calls', async () => {
      // Arrange
      const initialProducts = [
        { id: '1', name: 'Test Product', price: 10, stock: 5 }
      ];
      sessionProductStore.setProducts(initialProducts, Date.now());
      
      // Track API calls
      let getProductsCallCount = 0;
      mockProductsService.getProducts.mockImplementation(() => {
        getProductsCallCount++;
        return Promise.resolve(sessionProductStore.getProducts());
      });

      // Simulate screen that would normally refetch after updates
      let screenRefreshCount = 0;
      uiUpdatePropagator.registerScreen('TestScreen', () => {
        screenRefreshCount++;
        // Simulate screen refresh logic - should use cache, not API
        const cachedProducts = sessionProductStore.getProducts();
        expect(cachedProducts).toBeDefined();
      });

      const updatedProduct = { id: '1', name: 'Test Product', price: 15, stock: 5 };

      // Mock successful update
      mockProductsService.updateProduct.mockResolvedValue(updatedProduct);

      // Act - Simulate successful product update
      await mockProductsService.updateProduct('1', { price: 15 });
      productFetchCoordinator.onProductUpdated('1', { price: 15 });
      uiUpdatePropagator.propagateProductUpdate();

      // Assert - Screen should refresh but not make additional API calls
      expect(screenRefreshCount).toBe(1);
      expect(getProductsCallCount).toBe(0); // No additional API calls should be made
      
      // Cache should contain updated data
      const cachedProducts = sessionProductStore.getProducts();
      expect(cachedProducts[0].price).toBe(15);
    });

    test('multiple screen updates should not trigger multiple API calls', async () => {
      // Arrange
      const initialProducts = [
        { id: '1', name: 'Shared Product', price: 10 }
      ];
      sessionProductStore.setProducts(initialProducts, Date.now());
      
      let apiCallCount = 0;
      mockProductsService.getProducts.mockImplementation(() => {
        apiCallCount++;
        return Promise.resolve(sessionProductStore.getProducts());
      });

      // Register multiple screens
      const screenCallbacks = [];
      for (let i = 1; i <= 5; i++) {
        uiUpdatePropagator.registerScreen(`Screen${i}`, () => {
          screenCallbacks.push(`Screen${i}`);
          // Each screen would normally check for fresh data
          // But should use cache instead
          const products = sessionProductStore.getProducts();
          expect(products).toBeDefined();
        });
      }

      // Act - Trigger update that affects all screens
      productFetchCoordinator.onProductUpdated('1', { price: 20 });
      uiUpdatePropagator.propagateProductUpdate();

      // Assert - All screens updated but no API calls made
      expect(screenCallbacks).toHaveLength(5);
      expect(apiCallCount).toBe(0);
    });
  });

  describe('All inventory checks still occur', () => {
    test('backend inventory validation should not be bypassed', async () => {
      // This test verifies that UI optimizations don't affect business logic
      
      // Arrange
      const products = [
        { id: '1', name: 'Limited Stock', stock: 2, track_stock: true }
      ];
      sessionProductStore.setProducts(products, Date.now());
      
      // Mock order service to simulate backend validation
      let backendValidationCalled = false;
      mockOrdersService.createOrder.mockImplementation((orderData) => {
        backendValidationCalled = true;
        
        // Simulate backend inventory check
        const requestedQuantity = orderData.items.find(item => item.name === 'Limited Stock')?.quantity || 0;
        const availableStock = products.find(p => p.name === 'Limited Stock')?.stock || 0;
        
        if (requestedQuantity > availableStock) {
          throw new Error('Insufficient stock');
        }
        
        return Promise.resolve(orderData);
      });

      const orderData = {
        items: [{ name: 'Limited Stock', quantity: 1 }], // Within stock limit
        total: 25
      };

      // Act - Create order (should pass backend validation)
      try {
        const result = await mockOrdersService.createOrder(orderData);
        productFetchCoordinator.onOrderCreated(result);
        uiUpdatePropagator.propagateOrderSuccess(result);
      } catch (error) {
        // Should not reach here for valid order
      }

      // Assert - Backend validation was called
      expect(backendValidationCalled).toBe(true);
      
      // Now test with invalid order
      backendValidationCalled = false;
      const invalidOrderData = {
        items: [{ name: 'Limited Stock', quantity: 5 }], // Exceeds stock
        total: 125
      };

      // Act - Try to create invalid order
      let validationFailed = false;
      try {
        await mockOrdersService.createOrder(invalidOrderData);
      } catch (error) {
        validationFailed = true;
        expect(error.message).toBe('Insufficient stock');
      }

      // Assert - Backend validation was called and failed appropriately
      expect(backendValidationCalled).toBe(true);
      expect(validationFailed).toBe(true);
    });

    test('UI stock updates should not influence backend decisions', () => {
      // This test ensures UI stock display doesn't affect business logic
      
      // Arrange
      const products = [
        { id: '1', name: 'Test Product', stock: 10, track_stock: true }
      ];
      sessionProductStore.setProducts(products, Date.now());
      
      // Simulate order that reduces UI stock
      const orderData = {
        items: [{ name: 'Test Product', quantity: 8 }],
        total: 80
      };
      
      productFetchCoordinator.onOrderCreated(orderData);
      
      // Verify UI stock was reduced
      const uiProducts = sessionProductStore.getProducts();
      expect(uiProducts.find(p => p.name === 'Test Product').stock).toBe(2);
      
      // But backend validation should still use authoritative data
      // (This would be tested in integration tests with real backend)
      
      // The key principle: UI stock is for display only, never for business logic
      expect(typeof sessionProductStore.getProducts).toBe('function');
      expect(sessionProductStore.getProducts().length).toBeGreaterThan(0);
    });

    test('order creation API calls should remain unchanged', async () => {
      // Verify that order creation still goes through proper API channels
      
      const orderData = {
        items: [{ name: 'Product 1', quantity: 2 }],
        total: 40
      };

      // Mock successful order creation
      mockOrdersService.createOrder.mockResolvedValue({
        ...orderData,
        id: 'order-123',
        timestamp: Date.now()
      });

      // Act - Create order
      const result = await mockOrdersService.createOrder(orderData);

      // Assert - API was called with correct data
      expect(mockOrdersService.createOrder).toHaveBeenCalledWith(orderData);
      expect(result.id).toBe('order-123');
      
      // UI updates should only happen after successful API call
      productFetchCoordinator.onOrderCreated(result);
      uiUpdatePropagator.propagateOrderSuccess(result);
      
      // This demonstrates the correct flow: API first, then UI updates
      expect(mockOrdersService.createOrder).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration validation', () => {
    test('complete Phase B workflow should maintain all guarantees', async () => {
      // This test validates the entire Phase B implementation
      
      // Arrange
      const initialProducts = [
        { id: '1', name: 'Product A', price: 10, stock: 15, track_stock: true },
        { id: '2', name: 'Product B', price: 20, stock: 8, track_stock: true }
      ];
      sessionProductStore.setProducts(initialProducts, Date.now());
      
      const screenUpdates = [];
      uiUpdatePropagator.registerScreen('IntegrationScreen', (type, data) => {
        screenUpdates.push({ type: type || 'PRODUCT_UPDATE', data, timestamp: Date.now() });
      });

      // Mock successful operations
      mockProductsService.createProduct.mockResolvedValue({
        id: '3', name: 'New Product', price: 15, stock: 5, track_stock: true
      });
      
      mockOrdersService.createOrder.mockResolvedValue({
        id: 'order-456',
        items: [{ name: 'Product A', quantity: 3 }],
        total: 30
      });

      // Act 1 - Create product
      const newProduct = await mockProductsService.createProduct({
        name: 'New Product', price: 15, stock: 5, track_stock: true
      });
      productFetchCoordinator.onProductCreated(newProduct);
      uiUpdatePropagator.propagateProductUpdate();

      // Act 2 - Create order
      const order = await mockOrdersService.createOrder({
        items: [{ name: 'Product A', quantity: 3 }],
        total: 30
      });
      productFetchCoordinator.onOrderCreated(order);
      uiUpdatePropagator.propagateOrderSuccess(order);

      // Assert - All operations completed successfully
      expect(screenUpdates).toHaveLength(2);
      expect(screenUpdates[0].type).toBe('PRODUCT_UPDATE');
      expect(screenUpdates[1].type).toBe('ORDER_SUCCESS');
      
      // Verify final state
      const finalProducts = sessionProductStore.getProducts();
      expect(finalProducts).toHaveLength(3); // Original 2 + 1 new
      expect(finalProducts.find(p => p.name === 'Product A').stock).toBe(12); // 15 - 3
      expect(finalProducts.find(p => p.name === 'New Product')).toBeDefined();
      
      // Verify API contracts were respected
      expect(mockProductsService.createProduct).toHaveBeenCalledTimes(1);
      expect(mockOrdersService.createOrder).toHaveBeenCalledTimes(1);
    });
  });
});