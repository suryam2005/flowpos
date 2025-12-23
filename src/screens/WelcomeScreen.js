import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacingStyles';

const WelcomeScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  // No animations needed

  const steps = [
    {
      icon: 'storefront',
      title: 'Welcome to FlowPOS',
      subtitle: 'Your complete point-of-sale solution',
      description: 'Streamline your business operations with our modern POS system designed for retailers, cafes, and small businesses.',
    },
    {
      icon: 'trending-up',
      title: 'Smart Analytics',
      subtitle: 'Track sales and inventory in real-time',
      description: 'Get insights into your best-selling products, peak hours, and inventory levels with comprehensive analytics dashboard.',
    },
    {
      icon: 'rocket',
      title: 'Lightning Fast',
      subtitle: 'Quick checkout and payments',
      description: 'Process transactions in seconds with barcode scanning, multiple payment methods, and instant receipt generation.',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleGetStarted();
  };

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to signup for new users
    navigation.navigate('Signup');
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Login');
  };

  const currentStepData = steps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Sign In and Skip */}
      <View style={styles.header}>
        {currentStep === 0 ? (
          <TouchableOpacity
            style={styles.signInHeaderButton}
            onPress={handleSignIn}
            activeOpacity={0.7}
          >
            <Text style={styles.signInHeaderText}>Sign In</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>

        {/* Step Content */}
        <View style={styles.stepContent}>
          <View style={styles.stepHeader}>
            <Ionicons name={currentStepData.icon} size={80} color={colors.primary.main} style={styles.stepIcon} />
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
          </View>

          <View style={styles.description}>
            <Text style={styles.descriptionText}>
              {currentStepData.description}
            </Text>
          </View>
        </View>

        {/* Step Indicators */}
        <View style={styles.indicators}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentStep && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep === steps.length - 1 ? (
            // Final step - show auth buttons
            <>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleGetStarted}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Create Account</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleSignIn}
                activeOpacity={0.8}
              >
                <Text style={styles.signInButtonText}>Already have an account? Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Regular next button
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl, // 20px - standardized
    paddingVertical: spacing.lg,   // 16px - standardized
    backgroundColor: colors.background.primary,
  },
  headerSpacer: {
    flex: 1,
  },
  skipButton: {
    paddingHorizontal: spacing.lg,  // 16px - standardized
    paddingVertical: spacing.md,    // 12px - standardized
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  skipText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl, // 20px - standardized
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,   // 20px - standardized
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: spacing.huge,    // 40px - standardized
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.xxl,     // 24px - standardized
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,      // 8px - standardized
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  description: {
    paddingHorizontal: spacing.xl, // 20px - standardized
    marginBottom: spacing.huge,    // 40px - standardized
  },
  descriptionText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.huge,    // 40px - standardized
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.medium,
    marginHorizontal: spacing.xs,  // 4px - standardized
  },
  indicatorActive: {
    backgroundColor: colors.primary.main,
    width: 24,
  },
  navigation: {
    paddingBottom: spacing.xl,     // 20px - standardized
  },
  nextButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl, // 20px - standardized
    paddingVertical: spacing.lg,   // 16px - standardized
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  signInButton: {
    marginTop: spacing.lg,         // 16px - standardized
    paddingVertical: spacing.lg,   // 16px - standardized
    paddingHorizontal: spacing.lg, // 16px - standardized
    alignItems: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  signInHeaderButton: {
    paddingHorizontal: spacing.lg, // 16px - standardized
    paddingVertical: spacing.md,   // 12px - standardized
    backgroundColor: colors.primary.main,
    borderRadius: 12,
  },
  signInHeaderText: {
    fontSize: 16,
    color: colors.background.surface,
    fontWeight: '600',
  },
  stepIcon: {
    marginBottom: spacing.xxl,     // 24px - standardized
  },
});

export default WelcomeScreen;