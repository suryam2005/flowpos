import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [loadingText, setLoadingText] = useState('Initializing FlowPOS...');

  useEffect(() => {
    startAnimations();
    initializeApp();
  }, []);

  const startAnimations = () => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const initializeApp = async () => {
    try {
      // Simulate cloud backend setup and initialization
      const initSteps = [
        { text: 'Initializing FlowPOS...', delay: 500 },
        { text: 'Setting up cloud backend...', delay: 800 },
        { text: 'Syncing store data...', delay: 700 },
        { text: 'Loading products...', delay: 600 },
        { text: 'Preparing workspace...', delay: 500 },
        { text: 'Almost ready...', delay: 400 },
      ];

      for (let i = 0; i < initSteps.length; i++) {
        setLoadingText(initSteps[i].text);
        await new Promise(resolve => setTimeout(resolve, initSteps[i].delay));
      }

      // Check app state and navigate accordingly
      await checkAppState();
    } catch (error) {
      console.error('Initialization error:', error);
      // Fallback navigation
      navigation.replace('Welcome');
    }
  };

  const checkAppState = async () => {
    try {
      // Check if user has completed onboarding
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      const storeSetupCompleted = await AsyncStorage.getItem('storeSetupCompleted');
      
      // Check if PIN is set up
      const pinSetupCompleted = await AsyncStorage.getItem('pinSetupCompleted');

      if (!hasCompletedOnboarding || !storeSetupCompleted) {
        // First time user - go to welcome/onboarding
        navigation.replace('Welcome');
      } else if (!pinSetupCompleted) {
        // Store setup done but no PIN - go to PIN setup
        navigation.replace('PinSetup', { isFirstTime: true });
      } else {
        // Everything set up - go to PIN entry or main app
        navigation.replace('PinEntry');
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      // Fallback to welcome screen
      navigation.replace('Welcome');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.logo}>
            <Text style={styles.logoEmoji}>🏪</Text>
            <Text style={styles.logoText}>FlowPOS</Text>
            <Text style={styles.logoSubtext}>Point of Sale System</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.loadingContainer,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.loadingBar}>
            <View style={styles.loadingProgress} />
          </View>
          <Text style={styles.loadingText}>{loadingText}</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.footer,
            { opacity: fadeAnim },
          ]}
        >
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.copyrightText}>© 2024 FlowPOS</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logo: {
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  logoSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  loadingBar: {
    width: '80%',
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
    width: '100%',
    // Add animation for loading bar
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#d1d5db',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default SplashScreen;