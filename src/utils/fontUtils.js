import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getAppleFontFamily = async () => {
  try {
    const useAppleFont = await AsyncStorage.getItem('useAppleFont');
    if (useAppleFont && JSON.parse(useAppleFont)) {
      return Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto';
    }
    return Platform.OS === 'ios' ? 'System' : 'Roboto';
  } catch (error) {
    return Platform.OS === 'ios' ? 'System' : 'Roboto';
  }
};

export const applyAppleFontStyles = (useAppleFont) => {
  if (useAppleFont && Platform.OS === 'ios') {
    return {
      fontFamily: 'SF Pro Display',
    };
  }
  return {};
};