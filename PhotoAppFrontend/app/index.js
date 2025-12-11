import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  ActivityIndicator, Image, StatusBar, KeyboardAvoidingView, 
  Platform, ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import API_URL from '../config';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
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
          // Redirect to home if user exists
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save user session
        const userData = {
            id: data.user_id,
            username: data.username,
            profile_image: data.profile_image 
        };
        await AsyncStorage.setItem('user_session', JSON.stringify(userData));

        Alert.alert('Success', 'Login successful!');
        router.replace({ pathname: '/home', params: { userId: data.user_id } });
      } else {
        Alert.alert('Error', data.error || 'Login failed.');
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert('Error', 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
      return (
          <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff'}}>
              <ActivityIndicator size="large" color="#007AFF" />
          </View>
      );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#fff' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="dark-content" />
        
        <View style={styles.logoContainer}>
          <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Photo App</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 20 
  },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 100, height: 100, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  formContainer: { width: '100%' },
  input: { height: 50, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, fontSize: 16, backgroundColor: '#f9f9f9' },
  button: { backgroundColor: '#007AFF', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkText: { color: '#007AFF', textAlign: 'center', fontSize: 16 },
});