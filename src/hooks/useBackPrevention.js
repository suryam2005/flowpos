import { useEffect, useRef, useCallback } from 'react';
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

  // Use refs to always have the latest values in the callback
  const optionsRef = useRef({ message, title, showAlert, hardBlock, onCancel });
  const listenerRef = useRef(null);
  
  // Update refs when options change
  useEffect(() => {
    optionsRef.current = { message, title, showAlert, hardBlock, onCancel };
  }, [message, title, showAlert, hardBlock, onCancel]);
  
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

    // Add a small delay to handle rapid state changes
    const timeoutId = setTimeout(() => {
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
    }, 50); // Small delay to handle rapid state changes

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isActive, navigation]);

  // Create stable back press handler that reads from refs
  const handleBackPress = useCallback(() => {
    const { message: msg, title: ttl, showAlert: show, hardBlock: hard, onCancel: cancel } = optionsRef.current;
    
    if (show && !hard) {
      Alert.alert(
        ttl,
        msg,
        [
          { text: 'Wait', style: 'cancel' },
          { 
            text: 'Cancel Operation', 
            style: 'destructive', 
            onPress: cancel || (() => {})
          }
        ]
      );
    } else if (hard) {
      // Show a simple message for hard block
      Alert.alert(ttl, msg, [{ text: 'OK', style: 'default' }]);
    }
    return true; // Always prevent back navigation when active
  }, []);

  // Handle Android hardware back button
  useEffect(() => {
    // Add a small delay to handle rapid state changes
    const timeoutId = setTimeout(() => {
      // Only add listener when isActive is true and on Android
      if (isActive && Platform.OS === 'android') {
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
          BackHandler.addEventListener('hardwareBackPress', handleBackPress);
          listenerRef.current = handleBackPress;
          console.log('🛡️ Back prevention activated for:', optionsRef.current.title);
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
    }, 50); // Small delay to handle rapid state changes

    // Cleanup timeout and listener on unmount or dependency change
    return () => {
      clearTimeout(timeoutId);
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
  }, [isActive, handleBackPress]);
};

export default useBackPrevention;
