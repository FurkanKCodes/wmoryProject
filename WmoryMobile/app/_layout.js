import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { useFonts } from 'expo-font'; 
import * as SplashScreen from 'expo-splash-screen'; 
import { useEffect } from 'react'; 

SplashScreen.preventAutoHideAsync();

export default function Layout() {

  const [fontsLoaded, error] = useFonts({
    'LeagueSpartan': require('../assets/fonts/LeagueSpartan.ttf'), 
    'Quicksand': require('../assets/fonts/Quicksand.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    // Wrap the entire app with ThemeProvider
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right', 
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="register" options={{ animation: 'none' }} />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_left' }} />
        <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_left' }} />
        <Stack.Screen name="admin-panel" options={{ animation: 'slide_from_left' }} />
        <Stack.Screen name="change-password" options={{ animation: 'slide_from_left' }} />
        
        <Stack.Screen name="home" />
        <Stack.Screen name="group-details" />
        <Stack.Screen name="camera" />
        <Stack.Screen name="media-gallery" />
      </Stack>
    </ThemeProvider>
  );
}