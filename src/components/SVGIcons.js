import React from 'react';
import { View, Text } from 'react-native';
import { SmartIcon, CreditCardIcon, QRCodeIcon, HourglassIcon, CashIcon } from './StandardizedIcons';

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

  // Checkmark icon - REDESIGNED to look like ✅ emoji
  CheckmarkIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* ✅ CHECKMARK - Short vertical stroke */}
      <View style={{
        width: size * 0.08,
        height: size * 0.25,
        backgroundColor: color,
        borderRadius: size * 0.04,
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
        left: size * 0.35,
        top: size * 0.45
      }} />
      {/* ✅ CHECKMARK - Long diagonal stroke */}
      <View style={{
        width: size * 0.08,
        height: size * 0.45,
        backgroundColor: color,
        borderRadius: size * 0.04,
        transform: [{ rotate: '-45deg' }],
        position: 'absolute',
        right: size * 0.28,
        top: size * 0.28
      }} />
    </View>
  ),

  // Success Circle Icon - REDESIGNED to look like ✅ emoji
  SuccessCircleIcon: ({ size = 20, color = '#10B981', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      {/* Circle background */}
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* ✅ WHITE CHECKMARK - Short vertical stroke */}
        <View style={{
          width: size * 0.08,
          height: size * 0.25,
          backgroundColor: '#ffffff',
          borderRadius: size * 0.04,
          transform: [{ rotate: '45deg' }],
          position: 'absolute',
          left: size * 0.35,
          top: size * 0.45
        }} />
        {/* ✅ WHITE CHECKMARK - Long diagonal stroke */}
        <View style={{
          width: size * 0.08,
          height: size * 0.45,
          backgroundColor: '#ffffff',
          borderRadius: size * 0.04,
          transform: [{ rotate: '-45deg' }],
          position: 'absolute',
          right: size * 0.28,
          top: size * 0.28
        }} />
      </View>
    </View>
  ),

  // Large Success Icon - Professional thick checkmark with 3D depth
  // Based on SVG: viewBox="0 0 128 128", path="M38 66 L56 84 L92 44", stroke-width="12"
  LargeSuccessIcon: ({ size = 80, color = '#00C853', style }) => {
    // Scale factor from 128px viewBox to actual size
    const scale = size / 128;
    const strokeWidth = 12 * scale; // Thick stroke as specified in SVG
    
    return (
      <View style={[{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center'
      }, style]}>
        {/* Green circle with subtle shadow */}
        <View style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8
        }}>
          {/* Left stroke of checkmark: from (38,66) to (56,84) */}
          {/* Length = sqrt((56-38)^2 + (84-66)^2) = sqrt(324+324) = 25.46px */}
          <View style={{
            width: strokeWidth,
            height: 25.46 * scale,
            backgroundColor: '#FFFFFF',
            borderRadius: strokeWidth / 2,
            transform: [{ rotate: '45deg' }],
            position: 'absolute',
            left: 38 * scale + (18 * scale / 2) - (strokeWidth / 2),
            top: 66 * scale + (18 * scale / 2) - (25.46 * scale / 2),
            // 3D depth effect - inner shadow simulation
            shadowColor: '#000000',
            shadowOffset: { width: 1 * scale, height: 1 * scale },
            shadowOpacity: 0.2,
            shadowRadius: 2 * scale,
            elevation: 2
          }} />
          
          {/* Right stroke of checkmark: from (56,84) to (92,44) */}
          {/* Length = sqrt((92-56)^2 + (44-84)^2) = sqrt(1296+1600) = 53.85px */}
          <View style={{
            width: strokeWidth,
            height: 53.85 * scale,
            backgroundColor: '#FFFFFF',
            borderRadius: strokeWidth / 2,
            transform: [{ rotate: '-48deg' }],
            position: 'absolute',
            left: 56 * scale + (36 * scale / 2) - (strokeWidth / 2),
            top: 84 * scale - (40 * scale / 2) - (53.85 * scale / 2),
            // 3D depth effect - inner shadow simulation
            shadowColor: '#000000',
            shadowOffset: { width: 1 * scale, height: 1 * scale },
            shadowOpacity: 0.2,
            shadowRadius: 2 * scale,
            elevation: 2
          }} />
        </View>
      </View>
    );
  },

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

  // Additional icons continue here...
  TrendingUpIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.8,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: '-20deg' }],
        position: 'absolute'
      }} />
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

  TrendingDownIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.8,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: '20deg' }],
        position: 'absolute'
      }} />
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

  TargetIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
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

  CalendarIcon: ({ size = 20, color = '#000', style }) => (
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
        borderRadius: 2,
        backgroundColor: 'transparent',
        marginTop: size * 0.1
      }}>
        <View style={{
          width: '100%',
          height: size * 0.2,
          backgroundColor: color,
          borderTopLeftRadius: 1,
          borderTopRightRadius: 1
        }} />
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

  CurrencyIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.7,
        height: size * 0.9,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <View style={{
          width: 2,
          height: size * 0.9,
          backgroundColor: color,
          position: 'absolute'
        }} />
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

  UsersIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        position: 'absolute',
        left: 0,
        width: size * 0.6,
        height: size * 0.8,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <View style={{
          width: size * 0.25,
          height: size * 0.25,
          borderRadius: size * 0.125,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: 'transparent',
          marginBottom: size * 0.05
        }} />
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
      <View style={{
        position: 'absolute',
        right: 0,
        width: size * 0.6,
        height: size * 0.8,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <View style={{
          width: size * 0.25,
          height: size * 0.25,
          borderRadius: size * 0.125,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: 'transparent',
          marginBottom: size * 0.05
        }} />
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
  ),

  LocationIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.6,
        height: size * 0.8,
        borderRadius: size * 0.3,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: '45deg' }]
      }}>
        <View style={{
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size * 0.1,
          backgroundColor: color
        }} />
      </View>
    </View>
  ),

  CallIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.7,
        height: size * 0.8,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: size * 0.15,
        backgroundColor: 'transparent',
        transform: [{ rotate: '15deg' }]
      }}>
        <View style={{
          width: size * 0.4,
          height: size * 0.1,
          backgroundColor: color,
          borderRadius: size * 0.05,
          alignSelf: 'center',
          marginTop: size * 0.1
        }} />
        <View style={{
          width: size * 0.4,
          height: size * 0.1,
          backgroundColor: color,
          borderRadius: size * 0.05,
          alignSelf: 'center',
          position: 'absolute',
          bottom: size * 0.1,
          left: size * 0.15
        }} />
      </View>
    </View>
  ),

  MailIcon: ({ size = 20, color = '#000', style }) => (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <View style={{
        width: size * 0.8,
        height: size * 0.6,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: 2,
        backgroundColor: 'transparent'
      }}>
        <View style={{
          position: 'absolute',
          top: -1.5,
          left: -1.5,
          right: -1.5,
          height: size * 0.3,
          overflow: 'hidden'
        }}>
          <View style={{
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.4,
            borderRightWidth: size * 0.4,
            borderTopWidth: size * 0.25,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: color,
            alignSelf: 'center'
          }} />
        </View>
      </View>
    </View>
  ),

  DocumentTextIcon: ({ size = 20, color = '#000', style }) => (
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
        alignItems: 'center',
        paddingVertical: size * 0.1
      }}>
        <View style={{
          width: size * 0.5,
          height: 1,
          backgroundColor: color,
          marginBottom: size * 0.08
        }} />
        <View style={{
          width: size * 0.4,
          height: 1,
          backgroundColor: color,
          marginBottom: size * 0.08
        }} />
        <View style={{
          width: size * 0.45,
          height: 1,
          backgroundColor: color,
          marginBottom: size * 0.08
        }} />
        <View style={{
          width: size * 0.35,
          height: 1,
          backgroundColor: color
        }} />
      </View>
      <View style={{
        position: 'absolute',
        top: size * 0.05,
        right: size * 0.15,
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.12,
        borderBottomWidth: size * 0.12,
        borderLeftColor: 'transparent',
        borderBottomColor: color
      }} />
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
    'checkmark-circle': SVGIcons.SuccessCircleIcon,
    'success-large': SVGIcons.LargeSuccessIcon,
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
    'location-outline': SVGIcons.LocationIcon,
    'call-outline': SVGIcons.CallIcon,
    'mail-outline': SVGIcons.MailIcon,
    'document-text-outline': SVGIcons.DocumentTextIcon,
    // Updated icons using standardized SVG components
    'cash-outline': ({ size, color, style }) => <CashIcon size={size} color={color} style={style} />,
    'card-outline': ({ size, color, style }) => <CreditCardIcon size={size} color={color} style={style} />,
    'qr-code-outline': ({ size, color, style }) => <QRCodeIcon size={size} color={color} style={style} />,
    'hourglass-outline': ({ size, color, style }) => <HourglassIcon size={size} color={color} style={style} />,
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