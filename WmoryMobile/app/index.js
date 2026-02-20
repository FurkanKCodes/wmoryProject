import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  ActivityIndicator, Image, StatusBar, KeyboardAvoidingView, Animated, Pressable,
  Platform, ScrollView, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import * as Notifications from 'expo-notifications';
import 'react-native-gesture-handler';
import * as Device from 'expo-device';
import Constants from 'expo-constants'; 
import API_URL from '../config';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

// Notification Settings
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ScaleButton = ({ onPress, style, children, wrapperStyle, ...props }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
      if (props.disabled) return;
      Animated.spring(scaleValue, {
          toValue: 0.96, // Slight shrink effect
          useNativeDriver: true,
          speed: 50,
          bounciness: 10,
      }).start();
  };

  const onPressOut = () => {
      Animated.spring(scaleValue, {
          toValue: 1, 
          useNativeDriver: true,
          speed: 50,
          bounciness: 10,
      }).start();
  };

  return (
      <Pressable 
          onPress={onPress} 
          onPressIn={onPressIn} 
          onPressOut={onPressOut}
          style={wrapperStyle} // Layout styles (width, margin) go here
          {...props} 
      >
          <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
              {children}
          </Animated.View>
      </Pressable>
  );
};

export default function LoginScreen() {
  // --- THEME HOOK ---
  const { colors, isDark } = useTheme();
  // Generate styles dynamically based on current theme colors
  const styles = getStyles(colors);
  const router = useRouter();
  
  // --- STATES ---
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(''); // Error state for validation
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  
  // Modal & Verification States
  const [modalVisible, setModalVisible] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // --- VALIDATION LOGIC ---
  const validateEmail = (text) => {
    setEmail(text);
    // Regex for basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text.length > 0 && !emailRegex.test(text)) {
      setEmailError('Lütfen geçerli bir email giriniz');
    } else {
      setEmailError('');
    }
  };

  // --- STEP 1: SEND CODE (LOGIN) ---
  const handleLoginPress = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
      setEmailError('Lütfen geçerli bir email giriniz');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'login' }),
      });
      const data = await response.json();

      if (response.ok) {
        setModalVisible(true); // Open Verification Modal
      } else {
        Alert.alert('Hata', data.error || 'Giriş yapılamadı.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: VERIFY CODE & LOGIN ---
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Hata', 'Lütfen 6 haneli kodu girin.');
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch(`${API_URL}/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: verificationCode }),
      });
      const data = await response.json();

      if (response.ok) {
        // Save Session
        await AsyncStorage.setItem('user_id', data.user_id.toString());

        setModalVisible(false);
        // Redirect to Home

        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
              await updatePushToken(data.user_id, token);
          }
        } catch (tokenErr) {
          console.log("Token süreci hatası:", tokenErr);
        }

        Alert.alert('Başarılı', 'Giriş yapıldı!');
        router.replace({ pathname: '/home', params: { userId: data.user_id } });
      } else {
        Alert.alert('Hata', data.error || 'Kod hatalı.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Doğrulama yapılamadı.');
    } finally {
      setVerifying(false);
    }
  };

  // --- CHECK SESSION ON MOUNT ---
  useEffect(() => {
    const checkLogin = async () => {
      try {
        // CHANGED: Look for 'user_id' directly instead of 'user_session' object
        const userId = await AsyncStorage.getItem('user_id');
        
        if (userId) {
          // If userId exists, user is logged in. Redirect to Home.
          router.replace({ pathname: '/home', params: { userId: userId } });
        }
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        // Stop the loading spinner (ActivityIndicator)
        setCheckingSession(false);
      }
    };
    checkLogin();
  }, []);

  // --- REGISTER FOR PUSH NOTIFICATIONS ---
  const registerForPushNotificationsAsync = async () => {
    let token;
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Bildirim izni verilmedi!');
        return;
      }

      try {
          const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

          token = (await Notifications.getExpoPushTokenAsync({
            projectId: projectId 
          })).data;
          
          console.log("Push Token Alındı:", token);
      } catch (error) {
          console.log("Bildirim Token Hatası (Login Engellenmedi):", error.message);
          token = null; 
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  };

  const updatePushToken = async (userId, token) => {
      if (!token) return;
      try {
          await fetch(`${API_URL}/update-push-token`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true'
              },
              body: JSON.stringify({ user_id: userId, push_token: token })
          });
      } catch (e) {
          console.error("Token update failed:", e);
      }
  };

  if (checkingSession) {
      return (
          <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff'}}>
              <ActivityIndicator size="large" color={isDark ? '#000' : '#fff'} />
          </View>
      );
  }

  return (
    <LinearGradient
      colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
      style={{ flex: 1 }}
    >
      <StatusBar backgroundColor={isDark ? '#1a1a1a' : '#55efe1'} barStyle={isDark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          <View style={styles.logoContainer}>
            <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>WMORY</Text>
          </View>

          <View style={styles.formContainer}>
            
            <View style={styles.inputContainer}>
              {/* EMAIL INPUT (Replaces Phone & Password) */}
              <TextInput
                style={[
                  styles.input, 
                  emailError ? { borderColor: 'red', borderWidth: 1 } : {} 
                ]}
                placeholder="E-posta Adresi"
                placeholderTextColor={isDark ? '#545454' : '#666'}
                value={email}
                onChangeText={validateEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                selectionColor={isDark ? '#545454' : '#666'}
              />
              {/* Error Message */}
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

              {/* LOGIN BUTTON */}
              <ScaleButton style={styles.button} onPress={handleLoginPress} disabled={loading}>
                {loading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
              </ScaleButton>
            
              <TouchableOpacity onPress={() => router.push('/register')} style={{ marginTop: 15, alignSelf: 'center' }}>
                <Text style={styles.linkText}>Hesabın yok mu? Kayıt Ol</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* --- VERIFICATION MODAL (Added manually to match Register style) --- */}
        <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.modalBg, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Doğrulama Kodu</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {email} adresine gönderilen kodu girin.
              </Text>
            
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: isDark ? '#555' : '#ddd', backgroundColor: isDark ? '#333' : '#f9f9f9' }]}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="------"
                placeholderTextColor={colors.textSecondary}
                selectionColor={isDark ? "#ffffff" : "#000000"} 
              />

              <ScaleButton 
                style={styles.modalButton} 
                onPress={handleVerifyCode} 
                disabled={verifying}
              >
                {verifying ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={styles.modalButtonText}>Doğrula</Text>}
              </ScaleButton>

              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={{ color: 'red', fontSize: 16 }}>Vazgeç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// Dynamic Style Generator
const getStyles = (colors) => {

  const isDark = colors.type === 'dark';

  return StyleSheet.create({
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 25
  },
  title: {
    fontSize: 28,
    color: colors.textPrimary, // Dynamic text color
    marginBottom: 10,
    fontFamily: 'LeagueSpartan',
  },
  formContainer: {
    width: '100%'
  },
  
  // Normal Input Style
  input: { 
    height: 50, 
    borderColor: isDark ? '#444' : '#2c2c2c',
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    marginBottom: 15,
    fontSize: 16, 
    backgroundColor: '#d3d3d3', // Dynamic Input Background
    color: isDark ? '#545454' : '#666', // Dynamic Input Text
  },

  // Phone Input Container
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderColor: isDark ? '#000' : '#2c2c2c',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#d3d3d3', // Dynamic Input Background
    paddingHorizontal: 15,
    marginBottom: 15
  },
  countryCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000', 
    marginRight: 10
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: isDark ? '#545454' : '#666' 
  },
  
  // Login Button
  button: { 
    backgroundColor: colors.textPrimary, // Light: Black, Dark: White (Inverted look)
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border
  },
  buttonText: {
    color: colors.background, // Light: White text, Dark: Black text (Contrast)
    fontSize: 18,
    fontWeight: 'bold'
  },
  
  // Link Texts
  linkText: {
    color: colors.textSecondary, // Dynamic gray
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
  },

  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
    marginTop: -10, // Pull it closer to input
  },
  // Modal Styles (Copied logic from authStyles to keep file independent)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 5,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: isDark ? '#a9a9a9' : '#707070', // Verification action can remain Blue or Black
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: 200,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: isDark ? '#000' : '#fff', 
    fontSize: 18, 
    fontWeight: '600',
  },
  modalCancel: {
    paddingVertical: 10,
  }
});
};