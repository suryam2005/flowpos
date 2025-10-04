import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { getDeviceInfo, getResponsiveValue } from '../utils/deviceUtils';

const ResponsiveText = ({ 
  children, 
  style, 
  variant = 'body',
  numberOfLines,
  ellipsizeMode = 'tail',
  adjustsFontSizeToFit = false,
  minimumFontScale = 0.8,
  ...props 
}) => {
  const { isTablet } = getDeviceInfo();

  const getVariantStyle = () => {
    const baseStyles = {
      title: {
        fontSize: getResponsiveValue(24, 28, 32),
        fontWeight: '700',
        lineHeight: getResponsiveValue(30, 34, 38),
      },
      subtitle: {
        fontSize: getResponsiveValue(18, 20, 22),
        fontWeight: '600',
        lineHeight: getResponsiveValue(24, 26, 28),
      },
      body: {
        fontSize: getResponsiveValue(16, 17, 18),
        fontWeight: '400',
        lineHeight: getResponsiveValue(22, 24, 26),
      },
      caption: {
        fontSize: getResponsiveValue(14, 15, 16),
        fontWeight: '400',
        lineHeight: getResponsiveValue(18, 20, 22),
      },
      small: {
        fontSize: getResponsiveValue(12, 13, 14),
        fontWeight: '400',
        lineHeight: getResponsiveValue(16, 18, 20),
      },
      button: {
        fontSize: getResponsiveValue(16, 17, 18),
        fontWeight: '600',
        lineHeight: getResponsiveValue(20, 22, 24),
      },
      price: {
        fontSize: getResponsiveValue(18, 20, 22),
        fontWeight: '700',
        lineHeight: getResponsiveValue(22, 24, 26),
      },
    };

    return baseStyles[variant] || baseStyles.body;
  };

  const combinedStyle = [
    styles.base,
    getVariantStyle(),
    isTablet && styles.tablet,
    style,
  ];

  return (
    <Text
      style={combinedStyle}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    color: '#1f2937',
    textAlign: 'left',
    flexWrap: 'wrap',
    flexShrink: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tablet: {
    letterSpacing: 0.2,
  },
});

export default ResponsiveText;