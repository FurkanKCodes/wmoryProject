import { StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)', // Darker overlay
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: width * 0.85,
      backgroundColor: colors.modalBg, // Dark Card Background
      borderRadius: 20,
      padding: 25,
      alignItems: 'center',
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
      color: colors.textPrimary, // White
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary, // Light Gray
      marginBottom: 20,
      textAlign: 'center',
    },
    modalInput: {
      width: 240,
      backgroundColor: '#d3d3d3', // Light Gray Box
      padding: 15,
      borderRadius: 10,
      fontSize: 18,
      textAlign: 'center', 
      marginBottom: 20,
      letterSpacing: 5, 
      fontWeight: 'bold',
      color: isDark ? '#545454' : '#666', // Black Text
    },
    modalButton: {
      backgroundColor: isDark ? '#a9a9a9' : '#707070', // Verification action can remain Blue or Black
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 10,
      width: '100%',
      alignItems: 'center',
      marginBottom: 10,
    },
    modalCancelButton: {
      paddingVertical: 10,
    },
    modalCancelText: {
      color: '#FF3B30', // Red
      fontSize: 16,
    },
  });
};