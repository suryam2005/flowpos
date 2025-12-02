import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../styles/colors';

const WelcomeScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  // No animations needed

  const steps = [
    {
      emoji: '🏪',
      title: 'Welcome to FlowPOS',
      subtitle: 'Your complete point-of-sale solution',
      description: 'Streamline your business operations with our modern POS system designed for retailers, cafes, and small businesses.',
    },
    {
      emoji: '📈',
      title: 'Smart Analytics',
      subtitle: 'Track sales and inventory in real-time',
      description: 'Get insights into your best-selling products, peak hours, and inventory levels with comprehensive analytics dashboard.',
    },
    {
      emoji: '🚀',
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
            <Text style={styles.emoji}>{currentStepData.emoji}</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background.primary,
  },
  headerSpacer: {
    flex: 1,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background.surface,
    borderRadius: 20,
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
    paddingHorizontal: 24,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  description: {
    paddingHorizontal: 20,
    marginBottom: 40,
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
    marginBottom: 40,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.medium,
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: colors.primary.main,
    width: 24,
  },
  navigation: {
    paddingBottom: 20,
  },
  nextButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.background.surface,
  },
  signInButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  signInHeaderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary.main,
    borderRadius: 20,
  },
  signInHeaderText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

export default WelcomeScreen;