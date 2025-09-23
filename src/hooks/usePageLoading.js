import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export const usePageLoading = (initialLoading = true, minLoadingTime = 800) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const loadingStartTime = useRef(Date.now());

  useEffect(() => {
    if (!isLoading) {
      // Animate content in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading]);

  const startLoading = () => {
    loadingStartTime.current = Date.now();
    setIsLoading(true);
    setIsDataLoaded(false);
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
  };

  const finishLoading = () => {
    const elapsedTime = Date.now() - loadingStartTime.current;
    const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

    setTimeout(() => {
      setIsDataLoaded(true);
      setIsLoading(false);
    }, remainingTime);
  };

  const contentStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  return {
    isLoading,
    isDataLoaded,
    startLoading,
    finishLoading,
    contentStyle,
  };
};

export const useTabLoading = () => {
  const [activeTab, setActiveTab] = useState(null);
  const [loadingTab, setLoadingTab] = useState(null);

  const switchTab = (tabName, loadingDuration = 600) => {
    if (activeTab === tabName) return;

    setLoadingTab(tabName);
    
    setTimeout(() => {
      setActiveTab(tabName);
      setLoadingTab(null);
    }, loadingDuration);
  };

  return {
    activeTab,
    loadingTab,
    switchTab,
    isTabLoading: (tabName) => loadingTab === tabName,
  };
};