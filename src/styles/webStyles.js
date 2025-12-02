import { Platform } from 'react-native';

// Web-specific styles to fix scrolling issues
export const webScrollFix = Platform.OS === 'web' ? {
  overflow: 'auto',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'thin',
  scrollbarColor: '#cbd5e1 transparent',
} : {};

export const webContainerFix = Platform.OS === 'web' ? {
  height: '100vh',
  overflow: 'hidden',
} : {};

export const webScrollableContainer = Platform.OS === 'web' ? {
  flex: 1,
  overflow: 'auto',
  WebkitOverflowScrolling: 'touch',
  height: '100%',
} : {};

export const webFlatListFix = Platform.OS === 'web' ? {
  overflow: 'auto',
  WebkitOverflowScrolling: 'touch',
  height: '100%',
} : {};