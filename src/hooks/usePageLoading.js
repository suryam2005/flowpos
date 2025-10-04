import { useState, useRef } from 'react';

export const usePageLoading = (initialLoading = true, minLoadingTime = 800) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const loadingStartTime = useRef(Date.now());

  const startLoading = () => {
    loadingStartTime.current = Date.now();
    setIsLoading(true);
    setIsDataLoaded(false);
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
    opacity: 1,
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

  const switchTab = (tabName, loadingDuration = 0) => {
    if (activeTab === tabName) return;

    setLoadingTab(tabName);
    
    // Instant tab switching - no loading animation
    setActiveTab(tabName);
    setLoadingTab(null);
  };

  return {
    activeTab,
    loadingTab,
    switchTab,
    isTabLoading: (tabName) => loadingTab === tabName,
  };
};