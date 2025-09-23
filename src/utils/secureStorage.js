import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Check if SecureStore is available (not available in web/development)
const isSecureStoreAvailable = async () => {
  try {
    if (Platform.OS === 'web') {
      return false;
    }
    return await SecureStore.isAvailableAsync();
  } catch (error) {
    return false;
  }
};

export const setItemAsync = async (key, value) => {
  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(key, value);
    } else {
      // Fallback to AsyncStorage for web/development
      await AsyncStorage.setItem(`secure_${key}`, value);
    }
  } catch (error) {
    console.error('Error storing secure item:', error);
    // Fallback to AsyncStorage if SecureStore fails
    await AsyncStorage.setItem(`secure_${key}`, value);
  }
};

export const getItemAsync = async (key) => {
  try {
    if (await isSecureStoreAvailable()) {
      return await SecureStore.getItemAsync(key);
    } else {
      // Fallback to AsyncStorage for web/development
      return await AsyncStorage.getItem(`secure_${key}`);
    }
  } catch (error) {
    console.error('Error retrieving secure item:', error);
    // Fallback to AsyncStorage if SecureStore fails
    return await AsyncStorage.getItem(`secure_${key}`);
  }
};

export const deleteItemAsync = async (key) => {
  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(key);
    } else {
      // Fallback to AsyncStorage for web/development
      await AsyncStorage.removeItem(`secure_${key}`);
    }
  } catch (error) {
    console.error('Error deleting secure item:', error);
    // Fallback to AsyncStorage if SecureStore fails
    await AsyncStorage.removeItem(`secure_${key}`);
  }
};