import { StyleSheet, Platform, StatusBar } from 'react-native';

const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Header Styles (Updated)
  headerContainer: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 65 : StatusBar.currentHeight + 25,
    paddingBottom: 15, 
    paddingHorizontal: 20,
    backgroundColor: '#007AFF', 
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
    width: 38, 
    height: 38,
    borderRadius: 19, 
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18, 
    fontWeight: 'bold',
  },
  addButton: {
    width: 38, 
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Content Styles
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
  },
  // Group Card Styles
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupIconPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#007AFF', 
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  groupImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 15,
    backgroundColor: '#ddd',
  },
  groupInfo: {
    flex: 1,
    justifyContent: 'center', 
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  // Empty State Styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
  },

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
    marginRight: 5,
  },
  // Tab Bar
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#f5f5f5', // Seçili sekme için hafif gri
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    backgroundColor: '#ccc',
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
    color: '#007AFF',
    fontSize: 14,
  },
  label: {
    alignSelf: 'flex-start',
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    marginLeft: 2,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  actionButton: {
    backgroundColor: '#007AFF',
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
});

export default homeStyles;