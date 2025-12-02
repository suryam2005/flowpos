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
      console.log(`🎯 [${screenName}] Tour check - hasCompletedOnboarding:`, hasCompletedOnboarding);
      
      if (!hasCompletedOnboarding) {
        console.log(`🎯 [${screenName}] Tour blocked - onboarding not completed`);
        return; // Don't show tour until onboarding is complete
      }

      // Check if user has seen the overall app tour
      const hasSeenAppTour = await AsyncStorage.getItem('hasSeenAppTour');
      console.log(`🎯 [${screenName}] hasSeenAppTour:`, hasSeenAppTour);
      
      // Check if user has seen tour for this specific screen
      const completedTours = await AsyncStorage.getItem('completedTours');
      const tours = completedTours ? JSON.parse(completedTours) : {};
      console.log(`🎯 [${screenName}] completedTours:`, tours);
      
      // Show tour if:
      // 1. User hasn't seen any app tour yet, OR
      // 2. User hasn't seen tour for this specific screen
      const shouldShowTour = !hasSeenAppTour || !tours[screenName];
      console.log(`🎯 [${screenName}] shouldShowTour:`, shouldShowTour);
      
      if (shouldShowTour) {
        setIsFirstTime(!hasSeenAppTour);
        console.log(`🎯 [${screenName}] Starting tour in 1.5 seconds...`);
        // Small delay to ensure screen is fully loaded
        setTimeout(() => {
          console.log(`🎯 [${screenName}] Tour starting now!`);
          setShowTour(true);
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking tour status:', error);
    }
  };

  const startTour = () => {
    console.log(`🎯 [${screenName}] startTour called - showing tour`);
    setShowTour(true);
  };

  const completeTour = async () => {
    try {
      setShowTour(false);
      
      // Mark this screen's tour as completed
      const completedTours = await AsyncStorage.getItem('completedTours');
      const tours = completedTours ? JSON.parse(completedTours) : {};
      tours[screenName] = true;
      await AsyncStorage.setItem('completedTours', JSON.stringify(tours));
      
      // If this is the first tour, mark app tour as seen
      if (isFirstTime) {
        await AsyncStorage.setItem('hasSeenAppTour', 'true');
      }
      
      console.log(`🎯 [${screenName}] Tour completed and saved`);
    } catch (error) {
      console.error('Error completing tour:', error);
    }
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