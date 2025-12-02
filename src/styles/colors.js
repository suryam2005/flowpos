// FlowPOS Professional Color System
// Designed for trust, credibility, and fintech-grade polish

export const colors = {
  // Base Palette (Neutral Foundation)
  background: {
    primary: '#F9FAFB',      // Off-white primary background
    surface: '#FFFFFF',       // White for cards and modals
    overlay: 'rgba(255, 255, 255, 0.9)', // Semi-transparent modal overlay
  },

  text: {
    primary: '#1C1C1E',       // Charcoal for primary text
    secondary: '#6B7280',     // Cool gray for secondary text
    tertiary: '#9CA3AF',      // Light gray for subtle text
    disabled: '#9CA3AF',      // Disabled text color
    inverse: '#F3F4F6',       // Off-white for dark backgrounds
  },

  // Primary Accent (Trust Color - Blue)
  primary: {
    main: '#2563EB',          // Deep blue for buttons and highlights
    hover: '#1D4ED8',         // Darker blue for hover/pressed states
    light: '#60A5FA',         // Muted sky for icons and light accents
    background: '#EFF6FF',    // Very light blue for backgrounds
    border: '#BFDBFE',        // Light blue for borders
  },

  // Secondary Accent (Success/Growth - Green)
  success: {
    main: '#10B981',          // Emerald green for success states
    light: '#34D399',         // Lighter green for hover
    background: '#D1FAE5',    // Light green background
    border: '#A7F3D0',        // Light green border
  },

  // Info/Neutral Accent (Teal)
  info: {
    main: '#0EA5E9',          // Teal for info states
    light: '#38BDF8',         // Lighter teal
    background: '#E0F2FE',    // Light teal background
    border: '#BAE6FD',        // Light teal border
  },

  // Error/Warning States
  error: {
    main: '#EF4444',          // Warm red for errors
    light: '#F87171',         // Lighter red for hover
    background: '#FEE2E2',    // Light red background
    border: '#FECACA',        // Light red border
  },

  warning: {
    main: '#F59E0B',          // Amber for warnings
    dark: '#92400E',          // Darker amber for text
    light: '#FBBF24',         // Lighter amber
    background: '#FEF3C7',    // Light amber background
    border: '#FDE68A',        // Light amber border
  },

  // Neutral Grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Borders and Dividers
  border: {
    light: '#E5E7EB',         // Very light gray for subtle borders
    medium: '#D1D5DB',        // Medium gray for more prominent borders
    dark: '#9CA3AF',          // Darker gray for emphasis
  },

  // Dark Mode Palette
  dark: {
    background: {
      primary: '#0B0B0C',     // Deep charcoal background
      surface: '#1F1F22',     // Dark gray for cards
      overlay: 'rgba(0, 0, 0, 0.8)', // Dark modal overlay
    },
    text: {
      primary: '#F3F4F6',     // Off-white primary text
      secondary: '#D1D5DB',   // Light gray secondary text
      tertiary: '#9CA3AF',    // Medium gray tertiary text
    },
    primary: {
      main: '#3B82F6',        // Brighter blue for dark mode
      hover: '#2563EB',       // Darker blue for hover
      light: '#60A5FA',       // Light blue accent
    },
    success: {
      main: '#22C55E',        // Brighter green for dark mode
      light: '#4ADE80',       // Light green
    },
    border: {
      light: '#2E2E32',       // Muted gray borders
      medium: '#374151',      // Medium gray borders
    },
  },

  // Shadows
  shadow: {
    default: '#000000',       // Default shadow color
    sm: 'rgba(0, 0, 0, 0.05)',
    md: 'rgba(0, 0, 0, 0.08)',
    lg: 'rgba(0, 0, 0, 0.12)',
    xl: 'rgba(0, 0, 0, 0.16)',
  },

  // Special Use Cases
  qr: {
    highlight: 'rgba(37, 99, 235, 0.1)', // Blue with 10% opacity for QR glow
    border: '#2563EB',                    // Blue border for QR highlights
  },

  payment: {
    cash: '#10B981',          // Green for cash payments
    card: '#6366F1',          // Indigo for card payments
    upi: '#2563EB',           // Blue for UPI payments
  },

  status: {
    active: '#10B981',        // Green for active/online status
    inactive: '#6B7280',      // Gray for inactive status
    pending: '#F59E0B',       // Amber for pending status
  },
};

// Semantic color mappings for easy usage
export const semanticColors = {
  // Backgrounds
  screenBackground: colors.background.primary,
  cardBackground: colors.background.surface,
  modalBackground: colors.background.overlay,

  // Text
  primaryText: colors.text.primary,
  secondaryText: colors.text.secondary,
  subtleText: colors.text.tertiary,

  // Actions
  primaryButton: colors.primary.main,
  primaryButtonHover: colors.primary.hover,
  successButton: colors.success.main,
  dangerButton: colors.error.main,

  // States
  successColor: colors.success.main,
  errorColor: colors.error.main,
  warningColor: colors.warning.main,
  infoColor: colors.info.main,

  // Borders
  lightBorder: colors.border.light,
  mediumBorder: colors.border.medium,
  focusBorder: colors.primary.main,

  // Shadows
  cardShadow: colors.shadow.md,
  buttonShadow: colors.shadow.sm,
  modalShadow: colors.shadow.xl,
};

// Component-specific color schemes
export const componentColors = {
  button: {
    primary: {
      background: colors.primary.main,
      text: colors.background.surface,
      border: colors.primary.main,
      hover: colors.primary.hover,
    },
    secondary: {
      background: colors.background.surface,
      text: colors.primary.main,
      border: colors.primary.main,
      hover: colors.primary.background,
    },
    success: {
      background: colors.success.main,
      text: colors.background.surface,
      border: colors.success.main,
      hover: colors.success.light,
    },
    danger: {
      background: colors.error.main,
      text: colors.background.surface,
      border: colors.error.main,
      hover: colors.error.light,
    },
  },

  input: {
    background: colors.background.surface,
    border: colors.border.light,
    focusBorder: colors.primary.main,
    errorBorder: colors.error.main,
    text: colors.text.primary,
    placeholder: colors.text.secondary,
  },

  card: {
    background: colors.background.surface,
    border: colors.border.light,
    shadow: colors.shadow.md,
    text: colors.text.primary,
    secondaryText: colors.text.secondary,
  },

  navigation: {
    background: colors.background.surface,
    border: colors.border.light,
    activeTab: colors.primary.main,
    inactiveTab: colors.text.secondary,
    activeBackground: colors.primary.background,
  },

  pos: {
    productCard: colors.background.surface,
    productBorder: colors.border.light,
    productShadow: colors.shadow.md,
    categoryActive: colors.primary.main,
    categoryInactive: colors.text.secondary,
    cartSummary: colors.primary.main,
    addButton: colors.success.main,
    removeButton: colors.error.main,
  },

  payment: {
    cashBackground: colors.success.background,
    cashBorder: colors.success.border,
    cashText: colors.success.main,
    cardBackground: colors.info.background,
    cardBorder: colors.info.border,
    cardText: colors.info.main,
    upiBackground: colors.primary.background,
    upiBorder: colors.primary.border,
    upiText: colors.primary.main,
  },
};

export default colors;