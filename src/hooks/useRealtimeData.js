import { useEffect, useState, useCallback } from 'react';
import { useDataSync } from '../context/DataSyncContext';
import { getStoreSettingsFromCache } from '../context/StoreSettingsContext';

export const useRealtimeData = (dataType = 'all') => {
  const { products, orders, storeInfo, subscribe, lastSync, saveStoreInfo, fetchFreshData } = useDataSync();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle data updates
  const handleDataUpdate = useCallback((update) => {
    // console.log(`Real-time update received: ${update.type}`, update.data);
    setError(null);
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribe(handleDataUpdate);
    return unsubscribe;
  }, [subscribe, handleDataUpdate]);

  // Return appropriate data based on type
  const getData = () => {
    switch (dataType) {
      case 'products':
        return products;
      case 'orders':
        return orders;
      case 'storeInfo':
        return storeInfo;
      default:
        return { products, orders, storeInfo };
    }
  };

  return {
    data: getData(),
    isLoading,
    error,
    lastSync,
    refresh: async () => {
      setIsLoading(true);
      try {
        // Trigger actual backend fetch for products and orders
        if (fetchFreshData) {
          await fetchFreshData();
        }
        
        // For storeInfo, use StoreSettingsContext cache (migrated from getStore())
        // The StoreSettingsContext is the single source of truth for store settings
        if (dataType === 'storeInfo' || dataType === 'all') {
          const cachedStoreInfo = getStoreSettingsFromCache();
          if (cachedStoreInfo) {
            await saveStoreInfo(cachedStoreInfo);
            console.log('📦 [useRealtimeData] Store info synced from StoreSettingsContext cache');
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setTimeout(() => setIsLoading(false), 500);
      }
    }
  };
};

export const useRealtimeProducts = () => {
  return useRealtimeData('products');
};

export const useRealtimeOrders = () => {
  return useRealtimeData('orders');
};

export const useRealtimeStoreInfo = () => {
  return useRealtimeData('storeInfo');
};
