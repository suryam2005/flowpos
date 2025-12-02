import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear all app data and reset to initial state
 */
export const clearAllAppData = async () => {
  try {
    const keysToRemove = [
      'products',
      'orders',
      'revenue',
      'cart',
      'hasCompletedOnboarding',
      'lastOrderNumber',
      // Add any other keys that should be cleared
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('All app data cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing app data:', error);
    return false;
  }
};

/**
 * Check if current data contains old dummy data
 */
export const hasOldDummyData = async () => {
  try {
    const products = await AsyncStorage.getItem('products');
    const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
    
    if (!products || hasCompletedOnboarding) {
      return false;
    }
    
    const parsedProducts = JSON.parse(products);
    
    // Check for old dummy data signatures
    const dummyDataSignatures = [
      'Classic Burger',
      'Margherita Pizza', 
      'Caesar Salad',
      'Sparkling Water',
      'Truffle Pasta',
      'Salmon Sushi'
    ];
    
    return parsedProducts.some(product => 
      dummyDataSignatures.includes(product.name) ||
      ['1', '2', '3', '4', '5', '6'].includes(product.id)
    );
  } catch (error) {
    console.error('Error checking for dummy data:', error);
    return false;
  }
};

/**
 * Get app data summary for debugging
 */
export const getAppDataSummary = async () => {
  try {
    const products = await AsyncStorage.getItem('products');
    const orders = await AsyncStorage.getItem('orders');
    const revenue = await AsyncStorage.getItem('revenue');
    const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
    
    return {
      productsCount: products ? JSON.parse(products).length : 0,
      ordersCount: orders ? JSON.parse(orders).length : 0,
      hasRevenue: !!revenue,
      hasCompletedOnboarding: !!hasCompletedOnboarding,
      hasOldData: await hasOldDummyData(),
    };
  } catch (error) {
    console.error('Error getting app data summary:', error);
    return null;
  }
};