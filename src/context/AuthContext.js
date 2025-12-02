import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemAsync, setItemAsync, deleteItemAsync } from '../utils/secureStorage';
import { AppState } from 'react-native';
import tokenManager from '../services/TokenManager';

const AuthContext = createContext();

// API Configuration - Dynamic with Fallback
import { apiCallWithFallback } from '../config/apiConfig';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinSetupCompleted, setPinSetupCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lockoutEndTime, setLockoutEndTime] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // Clear network cache on app start to ensure fresh API URL detection
    try {
      const NetworkService = require('../services/NetworkService').default;
      NetworkService.clearCache();
    } catch (error) {
      console.log('Could not clear network cache:', error);
    }
    
    checkAuthStatus();
    
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Lock the app when it goes to background (only for cloud users)
        if (user && isAuthenticated) {
          setIsAuthenticated(false);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for cloud authentication first
      const [token, userData, pinCompleted, lockoutTime] = await Promise.all([
        AsyncStorage.getItem('accessToken'),
        AsyncStorage.getItem('userData'),
        getItemAsync('pinSetupCompleted'),
        getItemAsync('lockoutEndTime')
      ]);

      // Cloud authentication
      if (token && userData) {
        setAccessToken(token);
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        setPinSetupCompleted(true);
      } else {
        // Legacy local authentication
        setPinSetupCompleted(!!pinCompleted);
      }
      
      if (lockoutTime) {
        const endTime = parseInt(lockoutTime);
        if (Date.now() < endTime) {
          setLockoutEndTime(endTime);
        } else {
          await deleteItemAsync('lockoutEndTime');
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // API Helper with multiple URL fallback
  const apiCall = async (endpoint, options = {}) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      ...options,
    };

    console.log('🔄 API Call:', endpoint);

    try {
      const response = await apiCallWithFallback(endpoint, config);
      const data = await response.json();

      console.log('✅ API Response:', response.status);

      if (!response.ok) {
        throw new Error(data.message || data.details || data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('❌ API Call Error:', error.message);
      
      // Provide user-friendly error messages
      if (error.message.includes('timeout') || error.message.includes('All connection attempts failed')) {
        throw new Error('Cannot connect to server. Please check your network connection and ensure the backend is running.');
      } else if (error.message.includes('Network request failed')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      throw error;
    }
  };

  // OTP Authentication Methods
  const sendOTP = async (email, name = 'User', phone) => {
    return await apiCall('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, name: name, phone: phone }),
    });
  };

  const verifyOTP = async (email, otp) => {
    return await apiCall('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  };

  const resendOTP = async (email) => {
    return await apiCall('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const setupPassword = async (userData) => {
    // Convert camelCase to snake_case for API
    const apiData = {
      email: userData.email,
      password: userData.password,
      name: userData.name,
      phone: userData.phone
    };
    
    const response = await apiCall('/auth/setup-password', {
      method: 'POST',
      body: JSON.stringify(apiData),
    });

    // Auto-login after successful password setup
    if (response.access_token && response.user) {
      // Store tokens and user data
      await AsyncStorage.setItem('accessToken', response.access_token);
      await AsyncStorage.setItem('refreshToken', response.refresh_token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
      
      // Store user_id and store_id for orders system
      await AsyncStorage.setItem('userId', response.user.id);
      if (response.store) {
        await AsyncStorage.setItem('storeId', response.store.id);
        await AsyncStorage.setItem('storeData', JSON.stringify(response.store));
        console.log('🏪 Store data stored for new user:', response.store.name);
      } else {
        console.log('ℹ️ No store found for new user - will use user_id only');
      }

      setAccessToken(response.access_token);
      setUser(response.user);
      setIsAuthenticated(true);
      setPinSetupCompleted(true);
    }

    return response;
  };

  const login = async (loginData) => {
    console.log('🔐 Starting login process...');
    
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    });

    console.log('✅ Login API successful, storing data...');

    // Store tokens and user data
    await AsyncStorage.setItem('accessToken', response.access_token);
    await AsyncStorage.setItem('refreshToken', response.refresh_token);
    await AsyncStorage.setItem('authToken', response.access_token); // For backward compatibility
    await AsyncStorage.setItem('userData', JSON.stringify(response.user));
    
    // Store user_id and store_id for orders system
    await AsyncStorage.setItem('userId', response.user.id);
    if (response.store) {
      await AsyncStorage.setItem('storeId', response.store.id);
      await AsyncStorage.setItem('storeData', JSON.stringify(response.store));
      console.log('🏪 Store data stored:', response.store.name);
    } else {
      console.log('ℹ️ No store found for user - will use user_id only');
    }
    
    // Store token in TokenManager for caching and auto-refresh
    await tokenManager.storeToken(response.access_token);

    console.log('💾 Data stored, updating state...');

    setAccessToken(response.access_token);
    setUser(response.user);
    setIsAuthenticated(true);
    setPinSetupCompleted(true);

    console.log('🎉 Login complete!');

    return response;
  };

  // Forgot password - send OTP
  const forgotPassword = async (email) => {
    return await apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  // Verify OTP for password reset
  const verifyResetOTP = async (email, otp) => {
    return await apiCall('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  };

  // Reset password after OTP verification
  const resetPassword = async (email, password) => {
    const response = await apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Auto-login after password reset
    if (response.access_token && response.user) {
      await AsyncStorage.setItem('accessToken', response.access_token);
      await AsyncStorage.setItem('refreshToken', response.refresh_token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
      
      // Store user_id and store_id for orders system
      await AsyncStorage.setItem('userId', response.user.id);
      if (response.store) {
        await AsyncStorage.setItem('storeId', response.store.id);
        await AsyncStorage.setItem('storeData', JSON.stringify(response.store));
        console.log('🏪 Store data stored after password reset:', response.store.name);
      } else {
        console.log('ℹ️ No store found after password reset - will use user_id only');
      }

      setAccessToken(response.access_token);
      setUser(response.user);
      setIsAuthenticated(true);
      setPinSetupCompleted(true);
    }

    return response;
  };

  // Change password for authenticated users
  const changePassword = async (currentPassword, newPassword) => {
    return await apiCall('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  };

  // Delete user account with password confirmation
  const deleteAccount = async (password) => {
    try {
      const response = await apiCall('/auth/delete-account', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      });

      // If deletion successful, clear all local data
      if (response.success) {
        console.log('🗑️ Account deleted successfully, clearing all local data...');
        
        // Clear all AsyncStorage data
        await AsyncStorage.clear();
        
        // Clear all state
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setPinSetupCompleted(false);
        
        // Clear subscription cache
        try {
          const { clearSubscriptionCache } = require('../hooks/useSubscription');
          clearSubscriptionCache();
        } catch (error) {
          console.log('Could not clear subscription cache:', error);
        }
        
        console.log('✅ All local data cleared after account deletion');
        
        // Force navigation to initial screen after a short delay
        setTimeout(() => {
          try {
            // This will trigger the auth state change and navigate to welcome screen
            console.log('🔄 Triggering navigation to initial screen...');
          } catch (navError) {
            console.error('Navigation error after account deletion:', navError);
          }
        }, 1000);
      }

      return response;
    } catch (error) {
      console.error('❌ Delete account error:', error);
      throw error;
    }
  };

    // Create store during onboarding
  const createStore = async (storeData) => {
    try {
      console.log('🏪 Creating store with backend API');
      console.log('📊 Store data:', JSON.stringify(storeData, null, 2));
      
      const result = await apiCall('/store', {
        method: 'POST',
        body: JSON.stringify(storeData),
      });
      
      console.log('✅ Store creation successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Store creation failed:', error.message);
      
      // Provide specific error messages
      if (error.message.includes('Cannot connect to server')) {
        throw new Error('Cannot connect to server. Please check your network connection and ensure the backend is running.');
      } else if (error.message.includes('Invalid or expired token')) {
        throw new Error('Authentication expired. Please login again.');
      } else if (error.message.includes('Access token required')) {
        throw new Error('Authentication required. Please login first.');
      }
      
      throw error;
    }
  };

  // Get store information from backend
  const getStore = async () => {
    try {
      console.log('📊 Getting store information from backend');
      
      const response = await apiCall('/store', {
        method: 'GET',
      });
      
      if (response.success && response.store) {
        console.log('✅ Store retrieved successfully:', response.store);
        return response.store;
      }
      
      console.log('ℹ️ No store found for user');
      return null;
    } catch (error) {
      console.error('❌ Error fetching store:', error);
      return null;
    }
  };

  // Update store information via backend
  const updateStore = async (storeData) => {
    try {
      console.log('🔄 Updating store information via backend');
      console.log('📊 Store data:', JSON.stringify(storeData, null, 2));
      
      const response = await apiCall('/store', {
        method: 'PUT',
        body: JSON.stringify(storeData),
      });
      
      if (response.success && response.store) {
        console.log('✅ Store updated successfully:', response.store);
        return response.store;
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error updating store:', error);
      throw error;
    }
  };

  // Fetch user profile from database
  const fetchUserProfile = async () => {
    try {
      const response = await apiCall('/users/profile', {
        method: 'GET',
      });
      
      if (response.success && response.data) {
        // Update stored user data
        await AsyncStorage.setItem('userData', JSON.stringify(response.data));
        setUser(response.data);
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await apiCall('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      
      if (response.success && response.data) {
        // Update stored user data
        await AsyncStorage.setItem('userData', JSON.stringify(response.data));
        setUser(response.data);
        return response.data;
      }
      
      return response;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  // Refresh user data from database
  const refreshUserData = async () => {
    if (accessToken) {
      const updatedUser = await fetchUserProfile();
      return updatedUser;
    }
    return null;
  };

  // Get current user's subscription plan (optimized to avoid unnecessary API calls)
  const getUserSubscriptionPlan = async (forceRefresh = false) => {
    try {
      // Return cached user data if available and not forcing refresh
      if (!forceRefresh && user && user.subscription_plan) {
        return user.subscription_plan;
      }
      
      // Only fetch fresh data if forced or no cached data available
      if (forceRefresh || !user?.subscription_plan) {
        const freshUser = await fetchUserProfile();
        return freshUser?.subscription_plan || 'free';
      }
      
      return user.subscription_plan || 'free';
    } catch (error) {
      console.error('Error getting subscription plan:', error);
      return user?.subscription_plan || 'free';
    }
  };

  // Legacy Methods (for backward compatibility)
  const authenticate = () => {
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      // Call logout API only if authenticated with cloud and have valid token
      if (accessToken && isAuthenticated) {
        try {
          await apiCall('/auth/logout', { method: 'POST' });
        } catch (apiError) {
          // Ignore API errors during logout - we still want to clear local data
          console.log('Logout API call failed (ignoring):', apiError.message);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all stored data comprehensively (but preserve onboarding status)
      await AsyncStorage.multiRemove([
        'accessToken', 
        'refreshToken', 
        'authToken', // Clear backward compatibility token
        'userData',
        'userId',     // Clear user ID
        'storeId',    // Clear store ID
        'storeData',  // Clear store data
        'storeInfo',
        'taxSettings',
        'receiptSettings',
        'businessSettings',
        'workingApiURL'
      ]);
      
      // Clear TokenManager cache
      await tokenManager.clearToken();
      
      // Note: We intentionally preserve:
      // - hasCompletedOnboarding
      // - storeSetupCompleted  
      // - productsOnboardingCompleted
      // - hasSeenAppTour
      // - completedTours
      // These should persist across logout/login cycles
      
      // Clear all state
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setPinSetupCompleted(false);
      
      // Clear subscription cache to prevent stale data
      try {
        const { clearSubscriptionCache } = require('../hooks/useSubscription');
        clearSubscriptionCache();
      } catch (error) {
        console.log('Could not clear subscription cache:', error);
      }
      
      console.log('✅ Complete logout - all data cleared');
    }
  };

  const setupPin = async () => {
    setPinSetupCompleted(true);
    await setItemAsync('pinSetupCompleted', 'true');
  };

  const resetAuth = async () => {
    try {
      await Promise.all([
        AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']),
        deleteItemAsync('userPIN'),
        deleteItemAsync('pinSetupCompleted'),
        deleteItemAsync('lockoutEndTime')
      ]);
      
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setPinSetupCompleted(false);
      setLockoutEndTime(null);
    } catch (error) {
      console.error('Error resetting auth:', error);
    }
  };

  const setLockout = async (minutes = 5) => {
    const endTime = Date.now() + (minutes * 60 * 1000);
    setLockoutEndTime(endTime);
    await setItemAsync('lockoutEndTime', endTime.toString());
  };

  const clearLockout = async () => {
    setLockoutEndTime(null);
    await deleteItemAsync('lockoutEndTime');
  };

  const value = {
    // State
    user,
    isAuthenticated,
    pinSetupCompleted,
    isLoading,
    lockoutEndTime,
    accessToken,
    
    // OTP Authentication
    sendOTP,
    verifyOTP,
    resendOTP,
    setupPassword,
    login,
    
    // Password Reset
    forgotPassword,
    verifyResetOTP,
    resetPassword,
    changePassword,
    deleteAccount,
    
    // Store Management
    createStore,
    getStore,
    updateStore,
    
    // Profile Management
    fetchUserProfile,
    updateProfile,
    refreshUserData,
    getUserSubscriptionPlan,
    
    // Legacy Methods
    authenticate,
    logout,
    setupPin,
    resetAuth,
    setLockout,
    clearLockout,
    
    // Utilities
    apiCall,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};