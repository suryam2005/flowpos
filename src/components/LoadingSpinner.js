import React from 'react';
import { View, ActivityIndicator, Modal } from 'react-native';
import { colors } from '../styles/colors';

/**
 * Enhanced loading overlay with Modal wrapper
 * - Uses Modal to ensure it's ALWAYS on top of everything including other modals
 * - Larger spinner for better visibility
 * - Full background blur for complete focus
 * - Prevents all user interaction
 */
const LoadingSpinner = ({ visible = true }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      statusBarTranslucent={true}
      onRequestClose={() => {}} // Prevent closing
    >
      <View 
        style={{
          flex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.95)', // Stronger blur effect
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)', // Light blue background
          borderRadius: 16,
          padding: 24,
        }}>
          <ActivityIndicator 
            size={48} // Custom larger size
            color={colors.primary.main}
          />
        </View>
      </View>
    </Modal>
  );
};

export default LoadingSpinner;