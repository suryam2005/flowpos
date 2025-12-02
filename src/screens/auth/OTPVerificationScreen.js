import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authColors as colors } from '../../styles/authColors';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const OTPVerificationScreen = ({ navigation, route }) => {
  const { email, name, phone } = route.params;
  const { verifyOTP, resendOTP } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (value && index === 5 && newOtp.every(digit => digit !== '')) {
      handleVerification(newOtp.join(''));
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerification = async (otpCode = null) => {
    const codeToVerify = otpCode || otp.join('');
    
    if (codeToVerify.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      // Verify OTP with backend
      const response = await verifyOTP(email, codeToVerify);
      
      // Navigate to password setup after successful verification
      navigation.navigate('PasswordSetup', {
        email: email,
        name: name,
        phone: phone
      });
      
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert(
        'Verification Failed', 
        error.message || 'Invalid verification code. Please try again.'
      );
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      // Resend OTP via backend
      await resendOTP(email);
      
      Alert.alert('Code Sent! 📧', 'A new verification code has been sent to your email');
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']); // Clear current OTP
      inputRefs.current[0]?.focus(); // Focus first input
      
      // Restart countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Resend error:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to resend verification code. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Verify Email</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={60} color={colors.primary} />
          </View>

          {/* Title and Description */}
          <Text style={styles.mainTitle}>Check your email</Text>
          <Text style={styles.description}>
            We've sent a 6-digit verification code to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputRefs.current[index] = ref}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled,
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(index, value)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (isLoading || otp.join('').length !== 6) && styles.buttonDisabled
            ]}
            onPress={() => handleVerification()}
            disabled={isLoading || otp.join('').length !== 6}
          >
            {isLoading ? (
              <LoadingSpinner size="small" color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResendOtp} disabled={isResending}>
                {isResending ? (
                  <LoadingSpinner size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.resendLink}>Resend Code</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.countdownText}>
                Resend in {countdown}s
              </Text>
            )}
          </View>

          {/* Help Text */}
          <Text style={styles.helpText}>
            Make sure to check your spam folder if you don't see the email
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  emailText: {
    color: colors.primary,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surface,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  resendLink: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  countdownText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});

export default OTPVerificationScreen;