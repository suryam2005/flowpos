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

// Fade in animation
export const fadeIn = (animatedValue, duration = 300) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    useNativeDriver: true,
  });
};

// Fade out animation
export const fadeOut = (animatedValue, duration = 300) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    useNativeDriver: true,
  });
};

// Scale animation for buttons
export const scaleAnimation = (animatedValue, toValue = 0.95, duration = 150) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    useNativeDriver: true,
  });
};

// Slide in from bottom animation
export const slideInFromBottom = (animatedValue, duration = 400) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    useNativeDriver: true,
  });
};

// Slide out to bottom animation
export const slideOutToBottom = (animatedValue, toValue = 300, duration = 300) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    useNativeDriver: true,
  });
};

// Staggered animation for lists
export const staggerAnimation = (animations, stagger = 100) => {
  return Animated.stagger(stagger, animations);
};

// Bounce animation
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