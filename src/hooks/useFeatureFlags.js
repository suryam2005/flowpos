/**
 * useFeatureFlags - Hook for managing feature flag caching per render cycle
 * 
 * Purpose: Provides a React hook interface for feature flag evaluation with
 * automatic render cycle management and caching.
 * 
 * Key Features:
 * - Automatically starts/ends render cycles
 * - Provides cached feature flag evaluation methods
 * - Maintains same API as direct FeatureService usage
 * - Ensures proper cleanup on component unmount
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import featureFlagCache from '../services/FeatureFlagCache';

export const useFeatureFlags = () => {
  const { user } = useAuth();
  const renderCycleStarted = useRef(false);
  const userId = user?.id || user?.email || 'anonymous';

  // Start render cycle on mount
  useEffect(() => {
    if (!renderCycleStarted.current) {
      featureFlagCache.startRenderCycle();
      renderCycleStarted.current = true;
    }

    // End render cycle on unmount
    return () => {
      if (renderCycleStarted.current) {
        featureFlagCache.endRenderCycle();
        renderCycleStarted.current = false;
      }
    };
  }, []);

  // Cached feature flag evaluation methods
  const canUseFeature = useCallback(async (featureName) => {
    return featureFlagCache.canUseFeature(featureName, userId);
  }, [userId]);

  const getLimit = useCallback(async (limitName) => {
    return featureFlagCache.getLimit(limitName, userId);
  }, [userId]);

  const getAvailablePaymentMethods = useCallback(async () => {
    return featureFlagCache.getAvailablePaymentMethods(userId);
  }, [userId]);

  const getPlanInfo = useCallback(async () => {
    return featureFlagCache.getPlanInfo(userId);
  }, [userId]);

  // Pass-through methods that don't need caching
  const showUpgradePrompt = useCallback((featureName, context = {}) => {
    return featureFlagCache.showUpgradePrompt(featureName, context);
  }, []);

  const hasReachedLimit = useCallback(async (limitName) => {
    return featureFlagCache.hasReachedLimit(limitName);
  }, []);

  const canAddProduct = useCallback(async () => {
    return featureFlagCache.canAddProduct();
  }, []);

  const canProcessOrder = useCallback(async () => {
    return featureFlagCache.canProcessOrder();
  }, []);

  const getUsageStats = useCallback(async () => {
    return featureFlagCache.getUsageStats();
  }, []);

  const upgradePlan = useCallback(async (newPlan) => {
    return featureFlagCache.upgradePlan(newPlan);
  }, []);

  // Utility method to restart render cycle (useful for debugging)
  const restartRenderCycle = useCallback(() => {
    featureFlagCache.endRenderCycle();
    featureFlagCache.startRenderCycle();
    renderCycleStarted.current = true;
  }, []);

  return {
    // Cached methods
    canUseFeature,
    getLimit,
    getAvailablePaymentMethods,
    getPlanInfo,
    
    // Pass-through methods
    showUpgradePrompt,
    hasReachedLimit,
    canAddProduct,
    canProcessOrder,
    getUsageStats,
    upgradePlan,
    
    // Utility methods
    restartRenderCycle,
    
    // State
    userId,
    isRenderCycleActive: renderCycleStarted.current
  };
};

export default useFeatureFlags;