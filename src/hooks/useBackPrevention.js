import { useEffect, useRef } from 'react';
import { BackHandler, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * Hook to prevent back navigation during critical operations
 * Handles both Android hardware back button AND gesture navigation
 * Only activates when isActive is true, removes when false
 * @param {boolean} isActive - Whether back prevention is active
 * @param {object} options - Configuration options
 * @param {string} options.message - Message to show in alert
 * @param {string} options.title - Alert title
 * @param {boolean} options.showAlert - Whether to show confirmation alert
 * @param {boolean} options.hardBlock - Whether to block without confirmation
 * @param {function} options.onCancel - Callback when user cancels operation
 */
export const useBackPrevention = (isActive, options = {}) => {
  const {
    message = 'Operation in progress. Please wait...',
    title = 'Please Wait',
    showAlert = true,
    hardBlock = false,
    onCancel
  } = options;

  const listenerRef = useRef(null);
  
  // Get navigation object for gesture prevention
  let navigation = null;
  try {
    navigation = useNavigation();
  } catch (e) {
    // Hook called outside navigation context, skip gesture prevention
  }

  // Handle gesture navigation prevention
  useEffect(() => {
    if (!navigation) return;

    if (isActive) {
      // Disable gesture navigation when active
      navigation.setOptions({
        gestureEnabled: false,
      });
      console.log('🛡️ Gesture navigation disabled');
    } else {
      // Re-enable gesture navigation when not active
      navigation.setOptions({
        gestureEnabled: true,
      });
      console.log('✅ Gesture navigation enabled');
    }
  }, [isActive, navigation]);

  // Handle Android hardware back button
  useEffect(() => {
    // Only add listener when isActive is true and on Android
    if (isActive && Platform.OS === 'android') {
      const onBackPress = () => {
        if (showAlert && !hardBlock) {
          Alert.alert(
            title,
            message,
            [
              { text: 'Wait', style: 'cancel' },
              { 
                text: 'Cancel Operation', 
                style: 'destructive', 
                onPress: onCancel || (() => {})
              }
            ]
          );
        } else if (hardBlock) {
          // Show a simple message for hard block
          Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
        }
        return true; // Always prevent back navigation when active
      };

      // Remove existing listener if any (with error handling)
      if (listenerRef.current) {
        try {
          BackHandler.removeEventListener('hardwareBackPress', listenerRef.current);
        } catch (error) {
          console.warn('🛡️ [useBackPrevention] Error removing existing listener:', error.message);
        }
      }

      // Add new listener (with error handling)
      try {
        BackHandler.addEventListener('hardwareBackPress', onBackPress);
        listenerRef.current = onBackPress;
        console.log('🛡️ Back prevention activated');
      } catch (error) {
        console.error('🛡️ [useBackPrevention] Error adding back handler:', error.message);
        listenerRef.current = null;
      }
    } else {
      // Remove listener when not active (with error handling)
      if (listenerRef.current) {
        try {
          BackHandler.removeEventListener('hardwareBackPress', listenerRef.current);
          listenerRef.current = null;
          console.log('✅ Back prevention deactivated');
        } catch (error) {
          console.warn('🛡️ [useBackPrevention] Error removing listener:', error.message);
          listenerRef.current = null; // Clear reference anyway
        }
      }
    }

    // Cleanup on unmount (with error handling)
    return () => {
      if (listenerRef.current) {
        try {
          BackHandler.removeEventListener('hardwareBackPress', listenerRef.current);
        } catch (error) {
          console.warn('🛡️ [useBackPrevention] Error during cleanup:', error.message);
        } finally {
          listenerRef.current = null;
        }
      }
    };
  }, [isActive, message, title, showAlert, hardBlock, onCancel]);
};

export default useBackPrevention;