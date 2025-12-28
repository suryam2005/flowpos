import * as Haptics from 'expo-haptics';

/**
 * ActionDetectorService - Detects user actions during interactive tour steps
 * 
 * Handles:
 * - Action registration and detection for tour steps
 * - Timeout handling for hints (30s)
 * - Haptic feedback on action detection
 * - Support for multiple action types
 * 
 * Supported Action Types:
 * - tap: Single tap on element
 * - long-press: Long press on element
 * - text-input: Text entered in field
 * - navigation: Screen navigation
 * - tab-change: Tab switch
 * - modal-open: Modal opened
 * - modal-close: Modal closed
 */

// Action types supported by the tour system
const ACTION_TYPES = {
  TAP: 'tap',
  LONG_PRESS: 'long-press',
  SWIPE: 'swipe',
  TEXT_INPUT: 'text-input',
  NAVIGATION: 'navigation',
  TAB_CHANGE: 'tab-change',
  MODAL_OPEN: 'modal-open',
  MODAL_CLOSE: 'modal-close',
};

// Default timeout for hints (30 seconds)
const DEFAULT_HINT_TIMEOUT = 30000;

/**
 * @typedef {Object} ActionConfig
 * @property {string} type - Action type (tap, long-press, etc.)
 * @property {string} target - Target identifier
 * @property {Function} [validator] - Optional validator function
 */

/**
 * @typedef {Object} RegisteredAction
 * @property {string} stepId - Tour step ID
 * @property {ActionConfig} config - Action configuration
 * @property {number} registeredAt - Timestamp when registered
 * @property {NodeJS.Timeout|null} hintTimeout - Timeout for hint display
 */

class ActionDetectorService {
  constructor() {
    /** @type {Map<string, RegisteredAction>} */
    this.registeredActions = new Map();
    
    /** @type {Set<Function>} */
    this.actionCallbacks = new Set();
    
    /** @type {Set<Function>} */
    this.hintCallbacks = new Set();
    
    /** @type {boolean} */
    this.isActive = false;
    
    console.log('🎯 [ActionDetectorService] Initialized');
  }

  /**
   * Activate the action detector
   */
  activate() {
    this.isActive = true;
    console.log('🎯 [ActionDetectorService] Activated');
  }

  /**
   * Deactivate the action detector
   */
  deactivate() {
    this.isActive = false;
    this.clearAllTimeouts();
    console.log('🎯 [ActionDetectorService] Deactivated');
  }

  /**
   * Register an action for a tour step
   * @param {string} stepId - Tour step ID
   * @param {ActionConfig} config - Action configuration
   * @param {number} [hintTimeout=DEFAULT_HINT_TIMEOUT] - Timeout for hint display
   */
  registerAction(stepId, config, hintTimeout = DEFAULT_HINT_TIMEOUT) {
    // Clear any existing registration for this step
    this.unregisterAction(stepId);

    const registration = {
      stepId,
      config,
      registeredAt: Date.now(),
      hintTimeout: null,
    };

    // Set up hint timeout if specified
    if (hintTimeout > 0) {
      registration.hintTimeout = setTimeout(() => {
        this._triggerHint(stepId);
      }, hintTimeout);
    }

    this.registeredActions.set(stepId, registration);
    console.log(`🎯 [ActionDetectorService] Registered action for step: ${stepId}`, config);
  }

  /**
   * Unregister an action for a tour step
   * @param {string} stepId - Tour step ID
   */
  unregisterAction(stepId) {
    const registration = this.registeredActions.get(stepId);
    if (registration) {
      if (registration.hintTimeout) {
        clearTimeout(registration.hintTimeout);
      }
      this.registeredActions.delete(stepId);
      console.log(`🎯 [ActionDetectorService] Unregistered action for step: ${stepId}`);
    }
  }

  /**
   * Clear all registered actions and timeouts
   */
  clearAllActions() {
    this.clearAllTimeouts();
    this.registeredActions.clear();
    console.log('🎯 [ActionDetectorService] All actions cleared');
  }

  /**
   * Clear all hint timeouts
   */
  clearAllTimeouts() {
    this.registeredActions.forEach((registration) => {
      if (registration.hintTimeout) {
        clearTimeout(registration.hintTimeout);
        registration.hintTimeout = null;
      }
    });
  }

  /**
   * Subscribe to action detection events
   * @param {Function} callback - Callback function (stepId) => void
   * @returns {Function} Unsubscribe function
   */
  onActionDetected(callback) {
    this.actionCallbacks.add(callback);
    return () => {
      this.actionCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to hint timeout events
   * @param {Function} callback - Callback function (stepId) => void
   * @returns {Function} Unsubscribe function
   */
  onHintTimeout(callback) {
    this.hintCallbacks.add(callback);
    return () => {
      this.hintCallbacks.delete(callback);
    };
  }

  /**
   * Notify that an action was performed
   * @param {string} actionType - Type of action performed
   * @param {string} targetId - Target identifier
   * @param {any} [eventData] - Optional event data for validation
   */
  notifyAction(actionType, targetId, eventData = null) {
    if (!this.isActive) {
      console.log('🎯 [ActionDetectorService] Ignoring action - detector not active');
      return;
    }

    console.log(`🎯 [ActionDetectorService] Action notified: ${actionType} on ${targetId}`);
    console.log(`🎯 [ActionDetectorService] Registered actions:`, this.getRegisteredActions());
    console.log(`🎯 [ActionDetectorService] Number of action callbacks: ${this.actionCallbacks.size}`);

    // Find matching registered action
    for (const [stepId, registration] of this.registeredActions) {
      const { config } = registration;
      console.log(`🎯 [ActionDetectorService] Checking step ${stepId}: type=${config.type}, target=${config.target}`);
      
      if (config.type === actionType && config.target === targetId) {
        // Run validator if provided
        if (config.validator && !config.validator(eventData)) {
          console.log(`🎯 [ActionDetectorService] Action validation failed for step: ${stepId}`);
          continue;
        }

        // Action matched - trigger detection
        console.log(`🎯 [ActionDetectorService] Action MATCHED for step: ${stepId}`);
        this._triggerActionDetected(stepId);
        return;
      }
    }

    console.log(`🎯 [ActionDetectorService] No matching action found for: ${actionType} on ${targetId}`);
  }

  /**
   * Trigger action detected event
   * @param {string} stepId - Tour step ID
   * @private
   */
  _triggerActionDetected(stepId) {
    console.log(`🎯 [ActionDetectorService] _triggerActionDetected called for step: ${stepId}`);
    console.log(`🎯 [ActionDetectorService] Number of callbacks to notify: ${this.actionCallbacks.size}`);

    // Clear hint timeout
    const registration = this.registeredActions.get(stepId);
    if (registration?.hintTimeout) {
      clearTimeout(registration.hintTimeout);
      registration.hintTimeout = null;
    }

    // Trigger haptic feedback
    this._triggerHapticFeedback();

    // Notify all callbacks
    let callbackIndex = 0;
    this.actionCallbacks.forEach(callback => {
      try {
        console.log(`🎯 [ActionDetectorService] Calling callback ${callbackIndex++}`);
        callback(stepId);
      } catch (error) {
        console.error('🎯 [ActionDetectorService] Error in action callback:', error);
      }
    });
    console.log(`🎯 [ActionDetectorService] All callbacks notified`);
  }

  /**
   * Trigger hint timeout event
   * @param {string} stepId - Tour step ID
   * @private
   */
  _triggerHint(stepId) {
    console.log(`🎯 [ActionDetectorService] Hint timeout for step: ${stepId}`);

    // Notify all hint callbacks
    this.hintCallbacks.forEach(callback => {
      try {
        callback(stepId);
      } catch (error) {
        console.error('🎯 [ActionDetectorService] Error in hint callback:', error);
      }
    });
  }

  /**
   * Trigger haptic feedback for action detection
   * @private
   */
  _triggerHapticFeedback() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('🎯 [ActionDetectorService] Haptic feedback triggered');
    } catch (error) {
      console.warn('🎯 [ActionDetectorService] Haptic feedback failed:', error);
    }
  }

  // ============================================
  // Specific Action Detection Methods
  // ============================================

  /**
   * Detect cart item added
   * @param {Function} callback - Callback when item is added
   * @returns {Function} Cleanup function
   */
  detectCartItemAdded(callback) {
    const handler = (stepId) => {
      const registration = this.registeredActions.get(stepId);
      if (registration?.config.type === ACTION_TYPES.TAP && 
          registration?.config.target === 'product-card') {
        callback();
      }
    };
    return this.onActionDetected(handler);
  }

  /**
   * Detect quantity changed
   * @param {Function} callback - Callback when quantity changes
   * @returns {Function} Cleanup function
   */
  detectQuantityChanged(callback) {
    const handler = (stepId) => {
      const registration = this.registeredActions.get(stepId);
      if (registration?.config.type === ACTION_TYPES.TAP && 
          registration?.config.target === 'product-card') {
        callback();
      }
    };
    return this.onActionDetected(handler);
  }

  /**
   * Detect item removed from cart
   * @param {Function} callback - Callback when item is removed
   * @returns {Function} Cleanup function
   */
  detectItemRemoved(callback) {
    const handler = (stepId) => {
      const registration = this.registeredActions.get(stepId);
      if (registration?.config.type === ACTION_TYPES.LONG_PRESS && 
          registration?.config.target === 'product-card') {
        callback();
      }
    };
    return this.onActionDetected(handler);
  }

  /**
   * Detect modal opened
   * @param {string} [modalId] - Optional specific modal ID
   * @param {Function} callback - Callback when modal opens
   * @returns {Function} Cleanup function
   */
  detectModalOpened(modalId, callback) {
    // Handle both (callback) and (modalId, callback) signatures
    if (typeof modalId === 'function') {
      callback = modalId;
      modalId = null;
    }

    const handler = (stepId) => {
      const registration = this.registeredActions.get(stepId);
      if (registration?.config.type === ACTION_TYPES.MODAL_OPEN) {
        if (!modalId || registration?.config.target === modalId) {
          callback();
        }
      }
    };
    return this.onActionDetected(handler);
  }

  /**
   * Detect modal closed
   * @param {string} [modalId] - Optional specific modal ID
   * @param {Function} callback - Callback when modal closes
   * @returns {Function} Cleanup function
   */
  detectModalClosed(modalId, callback) {
    // Handle both (callback) and (modalId, callback) signatures
    if (typeof modalId === 'function') {
      callback = modalId;
      modalId = null;
    }

    const handler = (stepId) => {
      const registration = this.registeredActions.get(stepId);
      if (registration?.config.type === ACTION_TYPES.MODAL_CLOSE) {
        if (!modalId || registration?.config.target === modalId) {
          callback();
        }
      }
    };
    return this.onActionDetected(handler);
  }

  /**
   * Detect text entered in field
   * @param {string} fieldId - Field identifier
   * @param {Function} callback - Callback when text is entered
   * @returns {Function} Cleanup function
   */
  detectTextEntered(fieldId, callback) {
    const handler = (stepId) => {
      const registration = this.registeredActions.get(stepId);
      if (registration?.config.type === ACTION_TYPES.TEXT_INPUT && 
          registration?.config.target === fieldId) {
        callback();
      }
    };
    return this.onActionDetected(handler);
  }

  /**
   * Detect tab change
   * @param {string} [tabId] - Optional specific tab ID
   * @param {Function} callback - Callback when tab changes
   * @returns {Function} Cleanup function
   */
  detectTabChange(tabId, callback) {
    // Handle both (callback) and (tabId, callback) signatures
    if (typeof tabId === 'function') {
      callback = tabId;
      tabId = null;
    }

    const handler = (stepId) => {
      const registration = this.registeredActions.get(stepId);
      if (registration?.config.type === ACTION_TYPES.TAB_CHANGE) {
        if (!tabId || registration?.config.target === tabId) {
          callback();
        }
      }
    };
    return this.onActionDetected(handler);
  }

  /**
   * Detect navigation to screen
   * @param {string} screenName - Target screen name
   * @param {Function} callback - Callback when navigation occurs
   * @returns {Function} Cleanup function
   */
  detectNavigation(screenName, callback) {
    const handler = (stepId) => {
      const registration = this.registeredActions.get(stepId);
      if (registration?.config.type === ACTION_TYPES.NAVIGATION && 
          registration?.config.target === screenName) {
        callback();
      }
    };
    return this.onActionDetected(handler);
  }

  /**
   * Get current registered actions (for debugging)
   * @returns {Object} Map of registered actions
   */
  getRegisteredActions() {
    const actions = {};
    this.registeredActions.forEach((value, key) => {
      actions[key] = {
        config: value.config,
        registeredAt: value.registeredAt,
        hasHintTimeout: !!value.hintTimeout,
      };
    });
    return actions;
  }

  /**
   * Check if an action is registered for a step
   * @param {string} stepId - Tour step ID
   * @returns {boolean}
   */
  isActionRegistered(stepId) {
    return this.registeredActions.has(stepId);
  }

  /**
   * Reset hint timeout for a step
   * @param {string} stepId - Tour step ID
   * @param {number} [timeout=DEFAULT_HINT_TIMEOUT] - New timeout duration
   */
  resetHintTimeout(stepId, timeout = DEFAULT_HINT_TIMEOUT) {
    const registration = this.registeredActions.get(stepId);
    if (registration) {
      if (registration.hintTimeout) {
        clearTimeout(registration.hintTimeout);
      }
      registration.hintTimeout = setTimeout(() => {
        this._triggerHint(stepId);
      }, timeout);
      console.log(`🎯 [ActionDetectorService] Reset hint timeout for step: ${stepId}`);
    }
  }
}

// Create singleton instance
const actionDetectorService = new ActionDetectorService();

export default actionDetectorService;
export { ACTION_TYPES, DEFAULT_HINT_TIMEOUT };
