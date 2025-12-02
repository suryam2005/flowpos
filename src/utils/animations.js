import { Animated, Easing } from 'react-native';

// iOS-like spring animation configuration
export const springConfig = {
  tension: 300,
  friction: 35,
  useNativeDriver: true,
};

// iOS-like timing animation configuration
export const timingConfig = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // iOS ease-out curve
  useNativeDriver: true,
};

// Instant fade in for page transitions - no animation
export const fadeIn = (animatedValue, duration = 0) => {
  animatedValue.setValue(1);
  return { start: (callback) => callback && callback() };
};

// Instant fade out for page transitions - no animation
export const fadeOut = (animatedValue, duration = 0) => {
  animatedValue.setValue(0);
  return { start: (callback) => callback && callback() };
};

// Scale animation for buttons (keep this for UI feedback)
export const scaleAnimation = (animatedValue, toValue = 0.95, duration = 150) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    useNativeDriver: true,
  });
};

// Instant slide in for page transitions - no animation
export const slideInFromBottom = (animatedValue, duration = 0) => {
  animatedValue.setValue(0);
  return { start: (callback) => callback && callback() };
};

// Instant slide out for page transitions - no animation
export const slideOutToBottom = (animatedValue, toValue = 0, duration = 0) => {
  animatedValue.setValue(toValue);
  return { start: (callback) => callback && callback() };
};

// No staggered animation for page transitions
export const staggerAnimation = (animations, stagger = 0) => {
  return { start: (callback) => callback && callback() };
};

// Bounce animation for UI feedback (keep this)
export const bounceAnimation = (animatedValue) => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: 1.1,
      duration: 150,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 150,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: true,
    }),
  ]);
};