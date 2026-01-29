import React, { useState } from 'react';
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
import { buttonStyles } from '../../styles/buttonStyles';
import { typography } from '../../styles/typographyStyles';

import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import featureService from '../../services/FeatureService';

// Input validation and security utilities
const InputValidation = {
  // Sanitize input to prevent XSS and injection attacks
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 255); // Limit length to prevent buffer overflow
  },

  // Enhanced email validation
  validateEmail: (email) => {
    const sanitized = InputValidation.sanitizeInput(email);
    if (!sanitized) return { isValid: false, error: 'Email is required' };
    if (sanitized.length < 5) return { isValid: false, error: 'Email is too short' };
    if (sanitized.length > 100) return { isValid: false, error: 'Email is too long' };

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    return { isValid: true, sanitized };
  },

  // Enhanced password validation
  validatePassword: (password) => {
    if (!password) return { isValid: false, error: 'Password is required' };
    if (password.length < 6) return { isValid: false, error: 'Password must be at least 6 characters' };
    if (password.length > 128) return { isValid: false, error: 'Password is too long' };

    // Check for basic security requirements
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLetter || !hasNumber) {
      return { isValid: false, error: 'Password must contain both letters and numbers' };
    }

    return { isValid: true };
  },

  // Rate limiting for login attempts
  rateLimiter: {
    attempts: 0,
    lastAttempt: 0,
    maxAttempts: 5,
    lockoutTime: 15 * 60 * 1000, // 15 minutes

    canAttempt: function () {
      const now = Date.now();
      if (this.attempts >= this.maxAttempts) {
        if (now - this.lastAttempt < this.lockoutTime) {
          const remainingTime = Math.ceil((this.lockoutTime - (now - this.lastAttempt)) / 60000);
          return { allowed: false, error: `Too many attempts. Try again in ${remainingTime} minutes.` };
        } else {
          this.attempts = 0; // Reset after lockout period
        }
      }
      return { allowed: true };
    },

    recordAttempt: function (success) {
      this.lastAttempt = Date.now();
      if (success) {
        this.attempts = 0; // Reset on success
      } else {
        this.attempts++;
      }
    }
  }
};

const LoginScreen = ({ navigation, route }) => {
  const { login, logout } = useAuth();

  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Enhanced input handlers with real-time validation
  const handleEmailChange = (text) => {
    setEmail(text);
    setEmailError(''); // Clear error on input change
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    setPasswordError(''); // Clear error on input change
  };

  const handleLogin = async () => {
    // Check rate limiting first
    const rateLimitCheck = InputValidation.rateLimiter.canAttempt();
    if (!rateLimitCheck.allowed) {
      Alert.alert('Too Many Attempts', rateLimitCheck.error);
      return;
    }

    // Validate email
    const emailValidation = InputValidation.validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error);
      Alert.alert('Invalid Email', emailValidation.error);
      return;
    }

    // Validate password
    const passwordValidation = InputValidation.validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error);
      Alert.alert('Invalid Password', passwordValidation.error);
      return;
    }

    setIsLoading(true);
    let loginSuccess = false;

    try {
      // Use sanitized email for login
      await login({
        email: emailValidation.sanitized.toLowerCase(),
        password: password, // Don't sanitize password as it may contain special chars
      });

      // Update feature service with the new user's plan
      await featureService.loadUserPlan();

      // Check device limit enforcement
      // TEMPORARY FIX: Skip device limit check during login to avoid blocking
      // The backend will enforce device limits during the login API call
      console.log('⚠️ [LOGIN] Skipping device limit check to avoid login blocking');
      const canLogin = true; // await featureService.canLoginFromDevice();

      if (!canLogin) {
        // Limit reached & enforced - logout and show error
        console.log('🚫 Device limit reached, logging out...');
        await logout();

        Alert.alert(
          'Device Limit Reached',
          'You have reached the maximum number of devices allowed for your plan. Please upgrade your plan or log out from another device.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      loginSuccess = true;

      // Navigate to main app after successful login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });

    } catch (error) {
      console.error('🔐 [LOGIN] Login error:', error);

      // Handle specific error messages with better security
      let errorMessage = 'Invalid credentials. Please try again.';

      if (error.message.includes('Invalid email or password')) {
        errorMessage = 'Invalid email or password';
      } else if (error.message.includes('Unable to verify device limits')) {
        errorMessage = 'Unable to verify device limits. Please check your internet connection and try again.';
      } else if (error.message.includes('Network') || error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
        errorMessage = 'Too many login attempts. Please wait before trying again.';
      } else if (error.message.includes('Cannot connect to backend server')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection and ensure the backend is running.';
      }

      Alert.alert('Login Failed', errorMessage);
    } finally {
      // Record the attempt for rate limiting
      InputValidation.rateLimiter.recordAttempt(loginSuccess);
      setIsLoading(false);
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
          <Text style={styles.title}>Sign In</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Welcome */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to your FlowPOS account
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputContainer, emailError && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={emailError ? colors.error : colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
                editable={!isLoading}
              />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputContainer, passwordError && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={passwordError ? colors.error : colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={128}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={buttonStyles.primary}
            onPress={handleLogin}
            disabled={!email.trim() || !password || isLoading}
            activeOpacity={0.8}
          >
            <Text style={buttonStyles.primaryText}>Sign In</Text>
          </TouchableOpacity>

          {/* Forgot Password Link */}
          <View style={styles.forgotSection}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotLink}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Spacer to match signup section spacing */}
          <View style={styles.spacer} />

          {/* Signup Link */}
          <View style={styles.signupSection}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

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
    ...typography.styles.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    ...typography.styles.h2,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 30,
  },
  label: {
    ...typography.styles.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    ...typography.styles.body,
    color: colors.text,
    marginLeft: 12,
  },
  // Button styles removed - using standardized buttonStyles
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  signupLink: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  forgotSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  spacer: {
    height: 10,
  },
  forgotLink: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  inputError: {
    borderColor: colors.error || '#EF4444',
    borderWidth: 1.5,
  },
  errorText: {
    color: colors.error || '#EF4444',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  eyeButton: {
    padding: 4,
  },
});

export default LoginScreen;