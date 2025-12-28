import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Dimensions,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getResponsivePositions } from '../config/tourContent';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation timing constants
const ANIMATION_DURATION = 300;
const PULSE_DURATION = 1500;
const SUCCESS_ANIMATION_DURATION = 500;
const SKIP_STEP_DELAY = 10000; // 10 seconds

/**
 * InteractiveTourOverlay - Enhanced tour overlay with touch-through capability
 * 
 * Features:
 * - Touch-through for highlight zone on interactive steps
 * - Block touches outside highlight zone with reminder
 * - Block all touches on non-interactive steps
 * - Visual differentiation between interactive and non-interactive steps
 * - Pulsing animation for interactive highlights
 * - Skip buttons (Skip, Skip All, Skip This Step)
 * - Success animation on action completion
 * - Screen reader support with accessibility labels and hints
 * - Reduced motion support for users who prefer less animation
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 10.1, 10.2, 10.3, 11.1, 11.2, 11.5, 11.7, 11.8
 */
const InteractiveTourOverlay = forwardRef(({
  visible,
  currentStep,
  totalSteps,
  stepIndex,
  onNext,
  onSkip,
  onSkipAll,
  onSkipStep,
  onActionComplete,
  showHint = false,
  showSkipStep = false,
  onOutsideTap,
}, ref) => {
  const [positions, setPositions] = useState({});
  const [showReminder, setShowReminder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [skipStepVisible, setSkipStepVisible] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const reminderAnim = useRef(new Animated.Value(0)).current;
  const pointerAnim = useRef(new Animated.Value(0)).current;
  
  // Timer refs
  const skipStepTimerRef = useRef(null);

  // Check for reduced motion and screen reader settings
  useEffect(() => {
    const checkAccessibilitySettings = async () => {
      try {
        // Check reduced motion setting
        const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
        setReduceMotionEnabled(reduceMotion);
        
        // Check screen reader setting
        const screenReader = await AccessibilityInfo.isScreenReaderEnabled();
        setScreenReaderEnabled(screenReader);
      } catch (error) {
        console.warn('🎯 [InteractiveTourOverlay] Error checking accessibility settings:', error);
      }
    };
    
    checkAccessibilitySettings();
    
    // Subscribe to accessibility changes
    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => setReduceMotionEnabled(isEnabled)
    );
    
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled) => setScreenReaderEnabled(isEnabled)
    );
    
    return () => {
      reduceMotionSubscription?.remove();
      screenReaderSubscription?.remove();
    };
  }, []);

  // Announce step changes for screen readers
  useEffect(() => {
    if (visible && currentStep && screenReaderEnabled) {
      const announcement = buildStepAnnouncement(currentStep, stepIndex, totalSteps);
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [visible, currentStep, stepIndex, totalSteps, screenReaderEnabled]);

  /**
   * Build announcement text for screen readers
   * @param {Object} step - Current tour step
   * @param {number} index - Current step index
   * @param {number} total - Total number of steps
   * @returns {string} Announcement text
   */
  const buildStepAnnouncement = (step, index, total) => {
    const stepNumber = `Step ${index + 1} of ${total}.`;
    const title = step.title.replace(/[^\w\s]/g, ''); // Remove emojis for cleaner announcement
    const instruction = step.interactive 
      ? `Interactive step. ${step.text}` 
      : step.text;
    const hint = step.interactive 
      ? `${step.hintText || 'Interact with the highlighted area to continue.'}` 
      : 'Press Next to continue.';
    
    return `${stepNumber} ${title}. ${instruction} ${hint}`;
  };

  // Update positions when screen dimensions change or step changes
  // This ensures dynamic positions set by screens are picked up
  useEffect(() => {
    const updatePositions = () => {
      setPositions(getResponsivePositions());
    };
    
    updatePositions();
    
    const subscription = Dimensions.addEventListener('change', updatePositions);
    return () => subscription?.remove();
  }, [currentStep?.id]); // Re-fetch positions when step changes to pick up dynamic overrides

  // Fade in animation when visible (respects reduced motion)
  useEffect(() => {
    if (visible) {
      if (reduceMotionEnabled) {
        // Instant transition for reduced motion
        fadeAnim.setValue(1);
      } else {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }).start();
      }
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim, reduceMotionEnabled]);

  // Pulse animation for interactive steps (respects reduced motion)
  useEffect(() => {
    if (visible && currentStep?.interactive && !reduceMotionEnabled) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: PULSE_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: PULSE_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      
      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [visible, currentStep?.interactive, pulseAnim, reduceMotionEnabled]);


  // Pointer animation for interactive steps (respects reduced motion)
  useEffect(() => {
    if (visible && currentStep?.interactive && !reduceMotionEnabled) {
      const pointerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pointerAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pointerAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pointerAnimation.start();
      
      return () => pointerAnimation.stop();
    } else {
      pointerAnim.setValue(0);
    }
  }, [visible, currentStep?.interactive, pointerAnim, reduceMotionEnabled]);

  // Skip step timer for interactive steps (10 seconds)
  useEffect(() => {
    if (visible && currentStep?.interactive && !showSkipStep) {
      skipStepTimerRef.current = setTimeout(() => {
        setSkipStepVisible(true);
      }, SKIP_STEP_DELAY);
      
      return () => {
        if (skipStepTimerRef.current) {
          clearTimeout(skipStepTimerRef.current);
        }
      };
    } else {
      setSkipStepVisible(false);
    }
  }, [visible, currentStep?.id, currentStep?.interactive, showSkipStep]);

  // Reset skip step visibility when step changes
  useEffect(() => {
    setSkipStepVisible(false);
    setShowReminder(false);
  }, [stepIndex]);

  /**
   * Trigger success animation (respects reduced motion)
   */
  const triggerSuccessAnimation = useCallback(() => {
    setShowSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Announce success for screen readers
    if (screenReaderEnabled) {
      const successMessage = currentStep?.successMessage || 'Action completed successfully';
      AccessibilityInfo.announceForAccessibility(successMessage);
    }
    
    if (reduceMotionEnabled) {
      // Instant transition for reduced motion
      successAnim.setValue(1);
      setTimeout(() => {
        successAnim.setValue(0);
        setShowSuccess(false);
        if (onActionComplete) {
          onActionComplete();
        }
      }, 500);
    } else {
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: SUCCESS_ANIMATION_DURATION / 2,
          useNativeDriver: true,
        }),
        Animated.delay(300),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: SUCCESS_ANIMATION_DURATION / 2,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccess(false);
        if (onActionComplete) {
          onActionComplete();
        }
      });
    }
  }, [successAnim, onActionComplete, reduceMotionEnabled, screenReaderEnabled, currentStep]);

  // Expose triggerSuccessAnimation to parent via ref
  useImperativeHandle(ref, () => ({
    triggerSuccessAnimation,
  }), [triggerSuccessAnimation]);

  /**
   * Handle tap outside the highlight zone
   * Shows a reminder for interactive steps (respects reduced motion)
   */
  const handleOutsideTap = useCallback(() => {
    if (!currentStep?.interactive) {
      return; // Non-interactive steps block all touches
    }

    // Show reminder animation
    setShowReminder(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Announce reminder for screen readers
    if (screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility('Please interact with the highlighted area to continue.');
    }
    
    if (reduceMotionEnabled) {
      // Instant transition for reduced motion
      reminderAnim.setValue(1);
      setTimeout(() => {
        reminderAnim.setValue(0);
        setShowReminder(false);
      }, 2000);
    } else {
      Animated.sequence([
        Animated.timing(reminderAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(reminderAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowReminder(false);
      });
    }

    if (onOutsideTap) {
      onOutsideTap();
    }
  }, [currentStep?.interactive, reminderAnim, onOutsideTap, reduceMotionEnabled, screenReaderEnabled]);

  /**
   * Handle skip current screen tour
   */
  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onSkip) {
      onSkip();
    }
  }, [onSkip]);

  /**
   * Handle skip all tours
   */
  const handleSkipAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onSkipAll) {
      onSkipAll();
    }
  }, [onSkipAll]);

  /**
   * Handle skip this step only
   */
  const handleSkipStep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onSkipStep) {
      onSkipStep();
    }
  }, [onSkipStep]);

  /**
   * Handle next button press
   */
  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onNext) {
      onNext();
    }
  }, [onNext]);

  if (!visible || !currentStep) {
    return null;
  }

  const currentBox = positions[currentStep.highlightBox];
  
  if (!currentBox) {
    console.warn(`🎯 [InteractiveTourOverlay] Position not found for ${currentStep.highlightBox}`);
    return null;
  }

  // Calculate card position with safe area considerations
  // For 'top' position: ensure card doesn't go above screen or overlap with cart bar
  // For 'bottom' position: ensure card doesn't go below screen
  const CARD_HEIGHT = 220; // Approximate card height including buttons
  const SAFE_MARGIN_TOP = 60; // Safe margin from top of screen (status bar + header)
  const SAFE_MARGIN_BOTTOM = 100; // Safe margin from bottom (cart bar area)
  
  let cardTop;
  if (currentStep.cardPosition === 'top') {
    // Position card above the highlight box
    const desiredTop = currentBox.top - CARD_HEIGHT - 10;
    // Ensure card doesn't go above safe area
    cardTop = Math.max(SAFE_MARGIN_TOP, desiredTop);
    // If card would overlap with highlight box, position it below instead
    if (cardTop + CARD_HEIGHT > currentBox.top - 10) {
      cardTop = currentBox.top + currentBox.height + 20;
    }
  } else {
    // Position card below the highlight box
    const desiredTop = currentBox.top + currentBox.height + 20;
    // Ensure card doesn't go below safe area (leave room for cart bar)
    const maxTop = SCREEN_HEIGHT - CARD_HEIGHT - SAFE_MARGIN_BOTTOM;
    cardTop = Math.min(desiredTop, maxTop);
    // If card would overlap with highlight box, position it above instead
    if (cardTop < currentBox.top + currentBox.height + 10) {
      cardTop = Math.max(SAFE_MARGIN_TOP, currentBox.top - CARD_HEIGHT - 10);
    }
  }
  
  // Final bounds check
  cardTop = Math.max(SAFE_MARGIN_TOP, Math.min(cardTop, SCREEN_HEIGHT - CARD_HEIGHT - SAFE_MARGIN_BOTTOM));
  
  const cardLeft = Math.max(20, Math.min(SCREEN_WIDTH - 320, currentBox.left));

  // Determine if we should show skip step button
  const shouldShowSkipStep = currentStep.interactive && (showSkipStep || skipStepVisible);

  // Pointer animation transform
  const pointerTranslateY = pointerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });


  // For interactive steps, we render directly without Modal to allow touch-through
  // Modal blocks all touches even with pointerEvents="none"
  const overlayContent = (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="box-none">
      {/* Dark overlay with touch handling */}
      {currentStep.interactive ? (
        // Interactive step: Allow touch-through on highlight, block elsewhere
        <>
          {/* Top overlay section */}
          <TouchableWithoutFeedback onPress={handleOutsideTap}>
            <View style={[styles.overlaySection, {
              top: 0,
              left: 0,
              right: 0,
              height: currentBox.top,
            }]} />
          </TouchableWithoutFeedback>
          
          {/* Left overlay section */}
          <TouchableWithoutFeedback onPress={handleOutsideTap}>
            <View style={[styles.overlaySection, {
              top: currentBox.top,
              left: 0,
              width: currentBox.left,
              height: currentBox.height,
            }]} />
          </TouchableWithoutFeedback>
          
          {/* Right overlay section */}
          <TouchableWithoutFeedback onPress={handleOutsideTap}>
            <View style={[styles.overlaySection, {
              top: currentBox.top,
              left: currentBox.left + currentBox.width,
              right: 0,
              height: currentBox.height,
            }]} />
          </TouchableWithoutFeedback>
          
          {/* Bottom overlay section */}
          <TouchableWithoutFeedback onPress={handleOutsideTap}>
            <View style={[styles.overlaySection, {
              top: currentBox.top + currentBox.height,
              left: 0,
              right: 0,
              bottom: 0,
            }]} />
          </TouchableWithoutFeedback>
          
          {/* Touch-through highlight zone - completely transparent, no touch handling */}
          {/* This area allows touches to pass through to underlying components */}
        </>
      ) : (
        // Non-interactive step: Block all touches
        <View style={styles.fullOverlay} pointerEvents="box-only" />
      )}

        {/* Highlight box with animation */}
        <Animated.View
          style={[
            currentStep.interactive ? styles.highlightBoxInteractive : styles.highlightBoxStatic,
            {
              top: currentBox.top,
              left: currentBox.left,
              width: currentBox.width,
              height: currentBox.height,
              transform: [{ scale: currentStep.interactive ? pulseAnim : 1 }],
            },
          ]}
          pointerEvents="none"
          accessible={true}
          accessibilityRole="none"
          accessibilityLabel={currentStep.interactive ? 'Interactive highlight area. Tap here to continue.' : 'Highlighted area showing the current feature.'}
        />

        {/* Pointer/finger icon for interactive steps */}
        {currentStep.interactive && (
          <Animated.View
            style={[
              styles.pointerContainer,
              {
                top: currentBox.top + currentBox.height / 2 - 20,
                left: currentBox.left + currentBox.width / 2 - 15,
                transform: [{ translateY: reduceMotionEnabled ? 0 : pointerTranslateY }],
              },
            ]}
            pointerEvents="none"
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.pointerIcon}>👆</Text>
          </Animated.View>
        )}

        {/* Success animation overlay */}
        {showSuccess && (
          <Animated.View
            style={[
              styles.successOverlay,
              {
                top: currentBox.top,
                left: currentBox.left,
                width: currentBox.width,
                height: currentBox.height,
                opacity: successAnim,
              },
            ]}
            pointerEvents="none"
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={currentStep.successMessage || 'Action completed successfully'}
          >
            <Text style={styles.successIcon}>✅</Text>
            {currentStep.successMessage && (
              <Text style={styles.successText}>{currentStep.successMessage}</Text>
            )}
          </Animated.View>
        )}

        {/* Reminder message when tapping outside */}
        {showReminder && (
          <Animated.View
            style={[
              styles.reminderContainer,
              { opacity: reminderAnim },
            ]}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel="Please interact with the highlighted area to continue"
          >
            <Text style={styles.reminderText}>
              👆 Please interact with the highlighted area
            </Text>
          </Animated.View>
        )}

        {/* Tour card */}
        <View
          style={[
            styles.tourCard,
            {
              top: cardTop,
              left: cardLeft,
            },
          ]}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Tour step ${stepIndex + 1} of ${totalSteps}. ${currentStep.title.replace(/[^\w\s]/g, '')}. ${currentStep.text}`}
          accessibilityHint={currentStep.interactive ? currentStep.hintText || 'Interact with the highlighted area to continue' : 'Press Next to continue'}
        >
          <Text 
            style={styles.tourTitle}
            accessibilityRole="header"
          >
            {currentStep.title}
          </Text>
          <Text style={styles.tourText}>{currentStep.text}</Text>
          
          {/* Hint text (shown after timeout) */}
          {showHint && currentStep.hintText && (
            <View 
              style={styles.hintContainer}
              accessible={true}
              accessibilityRole="alert"
              accessibilityLabel={`Hint: ${currentStep.hintText}`}
            >
              <Text style={styles.hintText}>💡 {currentStep.hintText}</Text>
            </View>
          )}
          
          {/* Navigation hint for cross-screen flow (Requirements 8.4) */}
          {currentStep.showNavigationHint && currentStep.navigationHintText && (
            <View 
              style={styles.navigationHintContainer}
              accessible={true}
              accessibilityRole="alert"
              accessibilityLabel={`Navigation hint: ${currentStep.navigationHintText}`}
            >
              <Text style={styles.navigationHintIcon}>👇</Text>
              <Text style={styles.navigationHintText}>{currentStep.navigationHintText}</Text>
            </View>
          )}
          
          {/* Progress dots */}
          <View 
            style={styles.progressContainer}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel={`Progress: step ${stepIndex + 1} of ${totalSteps}`}
            accessibilityValue={{ min: 0, max: totalSteps, now: stepIndex + 1 }}
          >
            {Array.from({ length: totalSteps }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === stepIndex && styles.progressDotActive,
                  index < stepIndex && styles.progressDotCompleted,
                ]}
              />
            ))}
          </View>
          
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.skipButtonsRow}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Skip this screen's tour"
                accessibilityHint="Skips only the current screen tour and marks it as complete"
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.skipAllButton}
                onPress={handleSkipAll}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Skip all tours"
                accessibilityHint="Skips all remaining tours across all screens"
              >
                <Text style={styles.skipAllButtonText}>Skip All</Text>
              </TouchableOpacity>
            </View>
            
            {/* Skip This Step button (appears after 10s on interactive steps) */}
            {shouldShowSkipStep && (
              <TouchableOpacity
                style={styles.skipStepButton}
                onPress={handleSkipStep}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Skip this step"
                accessibilityHint="Skips only this step and advances to the next one"
              >
                <Text style={styles.skipStepButtonText}>Skip This Step</Text>
              </TouchableOpacity>
            )}
            
            {/* Next/Done button (only for non-interactive steps) */}
            {!currentStep.interactive && (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={stepIndex === totalSteps - 1 ? 'Done' : 'Next'}
                accessibilityHint={stepIndex === totalSteps - 1 ? 'Completes the tour for this screen' : 'Advances to the next tour step'}
              >
                <Text style={styles.nextButtonText}>
                  {stepIndex === totalSteps - 1 ? 'Done' : 'Next'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
  );

  // For interactive steps, render directly without Modal to allow touch-through
  // Modal blocks all touches even with pointerEvents="none"
  if (currentStep.interactive) {
    return (
      <View style={styles.absoluteContainer} pointerEvents="box-none">
        {overlayContent}
      </View>
    );
  }

  // For non-interactive steps, use Modal to block all touches
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
    >
      {overlayContent}
    </Modal>
  );
});


const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlaySection: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  touchThroughZone: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  highlightBoxInteractive: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  highlightBoxStatic: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  pointerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerIcon: {
    fontSize: 30,
  },
  successOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    fontSize: 40,
  },
  successText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  reminderContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 152, 0, 0.95)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  reminderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tourCard: {
    position: 'absolute',
    width: 300,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  tourText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  hintContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  hintText: {
    fontSize: 13,
    color: '#E65100',
    textAlign: 'center',
  },
  navigationHintContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  navigationHintIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  navigationHintText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 3,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  buttonContainer: {
    gap: 8,
  },
  skipButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  skipButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  skipAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#FFEBEE',
  },
  skipAllButtonText: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '500',
  },
  skipStepButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#E3F2FD',
    alignSelf: 'center',
  },
  skipStepButtonText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
  },
  nextButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  nextButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
});

export default InteractiveTourOverlay;
