import React from 'react';
import { View, ActivityIndicator, Modal } from 'react-native';
import { colors } from '../styles/colors';

/**
 * Simple loading overlay with Modal wrapper
 * - Clean design like RefreshControl
 * - No text, no cards, just spinner
 * - Blurred background prevents interaction
 */
const LoadingOverlay = ({ visible = false }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      statusBarTranslucent={true}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Blur effect
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <ActivityIndicator 
          size="large" 
          color={colors.primary.main}
        />
      </View>
    </Modal>
  );
};

export default LoadingOverlay;