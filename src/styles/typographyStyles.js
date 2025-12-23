// FlowPOS Typography System
// Standardized typography tokens for consistent text styling

export const typography = {
  // Font scale (based on 16px base)
  fontSizes: {
    xs: 12,    // Small labels, captions
    sm: 14,    // Secondary text, form inputs
    base: 16,  // Body text, default
    lg: 18,    // Subheadings
    xl: 20,    // Headings
    '2xl': 24, // Large headings
    '3xl': 30, // Display text
  },
  
  // Font weights
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line heights (relative to font size)
  lineHeights: {
    tight: 1.2,   // Headings
    normal: 1.4,  // Body text
    relaxed: 1.6, // Large text blocks
  },
  
  // Pre-built text styles for common use cases
  styles: {
    // Headings
    h1: {
      fontSize: 30,
      fontWeight: '700',
      lineHeight: 30 * 1.2, // 36
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 24 * 1.2, // 28.8
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 20 * 1.2, // 24
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 18 * 1.2, // 21.6
    },
    
    // Body text
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 16 * 1.4, // 22.4
    },
    bodyMedium: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 16 * 1.4, // 22.4
    },
    bodySemibold: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 16 * 1.4, // 22.4
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 14 * 1.4, // 19.6
    },
    bodySmallMedium: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 14 * 1.4, // 19.6
    },
    
    // UI elements
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 16 * 1.2, // 19.2
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 14 * 1.2, // 16.8
    },
    buttonLarge: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 18 * 1.2, // 21.6
    },
    
    // Form elements
    label: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 14 * 1.4, // 19.6
    },
    input: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 16 * 1.4, // 22.4
    },
    placeholder: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 16 * 1.4, // 22.4
    },
    
    // Utility text
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 12 * 1.4, // 16.8
    },
    captionMedium: {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 12 * 1.4, // 16.8
    },
    overline: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 12 * 1.2, // 14.4
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    
    // Price and numbers
    price: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 18 * 1.2, // 21.6
    },
    priceSmall: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 16 * 1.2, // 19.2
    },
    priceLarge: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 24 * 1.2, // 28.8
    },
    
    // Status and badges
    badge: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 12 * 1.2, // 14.4
    },
    status: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 14 * 1.2, // 16.8
    },
  }
};

// Helper function to get typography style with color
export const getTypographyStyle = (styleName, color) => {
  const baseStyle = typography.styles[styleName] || typography.styles.body;
  return color ? { ...baseStyle, color } : baseStyle;
};

// Helper function to create custom typography style
export const createTypographyStyle = (fontSize, fontWeight = 'normal', lineHeight = 'normal') => {
  const size = typography.fontSizes[fontSize] || fontSize;
  const weight = typography.fontWeights[fontWeight] || fontWeight;
  const lh = lineHeight === 'normal' ? size * 1.4 : 
            lineHeight === 'tight' ? size * 1.2 :
            lineHeight === 'relaxed' ? size * 1.6 : lineHeight;
  
  return {
    fontSize: size,
    fontWeight: weight,
    lineHeight: lh,
  };
};

export default typography;