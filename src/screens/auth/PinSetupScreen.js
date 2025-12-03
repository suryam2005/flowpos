import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../styles/colors';
import AuthenticationService from '../../services/AuthenticationService';

const PinSetupScreen = ({ navigation, route }) => {
  const { mode = 'setup' } = route.params || {}; // 'setup', 'change', 'verify'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(mode === 'change' ? 'verify-old' : 'enter'); // 'verify-old', 'enter', 'confirm'
  const [oldPin, setOldPin] = useState('');
  const [error, setError] = useState('');

  const handleNumberPress = (number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError('');

    if (step === 'verify-old') {
      if (oldPin.length < 6) {
        const newOldPin = oldPin + number;
        setOldPin(newOldPin);
        
        if (newOldPin.length === 6) {
          verifyOldPin(newOldPin);
        }
      }
    } else if (step === 'enter') {
      if (pin.length < 6) {
        const newPin = pin + number;
        setPin(newPin);
        
        if (newPin.length === 6) {
          setStep('confirm');
        }
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 6) {
        const newConfirmPin = confirmPin + number;
        setConfirmPin(newConfirmPin);
        
        if (newConfirmPin.length === 6) {
          verifyAndSavePin(pin, newConfirmPin);
        }
      }
    }
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError('');

    if (step === 'verify-old') {
      setOldPin(oldPin.slice(0, -1));
    } else if (step === 'enter') {
      setPin(pin.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const verifyOldPin = async (pinToVerify) => {
    const result = await AuthenticationService.verifyPin(pinToVerify);
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('enter');
      setOldPin('');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate(500);
      setError('Incorrect PIN');
      setOldPin('');
    }
  };

  const verifyAndSavePin = async (newPin, confirmedPin) => {
    if (newPin !== confirmedPin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate(500);
      setError('PINs do not match');
      setConfirmPin('');
      return;
    }

    const result = await AuthenticationService.setPin(newPin);
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Success',
        'PIN has been set successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error || 'Failed to set PIN');
      setPin('');
      setConfirmPin('');
      setStep('enter');
    }
  };

  const getTitle = () => {
    if (step === 'verify-old') return 'Enter Current PIN';
    if (step === 'enter') return mode === 'change' ? 'Enter New PIN' : 'Create PIN';
    return 'Confirm PIN';
  };

  const getSubtitle = () => {
    if (step === 'verify-old') return 'Enter your current 6-digit PIN';
    if (step === 'enter') return 'Enter a 6-digit PIN';
    return 'Re-enter your PIN to confirm';
  };

  const getCurrentPin = () => {
    if (step === 'verify-old') return oldPin;
    if (step === 'enter') return pin;
    return confirmPin;
  };

  const renderPinDots = () => {
    const currentPin = getCurrentPin();
    return (
      <View style={styles.pinDotsContainer}>
        {[...Array(6)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              currentPin.length > index && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'back'],
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((item, colIndex) => {
              if (item === '') {
                return <View key={colIndex} style={styles.numberButton} />;
              }
              
              if (item === 'back') {
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={styles.numberButton}
                    onPress={handleBackspace}
                  >
                    <Ionicons name="backspace-outline" size={28} color={colors.text.primary} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={colIndex}
                  style={styles.numberButton}
                  onPress={() => handleNumberPress(item)}
                >
                  <Text style={styles.numberText}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Ionicons name="lock-closed" size={48} color={colors.primary.main} />
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </View>

        {renderPinDots()}

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}

        {renderNumberPad()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gray['300'],
    marginHorizontal: 8,
  },
  pinDotFilled: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  errorText: {
    fontSize: 14,
    color: colors.error.main,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorPlaceholder: {
    height: 34,
  },
  numberPad: {
    marginBottom: 40,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numberText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default PinSetupScreen;
