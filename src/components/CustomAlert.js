import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { colors } from '../styles/colors';
import AlertQueueManager from '../services/AlertQueueManager';

// Singleton instance of AlertQueueManager shared across all CustomAlert instances
const alertQueueManager = new AlertQueueManager();

const CustomAlert = ({ 
  visible, 
  title, 
  message, 
  buttons = [], 
  onClose,
  type = 'default' // default, success, warning, error
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const [currentAlert, setCurrentAlert] = React.useState(null);
  const [isVisible, setIsVisible] = React.useState(false);

  // Update current alert from queue
  React.useEffect(() => {
    const updateAlert = () => {
      const alert = alertQueueManager.getCurrentAlert();
      setCurrentAlert(alert);
      setIsVisible(!!alert);
    };

    // Initial update
    updateAlert();

    // Poll for queue changes (simple approach)
    const interval = setInterval(updateAlert, 100);

    return () => clearInterval(interval);
  }, []);

  // Handle external visible prop by enqueueing alerts
  React.useEffect(() => {
    if (visible && title) {
      alertQueueManager.enqueue({
        title,
        message,
        type,
        buttons
      });
    }
  }, [visible, title, message, type, buttons]);

  // Animate alert appearance
  React.useEffect(() => {
    if (isVisible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [isVisible, scaleAnim]);

  // Use current alert from queue or fallback to props
  const displayTitle = currentAlert?.title || title;
  const displayMessage = currentAlert?.message || message;
  const displayType = currentAlert?.type || type;
  const displayButtons = currentAlert?.buttons || buttons;

  const getTypeStylesForType = (alertType) => {
    switch (alertType) {
      case 'success':
        return {
          icon: '✅',
          iconBg: '#d1fae5',
          iconColor: colors.success.main,
        };
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: '#fef3c7',
          iconColor: '#f59e0b',
        };
      case 'error':
        return {
          icon: '❌',
          iconBg: '#fee2e2',
          iconColor: colors.error.main,
        };
      default:
        return {
          icon: 'ℹ️',
          iconBg: '#dbeafe',
          iconColor: colors.primary.main,
        };
    }
  };

  const typeStyles = getTypeStylesForType(displayType);

  const handleButtonPress = (button) => {
    // Execute button's onPress handler if provided
    if (button.onPress) {
      button.onPress();
    }

    // Dequeue current alert and show next
    alertQueueManager.dequeue();
    
    // Call external onClose if provided
    if (onClose) {
      onClose();
    }
  };

  const handleClose = () => {
    // Dequeue current alert and show next
    alertQueueManager.dequeue();
    
    // Call external onClose if provided
    if (onClose) {
      onClose();
    }
  };

  // Don't render if no alert is visible
  if (!isVisible && !currentAlert) {
    return null;
  }

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.alertContainer,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: typeStyles.iconBg }]}>
            <Text style={styles.icon}>{typeStyles.icon}</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{displayTitle}</Text>
            {displayMessage && <Text style={styles.message}>{displayMessage}</Text>}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {displayButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'destructive' && styles.destructiveButton,
                  button.style === 'cancel' && styles.cancelButton,
                  displayButtons.length === 1 && styles.singleButton,
                  index === 0 && displayButtons.length > 1 && styles.firstButton,
                  index === displayButtons.length - 1 && displayButtons.length > 1 && styles.lastButton,
                ]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.buttonText,
                  button.style === 'destructive' && styles.destructiveButtonText,
                  button.style === 'cancel' && styles.cancelButtonText,
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertContainer: {
    backgroundColor: colors.background.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: colors.primary.main,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  singleButton: {
    marginBottom: 0,
  },
  firstButton: {
    marginBottom: 8,
  },
  lastButton: {
    marginBottom: 0,
  },
  cancelButton: {
    backgroundColor: colors.gray['100'],
  },
  destructiveButton: {
    backgroundColor: colors.error.main,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  cancelButtonText: {
    color: colors.text.secondary,
  },
  destructiveButtonText: {
    color: colors.background.surface,
  },
});

// Export the singleton AlertQueueManager instance for use by other components
export { alertQueueManager };

export default CustomAlert;