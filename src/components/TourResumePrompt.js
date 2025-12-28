import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import tourProgressManager from '../services/TourProgressManager';
import { colors } from '../styles/colors';

/**
 * TourResumePrompt - Shows a prompt to resume an incomplete tour
 * 
 * This component checks for incomplete tours on app open and offers
 * the user the option to resume from where they left off.
 * 
 * Requirements: 8.5, 9.2 - Handle manual navigation during tour and resume
 * 
 * @param {Object} props
 * @param {Function} props.onResume - Callback when user chooses to resume
 * @param {Function} props.onDismiss - Callback when user dismisses the prompt
 * @param {Object} props.navigation - Navigation object for screen navigation
 * @param {boolean} props.showOnManualNav - If true, shows prompt when user manually navigates away
 * @param {string} props.interruptedScreen - Screen name where tour was interrupted (for manual nav)
 */
const TourResumePrompt = ({ onResume, onDismiss, navigation, showOnManualNav = false, interruptedScreen = null }) => {
  const [visible, setVisible] = useState(false);
  const [resumeInfo, setResumeInfo] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Check for incomplete tour on mount
  useEffect(() => {
    checkForIncompleteTour();
  }, []);

  // Handle manual navigation interruption (Requirements 8.5)
  useEffect(() => {
    if (showOnManualNav && interruptedScreen) {
      console.log('🎯 [TourResumePrompt] Manual navigation detected, showing resume prompt');
      setResumeInfo({
        screen: interruptedScreen,
        stepIndex: 0, // Will be updated from TourProgressManager
        isManualNav: true,
      });
      setVisible(true);
      
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showOnManualNav, interruptedScreen, fadeAnim, slideAnim]);

  const checkForIncompleteTour = async () => {
    try {
      // Ensure TourProgressManager is initialized
      if (!tourProgressManager.isInitialized) {
        await tourProgressManager.initialize();
      }

      // Check if all tours are already complete
      if (tourProgressManager.areAllToursComplete()) {
        console.log('🎯 [TourResumePrompt] All tours complete, no resume needed');
        return;
      }

      // Get resume info
      const info = tourProgressManager.getResumeInfo();
      
      if (info && info.screen && info.stepIndex > 0) {
        console.log('🎯 [TourResumePrompt] Found incomplete tour:', info);
        setResumeInfo(info);
        setVisible(true);
        
        // Animate in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        console.log('🎯 [TourResumePrompt] No incomplete tour to resume');
      }
    } catch (error) {
      console.error('🎯 [TourResumePrompt] Error checking for incomplete tour:', error);
    }
  };

  const handleResume = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      
      if (resumeInfo && navigation) {
        // Navigate to the screen where tour was interrupted
        const screenName = resumeInfo.screen;
        console.log('🎯 [TourResumePrompt] Resuming tour on screen:', screenName);
        
        // Map tour screen names to navigation routes
        // Updated to include all screens in unified tour flow (Requirements 8.3)
        const screenRouteMap = {
          'POS': { screen: 'Main', params: { screen: 'POS', params: { startTour: true } } },
          'Cart': { screen: 'Cart', params: { startTour: true } },
          'InvoicePreview': { screen: 'SimpleInvoicePreview', params: { startTour: true } },
          'Analytics': { screen: 'Main', params: { screen: 'Stats', params: { startTour: true } } },
          'Orders': { screen: 'Main', params: { screen: 'Orders', params: { startTour: true } } },
          'ManageProducts': { screen: 'Main', params: { screen: 'Manage', params: { startTour: true, initialTab: 'Products' } } },
          'ManageInventory': { screen: 'Main', params: { screen: 'Manage', params: { startTour: true, initialTab: 'Inventory' } } },
          'AdvancedAnalytics': { screen: 'AdvancedAnalytics', params: { startTour: true } },
        };
        
        const route = screenRouteMap[screenName];
        if (route) {
          navigation.navigate(route.screen, route.params);
        }
      }
      
      if (onResume) {
        onResume(resumeInfo);
      }
    });
  }, [resumeInfo, navigation, onResume, fadeAnim, slideAnim]);

  const handleDismiss = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      
      if (onDismiss) {
        onDismiss();
      }
    });
  }, [onDismiss, fadeAnim, slideAnim]);

  const handleSkipAll = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Mark all tours as complete
      await tourProgressManager.markAllComplete();
      console.log('🎯 [TourResumePrompt] All tours skipped');
    } catch (error) {
      console.error('🎯 [TourResumePrompt] Error skipping all tours:', error);
    }
    
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      
      if (onDismiss) {
        onDismiss();
      }
    });
  }, [onDismiss, fadeAnim, slideAnim]);

  // Get friendly screen name for display
  // Updated to include all screens in unified tour flow
  const getScreenDisplayName = (screenName) => {
    const displayNames = {
      'POS': 'Sales Screen',
      'Cart': 'Cart / Checkout',
      'InvoicePreview': 'Invoice Preview',
      'Analytics': 'Analytics',
      'Orders': 'Orders',
      'ManageProducts': 'Product Management',
      'ManageInventory': 'Inventory Management',
      'AdvancedAnalytics': 'Advanced Analytics',
    };
    return displayNames[screenName] || screenName;
  };

  // Get tour flow position for display
  const getTourFlowInfo = (screenName) => {
    const flowOrder = ['POS', 'Cart', 'InvoicePreview', 'Analytics', 'Orders', 'ManageProducts', 'ManageInventory'];
    const position = flowOrder.indexOf(screenName);
    if (position === -1) return null;
    return {
      position: position + 1,
      total: flowOrder.length,
    };
  };

  if (!visible || !resumeInfo) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="compass" size={40} color={colors.primary.main} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Continue App Tour?</Text>

          {/* Description */}
          <Text style={styles.description}>
            {resumeInfo.isManualNav ? (
              <>
                You navigated away from the tour on the{' '}
                <Text style={styles.screenName}>
                  {getScreenDisplayName(resumeInfo.screen)}
                </Text>
                . Would you like to go back and continue?
              </>
            ) : (
              <>
                You have an incomplete tour on the{' '}
                <Text style={styles.screenName}>
                  {getScreenDisplayName(resumeInfo.screen)}
                </Text>
                . Would you like to continue where you left off?
              </>
            )}
          </Text>

          {/* Progress indicator - show tour flow position */}
          <View style={styles.progressContainer}>
            <Ionicons name="footsteps" size={16} color={colors.text.secondary} />
            <Text style={styles.progressText}>
              {getTourFlowInfo(resumeInfo.screen) ? (
                `Screen ${getTourFlowInfo(resumeInfo.screen).position} of ${getTourFlowInfo(resumeInfo.screen).total}`
              ) : (
                `Step ${resumeInfo.stepIndex + 1}`
              )}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleResume}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={18} color={colors.background.surface} />
              <Text style={styles.resumeButtonText}>Continue Tour</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissButtonText}>Not Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipAllButton}
              onPress={handleSkipAll}
              activeOpacity={0.8}
            >
              <Text style={styles.skipAllButtonText}>Skip All Tours</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.background.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary.light + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  screenName: {
    fontWeight: '600',
    color: colors.primary.main,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
    gap: 6,
  },
  progressText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  resumeButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resumeButtonText: {
    color: colors.background.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  skipAllButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipAllButtonText: {
    color: colors.text.tertiary,
    fontSize: 13,
    fontWeight: '500',
  },
});

export default TourResumePrompt;
