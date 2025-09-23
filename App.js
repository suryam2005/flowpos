import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemAsync } from './src/utils/secureStorage';

import POSScreen from './src/screens/POSScreen';
import CartScreen from './src/screens/CartScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ManageScreen from './src/screens/ManageScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import StoreSetupScreen from './src/screens/onboarding/StoreSetupScreen';
import InvoiceScreen from './src/screens/InvoiceScreen';
import { CartProvider } from './src/context/CartContext';
import { AuthProvider } from './src/context/AuthContext';
import { hasOldDummyData, clearAllAppData } from './src/utils/dataUtils';
import PinSetupScreen from './src/screens/auth/PinSetupScreen';
import PinAuthScreen from './src/screens/auth/PinAuthScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
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
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8b5cf6', // Purple accent
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 20, // Reduced to 20px bottom spacing
          paddingTop: 8,
          height: 100, // Reduced height
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="POS" component={POSScreen} />
      <Tab.Screen name="Stats" component={AnalyticsScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Manage" component={ManageScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [appState, setAppState] = useState(null); // null, 'welcome', 'setup', 'pinSetup', 'pinAuth', 'main'

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      // First, check if we need to clear old dummy data
      await clearOldDummyData();
      
      const [hasCompletedOnboarding, storeSetupCompleted, pinSetupCompleted] = await Promise.all([
        AsyncStorage.getItem('hasCompletedOnboarding'),
        AsyncStorage.getItem('storeSetupCompleted'),
        getItemAsync('pinSetupCompleted')
      ]);
      
      if (!hasCompletedOnboarding) {
        // First time user - show welcome screen
        setAppState('welcome');
      } else if (!storeSetupCompleted) {
        // Onboarding done but store setup not completed
        setAppState('setup');
      } else if (!pinSetupCompleted) {
        // Store setup done but PIN not set up
        setAppState('pinSetup');
      } else {
        // Everything set up - require PIN authentication
        setAppState('pinAuth');
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
      case 'pinSetup': return 'PinSetup';
      case 'pinAuth': return 'PinAuth';
      case 'main': return 'Main';
      default: return 'Welcome';
    }
  };

  return (
    <AuthProvider>
      <CartProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator 
            screenOptions={{ headerShown: false }}
            initialRouteName={getInitialRoute()}
          >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="StoreSetup" component={StoreSetupScreen} />
            <Stack.Screen name="PinSetup" component={PinSetupScreen} />
            <Stack.Screen name="PinAuth" component={PinAuthScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="Invoice" component={InvoiceScreen} />
            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </AuthProvider>
  );
}