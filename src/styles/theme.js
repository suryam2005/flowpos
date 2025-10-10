import { colors, semanticColors, componentColors } from './colors';

// Professional design tokens
export const theme = {
  colors,
  semanticColors,
  componentColors,

  // Typography scale
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 32,
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },

  // Spacing scale (based on 4px grid)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
    '6xl': 64,
  },

  // Border radius scale
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
  },

  // Shadow definitions
  shadows: {
    sm: {
      shadowColor: colors.shadow.sm,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: colors.shadow.md,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: colors.shadow.lg,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: colors.shadow.xl,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 16,
    },
  },

  // Component-specific styles
  components: {
    button: {
      height: {
        sm: 32,
        md: 40,
        lg: 48,
        xl: 56,
      },
      padding: {
        sm: { paddingHorizontal: 12, paddingVertical: 6 },
        md: { paddingHorizontal: 16, paddingVertical: 10 },
        lg: { paddingHorizontal: 20, paddingVertical: 12 },
        xl: { paddingHorizontal: 24, paddingVertical: 16 },
      },
    },
    input: {
      height: 48,
      padding: { paddingHorizontal: 16, paddingVertical: 12 },
      borderWidth: 1,
    },
    card: {
      padding: 16,
      borderWidth: 1,
      borderRadius: 12,
    },
  },
};

// Helper functions for consistent styling
export const createButtonStyle = (variant = 'primary', size = 'md') => {
  const colorScheme = componentColors.button[variant];
  const sizeConfig = theme.components.button.padding[size];
  
  return {
    backgroundColor: colorScheme.background,
    borderColor: colorScheme.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...sizeConfig,
    ...theme.shadows.sm,
  };
};

export const createButtonTextStyle = (variant = 'primary', size = 'md') => {
  const colorScheme = componentColors.button[variant];
  const fontSize = size === 'sm' ? theme.typography.fontSize.sm : 
                   size === 'lg' ? theme.typography.fontSize.lg : 
                   theme.typography.fontSize.base;
  
  return {
    color: colorScheme.text,
    fontSize,
    fontWeight: theme.typography.fontWeight.semibold,
  };
};

export const createCardStyle = (elevated = true) => ({
  backgroundColor: componentColors.card.background,
  borderColor: componentColors.card.border,
  borderWidth: 1,
  borderRadius: theme.borderRadius.lg,
  padding: theme.spacing.lg,
  ...(elevated ? theme.shadows.md : {}),
});

export const createInputStyle = (hasError = false, isFocused = false) => ({
  backgroundColor: componentColors.input.background,
  borderColor: hasError ? componentColors.input.errorBorder : 
               isFocused ? componentColors.input.focusBorder : 
               componentColors.input.border,
  borderWidth: hasError || isFocused ? 2 : 1,
  borderRadius: theme.borderRadius.md,
  ...theme.components.input.padding,
  fontSize: theme.typography.fontSize.base,
  color: componentColors.input.text,
});

export default theme;