import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, Image, TouchableOpacity, TextInput, 
  StatusBar, Alert, ScrollView, ActivityIndicator, 
  KeyboardAvoidingView, Platform, PanResponder, Dimensions,
  Animated, Pressable, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import API_URL from '../config';
import { saveDataToCache, loadDataFromCache, CACHE_KEYS } from '../utils/cacheHelper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { getEditProfileStyles } from '../styles/editProfileStyles';

const defaultProfileImage = require('../assets/no-pic.jpg');

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

export default function EditProfileScreen() {
  const { colors, isDark } = useTheme();
  const editProfileStyles = getEditProfileStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId;

  const [modalVisible, setModalVisible] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

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

  // State Management
  const [initialData, setInitialData] = useState({});
  const [profilePic, setProfilePic] = useState(null); 
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneRaw, setPhoneRaw] = useState(''); 
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);

  // --- FETCH USER DATA ---
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      const cacheKey = CACHE_KEYS.USER_PROFILE(userId);

      // Helper: Extract filename from S3 Presigned URL to compare without signatures
      const getFileName = (url) => (url && typeof url === 'string' ? url.split('?')[0].split('/').pop() : url);

      // 1. SILENT CACHE LOAD: Load existing data first
      try {
          const cachedData = await loadDataFromCache(cacheKey);
          if (cachedData) {
              const rawPhone = (cachedData.phone_number || '').startsWith('+90') 
                  ? cachedData.phone_number.substring(3) 
                  : (cachedData.phone_number || '');
              
              const picUrl = cachedData.thumbnail_url || null;

              setInitialData({ username: cachedData.username, email: cachedData.email, phone: rawPhone, profilePic: picUrl });
              setUsername(cachedData.username);
              setEmail(cachedData.email);
              setPhoneRaw(rawPhone);
              setProfilePic(picUrl);
              setLoading(false); // Hide spinner immediately if cache is found
          }
      } catch (e) { console.log("Cache load error:", e); }

      // 2. BACKGROUND FETCH: Refresh data from server silently
      try {
        const response = await fetch(`${API_URL}/get-user?user_id=${userId}`);
        const data = await response.json();
        
        if (response.ok) {
          let rawPhone = data.phone_number || '';
          if (rawPhone.startsWith('+90')) rawPhone = rawPhone.substring(3);
          
          const freshPicUrl = data.thumbnail_url || null;

          // --- SILENT UPDATE LOGIC ---
          // Use filename comparison to prevent flickering if only the S3 signature changed
          setProfilePic((prev) => {
              if (!prev || !freshPicUrl) return freshPicUrl;
              if (getFileName(prev) === getFileName(freshPicUrl)) return prev;
              return freshPicUrl;
          });

          setInitialData({
            username: data.username,
            email: data.email,
            phone: rawPhone,
            profilePic: freshPicUrl
          });

          setUsername(data.username);
          setEmail(data.email);
          setPhoneRaw(rawPhone);
          setIsEmailValid(true);

          // Save fresh data back to cache
          await saveDataToCache(cacheKey, data);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [userId]);

  // --- IMPROVED CHANGE DETECTION ---
  const hasChanges = () => {
    if (loading) return false;

    // Helper: Compare only filenames to ignore S3 expiration signatures
    const getFileName = (url) => (url && typeof url === 'string' ? url.split('?')[0].split('/').pop() : url);

    const isUsernameChanged = username !== initialData.username;
    const isEmailChanged = email !== initialData.email;
    const isPhoneChanged = phoneRaw !== initialData.phone;
    
    // Check if image is truly different (new local file OR different filename on S3)
    const isNewLocalFile = profilePic && !profilePic.startsWith('http');
    const isPicChanged = isNewLocalFile || (getFileName(profilePic) !== getFileName(initialData.profilePic));

    return isUsernameChanged || isEmailChanged || isPhoneChanged || isPicChanged;
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    const emailRegex = /^.+@.+\.com$/;
    // Valid if empty (initial) or matches regex
    setIsEmailValid(text.length === 0 || emailRegex.test(text));
  };

  const isSaveActive = hasChanges() && isEmailValid && email.length > 0 && username.length > 0;
  // --- IMAGE PICKER FUNCTIONS ---
  const handlePhotoOptions = () => {
    Alert.alert(
      "Profil Fotoğrafı",
      "Fotoğrafı değiştirmek için bir seçenek belirleyin:",
      [
        { text: "Kamerayı Aç", onPress: openCamera },
        { text: "Galeriden Seç", onPress: openGallery },
        { text: "İptal", style: "cancel" }
      ]
    );
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert("İzin Gerekli", "Kamera erişimi reddedildi.");
        return;
    }
    const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
    });
    if (!result.canceled) {
        setProfilePic(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert("İzin Gerekli", "Galeri erişimi reddedildi.");
        return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) {
        setProfilePic(result.assets[0].uri);
    }
  };

  // --- LOGIC: DECIDE IF VERIFICATION IS NEEDED ---
  const handleSavePress = async () => {
    if (!isSaveActive) return;

    // 1. Check if email has changed
    if (email !== initialData.email) {
        // Email changed: Send code first
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), type: 'update' }),
            });
            const data = await response.json();

            if (response.ok) {
                setModalVisible(true); // Open Verification Modal
            } else {
                Alert.alert('Hata', data.error || 'Kod gönderilemedi.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Sunucu hatası.');
        } finally {
            setSaving(false);
        }
    } else {
        // Email NOT changed: Update directly
        performProfileUpdate();
    }
  };


  // --- LOGIC: VERIFY CODE THEN UPDATE ---
  const handleVerifyAndSave = async () => {
    if (verificationCode.length !== 6) {
        Alert.alert('Hata', 'Lütfen 6 haneli kodu girin.');
        return;
    }
    
    setVerifying(true);
    try {
        // 1. Verify Code
        const verifyResponse = await fetch(`${API_URL}/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), code: verificationCode, type: 'update' }),
        });
        
        if (!verifyResponse.ok) {
            const errData = await verifyResponse.json();
            Alert.alert('Hata', errData.error || 'Kod hatalı.');
            setVerifying(false);
            return;
        }

        // 2. If Code Valid -> Proceed to Update Profile
        setModalVisible(false); // Close modal
        await performProfileUpdate(); // Call the actual update function

    } catch (error) {
        Alert.alert('Hata', 'İşlem sırasında hata oluştu.');
    } finally {
        setVerifying(false);
    }
  };

  // --- LOGIC: ACTUAL API CALL (Moved from old handleSave) ---
  const performProfileUpdate = async () => {
    setSaving(true);
    try {
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('username', username);
        formData.append('email', email);
        formData.append('phone_number', '+90' + phoneRaw);

        if (profilePic && profilePic !== initialData.profilePic && !profilePic.startsWith('http')) {
            const filename = profilePic.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;
            
            formData.append('profile_image', {
                uri: profilePic,
                name: filename,
                type: type,
            });
        }

        const response = await fetch(`${API_URL}/update-profile`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', },
            body: formData,
        });

        const responseData = await response.json()
        
        if (response.ok) { router.back();
        } else {
            console.log("Update Error:", responseData);
            Alert.alert("Hata", responseData.error || "Güncelleme başarısız oldu.");
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        Alert.alert("Hata", "Sunucu hatası.");
    } finally {
        setSaving(false);
    }
  };


  // --- BUTTON COLOR LOGIC ---
  const getSaveButtonStyles = () => {
    if (!isDark) {
        // Requirement 4: Light Mode
        // Active: BG #000, Text #fff
        // Inactive: BG #fff, Text #000
        return {
            bg: isSaveActive ? '#000000' : '#ffffff',
            text: isSaveActive ? '#ffffff' : '#000000',
            border: '#000000' // Add border for inactive state visibility
        };
    } else {
        // Dark Mode (Consistent with Home)
        return {
            bg: isSaveActive ? '#000' : '#333333',
            text: isSaveActive ? '#fff' : '#888888',
            border: '#333333'
        };
    }
};

const saveBtnStyle = getSaveButtonStyles();

  return (
    <LinearGradient 
      colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
      style={editProfileStyles.container}
    >
      <StatusBar 
        // Match Header Color logic (#1a1a1a or #808080)
        backgroundColor={isDark ? '#1a1a1a' : '#808080'} 
        barStyle={isDark ? "light-content" : "dark-content"} 
      />

      {Platform.OS === 'ios' && (
        <View
          {...panResponder.panHandlers}
          style={{
            position: 'absolute',
            right: 0,   
            top: 0,
            bottom: 0,
            width: 50,  
            zIndex: 9999, 
            backgroundColor: 'transparent'
          }}
        />
      )}

      {/* HEADER */}
      <View style={editProfileStyles.headerContainer}>
        <TouchableOpacity style={editProfileStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={32} color='#fff' />
        </TouchableOpacity>
        
        <Text style={editProfileStyles.headerTitle}>Profili Düzenle</Text>

        {/* SAVE BUTTON */}
        <ScaleButton 
            style={[
                editProfileStyles.saveButton, 
                { 
                    backgroundColor: saveBtnStyle.bg,
                    borderWidth: 0,
                }
            ]}
            onPress={handleSavePress}
            disabled={!isSaveActive || saving}
        >
            {saving ? (
                <ActivityIndicator size="small" color={saveBtnStyle.text} />
            ) : (
                <Text style={[editProfileStyles.saveButtonText, { color: saveBtnStyle.text }]}>
                    Kaydet
                </Text>
            )}
        </ScaleButton>
      </View>

      {/* KEYBOARD AVOIDING VIEW WRAPPER FOR SCROLL CONTENT */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Adjust offset if needed
      >
        <ScrollView contentContainerStyle={editProfileStyles.scrollContent}>
            {loading ? (
                <ActivityIndicator style={{ marginTop: 50 }} color={isDark ? '#000' : '#fff'} />
            ) : (
                <View>
                    
                    {/* 1. PHOTO SECTION */}
                    <View style={editProfileStyles.photoSection}>
                        <Image 
                            source={profilePic ? { uri: profilePic } : defaultProfileImage} 
                            style={editProfileStyles.largeProfileImage}
                        />
                        <TouchableOpacity onPress={handlePhotoOptions}>
                            <Text style={editProfileStyles.changePhotoText}>Fotoğrafı Değiştir</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 2. FORM SECTION */}
                    <View style={editProfileStyles.formContainer}>
                        
                        {/* USERNAME */}
                        <View style={editProfileStyles.inputGroup}>
                            <Text style={editProfileStyles.inputLabel}>Kullanıcı Adı:</Text>
                            <TextInput 
                                style={editProfileStyles.inputField}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Kullanıcı Adı"
                                placeholderTextColor={colors.textSecondary}
                                // Requirement 7: Caret color matches text color
                                selectionColor={colors.textPrimary} 
                            />
                        </View>

                        {/* EMAIL */}
                        <View style={editProfileStyles.inputGroup}>
                            <Text style={editProfileStyles.inputLabel}>Email:</Text>
                            <TextInput 
                                style={editProfileStyles.inputField}
                                value={email}
                                onChangeText={handleEmailChange} 
                                placeholder="Email Adresi"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                // Requirement 7: Caret color matches text color
                                selectionColor={colors.textPrimary}
                            />
                            {!isEmailValid && (
                                <Text style={editProfileStyles.errorText}>Geçerli bir e-posta girin (@.com)</Text>
                            )}
                        </View>

                    </View>
                </View>
            )}
        </ScrollView>
        {/* --- VERIFICATION MODAL --- */}
        <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={editProfileStyles.modalOverlay}>
            <View style={editProfileStyles.modalContainer}>
              <Text style={editProfileStyles.modalTitle}>Güvenlik Doğrulaması</Text>
              <Text style={editProfileStyles.modalSubtitle}>
                {email} adresine gönderilen kodu girin.
              </Text>
            
              <TextInput
                style={editProfileStyles.modalInput}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="------"
                placeholderTextColor={isDark ? '#545454' : '#666'}
                selectionColor={isDark ? '#545454' : '#666'}
              />

              <ScaleButton 
                  style={editProfileStyles.modalButton} 
                  onPress={handleVerifyAndSave} 
                  disabled={verifying}
              >
                {verifying ? (
                    <ActivityIndicator color={isDark ? '#000' : '#fff'} /> 
                ) : (
                    <Text style={{ color: isDark ? '#000' : '#fff', fontSize: 18, fontWeight: '600' }}>
                        Doğrula ve Kaydet
                    </Text>
                )}
              </ScaleButton>

              <TouchableOpacity style={editProfileStyles.modalCancelButton} onPress={() => setModalVisible(false)}>
                <Text style={editProfileStyles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}