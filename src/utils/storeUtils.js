import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get store information for invoices
 */
export const getStoreInfo = async () => {
  try {
    const storeInfo = await AsyncStorage.getItem('storeInfo');
    if (storeInfo) {
      return JSON.parse(storeInfo);
    }
    
    // Return default store info if not set
    return {
      name: 'FlowPOS Store',
      address: 'Store Address Not Set',
      phone: '+91 XXXXXXXXXX',
      email: '',
      gstin: '',
    };
  } catch (error) {
    console.error('Error getting store info:', error);
    return {
      name: 'FlowPOS Store',
      address: 'Store Address Not Set',
      phone: '+91 XXXXXXXXXX',
      email: '',
      gstin: '',
    };
  }
};

/**
 * Update store information
 */
export const updateStoreInfo = async (storeData) => {
  try {
    await AsyncStorage.setItem('storeInfo', JSON.stringify(storeData));
    return true;
  } catch (error) {
    console.error('Error updating store info:', error);
    return false;
  }
};

/**
 * Check if store setup is complete
 */
export const isStoreSetupComplete = async () => {
  try {
    const storeSetupCompleted = await AsyncStorage.getItem('storeSetupCompleted');
    const storeInfo = await AsyncStorage.getItem('storeInfo');
    
    return !!(storeSetupCompleted && storeInfo);
  } catch (error) {
    console.error('Error checking store setup:', error);
    return false;
  }
};