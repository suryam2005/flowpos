// Navigation utility functions to handle safe navigation

// Navigation utility functions to handle safe navigation

export const safeGoBack = (navigation, fallbackRoute = null, fallbackParams = {}) => {
  try {
    console.log('🔍 [safeGoBack] Called with:', {
      canGoBack: navigation.canGoBack(),
      fallbackRoute,
      fallbackParams
    });
    
    if (navigation.canGoBack()) {
      console.log('✅ [safeGoBack] Going back normally');
      navigation.goBack();
    } else if (fallbackRoute) {
      console.log('🔄 [safeGoBack] Using provided fallback:', fallbackRoute);
      navigation.navigate(fallbackRoute, fallbackParams);
    } else {
      // Instead of defaulting to 'Main' (which goes to POS), 
      // try to stay on current tab or go to a more appropriate screen
      console.log('⚠️ [safeGoBack] No fallback provided, staying on current screen');
      
      // Don't navigate anywhere - let the user use tab navigation
      // This prevents unwanted redirects to POS screen
      return;
    }
  } catch (error) {
    console.warn('❌ [safeGoBack] Navigation error:', error);
    // Only use fallback if explicitly provided
    if (fallbackRoute) {
      try {
        navigation.navigate(fallbackRoute, fallbackParams);
      } catch (fallbackError) {
        console.error('❌ [safeGoBack] Fallback navigation failed:', fallbackError);
      }
    }
  }
};

export const safeNavigate = (navigation, routeName, params = {}) => {
  try {
    console.log('🔍 [safeNavigate] Navigating to:', routeName, params);
    navigation.navigate(routeName, params);
  } catch (error) {
    console.warn('❌ [safeNavigate] Navigation error:', error);
    // Only try fallback if it's a different route
    if (routeName !== 'Main') {
      try {
        console.log('🔄 [safeNavigate] Trying Main fallback');
        navigation.navigate('Main');
      } catch (fallbackError) {
        console.error('❌ [safeNavigate] Critical navigation error:', fallbackError);
      }
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