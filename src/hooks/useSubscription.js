import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// Cache for subscription data to prevent repeated API calls
let subscriptionCache = {
  data: null,
  timestamp: null,
  isLoading: false
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Export cache clearing function for use in other modules
export const clearSubscriptionCache = () => {
  subscriptionCache.data = null;
  subscriptionCache.timestamp = null;
  subscriptionCache.isLoading = false;
};

// Custom hook for managing subscription data
export const useSubscription = () => {
  const { user, refreshUserData, getUserSubscriptionPlan } = useAuth();
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Check if cache is valid
  const isCacheValid = () => {
    return subscriptionCache.data && 
           subscriptionCache.timestamp && 
           (Date.now() - subscriptionCache.timestamp) < CACHE_DURATION;
  };

  // Load subscription data with caching
  const loadSubscriptionData = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Use cached data if available and not forcing refresh
      if (!forceRefresh && isCacheValid()) {
        if (mountedRef.current) {
          setSubscriptionPlan(subscriptionCache.data);
          setIsLoading(false);
        }
        return;
      }

      // Prevent multiple simultaneous API calls
      if (subscriptionCache.isLoading && !forceRefresh) {
        // Wait for ongoing request
        const checkCache = () => {
          if (subscriptionCache.data && mountedRef.current) {
            setSubscriptionPlan(subscriptionCache.data);
            setIsLoading(false);
          } else if (!subscriptionCache.isLoading) {
            // Retry if loading failed
            loadSubscriptionData(false);
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
        return;
      }

      subscriptionCache.isLoading = true;

      // Refresh user data if needed
      if (forceRefresh) {
        await refreshUserData();
      }

      // Get subscription plan from database
      const plan = await getUserSubscriptionPlan();
      
      // Update cache
      subscriptionCache.data = plan;
      subscriptionCache.timestamp = Date.now();
      subscriptionCache.isLoading = false;

      if (mountedRef.current) {
        setSubscriptionPlan(plan);
      }

    } catch (err) {
      console.error('Error loading subscription data:', err);
      subscriptionCache.isLoading = false;
      
      if (mountedRef.current) {
        setError(err.message);
        
        // Fallback to user context data or cached data
        if (user?.subscription_plan) {
          setSubscriptionPlan(user.subscription_plan);
        } else if (subscriptionCache.data) {
          setSubscriptionPlan(subscriptionCache.data);
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Initialize on mount
  useEffect(() => {
    mountedRef.current = true;
    
    // Use user data immediately if available
    if (user?.subscription_plan && !subscriptionCache.data) {
      setSubscriptionPlan(user.subscription_plan);
      subscriptionCache.data = user.subscription_plan;
      subscriptionCache.timestamp = Date.now();
      setIsLoading(false);
    } else {
      loadSubscriptionData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [user]);

  // Refresh subscription data (clears cache)
  const refreshSubscription = () => {
    subscriptionCache.data = null;
    subscriptionCache.timestamp = null;
    return loadSubscriptionData(true);
  };

  // Clear cache (useful for logout) - using exported function
  const clearCache = () => {
    clearSubscriptionCache();
  };

  // Get plan display name
  const getPlanDisplayName = () => {
    const planNames = {
      free: 'Free',
      starter: 'Starter',
      business: 'Business',
      enterprise: 'Enterprise'
    };
    return planNames[subscriptionPlan] || 'Free';
  };

  // Check if user has specific plan or higher
  const hasPlanOrHigher = (requiredPlan) => {
    const planHierarchy = ['free', 'starter', 'business', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(subscriptionPlan);
    const requiredIndex = planHierarchy.indexOf(requiredPlan);
    return currentIndex >= requiredIndex;
  };

  return {
    subscriptionPlan,
    isLoading,
    error,
    refreshSubscription,
    clearCache,
    getPlanDisplayName,
    hasPlanOrHigher,
    user
  };
};

export default useSubscription;