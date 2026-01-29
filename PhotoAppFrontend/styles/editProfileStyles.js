import { StyleSheet, Platform, StatusBar } from 'react-native';

export const getEditProfileStyles = (colors) => {
  // Determine if current mode is dark
  const isDark = colors.type === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      // Background color is handled by LinearGradient in component
    },
    // --- HEADER STYLES ---
    headerContainer: {
      width: '100%',
      paddingTop: Platform.OS === 'ios' ? 65 : StatusBar.currentHeight + 25,
      paddingBottom: 15,
      paddingHorizontal: 20,
      // Match Home/Profile Header Colors
      // Light: #808080, Dark: #1a1a1a
      backgroundColor: isDark ? '#1a1a1a' : '#808080', 
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between', 
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      zIndex: 1,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    headerTitle: {
      // Always White (Matches Home/Profile Header)
      color: '#ffffff',
      fontSize: 27,
      fontWeight: 'bold',
      textAlign: 'center',
      flex: 1, 
    },
    // Base Save Button Style (Colors handled in component)
    saveButton: {
      width: 70,
      paddingVertical: 8,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: 'bold',
    },

    // --- CONTENT CONTAINER ---
    scrollContent: {
      paddingBottom: 40,
    },

    // --- PROFILE PHOTO SECTION ---
    photoSection: {
      alignItems: 'center', 
      marginTop: 30,
      marginBottom: 30,
    },
    largeProfileImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 0, // Requirement 1: Border Removed
      marginBottom: 10,
    },
    changePhotoText: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '600',
      marginTop: 5,
    },

    // --- FORM SECTION ---
    formContainer: {
      paddingHorizontal: 20,
      width: '100%',
    },
    inputGroup: {
      marginBottom: 25,
      width: '100%',
    },
    inputLabel: {
      // Requirement 2: Increased size and weight
      fontSize: 16, 
      color: colors.textSecondary,
      marginBottom: 8,
      fontWeight: 'bold', 
      textAlign: 'left', 
      alignSelf: 'flex-start', 
    },
    inputField: {
      borderBottomWidth: 1,
      backgroundColor: 'transparent',
      // Requirement 3: Light mode border #2c2c2c, Dark mode use theme border
      borderBottomColor: isDark ? colors.border : '#2c2c2c',
      paddingVertical: 10,
      fontSize: 18,
      color: colors.textPrimary,
      width: '100%',
      textAlign: 'left',
    },
    
    // Error Text
    errorText: {
      color: colors.danger,
      fontSize: 12,
      marginTop: 5,
      textAlign: 'left',
    },
  });
};