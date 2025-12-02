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
import { colors } from '../../styles/colors';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const ChangePasswordScreen = ({ navigation }) => {
  const { forgotPassword, user } = useAuth();
  
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email.toLowerCase().trim());
      
      // Navigate to OTP verification for password reset
      navigation.navigate('ChangePasswordOTP', {
        email: email.toLowerCase().trim()
      });
      
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.message.includes('User not found')) {
        Alert.alert(
          'Email Not Found',
          'No account found with this email address. Please check your email and try again.'
        );
      } else if (error.message.includes('timeout') || error.message.includes('Network')) {
        Alert.alert(
          'Connection Error',
          'Please check your internet connection and try again.'
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to send verification code. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Change Password</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon and Title */}
          <View style={styles.iconSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.mainTitle}>Change Your Password</Text>
            <Text style={styles.subtitle}>
              We'll send a verification code to your email to confirm the password change
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!user?.email} // Disable editing if user email is available
              />
            </View>
            {user?.email && (
              <Text style={styles.emailNote}>
                Using your account email address
              </Text>
            )}
          </View>

          {/* Send Code Button */}
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="small" color={colors.text.inverse} />
                <Text style={styles.sendButtonText}>Sending Code...</Text>
              </>
            ) : (
              <>
                <Text style={styles.sendButtonText}>Send Verification Code</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
              </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
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
    paddingTop: 20,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 30,
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
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
  },
  emailNote: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default ChangePasswordScreen;