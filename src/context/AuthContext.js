import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemAsync, setItemAsync, deleteItemAsync } from '../utils/secureStorage';
import { AppState } from 'react-native';
import tokenManager from '../services/TokenManager';
import {
  triggerSubscriptionFetchAfterLogin,
  clearSubscriptionCacheOnLogout
} from './SubscriptionContext';
import {
  triggerAppSettingsFetchAfterLogin,
  clearAppSettingsCacheOnLogout,
  distributeStoreDataToAppSettings
} from './AppSettingsContext';
import {
  triggerStoreSettingsFetchAfterLogin,
  clearStoreSettingsCacheOnLogout,
  distributeStoreDataToStoreSettings
} from './StoreSettingsContext';
import { apiDeduplicator, ENDPOINT_KEYS } from '../utils/APIDeduplicator';
import serviceStatusCoordinator from '../services/ServiceStatusCoordinator';
import productFetchCoordinator from '../services/ProductFetchCoordinator';
import sessionStateManager from '../services/SessionStateManager';
import SessionValidationService from '../services/SessionValidationService';

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

  /**
   * Handle session invalidation from SessionValidationService
   * This is called when the backend reports the session is no longer valid
   */
  const handleSessionInvalidated = async (reason) => {
    console.log(`🚨 Session invalidated: ${reason}`);
    console.log('📍 Current auth state before logout:', { isAuthenticated, hasUser: !!user });
    
    // Perform logout first (clears all data and updates state)
    await logout();
    
    console.log('📍 Auth state after logout:', { isAuthenticated, hasUser: !!user });
    
    // Force a re-check of auth status to trigger navigation
    console.log('🔄 Force re-checking auth status after session invalidation...');
    await checkAuthStatus();
    
    console.log('📍 Auth state after checkAuthStatus:', { isAuthenticated, hasUser: !!user });
    
    // Show alert to user after logout
    try {
      const { Alert } = require('react-native');
      Alert.alert(
        'Session Ended',
        'Your session has been logged out from another device.',
        [{ text: 'OK' }]
      );
      console.log('✅ Alert shown to user');
    } catch (error) {
      console.log('Could not show alert:', error);
    }
  };

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
      console.log('🔍 [AuthContext] Checking auth status...');
      
      // Check for cloud authentication first
      const [token, userData, pinCompleted, lockoutTime] = await Promise.all([
        AsyncStorage.getItem('accessToken'),
        AsyncStorage.getItem('userData'),
        getItemAsync('pinSetupCompleted'),
        getItemAsync('lockoutEndTime')
      ]);

      console.log('🔍 [AuthContext] Auth check results:', {
        hasToken: !!token,
        hasUserData: !!userData,
        hasPinCompleted: !!pinCompleted
      });

      // Cloud authentication
      if (token && userData) {
        const parsedUserData = JSON.parse(userData);
        setAccessToken(token);
        setUser(parsedUserData);
        setIsAuthenticated(true);
        setPinSetupCompleted(true);

        console.log('✅ [AuthContext] User authenticated:', parsedUserData.email);

        // Initialize ProductFetchCoordinator for session-level caching (UI Performance Optimization)
        console.log('🎯 Initializing ProductFetchCoordinator on app restart...');
        productFetchCoordinator.initialize();

        // Start session validation service for automatic logout
        console.log('🔄 Starting session validation service on app restart...');
        SessionValidationService.start(handleSessionInvalidated);

      } else {
        console.log('❌ [AuthContext] No authentication found');
        
        // Legacy local authentication
        setPinSetupCompleted(!!pinCompleted);

        // Clear coordinator session if not authenticated
        console.log('🎯 Clearing ProductFetchCoordinator session - not authenticated...');
        productFetchCoordinator.clearSession();

        // Clear ServiceStatusCoordinator session (Phase D optimization)
        console.log('🔧 Clearing ServiceStatusCoordinator session - not authenticated...');
        serviceStatusCoordinator.clearCache();
        
        setIsAuthenticated(false);
        setUser(null);
        setAccessToken(null);
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
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Consolidated store data fetch - makes a single GET /api/store call
   * and distributes data to both StoreSettingsContext and AppSettingsContext
   * 
   * Uses APIDeduplicator to prevent duplicate calls when both contexts
   * try to fetch simultaneously after login.
   * 
   * @param {string} token - Auth token for API call
   * @returns {Promise<Object|null>} - Store data or null on failure
   */
  const fetchAndDistributeStoreData = async (token) => {
    if (!token) {
      console.log('[AuthContext] No token for consolidated store fetch');
      return null;
    }

    try {
      // Use APIDeduplicator to ensure only one call happens
      const storeData = await apiDeduplicator.deduplicate(ENDPOINT_KEYS.STORE, async () => {
        console.log('🔄 [AuthContext] Making consolidated GET /api/store call');

        const response = await apiCallWithFallback('/store', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch store data');
        }

        const data = await response.json();
        console.log('✅ [AuthContext] Consolidated store fetch successful');
        return data.store || data;
      });

      // Distribute data to both contexts (non-blocking)
      if (storeData) {
        // Distribute to StoreSettingsContext
        if (distributeStoreDataToStoreSettings) {
          distributeStoreDataToStoreSettings(storeData, token);
        }

        // Distribute to AppSettingsContext (app_settings field)
        if (distributeStoreDataToAppSettings) {
          distributeStoreDataToAppSettings(storeData);
        }
      }

      return storeData;
    } catch (error) {
      console.error('[AuthContext] Consolidated store fetch failed:', error.message);
      return null;
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

      // Initialize ProductFetchCoordinator for session-level caching (UI Performance Optimization)
      console.log('🎯 Initializing ProductFetchCoordinator after password setup...');
      productFetchCoordinator.initialize();

      // Start session validation service for automatic logout
      console.log('🔄 Starting session validation service...');
      SessionValidationService.start(handleSessionInvalidated);

      // Trigger subscription fetch after successful password setup (non-blocking)
      // This does NOT delay navigation or block post-login UI (Requirement 2.5, 2.6)
      console.log('📦 Triggering subscription fetch after password setup (non-blocking)...');
      triggerSubscriptionFetchAfterLogin();

      // CONSOLIDATED: Single API call for store data, distributed to both contexts
      // This replaces separate triggerAppSettingsFetchAfterLogin and triggerStoreSettingsFetchAfterLogin
      // Requirement 1.4: Prevent duplicate GET /api/store calls
      console.log('🏪 Triggering consolidated store data fetch after password setup (non-blocking)...');
      fetchAndDistributeStoreData(response.access_token).catch(err => {
        console.error('[AuthContext] Consolidated store fetch failed:', err.message);
        // Fallback: trigger individual fetches if consolidated fails
        triggerAppSettingsFetchAfterLogin();
        triggerStoreSettingsFetchAfterLogin();
      });
    }

    return response;
  };

  const login = async (loginData) => {
    console.log('🔐 Starting login process...');

    // Only send email and password to match backend validation
    const cleanLoginData = {
      email: loginData.email,
      password: loginData.password
    };

    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(cleanLoginData),
    });

    console.log('✅ Login API successful, storing data...');

    // Store tokens and user data with enhanced security for APK
    await AsyncStorage.setItem('accessToken', response.access_token);
    await AsyncStorage.setItem('refreshToken', response.refresh_token);
    await AsyncStorage.setItem('authToken', response.access_token); // For backward compatibility
    await AsyncStorage.setItem('userData', JSON.stringify(response.user));

    // Store session information for APK builds and session management
    if (response.deviceSession) {
      await AsyncStorage.setItem('sessionId', response.deviceSession.sessionId);
      await AsyncStorage.setItem('sessionToken', response.deviceSession.sessionToken);
      await AsyncStorage.setItem('deviceName', response.deviceSession.deviceName);
      console.log('📱 Session info stored:', response.deviceSession.deviceName);
    }

    // Store user_id and store_id for orders system
    await AsyncStorage.setItem('userId', response.user.id);
    if (response.store) {
      await AsyncStorage.setItem('storeId', response.store.id);
      await AsyncStorage.setItem('storeData', JSON.stringify(response.store));
      console.log('🏪 Store data stored:', response.store.name || response.store.store_name);

      // CRITICAL: Set onboarding flags for returning users who have store data
      // This ensures they don't get redirected to store setup on login
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      await AsyncStorage.setItem('storeSetupCompleted', 'true');
      await AsyncStorage.setItem('productsOnboardingCompleted', 'true');
      // Mark tour as seen for returning users - they don't need the tour
      await AsyncStorage.setItem('hasSeenAppTour', 'true');
      console.log('✅ Onboarding flags set for returning user with store');
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

    // Initialize ProductFetchCoordinator for session-level caching (UI Performance Optimization)
    console.log('🎯 Initializing ProductFetchCoordinator after login...');
    productFetchCoordinator.initialize();

    // Handle login completion with SessionStateManager (Requirements 4.5)
    console.log('🔄 Handling login completion with SessionStateManager...');
    try {
      await sessionStateManager.handleLoginCompleted(response);
    } catch (sessionError) {
      console.error('⚠️ SessionStateManager login handling failed (non-blocking):', sessionError);
    }

    // Start session validation service for automatic logout
    console.log('🔄 Starting session validation service...');
    SessionValidationService.start(handleSessionInvalidated);

    // Trigger subscription fetch after successful login (non-blocking)
    // This does NOT delay navigation or block post-login UI (Requirement 2.5, 2.6)
    console.log('📦 Triggering subscription fetch (non-blocking)...');
    triggerSubscriptionFetchAfterLogin();

    // CONSOLIDATED: Single API call for store data, distributed to both contexts
    // This replaces separate triggerAppSettingsFetchAfterLogin and triggerStoreSettingsFetchAfterLogin
    // Requirement 1.4: Prevent duplicate GET /api/store calls
    // Requirements 2.1, 2.2: Cache-first access for non-frequent data
    console.log('🏪 Triggering consolidated store data fetch (non-blocking)...');
    fetchAndDistributeStoreData(response.access_token).catch(err => {
      console.error('[AuthContext] Consolidated store fetch failed:', err.message);
      // Fallback: trigger individual fetches if consolidated fails
      triggerAppSettingsFetchAfterLogin();
      triggerStoreSettingsFetchAfterLogin();
    });

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
        console.log('🏪 Store data stored after password reset:', response.store.name || response.store.store_name);

        // CRITICAL: Set onboarding flags for returning users who have store data
        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        await AsyncStorage.setItem('storeSetupCompleted', 'true');
        await AsyncStorage.setItem('productsOnboardingCompleted', 'true');
        // Mark tour as seen for returning users - they don't need the tour
        await AsyncStorage.setItem('hasSeenAppTour', 'true');
        console.log('✅ Onboarding flags set for returning user after password reset');
      } else {
        console.log('ℹ️ No store found after password reset - will use user_id only');
      }

      setAccessToken(response.access_token);
      setUser(response.user);
      setIsAuthenticated(true);
      setPinSetupCompleted(true);

      // Start session validation service for automatic logout
      console.log('🔄 Starting session validation service...');
      SessionValidationService.start(handleSessionInvalidated);

      // Trigger subscription fetch after password reset (non-blocking)
      // This does NOT delay navigation or block post-login UI (Requirement 2.5, 2.6)
      console.log('📦 Triggering subscription fetch after password reset (non-blocking)...');
      triggerSubscriptionFetchAfterLogin();

      // CONSOLIDATED: Single API call for store data, distributed to both contexts
      // This replaces separate triggerAppSettingsFetchAfterLogin and triggerStoreSettingsFetchAfterLogin
      // Requirement 1.4: Prevent duplicate GET /api/store calls
      console.log('🏪 Triggering consolidated store data fetch after password reset (non-blocking)...');
      fetchAndDistributeStoreData(response.access_token).catch(err => {
        console.error('[AuthContext] Consolidated store fetch failed:', err.message);
        // Fallback: trigger individual fetches if consolidated fails
        triggerAppSettingsFetchAfterLogin();
        triggerStoreSettingsFetchAfterLogin();
      });
    } else {
      // Manual login required - Clear any existing session to enforce security
      // This is critical for "Change Password" flow where user is already logged in
      console.log('🔒 Password reset/changed - forcing logout to enforce manual login and device limits');
      if (isAuthenticated) {
        await logout();
      }
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

        // Clear subscription cache first (Requirements 7.1, 7.2)
        console.log('🧹 Clearing subscription cache after account deletion...');
        await clearSubscriptionCacheOnLogout();

        // Clear app settings cache (Requirements 7.1, 7.2 - App Settings Persistence)
        console.log('🧹 Clearing app settings cache after account deletion...');
        await clearAppSettingsCacheOnLogout();

        // Clear store settings cache (Store Settings Caching spec - Task 1)
        console.log('🧹 Clearing store settings cache after account deletion...');
        await clearStoreSettingsCacheOnLogout();

        // Clear ProductFetchCoordinator session (UI Performance Optimization)
        console.log('🧹 Clearing ProductFetchCoordinator session after account deletion...');
        productFetchCoordinator.clearSession();

        // Clear ServiceStatusCoordinator session (Phase D optimization)
        console.log('🧹 Clearing ServiceStatusCoordinator session after account deletion...');
        serviceStatusCoordinator.clearCache();

        // Clear all AsyncStorage data
        await AsyncStorage.clear();

        // Clear all state
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setPinSetupCompleted(false);

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

      // Handle token expiration
      if (error.message.includes('Invalid or expired token') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('401')) {
        console.log('🔄 Token expired, clearing auth data');
        
        // Guard against multiple simultaneous logout calls from token expiration
        if (!logout._tokenExpirationInProgress) {
          logout._tokenExpirationInProgress = true;
          await logout();
          // The guard will be cleared in the logout function
        } else {
          console.log('⚠️ Token expiration logout already in progress, skipping duplicate call');
        }
        
        throw new Error('Session expired. Please login again.');
      }

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
        return freshUser?.subscription_plan || 'trial';
      }

      return user.subscription_plan || 'trial';
    } catch (error) {
      console.error('Error getting subscription plan:', error);
      return user?.subscription_plan || 'trial';
    }
  };

  // Legacy Methods (for backward compatibility)
  const authenticate = () => {
    setIsAuthenticated(true);
  };

  const logout = async () => {
    // Guard against multiple simultaneous logout calls
    if (logout._inProgress) {
      console.log('⚠️ Logout already in progress, skipping duplicate call');
      return;
    }
    
    logout._inProgress = true;
    
    try {
      // Stop session validation service
      console.log('🛑 Stopping session validation service...');
      SessionValidationService.stop();

      // Call logout API only if authenticated with cloud and have valid token
      if (accessToken && isAuthenticated) {
        try {
          const logoutResponse = await apiCall('/auth/logout', { method: 'POST' });
          console.log('✅ Logout API response:', logoutResponse);
          
          if (logoutResponse.sessionCleared) {
            console.log('🔒 Session cleared in database:', logoutResponse.sessionId);
          } else {
            console.log('⚠️ Session may not have been cleared in database');
          }

          // Handle logout completion with SessionStateManager (Requirements 4.5)
          console.log('🔄 Handling logout completion with SessionStateManager...');
          try {
            await sessionStateManager.handleLogoutCompleted(logoutResponse);
          } catch (sessionError) {
            console.error('⚠️ SessionStateManager logout handling failed (non-blocking):', sessionError);
          }
        } catch (apiError) {
          // Ignore API errors during logout - we still want to clear local data
          console.log('Logout API call failed (ignoring):', apiError.message);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear subscription cache first (Requirements 7.1, 7.2)
      // This clears both in-memory state and AsyncStorage
      console.log('🧹 Clearing subscription cache on logout...');
      await clearSubscriptionCacheOnLogout();

      // Clear app settings cache (Requirements 7.1, 7.2 - App Settings Persistence)
      // This clears both in-memory state and AsyncStorage, but NOT database values
      console.log('🧹 Clearing app settings cache on logout...');
      await clearAppSettingsCacheOnLogout();

      // Clear store settings cache (Store Settings Caching spec - Task 1)
      // This clears both in-memory state and AsyncStorage, but NOT database values
      console.log('🧹 Clearing store settings cache on logout...');
      await clearStoreSettingsCacheOnLogout();

      // Clear ProductFetchCoordinator session (UI Performance Optimization)
      console.log('🧹 Clearing ProductFetchCoordinator session on logout...');
      productFetchCoordinator.clearSession();

      // Clear ServiceStatusCoordinator session (Phase D optimization)
      console.log('🧹 Clearing ServiceStatusCoordinator session on logout...');
      serviceStatusCoordinator.clearCache();

      // Clear SessionStateManager data (Requirements 4.3, 4.5)
      console.log('🧹 Clearing SessionStateManager data on logout...');
      sessionStateManager.clearAllData();

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
        'workingApiURL',
        'sessionId',  // Clear session ID
        'sessionToken', // Clear session token
        'deviceName'  // Clear device name
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

      // Note: Old subscription cache clearing via useSubscription hook is now replaced
      // by clearSubscriptionCacheOnLogout() above which uses SubscriptionContext

      console.log('✅ Complete logout - all data and sessions cleared');
      
      // Clear the logout guard flags
      logout._inProgress = false;
      logout._tokenExpirationInProgress = false;
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
    updateUserData: setUser, // Direct setter for user data updates

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