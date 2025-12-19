import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';
import { colors } from '../styles/colors';

const LoadingOverlay = ({ 
  visible = false, 
  message = 'Updating...', 
  transparent = true 
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={transparent}
      animationType="fade"
      visible={visible}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator 
            size="large" 
            color={colors.primary.main}
            style={styles.spinner}
          />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Blur effect
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.shadow.default,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 120,
  },
  spinner: {
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LoadingOverlay;