import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * SimpleTourOverlay - Simple, non-interactive tour overlay
 * 
 * Features:
 * - Simple highlight zones with text explanations
 * - Next/Skip buttons only
 * - No action detection or interaction required
 * - Clean, minimal UI
 */
const SimpleTourOverlay = ({
  visible,
  currentStep,
  totalSteps,
  stepIndex,
  onNext,
  onSkip,
  onComplete,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible || !currentStep) return null;

  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Dark background */}
        <View style={styles.darkBackground} />
        
        {/* Highlight zone */}
        {currentStep.highlight && (
          <View
            style={[
              styles.highlightZone,
              {
                top: currentStep.highlight.top,
                left: currentStep.highlight.left,
                width: currentStep.highlight.width,
                height: currentStep.highlight.height,
              }
            ]}
          />
        )}

        {/* Tour content */}
        <View style={styles.tourContent}>
          <View style={styles.tourCard}>
            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>
                {stepIndex + 1} of {totalSteps}
              </Text>
            </View>

            {/* Title */}
            <Text style={styles.tourTitle}>{currentStep.title}</Text>

            {/* Description */}
            <Text style={styles.tourDescription}>{currentStep.description}</Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Skip Tour</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={isLastStep ? onComplete : onNext}
                activeOpacity={0.7}
              >
                <Text style={styles.nextButtonText}>
                  {isLastStep ? 'Finish' : 'Next'}
                </Text>
                {!isLastStep && (
                  <Ionicons name="chevron-forward" size={16} color="#fff" style={styles.nextIcon} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  darkBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  highlightZone: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: colors.primary.main,
    borderRadius: 8,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  tourContent: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  tourCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  stepIndicator: {
    alignSelf: 'center',
    backgroundColor: colors.primary.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.main,
  },
  tourTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  tourDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  nextButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  nextIcon: {
    marginLeft: 4,
  },
});

export default SimpleTourOverlay;