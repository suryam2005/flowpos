import React, { createContext, useContext, useState, useEffect } from 'react';
import { getItemAsync, setItemAsync, deleteItemAsync } from '../utils/secureStorage';
import { AppState } from 'react-native';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinSetupCompleted, setPinSetupCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lockoutEndTime, setLockoutEndTime] = useState(null);

  useEffect(() => {
    checkAuthStatus();
    
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Lock the app when it goes to background
        setIsAuthenticated(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const [pinCompleted, lockoutTime] = await Promise.all([
        getItemAsync('pinSetupCompleted'),
        getItemAsync('lockoutEndTime')
      ]);

      setPinSetupCompleted(!!pinCompleted);
      
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

  const authenticate = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const setupPin = async () => {
    setPinSetupCompleted(true);
    await setItemAsync('pinSetupCompleted', 'true');
  };

  const resetAuth = async () => {
    try {
      await Promise.all([
        deleteItemAsync('userPIN'),
        deleteItemAsync('pinSetupCompleted'),
        deleteItemAsync('lockoutEndTime')
      ]);
      
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
    isAuthenticated,
    pinSetupCompleted,
    isLoading,
    lockoutEndTime,
    authenticate,
    logout,
    setupPin,
    resetAuth,
    setLockout,
    clearLockout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};