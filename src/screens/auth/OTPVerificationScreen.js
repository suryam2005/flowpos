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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authColors as colors } from '../../styles/authColors';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useBackPrevention } from '../../hooks/useBackPrevention';

const OTPVerificationScreen = ({ navigation, route }) => {
  const { email, name, phone } = route.params;
  const { verifyOTP, resendOTP } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(180); // 3 minutes = 180 seconds
  const [resendAttempts, setResendAttempts] = useState(0);
  const [maxAttempts] = useState(3);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false); // Track if OTP is verified
  
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  // Back prevention - active until OTP is verified
  useBackPrevention(!isVerified, {
    title: 'OTP Verification in Progress',
    message: 'Please complete the OTP verification to continue. Going back will cancel the signup process.',
    showAlert: true,
    hardBlock: false,
  });

  // Single unified timer with expiry handling
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Only start timer if countdown is greater than 0
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Timer expired
            setShowExpiryModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup on unmount or when countdown changes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [countdown]);

  // Format timer display (MM:SS)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      // Mark as verified IMMEDIATELY when verification starts to disable back prevention
      setIsVerified(true);
      
      // Verify OTP with backend
      await verifyOTP(email, codeToVerify);
      
      // Navigate to password setup after successful verification
      navigation.navigate('PasswordSetup', {
        email: email,
        name: name,
        phone: phone
      });
      
    } catch (error) {
      console.error('Verification error:', error);
      
      // Re-enable back prevention if verification fails
      setIsVerified(false);
      
      Alert.alert('Invalid Code', error.message || 'Please check your code and try again');
      
      // Clear OTP fields
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resendAttempts >= maxAttempts || isResending) return;
    
    setIsResending(true);
    try {
      await resendOTP(email);
      
      // Increment attempt counter
      const newAttempts = resendAttempts + 1;
      setResendAttempts(newAttempts);
      
      // Reset countdown to 3 minutes (this will trigger the timer useEffect)
      setCountdown(180);
      setShowExpiryModal(false);
      
      Alert.alert(
        'Code Sent', 
        `A new verification code has been sent to your email. Attempts remaining: ${maxAttempts - newAttempts}`
      );
      
    } catch (error) {
      console.error('Resend error:', error);
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
          <View style={styles.placeholder} />
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

          {/* Timer Display Section */}
          <View style={styles.timerSection}>
            <Text style={styles.timerLabel}>Code expires in:</Text>
            <Text style={styles.timerDisplay}>{formatTime(countdown)}</Text>
            
            {/* Progress Bar */}
            <View style={styles.timerProgressContainer}>
              <View 
                style={[
                  styles.timerProgress, 
                  { width: `${(countdown / 180) * 100}%` }
                ]} 
              />
            </View>
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

          {/* Verify Button - Always active, validation on press */}
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => handleVerification()}
            disabled={isLoading}
          >
            <Text style={styles.verifyButtonText}>Verify & Continue</Text>
          </TouchableOpacity>

          {/* Resend Section with Attempt Counter */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={countdown > 0 || isResending || resendAttempts >= maxAttempts}
            >
              <Text style={[
                styles.resendLink,
                (countdown > 0 || isResending || resendAttempts >= maxAttempts) && styles.resendDisabled
              ]}>
                {isResending ? 'Sending...' : 
                 countdown > 0 ? 'Resend' : 
                 resendAttempts >= maxAttempts ? 'Max attempts reached' : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Attempt Counter */}
          {resendAttempts > 0 && (
            <Text style={styles.attemptCounter}>
              Resend attempts: {resendAttempts}/{maxAttempts}
            </Text>
          )}

          {/* Help Text */}
          <Text style={styles.helpText}>
            Make sure to check your spam folder if you don't see the email
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Timer Expiry Modal */}
      {showExpiryModal && (
        <Modal
          visible={showExpiryModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.expiryModal}>
              <Ionicons name="time-outline" size={48} color={colors.warning} />
              <Text style={styles.expiryTitle}>Code Expired</Text>
              <Text style={styles.expiryMessage}>
                Your verification code has expired. You can request a new code or go back to try again.
              </Text>
              
              <View style={styles.expiryActions}>
                <TouchableOpacity
                  style={styles.expiryBackButton}
                  onPress={() => {
                    setShowExpiryModal(false);
                    navigation.goBack();
                  }}
                >
                  <Text style={styles.expiryBackText}>Go Back</Text>
                </TouchableOpacity>
                
                {resendAttempts < maxAttempts ? (
                  <TouchableOpacity
                    style={styles.expiryResendButton}
                    onPress={() => handleResendOtp()}
                    disabled={isResending}
                  >
                    <Text style={styles.expiryResendText}>
                      {isResending ? 'Sending...' : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.expiryBackButton}
                    onPress={() => {
                      setShowExpiryModal(false);
                      navigation.goBack();
                    }}
                  >
                    <Text style={styles.expiryBackText}>Max Attempts Reached</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}
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
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  attemptCounter: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  timerLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  timerDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  timerProgressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerProgress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  expiryModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  expiryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  expiryMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  expiryActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  expiryBackButton: {
    flex: 1,
    backgroundColor: colors.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  expiryBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  expiryResendButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  expiryResendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
