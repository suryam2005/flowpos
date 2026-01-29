import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * useSimpleTour - Simple hook for managing basic tour state
 * 
 * Features:
 * - Simple step progression
 * - Skip functionality
 * - Persistent completion tracking
 * - No action detection or complex interactions
 */

const STORAGE_KEY = '@flowpos_simple_tour_completed';

const useSimpleTour = (screenName, tourSteps) => {
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize tour on mount
  useEffect(() => {
    const initializeTour = async () => {
      try {
        // Check if tour was already completed
        const completedScreens = await AsyncStorage.getItem(STORAGE_KEY);
        const completed = completedScreens ? JSON.parse(completedScreens) : {};
        
        if (!completed[screenName]) {
          // Tour not completed for this screen - show it
          if (tourSteps && tourSteps.length > 0) {
            setCurrentStep(tourSteps[0]);
            setStepIndex(0);
            setShowTour(true);
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error(`[useSimpleTour:${screenName}] Init error:`, error);
        setIsInitialized(true);
      }
    };

    initializeTour();
  }, [screenName, tourSteps]);

  // Go to next step
  const nextStep = useCallback(() => {
    if (!tourSteps || stepIndex >= tourSteps.length - 1) {
      completeTour();
      return;
    }

    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    setCurrentStep(tourSteps[nextIndex]);
  }, [stepIndex, tourSteps]);

  // Skip entire tour
  const skipTour = useCallback(async () => {
    try {
      const completedScreens = await AsyncStorage.getItem(STORAGE_KEY);
      const completed = completedScreens ? JSON.parse(completedScreens) : {};
      completed[screenName] = true;
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      
      setShowTour(false);
      setCurrentStep(null);
      setStepIndex(0);
    } catch (error) {
      console.error(`[useSimpleTour:${screenName}] Skip error:`, error);
      setShowTour(false);
    }
  }, [screenName]);

  // Complete tour
  const completeTour = useCallback(async () => {
    try {
      const completedScreens = await AsyncStorage.getItem(STORAGE_KEY);
      const completed = completedScreens ? JSON.parse(completedScreens) : {};
      completed[screenName] = true;
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      
      setShowTour(false);
      setCurrentStep(null);
      setStepIndex(0);
    } catch (error) {
      console.error(`[useSimpleTour:${screenName}] Complete error:`, error);
      setShowTour(false);
    }
  }, [screenName]);

  // Start tour manually (for route params or manual triggers)
  const startTour = useCallback(async () => {
    try {
      if (tourSteps && tourSteps.length > 0) {
        console.log(`[useSimpleTour:${screenName}] Starting tour manually`);
        setCurrentStep(tourSteps[0]);
        setStepIndex(0);
        setShowTour(true);
      }
    } catch (error) {
      console.error(`[useSimpleTour:${screenName}] Start tour error:`, error);
    }
  }, [screenName, tourSteps]);

  // Reset tour (for testing or manual restart)
  const resetTour = useCallback(async () => {
    try {
      const completedScreens = await AsyncStorage.getItem(STORAGE_KEY);
      const completed = completedScreens ? JSON.parse(completedScreens) : {};
      delete completed[screenName];
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      
      if (tourSteps && tourSteps.length > 0) {
        setCurrentStep(tourSteps[0]);
        setStepIndex(0);
        setShowTour(true);
      }
    } catch (error) {
      console.error(`[useSimpleTour:${screenName}] Reset error:`, error);
    }
  }, [screenName, tourSteps]);

  return {
    showTour,
    currentStep,
    stepIndex,
    totalSteps: tourSteps ? tourSteps.length : 0,
    isInitialized,
    nextStep,
    skipTour,
    completeTour,
    resetTour,
    startTour,
  };
};

export default useSimpleTour;