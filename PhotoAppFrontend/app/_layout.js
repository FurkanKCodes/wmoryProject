import { Stack } from 'expo-router';

export default function Layout() {

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // GENERAL RULE (Items 10, 11, 12, 13, 14, 15):
        // Screens like group-details, camera, media-gallery slide in from the RIGHT.
        // When navigating back, the screen slides out from LEFT to RIGHT (revealing Home).
        animation: 'slide_from_right', 
      }}
    >
      {/* RULE 1: No transition effect between index and register pages. 
      */}
      <Stack.Screen 
        name="index" 
        options={{ animation: 'none' }} 
      />
      <Stack.Screen 
        name="register" 
        options={{ animation: 'none' }} 
      />

      {/* RULES 2 & 3: Profile screen slides in from LEFT to right.
         When going back (to Home), it returns the way it came.
      */}
      <Stack.Screen 
        name="profile" 
        options={{ animation: 'slide_from_left' }} 
      />

      {/* RULES 4 & 5: Edit Profile screen slides in from LEFT to right.
         When going back (to Profile), it returns the way it came.
      */}
      <Stack.Screen 
        name="edit-profile" 
        options={{ animation: 'slide_from_left' }} 
      />

      {/* RULES 6 & 7: Admin Panel screen slides in from LEFT to right.
         (Assuming the file name is 'admin-panel' based on previous code)
      */}
      <Stack.Screen 
        name="admin-panel" 
        options={{ animation: 'slide_from_left' }} 
      />

      {/* RULES 8 & 9: Change Password screen slides in from LEFT to right.
      */}
      <Stack.Screen 
        name="change-password" 
        options={{ animation: 'slide_from_left' }} 
      />

      {/* OTHER SCREENS (Home, Group Details, Camera, Media Gallery)
         These will use the default 'slide_from_right' setting defined in 'screenOptions' above.
         Meaning they will slide in from RIGHT to left.
      */}
      <Stack.Screen name="home" />
      <Stack.Screen name="group-details" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="media-gallery" />
      
    </Stack>
  );
}