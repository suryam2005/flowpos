import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/colors';
import { typography } from '../styles/typographyStyles';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference on app start
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('darkTheme');
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('darkTheme', JSON.stringify(newTheme));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const setTheme = async (darkMode) => {
    try {
      setIsDarkMode(darkMode);
      await AsyncStorage.setItem('darkTheme', JSON.stringify(darkMode));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Get current theme colors and typography
  const theme = isDarkMode ? {
    // Dark theme colors
    background: {
      primary: colors.dark.background.primary,
      surface: colors.dark.background.surface,
      overlay: colors.dark.background.overlay,
    },
    text: {
      primary: colors.dark.text.primary,
      secondary: colors.dark.text.secondary,
      tertiary: colors.dark.text.tertiary,
      disabled: colors.dark.text.tertiary,
      inverse: colors.text.primary,
    },
    primary: {
      main: colors.dark.primary.main,
      hover: colors.dark.primary.hover,
      light: colors.dark.primary.light,
      background: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.3)',
    },
    success: {
      main: colors.dark.success.main,
      light: colors.dark.success.light,
      background: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.3)',
    },
    error: {
      main: colors.error.main,
      light: colors.error.light,
      background: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)',
    },
    warning: {
      main: colors.warning.main,
      dark: colors.warning.dark,
      light: colors.warning.light,
      background: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.3)',
    },
    info: {
      main: colors.info.main,
      light: colors.info.light,
      background: 'rgba(14, 165, 233, 0.1)',
      border: 'rgba(14, 165, 233, 0.3)',
    },
    border: {
      light: colors.dark.border.light,
      medium: colors.dark.border.medium,
      dark: colors.border.dark,
    },
    gray: {
      50: colors.gray[800],
      100: colors.gray[700],
      200: colors.gray[600],
      300: colors.gray[500],
      400: colors.gray[400],
      500: colors.gray[300],
      600: colors.gray[200],
      700: colors.gray[100],
      800: colors.gray[50],
      900: '#FFFFFF',
    },
    shadow: {
      default: '#000000',
      sm: 'rgba(0, 0, 0, 0.3)',
      md: 'rgba(0, 0, 0, 0.4)',
      lg: 'rgba(0, 0, 0, 0.5)',
      xl: 'rgba(0, 0, 0, 0.6)',
    },
    // Typography system (same for both themes)
    typography: typography,
  } : {
    // Light theme colors (default)
    background: colors.background,
    text: colors.text,
    primary: colors.primary,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    border: colors.border,
    gray: colors.gray,
    shadow: colors.shadow,
    // Typography system (same for both themes)
    typography: typography,
  };

  const value = {
    isDarkMode,
    isLoading,
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;