/**
 * UIUpdatePropagator - Propagate data changes to all relevant UI components
 * 
 * Core Principles:
 * - Register screens for updates to prevent memory leaks
 * - Trigger updates ONLY after successful API operations
 * - No optimistic updates allowed
 * - Failed APIs trigger no UI changes
 * - Screens must unregister on unmount to prevent memory leaks
 * - Respects rollback configuration to disable propagation
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import uiOptimizationConfig from './UIOptimizationConfig';

class UIUpdatePropagator {
  constructor() {
    this.registeredScreens = new Map(); // screenName -> updateCallback
    this.isInitialized = false;
    
    console.log('🔄 [UIUpdatePropagator] Initialized');
  }

  /**
   * Initialize the propagator (called on app start/login)
   */
  initialize() {
    if (this.isInitialized) {
      console.log('🔄 [UIUpdatePropagator] Already initialized');
      return;
    }

    // Clear any existing registrations on initialization
    this.registeredScreens.clear();
    this.isInitialized = true;

    console.log('🔄 [UIUpdatePropagator] Initialized and registrations cleared');
  }

  /**
   * Clear all registrations (called on logout/restart)
   */
  clearSession() {
    console.log('🔄 [UIUpdatePropagator] Clearing session');
    
    this.registeredScreens.clear();
    this.isInitialized = false;
    
    console.log('🔄 [UIUpdatePropagator] Session cleared, all screens unregistered');
  }

  /**
   * Register a screen for updates
   * @param {string} screenName - Unique screen identifier
   * @param {Function} updateCallback - Function to call when updates occur
   */
  registerScreen(screenName, updateCallback) {
    if (!screenName || typeof screenName !== 'string') {
      console.error('🔄 [UIUpdatePropagator] registerScreen: Invalid screen name');
      return;
    }

    if (!updateCallback || typeof updateCallback !== 'function') {
      console.error('🔄 [UIUpdatePropagator] registerScreen: Invalid update callback');
      return;
    }

    // Check if screen is already registered
    if (this.registeredScreens.has(screenName)) {
      console.warn('🔄 [UIUpdatePropagator] registerScreen: Screen already registered, updating callback:', screenName);
    }

    this.registeredScreens.set(screenName, updateCallback);

    console.log('🔄 [UIUpdatePropagator] Screen registered:', {
      screenName,
      totalRegistered: this.registeredScreens.size
    });
  }

  /**
   * Unregister a screen from updates
   * CRITICAL: Must be called on screen unmount to prevent memory leaks
   * @param {string} screenName - Screen identifier to unregister
   */
  unregisterScreen(screenName) {
    if (!screenName || typeof screenName !== 'string') {
      console.error('🔄 [UIUpdatePropagator] unregisterScreen: Invalid screen name');
      return;
    }

    const wasRegistered = this.registeredScreens.has(screenName);
    this.registeredScreens.delete(screenName);

    if (wasRegistered) {
      console.log('🔄 [UIUpdatePropagator] Screen unregistered:', {
        screenName,
        totalRegistered: this.registeredScreens.size
      });
    } else {
      console.warn('🔄 [UIUpdatePropagator] unregisterScreen: Screen was not registered:', screenName);
    }
  }

  /**
   * Propagate product updates to all registered screens
   * Called ONLY after successful product API operations (create, update, delete)
   */
  propagateProductUpdate() {
    // Check if UI propagation is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isUIPropagationEnabled()) {
      console.log('🔄 [UIUpdatePropagator] UI propagation disabled - skipping product update');
      return;
    }

    console.log('🔄 [UIUpdatePropagator] Propagating product update to registered screens:', {
      registeredCount: this.registeredScreens.size,
      screens: Array.from(this.registeredScreens.keys())
    });

    this._triggerUpdates('PRODUCT_UPDATE');
  }

  /**
   * Propagate order updates to all registered screens
   * Called ONLY after successful order API operations
   */
  propagateOrderUpdate() {
    // Check if UI propagation is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isUIPropagationEnabled()) {
      console.log('🔄 [UIUpdatePropagator] UI propagation disabled - skipping order update');
      return;
    }

    console.log('🔄 [UIUpdatePropagator] Propagating order update to registered screens:', {
      registeredCount: this.registeredScreens.size,
      screens: Array.from(this.registeredScreens.keys())
    });

    this._triggerUpdates('ORDER_UPDATE');
  }

  /**
   * Propagate inventory updates to all registered screens
   * UI display only - does not influence backend validation
   * Called ONLY after successful inventory-affecting operations
   */
  propagateInventoryUpdate() {
    // Check if UI propagation is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isUIPropagationEnabled()) {
      console.log('🔄 [UIUpdatePropagator] UI propagation disabled - skipping inventory update');
      return;
    }

    console.log('🔄 [UIUpdatePropagator] Propagating inventory update to registered screens:', {
      registeredCount: this.registeredScreens.size,
      screens: Array.from(this.registeredScreens.keys())
    });

    this._triggerUpdates('INVENTORY_UPDATE');
  }

  /**
   * Propagate order success updates to all registered screens
   * Called ONLY after successful order creation
   * Updates both inventory and order lists in UI
   * @param {Object} orderData - The created order data
   */
  propagateOrderSuccess(orderData) {
    // Check if UI propagation is enabled (rollback mechanism)
    if (!uiOptimizationConfig.isUIPropagationEnabled()) {
      console.log('🔄 [UIUpdatePropagator] UI propagation disabled - skipping order success update');
      return;
    }

    console.log('🔄 [UIUpdatePropagator] Propagating order success to registered screens:', {
      registeredCount: this.registeredScreens.size,
      screens: Array.from(this.registeredScreens.keys()),
      orderId: orderData?.id,
      orderTotal: orderData?.total
    });

    this._triggerUpdates('ORDER_SUCCESS', orderData);
  }

  /**
   * Internal method to trigger updates on all registered screens
   * @param {string} updateType - Type of update being propagated
   * @param {Object} updateData - Optional data to pass with the update
   */
  _triggerUpdates(updateType, updateData = null) {
    if (this.registeredScreens.size === 0) {
      console.log('🔄 [UIUpdatePropagator] No screens registered for updates');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Iterate through all registered screens and call their update callbacks
    for (const [screenName, updateCallback] of this.registeredScreens) {
      try {
        console.log('🔄 [UIUpdatePropagator] Triggering update for screen:', {
          screenName,
          updateType,
          hasUpdateData: !!updateData
        });

        // Call the screen's update callback with optional data
        if (updateData) {
          updateCallback(updateType, updateData);
        } else {
          updateCallback();
        }
        successCount++;

      } catch (error) {
        console.error('🔄 [UIUpdatePropagator] Error triggering update for screen:', {
          screenName,
          updateType,
          error: error.message
        });
        errorCount++;

        // Consider unregistering screens that consistently fail
        // This prevents memory leaks from stale callbacks
        if (error.message.includes('Cannot read properties') || 
            error.message.includes('undefined is not a function')) {
          console.warn('🔄 [UIUpdatePropagator] Unregistering screen with stale callback:', screenName);
          this.registeredScreens.delete(screenName);
        }
      }
    }

    console.log('🔄 [UIUpdatePropagator] Update propagation complete:', {
      updateType,
      successCount,
      errorCount,
      totalAttempted: successCount + errorCount
    });
  }

  /**
   * Get propagator statistics for debugging
   * @returns {Object} Propagator statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      registeredScreensCount: this.registeredScreens.size,
      registeredScreens: Array.from(this.registeredScreens.keys()),
      memoryLeakRisk: this.registeredScreens.size > 10 // Warn if too many screens registered
    };
  }

  /**
   * Check if a specific screen is registered
   * @param {string} screenName - Screen name to check
   * @returns {boolean} True if screen is registered
   */
  isScreenRegistered(screenName) {
    return this.registeredScreens.has(screenName);
  }

  /**
   * Get list of all registered screen names
   * @returns {Array<string>} Array of registered screen names
   */
  getRegisteredScreens() {
    return Array.from(this.registeredScreens.keys());
  }

  /**
   * Force unregister all screens (for testing/debugging)
   */
  forceUnregisterAll() {
    console.log('🔄 [UIUpdatePropagator] Force unregistering all screens');
    const previousCount = this.registeredScreens.size;
    this.registeredScreens.clear();
    
    console.log('🔄 [UIUpdatePropagator] All screens unregistered:', {
      previousCount,
      currentCount: this.registeredScreens.size
    });
  }

  /**
   * Check if propagator is properly initialized
   * @returns {boolean} True if initialized
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Validate memory leak prevention
   * This method helps identify potential memory leaks from unregistered screens
   * @returns {Object} Memory leak analysis
   */
  validateMemoryLeakPrevention() {
    const registeredCount = this.registeredScreens.size;
    const memoryLeakRisk = registeredCount > 10;
    
    return {
      registeredScreensCount: registeredCount,
      memoryLeakRisk,
      recommendation: memoryLeakRisk ? 
        'Consider checking if screens are properly unregistering on unmount' : 
        'Memory usage looks healthy',
      registeredScreens: Array.from(this.registeredScreens.keys())
    };
  }
}

// Create singleton instance
const uiUpdatePropagator = new UIUpdatePropagator();

export default uiUpdatePropagator;