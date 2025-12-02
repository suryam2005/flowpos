import React from 'react';
import { ScrollView, Platform, View } from 'react-native';

const WebScrollView = ({ children, style, contentContainerStyle, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          ...style,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          height: '100%',
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 transparent',
        }}
        {...props}
      >
        <div style={contentContainerStyle}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <ScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      {...props}
    >
      {children}
    </ScrollView>
  );
};

export default WebScrollView;