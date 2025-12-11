import React, { useState } from 'react';
import { 
  Text, View, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router'; 
import API_URL from '../config'; 
import authStyles from '../styles/authStyles'; 

export default function RegisterScreen() {
  // State for form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); 
  const [loading, setLoading] = useState(false);
  
  // Validation States
  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true); // NEW: Email Validation State
  
  const router = useRouter();

  // --- HANDLERS ---

  // 1. Email Validation (Format: %@%.com)
  const handleEmailChange = (text) => {
    setEmail(text);
    
    // Regex logic: 
    // ^      : Start of string
    // .+     : At least one character
    // @      : Literal @ symbol
    // .+     : At least one character
    // \.com$ : Ends exactly with .com
    const emailRegex = /^.+@.+\.com$/;

    // Check if not empty AND does not match regex
    if (text.length > 0 && !emailRegex.test(text)) {
        setIsEmailValid(false);
    } else {
        setIsEmailValid(true);
    }
  };

  // 2. Phone Validation
  const handlePhoneChange = (text) => {
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length <= 10) {
      setPhoneNumber(numericText);
      if (numericText.length > 0 && numericText.length < 10) {
        setIsPhoneValid(false);
      } else {
        setIsPhoneValid(true);
      }
    }
  };

  // 3. Password Validation
  const handlePasswordChange = (text) => {
    setPassword(text);
    if (text.length > 0 && text.length < 6) {
        setIsPasswordValid(false);
    } else {
        setIsPasswordValid(true);
    }
  };

  // Check if Register Button should be enabled
  const isRegisterEnabled = 
    username.length > 0 && 
    email.length > 0 && isEmailValid && // Check Email
    password.length >= 6 && 
    phoneNumber.length === 10;

  const handleRegister = async () => {
    if (!isRegisterEnabled) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doğru şekilde doldurun.');
      return;
    }

    setLoading(true);

    try {
      console.log("Registering user at:", `${API_URL}/register`);
      const formattedPhone = '+90' + phoneNumber;

      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
          phone_number: formattedPhone 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Tebrikler!', 'Kayıt başarıyla oluşturuldu. Giriş yapabilirsiniz.', [
          { text: 'Tamam', onPress: () => router.back() } 
        ]);
      } else {
        Alert.alert('Kayıt Başarısız', data.message || data.error || 'Bir hata oluştu.');
      }
    } catch (error) {
      console.error("Register Error:", error);
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. İnternetinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={authStyles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={authStyles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={authStyles.title}>Aramıza Katıl</Text>
        
        <View style={authStyles.inputContainer}>
          {/* Username Input */}
          <TextInput
            style={authStyles.input}
            placeholder="Kullanıcı Adı"
            placeholderTextColor="#aaa"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          {/* Email Input (Updated) */}
          <TextInput
            style={authStyles.input}
            placeholder="E-posta Adresi"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={handleEmailChange} // Using Handler
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {/* Email Error Message */}
          {!isEmailValid && (
             <Text style={authStyles.errorText}>Lütfen geçerli bir mail giriniz</Text>
          )}

          {/* Phone Number Input */}
          <View style={authStyles.phoneContainer}>
             <Text style={authStyles.phonePrefix}>+90</Text>
             <TextInput
                style={authStyles.phoneInput}
                placeholder="Telefon Numarası (555...)"
                placeholderTextColor="#aaa"
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                keyboardType="number-pad"
                maxLength={10} 
             />
          </View>
          {!isPhoneValid && (
             <Text style={authStyles.errorText}>Lütfen geçerli bir telefon numarası giriniz</Text>
          )}

          {/* Password Input */}
          <TextInput
            style={authStyles.input}
            placeholder="Şifre"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
          />
          {!isPasswordValid && (
             <Text style={authStyles.errorText}>Minimum 6 karakter</Text>
          )}
        </View>

        {/* Register Button */}
        <TouchableOpacity 
            style={[authStyles.button, (!isRegisterEnabled || loading) && authStyles.buttonDisabled]} 
            onPress={handleRegister} 
            disabled={!isRegisterEnabled || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={authStyles.buttonText}>Kayıt Ol</Text>
          )}
        </TouchableOpacity>

        {/* Back to Login Link */}
        <TouchableOpacity onPress={() => router.back()} style={authStyles.linkContainer}>
          <Text style={authStyles.linkText}>Zaten hesabınız var mı? Giriş yapın</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}