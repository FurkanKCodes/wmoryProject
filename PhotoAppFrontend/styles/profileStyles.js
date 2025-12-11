import { StyleSheet, Platform, StatusBar } from 'react-native';

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // --- HEADER STYLES ---
  headerContainer: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 65 : StatusBar.currentHeight + 25,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF', // Theme Color
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1, 
    marginRight: 40, // Balance the back button spacing
  },

  // --- PROFILE INFO SECTION ---
  profileInfoContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  largeProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#007AFF', 
    marginBottom: 15,
  },
  usernameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  editProfileText: {
    fontSize: 16,
    color: '#007AFF', 
    fontWeight: '600',
  },

  // --- SETTINGS LIST SECTION ---
  settingsContainer: {
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 15,
    width: 24,
    textAlign: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
});

export default profileStyles;