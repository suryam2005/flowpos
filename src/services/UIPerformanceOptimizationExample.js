/**
 * UI Performance Optimization Example
 * 
 * This file demonstrates how screens should integrate with the ProductFetchCoordinator
 * for Phase A implementation. This is NOT a production service, just an example.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import productFetchCoordinator from './ProductFetchCoordinator';

/**
 * Example of how POSScreen should fetch products using the coordinator
 */
export const examplePOSScreenProductFetch = async (forceRefresh = false) => {
  try {
    console.log('📱 [POSScreen] Fetching products...');
    
    const products = await productFetchCoordinator.fetchProducts({
      screenName: 'POSScreen',
      forceRefresh,
      apiOptions: {
        // Any options that need to be passed to ProductsService
        active: true,
        sortBy: 'name'
      }
    });
    
    console.log('📱 [POSScreen] Products fetched:', products.length);
    return products;
    
  } catch (error) {
    console.error('📱 [POSScreen] Error fetching products:', error);
    throw error;
  }
};

/**
 * Example of how ManageScreen should fetch products using the coordinator
 */
export const exampleManageScreenProductFetch = async (forceRefresh = false) => {
  try {
    console.log('📱 [ManageScreen] Fetching products...');
    
    const products = await productFetchCoordinator.fetchProducts({
      screenName: 'ManageScreen',
      forceRefresh,
      apiOptions: {
        // ManageScreen might need all products including inactive ones
        active: undefined
      }
    });
    
    console.log('📱 [ManageScreen] Products fetched:', products.length);
    return products;
    
  } catch (error) {
    console.error('📱 [ManageScreen] Error fetching products:', error);
    throw error;
  }
};

/**
 * Example of how InventoryScreen should fetch products using the coordinator
 */
export const exampleInventoryScreenProductFetch = async (forceRefresh = false) => {
  try {
    console.log('📱 [InventoryScreen] Fetching products...');
    
    const products = await productFetchCoordinator.fetchProducts({
      screenName: 'InventoryScreen',
      forceRefresh,
      apiOptions: {
        // InventoryScreen might need products with stock tracking
        active: true
      }
    });
    
    console.log('📱 [InventoryScreen] Products fetched:', products.length);
    return products;
    
  } catch (error) {
    console.error('📱 [InventoryScreen] Error fetching products:', error);
    throw error;
  }
};

/**
 * Example of how ProductOnboardingScreen should fetch products using the coordinator
 */
export const exampleProductOnboardingScreenProductFetch = async (forceRefresh = false) => {
  try {
    console.log('📱 [ProductOnboardingScreen] Fetching products...');
    
    const products = await productFetchCoordinator.fetchProducts({
      screenName: 'ProductOnboardingScreen',
      forceRefresh,
      apiOptions: {
        // ProductOnboardingScreen might need all products to show existing ones
        active: true,
        limit: 50 // Might limit for onboarding display
      }
    });
    
    console.log('📱 [ProductOnboardingScreen] Products fetched:', products.length);
    return products;
    
  } catch (error) {
    console.error('📱 [ProductOnboardingScreen] Error fetching products:', error);
    throw error;
  }
};

/**
 * Example of how to handle pull-to-refresh (manual refresh override)
 */
export const examplePullToRefresh = async (screenName) => {
  try {
    console.log(`📱 [${screenName}] Pull-to-refresh triggered - forcing API call`);
    
    const products = await productFetchCoordinator.fetchProducts({
      screenName,
      forceRefresh: true, // This bypasses cache and hits API directly
      apiOptions: {}
    });
    
    console.log(`📱 [${screenName}] Pull-to-refresh completed:`, products.length);
    return products;
    
  } catch (error) {
    console.error(`📱 [${screenName}] Pull-to-refresh failed:`, error);
    throw error;
  }
};

/**
 * Example of how to handle post-success product operations
 */
export const exampleProductOperations = {
  
  /**
   * Example: After successfully creating a product via API
   */
  afterProductCreated: (newProduct) => {
    console.log('📱 [Example] Product created successfully, updating cache');
    productFetchCoordinator.onProductCreated(newProduct);
  },
  
  /**
   * Example: After successfully updating a product via API
   */
  afterProductUpdated: (productId, updates) => {
    console.log('📱 [Example] Product updated successfully, updating cache');
    productFetchCoordinator.onProductUpdated(productId, updates);
  },
  
  /**
   * Example: After successfully deleting a product via API
   */
  afterProductDeleted: (productId) => {
    console.log('📱 [Example] Product deleted successfully, updating cache');
    productFetchCoordinator.onProductDeleted(productId);
  }
};

/**
 * Example of cache statistics for debugging
 */
export const exampleGetCacheStats = () => {
  const stats = productFetchCoordinator.getCacheStats();
  console.log('📊 [Example] Cache Statistics:', stats);
  return stats;
};

/**
 * Example usage pattern for a typical screen component
 */
export const exampleScreenUsagePattern = {
  
  /**
   * On screen mount/focus - fetch products (uses cache if available)
   */
  onScreenMount: async () => {
    return await examplePOSScreenProductFetch(false);
  },
  
  /**
   * On pull-to-refresh - force fresh data
   */
  onPullToRefresh: async () => {
    return await examplePullToRefresh('ExampleScreen');
  },
  
  /**
   * After creating a product - update cache and UI
   */
  onProductCreated: (newProduct) => {
    exampleProductOperations.afterProductCreated(newProduct);
    // UI will automatically reflect the change since cache is updated
  },
  
  /**
   * Get current cache status
   */
  getCacheStatus: () => {
    return exampleGetCacheStats();
  }
};

export default {
  examplePOSScreenProductFetch,
  exampleManageScreenProductFetch,
  exampleInventoryScreenProductFetch,
  exampleProductOnboardingScreenProductFetch,
  examplePullToRefresh,
  exampleProductOperations,
  exampleGetCacheStats,
  exampleScreenUsagePattern
};