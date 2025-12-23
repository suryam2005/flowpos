/**
 * Standardized SVG Icons for FlowPOS
 * Replaces emoji-based icons with proper scalable vector graphics
 */

import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Rect, Polygon, Line } from 'react-native-svg';

// Standardized icon sizes
export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32
};

// Base icon component with consistent behavior
const BaseIcon = ({ size = 'md', color = '#000', style, children, fallback, useFallback = false }) => {
  const iconSize = typeof size === 'number' ? size : ICON_SIZES[size];
  
  if (useFallback && fallback) {
    return (
      <View style={[{ width: iconSize, height: iconSize }, style]}>
        {fallback}
      </View>
    );
  }
  
  return (
    <Svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      style={style}
    >
      {children}
    </Svg>
  );
};

// Credit Card SVG Icon (replaces 💳 emoji)
export const CreditCardIcon = ({ size = 'md', color = '#000', style, useFallback = false }) => (
  <BaseIcon 
    size={size} 
    color={color} 
    style={style}
    useFallback={useFallback}
    fallback={<Text style={{ fontSize: ICON_SIZES[size] * 0.8, color }}>💳</Text>}
  >
    <Rect x="2" y="6" width="20" height="12" rx="2" fill="none" stroke={color} strokeWidth="2"/>
    <Path d="M2 10h20" stroke={color} strokeWidth="2"/>
    <Path d="M6 14h2" stroke={color} strokeWidth="2"/>
    <Path d="M10 14h4" stroke={color} strokeWidth="2"/>
  </BaseIcon>
);

// QR Code SVG Icon (replaces ⚏ symbol)
export const QRCodeIcon = ({ size = 'md', color = '#000', style, useFallback = false }) => (
  <BaseIcon 
    size={size} 
    color={color} 
    style={style}
    useFallback={useFallback}
    fallback={<Text style={{ fontSize: ICON_SIZES[size] * 0.8, color }}>⚏</Text>}
  >
    <Rect x="3" y="3" width="7" height="7" fill={color}/>
    <Rect x="14" y="3" width="7" height="7" fill={color}/>
    <Rect x="3" y="14" width="7" height="7" fill={color}/>
    <Rect x="5" y="5" width="3" height="3" fill="white"/>
    <Rect x="16" y="5" width="3" height="3" fill="white"/>
    <Rect x="5" y="16" width="3" height="3" fill="white"/>
    <Rect x="14" y="12" width="2" height="2" fill={color}/>
    <Rect x="18" y="12" width="2" height="2" fill={color}/>
    <Rect x="12" y="14" width="2" height="2" fill={color}/>
    <Rect x="16" y="16" width="2" height="2" fill={color}/>
    <Rect x="14" y="18" width="2" height="2" fill={color}/>
    <Rect x="18" y="18" width="2" height="2" fill={color}/>
  </BaseIcon>
);

// Hourglass SVG Icon (replaces ⧗ symbol)
export const HourglassIcon = ({ size = 'md', color = '#000', style, useFallback = false }) => (
  <BaseIcon 
    size={size} 
    color={color} 
    style={style}
    useFallback={useFallback}
    fallback={<Text style={{ fontSize: ICON_SIZES[size] * 0.8, color }}>⧗</Text>}
  >
    <Path 
      d="M6 2h12v6l-6 6 6 6v6H6v-6l6-6-6-6V2z" 
      fill="none" 
      stroke={color} 
      strokeWidth="2"
    />
    <Path d="M6 2h12" stroke={color} strokeWidth="2"/>
    <Path d="M6 22h12" stroke={color} strokeWidth="2"/>
    <Path d="M12 12l-3-3h6l-3 3z" fill={color}/>
  </BaseIcon>
);

// Cash SVG Icon (replaces $ text)
export const CashIcon = ({ size = 'md', color = '#000', style, useFallback = false }) => (
  <BaseIcon 
    size={size} 
    color={color} 
    style={style}
    useFallback={useFallback}
    fallback={<Text style={{ fontSize: ICON_SIZES[size] * 0.8, color }}>$</Text>}
  >
    <Rect x="2" y="7" width="20" height="10" rx="2" fill="none" stroke={color} strokeWidth="2"/>
    <Circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="2"/>
    <Path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="2"/>
  </BaseIcon>
);

// UPI Icon (for digital payments)
export const UPIIcon = ({ size = 'md', color = '#000', style }) => (
  <BaseIcon size={size} color={color} style={style}>
    <Rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke={color} strokeWidth="2"/>
    <Path d="M7 8h10" stroke={color} strokeWidth="2"/>
    <Path d="M7 12h6" stroke={color} strokeWidth="2"/>
    <Path d="M7 16h8" stroke={color} strokeWidth="2"/>
    <Circle cx="16" cy="14" r="2" fill={color}/>
  </BaseIcon>
);

// WhatsApp Icon (improved W design)
export const WhatsAppIcon = ({ size = 'md', color = '#25D366', style }) => (
  <BaseIcon size={size} color={color} style={style}>
    <Circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2"/>
    <Path 
      d="M8.5 14.5c1.5 1.5 3.5 2.5 5.5 2.5s4-1 5.5-2.5M9 10.5c0-1.5 1-2.5 2.5-2.5h1c1.5 0 2.5 1 2.5 2.5v1c0 1.5-1 2.5-2.5 2.5h-1c-1.5 0-2.5-1-2.5-2.5v-1z" 
      stroke={color} 
      strokeWidth="1.5" 
      fill="none"
    />
    <Circle cx="16" cy="8" r="1" fill={color}/>
  </BaseIcon>
);

// Status Icons with better designs
export const SuccessIcon = ({ size = 'md', color = '#10B981', style }) => (
  <BaseIcon size={size} color={color} style={style}>
    <Circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2"/>
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" fill="none"/>
  </BaseIcon>
);

export const ErrorIcon = ({ size = 'md', color = '#EF4444', style }) => (
  <BaseIcon size={size} color={color} style={style}>
    <Circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2"/>
    <Path d="M15 9l-6 6" stroke={color} strokeWidth="2"/>
    <Path d="M9 9l6 6" stroke={color} strokeWidth="2"/>
  </BaseIcon>
);

export const WarningIcon = ({ size = 'md', color = '#F59E0B', style }) => (
  <BaseIcon size={size} color={color} style={style}>
    <Path d="M12 2L2 22h20L12 2z" fill="none" stroke={color} strokeWidth="2"/>
    <Path d="M12 8v4" stroke={color} strokeWidth="2"/>
    <Circle cx="12" cy="16" r="1" fill={color}/>
  </BaseIcon>
);

// Enhanced Document Icon
export const DocumentIcon = ({ size = 'md', color = '#000', style }) => (
  <BaseIcon size={size} color={color} style={style}>
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke={color} strokeWidth="2"/>
    <Path d="M14 2v6h6" stroke={color} strokeWidth="2"/>
    <Path d="M16 13H8" stroke={color} strokeWidth="2"/>
    <Path d="M16 17H8" stroke={color} strokeWidth="2"/>
    <Path d="M10 9H8" stroke={color} strokeWidth="2"/>
  </BaseIcon>
);

// Enhanced Receipt Icon
export const ReceiptIcon = ({ size = 'md', color = '#000', style }) => (
  <BaseIcon size={size} color={color} style={style}>
    <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" fill="none" stroke={color} strokeWidth="2"/>
    <Path d="M16 8H8" stroke={color} strokeWidth="2"/>
    <Path d="M16 12H8" stroke={color} strokeWidth="2"/>
    <Path d="M16 16H8" stroke={color} strokeWidth="2"/>
  </BaseIcon>
);

// Smart Icon Component that handles migration
export const SmartIcon = ({ 
  name, 
  size = 'md', 
  color = '#000', 
  style,
  forceSVG = false,
  forceEmoji = false,
  ...props 
}) => {
  // Icon mapping
  const iconMappings = {
    'card-outline': CreditCardIcon,
    '💳': CreditCardIcon,
    'qr-code-outline': QRCodeIcon,
    '⚏': QRCodeIcon,
    'hourglass-outline': HourglassIcon,
    '⧗': HourglassIcon,
    'cash-outline': CashIcon,
    'upi-outline': UPIIcon,
    'logo-whatsapp': WhatsAppIcon,
    'checkmark-circle': SuccessIcon,
    'close-circle': ErrorIcon,
    'warning': WarningIcon,
    'document-text-outline': DocumentIcon,
    'receipt-outline': ReceiptIcon,
  };

  const IconComponent = iconMappings[name];
  
  if (!IconComponent) {
    // Fallback to text if no SVG available
    return <Text style={{ fontSize: ICON_SIZES[size] * 0.8, color, ...style }}>{name}</Text>;
  }

  return <IconComponent size={size} color={color} style={style} {...props} />;
};

export default {
  CreditCardIcon,
  QRCodeIcon,
  HourglassIcon,
  CashIcon,
  UPIIcon,
  WhatsAppIcon,
  SuccessIcon,
  ErrorIcon,
  WarningIcon,
  DocumentIcon,
  ReceiptIcon,
  SmartIcon,
  ICON_SIZES,
};