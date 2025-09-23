import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { typography, createTextStyle, spacing } from '../utils/typography';

const { width } = Dimensions.get('window');

const LoadingSpinner = ({ 
  visible = true, 
  text = 'Loading...', 
  size = 'medium',
  overlay = false,
  color = '#2563eb' 
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Start animations
      Animated.parallel([
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous spin animation
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();

      return () => spinAnimation.stop();
    } else {
      Animated.timing(fadeValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getSpinnerSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 40;
      default: return 30;
    }
  };

  const getContainerStyle = () => {
    if (overlay) {
      return [styles.overlayContainer, { opacity: fadeValue }];
    }
    return [styles.inlineContainer, { opacity: fadeValue, transform: [{ scale: scaleValue }] }];
  };

  if (!visible) return null;

  return (
    <Animated.View style={getContainerStyle()}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.spinner,
            {
              width: getSpinnerSize(),
              height: getSpinnerSize(),
              borderColor: `${color}20`,
              borderTopColor: color,
              transform: [{ rotate: spin }],
            },
          ]}
        />
        {text && (
          <Text style={[styles.loadingText, { color }]}>
            {text}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

// Page Loading Component for full screen loading
export const PageLoader = ({ visible, text = 'Loading...' }) => (
  <LoadingSpinner
    visible={visible}
    text={text}
    size="large"
    overlay={true}
    color="#2563eb"
  />
);

// Inline Loading Component for sections
export const InlineLoader = ({ visible, text, size = 'small', color }) => (
  <LoadingSpinner
    visible={visible}
    text={text}
    size={size}
    overlay={false}
    color={color}
  />
);

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    borderWidth: 3,
    borderRadius: 50,
    marginBottom: spacing.sm,
  },
  loadingText: {
    ...createTextStyle('body2', '#6b7280'),
    textAlign: 'center',
  },
});

export default LoadingSpinner;