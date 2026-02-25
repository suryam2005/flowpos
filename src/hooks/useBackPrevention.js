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
 * @param {function} options.onCancel - Callback when user cancels operation (allows navigation)
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
  const allowNavigationRef = useRef(false); // Track if navigation should be allowed
  
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

    if (isActive) {
      // Disable gesture navigation when active - with small delay for activation
      const timeoutId = setTimeout(() => {
        navigation.setOptions({
          gestureEnabled: false,
        });
        console.log('🛡️ Gesture navigation disabled');
      }, 50);

      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      // Re-enable gesture navigation IMMEDIATELY when not active (no delay)
      navigation.setOptions({
        gestureEnabled: true,
      });
      console.log('✅ Gesture navigation enabled');
    }
  }, [isActive, navigation]);

  // Create stable back press handler that reads from refs
  const handleBackPress = useCallback(() => {
    // If navigation was explicitly allowed, let it through
    if (allowNavigationRef.current) {
      allowNavigationRef.current = false; // Reset flag
      return false; // Allow back navigation
    }

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
            onPress: () => {
              // Execute the onCancel callback if provided
              if (cancel && typeof cancel === 'function') {
                cancel();
              }
              // Set flag to allow navigation and trigger back press again
              allowNavigationRef.current = true;
              // Trigger back navigation programmatically
              if (navigation) {
                navigation.goBack();
              }
            }
          }
        ]
      );
      return true; // Prevent back navigation until user chooses
    } else if (hard) {
      // Show a simple message for hard block
      Alert.alert(ttl, msg, [{ text: 'OK', style: 'default' }]);
      return true; // Always prevent back navigation for hard block
    }
    return true; // Always prevent back navigation when active
  }, [navigation]);

  // Handle Android hardware back button
  useEffect(() => {
    // Only add listener when isActive is true and on Android
    if (isActive && Platform.OS === 'android') {
      // Add small delay for activation to handle rapid state changes
      const timeoutId = setTimeout(() => {
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
      }, 50);

      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      // Remove listener IMMEDIATELY when not active (no delay)
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

    // Cleanup listener on unmount
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
  }, [isActive, handleBackPress]);
};

export default useBackPrevention;
