import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../styles/colors';
import AuthenticationService from '../../services/AuthenticationService';

const PinVerifyScreen = ({ navigation, route }) => {
  const { onSuccess } = route.params || {};
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [biometricType, setBiometricType] = useState('Biometric');

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const type = await AuthenticationService.getBiometricType();
    setBiometricType(type);
    
    const biometricEnabled = await AuthenticationService.isBiometricEnabled();
    
    if (biometricEnabled) {
      tryBiometric();
    }
  };

  const tryBiometric = async () => {
    const result = await AuthenticationService.authenticateWithBiometric();
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleSuccess();
    }
  };

  const handleNumberPress = (number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError('');

    if (pin.length < 6) {
      const newPin = pin + number;
      setPin(newPin);
      
      if (newPin.length === 6) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError('');
    setPin(pin.slice(0, -1));
  };

  const verifyPin = async (pinToVerify) => {
    const result = await AuthenticationService.verifyPin(pinToVerify);
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleSuccess();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate(500);
      setError('Incorrect PIN');
      setPin('');
      setAttempts(attempts + 1);

      if (attempts >= 4) {
        Alert.alert(
          'Too Many Attempts',
          'You have entered an incorrect PIN too many times. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    navigation.goBack();
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {[...Array(6)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
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
      ['biometric', '0', 'back'],
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((item, colIndex) => {
              if (item === 'biometric') {
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={styles.numberButton}
                    onPress={tryBiometric}
                  >
                    <Ionicons name="finger-print" size={28} color={colors.primary.main} />
                  </TouchableOpacity>
                );
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
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Ionicons name="lock-closed" size={48} color={colors.primary.main} />
          <Text style={styles.title}>Enter PIN</Text>
          <Text style={styles.subtitle}>Enter your 6-digit PIN to unlock</Text>
        </View>

        {renderPinDots()}

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}

        {renderNumberPad()}

        <TouchableOpacity
          style={styles.biometricButton}
          onPress={tryBiometric}
        >
          <Ionicons name="finger-print" size={24} color={colors.primary.main} />
          <Text style={styles.biometricText}>Use {biometricType}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 60,
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
    borderColor: colors.gray[300],
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
    marginBottom: 20,
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 40,
  },
  biometricText: {
    fontSize: 16,
    color: colors.primary.main,
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default PinVerifyScreen;
