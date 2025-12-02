import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemAsync } from './src/utils/secureStorage';
import { Platform } from 'react-native';

// Import CSS for web
if (Platform.OS === 'web') {
  require('./web/index.css');
}

import POSScreen from './src/screens/POSScreen';
import TabletPOSScreen from './src/screens/TabletPOSScreen';
import { getDeviceInfo } from './src/utils/deviceUtils';
import CartScreen from './src/screens/CartScreen';
import TabletCartScreen from './src/screens/TabletCartScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ManageScreen from './src/screens/ManageScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ProductOnboardingScreen from './src/screens/onboarding/ProductOnboardingScreen';
import WhatsAppSetupScreen from './src/screens/WhatsAppSetupScreen';
import InvoiceScreen from './src/screens/InvoiceScreen';
import { CartProvider } from './src/context/CartContext';
import { AuthProvider } from './src/context/AuthContext';
import { DataSyncProvider } from './src/context/DataSyncContext';
import { hasOldDummyData, clearAllAppData } from './src/utils/dataUtils';
import PinAuthScreen from './src/screens/auth/PinAuthScreen';

// New Auth Screens
import SignupScreen from './src/screens/auth/SignupScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import OTPVerificationScreen from './src/screens/auth/OTPVerificationScreen';
import PasswordSetupScreen from './src/screens/auth/PasswordSetupScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import ResetPasswordOTPScreen from './src/screens/auth/ResetPasswordOTPScreen';
import NewPasswordScreen from './src/screens/auth/NewPasswordScreen';
import StoreSetupScreen from './src/screens/auth/StoreSetupScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/profile/EditProfileScreen';
import StoreInformationScreen from './src/screens/profile/StoreInformationScreen';
import ChangePasswordScreen from './src/screens/profile/ChangePasswordScreen';
import ChangePasswordOTPScreen from './src/screens/profile/ChangePasswordOTPScreen';
import NotificationsScreen from './src/screens/profile/NotificationsScreen';
import AccountSettingsScreen from './src/screens/profile/AccountSettingsScreen';
import PrivacySecurityScreen from './src/screens/profile/PrivacySecurityScreen';
import HelpSupportScreen from './src/screens/profile/HelpSupportScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  const { isTablet } = getDeviceInfo();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'POS') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Stats') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Manage') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          
          return <Ionicons name={iconName} size={isTablet ? size + 4 : size} color={color} />;
        },
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: isTablet ? 30 : 20,
          paddingTop: isTablet ? 12 : 8,
          height: isTablet ? 120 : 100,
        },
        tabBarLabelStyle: {
          fontSize: isTablet ? 14 : 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="POS" 
        component={isTablet ? TabletPOSScreen : POSScreen} 
      />
      <Tab.Screen name="Stats" component={AnalyticsScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Manage" component={ManageScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [appState, setAppState] = useState(null); // null, 'welcome', 'setup', 'productOnboarding', 'main'
  const { isTablet } = getDeviceInfo();

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      // First, check if we need to clear old dummy data
      await clearOldDummyData();
      
      // Check if user is authenticated (has access token or user data)
      const [accessToken, userData] = await Promise.all([
        AsyncStorage.getItem('accessToken'),
        AsyncStorage.getItem('userData')
      ]);
      
      const isAuthenticated = !!(accessToken && userData);
      console.log('🔐 User authentication status:', isAuthenticated);
      
      // If not authenticated, always show welcome screen
      if (!isAuthenticated) {
        console.log('👋 No authentication found - showing welcome screen');
        setAppState('welcome');
        return;
      }
      
      // User is authenticated, check onboarding status
      const [hasCompletedOnboarding, storeSetupCompleted, productsOnboardingCompleted] = await Promise.all([
        AsyncStorage.getItem('hasCompletedOnboarding'),
        AsyncStorage.getItem('storeSetupCompleted'),
        AsyncStorage.getItem('productsOnboardingCompleted')
      ]);
      
      // Additional check: if user has store data in storage, consider setup completed
      let hasStoreData = false;
      try {
        const storeInfo = await AsyncStorage.getItem('storeInfo');
        hasStoreData = storeInfo && JSON.parse(storeInfo).store_name;
      } catch (error) {
        console.log('Error parsing store info:', error);
        hasStoreData = false;
      }
      
      console.log('📊 App state check:', {
        hasCompletedOnboarding: !!hasCompletedOnboarding,
        storeSetupCompleted: !!storeSetupCompleted,
        productsOnboardingCompleted: !!productsOnboardingCompleted,
        hasStoreData
      });
      
      if (!hasCompletedOnboarding) {
        // Authenticated user but hasn't completed onboarding - show welcome screen
        console.log('👋 Authenticated user needs onboarding - showing welcome screen');
        setAppState('welcome');
      } else if (!storeSetupCompleted && !hasStoreData) {
        // Onboarding done but store setup not completed and no store data exists
        console.log('🏪 User needs store setup - showing setup screen');
        setAppState('setup');
      } else if (!productsOnboardingCompleted) {
        // Store setup done but products not added
        console.log('📦 User needs product onboarding - showing product screen');
        setAppState('productOnboarding');
      } else {
        // All setup completed - go to main app
        console.log('✅ All setup completed - going to main app');
        // Ensure store setup is marked as completed if we have store data
        if (hasStoreData && !storeSetupCompleted) {
          await AsyncStorage.setItem('storeSetupCompleted', 'true');
          console.log('✅ Store setup marked as completed based on existing store data');
        }
        setAppState('main');
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      setAppState('welcome');
    }
  };

  const clearOldDummyData = async () => {
    try {
      const hasDummyData = await hasOldDummyData();
      
      if (hasDummyData) {
        console.log('Clearing old dummy data...');
        await clearAllAppData();
        console.log('Old dummy data cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing old dummy data:', error);
    }
  };

  // Show loading state while checking
  if (appState === null) {
    return <LoadingScreen />;
  }

  const getInitialRoute = () => {
    switch (appState) {
      case 'welcome': return 'Welcome';
      case 'setup': return 'StoreSetup';
      case 'productOnboarding': return 'ProductOnboarding';
      case 'main': return 'Main';
      default: return 'Welcome';
    }
  };

  return (
    <AuthProvider>
      <DataSyncProvider>
        <CartProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <Stack.Navigator 
              screenOptions={{ headerShown: false }}
              initialRouteName={getInitialRoute()}
            >
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="ProductOnboarding" component={ProductOnboardingScreen} />
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen 
                name="Cart" 
                component={isTablet ? TabletCartScreen : CartScreen} 
              />
              <Stack.Screen name="Invoice" component={InvoiceScreen} />
              <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="StoreInformation" component={StoreInformationScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
              <Stack.Screen name="ChangePasswordOTP" component={ChangePasswordOTPScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
              <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
              <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
              <Stack.Screen name="WhatsAppSetup" component={WhatsAppSetupScreen} />
              <Stack.Screen name="Subscription" component={SubscriptionScreen} />
              
              {/* Auth Screens */}
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
              <Stack.Screen name="PasswordSetup" component={PasswordSetupScreen} />
              <Stack.Screen name="StoreSetup" component={StoreSetupScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              
              {/* Forgot Password Screens */}
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ResetPasswordOTP" component={ResetPasswordOTPScreen} />
              <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>
      </DataSyncProvider>
    </AuthProvider>
  );
}