/**
 * UIUpdatePropagator Usage Example
 * 
 * This file demonstrates how to integrate UIUpdatePropagator with screens
 * for Phase B of UI Performance Optimization
 */

import uiUpdatePropagator from './UIUpdatePropagator';
import productFetchCoordinator from './ProductFetchCoordinator';

/**
 * Example Screen Integration
 * Shows how a screen should register/unregister and handle updates
 */
class ExampleScreenIntegration {
  constructor(screenName) {
    this.screenName = screenName;
    this.isRegistered = false;
    this.updateCallback = this.handleUIUpdate.bind(this);
  }

  /**
   * Called when screen mounts/becomes active
   * Register for UI updates
   */
  onScreenMount() {
    console.log(`📱 [${this.screenName}] Screen mounting - registering for updates`);
    
    uiUpdatePropagator.registerScreen(this.screenName, this.updateCallback);
    this.isRegistered = true;
    
    console.log(`📱 [${this.screenName}] Registered for UI updates`);
  }

  /**
   * Called when screen unmounts/becomes inactive
   * CRITICAL: Must unregister to prevent memory leaks
   */
  onScreenUnmount() {
    console.log(`📱 [${this.screenName}] Screen unmounting - unregistering from updates`);
    
    if (this.isRegistered) {
      uiUpdatePropagator.unregisterScreen(this.screenName);
      this.isRegistered = false;
    }
    
    console.log(`📱 [${this.screenName}] Unregistered from UI updates`);
  }

  /**
   * Handle UI updates from UIUpdatePropagator
   * This is called when other screens perform successful API operations
   */
  handleUIUpdate() {
    console.log(`📱 [${this.screenName}] Received UI update - refreshing display`);
    
    // In a real React Native screen, this would trigger a re-render
    // For example: setRefreshTrigger(Date.now())
    this.refreshScreenData();
  }

  /**
   * Refresh screen data (simulated)
   * In real implementation, this would update state to trigger re-render
   */
  refreshScreenData() {
    console.log(`📱 [${this.screenName}] Refreshing screen data from cache`);
    
    // Example: Get fresh data from ProductFetchCoordinator
    // The coordinator will use cached data if available
    productFetchCoordinator.fetchProducts({
      screenName: this.screenName,
      forceRefresh: false // Use cache if available
    }).then(products => {
      console.log(`📱 [${this.screenName}] Screen refreshed with ${products.length} products`);
    }).catch(error => {
      console.error(`📱 [${this.screenName}] Error refreshing screen:`, error.message);
    });
  }

  /**
   * Example: Product creation with UI propagation
   * Shows how to trigger updates after successful API operations
   */
  async createProduct(productData) {
    console.log(`📱 [${this.screenName}] Creating product:`, productData.name);
    
    try {
      // 1. Call API to create product (simulated)
      const createdProduct = await this.simulateProductCreateAPI(productData);
      
      // 2. Update ProductFetchCoordinator cache (post-success only)
      productFetchCoordinator.onProductCreated(createdProduct);
      
      // 3. Propagate UI updates to all registered screens
      uiUpdatePropagator.propagateProductUpdate();
      
      console.log(`📱 [${this.screenName}] Product created and UI updates propagated`);
      return createdProduct;
      
    } catch (error) {
      console.error(`📱 [${this.screenName}] Product creation failed:`, error.message);
      // No cache updates or UI propagation on failure
      throw error;
    }
  }

  /**
   * Example: Product update with UI propagation
   */
  async updateProduct(productId, updates) {
    console.log(`📱 [${this.screenName}] Updating product:`, productId);
    
    try {
      // 1. Call API to update product (simulated)
      await this.simulateProductUpdateAPI(productId, updates);
      
      // 2. Update ProductFetchCoordinator cache (post-success only)
      productFetchCoordinator.onProductUpdated(productId, updates);
      
      // 3. Propagate UI updates to all registered screens
      uiUpdatePropagator.propagateProductUpdate();
      
      console.log(`📱 [${this.screenName}] Product updated and UI updates propagated`);
      
    } catch (error) {
      console.error(`📱 [${this.screenName}] Product update failed:`, error.message);
      // No cache updates or UI propagation on failure
      throw error;
    }
  }

  /**
   * Example: Product deletion with UI propagation
   */
  async deleteProduct(productId) {
    console.log(`📱 [${this.screenName}] Deleting product:`, productId);
    
    try {
      // 1. Call API to delete product (simulated)
      await this.simulateProductDeleteAPI(productId);
      
      // 2. Update ProductFetchCoordinator cache (post-success only)
      productFetchCoordinator.onProductDeleted(productId);
      
      // 3. Propagate UI updates to all registered screens
      uiUpdatePropagator.propagateProductUpdate();
      
      console.log(`📱 [${this.screenName}] Product deleted and UI updates propagated`);
      
    } catch (error) {
      console.error(`📱 [${this.screenName}] Product deletion failed:`, error.message);
      // No cache updates or UI propagation on failure
      throw error;
    }
  }

  // Simulated API calls (replace with real API calls in implementation)
  async simulateProductCreateAPI(productData) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    return {
      id: `product_${Date.now()}`,
      ...productData,
      createdAt: new Date().toISOString()
    };
  }

  async simulateProductUpdateAPI(productId, updates) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    return { success: true };
  }

  async simulateProductDeleteAPI(productId) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    return { success: true };
  }
}

/**
 * Example usage demonstration
 */
export function demonstrateUIUpdatePropagator() {
  console.log('\n🚀 [UIUpdatePropagator] Starting demonstration\n');

  // Initialize the propagator
  uiUpdatePropagator.initialize();

  // Create example screens
  const posScreen = new ExampleScreenIntegration('POSScreen');
  const manageScreen = new ExampleScreenIntegration('ManageScreen');
  const inventoryScreen = new ExampleScreenIntegration('InventoryScreen');

  // Mount screens (register for updates)
  posScreen.onScreenMount();
  manageScreen.onScreenMount();
  inventoryScreen.onScreenMount();

  // Demonstrate product creation from POS screen
  // This will trigger updates on all registered screens
  setTimeout(async () => {
    try {
      await posScreen.createProduct({
        name: 'Demo Product',
        price: 29.99,
        category: 'Electronics'
      });
    } catch (error) {
      console.error('Demo creation failed:', error.message);
    }
  }, 500);

  // Demonstrate screen unmounting (prevent memory leaks)
  setTimeout(() => {
    console.log('\n📱 [Demo] Unmounting manage screen\n');
    manageScreen.onScreenUnmount();
  }, 1000);

  // Demonstrate update after screen unmount
  setTimeout(async () => {
    try {
      await inventoryScreen.updateProduct('product_123', {
        stock: 50,
        price: 24.99
      });
    } catch (error) {
      console.error('Demo update failed:', error.message);
    }
  }, 1500);

  // Clean up
  setTimeout(() => {
    console.log('\n🧹 [Demo] Cleaning up\n');
    posScreen.onScreenUnmount();
    inventoryScreen.onScreenUnmount();
    uiUpdatePropagator.clearSession();
    console.log('🚀 [UIUpdatePropagator] Demonstration complete\n');
  }, 2000);
}

/**
 * React Native Screen Integration Example
 * Shows how to integrate with actual React Native screens
 */
export const ReactNativeScreenExample = `
// Example React Native Screen Integration

import React, { useEffect, useState } from 'react';
import { View, Text, RefreshControl, ScrollView } from 'react-native';
import uiUpdatePropagator from '../services/UIUpdatePropagator';
import productFetchCoordinator from '../services/ProductFetchCoordinator';

const ExampleScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const screenName = 'ExampleScreen';

  // Handle UI updates from other screens
  const handleUIUpdate = () => {
    console.log('📱 [ExampleScreen] Received UI update');
    setRefreshTrigger(Date.now()); // Trigger re-render
  };

  // Register for UI updates on mount
  useEffect(() => {
    console.log('📱 [ExampleScreen] Mounting - registering for updates');
    uiUpdatePropagator.registerScreen(screenName, handleUIUpdate);

    // CRITICAL: Unregister on unmount to prevent memory leaks
    return () => {
      console.log('📱 [ExampleScreen] Unmounting - unregistering from updates');
      uiUpdatePropagator.unregisterScreen(screenName);
    };
  }, []);

  // Load products (uses cache when available)
  const loadProducts = async (forceRefresh = false) => {
    try {
      setRefreshing(true);
      const fetchedProducts = await productFetchCoordinator.fetchProducts({
        screenName,
        forceRefresh
      });
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load products on mount and when refresh trigger changes
  useEffect(() => {
    loadProducts();
  }, [refreshTrigger]);

  // Handle pull-to-refresh (always hits API)
  const onRefresh = () => {
    loadProducts(true); // Force refresh bypasses cache
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View>
        <Text>Products: {products.length}</Text>
        {products.map(product => (
          <Text key={product.id}>{product.name}</Text>
        ))}
      </View>
    </ScrollView>
  );
};

export default ExampleScreen;
`;

export default ExampleScreenIntegration;