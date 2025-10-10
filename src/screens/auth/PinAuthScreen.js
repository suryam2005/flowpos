import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Vibration,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getItemAsync, deleteItemAsync } from '../../utils/secureStorage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import CustomAlert from '../../components/CustomAlert';
import { colors } from '../../styles/colors';

const PinAuthScreen = ({ navigation, onAuthenticated }) => {
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pinLength, setPinLength] = useState(4); // Default to 4, will be loaded from storage
  
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const lockoutTimer = useRef(null);

  useEffect(() => {
    checkBiometricAvailability();
    loadPinLength();
    
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        // Reset PIN when app becomes active (security measure)
        setPin('');
        // Try biometric authentication again when app becomes active
        if (biometricAvailable) {
          setTimeout(() => {
            handleBiometricAuth(true);
          }, 500);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [biometricAvailable]);

  // Auto-trigger biometric authentication when screen loads
  useEffect(() => {
    if (biometricAvailable) {
      // Small delay to ensure screen is fully loaded
      setTimeout(() => {
        handleBiometricAuth(true);
      }, 1000);
    }
  }, [biometricAvailable]);

  const loadPinLength = async () => {
    try {
      const storedPinLength = await getItemAsync('pinLength');
      if (storedPinLength) {
        setPinLength(parseInt(storedPinLength));
      }
    } catch (error) {
      console.error('Error loading PIN length:', error);
      // Default to 4 if there's an error
      setPinLength(4);
    }
  };

  useEffect(() => {
    if (lockoutTime > 0) {
      lockoutTimer.current = setTimeout(() => {
        setLockoutTime(lockoutTime - 1);
      }, 1000);
    } else if (isLocked && lockoutTime === 0) {
      setIsLocked(false);
      setAttempts(0);
    }

    return () => {
      if (lockoutTimer.current) {
        clearTimeout(lockoutTimer.current);
      }
    };
  }, [lockoutTime, isLocked]);

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const handleBiometricAuth = async (isAutoTrigger = false) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access FlowPOS',
        cancelLabel: 'Use PIN',
        fallbackLabel: 'Use PIN instead',
        disableDeviceFallback: false, // Allow device fallback to PIN/password
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (onAuthenticated) {
          onAuthenticated();
        } else {
          navigation.replace('Main');
        }
      } else if (result.error === 'UserCancel' && isAutoTrigger) {
        // User cancelled auto-triggered biometric, show PIN interface
        // Don't show error, just let them use PIN
      } else if (result.error === 'BiometricUnavailable' || result.error === 'UserFallback') {
        // Biometric failed, user can use PIN
        setAlertConfig({
          title: 'Biometric Authentication Failed',
          message: 'Please enter your PIN to continue.',
          type: 'info',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      if (!isAutoTrigger) {
        setAlertConfig({
          title: 'Authentication Error',
          message: 'Biometric authentication is not available. Please use your PIN.',
          type: 'error',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setShowAlert(true);
      }
    }
  };

  const handleNumberPress = (number) => {
    if (isLocked) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (pin.length < pinLength) {
      const newPin = pin + number;
      setPin(newPin);
      
      // Auto-verify when PIN reaches expected length
      if (newPin.length === pinLength) {
        setTimeout(() => verifyPin(newPin), 100);
      }
    }
  };

  const handleBackspace = () => {
    if (isLocked) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(pin.slice(0, -1));
  };

  const verifyPin = async (pinToVerify = pin) => {
    try {
      const storedPin = await getItemAsync('userPIN');
      
      if (pinToVerify === storedPin) {
        // Successful authentication
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPin('');
        setAttempts(0);
        
        if (onAuthenticated) {
          onAuthenticated();
        } else {
          navigation.replace('Main');
        }
      } else {
        // Failed authentication
        handleFailedAttempt();
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to verify PIN. Please try again.',
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
    }
  };

  const handleFailedAttempt = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setPin('');

    // Shake animation
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();

    Vibration.vibrate(400);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    if (newAttempts >= 5) {
      // Lock out after 5 failed attempts
      setIsLocked(true);
      setLockoutTime(30); // 30 seconds lockout
      
      setAlertConfig({
        title: 'Too Many Attempts',
        message: 'You have entered an incorrect PIN too many times. Please wait 30 seconds before trying again.',
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
    } else {
      setAlertConfig({
        title: 'Incorrect PIN',
        message: `Incorrect PIN. ${5 - newAttempts} attempts remaining.`,
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
    }
  };

  const handleForgotPin = () => {
    setAlertConfig({
      title: 'Reset PIN',
      message: 'To reset your PIN, you will need to clear all app data. This will remove all your products, orders, and settings. Are you sure?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset App', 
          style: 'destructive',
          onPress: resetApp
        }
      ],
    });
    setShowAlert(true);
  };

  const resetApp = async () => {
    try {
      // Clear all stored data
      await deleteItemAsync('userPIN');
      await deleteItemAsync('pinSetupCompleted');
      // Add other data clearing as needed
      
      setAlertConfig({
        title: 'App Reset',
        message: 'App data has been cleared. You will now be taken to the welcome screen.',
        type: 'success',
        buttons: [{ 
          text: 'OK', 
          style: 'default',
          onPress: () => navigation.replace('Welcome')
        }],
      });
      setShowAlert(true);
    } catch (error) {
      console.error('Error resetting app:', error);
    }
  };

  const renderPinDots = () => (
    <View style={styles.pinDotsContainer}>
      {Array.from({ length: pinLength }, (_, index) => (
        <View
          key={index}
          style={[
            styles.pinDot,
            index < pin.length && styles.pinDotFilled
          ]}
        />
      ))}
    </View>
  );

  const renderNumberPad = () => (
    <View style={styles.numberPad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
        <TouchableOpacity
          key={number}
          style={[
            styles.numberButton,
            isLocked && styles.numberButtonDisabled
          ]}
          onPress={() => handleNumberPress(number.toString())}
          disabled={isLocked}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.numberButtonText,
            isLocked && styles.numberButtonTextDisabled
          ]}>
            {number}
          </Text>
        </TouchableOpacity>
      ))}
      
      {biometricAvailable ? (
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => handleBiometricAuth(false)}
          activeOpacity={0.7}
        >
          <Text style={styles.biometricText}>👆</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.numberButton} />
      )}
      
      <TouchableOpacity
        style={[
          styles.numberButton,
          isLocked && styles.numberButtonDisabled
        ]}
        onPress={() => handleNumberPress('0')}
        disabled={isLocked}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.numberButtonText,
          isLocked && styles.numberButtonTextDisabled
        ]}>
          0
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.numberButton,
          isLocked && styles.numberButtonDisabled
        ]}
        onPress={handleBackspace}
        disabled={isLocked}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.backspaceText,
          isLocked && styles.numberButtonTextDisabled
        ]}>
          ⌫
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {biometricAvailable ? 'Authenticate' : 'Enter Your PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {isLocked 
            ? `Too many attempts. Try again in ${lockoutTime}s`
            : biometricAvailable 
              ? 'Use fingerprint or enter your PIN to access FlowPOS'
              : 'Enter your PIN to access FlowPOS'
          }
        </Text>
      </View>

      <Animated.View 
        style={[
          styles.pinContainer,
          { transform: [{ translateX: shakeAnimation }] }
        ]}
      >
        {renderPinDots()}
      </Animated.View>

      {renderNumberPad()}

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.forgotButton}
          onPress={handleForgotPin}
          activeOpacity={0.8}
        >
          <Text style={styles.forgotButtonText}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setShowAlert(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  pinContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numberButtonDisabled: {
    backgroundColor: colors.gray[100],
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  },
  numberButtonTextDisabled: {
    color: colors.text.tertiary,
  },
  backspaceText: {
    fontSize: 24,
    color: colors.text.secondary,
  },
  biometricText: {
    fontSize: 24,
  },
  actionContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  forgotButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  forgotButtonText: {
    fontSize: 16,
    color: colors.primary.main,
    fontWeight: '500',
  },
});

export default PinAuthScreen;