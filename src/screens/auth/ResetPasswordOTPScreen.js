import React, { useState, useRef, useEffect } from 'react';
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

const ResetPasswordOTPScreen = ({ navigation, route }) => {
  const { email } = route.params;
  const { verifyResetOTP, forgotPassword } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    // Start countdown for resend
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all fields are filled
    if (newOtp.every(digit => digit !== '') && value) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode = null) => {
    const codeToVerify = otpCode || otp.join('');
    
    if (codeToVerify.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await verifyResetOTP(email, codeToVerify);
      
      // Navigate to new password screen
      navigation.navigate('NewPassword', {
        email: email
      });
      
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert('Invalid Code', error.message || 'Please check your code and try again');
      
      // Clear OTP fields
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    try {
      await forgotPassword(email);
      
      Alert.alert('Code Sent', 'A new verification code has been sent to your email');
      
      // Reset countdown
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend code. Please try again.');
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
          <Text style={styles.title}>Verify Code</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon and Title */}
          <View style={styles.iconSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.mainTitle}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to
            </Text>
            <Text style={styles.email}>{email}</Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpSection}>
            <Text style={styles.label}>Enter Verification Code</Text>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => inputRefs.current[index] = ref}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                />
              ))}
            </View>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, (otp.join('').length !== 6 || isLoading) && styles.buttonDisabled]}
            onPress={() => handleVerifyOTP()}
            disabled={otp.join('').length !== 6 || isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="small" color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={countdown > 0 || isResending}
            >
              <Text style={[
                styles.resendLink,
                (countdown > 0 || isResending) && styles.resendDisabled
              ]}>
                {isResending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>
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
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  otpSection: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    backgroundColor: colors.surface,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  resendLink: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  resendDisabled: {
    color: colors.textSecondary,
  },
});

export default ResetPasswordOTPScreen;