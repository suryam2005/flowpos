import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAppTour = (screenName) => {
  const [showTour, setShowTour] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    checkTourStatus();
  }, [screenName]);

  const checkTourStatus = async () => {
    try {
      // Check if user has completed onboarding
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      if (!hasCompletedOnboarding) {
        return; // Don't show tour until onboarding is complete
      }

      // Check if user has seen the overall app tour
      const hasSeenAppTour = await AsyncStorage.getItem('hasSeenAppTour');
      
      // Check if user has seen tour for this specific screen
      const completedTours = await AsyncStorage.getItem('completedTours');
      const tours = completedTours ? JSON.parse(completedTours) : {};
      
      // Show tour if:
      // 1. User hasn't seen any app tour yet, OR
      // 2. User hasn't seen tour for this specific screen
      const shouldShowTour = !hasSeenAppTour || !tours[screenName];
      
      if (shouldShowTour) {
        setIsFirstTime(!hasSeenAppTour);
        // Small delay to ensure screen is fully loaded
        setTimeout(() => {
          setShowTour(true);
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking tour status:', error);
    }
  };

  const startTour = () => {
    setShowTour(true);
  };

  const completeTour = () => {
    setShowTour(false);
  };

  const skipAllTours = async () => {
    try {
      await AsyncStorage.setItem('hasSeenAppTour', 'true');
      const allScreens = ['POS', 'Cart', 'Manage', 'Orders', 'Analytics'];
      const tours = {};
      allScreens.forEach(screen => {
        tours[screen] = true;
      });
      await AsyncStorage.setItem('completedTours', JSON.stringify(tours));
      setShowTour(false);
    } catch (error) {
      console.error('Error skipping tours:', error);
    }
  };

  return {
    showTour,
    isFirstTime,
    startTour,
    completeTour,
    skipAllTours,
  };
};