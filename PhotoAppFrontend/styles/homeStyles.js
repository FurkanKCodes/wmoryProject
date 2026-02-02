import { StyleSheet, Platform, StatusBar } from 'react-native';

export const getHomeStyles = (colors) => {
  // Determine if current mode is dark based on the passed colors object
  const isDark = colors.type === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      // Background color is handled by LinearGradient in home.js, 
      // but we set a fallback here.
      backgroundColor: isDark ? '#333333' : '#ffffff', 
    },
    
    // --- HEADER STYLES ---
    headerContainer: {
      width: '100%',
      paddingTop: Platform.OS === 'ios' ? 65 : StatusBar.currentHeight + 25,
      paddingBottom: 15, 
      paddingHorizontal: 20,
      // Dark: #1a1a1a, Light: #a9a9a9
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
    profileImage: {
      width: 40, 
      height: 40,
      borderRadius: 20, 
      // Remove border as requested
      borderWidth: 0, 
    },
    headerTitle: {
      // Dark: Existing color (usually white), Light: White
      color: isDark ? colors.textPrimary : '#ffffff',
      fontSize: 27, 
      fontWeight: 'bold',
    },
    addButton: {
      width: 40, 
      height: 40,
      borderRadius: 20,
      // Dark: Black BG, Light: White BG
      backgroundColor: isDark ? '#000000' : '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // --- CONTENT & LIST ---
    content: {
      flex: 1,
    },
    listContainer: {
      padding: 20,
    },

    // --- GROUP CARD STYLES ---
    groupCard: {
      flexDirection: 'column', 
      // Dark: Default dark (#1e1e1e is standard for cards), Light: #a9a9a9
      backgroundColor: isDark ? '#1e1e1e' : '#a9a9a9',
      padding: 15,
      borderRadius: 12,
      marginBottom: 12,
      elevation: 2,
      shadowColor: isDark ? '#fff' : '#3f3f3f', // Light mode shadow: #3f3f3f
      shadowOpacity: 0.2, // Increased opacity for visibility
      shadowRadius: 4,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    },
    groupIconPlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 12,
      // Light: White placeholder bg
      backgroundColor: isDark ? colors.textPrimary : '#ffffff', 
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 15,
    },
    groupImage: {
      width: 50,
      height: 50,
      borderRadius: 12,
      marginRight: 15,
      borderWidth: 2,
      // Light: White border
      borderColor: isDark ? colors.textPrimary : '#ffffff',
      backgroundColor: colors.border,
    },
    groupInfo: {
      flex: 1,
      justifyContent: 'center', 
    },
    groupName: {
      fontSize: 22,
      fontWeight: 'bold',
      // Light: Black text
      color: isDark ? colors.textPrimary : '#fff',
    },
    memberListContainer: {
      marginTop: 10, 
      width: '100%',
    },
    memberPill: {
      // Dark: #686868, Light: #ffffff
      backgroundColor: isDark ? '#686868' : '#ffffff', 
      borderRadius: 8,      
      paddingVertical: 7,   
      paddingHorizontal: 12,
      marginRight: 8, 
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberPillText: {
      fontSize: 14,
      fontWeight: '600',
      // Dark: White (implied), Light: Black
      color: isDark ? '#ffffff' : '#000000', 
    },

    // --- EMPTY STATE ---
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 100,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 20,
    },
    emptySubText: {
      fontSize: 14,
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 10,
      paddingHorizontal: 40,
    },

    // --- MODAL STYLES (Create/Join) ---
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: '90%',
      backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
      borderRadius: 20,
      paddingVertical: 0, // Reset padding for cleaner header
      overflow: 'hidden', // Ensure header stays inside rounded corners
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ddd',
    },
    // Modal Header
    modalHeaderArea: {
      // Dark: #000000, Light: #a9a9a9
      backgroundColor: isDark ? '#000000' : '#a9a9a9',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#333' : '#ffffff',
      flexDirection: 'row',
      justifyContent: 'space-between', 
      alignItems: 'center',
    },
    modalTitleText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    closeButton: {
      padding: 5,
    },
    
    // Tab Bar
    tabContainer: {
      flexDirection: 'row',
      // Dark: Border color textPrimary, Light: #a9a9a9
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.textPrimary : '#a9a9a9',
      marginBottom: 20,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 15,
      alignItems: 'center',
    },
    activeTab: {
      // Dark: #2c2c2c, Light: #bdbebd
      backgroundColor: isDark ? '#2c2c2c' : '#bdbebd', 
      borderBottomWidth: 3,
      borderBottomColor: isDark ? colors.textPrimary : '#a9a9a9',
    },
    tabText: {
      fontSize: 16,
      // Dark: textPrimary, Light: #000 (for visibility on white)
      color: isDark ? colors.textPrimary : '#000',
      fontWeight: '500',
    },
    activeTabText: {
      // Dark: textPrimary, Light: #000
      color: isDark ? colors.textPrimary : '#000',
      fontWeight: 'bold',
    },
    modalContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 20,
    },
    
    // Form Styles
    formContainer: {
      alignItems: 'center',
      width: '100%',
    },
    imagePicker: {
      alignItems: 'center',
      marginBottom: 20,
    },
    defaultImagePlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      // Dark: iconDefault, Light: #ffffff
      backgroundColor: isDark ? colors.iconDefault : '#ffffff',
      // Light mode specific border
      borderWidth: isDark ? 0 : 1,
      borderColor: '#000000',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    selectedImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginBottom: 10,
    },
    selectPhotoText: {
      color: colors.textPrimary,
      fontSize: 14,
    },
    label: {
      alignSelf: 'flex-start',
      fontWeight: 'bold',
      marginBottom: 5,
      // Dark: textPrimary, Light: #000000
      color: isDark ? colors.textPrimary : '#000000',
      marginLeft: 2,
    },
    cameraButtonContainer: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: isDark ? '#686868' : '#ffffff', 
      marginLeft: 10,
    },
    input: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
      backgroundColor: isDark ? '#2c2c2c' : '#fafafa',
      color: isDark ? '#fff' : '#000',
    },
    // Button States handled in home.js with inline styles for dynamic colors,
    // but base style is here:
    actionButton: {
      paddingVertical: 12,
      borderRadius: 25,
      width: '100%',
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },

    // --- SEARCH BAR STYLES ---
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      // Dark: #686868, Light: #a9a9a9
      backgroundColor: isDark ? '#686868' : '#949494', 
      borderRadius: 20, 
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 5,
      paddingHorizontal: 15,
      height: 45, 
      borderWidth: 1,
      // Borders match background
      borderColor: isDark ? '#686868' : '#a9a9a9',
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      // Text is always white (#fff) as requested
      color: '#ffffff', 
      height: '100%',
    },
    clearButton: {
      // Dark: #000, Light: #fff
      backgroundColor: isDark ? '#000000' : '#ffffff', 
      borderRadius: 10, 
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    noResultText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 50,
    },

    // --- FULL SCREEN MODAL STYLES ---
    fullScreenBackButton: {
      position: 'absolute',
      // Match the Header's paddingTop logic to align with the Profile button
      top: Platform.OS === 'ios' ? 65 : StatusBar.currentHeight + 25,
      left: 20,
      zIndex: 10,
      padding: 5,
    },
  });
};