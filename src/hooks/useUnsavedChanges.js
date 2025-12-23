import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * Hook to warn users about unsaved changes before navigation
 * @param {boolean} hasChanges - Whether there are unsaved changes
 * @param {string} message - Custom message to show
 * @param {function} onDiscard - Callback when user discards changes
 */
export const useUnsavedChanges = (hasChanges, message, onDiscard) => {
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasChanges) {
        return; // Allow navigation if no changes
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      Alert.alert(
        'Discard Changes?',
        message || 'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: "Don't leave", style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive', 
            onPress: () => {
              // Call onDiscard callback if provided
              if (onDiscard) {
                onDiscard();
              }
              // Continue with the navigation action
              navigation.dispatch(e.data.action);
            }
          }
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasChanges, message, onDiscard]);
};

export default useUnsavedChanges;