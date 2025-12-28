import { StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const mediaStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', 
  },
  // --- HEADER ---
  headerContainer: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 65 : StatusBar.currentHeight + 25,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minHeight: 80,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 23,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 5,
  },

  // --- SECTION HEADERS ---
  sectionHeaderContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Slightly translucent
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  // --- SCROLL BUBBLE ---
  scrollBubble: {
    position: 'absolute',
    top: 50, 
    right: 20, // Sağ tarafa yaslı
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 999,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  scrollBubbleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // --- GRID LIST ---
  rowContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-start', // Items align left
  },
  mediaItem: {
    // Width and height are set dynamically in JS via inline styles
    borderWidth: 1,
    borderColor: '#fff', 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0', 
  },
  mediaItemSelected: {
      opacity: 0.7, 
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playIconOverlay: {
    position: 'absolute',
    opacity: 0.8,
    alignSelf: 'center',
  },
  // Checkbox Overlay
  selectionOverlay: {
      position: 'absolute',
      top: 5,
      left: 5,
      zIndex: 5,
      backgroundColor: 'rgba(0,0,0,0.3)', 
      borderRadius: 4,
  },

  // --- FILTER MODAL STYLES (YENİ EKLENDİ) ---
  filterModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-start', // Üstten başlasın (Pop-down hissi için)
      paddingTop: 100, // Header'ın altında kalsın
  },
  filterModalContainer: {
      backgroundColor: '#fff',
      marginHorizontal: 20,
      borderRadius: 15,
      maxHeight: height * 0.6,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      overflow: 'hidden',
  },
  filterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      backgroundColor: '#f9f9f9',
  },
  filterTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
  },
  filterContent: {
      padding: 10,
  },
  filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 10,
  },
  filterAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 10,
      backgroundColor: '#eee',
  },
  filterAvatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 10,
      backgroundColor: '#007AFF',
      alignItems: 'center',
      justifyContent: 'center',
  },
  filterName: {
      fontSize: 16,
      color: '#333',
  },
  filterSeparator: {
      height: 1,
      backgroundColor: '#eee',
      marginVertical: 5,
  },
  filterFooter: {
      padding: 15,
      borderTopWidth: 1,
      borderTopColor: '#eee',
  },
  applyButton: {
      backgroundColor: '#007AFF',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
  },
  applyButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
  },

  // --- FULL SCREEN MODAL ---
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000', 
    justifyContent: 'center',
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100, 
  },
  controlButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  fullScreenContent: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height,
    resizeMode: 'contain',
  },
  fullVideo: {
    width: width,
    height: height * 0.6, 
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    color: '#ccc',
    fontSize: 12,
  },
  optionsMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    width: 150,
    zIndex: 200,
    elevation: 5,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  reportText: {
    color: 'red',
    fontWeight: 'bold',
  },
});

export default mediaStyles;