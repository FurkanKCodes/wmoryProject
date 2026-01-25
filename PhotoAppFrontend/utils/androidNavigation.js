import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

export const setImmersiveMode = async () => {
  if (Platform.OS === 'android') {
    try {
      // Hide the bottom navigation bar
      await NavigationBar.setVisibilityAsync('hidden');
      // Set behavior so it requires a swipe to show system bars
      await NavigationBar.setBehaviorAsync('overlay-swipe');
      // Make the background transparent
      await NavigationBar.setBackgroundColorAsync('#00000000');
    } catch (e) {
      console.log("Error setting immersive mode:", e);
    }
  }
};

export const restoreSystemBars = async () => {
  if (Platform.OS === 'android') {
    try {
      // Restore system bars when leaving the camera screen
      await NavigationBar.setVisibilityAsync('visible');
    } catch (e) {
      console.log("Error restoring system bars:", e);
    }
  }
};