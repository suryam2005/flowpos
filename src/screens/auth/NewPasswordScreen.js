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
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const NewPasswordScreen = ({ navigation, route }) => {
  const { email } = route.params;
  const { resetPassword } = useAuth();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleResetPassword = async () => {
    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      Alert.alert('Invalid Password', passwordError);
      return;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email, formData.password);
      
      Alert.alert(
        'Password Reset Successful',
        'Your password has been reset successfully. You are now logged in.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to main app
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    return strength;
  };

  const getStrengthColor = (strength) => {
    if (strength < 2) return '#ef4444';
    if (strength < 4) return '#f59e0b';
    return '#10b981';
  };

  const getStrengthText = (strength) => {
    if (strength < 2) return 'Weak';
    if (strength < 4) return 'Medium';
    return 'Strong';
  };

  const passwordStrength = getPasswordStrength(formData.password);

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
          <Text style={styles.title}>New Password</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon and Title */}
          <View style={styles.iconSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.mainTitle}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Your new password must be different from your previous password
            </Text>
          </View>

          {/* Password Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                value={formData.password}
                onChangeText={(value) => updateField('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            
            {/* Password Strength Indicator */}
            {formData.password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${(passwordStrength / 5) * 100}%`,
                        backgroundColor: getStrengthColor(passwordStrength),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthText, { color: getStrengthColor(passwordStrength) }]}>
                  {getStrengthText(passwordStrength)}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsSection}>
            <Text style={styles.requirementsTitle}>Password must contain:</Text>
            <View style={styles.requirement}>
              <Ionicons
                name={formData.password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={formData.password.length >= 8 ? '#10b981' : colors.textSecondary}
              />
              <Text style={styles.requirementText}>At least 8 characters</Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons
                name={/[A-Z]/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={/[A-Z]/.test(formData.password) ? '#10b981' : colors.textSecondary}
              />
              <Text style={styles.requirementText}>One uppercase letter</Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons
                name={/\d/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={/\d/.test(formData.password) ? '#10b981' : colors.textSecondary}
              />
              <Text style={styles.requirementText}>One number</Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons
                name={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? '#10b981' : colors.textSecondary}
              />
              <Text style={styles.requirementText}>One special character</Text>
            </View>
          </View>

          {/* Reset Password Button */}
          <TouchableOpacity
            style={[
              styles.resetButton,
              (!formData.password || !formData.confirmPassword || passwordStrength < 4 || isLoading) && styles.buttonDisabled
            ]}
            onPress={handleResetPassword}
            disabled={!formData.password || !formData.confirmPassword || passwordStrength < 4 || isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="small" color="#fff" />
            ) : (
              <Text style={styles.resetButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
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
    marginBottom: 30,
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
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
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
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  eyeButton: {
    padding: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginRight: 12,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requirementsSection: {
    marginBottom: 30,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NewPasswordScreen;