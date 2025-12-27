import React from 'react';
import { View, ActivityIndicator, Modal, Text } from 'react-native';
import { colors } from '../styles/colors';

/**
 * Enhanced loading overlay with Modal wrapper
 * - Uses Modal to ensure it's on top of everything
 * - Prevents all user interaction including back button
 * - Optional message display
 * - Configurable back button prevention
 */
const LoadingOverlay = ({ visible = false, message = null, preventBack = true }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      statusBarTranslucent={true}
      onRequestClose={preventBack ? () => {} : undefined} // Prevent back button when needed
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.9)', // Stronger blur effect
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)', // Light blue background
          borderRadius: 16,
          padding: 24,
          alignItems: 'center',
        }}>
          <ActivityIndicator 
            size="large" 
            color={colors.primary.main}
          />
          {message && (
            <Text style={{
              marginTop: 16,
              fontSize: 16,
              color: colors.text.primary,
              textAlign: 'center',
              fontWeight: '500',
            }}>
              {message}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default LoadingOverlay;