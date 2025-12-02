import { useState, useEffect, useCallback } from 'react';
import ordersService from '../services/OrdersService';
import * as Haptics from 'expo-haptics';

export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Load orders
  const loadOrders = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const fetchedOrders = await ordersService.getOrders(options);
      setOrders(fetchedOrders);

      // Update pending count
      const pending = await ordersService.getPendingCount();
      setPendingCount(pending);

      // Update last sync time
      const lastSyncTime = await ordersService.getLastSyncTime();
      setLastSync(lastSyncTime);

      console.log(`📋 Loaded ${fetchedOrders.length} orders`);

    } catch (err) {
      console.error('Error loading orders:', err);
      
      // Handle authentication errors specially
      if (err.message && err.message.includes('Authentication expired')) {
        setError('Please log in again to sync your orders');
        setAuthError(true);
      } else {
        setError(err.message);
        setAuthError(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new order
  const createOrder = useCallback(async (orderData) => {
    try {
      setError(null);
      
      const newOrder = await ordersService.createOrder(orderData);
      
      // Add to local state
      setOrders(prevOrders => [newOrder, ...prevOrders]);
      
      // Update pending count
      const pending = await ordersService.getPendingCount();
      setPendingCount(pending);

      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      console.log('✅ Order created:', newOrder.id);
      return newOrder;

    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.message);
      
      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      throw err;
    }
  }, []);

  // Get order by ID
  const getOrderById = useCallback(async (orderId) => {
    try {
      setError(null);
      return await ordersService.getOrderById(orderId);
    } catch (err) {
      console.error('Error getting order by ID:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Sync pending orders
  const syncOrders = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);

      await ordersService.forceSyncNow();

      // Reload orders after sync
      await loadOrders();

      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      console.log('✅ Orders synced successfully');

    } catch (err) {
      console.error('Error syncing orders:', err);
      setError(err.message);
      
      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSyncing(false);
    }
  }, [loadOrders]);

  // Refresh orders (pull to refresh)
  const refreshOrders = useCallback(async () => {
    try {
      // Force sync first if there are pending orders
      if (pendingCount > 0) {
        await syncOrders();
      } else {
        await loadOrders();
      }
    } catch (err) {
      console.error('Error refreshing orders:', err);
    }
  }, [loadOrders, syncOrders, pendingCount]);

  // Get orders statistics
  const getOrdersStats = useCallback(() => {
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      completedOrders: orders.filter(order => order.status === 'completed').length,
      pendingOrders: orders.filter(order => order.status === 'pending').length,
      averageOrderValue: orders.length > 0 ? 
        orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length : 0,
      todayOrders: orders.filter(order => {
        const orderDate = new Date(order.timestamp);
        const today = new Date();
        return orderDate.toDateString() === today.toDateString();
      }).length,
      thisWeekRevenue: orders.filter(order => {
        const orderDate = new Date(order.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
      }).reduce((sum, order) => sum + (order.total || 0), 0)
    };

    return stats;
  }, [orders]);

  // Filter orders
  const filterOrders = useCallback((filters) => {
    let filtered = [...orders];

    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    if (filters.paymentMethod) {
      filtered = filtered.filter(order => order.paymentMethod === filters.paymentMethod);
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.timestamp);
        return orderDate >= start && orderDate <= end;
      });
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.items.some(item => item.name.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [orders]);

  // Auto-load orders on mount
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Auto-sync pending orders periodically
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      if (pendingCount > 0 && !syncing) {
        console.log('🔄 Auto-syncing pending orders...');
        try {
          await ordersService.forceSyncNow();
          
          // Update pending count
          const pending = await ordersService.getPendingCount();
          setPendingCount(pending);
          
          // Update last sync time
          const lastSyncTime = await ordersService.getLastSyncTime();
          setLastSync(lastSyncTime);
          
        } catch (error) {
          console.log('Auto-sync failed:', error.message);
        }
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(syncInterval);
  }, [pendingCount, syncing]);

  return {
    // Data
    orders,
    loading,
    error,
    authError,
    pendingCount,
    lastSync,
    syncing,

    // Actions
    loadOrders,
    createOrder,
    getOrderById,
    syncOrders,
    refreshOrders,

    // Utilities
    getOrdersStats,
    filterOrders,

    // Status helpers
    hasOrders: orders.length > 0,
    hasPendingSync: pendingCount > 0,
    isOnline: ordersService.isOnline,
  };
};