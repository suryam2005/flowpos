import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import productsService from '../services/ProductsService';
import ordersService from '../services/OrdersService';
import CloudStorageService from '../services/CloudStorageService';
import { networkGuard } from '../utils/NetworkGuard';

// Phase 1 Optimization: Cache staleness threshold for background sync
// Background sync will skip API calls if data was fetched within this threshold
const BACKGROUND_SYNC_STALENESS_MS = 5 * 60 * 1000; // 5 minutes

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

  // Load data from storage AND fetch from backend
  const loadData = async (silent = false) => {
    try {
      // console.log('📊 [DataSync] Loading data...');
      
      // First, load from AsyncStorage for immediate display
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

      // Don't auto-fetch on initial load - let screens control when to fetch
      // This prevents duplicate API calls

      if (hasChanges) {
        setLastSync(Date.now());
      }

      return currentDataRef.current;
    } catch (error) {
      console.error('❌ [DataSync] Error loading data:', error);
      return { products: [], orders: [], storeInfo: null };
    }
  };

  // Debounce timer for fetch
  const fetchTimerRef = useRef(null);
  const lastFetchRef = useRef(0);
  const pendingFetchRef = useRef(null); // Track in-flight requests for deduplication

  /**
   * Check if cache is stale based on the staleness threshold
   * @param {number} threshold - Staleness threshold in milliseconds
   * @returns {boolean} - True if cache is stale, false if fresh
   */
  const isCacheStale = (threshold = BACKGROUND_SYNC_STALENESS_MS) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;
    return lastFetchRef.current === 0 || timeSinceLastFetch > threshold;
  };

  /**
   * Fetch fresh data from backend with debounce and request deduplication
   * 
   * Phase 1 Optimization:
   * - For background sync (forceRefresh=false): Check cache staleness and network availability
   * - For user-triggered (forceRefresh=true): Execute immediately without cache checks
   * 
   * @param {boolean} forceRefresh - If true, skip cache staleness check (user-triggered)
   * @param {boolean} isBackgroundSync - If true, this is a background sync call
   */
  const fetchFreshData = async (forceRefresh = false, isBackgroundSync = false) => {
    try {
      const now = Date.now();

      // Phase 1 Optimization: Background sync checks
      if (isBackgroundSync || !forceRefresh) {
        // Requirement 4.4: Check network availability for background sync
        const isOnline = networkGuard.isOnlineSync();
        if (!isOnline) {
          // console.log('⏭️ [DataSync] Skipping background sync - device is offline');
          return;
        }

        // Requirement 4.2, 4.3: Check cache staleness for background sync
        if (!isCacheStale()) {
          // console.log('⏭️ [DataSync] Skipping background sync - cache is fresh');
          return;
        }
      }

      // Debounce: Don't fetch if we fetched less than 1 second ago (unless forced)
      if (!forceRefresh && now - lastFetchRef.current < 1000) {
        // console.log('⏭️ [DataSync] Skipping fetch - too soon since last fetch');
        return;
      }

      // Request deduplication: If a fetch is already in progress, reuse it
      if (pendingFetchRef.current) {
        // console.log('🔄 [DataSync] Reusing in-flight request');
        return pendingFetchRef.current;
      }

      // Clear any pending fetch
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }

      lastFetchRef.current = now;
      // console.log('🌐 [DataSync] Fetching products and orders from backend...');
      
      // Create the fetch promise and store it for deduplication
      const fetchPromise = (async () => {
        try {
          // Fetch both products and orders from backend
          // console.log('🌐 [DataSync] Fetching products and orders from backend...');
          
          const [freshProducts, freshOrders] = await Promise.all([
            productsService.getProducts(),
            ordersService.getOrders()
          ]);
          
          // console.log('✅ [DataSync] Fetched products:', freshProducts.length);
          // console.log('✅ [DataSync] Fetched orders:', freshOrders.length);
          
          // Handle products
          if (freshProducts && freshProducts.length >= 0) {
            await AsyncStorage.setItem('products', JSON.stringify(freshProducts));
            setProducts(freshProducts);
            currentDataRef.current.products = freshProducts;
            notifyListeners('products', freshProducts);
            // console.log('✅ [DataSync] Products synced to AsyncStorage');
          }
          
          // Handle orders
          if (freshOrders && freshOrders.length >= 0) {
            await AsyncStorage.setItem('orders', JSON.stringify(freshOrders));
            setOrders(freshOrders);
            currentDataRef.current.orders = freshOrders;
            notifyListeners('orders', freshOrders);
            // console.log('✅ [DataSync] Orders synced to AsyncStorage');
          }
          
          setLastSync(Date.now());
          // console.log('✅ [DataSync] Full data sync completed successfully');
          
        } finally {
          // Clear the pending request reference
          pendingFetchRef.current = null;
        }
      })();

      // Store the promise for deduplication
      pendingFetchRef.current = fetchPromise;
      await fetchPromise;
      
    } catch (error) {
      console.error('❌ [DataSync] Error fetching fresh data:', error);
      pendingFetchRef.current = null;
      // Don't throw - just log the error and continue with cached data
    }
  };

  // Save data to storage and notify listeners
  const saveProducts = async (newProducts, userPlan = 'trial') => {
    try {
      // Check storage quota before saving
      const dataSize = new TextEncoder().encode(JSON.stringify(newProducts)).length;
      const canStore = await CloudStorageService.canStoreAdditionalData(userPlan, dataSize);
      
      if (!canStore.canStore) {
        console.warn('⚠️ [DataSync] Storage quota exceeded, cannot save products');
        return { success: false, error: 'QUOTA_EXCEEDED', quotaInfo: canStore };
      }

      await AsyncStorage.setItem('products', JSON.stringify(newProducts));
      setProducts(newProducts);
      currentDataRef.current.products = newProducts;
      notifyListeners('products', newProducts);
      setLastSync(Date.now());
      
      // Update storage usage after successful save
      await CloudStorageService.calculateStorageUsage();
      
      return { success: true };
    } catch (error) {
      console.error('Error saving products:', error);
      return { success: false, error: 'SAVE_ERROR' };
    }
  };

  const saveOrders = async (newOrders, userPlan = 'trial') => {
    try {
      // Check storage quota before saving
      const dataSize = new TextEncoder().encode(JSON.stringify(newOrders)).length;
      const canStore = await CloudStorageService.canStoreAdditionalData(userPlan, dataSize);
      
      if (!canStore.canStore) {
        console.warn('⚠️ [DataSync] Storage quota exceeded, cannot save orders');
        return { success: false, error: 'QUOTA_EXCEEDED', quotaInfo: canStore };
      }

      await AsyncStorage.setItem('orders', JSON.stringify(newOrders));
      setOrders(newOrders);
      currentDataRef.current.orders = newOrders;
      notifyListeners('orders', newOrders);
      setLastSync(Date.now());
      
      // Update storage usage after successful save
      await CloudStorageService.calculateStorageUsage();
      
      return { success: true };
    } catch (error) {
      console.error('Error saving orders:', error);
      return { success: false, error: 'SAVE_ERROR' };
    }
  };

  const saveStoreInfo = async (newStoreInfo, userPlan = 'trial') => {
    try {
      // Check storage quota before saving
      const dataSize = new TextEncoder().encode(JSON.stringify(newStoreInfo)).length;
      const canStore = await CloudStorageService.canStoreAdditionalData(userPlan, dataSize);
      
      if (!canStore.canStore) {
        console.warn('⚠️ [DataSync] Storage quota exceeded, cannot save store info');
        return { success: false, error: 'QUOTA_EXCEEDED', quotaInfo: canStore };
      }

      await AsyncStorage.setItem('storeInfo', JSON.stringify(newStoreInfo));
      setStoreInfo(newStoreInfo);
      currentDataRef.current.storeInfo = newStoreInfo;
      notifyListeners('storeInfo', newStoreInfo);
      setLastSync(Date.now());
      
      // Update storage usage after successful save
      await CloudStorageService.calculateStorageUsage();
      
      return { success: true };
    } catch (error) {
      console.error('Error saving store info:', error);
      return { success: false, error: 'SAVE_ERROR' };
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

  // Start background sync - OPTIMIZED: Changed from 5 seconds to 5 minutes
  // Phase 1 Optimization: Background sync now checks cache staleness and network availability
  const startBackgroundSync = () => {
    if (syncIntervalRef.current) return;

    syncIntervalRef.current = setInterval(() => {
      // console.log('🔄 [DataSync] Background sync triggered');
      // Pass isBackgroundSync=true to enable cache staleness and network checks
      fetchFreshData(false, true); // Not forced, is background sync
    }, 1800000); // Check every 30 minutes (1800000ms) - Issue #5 fixed: increased from 5 min to 30 min
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
    fetchFreshData,
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
    
    // Phase 1 Optimization: Cache staleness utilities
    isCacheStale,
    getLastFetchTimestamp: () => lastFetchRef.current,
  };

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
};