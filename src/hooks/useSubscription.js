import { useCallback, useMemo } from 'react';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';

/**
 * useSubscription Hook
 * 
 * Provides access to subscription data from SubscriptionContext.
 * This hook is a wrapper around SubscriptionContext that maintains
 * backward compatibility with the existing interface.
 * 
 * Implements Requirements 4.1, 4.2:
 * - 4.1: Expose plan, status, expiresAt, limits, and features globally
 * - 4.2: All screens receive the same data from the single source
 * 
 * The hook does NOT make direct API calls - all data comes from SubscriptionContext.
 */
export const useSubscription = () => {
  const { user } = useAuth();
  
  // Get subscription data from context (single source of truth)
  const {
    subscription,
    isLoading,
    error,
    isCached,
    lastFetchedAt,
    refreshSubscription: contextRefresh,
    clearCache: contextClearCache,
    updateSubscriptionCache,
    getSubscription,
    hasCachedSubscription,
    getCachedSubscription,
    isCacheStale,
    UNKNOWN_SUBSCRIPTION_STATE
  } = useSubscriptionContext();

  /**
   * Get the subscription plan name
   * Maintains backward compatibility with existing code that uses subscriptionPlan
   */
  const subscriptionPlan = useMemo(() => {
    if (!subscription) {
      return 'free';
    }
    // Map plan names for backward compatibility
    const plan = subscription.plan || 'free';
    // Handle 'unknown' plan from UNKNOWN_SUBSCRIPTION_STATE
    if (plan === 'unknown') {
      return 'free';
    }
    return plan;
  }, [subscription]);

  /**
   * Get plan display name
   * Maintains backward compatibility with existing getPlanDisplayName function
   */
  const getPlanDisplayName = useCallback(() => {
    const planNames = {
      free: 'Free',
      trial: 'Trial',
      starter: 'Starter',
      growth: 'Growth',
      business: 'Business',
      enterprise: 'Enterprise',
      unknown: 'Free'
    };
    return planNames[subscriptionPlan] || 'Free';
  }, [subscriptionPlan]);

  /**
   * Check if user has specific plan or higher
   * Maintains backward compatibility with existing hasPlanOrHigher function
   */
  const hasPlanOrHigher = useCallback((requiredPlan) => {
    const planHierarchy = ['free', 'trial', 'starter', 'growth', 'business', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(subscriptionPlan);
    const requiredIndex = planHierarchy.indexOf(requiredPlan);
    return currentIndex >= requiredIndex;
  }, [subscriptionPlan]);

  /**
   * Refresh subscription data
   * Wraps context's refreshSubscription for backward compatibility
   */
  const refreshSubscription = useCallback(async () => {
    try {
      await contextRefresh();
    } catch (err) {
      console.error('[useSubscription] Error refreshing subscription:', err);
      // Don't throw - maintain backward compatibility
    }
  }, [contextRefresh]);

  /**
   * Clear subscription cache
   * Wraps context's clearCache for backward compatibility
   */
  const clearCache = useCallback(async () => {
    try {
      await contextClearCache();
    } catch (err) {
      console.error('[useSubscription] Error clearing cache:', err);
      // Don't throw - maintain backward compatibility
    }
  }, [contextClearCache]);

  /**
   * Get subscription status
   * Returns the status from subscription data
   */
  const status = useMemo(() => {
    if (!subscription) {
      return 'UNKNOWN';
    }
    return subscription.status || 'UNKNOWN';
  }, [subscription]);

  /**
   * Get subscription limits
   * Returns the limits from subscription data
   */
  const limits = useMemo(() => {
    if (!subscription) {
      return UNKNOWN_SUBSCRIPTION_STATE.limits;
    }
    return subscription.limits || UNKNOWN_SUBSCRIPTION_STATE.limits;
  }, [subscription, UNKNOWN_SUBSCRIPTION_STATE]);

  /**
   * Get subscription features
   * Returns the features from subscription data
   */
  const features = useMemo(() => {
    if (!subscription) {
      return {};
    }
    return subscription.features || {};
  }, [subscription]);

  /**
   * Get subscription expiry date
   * Returns the expiresAt from subscription data
   */
  const expiresAt = useMemo(() => {
    if (!subscription) {
      return null;
    }
    return subscription.expiresAt || null;
  }, [subscription]);

  /**
   * Get plan details
   * Returns the planDetails from subscription data
   */
  const planDetails = useMemo(() => {
    if (!subscription) {
      return UNKNOWN_SUBSCRIPTION_STATE.planDetails;
    }
    return subscription.planDetails || UNKNOWN_SUBSCRIPTION_STATE.planDetails;
  }, [subscription, UNKNOWN_SUBSCRIPTION_STATE]);

  // Return the same interface as before for backward compatibility
  // Plus additional data from SubscriptionContext for new features
  return {
    // Backward compatible interface
    subscriptionPlan,
    isLoading,
    error,
    refreshSubscription,
    clearCache,
    getPlanDisplayName,
    hasPlanOrHigher,
    user,
    
    // Extended interface from SubscriptionContext (Requirement 4.1)
    subscription,        // Full subscription object
    plan: subscriptionPlan, // Alias for subscriptionPlan
    status,              // Subscription status
    limits,              // Subscription limits
    features,            // Subscription features
    expiresAt,           // Subscription expiry date
    planDetails,         // Plan details (name, price, currency)
    
    // Cache status
    isCached,
    lastFetchedAt,
    
    // Additional actions
    updateSubscriptionCache,
    getSubscription,
    hasCachedSubscription,
    getCachedSubscription,
    isCacheStale
  };
};

/**
 * Export cache clearing function for use in other modules
 * This is a no-op now since cache is managed by SubscriptionContext
 * Kept for backward compatibility
 * @deprecated Use clearCache from useSubscription hook instead
 */
export const clearSubscriptionCache = () => {
  console.warn('[useSubscription] clearSubscriptionCache is deprecated. Use clearCache from useSubscription hook instead.');
  // This is now a no-op - cache is managed by SubscriptionContext
  // The actual clearing happens through the context's clearCache method
};

export default useSubscription;
