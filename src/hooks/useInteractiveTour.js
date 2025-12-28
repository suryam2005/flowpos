import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tourProgressManager from '../services/TourProgressManager';
import actionDetectorService from '../services/ActionDetectorService';
import { getTourFlow, getTourSteps, isInteractiveTour } from '../config/tourContent';
import productsService from '../services/ProductsService';
import NetworkService from '../services/NetworkService';

/**
 * useInteractiveTour - Enhanced hook for managing interactive tour state
 * 
 * Features:
 * - Tour state management and step progression
 * - Integration with TourProgressManager for persistence
 * - Integration with ActionDetectorService for action detection
 * - Auto-advance on action completion (300ms delay)
 * - Hint display after 30s timeout
 * - Skip functionality (screen, all, step)
 * - Action target registration
 * - Sample products check before tour starts
 * 
 * Requirements: 2.2, 2.3
 * 
 * @param {string} screenName - Name of the screen for tour content
 * @returns {Object} Tour state and control functions
 */

// Timing constants
const AUTO_ADVANCE_DELAY = 300; // 300ms delay after action completion
const HINT_TIMEOUT = 30000; // 30 seconds for hint display

const useInteractiveTour = (screenName) => {
  // Tour state
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showSkipStep, setShowSkipStep] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs for cleanup and timers
  const actionUnsubscribeRef = useRef(null);
  const hintUnsubscribeRef = useRef(null);
  const autoAdvanceTimerRef = useRef(null);
  const overlayRef = useRef(null);
  const actionTargetsRef = useRef(new Map());
  const handleActionCompleteRef = useRef(null);
  const nextStepRef = useRef(null);
  const completeTourRef = useRef(null);
  
  // Get tour flow and steps for this screen
  const tourFlow = getTourFlow(screenName);
  const tourSteps = getTourSteps(screenName);

  /**
   * Initialize the tour manager and check for resume
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        // Ensure TourProgressManager is initialized
        if (!tourProgressManager.isInitialized) {
          await tourProgressManager.initialize();
        }
        
        setIsInitialized(true);
        console.log(`🎯 [useInteractiveTour:${screenName}] Initialized`);
      } catch (error) {
        console.error(`🎯 [useInteractiveTour:${screenName}] Init error:`, error);
        setIsInitialized(true); // Continue anyway
      }
    };
    
    initialize();
  }, [screenName]);

  /**
   * Set up action detection when tour is active
   */
  useEffect(() => {
    if (!showTour || !currentStep) {
      return;
    }

    // Activate action detector
    actionDetectorService.activate();

    // Subscribe to action detection - use ref to always get latest handler
    actionUnsubscribeRef.current = actionDetectorService.onActionDetected((stepId) => {
      console.log(`🎯 [useInteractiveTour:${screenName}] Action callback received - stepId: ${stepId}, currentStep.id: ${currentStep.id}`);
      if (stepId === currentStep.id) {
        console.log(`🎯 [useInteractiveTour:${screenName}] Action detected for step: ${stepId}, calling handleActionComplete`);
        // Use ref to call the latest handleActionComplete
        if (handleActionCompleteRef.current) {
          handleActionCompleteRef.current();
        } else {
          console.log(`🎯 [useInteractiveTour:${screenName}] handleActionCompleteRef.current is null!`);
        }
      } else {
        console.log(`🎯 [useInteractiveTour:${screenName}] Action stepId mismatch - ignoring`);
      }
    });

    // Subscribe to hint timeout
    hintUnsubscribeRef.current = actionDetectorService.onHintTimeout((stepId) => {
      if (stepId === currentStep.id) {
        console.log(`🎯 [useInteractiveTour:${screenName}] Hint timeout for step: ${stepId}`);
        setShowHint(true);
      }
    });

    // Register action for current step if interactive
    if (currentStep.interactive && currentStep.actionType && currentStep.actionTarget) {
      console.log(`🎯 [useInteractiveTour:${screenName}] Registering action for step ${currentStep.id}: type=${currentStep.actionType}, target=${currentStep.actionTarget}`);
      actionDetectorService.registerAction(
        currentStep.id,
        {
          type: currentStep.actionType,
          target: currentStep.actionTarget,
        },
        HINT_TIMEOUT
      );
    } else {
      console.log(`🎯 [useInteractiveTour:${screenName}] Not registering action for step ${currentStep.id}: interactive=${currentStep.interactive}, actionType=${currentStep.actionType}, actionTarget=${currentStep.actionTarget}`);
    }

    // Cleanup
    return () => {
      if (actionUnsubscribeRef.current) {
        actionUnsubscribeRef.current();
        actionUnsubscribeRef.current = null;
      }
      if (hintUnsubscribeRef.current) {
        hintUnsubscribeRef.current();
        hintUnsubscribeRef.current = null;
      }
      if (currentStep) {
        actionDetectorService.unregisterAction(currentStep.id);
      }
    };
  }, [showTour, currentStep, screenName]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear any pending timers
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      
      // Deactivate action detector
      actionDetectorService.deactivate();
      actionDetectorService.clearAllActions();
      
      // Clear action targets
      actionTargetsRef.current.clear();
      
      // If tour was active when unmounting, save position for resume (Requirements 8.5)
      if (showTour && currentStep) {
        console.log(`🎯 [useInteractiveTour:${screenName}] Tour interrupted - saving position for resume`);
        // Note: This is async but we can't await in cleanup
        tourProgressManager.updateCurrentPosition(screenName, stepIndex);
      }
    };
  }, [showTour, currentStep, screenName, stepIndex]);

  /**
   * Handle action completion - triggers auto-advance
   */
  const handleActionComplete = useCallback(() => {
    console.log(`🎯 [useInteractiveTour:${screenName}] Action complete, auto-advancing in ${AUTO_ADVANCE_DELAY}ms`);
    
    // Clear hint state
    setShowHint(false);
    setShowSkipStep(false);
    
    // Trigger success animation on overlay if ref is available
    if (overlayRef.current?.triggerSuccessAnimation) {
      overlayRef.current.triggerSuccessAnimation();
    }
    
    // Auto-advance after delay - use ref to get latest nextStep
    autoAdvanceTimerRef.current = setTimeout(() => {
      if (nextStepRef.current) {
        nextStepRef.current();
      }
    }, AUTO_ADVANCE_DELAY);
  }, [screenName]);

  // Keep ref updated with latest handleActionComplete
  useEffect(() => {
    handleActionCompleteRef.current = handleActionComplete;
  }, [handleActionComplete]);

  /**
   * Check if store has at least one product, if not add sample products
   * @returns {Promise<boolean>} True if products exist or were added successfully
   */
  const ensureProductsExist = useCallback(async () => {
    try {
      console.log(`🎯 [useInteractiveTour:${screenName}] Checking if products exist...`);
      
      // Get products from ProductsService
      const products = await productsService.getProducts();
      
      if (products && products.length > 0) {
        console.log(`🎯 [useInteractiveTour:${screenName}] Products exist: ${products.length}`);
        return true;
      }
      
      console.log(`🎯 [useInteractiveTour:${screenName}] No products found, adding sample products...`);
      
      // Get business type from AsyncStorage
      let businessType = 'Restaurant';
      try {
        const storeData = await AsyncStorage.getItem('storeData');
        if (storeData) {
          const parsed = JSON.parse(storeData);
          businessType = parsed.business_type || 'Restaurant';
        }
      } catch (e) {
        console.log('Could not get business type, using default');
      }
      
      // Call backend API to add sample products
      try {
        const response = await NetworkService.apiCall('/store/sample-products', {
          method: 'POST',
          body: JSON.stringify({
            business_type: businessType
          }),
        });
        
        const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
        
        if (parsedResponse && parsedResponse.success) {
          console.log(`🎯 [useInteractiveTour:${screenName}] Sample products added: ${parsedResponse.created}`);
          return true;
        }
      } catch (apiError) {
        console.error(`🎯 [useInteractiveTour:${screenName}] API error adding sample products:`, apiError);
      }
      
      // If API fails, try to add local sample products
      try {
        const sampleProducts = [
          { name: 'Sample Burger', price: 199, stock_quantity: 50, track_stock: true, category: 'Food', tags: ['food', 'burger'] },
          { name: 'Sample Pizza', price: 299, stock_quantity: 30, track_stock: true, category: 'Food', tags: ['food', 'pizza'] },
          { name: 'Sample Coffee', price: 89, stock_quantity: 100, track_stock: true, category: 'Beverages', tags: ['beverage', 'coffee'] },
        ];
        
        for (const product of sampleProducts) {
          await productsService.createProduct(product);
        }
        
        console.log(`🎯 [useInteractiveTour:${screenName}] Local sample products added`);
        return true;
      } catch (localError) {
        console.error(`🎯 [useInteractiveTour:${screenName}] Error adding local sample products:`, localError);
        return false;
      }
    } catch (error) {
      console.error(`🎯 [useInteractiveTour:${screenName}] Error checking products:`, error);
      return false;
    }
  }, [screenName]);

  /**
   * Start the tour
   */
  const startTour = useCallback(async () => {
    if (!tourSteps || tourSteps.length === 0) {
      console.warn(`🎯 [useInteractiveTour:${screenName}] No tour steps found`);
      return;
    }

    // Check if tour is already complete
    if (tourProgressManager.isScreenComplete(screenName)) {
      console.log(`🎯 [useInteractiveTour:${screenName}] Tour already complete`);
      return;
    }

    // Ensure at least one product exists before starting tour
    // This is important for POS, Manage, and Inventory screens
    if (['POS', 'ManageProducts', 'ManageInventory'].includes(screenName)) {
      const hasProducts = await ensureProductsExist();
      if (!hasProducts) {
        console.warn(`🎯 [useInteractiveTour:${screenName}] Could not ensure products exist, tour may not work properly`);
      }
    }

    // Check for resume info
    const resumeInfo = tourProgressManager.getResumeInfo();
    let startIndex = 0;
    
    if (resumeInfo && resumeInfo.screen === screenName) {
      startIndex = resumeInfo.stepIndex;
      console.log(`🎯 [useInteractiveTour:${screenName}] Resuming from step ${startIndex}`);
    }

    // Set up tour state
    setTotalSteps(tourSteps.length);
    setStepIndex(startIndex);
    setCurrentStep(tourSteps[startIndex]);
    setShowHint(false);
    setShowSkipStep(false);
    setShowTour(true);

    // Update progress manager
    await tourProgressManager.updateCurrentPosition(screenName, startIndex);

    console.log(`🎯 [useInteractiveTour:${screenName}] Tour started at step ${startIndex}`);
  }, [screenName, tourSteps, ensureProductsExist]);

  /**
   * Advance to the next step
   */
  const nextStep = useCallback(async () => {
    console.log(`🎯 [useInteractiveTour:${screenName}] nextStep called, current stepIndex: ${stepIndex}, tourSteps.length: ${tourSteps.length}`);
    const nextIndex = stepIndex + 1;
    
    // Clear current action registration
    if (currentStep) {
      actionDetectorService.unregisterAction(currentStep.id);
    }
    
    // Reset hint and skip step states
    setShowHint(false);
    setShowSkipStep(false);

    if (nextIndex >= tourSteps.length) {
      // Tour complete - use ref to get latest completeTour
      console.log(`🎯 [useInteractiveTour:${screenName}] Tour complete, calling completeTourRef`);
      if (completeTourRef.current) {
        await completeTourRef.current();
      }
      return;
    }

    // Move to next step
    const nextStepData = tourSteps[nextIndex];
    setStepIndex(nextIndex);
    setCurrentStep(nextStepData);

    // Update progress
    await tourProgressManager.updateCurrentPosition(screenName, nextIndex);

    console.log(`🎯 [useInteractiveTour:${screenName}] Advanced to step ${nextIndex}: ${nextStepData.id}`);

    // Check if next step has auto-navigation
    if (nextStepData.nextScreen && nextStepData.autoNav) {
      // Set continuation target for cross-screen flow
      await tourProgressManager.setContinueTourTo(nextStepData.nextScreen);
    }
  }, [stepIndex, tourSteps, currentStep, screenName]);

  /**
   * Skip current screen's tour only
   */
  const skipScreen = useCallback(async () => {
    console.log(`🎯 [useInteractiveTour:${screenName}] Skipping screen tour`);
    
    // Mark this screen as complete
    await tourProgressManager.markScreenComplete(screenName);
    
    // Hide tour
    setShowTour(false);
    setCurrentStep(null);
    
    // Deactivate action detector
    actionDetectorService.deactivate();
    actionDetectorService.clearAllActions();
  }, [screenName]);

  /**
   * Skip all remaining tours
   */
  const skipAll = useCallback(async () => {
    console.log(`🎯 [useInteractiveTour:${screenName}] Skipping all tours`);
    
    // Mark all screens as complete
    await tourProgressManager.markAllComplete();
    
    // Hide tour
    setShowTour(false);
    setCurrentStep(null);
    
    // Deactivate action detector
    actionDetectorService.deactivate();
    actionDetectorService.clearAllActions();
  }, [screenName]);

  /**
   * Skip just the current step (advance without action)
   */
  const skipStep = useCallback(async () => {
    console.log(`🎯 [useInteractiveTour:${screenName}] Skipping step: ${currentStep?.id}`);
    
    // Just advance to next step
    await nextStep();
  }, [currentStep, nextStep, screenName]);

  /**
   * Complete the tour for this screen
   */
  const completeTour = useCallback(async () => {
    console.log(`🎯 [useInteractiveTour:${screenName}] Tour complete`);
    
    // Mark screen as complete
    await tourProgressManager.markScreenComplete(screenName);
    
    // Hide tour
    setShowTour(false);
    setCurrentStep(null);
    
    // Deactivate action detector
    actionDetectorService.deactivate();
    actionDetectorService.clearAllActions();

    // Check for continuation to next screen using unified flow
    if (currentStep?.continueToScreen) {
      await tourProgressManager.setContinueTourTo(currentStep.continueToScreen);
      console.log(`🎯 [useInteractiveTour:${screenName}] Set continuation to: ${currentStep.continueToScreen}`);
    } else if (currentStep?.nextScreen) {
      // Use nextScreen from step if continueToScreen not set
      await tourProgressManager.setContinueTourTo(currentStep.nextScreen);
      console.log(`🎯 [useInteractiveTour:${screenName}] Set continuation to nextScreen: ${currentStep.nextScreen}`);
    } else {
      // Use unified flow to determine next screen (Requirements 8.2, 8.3)
      const { nextScreen } = await tourProgressManager.continueToNextScreen(screenName);
      if (nextScreen) {
        console.log(`🎯 [useInteractiveTour:${screenName}] Unified flow continuation to: ${nextScreen}`);
      } else {
        console.log(`🎯 [useInteractiveTour:${screenName}] Tour flow complete - no more screens`);
      }
    }
  }, [screenName, currentStep]);

  // Keep refs updated with latest functions to avoid stale closures
  useEffect(() => {
    completeTourRef.current = completeTour;
  }, [completeTour]);

  useEffect(() => {
    nextStepRef.current = nextStep;
  }, [nextStep]);

  /**
   * Register an action target for detection
   * @param {string} targetId - Target identifier
   * @param {React.RefObject} ref - Reference to the target component
   */
  const registerActionTarget = useCallback((targetId, ref) => {
    actionTargetsRef.current.set(targetId, ref);
    console.log(`🎯 [useInteractiveTour:${screenName}] Registered action target: ${targetId}`);
  }, [screenName]);

  /**
   * Unregister an action target
   * @param {string} targetId - Target identifier
   */
  const unregisterActionTarget = useCallback((targetId) => {
    actionTargetsRef.current.delete(targetId);
    console.log(`🎯 [useInteractiveTour:${screenName}] Unregistered action target: ${targetId}`);
  }, [screenName]);

  /**
   * Notify that an action was performed
   * Called by screen components when user performs an action
   * @param {string} actionType - Type of action (tap, long-press, etc.)
   * @param {string} targetId - Target identifier
   * @param {any} eventData - Optional event data
   */
  const notifyAction = useCallback((actionType, targetId, eventData = null) => {
    console.log(`🎯 [useInteractiveTour:${screenName}] notifyAction called - showTour: ${showTour}, currentStep: ${currentStep?.id}, interactive: ${currentStep?.interactive}`);
    
    if (!showTour || !currentStep?.interactive) {
      console.log(`🎯 [useInteractiveTour:${screenName}] notifyAction skipped - tour not active or step not interactive`);
      return;
    }
    
    console.log(`🎯 [useInteractiveTour:${screenName}] Action notified: ${actionType} on ${targetId}`);
    actionDetectorService.notifyAction(actionType, targetId, eventData);
  }, [showTour, currentStep, screenName]);

  /**
   * Set the overlay ref for triggering animations
   * @param {React.RefObject} ref - Reference to InteractiveTourOverlay
   */
  const setOverlayRef = useCallback((ref) => {
    overlayRef.current = ref;
  }, []);

  /**
   * Check if tour should auto-start
   * Returns true if tour was started, false otherwise
   */
  const checkAutoStart = useCallback(async () => {
    if (!isInitialized) {
      console.log(`🎯 [useInteractiveTour:${screenName}] Not initialized yet, skipping auto-start check`);
      return false;
    }

    // Check if all tours are skipped
    if (tourProgressManager.areAllToursComplete()) {
      console.log(`🎯 [useInteractiveTour:${screenName}] All tours complete, not auto-starting`);
      return false;
    }

    // Check if this screen's tour is already complete
    if (tourProgressManager.isScreenComplete(screenName)) {
      console.log(`🎯 [useInteractiveTour:${screenName}] Tour already complete, not auto-starting`);
      return false;
    }

    // Check if we're continuing from another screen
    const continueTo = await tourProgressManager.getContinueTourTo();
    if (continueTo === screenName) {
      console.log(`🎯 [useInteractiveTour:${screenName}] Continuing tour from previous screen`);
      setTimeout(() => startTour(), 1000);
      return true;
    }

    // Check if there's a resume point for this screen
    const resumeInfo = tourProgressManager.getResumeInfo();
    if (resumeInfo && resumeInfo.screen === screenName) {
      console.log(`🎯 [useInteractiveTour:${screenName}] Resuming interrupted tour`);
      setTimeout(() => startTour(), 1000);
      return true;
    }

    console.log(`🎯 [useInteractiveTour:${screenName}] No auto-start conditions met`);
    return false;
  }, [isInitialized, screenName, startTour]);

  /**
   * Get demo values for current step (for pre-filling forms)
   */
  const getDemoValues = useCallback(() => {
    return currentStep?.demoValues || {};
  }, [currentStep]);

  /**
   * Get navigation hint for the next screen in the tour flow
   * Requirements: 8.4 - Show navigation hints
   */
  const getNextScreenNavigationHint = useCallback(() => {
    // First check if current step has a navigation hint
    if (currentStep?.navigationHintText) {
      return currentStep.navigationHintText;
    }
    
    // Otherwise, get hint from TourProgressManager based on unified flow
    const nextScreen = tourProgressManager.getNextScreen(screenName);
    if (nextScreen) {
      return tourProgressManager.getNavigationHint(nextScreen);
    }
    
    return null;
  }, [currentStep, screenName]);

  /**
   * Get the next screen in the tour flow
   */
  const getNextTourScreen = useCallback(() => {
    // First check if current step specifies next screen
    if (currentStep?.nextScreen) {
      return currentStep.nextScreen;
    }
    if (currentStep?.continueToScreen) {
      return currentStep.continueToScreen;
    }
    
    // Otherwise, use unified flow
    return tourProgressManager.getNextScreen(screenName);
  }, [currentStep, screenName]);

  /**
   * Check if tour is currently in progress (for detecting manual navigation)
   * Requirements: 8.5 - Handle manual navigation during tour
   */
  const isTourActive = useCallback(() => {
    return showTour && currentStep !== null;
  }, [showTour, currentStep]);

  /**
   * Handle manual navigation away from tour
   * Call this when user navigates away while tour is active
   * Requirements: 8.5 - Offer to resume from where they left off
   */
  const handleManualNavigation = useCallback(async () => {
    if (!showTour || !currentStep) {
      return null;
    }
    
    console.log(`🎯 [useInteractiveTour:${screenName}] Manual navigation detected during tour`);
    
    // Save current position for resume
    await tourProgressManager.updateCurrentPosition(screenName, stepIndex);
    
    // Return info for showing resume prompt
    return {
      screen: screenName,
      stepIndex: stepIndex,
      stepId: currentStep.id,
    };
  }, [showTour, currentStep, screenName, stepIndex]);
  /**
   * Check if current step is interactive
   */
  const isCurrentStepInteractive = useCallback(() => {
    return currentStep?.interactive === true;
  }, [currentStep]);

  /**
   * Get current action type expected
   */
  const getCurrentActionType = useCallback(() => {
    return currentStep?.actionType || null;
  }, [currentStep]);

  /**
   * Get current action target expected
   */
  const getCurrentActionTarget = useCallback(() => {
    return currentStep?.actionTarget || null;
  }, [currentStep]);

  return {
    // State
    showTour,
    currentStep,
    stepIndex,
    totalSteps,
    showHint,
    showSkipStep,
    isInitialized,
    
    // Tour control
    startTour,
    nextStep,
    skipScreen,
    skipAll,
    skipStep,
    completeTour,
    checkAutoStart,
    ensureProductsExist,
    
    // Action detection
    registerActionTarget,
    unregisterActionTarget,
    notifyAction,
    setOverlayRef,
    
    // Helpers
    getDemoValues,
    isCurrentStepInteractive,
    getCurrentActionType,
    getCurrentActionTarget,
    getNextScreenNavigationHint,
    getNextTourScreen,
    isTourActive,
    handleManualNavigation,
    
    // Tour info
    isInteractive: isInteractiveTour(screenName),
    tourFlow,
    tourSteps,
  };
};

export default useInteractiveTour;
export { AUTO_ADVANCE_DELAY, HINT_TIMEOUT };
