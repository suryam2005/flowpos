import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Screen size categories
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;
const isLargeScreen = width >= 414;

// Base font sizes that scale with screen size
const getScaledSize = (size) => {
  if (isSmallScreen) {
    return size * 0.9;
  } else if (isMediumScreen) {
    return size;
  } else {
    return size * 1.1;
  }
};

// SF Pro font family for iOS, system fonts for Android
export const getFontFamily = (weight = 'regular') => {
  if (Platform.OS === 'ios') {
    switch (weight) {
      case 'light':
        return 'SF Pro Display Light';
      case 'regular':
        return 'SF Pro Display Regular';
      case 'medium':
        return 'SF Pro Display Medium';
      case 'semibold':
        return 'SF Pro Display Semibold';
      case 'bold':
        return 'SF Pro Display Bold';
      case 'heavy':
        return 'SF Pro Display Heavy';
      default:
        return 'SF Pro Display Regular';
    }
  } else {
    // Android system fonts
    switch (weight) {
      case 'light':
        return 'sans-serif-light';
      case 'regular':
        return 'sans-serif';
      case 'medium':
        return 'sans-serif-medium';
      case 'semibold':
      case 'bold':
        return 'sans-serif-bold';
      case 'heavy':
        return 'sans-serif-black';
      default:
        return 'sans-serif';
    }
  }
};

// Typography scale with responsive sizing
export const typography = {
  // Headers
  h1: {
    fontSize: getScaledSize(32),
    fontFamily: getFontFamily('bold'),
    lineHeight: getScaledSize(40),
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: getScaledSize(28),
    fontFamily: getFontFamily('bold'),
    lineHeight: getScaledSize(36),
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: getScaledSize(24),
    fontFamily: getFontFamily('semibold'),
    lineHeight: getScaledSize(32),
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: getScaledSize(20),
    fontFamily: getFontFamily('semibold'),
    lineHeight: getScaledSize(28),
    letterSpacing: -0.1,
  },
  h5: {
    fontSize: getScaledSize(18),
    fontFamily: getFontFamily('semibold'),
    lineHeight: getScaledSize(24),
  },
  h6: {
    fontSize: getScaledSize(16),
    fontFamily: getFontFamily('semibold'),
    lineHeight: getScaledSize(22),
  },

  // Body text
  body1: {
    fontSize: getScaledSize(16),
    fontFamily: getFontFamily('regular'),
    lineHeight: getScaledSize(24),
  },
  body2: {
    fontSize: getScaledSize(14),
    fontFamily: getFontFamily('regular'),
    lineHeight: getScaledSize(20),
  },
  body3: {
    fontSize: getScaledSize(12),
    fontFamily: getFontFamily('regular'),
    lineHeight: getScaledSize(18),
  },

  // UI elements
  button: {
    fontSize: getScaledSize(16),
    fontFamily: getFontFamily('semibold'),
    lineHeight: getScaledSize(20),
  },
  buttonSmall: {
    fontSize: getScaledSize(14),
    fontFamily: getFontFamily('semibold'),
    lineHeight: getScaledSize(18),
  },
  caption: {
    fontSize: getScaledSize(12),
    fontFamily: getFontFamily('medium'),
    lineHeight: getScaledSize(16),
  },
  overline: {
    fontSize: getScaledSize(10),
    fontFamily: getFontFamily('medium'),
    lineHeight: getScaledSize(14),
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Numbers and prices
  price: {
    fontSize: getScaledSize(18),
    fontFamily: getFontFamily('bold'),
    lineHeight: getScaledSize(24),
  },
  priceSmall: {
    fontSize: getScaledSize(14),
    fontFamily: getFontFamily('semibold'),
    lineHeight: getScaledSize(18),
  },
  number: {
    fontSize: getScaledSize(24),
    fontFamily: getFontFamily('bold'),
    lineHeight: getScaledSize(32),
  },
};

// Helper function to create text styles
export const createTextStyle = (variant, color = '#1f2937', additionalStyles = {}) => ({
  ...typography[variant],
  color,
  ...additionalStyles,
});

// Responsive spacing
export const spacing = {
  xs: getScaledSize(4),
  sm: getScaledSize(8),
  md: getScaledSize(16),
  lg: getScaledSize(24),
  xl: getScaledSize(32),
  xxl: getScaledSize(48),
};

// Screen dimensions helper
export const screenDimensions = {
  width,
  height,
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
};