import React from 'react';
import { View, Text } from 'react-native';

// Simple SVG-like icons using React Native Views and Text
const SVGIcons = {
  // Document/Invoice icon
  DocumentIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      borderWidth: 1.5,
      borderColor: color,
      borderRadius: 2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent'
    }, style]}>
      <View style={{
        width: size * 0.6,
        height: 1,
        backgroundColor: color,
        marginBottom: 2
      }} />
      <View style={{
        width: size * 0.4,
        height: 1,
        backgroundColor: color,
        marginBottom: 2
      }} />
      <View style={{
        width: size * 0.5,
        height: 1,
        backgroundColor: color
      }} />
    </View>
  ),

  // Send/Arrow icon
  SendIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.4,
        borderRightWidth: size * 0.4,
        borderBottomWidth: size * 0.6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        transform: [{ rotate: '45deg' }]
      }} />
    </View>
  ),

  // Receipt icon
  ReceiptIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size * 0.8,
      height: size,
      borderWidth: 1.5,
      borderColor: color,
      borderRadius: 2,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: size * 0.1,
      backgroundColor: 'transparent'
    }, style]}>
      {/* Receipt lines */}
      <View style={{
        width: size * 0.5,
        height: 1,
        backgroundColor: color,
        marginBottom: size * 0.1
      }} />
      <View style={{
        width: size * 0.4,
        height: 1,
        backgroundColor: color,
        marginBottom: size * 0.1
      }} />
      <View style={{
        width: size * 0.6,
        height: 1,
        backgroundColor: color,
        marginBottom: size * 0.1
      }} />
      {/* Receipt bottom zigzag effect */}
      <View style={{
        position: 'absolute',
        bottom: -1.5,
        width: size * 0.8,
        height: 3,
        backgroundColor: color
      }} />
    </View>
  ),

  // Back Arrow icon
  BackArrowIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: 0,
        height: 0,
        borderTopWidth: size * 0.3,
        borderBottomWidth: size * 0.3,
        borderRightWidth: size * 0.6,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderRightColor: color
      }} />
    </View>
  ),

  // Cube/Product icon
  CubeIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.8,
        height: size * 0.8,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: 3,
        backgroundColor: 'transparent'
      }}>
        {/* Inner lines to make it look 3D */}
        <View style={{
          position: 'absolute',
          top: size * 0.2,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: color
        }} />
        <View style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: size * 0.25,
          width: 1,
          backgroundColor: color
        }} />
      </View>
    </View>
  ),

  // Trash/Delete icon
  TrashIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* Trash can body */}
      <View style={{
        width: size * 0.6,
        height: size * 0.7,
        borderWidth: 1.5,
        borderColor: color,
        borderTopWidth: 0,
        borderRadius: 2,
        backgroundColor: 'transparent',
        marginTop: size * 0.15
      }}>
        {/* Vertical lines inside */}
        <View style={{
          position: 'absolute',
          top: size * 0.1,
          bottom: size * 0.1,
          left: size * 0.15,
          width: 1,
          backgroundColor: color
        }} />
        <View style={{
          position: 'absolute',
          top: size * 0.1,
          bottom: size * 0.1,
          right: size * 0.15,
          width: 1,
          backgroundColor: color
        }} />
      </View>
      {/* Trash can lid */}
      <View style={{
        position: 'absolute',
        top: size * 0.1,
        width: size * 0.8,
        height: 2,
        backgroundColor: color,
        borderRadius: 1
      }} />
      {/* Handle */}
      <View style={{
        position: 'absolute',
        top: size * 0.05,
        width: size * 0.3,
        height: size * 0.15,
        borderWidth: 1,
        borderColor: color,
        borderBottomWidth: 0,
        borderRadius: 2,
        backgroundColor: 'transparent'
      }} />
    </View>
  ),

  // Checkmark icon
  CheckmarkIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.3,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
        left: size * 0.2,
        top: size * 0.6
      }} />
      <View style={{
        width: size * 0.6,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: '-45deg' }],
        position: 'absolute',
        right: size * 0.1,
        top: size * 0.4
      }} />
    </View>
  ),

  // Person icon
  PersonIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* Head */}
      <View style={{
        width: size * 0.4,
        height: size * 0.4,
        borderRadius: size * 0.2,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: 'transparent',
        marginBottom: size * 0.05
      }} />
      {/* Body */}
      <View style={{
        width: size * 0.7,
        height: size * 0.45,
        borderTopLeftRadius: size * 0.35,
        borderTopRightRadius: size * 0.35,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: 'transparent'
      }} />
    </View>
  ),

  // Share icon
  ShareIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* Arrow pointing up */}
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.25,
        borderRightWidth: size * 0.25,
        borderBottomWidth: size * 0.4,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        marginBottom: size * 0.1
      }} />
      {/* Arrow stem */}
      <View style={{
        width: 2,
        height: size * 0.4,
        backgroundColor: color
      }} />
    </View>
  ),

  // Download icon
  DownloadIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* Arrow pointing down */}
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.25,
        borderRightWidth: size * 0.25,
        borderTopWidth: size * 0.4,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: color,
        marginTop: size * 0.1
      }} />
      {/* Arrow stem */}
      <View style={{
        width: 2,
        height: size * 0.4,
        backgroundColor: color,
        position: 'absolute',
        top: size * 0.1
      }} />
      {/* Base line */}
      <View style={{
        width: size * 0.8,
        height: 2,
        backgroundColor: color,
        position: 'absolute',
        bottom: size * 0.1
      }} />
    </View>
  ),

  // Chart/Analytics icon
  ChartIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'flex-end',
      alignItems: 'center',
      flexDirection: 'row'
    }, style]}>
      <View style={{
        width: size * 0.15,
        height: size * 0.4,
        backgroundColor: color,
        marginRight: size * 0.1,
        borderRadius: 1
      }} />
      <View style={{
        width: size * 0.15,
        height: size * 0.7,
        backgroundColor: color,
        marginRight: size * 0.1,
        borderRadius: 1
      }} />
      <View style={{
        width: size * 0.15,
        height: size * 0.5,
        backgroundColor: color,
        marginRight: size * 0.1,
        borderRadius: 1
      }} />
      <View style={{
        width: size * 0.15,
        height: size * 0.9,
        backgroundColor: color,
        borderRadius: 1
      }} />
    </View>
  ),

  // Cloud icon
  CloudIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.8,
        height: size * 0.5,
        borderRadius: size * 0.25,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: 'transparent'
      }}>
        {/* Small cloud bumps */}
        <View style={{
          position: 'absolute',
          top: -size * 0.15,
          left: size * 0.15,
          width: size * 0.25,
          height: size * 0.25,
          borderRadius: size * 0.125,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: 'transparent'
        }} />
        <View style={{
          position: 'absolute',
          top: -size * 0.2,
          right: size * 0.15,
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: 'transparent'
        }} />
      </View>
    </View>
  ),

  // Info icon
  InfoIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.8,
        height: size * 0.8,
        borderRadius: size * 0.4,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{
          fontSize: size * 0.6,
          fontWeight: 'bold',
          color: color
        }}>i</Text>
      </View>
    </View>
  ),

  // PDF icon
  PDFIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.7,
        height: size * 0.9,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: 2,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{
          fontSize: size * 0.25,
          fontWeight: 'bold',
          color: color
        }}>PDF</Text>
      </View>
      {/* Corner fold */}
      <View style={{
        position: 'absolute',
        top: size * 0.05,
        right: size * 0.15,
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.15,
        borderBottomWidth: size * 0.15,
        borderLeftColor: 'transparent',
        borderBottomColor: color
      }} />
    </View>
  ),

  // Trending Up icon (for growth/increase)
  TrendingUpIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* Upward trending line */}
      <View style={{
        width: size * 0.8,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: '-20deg' }],
        position: 'absolute'
      }} />
      {/* Arrow head */}
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.15,
        borderBottomWidth: size * 0.15,
        borderLeftColor: 'transparent',
        borderBottomColor: color,
        position: 'absolute',
        right: size * 0.05,
        top: size * 0.25,
        transform: [{ rotate: '45deg' }]
      }} />
    </View>
  ),

  // Trending Down icon (for decrease)
  TrendingDownIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* Downward trending line */}
      <View style={{
        width: size * 0.8,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: '20deg' }],
        position: 'absolute'
      }} />
      {/* Arrow head */}
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.15,
        borderTopWidth: size * 0.15,
        borderLeftColor: 'transparent',
        borderTopColor: color,
        position: 'absolute',
        right: size * 0.05,
        bottom: size * 0.25,
        transform: [{ rotate: '-45deg' }]
      }} />
    </View>
  ),

  // Target icon (for goals/targets)
  TargetIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* Outer circle */}
      <View style={{
        width: size * 0.9,
        height: size * 0.9,
        borderRadius: size * 0.45,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Middle circle */}
        <View style={{
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: size * 0.3,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* Center dot */}
          <View style={{
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: size * 0.1,
            backgroundColor: color
          }} />
        </View>
      </View>
    </View>
  ),

  // Calendar icon (for date ranges)
  CalendarIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* Calendar body */}
      <View style={{
        width: size * 0.8,
        height: size * 0.8,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: 2,
        backgroundColor: 'transparent',
        marginTop: size * 0.1
      }}>
        {/* Calendar header */}
        <View style={{
          width: '100%',
          height: size * 0.2,
          backgroundColor: color,
          borderTopLeftRadius: 1,
          borderTopRightRadius: 1
        }} />
        {/* Calendar grid dots */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          flex: 1,
          paddingHorizontal: size * 0.1
        }}>
          <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
        </View>
      </View>
      {/* Calendar rings */}
      <View style={{
        position: 'absolute',
        top: size * 0.02,
        left: size * 0.25,
        width: size * 0.1,
        height: size * 0.15,
        borderWidth: 1,
        borderColor: color,
        borderBottomWidth: 0,
        borderRadius: 2
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.02,
        right: size * 0.25,
        width: size * 0.1,
        height: size * 0.15,
        borderWidth: 1,
        borderColor: color,
        borderBottomWidth: 0,
        borderRadius: 2
      }} />
    </View>
  ),

  // Currency icon (for revenue)
  CurrencyIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* Dollar sign */}
      <View style={{
        width: size * 0.7,
        height: size * 0.9,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Vertical line */}
        <View style={{
          width: 2,
          height: size * 0.9,
          backgroundColor: color,
          position: 'absolute'
        }} />
        {/* Top curve */}
        <View style={{
          width: size * 0.5,
          height: size * 0.3,
          borderWidth: 2,
          borderColor: color,
          borderBottomWidth: 0,
          borderLeftWidth: 0,
          borderTopRightRadius: size * 0.15,
          position: 'absolute',
          top: size * 0.1
        }} />
        {/* Bottom curve */}
        <View style={{
          width: size * 0.5,
          height: size * 0.3,
          borderWidth: 2,
          borderColor: color,
          borderTopWidth: 0,
          borderRightWidth: 0,
          borderBottomLeftRadius: size * 0.15,
          position: 'absolute',
          bottom: size * 0.1,
          right: 0
        }} />
      </View>
    </View>
  ),

  // Users icon (for customers)
  UsersIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* First person (left) */}
      <View style={{
        position: 'absolute',
        left: 0,
        width: size * 0.6,
        height: size * 0.8,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Head */}
        <View style={{
          width: size * 0.25,
          height: size * 0.25,
          borderRadius: size * 0.125,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: 'transparent',
          marginBottom: size * 0.05
        }} />
        {/* Body */}
        <View style={{
          width: size * 0.45,
          height: size * 0.35,
          borderTopLeftRadius: size * 0.225,
          borderTopRightRadius: size * 0.225,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: 'transparent'
        }} />
      </View>
      {/* Second person (right, slightly overlapped) */}
      <View style={{
        position: 'absolute',
        right: 0,
        width: size * 0.6,
        height: size * 0.8,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Head */}
        <View style={{
          width: size * 0.25,
          height: size * 0.25,
          borderRadius: size * 0.125,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: 'transparent',
          marginBottom: size * 0.05
        }} />
        {/* Body */}
        <View style={{
          width: size * 0.45,
          height: size * 0.35,
          borderTopLeftRadius: size * 0.225,
          borderTopRightRadius: size * 0.225,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: 'transparent'
        }} />
      </View>
    </View>
  )
};

// Main Icon component that maps icon names to components
const Icon = ({ name, size = 20, color = '#000', style }) => {
  const iconComponents = {
    'document-text-outline': SVGIcons.DocumentIcon,
    'send-outline': SVGIcons.SendIcon,
    'receipt-outline': SVGIcons.ReceiptIcon,
    'arrow-back': SVGIcons.BackArrowIcon,
    'cube-outline': SVGIcons.CubeIcon,
    'trash-outline': SVGIcons.TrashIcon,
    'checkmark': SVGIcons.CheckmarkIcon,
    'person-outline': SVGIcons.PersonIcon,
    'share-outline': SVGIcons.ShareIcon,
    'download-outline': SVGIcons.DownloadIcon,
    'analytics-outline': SVGIcons.ChartIcon,
    'cloud-outline': SVGIcons.CloudIcon,
    'information-circle-outline': SVGIcons.InfoIcon,
    'document-pdf-outline': SVGIcons.PDFIcon,
    'trending-up-outline': SVGIcons.TrendingUpIcon,
    'trending-down-outline': SVGIcons.TrendingDownIcon,
    'target-outline': SVGIcons.TargetIcon,
    'calendar-outline': SVGIcons.CalendarIcon,
    'currency-outline': SVGIcons.CurrencyIcon,
    'users-outline': SVGIcons.UsersIcon,
    'cash-outline': () => <Text style={{ fontSize: size * 0.8, color }}>$</Text>,
    'card-outline': () => <Text style={{ fontSize: size * 0.8, color }}>💳</Text>,
    'qr-code-outline': () => <Text style={{ fontSize: size * 0.8, color }}>⚏</Text>,
    'hourglass-outline': () => <Text style={{ fontSize: size * 0.8, color }}>⧗</Text>,
    'logo-whatsapp': () => <Text style={{ fontSize: size * 0.8, color }}>W</Text>
  };

  const IconComponent = iconComponents[name];
  
  if (!IconComponent) {
    return <View style={[{ width: size, height: size }, style]} />;
  }

  return <IconComponent size={size} color={color} style={style} />;
};

export default Icon;
export { SVGIcons };