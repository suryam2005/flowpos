// Navigation utility functions to handle safe navigation

export const safeGoBack = (navigation, fallbackRoute = null, fallbackParams = {}) => {
  try {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (fallbackRoute) {
      navigation.navigate(fallbackRoute, fallbackParams);
    } else {
      // Default fallback to main screen
      navigation.navigate('Main');
    }
  } catch (error) {
    console.warn('Navigation error:', error);
    // Last resort fallback
    if (fallbackRoute) {
      navigation.navigate(fallbackRoute, fallbackParams);
    }
  }
};

export const safeNavigate = (navigation, routeName, params = {}) => {
  try {
    navigation.navigate(routeName, params);
  } catch (error) {
    console.warn('Navigation error:', error);
    // Try to navigate to main screen as fallback
    try {
      navigation.navigate('Main');
    } catch (fallbackError) {
      console.error('Critical navigation error:', fallbackError);
    }
  }
};

export const safeReplace = (navigation, routeName, params = {}) => {
  try {
    navigation.replace(routeName, params);
  } catch (error) {
    console.warn('Navigation replace error:', error);
    // Try regular navigate as fallback
    safeNavigate(navigation, routeName, params);
  }
};