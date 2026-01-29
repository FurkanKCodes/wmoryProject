import React, { useState, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StatusBar, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, PanResponder, Dimensions,
  Animated, Pressable
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import API_URL from '../config';
// Re-using edit profile styles for consistent look
import editProfileStyles from '../styles/editProfileStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { getEditProfileStyles } from '../styles/editProfileStyles';

// --- HELPER COMPONENT: ANIMATED SCALE BUTTON ---
const ScaleButton = ({ onPress, style, children, wrapperStyle, ...props }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
      if (props.disabled) return;
      Animated.spring(scaleValue, {
          toValue: 0.96,
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
          style={wrapperStyle}
          {...props} 
      >
          <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
              {children}
          </Animated.View>
      </Pressable>
  );
};

export default function ChangePasswordScreen() {
  const { colors, isDark } = useTheme();
  const editProfileStyles = getEditProfileStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId;

  const { width } = Dimensions.get('window'); // Ekran genişliği

  // --- iOS SWIPE BACK (Right to Left) ---
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
          Platform.OS === 'ios' && 
          gestureState.moveX > (width - 50) && 
          gestureState.dx < -10                
        );
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50) {
          router.back();
        }
      },
    })
  ).current;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState(''); 
  const [newPasswordError, setNewPasswordError] = useState(''); 

  // --- VALIDATION ---
  const handleNewPasswordChange = (text) => {
    setNewPassword(text);
    if (text.length > 0 && text.length < 6) {
        setNewPasswordError("Minimum 6 karakter");
    } else {
        setNewPasswordError("");
    }
  };

  const isSaveActive = 
    currentPassword.length > 0 && 
    newPassword.length >= 6 && 
    !loading;

  // --- BUTTON COLOR LOGIC ---
  const getSaveButtonStyles = () => {
    if (!isDark) {
        // Light Mode: Active (Black/White), Inactive (White/Black)
        return {
            bg: isSaveActive ? '#000000' : '#ffffff',
            text: isSaveActive ? '#ffffff' : '#000000',
            border: '#000000'
        };
    } else {
        // Dark Mode: Active (White/Black), Inactive (DarkGray/Gray)
        return {
            bg: isSaveActive ? '#ffffff' : '#333333',
            text: isSaveActive ? '#000000' : '#888888',
            border: '#333333'
        };
    }
};
const saveBtnStyle = getSaveButtonStyles();

// --- SAVE ACTION ---
const handleSave = async () => {
  if (!isSaveActive) return;

  setLoading(true);
  setCurrentPasswordError(''); 

  try {
      const response = await fetch(`${API_URL}/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              user_id: userId,
              current_password: currentPassword,
              new_password: newPassword
          }),
      });
      
      const data = await response.json();

      if (response.ok) {
          Alert.alert("Başarılı", "Şifreniz güncellendi.", [
              { text: "Tamam", onPress: () => router.back() }
          ]);
      } else {
          if (data.error === "Mevcut şifre hatalı") {
              setCurrentPasswordError("Şifre hatalı");
          } else {
              Alert.alert("Hata", "Güncelleme başarısız.");
          }
      }
  } catch (error) {
      console.error(error);
      Alert.alert("Hata", "Sunucu hatası.");
  } finally {
      setLoading(false);
  }
};

return (
  <LinearGradient 
    colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
    style={editProfileStyles.container}
  >
    <StatusBar 
      backgroundColor={isDark ? '#1a1a1a' : '#808080'} 
      barStyle={isDark ? "light-content" : "dark-content"} 
    />
    
    {Platform.OS === 'ios' && (
      <View
        {...panResponder.panHandlers}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 50, zIndex: 9999, backgroundColor: 'transparent' }}
      />
    )}

    {/* HEADER */}
    <View style={editProfileStyles.headerContainer}>
      <TouchableOpacity style={editProfileStyles.backButton} onPress={() => router.back()}>
        {/* Always White Back Icon */}
        <Ionicons name="chevron-back" size={32} color="#ffffff" />
      </TouchableOpacity>
      
      <Text style={editProfileStyles.headerTitle}>Şifreyi Değiştir</Text>

      <ScaleButton 
          style={[
              editProfileStyles.saveButton, 
              { 
                  backgroundColor: saveBtnStyle.bg,
                  borderWidth: isSaveActive ? 0 : 1,
                  borderColor: saveBtnStyle.border
              }
          ]}
          onPress={handleSave}
          disabled={!isSaveActive || loading}
      >
          {loading ? (
              <ActivityIndicator size="small" color={saveBtnStyle.text} />
          ) : (
              <Text style={[editProfileStyles.saveButtonText, { color: saveBtnStyle.text }]}>
                  Kaydet
              </Text>
          )}
      </ScaleButton>
    </View>

    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={editProfileStyles.scrollContent}>
          <View style={[editProfileStyles.formContainer, { marginTop: 30 }]}>
              
              {/* CURRENT PASSWORD */}
              <View style={editProfileStyles.inputGroup}>
                  <Text style={[editProfileStyles.inputLabel, { color: isDark ? '#ffffff' : colors.textSecondary }]}>
                      Mevcut şifre:
                  </Text>
                  <TextInput 
                      style={[
                          editProfileStyles.inputField, 
                          { 
                              borderBottomColor: currentPasswordError ? 'red' : (isDark ? '#ffffff' : '#000000') 
                          }
                      ]}
                      value={currentPassword}
                      onChangeText={(text) => { setCurrentPassword(text); setCurrentPasswordError(''); }}
                      placeholder="Mevcut şifrenizi girin"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry
                      selectionColor={colors.textPrimary}
                  />
                  {currentPasswordError ? (
                      <Text style={editProfileStyles.errorText}>{currentPasswordError}</Text>
                  ) : null}
              </View>

              {/* NEW PASSWORD */}
              <View style={editProfileStyles.inputGroup}>
                  <Text style={[editProfileStyles.inputLabel, { color: isDark ? '#ffffff' : colors.textSecondary }]}>
                      Yeni şifre:
                  </Text>
                  <TextInput 
                      style={[
                          editProfileStyles.inputField, 
                          { 
                              borderBottomColor: newPasswordError ? 'red' : (isDark ? '#ffffff' : '#000000') 
                          }
                      ]}
                      value={newPassword}
                      onChangeText={handleNewPasswordChange}
                      placeholder="Yeni şifrenizi girin"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry
                      selectionColor={colors.textPrimary}
                  />
                  {newPasswordError ? (
                      <Text style={editProfileStyles.errorText}>{newPasswordError}</Text>
                  ) : null}
              </View>

          </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </LinearGradient>
);
}