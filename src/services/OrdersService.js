import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import networkService from './NetworkService';
import tokenManager from './TokenManager';

class OrdersService {
  constructor() {
    this.ORDERS_STORAGE_KEY = 'orders';
    this.PENDING_SYNC_KEY = 'pendingOrdersSync';
    this.LAST_SYNC_KEY = 'lastOrdersSync';
    this.isOnline = true;
    this.syncInProgress = false;
    
    // Initialize network monitoring
    this.initNetworkMonitoring();
  }

  // Handle authentication errors
  handleAuthError(error) {
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('Invalid or expired token') || 
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('401')) {
      console.log('🔒 Authentication error detected, clearing invalid token');
      
      // Clear invalid token
      AsyncStorage.removeItem('authToken');
      
      // Return a user-friendly error
      return new Error('Authentication expired. Please log in again to sync orders.');
    }
    
    return error;
  }

  // Initialize network monitoring (SYNC DISABLED)
  initNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      console.log('📡 Orders - Network status:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        isOnline: this.isOnline
      });

      // Auto-sync DISABLED - using direct Supabase only
      if (this.isOnline) {
        console.log('🌐 Network restored - Direct Supabase mode (no sync needed)');
      }
    });
  }

  // Generate local order ID
  generateLocalOrderId() {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate order number
  generateOrderNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = Date.now().toString().slice(-4);
    return `ORD-${dateStr}-${timeStr}`;
  }

  // Create order (DIRECT TO SUPABASE - NO LOCAL STORAGE)
  async createOrder(orderData) {
    try {
      console.log('🛒 Creating order DIRECTLY in Supabase (NO LOCAL STORAGE):', orderData);

      if (!this.isOnline) {
        throw new Error('Cannot create orders while offline. Please check your internet connection.');
      }

      // 📦 INVENTORY CHECK: Validate stock levels before creating order
      console.log('📦 [MOBILE DEBUG] Validating inventory before order creation...');
      const stockValidation = await this.validateOrderStock(orderData.items || []);
      
      if (!stockValidation.valid) {
        const errorMessage = `Stock validation failed:\n${stockValidation.issues.join('\n')}`;
        console.error('❌ [MOBILE DEBUG] Stock validation failed:', stockValidation.issues);
        throw new Error(errorMessage);
      }

      if (stockValidation.warning) {
        console.log('⚠️ [MOBILE DEBUG] Stock validation warning:', stockValidation.warning);
      }

      // Prepare order data for Supabase
      const order = {
        orderNumber: orderData.orderNumber || this.generateOrderNumber(),
        customerName: orderData.customerName || 'Walk-in Customer',
        phoneNumber: orderData.phoneNumber || '',
        email: orderData.email || '',
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        tax: orderData.tax || 0,
        discount: orderData.discount || 0,
        total: orderData.total || 0,
        paymentMethod: orderData.paymentMethod || 'Cash',
        paymentStatus: orderData.paymentStatus || 'completed',
        paymentReference: orderData.paymentReference || '',
        status: orderData.status || 'completed',
        notes: orderData.notes || '',
        createdAt: new Date().toISOString()
      };

      // Create DIRECTLY in Supabase - NO LOCAL STORAGE
      const cloudOrder = await this.createOrderInCloud(order);
      
      console.log('✅ Order created directly in Supabase:', cloudOrder.id);
      console.log('📦 [MOBILE DEBUG] Inventory automatically updated by backend');
      
      // Optionally get updated inventory status to show changes
      try {
        const updatedInventory = await this.getInventoryStatus();
        console.log('📊 [MOBILE DEBUG] Updated inventory status:', updatedInventory);
      } catch (error) {
        console.log('⚠️ [MOBILE DEBUG] Could not fetch updated inventory:', error.message);
      }
      
      return cloudOrder;

    } catch (error) {
      console.error('❌ Error creating order in Supabase:', error);
      throw this.handleAuthError(error);
    }
  }

  // Get all orders (CLOUD ONLY - NO CACHE)
  async getOrders(options = {}) {
    try {
      console.log('📋 [OrdersService] getOrders() called with options:', options);
      console.log('📋 [OrdersService] isOnline:', this.isOnline);

      if (!this.isOnline) {
        console.log('📱 [OrdersService] Offline - cannot fetch orders without internet');
        return [];
      }

      console.log('📋 [OrdersService] Calling getOrdersFromCloud()...');
      
      // Always fetch fresh data from Supabase - NO LOCAL CACHE
      const orders = await this.getOrdersFromCloud(options);
      console.log('✅ [OrdersService] Fresh orders fetched directly from Supabase:', orders.length);
      
      // Apply client-side filtering if needed
      let filteredOrders = orders;
      
      if (options.status) {
        filteredOrders = filteredOrders.filter(order => order.status === options.status);
      }

      // Sort by created date (newest first)
      filteredOrders.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateB - dateA;
      });

      console.log('📊 [OrdersService] Returning fresh orders from Supabase:', filteredOrders.length);
      return filteredOrders;

    } catch (error) {
      console.error('❌ [OrdersService] Error in getOrders():', error);
      console.error('❌ [OrdersService] Error message:', error.message);
      console.error('❌ [OrdersService] Error stack:', error.stack);
      
      // Handle AbortError gracefully
      if (error.name === 'AbortError' || error.message.includes('Aborted')) {
        console.log('🔄 [OrdersService] Request aborted, returning empty array');
        return [];
      }
      
      // Return empty array instead of throwing
      console.log('🔄 [OrdersService] Returning empty array due to error');
      return [];
    }
  }

  // Get order by ID (hybrid approach)
  async getOrderById(orderId) {
    try {
      console.log('🔍 Fetching order by ID:', orderId);

      // Try local first (faster)
      const localOrder = await this.getOrderFromLocal(orderId);
      
      if (localOrder && !this.isOnline) {
        return localOrder;
      }

      if (this.isOnline) {
        try {
          // Try to get latest from cloud
          const cloudOrder = await this.getOrderFromCloud(orderId);
          
          // Update local cache
          await this.updateOrderLocally(cloudOrder);
          
          return cloudOrder;
          
        } catch (error) {
          console.log('⚠️ Cloud fetch failed, using local:', error.message);
          if (localOrder) {
            return localOrder;
          }
          throw error;
        }
      }

      if (localOrder) {
        return localOrder;
      }

      throw new Error('Order not found');

    } catch (error) {
      console.error('Error fetching order by ID:', error);
      throw error;
    }
  }

  // Sync disabled - Direct Supabase only
  async syncPendingOrders() {
    console.log('🚫 SYNC DISABLED - Using direct Supabase sync only');
    return;
  }

  // Local storage operations (DISABLED - Direct Supabase only)
  async saveOrderLocally(order) {
    console.log('🚫 Local storage disabled - orders go directly to Supabase');
    return;
  }

  async getOrdersFromLocal() {
    console.log('🚫 Local storage disabled - fetching from Supabase');
    return [];
  }

  async getOrderFromLocal(orderId) {
    console.log('🚫 Local storage disabled - fetching from Supabase');
    return null;
  }

  async updateOrderLocally(updatedOrder) {
    console.log('🚫 Local storage disabled - updates go directly to Supabase');
    return;
  }

  async cacheOrdersLocally(orders) {
    console.log('🚫 Local caching disabled - using direct Supabase only');
    return;
  }  
// Get user and store IDs from storage
  async getUserAndStoreIds() {
    try {
      let [userId, storeId, userData] = await Promise.all([
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('storeId'),
        AsyncStorage.getItem('userData')
      ]);

      console.log('📊 Retrieved IDs from storage:', { userId, storeId, hasUserData: !!userData });

      // AUTO-RECOVERY: If userId is missing but userData exists, extract it
      if (!userId && userData) {
        try {
          const user = JSON.parse(userData);
          if (user.id) {
            console.log('🔧 Auto-recovery: Extracting userId from userData');
            userId = user.id;
            // Save it for future use
            await AsyncStorage.setItem('userId', userId);
            console.log('✅ userId recovered and saved:', userId);
          }
        } catch (parseError) {
          console.error('Failed to parse userData:', parseError);
        }
      }

      // CRITICAL: Never use fallback user IDs - authentication is required
      if (!userId) {
        console.error('❌ User ID not found in AsyncStorage');
        console.error('   Available keys checked: userId, userData');
        throw new Error('User ID not found. Please log in again.');
      }

      return {
        userId: userId,
        storeId: storeId || null
      };
    } catch (error) {
      console.error('❌ Error getting user/store IDs:', error);
      throw new Error('Authentication required. Please log in again.');
    }
  }

// Cloud operations
  async createOrderInCloud(orderData) {
    try {
      // Get real user and store IDs
      const { userId, storeId } = await this.getUserAndStoreIds();

      const requestData = {
        user_id: userId,
        store_id: storeId,
        order_number: orderData.orderNumber,
        customer_name: orderData.customerName,
        customer_phone: orderData.phoneNumber,
        customer_email: orderData.email,
        items: orderData.items.map(item => ({
          name: item.name,
          sku: item.sku,
          category: item.category,
          price: item.price,
          quantity: item.quantity,
          discount_amount: item.discount || 0,
          tax_amount: item.tax || 0,
          notes: item.notes
        })),
        subtotal: orderData.subtotal,
        tax_amount: orderData.tax,
        discount_amount: orderData.discount,
        total_amount: Number(orderData.total || orderData.total_amount || 0), // Ensure it's a number
        payment_method: orderData.paymentMethod,
        payment_status: orderData.paymentStatus,
        payment_reference: orderData.paymentReference,
        order_status: orderData.status,
        notes: orderData.notes,
        local_id: orderData.localId
      };
      
      console.log('🔍 Frontend sending order data:', JSON.stringify(requestData, null, 2));
      console.log('🔍 Original orderData.total:', orderData.total, typeof orderData.total);
      
      // Validate total before sending
      if (!requestData.total_amount || requestData.total_amount <= 0) {
        throw new Error(`Cannot create order with zero or negative total. Total: ${requestData.total_amount}`);
      }
      
      const response = await networkService.apiCall('/orders', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order in cloud');
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('Error creating order in cloud:', error);
      throw this.handleAuthError(error);
    }
  }

  async getOrdersFromCloud(options = {}) {
    try {
      console.log('🌐 [OrdersService] getOrdersFromCloud() called');
      
      const queryParams = new URLSearchParams();
      
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.startDate) queryParams.append('start_date', options.startDate);
      if (options.endDate) queryParams.append('end_date', options.endDate);
      if (options.status) queryParams.append('status', options.status);

      const endpoint = `/orders?${queryParams}`;
      console.log('🌐 [OrdersService] Calling networkService.apiCall():', endpoint);

      const response = await networkService.apiCall(endpoint, {
        method: 'GET'
      });

      console.log('🌐 [OrdersService] Response received, status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [OrdersService] Response not OK:', errorData);
        throw new Error(errorData.message || 'Failed to fetch orders from cloud');
      }

      const result = await response.json();
      console.log('✅ [OrdersService] Orders data received:', result.data?.length || 0, 'orders');
      return result.data || [];

    } catch (error) {
      console.error('❌ [OrdersService] Error in getOrdersFromCloud():', error);
      console.error('❌ [OrdersService] Error message:', error.message);
      throw this.handleAuthError(error);
    }
  }

  async getOrderFromCloud(orderId) {
    try {
      const response = await networkService.apiCall(`/orders/${orderId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch order from cloud');
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('Error fetching order from cloud:', error);
      throw this.handleAuthError(error);
    }
  }

  async syncOrdersToCloud(orders) {
    try {
      const response = await networkService.apiCall('/orders/sync', {
        method: 'POST',
        body: JSON.stringify({ orders })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync orders to cloud');
      }

      const result = await response.json();
      return result.data || [];

    } catch (error) {
      console.error('Error syncing orders to cloud:', error);
      throw this.handleAuthError(error);
    }
  }

  // Pending sync operations
  async addToPendingSync(order) {
    try {
      const pending = await this.getPendingOrders();
      const existingIndex = pending.findIndex(o => o.id === order.id);
      
      if (existingIndex >= 0) {
        pending[existingIndex] = order;
      } else {
        pending.push(order);
      }

      await AsyncStorage.setItem(this.PENDING_SYNC_KEY, JSON.stringify(pending));
      console.log('📝 Added to pending sync:', order.id);

    } catch (error) {
      console.error('Error adding to pending sync:', error);
    }
  }

  async getPendingOrders() {
    try {
      const pendingJson = await AsyncStorage.getItem(this.PENDING_SYNC_KEY);
      return pendingJson ? JSON.parse(pendingJson) : [];
    } catch (error) {
      console.error('Error getting pending orders:', error);
      return [];
    }
  }

  async removeSyncedFromPending(syncedResults) {
    try {
      const pending = await this.getPendingOrders();
      const syncedLocalIds = syncedResults.map(r => r.localId);
      
      const remaining = pending.filter(order => 
        !syncedLocalIds.includes(order.localId || order.id)
      );

      await AsyncStorage.setItem(this.PENDING_SYNC_KEY, JSON.stringify(remaining));
      console.log('🗑️ Removed synced orders from pending:', syncedLocalIds.length);

    } catch (error) {
      console.error('Error removing synced from pending:', error);
    }
  }

  // Utility methods
  mergeOrders(cloudOrders, localOrders) {
    const merged = [...cloudOrders];
    
    // Add local orders that aren't in cloud
    for (const localOrder of localOrders) {
      const existsInCloud = cloudOrders.some(cloudOrder => 
        cloudOrder.id === localOrder.cloudId ||
        cloudOrder.localId === localOrder.localId ||
        cloudOrder.localId === localOrder.id
      );
      
      if (!existsInCloud) {
        merged.push(localOrder);
      }
    }

    return merged;
  }

  async getAuthToken() {
    // Temporarily return null to skip authentication
    console.log('🔧 Authentication temporarily disabled for testing');
    return null;
  }

  // Public methods for manual sync (DISABLED)
  async forceSyncNow() {
    console.log('🚫 Force sync disabled - Using direct Supabase only');
    return;
  }

  async getPendingCount() {
    const pending = await this.getPendingOrders();
    return pending.length;
  }

  async getLastSyncTime() {
    try {
      const lastSync = await AsyncStorage.getItem(this.LAST_SYNC_KEY);
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      return null;
    }
  }

  // Clear all local data (for testing/reset)
  async clearLocalData() {
    try {
      await AsyncStorage.multiRemove([
        this.ORDERS_STORAGE_KEY,
        this.PENDING_SYNC_KEY,
        this.LAST_SYNC_KEY
      ]);
      console.log('🗑️ Local orders data cleared');
    } catch (error) {
      console.error('Error clearing local data:', error);
    }
  }
  // 📦 INVENTORY MANAGEMENT: Get inventory status
  async getInventoryStatus() {
    try {
      console.log('📦 [MOBILE DEBUG] Getting inventory status from backend...');

      const response = await networkService.apiCall('/orders/inventory/status', {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get inventory status');
      }

      const result = await response.json();
      console.log('✅ [MOBILE DEBUG] Inventory status received:', result.data);
      return result.data;

    } catch (error) {
      console.error('❌ [MOBILE DEBUG] Error getting inventory status:', error);
      throw this.handleAuthError(error);
    }
  }

  // 📦 Check if products have sufficient stock before creating order
  async validateOrderStock(orderItems) {
    try {
      console.log('📦 [MOBILE DEBUG] Validating stock for order items...');
      
      const inventoryStatus = await this.getInventoryStatus();
      const stockIssues = [];

      for (const item of orderItems) {
        const productName = item.name || item.product_name;
        const requestedQty = parseInt(item.quantity);
        
        const product = inventoryStatus.find(p => p.name === productName);
        
        if (!product) {
          stockIssues.push(`Product "${productName}" not found in inventory`);
          continue;
        }

        if (product.stock < requestedQty) {
          stockIssues.push(`Insufficient stock for "${productName}": ${product.stock} available, ${requestedQty} requested`);
        }
      }

      if (stockIssues.length > 0) {
        console.log('⚠️ [MOBILE DEBUG] Stock validation issues:', stockIssues);
        return { valid: false, issues: stockIssues };
      }

      console.log('✅ [MOBILE DEBUG] Stock validation passed');
      return { valid: true, issues: [] };

    } catch (error) {
      console.error('❌ [MOBILE DEBUG] Error validating stock:', error);
      // Don't block order creation if stock validation fails
      return { valid: true, issues: [], warning: 'Could not validate stock levels' };
    }
  }
}

// Create singleton instance
const ordersService = new OrdersService();

export default ordersService;