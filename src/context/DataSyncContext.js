import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DataSyncContext = createContext();

export const useDataSync = () => {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSync must be used within a DataSyncProvider');
  }
  return context;
};

export const DataSyncProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [lastSync, setLastSync] = useState(Date.now());
  
  // Refs to track listeners and current data
  const listenersRef = useRef(new Set());
  const syncIntervalRef = useRef(null);
  const currentDataRef = useRef({ products: [], orders: [], storeInfo: null });

  // Subscribe to data changes
  const subscribe = (callback) => {
    listenersRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      listenersRef.current.delete(callback);
    };
  };

  // Notify all listeners of data changes
  const notifyListeners = (type, data) => {
    listenersRef.current.forEach(callback => {
      try {
        callback({ type, data, timestamp: Date.now() });
      } catch (error) {
        console.error('Error in data sync listener:', error);
      }
    });
  };

  // Load data from storage
  const loadData = async (silent = false) => {
    try {
      const [productsData, ordersData, storeData] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('orders'),
        AsyncStorage.getItem('storeInfo'),
      ]);

      let hasChanges = false;

      if (productsData) {
        const parsedProducts = JSON.parse(productsData);
        if (JSON.stringify(parsedProducts) !== JSON.stringify(currentDataRef.current.products)) {
          setProducts(parsedProducts);
          currentDataRef.current.products = parsedProducts;
          if (!silent) notifyListeners('products', parsedProducts);
          hasChanges = true;
        }
      }

      if (ordersData) {
        const parsedOrders = JSON.parse(ordersData);
        if (JSON.stringify(parsedOrders) !== JSON.stringify(currentDataRef.current.orders)) {
          setOrders(parsedOrders);
          currentDataRef.current.orders = parsedOrders;
          if (!silent) notifyListeners('orders', parsedOrders);
          hasChanges = true;
        }
      }

      if (storeData) {
        const parsedStore = JSON.parse(storeData);
        if (JSON.stringify(parsedStore) !== JSON.stringify(currentDataRef.current.storeInfo)) {
          setStoreInfo(parsedStore);
          currentDataRef.current.storeInfo = parsedStore;
          if (!silent) notifyListeners('storeInfo', parsedStore);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        setLastSync(Date.now());
      }

      return currentDataRef.current;
    } catch (error) {
      console.error('Error loading data:', error);
      return { products: [], orders: [], storeInfo: null };
    }
  };

  // Save data to storage and notify listeners
  const saveProducts = async (newProducts) => {
    try {
      await AsyncStorage.setItem('products', JSON.stringify(newProducts));
      setProducts(newProducts);
      currentDataRef.current.products = newProducts;
      notifyListeners('products', newProducts);
      setLastSync(Date.now());
      return true;
    } catch (error) {
      console.error('Error saving products:', error);
      return false;
    }
  };

  const saveOrders = async (newOrders) => {
    try {
      await AsyncStorage.setItem('orders', JSON.stringify(newOrders));
      setOrders(newOrders);
      currentDataRef.current.orders = newOrders;
      notifyListeners('orders', newOrders);
      setLastSync(Date.now());
      return true;
    } catch (error) {
      console.error('Error saving orders:', error);
      return false;
    }
  };

  const saveStoreInfo = async (newStoreInfo) => {
    try {
      await AsyncStorage.setItem('storeInfo', JSON.stringify(newStoreInfo));
      setStoreInfo(newStoreInfo);
      currentDataRef.current.storeInfo = newStoreInfo;
      notifyListeners('storeInfo', newStoreInfo);
      setLastSync(Date.now());
      return true;
    } catch (error) {
      console.error('Error saving store info:', error);
      return false;
    }
  };

  // Add new product
  const addProduct = async (product) => {
    const newProduct = {
      ...product,
      id: Date.now().toString(),
    };
    const updatedProducts = [...products, newProduct];
    return await saveProducts(updatedProducts);
  };

  // Update existing product
  const updateProduct = async (productId, updates) => {
    const updatedProducts = products.map(p =>
      p.id === productId ? { ...p, ...updates } : p
    );
    return await saveProducts(updatedProducts);
  };

  // Delete product
  const deleteProduct = async (productId) => {
    const updatedProducts = products.filter(p => p.id !== productId);
    return await saveProducts(updatedProducts);
  };

  // Add new order
  const addOrder = async (order) => {
    const newOrder = {
      ...order,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    const updatedOrders = [newOrder, ...orders];
    return await saveOrders(updatedOrders);
  };

  // Start background sync
  const startBackgroundSync = () => {
    if (syncIntervalRef.current) return;

    syncIntervalRef.current = setInterval(() => {
      loadData(true); // Silent sync
    }, 5000); // Check every 5 seconds
  };

  // Stop background sync
  const stopBackgroundSync = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  // Initialize data on mount
  useEffect(() => {
    const initializeData = async () => {
      const data = await loadData(true);
      currentDataRef.current = data;
    };
    
    initializeData();
    startBackgroundSync();

    return () => {
      stopBackgroundSync();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundSync();
      listenersRef.current.clear();
    };
  }, []);

  const value = {
    // Data
    products,
    orders,
    storeInfo,
    lastSync,
    
    // Methods
    loadData,
    saveProducts,
    saveOrders,
    saveStoreInfo,
    addProduct,
    updateProduct,
    deleteProduct,
    addOrder,
    
    // Sync
    subscribe,
    startBackgroundSync,
    stopBackgroundSync,
  };

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
};