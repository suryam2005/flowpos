import { Dimensions, Platform } from 'react-native';

export const getDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  const aspectRatio = width / height;
  
  // Determine if device is tablet based on screen size and aspect ratio
  const isTablet = (width >= 768 && height >= 1024) || 
                   (width >= 1024 && height >= 768) ||
                   (Platform.OS === 'ios' && (width >= 768 || height >= 768));
  
  const isLandscape = width > height;
  
  return {
    width,
    height,
    isTablet,
    isLandscape,
    aspectRatio,
    isSmallTablet: isTablet && Math.min(width, height) < 900,
    isLargeTablet: isTablet && Math.min(width, height) >= 900,
  };
};

export const getResponsiveValue = (phoneValue, tabletValue, largeTabletValue) => {
  const { isTablet, isLargeTablet } = getDeviceInfo();
  
  if (isLargeTablet && largeTabletValue !== undefined) {
    return largeTabletValue;
  }
  
  if (isTablet && tabletValue !== undefined) {
    return tabletValue;
  }
  
  return phoneValue;
};

export const getGridColumns = () => {
  const { isTablet, isLandscape, width } = getDeviceInfo();
  
  if (!isTablet) return 2;
  
  if (isLandscape) {
    return width >= 1200 ? 6 : width >= 1000 ? 5 : 4;
  } else {
    return width >= 900 ? 4 : 3;
  }
};

export const getTabletLayoutConfig = () => {
  const { isTablet, isLandscape, width, height } = getDeviceInfo();
  
  if (!isTablet) {
    return {
      useTabletLayout: false,
      showSidebar: false,
      sidebarWidth: 0,
      mainContentWidth: width,
    };
  }
  
  const sidebarWidth = isLandscape ? 
    (width >= 1200 ? 400 : 350) : 
    (width >= 900 ? 350 : 300);
  
  return {
    useTabletLayout: true,
    showSidebar: isLandscape,
    sidebarWidth,
    mainContentWidth: isLandscape ? width - sidebarWidth : width,
    preferredCartPosition: isLandscape ? 'sidebar' : 'bottom',
  };
};