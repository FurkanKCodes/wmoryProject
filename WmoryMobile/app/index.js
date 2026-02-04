import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  ActivityIndicator, Image, StatusBar, KeyboardAvoidingView, Animated, Pressable,
  Platform, ScrollView 
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
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true); 

  // --- CHECK SESSION ON MOUNT ---
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const userSession = await AsyncStorage.getItem('user_session');
        if (userSession) {
          const user = JSON.parse(userSession);
          router.replace({ pathname: '/home', params: { userId: user.id } });
        }
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
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

  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    // Backend'e gönderirken başına +90 ekliyoruz
    const formattedPhoneNumber = `+90${phoneNumber}`;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ phone_number: formattedPhoneNumber, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const userData = {
            id: data.user_id,
            username: data.username,
            profile_image: data.profile_image 
        };
        await AsyncStorage.setItem('user_session', JSON.stringify(userData));

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
        Alert.alert('Hata', data.error || 'Giriş başarısız.');
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert('Hata', 'Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
      return (
          <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff'}}>
              <ActivityIndicator size="large" color={colors.tint} />
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
            
            {/* --- Phone Number Region --- */}
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+90</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Telefon Numarası (555...)"
                placeholderTextColor={isDark ? '#545454' : '#666'} 
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="number-pad"
                maxLength={10} 
                selectionColor={isDark ? '#545454' : '#666'}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Şifre"
              placeholderTextColor={isDark ? '#545454' : '#666'} 
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              selectionColor={isDark ? '#545454' : '#666'}
            />

            <ScaleButton style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
            </ScaleButton>

            <TouchableOpacity onPress={() => router.push('/ForgotPasswordScreen')} style={{marginBottom: 15}}>
              <Text style={styles.linkText}>Şifremi Unuttum</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.linkText}>Hesabın yok mu? Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    marginBottom: 10
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
});
};