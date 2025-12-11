import { StyleSheet } from 'react-native';

const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#333',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 16,
    width: '100%',
  },
  
  // --- PHONE INPUT STYLES ---
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 5, // Reduced margin for error text
    borderWidth: 1,
    borderColor: '#eee',
    width: '100%',
  },
  phonePrefix: {
    paddingLeft: 15,
    paddingRight: 10,
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#000',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10, // Margin before next input
    marginLeft: 5,
    alignSelf: 'flex-start',
  },

  // Button Styles
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a0c4ff', // Lighter blue for inactive state
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: 20,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default authStyles;