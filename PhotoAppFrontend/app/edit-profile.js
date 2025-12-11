import React, { useState, useEffect } from 'react';
import { 
  View, Text, Image, TouchableOpacity, TextInput, 
  StatusBar, Alert, ScrollView, ActivityIndicator, 
  KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import API_URL from '../config';
import editProfileStyles from '../styles/editProfileStyles';

const defaultProfileImage = require('../assets/no-pic.jpg');

export default function EditProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId;

  // State Management
  const [initialData, setInitialData] = useState({});
  const [profilePic, setProfilePic] = useState(null); 
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneRaw, setPhoneRaw] = useState(''); 
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(true);

  // --- FETCH USER DATA ---
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${API_URL}/get-user?user_id=${userId}`);
        const data = await response.json();
        
        if (response.ok) {
          // Parse phone number (Remove +90 prefix if present)
          let rawPhone = data.phone_number || '';
          if (rawPhone.startsWith('+90')) {
             rawPhone = rawPhone.substring(3);
          }
          
          const picUrl = data.profile_image ? `${API_URL}/uploads/${data.profile_image}` : null;

          // Set Initial Data for comparison
          setInitialData({
            username: data.username,
            email: data.email,
            phone: rawPhone,
            profilePic: picUrl
          });

          // Set Input Fields
          setUsername(data.username);
          setEmail(data.email);
          setPhoneRaw(rawPhone);
          setProfilePic(picUrl);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [userId]);

  // --- CHANGE DETECTION ---
  const hasChanges = () => {
    if (loading) return false;
    const isUsernameChanged = username !== initialData.username;
    const isEmailChanged = email !== initialData.email;
    const isPhoneChanged = phoneRaw !== initialData.phone;
    const isPicChanged = profilePic !== initialData.profilePic;
    return isUsernameChanged || isEmailChanged || isPhoneChanged || isPicChanged;
  };

  const validatePhone = (text) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setPhoneRaw(numericText);
    
    // Validation: Invalid if not empty AND length < 10
    if (numericText.length > 0 && numericText.length < 10) {
        setIsPhoneValid(false);
    } else {
        setIsPhoneValid(true);
    }
  };

  const isSaveActive = hasChanges() && isPhoneValid && phoneRaw.length === 10;

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

  // --- SAVE ACTION ---
  const handleSave = async () => {
    if (!isSaveActive) return;

    setSaving(true);
    try {
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('username', username);
        formData.append('email', email);
        formData.append('phone_number', '+90' + phoneRaw);

        // Append image only if changed and it's a new local file
        if (profilePic && profilePic !== initialData.profilePic && !profilePic.startsWith('http')) {
            const filename = profilePic.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image`;
            
            formData.append('profile_image', {
                uri: profilePic,
                name: filename,
                type: type,
            });
        }

        const response = await fetch(`${API_URL}/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'multipart/form-data' },
            body: formData,
        });
        
        if (response.ok) {
            Alert.alert("Başarılı", "Profiliniz güncellendi.");
            // Update initial state
            setInitialData({
                username: username,
                email: email,
                phone: phoneRaw,
                profilePic: profilePic
            });
        } else {
            Alert.alert("Hata", "Güncelleme başarısız oldu.");
        }

    } catch (error) {
        console.error(error);
        Alert.alert("Hata", "Sunucu hatası.");
    } finally {
        setSaving(false);
    }
  };

  return (
    <View style={editProfileStyles.container}>
      <StatusBar backgroundColor="#007AFF" barStyle="light-content" />

      {/* HEADER */}
      <View style={editProfileStyles.headerContainer}>
        <TouchableOpacity style={editProfileStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={32} color="#fff" />
        </TouchableOpacity>
        
        <Text style={editProfileStyles.headerTitle}>Profili Düzenle</Text>

        {/* SAVE BUTTON */}
        <TouchableOpacity 
            style={[editProfileStyles.saveButton, !isSaveActive && editProfileStyles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!isSaveActive || saving}
        >
            {saving ? (
                <ActivityIndicator size="small" color="#007AFF" />
            ) : (
                <Text style={[
                    editProfileStyles.saveButtonText, 
                    isSaveActive ? editProfileStyles.saveTextActive : editProfileStyles.saveTextInactive
                ]}>
                    Kaydet
                </Text>
            )}
        </TouchableOpacity>
      </View>

      {/* KEYBOARD AVOIDING VIEW WRAPPER FOR SCROLL CONTENT */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Adjust offset if needed
      >
        <ScrollView contentContainerStyle={editProfileStyles.scrollContent}>
            {loading ? (
                <ActivityIndicator style={{ marginTop: 50 }} color="#007AFF" />
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
                            />
                        </View>

                        {/* EMAIL */}
                        <View style={editProfileStyles.inputGroup}>
                            <Text style={editProfileStyles.inputLabel}>email:</Text>
                            <TextInput 
                                style={editProfileStyles.inputField}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Email Adresi"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* PHONE NUMBER */}
                        <View style={editProfileStyles.inputGroup}>
                            <Text style={editProfileStyles.inputLabel}>Telefon Numarası:</Text>
                            <View style={editProfileStyles.phoneContainer}>
                                <Text style={editProfileStyles.phonePrefix}>+90</Text>
                                <TextInput 
                                    style={editProfileStyles.phoneInput}
                                    value={phoneRaw}
                                    onChangeText={validatePhone}
                                    placeholder="5XX XXX XX XX"
                                    keyboardType="number-pad"
                                    maxLength={10}
                                />
                            </View>
                            {!isPhoneValid && (
                                <Text style={editProfileStyles.errorText}>Lütfen geçerli bir telefon numarası giriniz</Text>
                            )}
                        </View>

                    </View>
                </View>
            )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}