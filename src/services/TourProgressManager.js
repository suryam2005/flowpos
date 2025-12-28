import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * TourProgressManager - Manages tour progress persistence and tracking
 * 
 * Handles:
 * - Saving/loading tour progress to AsyncStorage
 * - Tracking completion status for each screen tour
 * - Resume functionality for interrupted tours
 * - Skip handling (single screen vs all screens)
 * - Cross-screen tour flow management with unified flow position
 * 
 * Screen Tours (in unified flow order):
 * 0. POS: Interactive sales flow
 * 1. Cart: Order completion
 * 2. InvoicePreview: Invoice display
 * 3. Analytics: Business metrics (informational)
 * 4. Orders: Order history (informational)
 * 5. ManageProducts: Product management
 * 6. ManageInventory: Inventory tracking
 * 
 * Requirements: 8.1, 8.2, 8.3 - Cross-Screen Tour Flow
 */

// Storage keys
const STORAGE_KEYS = {
  TOUR_PROGRESS: 'tourProgress',
  COMPLETED_SCREENS: 'completedTourScreens',
  HAS_SEEN_TOUR: 'hasSeenAppTour',
  CONTINUE_TOUR_TO: 'continueTourTo',
  TOUR_FLOW_POSITION: 'tourFlowPosition',
};

// Screen names for tour tracking - matches TOUR_FLOW_ORDER in tourContent.js
// This is the unified tour flow order: POS → Cart → InvoicePreview → Analytics → Orders → ManageProducts → ManageInventory
const TOUR_SCREENS = [
  'POS',           // Position 0
  'Cart',          // Position 1
  'InvoicePreview', // Position 2
  'Analytics',     // Position 3
  'Orders',        // Position 4
  'ManageProducts', // Position 5
  'ManageInventory', // Position 6
];

// Map screen names to their flow positions (0-6)
const SCREEN_FLOW_POSITIONS = TOUR_SCREENS.reduce((acc, screen, index) => {
  acc[screen] = index;
  return acc;
}, {});

/**
 * Tour progress state structure
 * @typedef {Object} TourProgress
 * @property {string|null} currentScreen - Current screen being toured
 * @property {number} currentStepIndex - Current step index within the screen tour
 * @property {Object.<string, boolean>} completedScreens - Completion status per screen
 * @property {boolean} skippedAll - Whether user skipped all tours
 * @property {number} tourFlowPosition - Current position in unified tour flow (0-6)
 * @property {number} lastUpdated - Timestamp of last update
 */

class TourProgressManager {
  constructor() {
    this.isInitialized = false;
    this.progress = this._getDefaultProgress();
  }

  /**
   * Get default progress state
   * @returns {TourProgress}
   */
  _getDefaultProgress() {
    const completedScreens = {};
    TOUR_SCREENS.forEach(screen => {
      completedScreens[screen] = false;
    });

    return {
      currentScreen: null,
      currentStepIndex: 0,
      completedScreens,
      skippedAll: false,
      tourFlowPosition: 0, // Start at POS (position 0)
      lastUpdated: Date.now(),
    };
  }

  /**
   * Initialize the manager by loading saved progress
   */
  async initialize() {
    try {
      const savedProgress = await this.loadProgress();
      if (savedProgress) {
        this.progress = savedProgress;
      }
      this.isInitialized = true;
      console.log('🎯 [TourProgressManager] Initialized with progress:', this.progress);
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error initializing:', error);
      this.progress = this._getDefaultProgress();
      this.isInitialized = true;
    }
  }

  /**
   * Save current progress to AsyncStorage
   * @param {TourProgress} progress - Progress state to save
   */
  async saveProgress(progress = this.progress) {
    try {
      progress.lastUpdated = Date.now();
      await AsyncStorage.setItem(
        STORAGE_KEYS.TOUR_PROGRESS,
        JSON.stringify(progress)
      );
      this.progress = progress;
      console.log('🎯 [TourProgressManager] Progress saved:', progress);
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error saving progress:', error);
      throw error;
    }
  }

  /**
   * Load progress from AsyncStorage
   * @returns {Promise<TourProgress|null>}
   */
  async loadProgress() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TOUR_PROGRESS);
      if (stored) {
        const progress = JSON.parse(stored);
        console.log('🎯 [TourProgressManager] Progress loaded:', progress);
        return progress;
      }
      return null;
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error loading progress:', error);
      return null;
    }
  }

  /**
   * Mark a specific screen tour as complete
   * @param {string} screenName - Name of the screen tour to mark complete
   */
  async markScreenComplete(screenName) {
    try {
      if (!TOUR_SCREENS.includes(screenName)) {
        console.warn(`🎯 [TourProgressManager] Unknown screen: ${screenName}`);
        return;
      }

      this.progress.completedScreens[screenName] = true;
      
      // Clear current screen if it was the one completed
      if (this.progress.currentScreen === screenName) {
        this.progress.currentScreen = null;
        this.progress.currentStepIndex = 0;
      }

      await this.saveProgress();
      console.log(`🎯 [TourProgressManager] Screen ${screenName} marked complete`);
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error marking screen complete:', error);
      throw error;
    }
  }

  /**
   * Mark all screen tours as complete
   */
  async markAllComplete() {
    try {
      TOUR_SCREENS.forEach(screen => {
        this.progress.completedScreens[screen] = true;
      });
      
      this.progress.skippedAll = true;
      this.progress.currentScreen = null;
      this.progress.currentStepIndex = 0;

      await this.saveProgress();
      
      // Also set the legacy flag for backward compatibility
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_TOUR, 'true');
      
      // Clear any pending tour continuation
      await AsyncStorage.removeItem(STORAGE_KEYS.CONTINUE_TOUR_TO);
      
      console.log('🎯 [TourProgressManager] All screens marked complete');
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error marking all complete:', error);
      throw error;
    }
  }

  /**
   * Reset all tour progress (for restart functionality)
   */
  async resetAllProgress() {
    try {
      this.progress = this._getDefaultProgress();
      
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOUR_PROGRESS,
        STORAGE_KEYS.HAS_SEEN_TOUR,
        STORAGE_KEYS.CONTINUE_TOUR_TO,
        STORAGE_KEYS.COMPLETED_SCREENS,
      ]);

      console.log('🎯 [TourProgressManager] All progress reset');
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error resetting progress:', error);
      throw error;
    }
  }

  /**
   * Check if a specific screen tour is complete
   * @param {string} screenName - Name of the screen to check
   * @returns {boolean}
   */
  isScreenComplete(screenName) {
    return this.progress.completedScreens[screenName] === true;
  }

  /**
   * Check if all tours are complete
   * @returns {boolean}
   */
  areAllToursComplete() {
    return TOUR_SCREENS.every(screen => 
      this.progress.completedScreens[screen] === true
    );
  }

  /**
   * Update current position in tour (for resume)
   * @param {string} screenName - Current screen name
   * @param {number} stepIndex - Current step index
   */
  async updateCurrentPosition(screenName, stepIndex) {
    try {
      this.progress.currentScreen = screenName;
      this.progress.currentStepIndex = stepIndex;
      await this.saveProgress();
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error updating position:', error);
    }
  }

  /**
   * Get the next incomplete screen tour
   * @returns {string|null}
   */
  getNextIncompleteScreen() {
    for (const screen of TOUR_SCREENS) {
      if (!this.progress.completedScreens[screen]) {
        return screen;
      }
    }
    return null;
  }

  /**
   * Check if there's an incomplete tour to resume
   * @returns {Object|null} Resume info with screen and step
   */
  getResumeInfo() {
    if (this.progress.currentScreen && 
        !this.progress.completedScreens[this.progress.currentScreen]) {
      return {
        screen: this.progress.currentScreen,
        stepIndex: this.progress.currentStepIndex,
      };
    }
    return null;
  }

  /**
   * Set continuation target for cross-screen tour flow
   * @param {string} screenName - Screen to continue tour on
   */
  async setContinueTourTo(screenName) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONTINUE_TOUR_TO, screenName);
      console.log(`🎯 [TourProgressManager] Set continue tour to: ${screenName}`);
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error setting continue tour:', error);
    }
  }

  /**
   * Get and clear continuation target
   * @returns {Promise<string|null>}
   */
  async getContinueTourTo() {
    try {
      const target = await AsyncStorage.getItem(STORAGE_KEYS.CONTINUE_TOUR_TO);
      if (target) {
        await AsyncStorage.removeItem(STORAGE_KEYS.CONTINUE_TOUR_TO);
      }
      return target;
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error getting continue tour:', error);
      return null;
    }
  }

  /**
   * Get current progress state
   * @returns {TourProgress}
   */
  getProgress() {
    return { ...this.progress };
  }

  /**
   * Get list of all tour screen names
   * @returns {string[]}
   */
  static getTourScreens() {
    return [...TOUR_SCREENS];
  }

  // ============================================
  // UNIFIED FLOW METHODS (Requirements 8.1, 8.2, 8.3)
  // ============================================

  /**
   * Get the current tour flow position (0-6)
   * Requirements: 8.1 - Maintain tour state across screen navigations
   * @returns {number} Current flow position
   */
  getTourFlowPosition() {
    return this.progress.tourFlowPosition || 0;
  }

  /**
   * Set the tour flow position
   * Requirements: 8.1 - Maintain tour state across screen navigations
   * @param {number} position - Flow position (0-6)
   */
  async setTourFlowPosition(position) {
    try {
      if (position < 0 || position > TOUR_SCREENS.length - 1) {
        console.warn(`🎯 [TourProgressManager] Invalid flow position: ${position}`);
        return;
      }
      
      this.progress.tourFlowPosition = position;
      await this.saveProgress();
      console.log(`🎯 [TourProgressManager] Flow position set to: ${position} (${TOUR_SCREENS[position]})`);
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error setting flow position:', error);
    }
  }

  /**
   * Get the next screen in the unified tour flow
   * Requirements: 8.2 - Automatically continue tour on new screen
   * Requirements: 8.3 - Follow exact screen order
   * @param {string} currentScreen - Current screen name (optional, uses flow position if not provided)
   * @returns {string|null} Next screen name or null if at end
   */
  getNextScreen(currentScreen = null) {
    let currentPosition;
    
    if (currentScreen) {
      currentPosition = SCREEN_FLOW_POSITIONS[currentScreen];
      if (currentPosition === undefined) {
        console.warn(`🎯 [TourProgressManager] Unknown screen: ${currentScreen}`);
        return null;
      }
    } else {
      currentPosition = this.progress.tourFlowPosition;
    }
    
    const nextPosition = currentPosition + 1;
    
    if (nextPosition >= TOUR_SCREENS.length) {
      console.log('🎯 [TourProgressManager] At end of tour flow');
      return null;
    }
    
    const nextScreen = TOUR_SCREENS[nextPosition];
    console.log(`🎯 [TourProgressManager] Next screen: ${nextScreen} (position ${nextPosition})`);
    return nextScreen;
  }

  /**
   * Continue to the next screen in the unified tour flow
   * Requirements: 8.2 - Automatically continue tour on new screen
   * Requirements: 8.3 - Follow exact screen order
   * @param {string} currentScreen - Current screen that was just completed
   * @returns {Promise<{nextScreen: string|null, position: number}>} Next screen info
   */
  async continueToNextScreen(currentScreen) {
    try {
      // Mark current screen as complete
      if (currentScreen && TOUR_SCREENS.includes(currentScreen)) {
        this.progress.completedScreens[currentScreen] = true;
      }
      
      // Get next screen
      const nextScreen = this.getNextScreen(currentScreen);
      
      if (nextScreen) {
        // Update flow position
        const nextPosition = SCREEN_FLOW_POSITIONS[nextScreen];
        this.progress.tourFlowPosition = nextPosition;
        
        // Set continuation target
        await AsyncStorage.setItem(STORAGE_KEYS.CONTINUE_TOUR_TO, nextScreen);
        
        await this.saveProgress();
        
        console.log(`🎯 [TourProgressManager] Continuing to: ${nextScreen} (position ${nextPosition})`);
        
        return {
          nextScreen,
          position: nextPosition,
        };
      } else {
        // Tour complete
        this.progress.tourFlowPosition = TOUR_SCREENS.length - 1;
        await this.saveProgress();
        
        console.log('🎯 [TourProgressManager] Tour flow complete!');
        
        return {
          nextScreen: null,
          position: TOUR_SCREENS.length - 1,
        };
      }
    } catch (error) {
      console.error('🎯 [TourProgressManager] Error continuing to next screen:', error);
      return {
        nextScreen: null,
        position: this.progress.tourFlowPosition,
      };
    }
  }

  /**
   * Get the flow position for a specific screen
   * @param {string} screenName - Screen name
   * @returns {number} Flow position (0-6) or -1 if not found
   */
  getScreenFlowPosition(screenName) {
    const position = SCREEN_FLOW_POSITIONS[screenName];
    return position !== undefined ? position : -1;
  }

  /**
   * Check if a screen is the last in the tour flow
   * @param {string} screenName - Screen name
   * @returns {boolean}
   */
  isLastScreen(screenName) {
    return SCREEN_FLOW_POSITIONS[screenName] === TOUR_SCREENS.length - 1;
  }

  /**
   * Check if the tour is currently in progress (not complete, not skipped)
   * @returns {boolean}
   */
  isTourInProgress() {
    if (this.progress.skippedAll) {
      return false;
    }
    
    // Check if any screen is incomplete
    return TOUR_SCREENS.some(screen => !this.progress.completedScreens[screen]);
  }

  /**
   * Get navigation route info for a screen
   * Used for cross-screen navigation during tour
   * @param {string} screenName - Target screen name
   * @returns {Object} Navigation route configuration
   */
  getNavigationRoute(screenName) {
    const routeMap = {
      'POS': { screen: 'Main', params: { screen: 'POS', params: { continueTour: true } } },
      'Cart': { screen: 'Cart', params: { continueTour: true } },
      'InvoicePreview': { screen: 'SimpleInvoicePreview', params: { continueTour: true } },
      'Analytics': { screen: 'Main', params: { screen: 'Stats', params: { continueTour: true } } },
      'Orders': { screen: 'Main', params: { screen: 'Orders', params: { continueTour: true } } },
      'ManageProducts': { screen: 'Main', params: { screen: 'Manage', params: { continueTour: true, initialTab: 'Products' } } },
      'ManageInventory': { screen: 'Main', params: { screen: 'Manage', params: { continueTour: true, initialTab: 'Inventory' } } },
    };
    
    return routeMap[screenName] || null;
  }

  /**
   * Get navigation hint text for guiding to next screen
   * Requirements: 8.4 - Show navigation hints
   * @param {string} nextScreen - Next screen name
   * @returns {string} Navigation hint text
   */
  getNavigationHint(nextScreen) {
    const hintMap = {
      'POS': 'Tap POS in the bottom bar',
      'Cart': 'Tap Complete Order to proceed',
      'InvoicePreview': 'View the invoice preview',
      'Analytics': 'Tap Stats in the bottom bar',
      'Orders': 'Tap Orders in the bottom bar',
      'ManageProducts': 'Tap Manage in the bottom bar',
      'ManageInventory': 'Tap the Inventory tab',
    };
    
    return hintMap[nextScreen] || `Navigate to ${nextScreen}`;
  }
}

// Create singleton instance
const tourProgressManager = new TourProgressManager();

export default tourProgressManager;
export { TOUR_SCREENS, STORAGE_KEYS, SCREEN_FLOW_POSITIONS };
