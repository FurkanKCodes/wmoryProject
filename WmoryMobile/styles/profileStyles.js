import { StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const getProfileStyles = (colors) => {
  // Determine if current mode is dark
  const isDark = colors.type === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      // Background color is handled by LinearGradient in profile.js
    },

    // --- HEADER STYLES ---
    headerContainer: {
      width: '100%',
      paddingTop: Platform.OS === 'ios' ? 65 : StatusBar.currentHeight + 25,
      paddingBottom: 15,
      paddingHorizontal: 20,
      // Light Mode: #808080 (Matches Home), Dark Mode: #1a1a1a
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
      // Always White (Matches Home Header Text)
      color: '#ffffff',
      fontSize: 27,
      fontWeight: 'bold',
      textAlign: 'center',
      flex: 1, 
      marginRight: 0, 
    },

    // --- PROFILE INFO ---
    profileInfoContainer: {
      alignItems: 'center',
      marginTop: 30,
      marginBottom: 20, 
    },
    largeProfileImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 0, // Removed border as requested
      marginBottom: 15,
    },
    usernameText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary, // Dynamic (Black/White)
      marginBottom: 5,
    },
    editProfileButton: {
      marginTop: 5,
      paddingVertical: 8,
      paddingHorizontal: 20,
      backgroundColor: '#000000', // Always Black
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#333',
      marginBottom: 15,
    },
    editProfileText: {
      color: '#ffffff', // Always White
      fontSize: 14,
      fontWeight: '600',
    },

    // --- INFO STRIP (Fixed Dark Look for both modes) ---
    infoStripContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      // Light Mode: Matches Header (#808080), Dark Mode: #2C2C2C
      backgroundColor: isDark ? '#2C2C2C' : '#808080', 
      paddingVertical: 15,
      paddingHorizontal: 15,
      marginTop: 15,
      width: '90%', 
      alignSelf: 'center',
      borderRadius: 12,
    },
    infoStripItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: 14,
      // Light Mode: Black labels, Dark Mode: Light Gray
      color: isDark ? '#cccccc' : '#000000', 
      fontWeight: '400',
    },
    infoValue: {
      fontSize: 14,
      // Always White (as requested)
      color: '#ffffff', 
      fontWeight: 'bold',
      marginLeft: 5,
    },
    verticalDivider: {
      width: 1,
      height: '60%',
      // Light Mode: White Divider, Dark Mode: Dark Divider
      backgroundColor: isDark ? '#555555' : '#ffffff', 
      marginHorizontal: 15,
    },

    // --- SETTINGS LIST ---
    settingsContainer: {
      paddingHorizontal: 20,
      marginTop: 20,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 15,
      borderBottomWidth: 1,
      // Light Mode: Black Divider, Dark Mode: Dark Divider
      borderBottomColor: isDark ? '#444444' : '#000000',
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    settingIcon: {
      marginRight: 15,
      width: 24,
      textAlign: 'center',
      // Light Mode: Black Icon, Dark Mode: Light Gray
      color: isDark ? '#dddddd' : '#000000', 
    },
    settingText: {
      fontSize: 16,
      color: colors.textPrimary, // Handles Black/White text automatically
    },
    deleteAccountText: {
      color: colors.danger,
    },

    // --- THEME MODAL STYLES ---
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    themeModalContainer: {
      width: width * 0.85,
      backgroundColor: colors.modalBg,
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 20,
    },
    themeOptionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 20,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      padding: 10,
      marginHorizontal: 5,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: colors.cardBg,
    },
    themeOptionSelected: {
      borderWidth: 2,
      // Light Mode: Black Border, Dark Mode: White Border
      borderColor: isDark ? '#ffffff' : '#000000', 
      backgroundColor: colors.cardBg,
    },
    themePreviewBox: {
      width: '100%',
      height: 50,
      borderRadius: 8,
      marginBottom: 10,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ddd',
    },
    themeText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 5,
    },
    closeModalButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    closeModalText: {
      fontSize: 16,
      color: colors.tint,
      fontWeight: 'bold',
    },

    // --- FULL SCREEN MODAL ---
    fullScreenContainer: {
      flex: 1,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullScreenImage: {
      width: width,
      height: height,
    },
    fullScreenCloseButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 65 : StatusBar.currentHeight + 25,
      left: 20,
      zIndex: 10,
      padding: 10,
    },
  });
};