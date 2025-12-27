import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAppTour = (screenName) => {
  const [showTour, setShowTour] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  const checkTourStatus = useCallback(async () => {
    try {
      // Check if user has completed onboarding
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      console.log(`🎯 [${screenName}] Tour check - hasCompletedOnboarding:`, hasCompletedOnboarding);
      
      if (!hasCompletedOnboarding) {
        console.log(`🎯 [${screenName}] Tour blocked - onboarding not completed`);
        return;
      }

      // Check if user has already seen the app tour (skip for returning users)
      const hasSeenAppTour = await AsyncStorage.getItem('hasSeenAppTour');
      console.log(`🎯 [${screenName}] hasSeenAppTour:`, hasSeenAppTour);
      
      // If user has already seen the tour, don't show it again (unless continuing from another screen)
      if (hasSeenAppTour === 'true') {
        // Check if we're continuing a tour from another screen
        const continueTourTo = await AsyncStorage.getItem('continueTourTo');
        if (continueTourTo === screenName) {
          console.log(`🎯 [${screenName}] Continuing tour from previous screen`);
          await AsyncStorage.removeItem('continueTourTo');
          setIsFirstTime(false);
          
          // Start tour after screen is ready
          setTimeout(() => {
            console.log(`🎯 [${screenName}] Starting continued tour now!`);
            setShowTour(true);
          }, 1000);
        } else {
          console.log(`🎯 [${screenName}] Tour already seen - skipping`);
        }
        return;
      }

      // NEW USER: Check if we're continuing a tour from another screen
      const continueTourTo = await AsyncStorage.getItem('continueTourTo');
      if (continueTourTo === screenName) {
        console.log(`🎯 [${screenName}] Continuing tour from previous screen`);
        await AsyncStorage.removeItem('continueTourTo');
        setIsFirstTime(true);
        
        // Start tour after screen is ready
        setTimeout(() => {
          console.log(`🎯 [${screenName}] Starting continued tour now!`);
          setShowTour(true);
        }, 1000);
        return;
      }

      // NEW USER: Show tour for first time
      // Only show tour on POS screen for new users (entry point)
      if (screenName === 'POS') {
        setIsFirstTime(true);
        console.log(`🎯 [${screenName}] New user detected - starting tour in 1.5 seconds...`);
        
        // Delay to ensure screen is fully loaded
        setTimeout(() => {
          console.log(`🎯 [${screenName}] Tour starting now!`);
          setShowTour(true);
        }, 1500);
      } else {
        console.log(`🎯 [${screenName}] Not POS screen - waiting for tour continuation`);
      }
    } catch (error) {
      console.error('Error checking tour status:', error);
    }
  }, [screenName]);

  useEffect(() => {
    checkTourStatus();
  }, [checkTourStatus]);

  const startTour = useCallback(() => {
    console.log(`🎯 [${screenName}] startTour called - showing tour`);
    setShowTour(true);
  }, [screenName]);

  const completeTour = useCallback(async () => {
    try {
      setShowTour(false);
      
      // Mark this screen's tour as completed
      const completedTours = await AsyncStorage.getItem('completedTours');
      const tours = completedTours ? JSON.parse(completedTours) : {};
      tours[screenName] = true;
      await AsyncStorage.setItem('completedTours', JSON.stringify(tours));
      
      // Mark app tour as seen
      await AsyncStorage.setItem('hasSeenAppTour', 'true');
      
      console.log(`🎯 [${screenName}] Tour completed and saved`);
    } catch (error) {
      console.error('Error completing tour:', error);
    }
  }, [screenName]);

  const skipAllTours = useCallback(async () => {
    try {
      console.log(`🎯 [${screenName}] skipAllTours called`);
      
      // Mark overall app tour as seen
      await AsyncStorage.setItem('hasSeenAppTour', 'true');
      
      // Clear any pending tour continuation
      await AsyncStorage.removeItem('continueTourTo');
      
      // Mark this screen's tour as completed
      const completedTours = await AsyncStorage.getItem('completedTours');
      const tours = completedTours ? JSON.parse(completedTours) : {};
      tours[screenName] = true;
      await AsyncStorage.setItem('completedTours', JSON.stringify(tours));
      
      // Hide current tour
      setShowTour(false);
      
      console.log(`🎯 [${screenName}] Tour skipped - all tours marked as seen`);
    } catch (error) {
      console.error('Error skipping tour:', error);
    }
  }, [screenName]);

  const resetTours = useCallback(async () => {
    try {
      console.log(`🎯 [${screenName}] resetTours called - clearing all tour data`);
      
      await AsyncStorage.multiRemove([
        'hasSeenAppTour',
        'completedTours', 
        'continueTourTo'
      ]);
      
      console.log(`🎯 [${screenName}] All tour data cleared`);
    } catch (error) {
      console.error('Error resetting tours:', error);
    }
  }, [screenName]);

  return {
    showTour,
    isFirstTime,
    startTour,
    completeTour,
    skipAllTours,
    resetTours,
  };
};
