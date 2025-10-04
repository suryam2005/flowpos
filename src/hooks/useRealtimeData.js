import { useEffect, useState, useCallback } from 'react';
import { useDataSync } from '../context/DataSyncContext';

export const useRealtimeData = (dataType = 'all') => {
  const { products, orders, storeInfo, subscribe, lastSync } = useDataSync();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle data updates
  const handleDataUpdate = useCallback((update) => {
    console.log(`Real-time update received: ${update.type}`, update.data);
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
    refresh: () => {
      setIsLoading(true);
      // The data sync context will handle the actual refresh
      setTimeout(() => setIsLoading(false), 500);
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