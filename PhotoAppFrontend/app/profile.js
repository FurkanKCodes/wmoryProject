import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Import AsyncStorage for Logout logic
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../config'; 
import profileStyles from '../styles/profileStyles';

const defaultProfileImage = require('../assets/no-pic.jpg');

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId;

  const [username, setUsername] = useState("Yükleniyor..."); 
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- FETCH USER DATA ---
  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          const response = await fetch(`${API_URL}/get-user?user_id=${userId}`, {
             headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          const data = await response.json();

          if (response.ok) {
            setUsername(data.username);
            // Use thumbnail if available for performance, else original
            if (data.thumbnail_url) {
                setProfilePic(data.thumbnail_url); 
            } else if (data.profile_image) {
                setProfilePic(`${API_URL}/uploads/${data.profile_image}`);
            } else {
                setProfilePic(null);
            }
          }
        } catch (error) {
          console.error("Connection error:", error);
        } finally {
          setLoading(false);
        }
      };

      if (userId) {
        fetchUserData();
      }
    }, [userId])
  );

  // --- ACTIONS ---
  const handleEditProfile = () => {
    router.push({ pathname: '/edit-profile', params: { userId: userId } });
  };

  const handleChangePassword = () => {
    router.push({ pathname: '/change-password', params: { userId: userId } });
  };

  // --- LOGOUT ACTION (NEW) ---
  const handleLogout = () => {
    Alert.alert(
        "Oturumu Kapat",
        "Oturumunuzu kapatmak istediğinize emin misiniz?",
        [
            { text: "Hayır", style: "cancel" },
            { 
                text: "Evet", 
                style: "destructive",
                onPress: async () => {
                    try {
                        // Clear the persistent session
                        await AsyncStorage.removeItem('user_session');
                        Alert.alert("Bilgi", "Oturumunuz kapatılmıştır.");
                        // Redirect to Login Screen
                        router.replace('/'); 
                    } catch (e) {
                        console.error("Logout Error:", e);
                    }
                }
            }
        ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
        "Hesabı Sil",
        "Hesabınızı silmek istediğinize emin misiniz?",
        [
            { text: "Hayır", style: "cancel" },
            { 
                text: "Evet", 
                style: "destructive",
                onPress: confirmDeleteAccount
            }
        ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
        const response = await fetch(`${API_URL}/delete-account?user_id=${userId}`, {
            method: 'DELETE',
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        
        if (response.ok) {
            // Clear session on account deletion too
            await AsyncStorage.removeItem('user_session');
            Alert.alert(
                "Başarılı", 
                "Hesabınız başarıyla silinmiştir.",
                [
                    { 
                        text: "Tamam", 
                        onPress: () => router.replace('/') 
                    }
                ]
            );
        } else {
            Alert.alert("Hata", "Hesap silinemedi.");
        }
    } catch (error) {
        console.error(error);
        Alert.alert("Hata", "Sunucu hatası.");
    }
  };

  return (
    <View style={profileStyles.container}>
      <StatusBar backgroundColor="#007AFF" barStyle="light-content" />

      {/* --- HEADER --- */}
      <View style={profileStyles.headerContainer}>
        <TouchableOpacity style={profileStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={32} color="#fff" />
        </TouchableOpacity>
        <Text style={profileStyles.headerTitle}>Profilim</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView>
        <View style={profileStyles.profileInfoContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : (
            <>
              <Image 
                source={profilePic ? { uri: profilePic } : defaultProfileImage} 
                style={profileStyles.largeProfileImage}
              />
              
              <Text style={profileStyles.usernameText}>{username}</Text>
              
              <TouchableOpacity onPress={handleEditProfile}>
                <Text style={profileStyles.editProfileText}>Profili Düzenle</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* --- SETTINGS LIST --- */}
        <View style={profileStyles.settingsContainer}>
          
          <TouchableOpacity style={profileStyles.settingItem} onPress={handleChangePassword}>
            <View style={profileStyles.settingLeft}>
              <Ionicons name="lock-closed-outline" size={24} color="#555" style={profileStyles.settingIcon} />
              <Text style={profileStyles.settingText}>Şifreyi Değiştir</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* LOGOUT BUTTON (ADDED) */}
          <TouchableOpacity style={profileStyles.settingItem} onPress={handleLogout}>
            <View style={profileStyles.settingLeft}>
              <Ionicons name="log-out-outline" size={24} color="#007AFF" style={profileStyles.settingIcon} />
              <Text style={[profileStyles.settingText, {color: '#007AFF'}]}>Oturumu Kapat</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={profileStyles.settingItem} onPress={handleDeleteAccount}>
            <View style={profileStyles.settingLeft}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" style={profileStyles.settingIcon} />
              <Text style={[profileStyles.settingText, profileStyles.deleteAccountText]}>Hesabı Sil</Text>
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}