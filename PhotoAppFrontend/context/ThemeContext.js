import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // 'system', 'light', or 'dark'
  const [themePreference, setThemePreference] = useState('system'); 
  const systemScheme = useColorScheme(); // Detects device setting (e.g., 'dark')

  // Load saved preference on startup
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_theme');
        if (savedTheme) {
          setThemePreference(savedTheme);
        }
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    };
    loadTheme();
  }, []);

  // Determine the actual active colors
  const activeThemeType = 
    themePreference === 'system' ? (systemScheme || 'light') : themePreference;
    
  const colors = Colors[activeThemeType] || Colors.light;

  // Change theme function
  const setTheme = async (newTheme) => {
    setThemePreference(newTheme);
    await AsyncStorage.setItem('app_theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ themePreference, setTheme, colors, isDark: activeThemeType === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom Hook to use theme easily in any component
export const useTheme = () => useContext(ThemeContext);