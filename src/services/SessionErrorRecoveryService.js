// Session Error Recovery Service - Graceful network error handling and recovery
// Requirements: 10.3 - Graceful network error handling

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiCallWithFallback } from '../config/apiConfig';

class SessionErrorRecoveryService {
  constructor() {
    this.retryQueue = new Map();
    this.isOnline = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.listeners = new Set();
    
    this.setupNetworkListener();
    console.log('🔄 Session Error Recovery Service initialized');
  }

  /**
   * Add listener for network status changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of network status changes
   */
  notifyListeners(eventType, data) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, data);
      } catch (error) {
        console.error('❌ Error notifying recovery service listener:', error);
      }
    });
  }

  /**
   * Setup network connectivity listener
   */
  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      console.log(`🌐 [ErrorRecovery] Network status: ${this.isOnline ? 'Online' : 'Offline'}`);
      
      if (!wasOnline && this.isOnline) {
        // Network restored - process retry queue
        this.handleNetworkRestored();
      } else if (wasOnline && !this.isOnline) {
        // Network lost
        this.handleNetworkLost();
      }
      
      this.notifyListeners('network_status_changed', {
        isOnline: this.isOnline,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable
      });
    });
  }

  /**
   * Handle network restoration
   */
  async handleNetworkRestored() {
    console.log('🔄 [ErrorRecovery] Network restored, processing retry queue...');
    
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    this.notifyListeners('network_restored', {
      queueSize: this.retryQueue.size
    });
    
    // Process all queued operations
    const queuedOperations = Array.from(this.retryQueue.values());
    this.retryQueue.clear();
    
    for (const operation of queuedOperations) {
      try {
        await this.executeQueuedOperation(operation);
      } catch (error) {
        console.error('❌ [ErrorRecovery] Failed to execute queued operation:', error);
      }
    }
  }

  /**
   * Handle network loss
   */
  handleNetworkLost() {
    console.log('📵 [ErrorRecovery] Network lost');
    
    this.notifyListeners('network_lost', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Execute a queued operation
   */
  async executeQueuedOperation(operation) {
    console.log(`🔄 [ErrorRecovery] Executing queued operation: ${operation.type}`);
    
    try {
      const result = await operation.execute();
      
      if (operation.onSuccess) {
        operation.onSuccess(result);
      }
      
      this.notifyListeners('operation_recovered', {
        operationType: operation.type,
        result: result
      });
      
      return result;
    } catch (error) {
      console.error(`❌ [ErrorRecovery] Queued operation failed: ${operation.type}`, error);
      
      if (operation.onError) {
        operation.onError(error);
      }
      
      this.notifyListeners('operation_recovery_failed', {
        operationType: operation.type,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Add operation to retry queue
   */
  queueForRetry(operationId, operation) {
    console.log(`📝 [ErrorRecovery] Queueing operation for retry: ${operationId}`);
    
    this.retryQueue.set(operationId, {
      id: operationId,
      timestamp: Date.now(),
      ...operation
    });
    
    this.notifyListeners('operation_queued', {
      operationId: operationId,
      queueSize: this.retryQueue.size
    });
  }

  /**
   * Remove operation from retry queue
   */
  removeFromQueue(operationId) {
    const removed = this.retryQueue.delete(operationId);
    if (removed) {
      console.log(`🗑️ [ErrorRecovery] Removed operation from queue: ${operationId}`);
    }
    return removed;
  }

  /**
   * Classify error type for appropriate handling
   */
  classifyError(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('network request failed') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('connection')) {
      return 'network_error';
    }
    
    if (errorMessage.includes('token') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('401')) {
      return 'auth_error';
    }
    
    if (errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504')) {
      return 'server_error';
    }
    
    if (errorMessage.includes('400') ||
        errorMessage.includes('404') ||
        errorMessage.includes('422')) {
      return 'client_error';
    }
    
    return 'unknown_error';
  }

  /**
   * Handle session-related API errors with recovery
   */
  async handleSessionError(error, operation) {
    const errorType = this.classifyError(error);
    console.log(`🔍 [ErrorRecovery] Handling ${errorType}:`, error.message);
    
    switch (errorType) {
      case 'network_error':
        return this.handleNetworkError(error, operation);
      
      case 'auth_error':
        return this.handleAuthError(error, operation);
      
      case 'server_error':
        return this.handleServerError(error, operation);
      
      case 'client_error':
        return this.handleClientError(error, operation);
      
      default:
        return this.handleUnknownError(error, operation);
    }
  }

  /**
   * Handle network errors
   */
  async handleNetworkError(error, operation) {
    console.log('🌐 [ErrorRecovery] Handling network error');
    
    if (!this.isOnline) {
      // Queue for retry when network is restored
      if (operation && operation.retryable !== false) {
        const operationId = `${operation.type}_${Date.now()}`;
        this.queueForRetry(operationId, operation);
        
        return {
          success: false,
          error: 'network_offline',
          message: 'Operation queued for retry when network is restored',
          queued: true
        };
      }
    } else {
      // Network appears online but request failed - try immediate retry
      if (operation && operation.retryCount < 3) {
        console.log(`🔄 [ErrorRecovery] Retrying network operation (attempt ${operation.retryCount + 1})`);
        
        const delay = Math.min(1000 * Math.pow(2, operation.retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          const retryOperation = {
            ...operation,
            retryCount: (operation.retryCount || 0) + 1
          };
          
          const result = await retryOperation.execute();
          
          this.notifyListeners('operation_retry_succeeded', {
            operationType: operation.type,
            retryCount: retryOperation.retryCount
          });
          
          return result;
        } catch (retryError) {
          console.error('❌ [ErrorRecovery] Retry failed:', retryError);
          
          if (retryOperation.retryCount >= 3) {
            this.notifyListeners('operation_retry_exhausted', {
              operationType: operation.type,
              finalError: retryError.message
            });
          }
          
          throw retryError;
        }
      }
    }
    
    throw error;
  }

  /**
   * Handle authentication errors
   */
  async handleAuthError(error, operation) {
    console.log('🔐 [ErrorRecovery] Handling auth error');
    
    // Try to refresh token
    try {
      const refreshed = await this.attemptTokenRefresh();
      
      if (refreshed && operation && operation.retryable !== false) {
        console.log('🔄 [ErrorRecovery] Token refreshed, retrying operation');
        
        const result = await operation.execute();
        
        this.notifyListeners('operation_auth_recovered', {
          operationType: operation.type
        });
        
        return result;
      }
    } catch (refreshError) {
      console.error('❌ [ErrorRecovery] Token refresh failed:', refreshError);
    }
    
    // Token refresh failed - user needs to re-authenticate
    this.notifyListeners('auth_recovery_failed', {
      originalError: error.message,
      requiresReauth: true
    });
    
    throw new Error('Session expired. Please log in again.');
  }

  /**
   * Handle server errors
   */
  async handleServerError(error, operation) {
    console.log('🖥️ [ErrorRecovery] Handling server error');
    
    // Server errors might be temporary - try retry with backoff
    if (operation && operation.retryCount < 2) {
      const delay = Math.min(2000 * Math.pow(2, operation.retryCount || 0), 10000);
      console.log(`🔄 [ErrorRecovery] Retrying server operation in ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        const retryOperation = {
          ...operation,
          retryCount: (operation.retryCount || 0) + 1
        };
        
        const result = await retryOperation.execute();
        
        this.notifyListeners('operation_server_recovered', {
          operationType: operation.type,
          retryCount: retryOperation.retryCount
        });
        
        return result;
      } catch (retryError) {
        console.error('❌ [ErrorRecovery] Server retry failed:', retryError);
        throw retryError;
      }
    }
    
    this.notifyListeners('server_error_unrecoverable', {
      error: error.message,
      operationType: operation?.type
    });
    
    throw error;
  }

  /**
   * Handle client errors (usually not recoverable)
   */
  async handleClientError(error, operation) {
    console.log('📱 [ErrorRecovery] Handling client error');
    
    this.notifyListeners('client_error', {
      error: error.message,
      operationType: operation?.type
    });
    
    // Client errors are usually not recoverable
    throw error;
  }

  /**
   * Handle unknown errors
   */
  async handleUnknownError(error, operation) {
    console.log('❓ [ErrorRecovery] Handling unknown error');
    
    this.notifyListeners('unknown_error', {
      error: error.message,
      operationType: operation?.type
    });
    
    throw error;
  }

  /**
   * Attempt to refresh authentication token
   */
  async attemptTokenRefresh() {
    try {
      console.log('🔄 [ErrorRecovery] Attempting token refresh...');
      
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await apiCallWithFallback('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      
      if (data.access_token) {
        await AsyncStorage.setItem('accessToken', data.access_token);
        if (data.refresh_token) {
          await AsyncStorage.setItem('refreshToken', data.refresh_token);
        }
        
        console.log('✅ [ErrorRecovery] Token refreshed successfully');
        return true;
      }
      
      throw new Error('Invalid refresh response');
      
    } catch (error) {
      console.error('❌ [ErrorRecovery] Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Create a recoverable operation wrapper
   */
  createRecoverableOperation(type, executeFunction, options = {}) {
    return {
      type: type,
      execute: executeFunction,
      retryable: options.retryable !== false,
      retryCount: 0,
      onSuccess: options.onSuccess,
      onError: options.onError,
      metadata: options.metadata || {}
    };
  }

  /**
   * Execute operation with error recovery
   */
  async executeWithRecovery(operation) {
    try {
      return await operation.execute();
    } catch (error) {
      return await this.handleSessionError(error, operation);
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      queueSize: this.retryQueue.size,
      reconnectAttempts: this.reconnectAttempts,
      queuedOperations: Array.from(this.retryQueue.keys())
    };
  }

  /**
   * Clear retry queue
   */
  clearQueue() {
    const queueSize = this.retryQueue.size;
    this.retryQueue.clear();
    
    console.log(`🧹 [ErrorRecovery] Cleared retry queue (${queueSize} operations)`);
    
    this.notifyListeners('queue_cleared', {
      clearedOperations: queueSize
    });
  }
}

// Create singleton instance
const sessionErrorRecoveryService = new SessionErrorRecoveryService();

export default sessionErrorRecoveryService;