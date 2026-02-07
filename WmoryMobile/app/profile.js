import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, Image, TouchableOpacity, StatusBar, Alert, ScrollView, 
  ActivityIndicator, Modal, FlatList, Dimensions, PanResponder, Platform,
  Animated, Pressable, TouchableWithoutFeedback
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../config'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext'; 
import { getProfileStyles } from '../styles/profileStyles';
import * as Clipboard from 'expo-clipboard';
import { saveDataToCache, loadDataFromCache, CACHE_KEYS } from '../utils/cacheHelper';

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

export default function ProfileScreen() {
  const { width } = Dimensions.get('window'); 

  // --- THEME HOOK INTEGRATION ---
  const { colors, themePreference, setTheme, isDark } = useTheme();
  // Generate styles dynamically based on current colors
  const profileStyles = getProfileStyles(colors); 
  
  // --- THEME MODAL STATE ---
  const [isThemeModalVisible, setThemeModalVisible] = useState(false);

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
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId;

  const [username, setUsername] = useState("Yükleniyor..."); 
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(0); 
  
  // NEW: Stats logic states
  const [userPlan, setUserPlan] = useState('demo');
  const [dailyUsageMB, setDailyUsageMB] = useState(0);
  const [planLimitMB, setPlanLimitMB] = useState(100);
  const [planName, setPlanName] = useState('demo');

  // NEW: Full Screen Modal state
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Blocked Users Logic
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedModalVisible, setBlockedModalVisible] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null); 

  // --- FETCH USER DATA ---
  useFocusEffect(
    useCallback(() => {
      
      // 1. Helper Function: Process Data and Update State
      // This prevents code duplication for Cache and API data
      const updateProfileState = (data) => {
        setUsername(data.username);
        setIsSuperAdmin(data.is_super_admin); 
        
        // --- NEW: PLAN & STORAGE LOGIC ---
        setPlanName(data.plan_name || 'demo'); // Backend: p.name
        
        const limit = data.plan_limit_mb || 100;
        setPlanLimitMB(limit);

        // Date Check Logic for Frontend Display
        let usageBytes = 0;
        if (data.last_upload_date) {
            const serverDateStr = new Date(data.last_upload_date).toISOString().split('T')[0];
            const todayStr = new Date().toISOString().split('T')[0];

            if (serverDateStr === todayStr) {
                usageBytes = data.daily_usage || 0;
            } else {
                usageBytes = 0;
            }
        }
        
        // Convert Bytes to MB for display (Two decimal places)
        const usageMB = (usageBytes / (1024 * 1024)).toFixed(1);
        setDailyUsageMB(usageMB)

          // Set Profile Picture
          if (data.thumbnail_url) {
              setProfilePic(data.thumbnail_url); 
          } else if (data.profile_image) {
              setProfilePic(`${API_URL}/uploads/${data.profile_image}`);
          } else {
              setProfilePic(null);
          }
      };

      const fetchUserData = async () => {
        if (!userId) return;

        const cacheKey = CACHE_KEYS.USER_PROFILE(userId);

        // 2. CACHE LAYER: Try to load from device storage first
        try {
            const cachedData = await loadDataFromCache(cacheKey);
            if (cachedData) {
                // Immediate UI update from cache
                updateProfileState(cachedData);
                setLoading(false); 
            }
        } catch (e) {
            console.log("Cache error:", e);
        }

        // 3. NETWORK LAYER: Fetch fresh data from API
        try {
          const response = await fetch(`${API_URL}/get-user?user_id=${userId}`, {
             headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          const data = await response.json();

          if (response.ok) {
            // Update UI with fresh data
            updateProfileState(data);
            // Save fresh data to cache
            await saveDataToCache(cacheKey, data);
          }
        } catch (error) {
          console.error("Connection error:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }, [userId])
  );

  // --- FETCH BLOCKED USERS ---
  const fetchBlockedUsers = async () => {
      try {
          const res = await fetch(`${API_URL}/get-blocked-users?user_id=${userId}`, {
              headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          if(res.ok) {
              setBlockedUsers(await res.json());
          }
      } catch(e) { console.error(e); }
  };

  const handleOpenBlockedUsers = () => {
      fetchBlockedUsers();
      setBlockedModalVisible(true);
  };

  const handleUnblockUser = (blockedId) => {
      setActiveMenuId(null);
      Alert.alert(
          "Engeli Kaldır",
          "Kişinin engelini kaldırmak istediğinize emin misiniz?",
          [
              { text: "Hayır", style: "cancel" },
              { text: "Evet", onPress: () => performUnblock(blockedId) }
          ]
      );
  };

  const performUnblock = async (blockedId) => {
      try {
          const res = await fetch(`${API_URL}/unblock-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ blocker_id: userId, blocked_id: blockedId })
          });
          if(res.ok) {
              fetchBlockedUsers(); 
              Alert.alert("Başarılı", "Engel kaldırıldı.");
          }
      } catch(e) { console.error(e); }
  };

  // --- ACTIONS ---
  const handleEditProfile = () => {
    router.push({ pathname: '/edit-profile', params: { userId: userId } });
  };

  const handleChangePassword = () => {
    router.push({ pathname: '/change-password', params: { userId: userId } });
  };

  const handleLogout = () => {
    Alert.alert(
        "Çıkış Yap",
        "Çıkış yapmak istediğinize emin misiniz?",
        [
            { text: "Hayır", style: "cancel" },
            { 
                text: "Evet", 
                style: "destructive",
                onPress: async () => {
                    try {
                        await AsyncStorage.removeItem('user_session');
                        Alert.alert("Bilgi", "Başarıyla çıkış yapıldı.");
                        await AsyncStorage.removeItem('user_id');
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
        "Emin misiniz? Bu işlem geri alınamaz.",
        [
            { text: "Hayır", style: "cancel" },
            { 
                text: "Evet, Sil", 
                style: "destructive",
                onPress: confirmDeleteAccount
            }
        ]
    );
  };

  // --- HELP & SUPPORT ACTION ---
  const handleHelpSupport = async () => {
    await Clipboard.setStringAsync("help@wmory.com");
    Alert.alert("Bilgi", "Mail panoya kopyalandı.");
  };

  const confirmDeleteAccount = async () => {
    try {
        const response = await fetch(`${API_URL}/delete-account?user_id=${userId}`, {
            method: 'DELETE',
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        
        if (response.ok) {
            await AsyncStorage.removeItem('user_session');
            Alert.alert("Başarılı", "Hesabınız silindi.", [{ text: "Tamam", onPress: () => router.replace('/') }]);
        } else {
            Alert.alert("Hata", "Hesap silinemedi.");
        }
    } catch (error) {
        console.error(error);
        Alert.alert("Hata", "Sunucu hatası.");
    }
  };

  const renderBlockedItem = ({ item }) => {
    const isMenuOpen = activeMenuId === item.blocked_id;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image 
                  source={item.thumbnail_url ? { uri: item.thumbnail_url } : defaultProfileImage} 
                  // Fixed: Dynamic background color for placeholder area
                  style={{ width: 50, height: 50, borderRadius: 25, marginRight: 10, backgroundColor: isDark ? '#333' : '#ccc' }}
                />
                <Text style={{ fontSize: 16, fontWeight: '500', color: colors.textPrimary }}>{item.username}</Text>
            </View>
            
            <View style={{ position: 'relative' }}>
                <TouchableOpacity onPress={() => setActiveMenuId(isMenuOpen ? null : item.blocked_id)}>
                    <Ionicons name="ellipsis-vertical" size={24} color={colors.iconDefault} />
                </TouchableOpacity>
                
                {isMenuOpen && (
                    <View style={{
                        position: 'absolute', right: 25, top: 0, backgroundColor: colors.cardBg, 
                        padding: 10, borderRadius: 5, elevation: 5, zIndex: 10, minWidth: 100,
                        shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity:0.2,
                        borderColor: colors.border, borderWidth: 1
                    }}>
                        <TouchableOpacity onPress={() => handleUnblockUser(item.blocked_id)}>
                            <Text style={{ color: colors.textPrimary }}>Engeli Kaldır</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
  };

  return (
    <LinearGradient 
      colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
      style={profileStyles.container}
    >
      {/* Dynamic Status Bar */}
      <StatusBar 
         backgroundColor={colors.headerBg} 
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

      {/* --- HEADER --- */}
      <View style={profileStyles.headerContainer}>
        <TouchableOpacity style={profileStyles.backButton} onPress={() => router.back()}>
          {/* Always White to match Header Title */}
          <Ionicons name="chevron-back" size={32} color="#ffffff" />
        </TouchableOpacity>
        <Text style={profileStyles.headerTitle}>Profilim</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView>
        <View style={profileStyles.profileInfoContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <>
              {/* Profile Image with Full Screen Logic */}
              <TouchableOpacity onPress={() => setIsFullScreen(true)}>
                  <Image 
                    source={profilePic ? { uri: profilePic } : defaultProfileImage} 
                    style={profileStyles.largeProfileImage}
                  />
              </TouchableOpacity>

              <Text style={profileStyles.usernameText}>{username}</Text>
              
              {/* Animated Edit Profile Button */}
              <ScaleButton onPress={handleEditProfile} style={profileStyles.editProfileButton}>
                <Text style={profileStyles.editProfileText}>Profili Düzenle</Text>
              </ScaleButton>

              {/* --- NEW: STORAGE & PLAN INFO --- */}
              <View style={profileStyles.storageContainer}>
                  {/* Row: Plan Name */}
                  <View style={profileStyles.planRow}>
                      <Text style={profileStyles.planLabel}>Mevcut Plan:</Text>
                      <Text style={profileStyles.planValue}>{planName.toUpperCase()}</Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={profileStyles.progressBarBg}>
                      <View 
                        style={[
                            profileStyles.progressBarFill, 
                            { 
                                // Calculate width %
                                width: `${Math.min((dailyUsageMB / planLimitMB) * 100, 100)}%`,
                                // Change color if full (Red) else Theme Color
                                backgroundColor: dailyUsageMB >= planLimitMB ? '#FF3B30' : '#007AFF' 
                            }
                        ]} 
                      />
                  </View>

                  {/* Usage Text */}
                  <Text style={profileStyles.usageText}>
                      {dailyUsageMB} MB / {planLimitMB} MB kullanıldı
                  </Text>
              </View>
              {/* ------------------------------------------ */}
            </>
          )}
        </View>

        {/* --- SETTINGS LIST --- */}
        <View style={profileStyles.settingsContainer}>
          
          {/* BLOCKED USERS BUTTON */}
          <TouchableOpacity style={profileStyles.settingItem} onPress={handleOpenBlockedUsers}>
            <View style={profileStyles.settingLeft}>
              <Ionicons name="ban-outline" size={24} color="#555" style={profileStyles.settingIcon} />
              <Text style={profileStyles.settingText}>Engellenen Kullanıcılar</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? "#ccc" : "#000"} />
          </TouchableOpacity>
          
          {/* THEME OPTION BUTTON */}
          <TouchableOpacity style={profileStyles.settingItem} onPress={() => setThemeModalVisible(true)}>
            <View style={profileStyles.settingLeft}>
              <Ionicons name="color-palette-outline" size={24} color={colors.iconDefault} style={{marginRight: 15}} />
              <Text style={profileStyles.settingText}>Görünüm</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {/* Show current theme status text */}
                <Text style={{color: colors.textSecondary, marginRight: 10, fontSize: 14}}>
                    {themePreference === 'system' ? 'Sistem' : (themePreference === 'dark' ? 'Koyu' : 'Aydınlık')}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#ccc" : "#000"} />
            </View>
          </TouchableOpacity>

          {/* LOGOUT BUTTON */}
          <TouchableOpacity style={profileStyles.settingItem} onPress={handleLogout}>
            <View style={profileStyles.settingLeft}>
              <Ionicons name="log-out-outline" size={24} color="#007AFF" marginRight={15} />
              <Text style={[profileStyles.settingText, {color: '#007AFF'}]}>Çıkış Yap</Text>
            </View>
          </TouchableOpacity>

          {/* DELETE ACCOUNT BUTTON */}
          <TouchableOpacity style={profileStyles.settingItem} onPress={handleDeleteAccount}>
            <View style={profileStyles.settingLeft}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" marginRight={15} />
              <Text style={[profileStyles.settingText, profileStyles.deleteAccountText]}>Hesabı Sil</Text>
            </View>
          </TouchableOpacity>

          {/* HELP & SUPPORT BUTTON */}
          <TouchableOpacity style={profileStyles.settingItem} onPress={handleHelpSupport}>
            <View style={profileStyles.settingLeft}>
              {/* Using same color/style as Change Password for consistency */}
              <Ionicons name="help-circle-outline" size={24} color="#555" style={profileStyles.settingIcon} />
              <Text style={profileStyles.settingText}>Yardım ve Destek</Text>
            </View>
          </TouchableOpacity>

          {/* --- ADMIN PANEL BUTTON --- */}
          {isSuperAdmin === 1 && (
             <TouchableOpacity 
                // Light Mode: Black Border, Dark Mode: Standard Border
                style={[profileStyles.settingItem, { 
                  borderTopWidth: 1, 
                  borderColor: isDark ? colors.border : '#000000', 
                  marginTop: 20 
                }]}
                onPress={() => router.push({ pathname: '/admin-panel', params: { userId } })}
             >
                <View style={profileStyles.settingLeft}>
                    <Ionicons name="shield-checkmark-outline" size={24} color="#FF3B30" marginRight={15} />
                    <Text style={[profileStyles.settingText, { color: '#FF3B30', fontWeight: 'bold' }]}>
                        Yönetici Paneli
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#ccc" : "#000"} />
             </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* --- BLOCKED USERS MODAL --- */}
      <Modal visible={blockedModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBlockedModalVisible(false)}>
            <LinearGradient colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} style={{ flex: 1 }}>
              {/* Custom Header to match Profile Header */}
              <View style={{ 
                  paddingTop: Platform.OS === 'ios' ? 60 : 80, 
                  paddingBottom: 15, 
                  paddingHorizontal: 20, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: isDark ? '#1a1a1a' : '#808080', // Match Home/Profile Header
                  borderBottomWidth: 1, 
                  borderBottomColor: isDark ? '#444' : '#000' // Black divider in light mode
              }}>
                  <TouchableOpacity onPress={() => setBlockedModalVisible(false)}>
                      {/* White Icon */}
                      <Ionicons name="chevron-back" size={30} color="#ffffff" />
                  </TouchableOpacity>
                  {/* White Title */}
                  <Text style={{ fontSize: 18, color: '#ffffff', fontWeight: 'bold', marginLeft: 20 }}>
                      Engellenen Kullanıcılar
                  </Text>
              </View>
              
              {blockedUsers.length > 0 ? (
                  <FlatList 
                      data={blockedUsers}
                      keyExtractor={(item) => item.blocked_id.toString()}
                      renderItem={renderBlockedItem}
                  />
              ) : (
                  /* "Bulunamadı" yazısını okunabilir gri yaptık */
                  <Text style={{ textAlign: 'center', marginTop: 50, color: '#ccc' }}>Engellenmiş kullanıcı bulunmamaktadır.</Text>
              )}
          </LinearGradient>
      </Modal>

      {/* --- FULL SCREEN PROFILE IMAGE MODAL --- */}
      <Modal visible={isFullScreen} transparent={true} animationType="fade" onRequestClose={() => setIsFullScreen(false)}>
          <View style={profileStyles.fullScreenContainer}>
              <TouchableOpacity style={profileStyles.fullScreenCloseButton} onPress={() => setIsFullScreen(false)}>
                  <Ionicons name="chevron-back" size={36} color="#fff" />
              </TouchableOpacity>
              <Image 
                  source={profilePic ? { uri: profilePic } : defaultProfileImage} 
                  style={profileStyles.fullScreenImage}
                  resizeMode="contain"
              />
          </View>
      </Modal>

      {/* --- THEME SELECTION MODAL --- */}
      <Modal visible={isThemeModalVisible} transparent={true} animationType="fade" onRequestClose={() => setThemeModalVisible(false)}>
          {/* Outer Touchable to detect outside taps */}
          <TouchableWithoutFeedback onPress={() => setThemeModalVisible(false)}>
              <View style={profileStyles.modalOverlay}>
                  {/* Stop propagation so tapping the modal box doesn't close it */}
                  <TouchableWithoutFeedback onPress={() => {}}>
                      <View style={profileStyles.themeModalContainer}>
                          <Text style={profileStyles.themeTitle}>Görünüm Seç</Text>
                          
                          <View style={profileStyles.themeOptionsContainer}>
                              {/* LIGHT OPTION */}
                              <TouchableOpacity 
                                style={[profileStyles.themeOption, themePreference === 'light' && profileStyles.themeOptionSelected]} 
                                onPress={() => setTheme('light')}
                              >
                                  <View style={[profileStyles.themePreviewBox, {backgroundColor: '#fff', borderColor: '#ccc', borderWidth:1}]}>
                                    <Ionicons name="sunny" size={24} color="#000" />
                                  </View>
                                  <Text style={profileStyles.themeText}>Aydınlık</Text>
                              </TouchableOpacity>

                              {/* DARK OPTION */}
                              <TouchableOpacity 
                                style={[profileStyles.themeOption, themePreference === 'dark' && profileStyles.themeOptionSelected]} 
                                onPress={() => setTheme('dark')}
                              >
                                  <View style={[profileStyles.themePreviewBox, {backgroundColor: '#333'}]}>
                                    <Ionicons name="moon" size={24} color="#fff" />
                                  </View>
                                  <Text style={profileStyles.themeText}>Koyu</Text>
                              </TouchableOpacity>

                              {/* SYSTEM OPTION */}
                              <TouchableOpacity 
                                style={[profileStyles.themeOption, themePreference === 'system' && profileStyles.themeOptionSelected]} 
                                onPress={() => setTheme('system')}
                              >
                                  <View style={[profileStyles.themePreviewBox, {backgroundColor: '#666'}]}>
                                    <Ionicons name="phone-portrait-outline" size={24} color="#fff" />
                                  </View>
                                  <Text style={profileStyles.themeText}>Sistem</Text>
                              </TouchableOpacity>
                          </View>

                          {/* Close button removed as requested */}
                      </View>
                  </TouchableWithoutFeedback>
              </View>
          </TouchableWithoutFeedback>
      </Modal>

    </LinearGradient>
  );
}