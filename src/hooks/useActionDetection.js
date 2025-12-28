import { useEffect, useCallback, useRef } from 'react';
import actionDetectorService, { ACTION_TYPES } from '../services/ActionDetectorService';

/**
 * useActionDetection - Hook for integrating action detection with screens
 * 
 * Provides detection methods for:
 * - Cart operations (add, quantity change, remove)
 * - Modal open/close
 * - Text field input
 * - Tab changes
 * - Navigation events
 * 
 * Usage:
 * const { notifyCartItemAdded, notifyModalOpened, ... } = useActionDetection();
 */

/**
 * Main hook for action detection integration
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether detection is enabled
 * @returns {Object} Action notification methods
 */
export const useActionDetection = (options = {}) => {
  const { enabled = true } = options;
  const isEnabledRef = useRef(enabled);

  // Update ref when enabled changes
  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  // ============================================
  // Cart Action Notifications
  // ============================================

  /**
   * Notify that a cart item was added
   * @param {Object} [productData] - Optional product data
   */
  const notifyCartItemAdded = useCallback((productData = null) => {
    if (!isEnabledRef.current) return;
    console.log('🛒 [useActionDetection] Cart item added');
    actionDetectorService.notifyAction(ACTION_TYPES.TAP, 'product-card', productData);
  }, []);

  /**
   * Notify that cart item quantity was changed
   * @param {Object} [changeData] - Optional change data { productId, oldQty, newQty }
   */
  const notifyQuantityChanged = useCallback((changeData = null) => {
    if (!isEnabledRef.current) return;
    console.log('🛒 [useActionDetection] Quantity changed');
    actionDetectorService.notifyAction(ACTION_TYPES.TAP, 'product-card', changeData);
  }, []);

  /**
   * Notify that a cart item was removed
   * @param {Object} [productData] - Optional product data
   */
  const notifyItemRemoved = useCallback((productData = null) => {
    if (!isEnabledRef.current) return;
    console.log('🛒 [useActionDetection] Item removed');
    actionDetectorService.notifyAction(ACTION_TYPES.LONG_PRESS, 'product-card', productData);
  }, []);

  // ============================================
  // Modal Action Notifications
  // ============================================

  /**
   * Notify that a modal was opened
   * @param {string} [modalId] - Optional modal identifier
   */
  const notifyModalOpened = useCallback((modalId = 'default-modal') => {
    if (!isEnabledRef.current) return;
    console.log('📱 [useActionDetection] Modal opened:', modalId);
    actionDetectorService.notifyAction(ACTION_TYPES.MODAL_OPEN, modalId);
  }, []);

  /**
   * Notify that a modal was closed
   * @param {string} [modalId] - Optional modal identifier
   */
  const notifyModalClosed = useCallback((modalId = 'default-modal') => {
    if (!isEnabledRef.current) return;
    console.log('📱 [useActionDetection] Modal closed:', modalId);
    actionDetectorService.notifyAction(ACTION_TYPES.MODAL_CLOSE, modalId);
  }, []);

  /**
   * Notify that add product modal was opened
   */
  const notifyAddProductModalOpened = useCallback(() => {
    if (!isEnabledRef.current) return;
    console.log('📱 [useActionDetection] Add product modal opened');
    actionDetectorService.notifyAction(ACTION_TYPES.MODAL_OPEN, 'add-product-btn');
  }, []);

  /**
   * Notify that stock adjustment modal was opened
   */
  const notifyStockAdjustModalOpened = useCallback(() => {
    if (!isEnabledRef.current) return;
    console.log('📱 [useActionDetection] Stock adjustment modal opened');
    actionDetectorService.notifyAction(ACTION_TYPES.MODAL_OPEN, 'inventory-product-item');
  }, []);

  // ============================================
  // Text Input Action Notifications
  // ============================================

  /**
   * Notify that text was entered in a field
   * @param {string} fieldId - Field identifier
   * @param {string} [value] - Optional entered value
   */
  const notifyTextEntered = useCallback((fieldId, value = null) => {
    if (!isEnabledRef.current) return;
    console.log('📝 [useActionDetection] Text entered in:', fieldId);
    actionDetectorService.notifyAction(ACTION_TYPES.TEXT_INPUT, fieldId, { value });
  }, []);

  /**
   * Notify that product name was entered
   * @param {string} [value] - Optional entered value
   */
  const notifyProductNameEntered = useCallback((value = null) => {
    if (!isEnabledRef.current) return;
    console.log('📝 [useActionDetection] Product name entered');
    actionDetectorService.notifyAction(ACTION_TYPES.TEXT_INPUT, 'product-name-input', { value });
  }, []);

  /**
   * Notify that product price was entered
   * @param {string} [value] - Optional entered value
   */
  const notifyProductPriceEntered = useCallback((value = null) => {
    if (!isEnabledRef.current) return;
    console.log('📝 [useActionDetection] Product price entered');
    actionDetectorService.notifyAction(ACTION_TYPES.TEXT_INPUT, 'product-price-input', { value });
  }, []);

  /**
   * Notify that stock quantity was entered
   * @param {string} [value] - Optional entered value
   */
  const notifyStockQuantityEntered = useCallback((value = null) => {
    if (!isEnabledRef.current) return;
    console.log('📝 [useActionDetection] Stock quantity entered');
    actionDetectorService.notifyAction(ACTION_TYPES.TEXT_INPUT, 'stock-quantity-input', { value });
  }, []);

  // ============================================
  // Tab Change Action Notifications
  // ============================================

  /**
   * Notify that a tab was changed
   * @param {string} tabId - Tab identifier
   */
  const notifyTabChanged = useCallback((tabId) => {
    if (!isEnabledRef.current) return;
    console.log('📑 [useActionDetection] Tab changed to:', tabId);
    actionDetectorService.notifyAction(ACTION_TYPES.TAB_CHANGE, tabId);
  }, []);

  /**
   * Notify that inventory tab was selected
   */
  const notifyInventoryTabSelected = useCallback(() => {
    if (!isEnabledRef.current) return;
    console.log('📑 [useActionDetection] Inventory tab selected');
    actionDetectorService.notifyAction(ACTION_TYPES.TAB_CHANGE, 'inventory-tab');
  }, []);

  /**
   * Notify that products tab was selected
   */
  const notifyProductsTabSelected = useCallback(() => {
    if (!isEnabledRef.current) return;
    console.log('📑 [useActionDetection] Products tab selected');
    actionDetectorService.notifyAction(ACTION_TYPES.TAB_CHANGE, 'products-tab');
  }, []);

  /**
   * Notify that store settings tab was selected
   */
  const notifyStoreSettingsTabSelected = useCallback(() => {
    if (!isEnabledRef.current) return;
    console.log('📑 [useActionDetection] Store settings tab selected');
    actionDetectorService.notifyAction(ACTION_TYPES.TAB_CHANGE, 'store-settings-tab');
  }, []);

  // ============================================
  // Navigation Action Notifications
  // ============================================

  /**
   * Notify that navigation occurred
   * @param {string} screenName - Target screen name
   */
  const notifyNavigation = useCallback((screenName) => {
    if (!isEnabledRef.current) return;
    console.log('🧭 [useActionDetection] Navigation to:', screenName);
    actionDetectorService.notifyAction(ACTION_TYPES.NAVIGATION, screenName);
  }, []);

  /**
   * Notify that complete order button was pressed
   */
  const notifyCompleteOrderPressed = useCallback(() => {
    if (!isEnabledRef.current) return;
    console.log('🧭 [useActionDetection] Complete order pressed');
    actionDetectorService.notifyAction(ACTION_TYPES.NAVIGATION, 'complete-order-btn');
  }, []);

  // ============================================
  // Button Tap Action Notifications
  // ============================================

  /**
   * Notify that a button was tapped
   * @param {string} buttonId - Button identifier
   */
  const notifyButtonTapped = useCallback((buttonId) => {
    if (!isEnabledRef.current) return;
    console.log('👆 [useActionDetection] Button tapped:', buttonId);
    actionDetectorService.notifyAction(ACTION_TYPES.TAP, buttonId);
  }, []);

  /**
   * Notify that save product button was tapped
   */
  const notifySaveProductTapped = useCallback(() => {
    if (!isEnabledRef.current) return;
    console.log('👆 [useActionDetection] Save product tapped');
    actionDetectorService.notifyAction(ACTION_TYPES.TAP, 'save-product-btn');
  }, []);

  // ============================================
  // Generic Action Notification
  // ============================================

  /**
   * Notify a generic action
   * @param {string} actionType - Action type from ACTION_TYPES
   * @param {string} targetId - Target identifier
   * @param {any} [eventData] - Optional event data
   */
  const notifyAction = useCallback((actionType, targetId, eventData = null) => {
    if (!isEnabledRef.current) return;
    console.log(`🎯 [useActionDetection] Action: ${actionType} on ${targetId}`);
    actionDetectorService.notifyAction(actionType, targetId, eventData);
  }, []);

  return {
    // Cart actions
    notifyCartItemAdded,
    notifyQuantityChanged,
    notifyItemRemoved,
    
    // Modal actions
    notifyModalOpened,
    notifyModalClosed,
    notifyAddProductModalOpened,
    notifyStockAdjustModalOpened,
    
    // Text input actions
    notifyTextEntered,
    notifyProductNameEntered,
    notifyProductPriceEntered,
    notifyStockQuantityEntered,
    
    // Tab change actions
    notifyTabChanged,
    notifyInventoryTabSelected,
    notifyProductsTabSelected,
    notifyStoreSettingsTabSelected,
    
    // Navigation actions
    notifyNavigation,
    notifyCompleteOrderPressed,
    
    // Button actions
    notifyButtonTapped,
    notifySaveProductTapped,
    
    // Generic action
    notifyAction,
    
    // Action types for reference
    ACTION_TYPES,
  };
};

/**
 * Hook for subscribing to action detection events
 * @param {Object} options - Configuration options
 * @param {Function} options.onActionDetected - Callback when action is detected
 * @param {Function} options.onHintTimeout - Callback when hint timeout occurs
 * @returns {Object} Subscription management methods
 */
export const useActionDetectionSubscription = (options = {}) => {
  const { onActionDetected, onHintTimeout } = options;
  const unsubscribeActionRef = useRef(null);
  const unsubscribeHintRef = useRef(null);

  useEffect(() => {
    // Subscribe to action detection
    if (onActionDetected) {
      unsubscribeActionRef.current = actionDetectorService.onActionDetected(onActionDetected);
    }

    // Subscribe to hint timeout
    if (onHintTimeout) {
      unsubscribeHintRef.current = actionDetectorService.onHintTimeout(onHintTimeout);
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeActionRef.current) {
        unsubscribeActionRef.current();
      }
      if (unsubscribeHintRef.current) {
        unsubscribeHintRef.current();
      }
    };
  }, [onActionDetected, onHintTimeout]);

  /**
   * Activate the action detector
   */
  const activate = useCallback(() => {
    actionDetectorService.activate();
  }, []);

  /**
   * Deactivate the action detector
   */
  const deactivate = useCallback(() => {
    actionDetectorService.deactivate();
  }, []);

  /**
   * Register an action for detection
   * @param {string} stepId - Tour step ID
   * @param {Object} config - Action configuration
   * @param {number} [hintTimeout] - Hint timeout in ms
   */
  const registerAction = useCallback((stepId, config, hintTimeout) => {
    actionDetectorService.registerAction(stepId, config, hintTimeout);
  }, []);

  /**
   * Unregister an action
   * @param {string} stepId - Tour step ID
   */
  const unregisterAction = useCallback((stepId) => {
    actionDetectorService.unregisterAction(stepId);
  }, []);

  /**
   * Clear all registered actions
   */
  const clearAllActions = useCallback(() => {
    actionDetectorService.clearAllActions();
  }, []);

  /**
   * Reset hint timeout for a step
   * @param {string} stepId - Tour step ID
   * @param {number} [timeout] - New timeout duration
   */
  const resetHintTimeout = useCallback((stepId, timeout) => {
    actionDetectorService.resetHintTimeout(stepId, timeout);
  }, []);

  return {
    activate,
    deactivate,
    registerAction,
    unregisterAction,
    clearAllActions,
    resetHintTimeout,
  };
};

export default useActionDetection;
