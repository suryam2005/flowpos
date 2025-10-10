import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setItemAsync, getItemAsync } from '../../utils/secureStorage';
import * as Haptics from 'expo-haptics';
import CustomAlert from '../../components/CustomAlert';
import { safeGoBack, safeReplace } from '../../utils/navigationUtils';

const PinSetupScreen = ({ navigation, route }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(1); // 1: setup, 2: confirm
  const [pinLength, setPinLength] = useState(4); // Default to 4 digits
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const isFirstTime = route?.params?.isFirstTime || false;
  const isChangingPin = route?.params?.isChangingPin || false;

  const handleNumberPress = (number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (step === 1) {
      if (pin.length < pinLength) {
        setPin(pin + number);
      }
    } else {
      if (confirmPin.length < pinLength) {
        setConfirmPin(confirmPin + number);
      }
    }
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (step === 1) {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handleContinue = () => {
    if (step === 1) {
      if (pin.length < pinLength) {
        setAlertConfig({
          title: 'Invalid PIN',
          message: `PIN must be ${pinLength} digits long.`,
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setShowAlert(true);
        return;
      }
      setStep(2);
    } else {
      if (pin !== confirmPin) {
        // Shake animation for mismatch
        Animated.sequence([
          Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start();

        Vibration.vibrate(400);
        setConfirmPin('');
        
        setAlertConfig({
          title: 'PIN Mismatch',
          message: 'PINs do not match. Please try again.',
          type: 'error',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setShowAlert(true);
        return;
      }
      
      // Check if changing PIN and new PIN is same as old PIN
      if (isChangingPin) {
        checkAndSavePIN();
      } else {
        savePIN();
      }
    }
  };

  const checkAndSavePIN = async () => {
    try {
      const currentPin = await getItemAsync('userPIN');
      if (currentPin && pin === currentPin) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        setAlertConfig({
          title: 'Same PIN Error',
          message: 'Your new PIN cannot be the same as your current PIN. Please choose a different PIN.',
          type: 'error',
          buttons: [{ 
            text: 'Try Again', 
            style: 'default',
            onPress: () => {
              setStep(1);
              setPin('');
              setConfirmPin('');
            }
          }],
        });
        setShowAlert(true);
        return;
      }
      
      savePIN();
    } catch (error) {
      console.error('Error checking current PIN:', error);
      // If there's an error checking, proceed with saving (fallback)
      savePIN();
    }
  };

  const savePIN = async () => {
    try {
      await setItemAsync('userPIN', pin);
      await setItemAsync('pinLength', pinLength.toString());
      await setItemAsync('pinSetupCompleted', 'true');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setAlertConfig({
        title: isChangingPin ? 'PIN Changed Successfully' : 'PIN Setup Complete',
        message: isChangingPin 
          ? 'Your PIN has been updated successfully. Use your new PIN to access the app.'
          : 'Your PIN has been set successfully. You can now use it to secure your app.',
        type: 'success',
        buttons: [{ 
          text: 'Continue', 
          style: 'default',
          onPress: () => {
            if (isFirstTime) {
              safeReplace(navigation, 'Main');
            } else if (isChangingPin) {
              // Go back to Settings after PIN change
              navigation.navigate('Settings');
            } else {
              safeGoBack(navigation, 'Main');
            }
          }
        }],
      });
      setShowAlert(true);
    } catch (error) {
      console.error('Error saving PIN:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to save PIN. Please try again.',
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
    }
  };

  const handleSkipPin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setAlertConfig({
      title: 'Skip PIN Setup?',
      message: 'You can set up a PIN later in Settings for added security. Are you sure you want to skip this step?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'default',
          onPress: async () => {
            try {
              // Mark PIN setup as skipped (not completed)
              await setItemAsync('pinSetupSkipped', 'true');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              safeReplace(navigation, 'Main');
            } catch (error) {
              console.error('Error skipping PIN setup:', error);
              safeReplace(navigation, 'Main');
            }
          }
        }
      ],
    });
    setShowAlert(true);
  };

  const renderPinDots = (currentPin) => (
    <View style={styles.pinDotsContainer}>
      {Array.from({ length: pinLength }, (_, index) => (
        <View
          key={index}
          style={[
            styles.pinDot,
            index < currentPin.length && styles.pinDotFilled
          ]}
        />
      ))}
    </View>
  );

  const renderPinLengthSelector = () => (
    <View style={styles.pinLengthContainer}>
      <Text style={styles.pinLengthLabel}>PIN Length</Text>
      <View style={styles.pinLengthOptions}>
        <TouchableOpacity
          style={[
            styles.pinLengthOption,
            pinLength === 4 && styles.pinLengthOptionSelected
          ]}
          onPress={() => {
            setPinLength(4);
            setPin('');
            setConfirmPin('');
          }}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.pinLengthOptionText,
            pinLength === 4 && styles.pinLengthOptionTextSelected
          ]}>
            4 Digits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.pinLengthOption,
            pinLength === 5 && styles.pinLengthOptionSelected
          ]}
          onPress={() => {
            setPinLength(5);
            setPin('');
            setConfirmPin('');
          }}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.pinLengthOptionText,
            pinLength === 5 && styles.pinLengthOptionTextSelected
          ]}>
            5 Digits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.pinLengthOption,
            pinLength === 6 && styles.pinLengthOptionSelected
          ]}
          onPress={() => {
            setPinLength(6);
            setPin('');
            setConfirmPin('');
          }}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.pinLengthOptionText,
            pinLength === 6 && styles.pinLengthOptionTextSelected
          ]}>
            6 Digits
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNumberPad = () => (
    <View style={styles.numberPad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
        <TouchableOpacity
          key={number}
          style={styles.numberButton}
          onPress={() => handleNumberPress(number.toString())}
          activeOpacity={0.7}
        >
          <Text style={styles.numberButtonText}>{number}</Text>
        </TouchableOpacity>
      ))}
      
      <View style={styles.numberButton} />
      
      <TouchableOpacity
        style={styles.numberButton}
        onPress={() => handleNumberPress('0')}
        activeOpacity={0.7}
      >
        <Text style={styles.numberButtonText}>0</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.numberButton}
        onPress={handleBackspace}
        activeOpacity={0.7}
      >
        <Text style={styles.backspaceText}>⌫</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, step === 2 && styles.headerStep2]}>
        <Text style={styles.title}>
          {step === 1 
            ? (isChangingPin ? 'Change Your PIN' : 'Set Your PIN')
            : 'Confirm Your PIN'
          }
        </Text>
        <Text style={styles.subtitle}>
          {step === 1 
            ? (isChangingPin 
                ? 'Create a new secure PIN for your FlowPOS app'
                : 'Create a secure PIN to protect your FlowPOS app'
              )
            : 'Enter your PIN again to confirm'
          }
        </Text>
      </View>

      <View style={styles.selectorContainer}>
        {step === 1 ? renderPinLengthSelector() : <View style={styles.spacer} />}
      </View>

      <Animated.View 
        style={[
          styles.pinContainer,
          { transform: [{ translateX: shakeAnimation }] }
        ]}
      >
        {renderPinDots(step === 1 ? pin : confirmPin)}
      </Animated.View>

      {renderNumberPad()}

      <View style={styles.actionContainer}>
        {step === 2 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setStep(1);
              setConfirmPin('');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.continueButton,
            ((step === 1 && pin.length < pinLength) || (step === 2 && confirmPin.length < pinLength)) && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={(step === 1 && pin.length < pinLength) || (step === 2 && confirmPin.length < pinLength)}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.continueButtonText,
            ((step === 1 && pin.length < pinLength) || (step === 2 && confirmPin.length < pinLength)) && styles.continueButtonTextDisabled
          ]}>
            {step === 1 ? 'Continue' : 'Set PIN'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Skip PIN option for first-time setup */}
      {isFirstTime && !isChangingPin && (
        <View style={styles.skipContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipPin}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Skip PIN Setup</Text>
          </TouchableOpacity>
          <Text style={styles.skipDescription}>
            You can set up a PIN later in Settings for added security
          </Text>
        </View>
      )}

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
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerStep2: {
    paddingTop: 120, // Extra space above "Confirm Your PIN"
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
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
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginBottom: 15,
  },
  numberButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numberButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  backspaceText: {
    fontSize: 20,
    color: '#6b7280',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 10,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  continueButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  continueButtonTextDisabled: {
    color: '#ffffff',
  },
  selectorContainer: {
    minHeight: 80, // Fixed height to maintain consistent spacing
  },
  spacer: {
    height: 80, // Same height as PIN length selector
  },
  pinLengthContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  pinLengthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  pinLengthOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pinLengthOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pinLengthOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  pinLengthOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  pinLengthOptionTextSelected: {
    color: '#2563eb',
  },
  skipContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
    marginTop: 10,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  skipDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default PinSetupScreen;