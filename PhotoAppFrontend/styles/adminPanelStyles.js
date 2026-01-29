import { StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

export const getAdminPanelStyles = (colors) => {
  // Determine if current mode is dark
  const isDark = colors.type === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      // Background handled by LinearGradient
    },
    // --- HEADER (Matched with Home & Profile) ---
    headerContainer: {
      width: '100%',
      paddingTop: Platform.OS === 'ios' ? 65 : StatusBar.currentHeight + 25,
      paddingBottom: 15,
      paddingHorizontal: 20,
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
      color: '#ffffff', // Always White
      fontSize: 27,
      fontWeight: 'bold',
      textAlign: 'center',
      flex: 1,
      marginRight: 0,
    },

    // --- 2FA AUTH SCREEN STYLES ---
    authContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    authTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 10,
    },
    authDesc: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    authInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: isDark ? '#555' : '#000',
        borderRadius: 10,
        padding: 15,
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 5,
        marginBottom: 20,
        backgroundColor: isDark ? '#2C2C2C' : '#ffffff',
        color: colors.textPrimary,
    },
    authButton: {
        width: '100%',
        backgroundColor: isDark ? '#000000' : '#2c2c2c', // Dark/Light contrast
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    authButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },

    // --- TABS ---
    tabContainer: {
      flexDirection: 'row',
      // Match Header Background
      backgroundColor: isDark ? '#1a1a1a' : '#808080', 
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#000',
    },
    tabButton: {
      flex: 1,
      paddingVertical: 15,
      alignItems: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      // Active Indicator Color (White to contrast with Gray/Black header)
      borderBottomColor: '#ffffff',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      // Inactive: Light Gray, Active: White
      color: '#cccccc', 
      textAlign: 'center',
    },
    activeTabText: {
      color: '#ffffff',
      fontWeight: 'bold',
    },

    // --- LISTS ---
    listContent: {
      padding: 20,
      paddingBottom: 50,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      // Card BG: Dark (#1e1e1e) / Light (#a9a9a9) -> Matches Home Cards
      backgroundColor: isDark ? '#1e1e1e' : '#a9a9a9',
      padding: 15,
      borderRadius: 12,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    rowInfo: {
      flex: 1,
    },
    mainText: {
      fontSize: 16,
      fontWeight: 'bold',
      // Text on Card: Dark Mode (White), Light Mode (Black)
      color: isDark ? colors.textPrimary : '#000000', 
    },
    subText: {
      fontSize: 13,
      color: isDark ? '#cccccc' : '#333333',
      marginTop: 3,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 30,
      color: colors.textSecondary,
      fontSize: 16,
    },

    // --- MANUAL BAN FORM ---
    formContent: {
        padding: 20,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: colors.textPrimary,
    },
    formDesc: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
      fontSize: 12,
      color: isDark ? '#ccc' : '#333', 
      fontWeight: 'bold',
      textTransform: 'uppercase',
      marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: isDark ? '#555' : '#000',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: isDark ? '#2C2C2C' : '#ffffff',
        color: colors.textPrimary,
    },
    separator: {
        alignItems: 'center',
        marginVertical: 10,
    },

    // --- MODAL ---
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: '90%',
      maxHeight: '85%', 
      backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
      borderRadius: 15,
      padding: 20,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ddd',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#333' : '#ddd',
      paddingBottom: 10,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    
    // Evidence
    evidenceImage: {
      width: '100%',
      height: 250,
      backgroundColor: '#000',
      borderRadius: 8,
      marginBottom: 15,
      resizeMode: 'contain',
      borderWidth: 1,
      borderColor: colors.border,
    },
    evidenceVideo: {
      width: '100%',
      height: 300,
      backgroundColor: '#000',
      borderRadius: 8,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    
    // Detail Box
    detailRow: {
      marginBottom: 12,
    },
    value: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    
    // Buttons
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 15,
      gap: 10,
    },
    btn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnDismiss: {
      backgroundColor: '#555555',
    },
    btnDelete: {
      backgroundColor: '#FF9500', 
    },
    btnBan: {
      backgroundColor: colors.danger,
      marginTop: 15, 
      width: '100%',
      paddingVertical: 14,
    },
    btnUnban: {
      backgroundColor: '#34C759', 
      width: '100%',
      marginTop: 15,
    },
    btnText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 14,
    },
  });
};