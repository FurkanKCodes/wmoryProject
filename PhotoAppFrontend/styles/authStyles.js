import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const getAuthStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Dark Theme Background
  },
  // Style for ScrollView content container
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: colors.textPrimary, // White Title
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.inputBg, // Light Gray Box (Requested Style)
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border, // Darker border
    fontSize: 16,
    width: '100%',
    color: colors.textPrimary, // Black Text inside light box
  },
  
  // --- PHONE INPUT STYLES ---
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg, // Light Gray Box
    borderRadius: 10,
    marginBottom: 5, 
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  phonePrefix: {
    paddingLeft: 15,
    paddingRight: 10,
    fontSize: 16,
    color: colors.textPrimary, // Black Text
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: colors.textPrimary, // Black Text
  },
  errorText: {
    color: '#FF3B30', // Bright Red
    fontSize: 12,
    marginBottom: 10, 
    marginLeft: 5,
    alignSelf: 'flex-start',
  },

  // Button Styles
  button: {
    backgroundColor: colors.textPrimary, // Black Button
    padding: 15,
    borderRadius: 25, // Rounded corners consistent with Login
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    backgroundColor: colors.border, // Dark gray when disabled
    opacity: 0.7,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: 20,
  },
  linkText: {
    color: colors.textSecondary, // Light Gray Text
    fontSize: 16,
  },

  // --- MODAL (POP-UP) STYLES ---
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
    width: '100%',
    backgroundColor: colors.inputBg, // Light Gray Box
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    textAlign: 'center', 
    marginBottom: 20,
    letterSpacing: 5, 
    fontWeight: 'bold',
    color: colors.textPrimary, // Black Text
  },
  modalButton: {
    backgroundColor: colors.textPrimary, // Verification action can remain Blue or Black
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

  // --- CHECKBOX & AGREEMENT STYLES ---
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', 
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12, 
    borderWidth: 2,
    borderColor: colors.textPrimary, // White border
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2, 
  },
  checkboxSelected: {
    backgroundColor: colors.textPrimary, 
    borderColor: colors.textPrimary,
  },
  checkboxTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap', 
  },
  checkboxLabel: {
    color: colors.textSecondary, // Light Gray Text
    fontSize: 14,
  },
  checkboxLink: {
    color: colors.tint, // Blue Link (Requested to stay blue)
    fontWeight: 'bold',
    fontSize: 14,
  },

  // --- DOCUMENT MODAL STYLES (Terms/Privacy Pop-up) ---
  docModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docModalContent: {
    width: width * 0.9,
    height: height * 0.8, 
    backgroundColor: colors.modalBg, // Dark Card
    borderRadius: 15,
    padding: 20,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: colors.textPrimary, // White
  },
  docScrollView: {
    marginBottom: 15,
  },
  docText: {
    fontSize: 14,
    color: colors.textSecondary, // Light Gray Text
    lineHeight: 22,
  },
  docCloseButton: {
    backgroundColor: colors.textPrimary, // Black Button
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});