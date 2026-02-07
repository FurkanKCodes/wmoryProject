import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    View, Text, Image, TouchableOpacity, StatusBar, 
    ScrollView, ActivityIndicator, Modal, TextInput, Alert, 
    KeyboardAvoidingView, Platform, Switch, Animated, Pressable, RefreshControl
  } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import * as Clipboard from 'expo-clipboard'; 
import API_URL from '../config';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { getGroupDetailsStyles } from '../styles/groupDetailsStyles';
import { saveDataToCache, loadDataFromCache, CACHE_KEYS } from '../utils/cacheHelper';

const defaultGroupImage = require('../assets/no-pic.jpg'); 
const defaultUserImage = require('../assets/no-pic.jpg');

// --- HELPER: ANIMATED SCALE BUTTON ---
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

export default function GroupDetailsScreen() {
    // --- THEME HOOK ---
  const { colors, isDark } = useTheme();
  const groupDetailsStyles = getGroupDetailsStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { groupId, userId } = params;

  // --- DATA STATES ---
  const [groupDetails, setGroupDetails] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // --- UI STATES ---
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Edit Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState(''); // New: Description Edit
  const [editImage, setEditImage] = useState(null); 
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // MENU POPUP STATE
  const [activeMenuMemberId, setActiveMenuMemberId] = useState(null);

  // Notification State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // --- HELPER: UPDATE STATE FROM DATA ---
  // This helper function handles updating the UI state from either Cache or API data
  const updateGroupState = (details, membersData, requestsData) => {
    if (details) {
        setGroupDetails(details);
    }
    
    if (membersData) {
        setMembers(membersData);
        // Check Admin & Notification Status based on members list
        const currentUser = membersData.find(m => m.id.toString() === userId.toString());
        setIsAdmin(currentUser?.is_admin === 1);
        setNotificationsEnabled(currentUser?.notifications === 1);
    }

    if (requestsData) {
        setRequests(requestsData);
    }
};

// --- FETCH DATA (CACHE FIRST STRATEGY) ---
const fetchData = async () => {
  // 1. Define Cache Key
  const cacheKey = CACHE_KEYS.GROUP_DETAILS(groupId);

  // 2. CACHE LAYER: Try to load from device storage first
  try {
      const cachedData = await loadDataFromCache(cacheKey);
      if (cachedData) {
          // Immediate UI update from cache
          // cachedData structure: { details, members, requests }
          updateGroupState(cachedData.details, cachedData.members, cachedData.requests);
          setLoading(false); 
      }
  } catch (e) {
      console.log("Cache load error:", e);
  }

  // 3. NETWORK LAYER: Fetch fresh data from API
  try {
    // Execute all requests in parallel for performance
    const [groupRes, membersRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/get-group-details?group_id=${groupId}`, { headers: { 'ngrok-skip-browser-warning': 'true' }}),
        fetch(`${API_URL}/get-group-members?group_id=${groupId}&current_user_id=${userId}`, { headers: { 'ngrok-skip-browser-warning': 'true' }}),
        fetch(`${API_URL}/get-group-requests?group_id=${groupId}`, { headers: { 'ngrok-skip-browser-warning': 'true' }})
    ]);

    const freshData = {};

    // Process Group Details
    if (groupRes.ok) {
        freshData.details = await groupRes.json();
    }

    // Process Members
    if (membersRes.ok) {
        freshData.members = await membersRes.json();
    }

    // Process Requests
    if (reqRes.ok) {
        freshData.requests = await reqRes.json();
    }

    // Update UI with fresh data
    updateGroupState(freshData.details, freshData.members, freshData.requests);

    // Save combined data to cache
    // We merge with existing cache to avoid losing parts if one API fails
    if (freshData.details || freshData.members) {
         await saveDataToCache(cacheKey, freshData);
    }

  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    setLoading(false);
    // Stop refresh spinner if active
    if (typeof setRefreshing === 'function') setRefreshing(false);
  }
};

  // --- REFRESH STATE ---
  const [refreshing, setRefreshing] = useState(false);

  // --- REFRESH HANDLER ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, [groupId, userId]);

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId, userId]);

  // --- COPY GROUP CODE ---
  const copyGroupCode = async () => {
      if (groupDetails?.group_code) {
          await Clipboard.setStringAsync(groupDetails.group_code);
          Alert.alert("Başarılı", "Grup kodu kopyalandı!");
      }
  };

  // --- ACTION HANDLERS ---
  const handleBlockUser = (targetMember) => {
    setActiveMenuMemberId(null);
    Alert.alert(
        "Kişiyi Engelle",
        "Kişiyi engellemek istediğinize emin misiniz? Karşılıklı olarak birbirinizin gönderdiği medyalara ulaşamayacaksınız.",
        [
            { text: "Hayır", style: "cancel" },
            { 
                text: "Evet", 
                style: "destructive",
                onPress: async () => {
                    try {
                        const response = await fetch(`${API_URL}/block-user`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                            body: JSON.stringify({ blocker_id: userId, blocked_id: targetMember.id })
                        });
                        if (response.ok) { Alert.alert("Başarılı", "Kişi engellendi."); fetchData(); } 
                        else { Alert.alert("Hata", "İşlem başarısız."); }
                    } catch (e) { console.error(e); }
                }
            }
        ]
    );
  };

  const handleUnblockUser = (targetMember) => {
    setActiveMenuMemberId(null);
    Alert.alert(
        "Engeli Kaldır",
        "Kişinin engelini kaldırmak istediğinize emin misiniz?",
        [
            { text: "Hayır", style: "cancel" },
            { 
                text: "Evet", 
                onPress: async () => {
                    try {
                        const response = await fetch(`${API_URL}/unblock-user`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                            body: JSON.stringify({ blocker_id: userId, blocked_id: targetMember.id })
                        });
                        if (response.ok) { Alert.alert("Başarılı", "Engel kaldırıldı."); fetchData(); } 
                        else { Alert.alert("Hata", "İşlem başarısız."); }
                    } catch (e) { console.error(e); }
                }
            }
        ]
    );
  };

  const handlePromoteUser = (targetMember) => {
      setActiveMenuMemberId(null);
      Alert.alert("Onay", "Yönetici yapmak istediğinizden emin misiniz?. Kendi yöneticiliğiniz iptal olacaktır.", [ { text: "Hayır", style: "cancel" }, { text: "Evet", onPress: () => performMemberAction(targetMember.id, 'promote') } ]);
  };

  const handleKickUser = (targetMember) => {
      setActiveMenuMemberId(null);
      Alert.alert("Onay", "Gruptan atmak istediğinize emin misiniz?", [ { text: "Hayır", style: "cancel" }, { text: "Evet", onPress: () => performMemberAction(targetMember.id, 'kick') } ]);
  };

  const performMemberAction = async (targetId, action) => {
      try {
          const response = await fetch(`${API_URL}/manage-member`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ admin_id: userId, group_id: groupId, target_user_id: targetId, action: action })
          });
          if(response.ok) { fetchData(); if(action === 'promote') Alert.alert("Başarılı", "Yöneticilik devredildi."); } 
          else { Alert.alert("Hata", "İşlem başarısız."); }
      } catch(e) { console.error(e); }
  };

  const handleRequestAction = async (targetId, action) => {
      if(!isAdmin) { Alert.alert("Yetkisiz", "Sadece yöneticiler isteklere cevap verebilir"); return; }
      try {
          const res = await fetch(`${API_URL}/manage-request`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ admin_id: userId, group_id: groupId, target_user_id: targetId, action })
          });
          if(res.ok) fetchData();
      } catch(e) { console.error(e); }
  };

  const handleToggleJoining = async (value) => {
      if(!isAdmin) { Alert.alert("Yetkisiz", "Sadece yöneticiler değiştirebilir"); return; }
      try {
          const res = await fetch(`${API_URL}/toggle-joining`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ user_id: userId, group_id: groupId, status: value ? 1 : 0 })
          });
          if(res.ok) setGroupDetails(prev => ({ ...prev, is_joining_active: value ? 1 : 0 }));
      } catch(e) { console.error(e); }
  };

  const handleLeaveGroup = () => {
      Alert.alert("Gruptan Ayrıl", "Ayrılmak istediğinize emin misiniz?", [
          { text: "Vazgeç", style: "cancel" },
          { 
              text: "Ayrıl", style: "destructive",
              onPress: async () => {
                  try {
                      const res = await fetch(`${API_URL}/leave-group`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                          body: JSON.stringify({ user_id: userId, group_id: groupId })
                      });
                      if(res.ok) router.replace({ pathname: '/home', params: { userId } });
                  } catch(e) { console.error(e); }
              }
          }
      ]);
  };

  const handleToggleNotifications = async () => {
    try {
        const res = await fetch(`${API_URL}/toggle-notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ user_id: userId, group_id: groupId })
        });
        const data = await res.json();
        if (res.ok) {
            // Update state based on new status from backend
            setNotificationsEnabled(data.notifications === 1);
        }
    } catch (e) { console.error(e); }
  };

  // --- DELETE GROUP (NEW) ---
  const handleDeleteGroup = () => {
      if (!isAdmin) return;
      Alert.alert(
          "Grubu Sil", 
          "Grubu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
          [
              { text: "Vazgeç", style: "cancel" },
              { 
                  text: "Evet, Sil", style: "destructive", 
                  onPress: async () => {
                      try {
                          const res = await fetch(`${API_URL}/delete-group?user_id=${userId}&group_id=${groupId}`, {
                              method: 'DELETE',
                              headers: { 'ngrok-skip-browser-warning': 'true' }
                          });
                          if (res.ok) {
                              Alert.alert("Başarılı", "Grup silindi.");
                              router.replace({ pathname: '/home', params: { userId } });
                          } else {
                              const err = await res.json();
                              Alert.alert("Hata", err.error || "Grup silinemedi.");
                          }
                      } catch (e) {
                          console.error(e);
                          Alert.alert("Hata", "Bağlantı hatası.");
                      }
                  }
              }
          ]
      );
  };

  // --- EDIT GROUP ---
  const handleEditGroupPress = () => {
    setEditName(groupDetails?.group_name || '');
    setEditDescription(groupDetails?.description || ''); // Initialize description
    setEditImage(null);
    setHasChanges(false);
    setEditModalVisible(true);
  };
  
  const onNameChange = (text) => { setEditName(text); checkChanges(text, editDescription, editImage); };
  const onDescriptionChange = (text) => { setEditDescription(text); checkChanges(editName, text, editImage); };

  const handleEditImageOptions = () => { Alert.alert("Fotoğraf Seç", "Seçenekler:", [{ text: "Kamera", onPress: openCamera }, { text: "Galeri", onPress: openGallery }, { text: "İptal", style: "cancel" }]); };
  const openCamera = async () => { const { status } = await ImagePicker.requestCameraPermissionsAsync(); if (status !== 'granted') return; const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 }); if (!result.canceled) { setEditImage(result.assets[0].uri); checkChanges(editName, editDescription, result.assets[0].uri); } };
  const openGallery = async () => { const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (status !== 'granted') return; const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 }); if (!result.canceled) { setEditImage(result.assets[0].uri); checkChanges(editName, editDescription, result.assets[0].uri); } };
  
  const checkChanges = (newName, newDesc, newImg) => { 
      const isNameDiff = newName.trim() !== groupDetails?.group_name;
      const isDescDiff = (newDesc || '') !== (groupDetails?.description || '');
      const isImgDiff = newImg !== null;
      setHasChanges(isNameDiff || isDescDiff || isImgDiff); 
  };
  
  const handleSaveChanges = async () => { 
      if (!hasChanges) return; setSaving(true); 
      try { 
          const formData = new FormData(); 
          formData.append('user_id', userId); 
          formData.append('group_id', groupId); 
          formData.append('group_name', editName); 
          formData.append('description', editDescription); // Send Description

          if (editImage) { 
              const filename = editImage.split('/').pop(); 
              const match = /\.(\w+)$/.exec(filename); const type = match ? `image/${match[1]}` : `image`; 
              formData.append('picture', { uri: editImage, name: filename, type }); 
          } 
          const response = await fetch(`${API_URL}/edit-group`, { method: 'POST', headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }, body: formData }); 
          if (response.ok) { setEditModalVisible(false); fetchData(); } 
      } catch (error) { Alert.alert("Hata", "Sunucu hatası."); } finally { setSaving(false); } 
  };

  const handleImagePress = (imageUrl) => { 
    if (imageUrl) { setSelectedImage({ uri: imageUrl }); setImageModalVisible(true); } 
  };

  // --- RENDER HELPERS ---
  const renderMemberItem = (item) => {
    const thumbUrl = item.thumbnail_url || item.profile_url;
    const fullImageUrl = item.profile_url || item.thumbnail_url;
    const memberPic = thumbUrl ? { uri: thumbUrl } : defaultUserImage;
    const isCurrentUser = item.id.toString() === userId.toString();
    const isMenuOpen = activeMenuMemberId === item.id;
    const isBlocked = item.is_blocked_by_me === 1;

    const toggleMenu = () => { if (isMenuOpen) setActiveMenuMemberId(null); else setActiveMenuMemberId(item.id); };

    return (
      <View key={item.id} style={[groupDetailsStyles.memberItem, isMenuOpen && { zIndex: 1000, elevation: 1000 }]}>
        <TouchableOpacity onPress={() => !isCurrentUser && fullImageUrl && handleImagePress(fullImageUrl)}>
            <Image source={memberPic} style={groupDetailsStyles.memberImage} />
        </TouchableOpacity>

        <View style={groupDetailsStyles.memberInfo}>
          <Text style={groupDetailsStyles.memberName}>
            {item.username} 
            {isCurrentUser && <Text style={groupDetailsStyles.youTag}> (Sen)</Text>}
            {isBlocked && <Text style={{color: 'red', fontSize: 14}}> (Engellendi)</Text>}
          </Text>
          {item.is_admin === 1 && <Text style={groupDetailsStyles.adminTag}>Yönetici</Text>}
        </View>

        {!isCurrentUser && (
            <View style={{ position: 'relative' }}>
                <TouchableOpacity onPress={toggleMenu} style={groupDetailsStyles.moreButton}>
                    <Ionicons name="ellipsis-vertical" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
                {isMenuOpen && (
                    <View style={groupDetailsStyles.popupMenu}>
                        {isBlocked ? (
                             <TouchableOpacity onPress={() => handleUnblockUser(item)} style={groupDetailsStyles.popupMenuItem}>
                                <Text style={groupDetailsStyles.popupMenuText}>Engeli Kaldır</Text>
                             </TouchableOpacity>
                        ) : (
                             <TouchableOpacity onPress={() => handleBlockUser(item)} style={groupDetailsStyles.popupMenuItem}>
                                <Text style={groupDetailsStyles.popupMenuText}>Kişiyi Engelle</Text>
                             </TouchableOpacity>
                        )}
                        {isAdmin && (
                            <>
                                <TouchableOpacity onPress={() => handleKickUser(item)} style={groupDetailsStyles.popupMenuItem}>
                                    <Text style={groupDetailsStyles.popupMenuText}>Gruptan At</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handlePromoteUser(item)} style={[groupDetailsStyles.popupMenuItem, { borderBottomWidth: 0 }]}>
                                    <Text style={groupDetailsStyles.popupMenuText}>Yönetici Yap</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}
            </View>
        )}
      </View>
    );
  };

  const renderRequestItem = (item) => {
      const pic = item.thumbnail_url ? { uri: item.thumbnail_url } : defaultUserImage;
      return (
          <View key={item.request_id} style={groupDetailsStyles.requestItem}>
              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                  <Image source={pic} style={groupDetailsStyles.requestImage} />
                  <Text style={groupDetailsStyles.requestName}>{item.username}</Text>
              </View>
              <View style={{flexDirection: 'row'}}>
                  <TouchableOpacity onPress={() => handleRequestAction(item.user_id, 'decline')} style={{marginRight: 15}}>
                      <Ionicons name="close-circle" size={32} color="red" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRequestAction(item.user_id, 'accept')}>
                      <Ionicons name="checkmark-circle" size={32} color="green" />
                  </TouchableOpacity>
              </View>
          </View>
      );
  };


  const groupThumb = groupDetails?.thumbnail_url || groupDetails?.picture_url;
  const groupOriginal = groupDetails?.picture_url;
  const isJoiningOpen = groupDetails?.is_joining_active === 1;

  return (
    <LinearGradient 
      colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
      style={groupDetailsStyles.container}
    >
      <StatusBar backgroundColor={isDark ? '#1a1a1a' : '#55efe1'} barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* --- HEADER --- */}
      <View style={groupDetailsStyles.headerContainer}>
        <TouchableOpacity style={groupDetailsStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={32} color='#fff' />
        </TouchableOpacity>
        {/* Show group name or empty if loading */}
        <Text style={groupDetailsStyles.headerTitle} numberOfLines={1}>{groupDetails?.group_name}</Text>
        {/* Right: Animated Media Button (No Border) */}
        <ScaleButton style={groupDetailsStyles.mediaButton} onPress={() => router.push({ pathname: '/media-gallery', params: { groupId, userId } })}>
            <Text style={{ color: isDark ? '#FFF' : '#000', fontWeight: 'bold' }}>Medya</Text>
        </ScaleButton>
      </View>

      {/* --- LOADING STATE CONTROL --- */}
      {loading ? (
          // Loading View: Centered white spinner on dark background
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={isDark? '#fff' : '#000'} />
          </View>
      ) : (
          // Content View: Your existing ScrollView content
          <ScrollView contentContainerStyle={{ paddingBottom: 150 }} 

            //--- ADDED: REFRESH CONTROL ---
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[isDark ? '#000' : '#000000']} // Android
                tintColor={isDark ? '#000' : '#000000'} // iOS
              />
            }
          >
            
            {/* 1. GROUP INFO */}
            <View style={groupDetailsStyles.groupInfoContainer}>
                <TouchableOpacity onPress={() => groupOriginal && handleImagePress(groupOriginal)}>
                    <Image source={groupThumb ? { uri: groupThumb } : defaultGroupImage} style={groupDetailsStyles.largeGroupImage} />
                </TouchableOpacity>
                <Text style={groupDetailsStyles.groupNameText}>{groupDetails?.group_name}</Text>
                
                {/* GROUP DESCRIPTION DISPLAY */}
                <Text style={groupDetailsStyles.groupDescriptionText}>
                    {groupDetails?.description || "Açıklama Yok"}
                </Text>
                
                <TouchableOpacity onPress={copyGroupCode} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#FFF' : "#000", marginRight: 5 }}>
                        {groupDetails?.group_code}
                    </Text>
                    <Ionicons name="copy-outline" size={18} color={isDark ? '#FFF' : "#000"} />
                </TouchableOpacity>

                {isAdmin && (
                    <ScaleButton onPress={handleEditGroupPress} style={groupDetailsStyles.editGroupButton}>
                        <Text style={groupDetailsStyles.editGroupText}>Grubu Düzenle</Text>
                    </ScaleButton>
                )}
            </View>

            {/* 2. MEMBERS LIST */}
            <Text style={groupDetailsStyles.membersTitle}>Üyeler</Text>
            <View>{members.map(member => renderMemberItem(member))}</View>

            {/* 3. REQUESTS */}
            <View style={groupDetailsStyles.sectionHeader}>
                <Text style={groupDetailsStyles.membersTitle}>İstekler</Text>
                <View style={groupDetailsStyles.toggleContainer}>
                    <View style={{alignItems: 'center', marginRight: 10}}>
                        <Text style={groupDetailsStyles.toggleLabel}>Gruba Alımlar</Text>
                        <Text style={[groupDetailsStyles.toggleStatus, {color: isJoiningOpen ? 'green' : 'red'}]}>
                            {isJoiningOpen ? 'Açık' : 'Kapalı'}
                        </Text>
                    </View>
                    <Switch trackColor={{ false: "#767577", true: "#81b0ff" }} thumbColor={isJoiningOpen ? "#007AFF" : "#f4f3f4"} onValueChange={handleToggleJoining} value={isJoiningOpen} />
                </View>
            </View>
            <View>{requests.length > 0 ? (requests.map(req => renderRequestItem(req))) : (<Text style={groupDetailsStyles.emptyText}>Şuan bir istek bulunmamaktadır</Text>)}</View>

            {/* 5. LEAVE & DELETE BUTTONS (Side by Side) */}
            {/* 5. ACTION BUTTONS (Notifications, Leave, Delete) */}
            <View style={groupDetailsStyles.bottomContainer}>
                
                {/* TOP ROW: Notification & Leave Buttons Side by Side */}
                <View style={groupDetailsStyles.rowButtons}>
                    
                    {/* NOTIFICATION BUTTON */}
                    <ScaleButton 
                        style={[
                            groupDetailsStyles.baseActionButton, 
                            notificationsEnabled ? groupDetailsStyles.btnNotificationOn : groupDetailsStyles.btnNotificationOff
                        ]} 
                        onPress={handleToggleNotifications}
                    >
                        <Ionicons 
                            name={notificationsEnabled ? "notifications" : "notifications-off"} 
                            size={20} 
                            color={notificationsEnabled ? '#000' : '#fff'} 
                        />
                        <Text style={[groupDetailsStyles.actionButtonText, { color: notificationsEnabled ? '#000' : '#fff' }]}>
                            {notificationsEnabled ? "Bildirimler Açık" : "Bildirimler Kapalı"}
                        </Text>
                    </ScaleButton>

                    {/* LEAVE GROUP BUTTON */}
                    {/* Using baseActionButton for shape, keeping manual black background to match existing style */}
                    <ScaleButton 
                        style={[groupDetailsStyles.baseActionButton, { backgroundColor: '#000000' }]} 
                        onPress={handleLeaveGroup}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#fff" />
                        <Text style={[groupDetailsStyles.textWhite, {color: '#fff'}]}>Ayrıl</Text>
                    </ScaleButton>
                </View>

                {/* BOTTOM ROW: Delete Group (Admin Only & Centered) */}
                {isAdmin && (
                    <ScaleButton 
                        style={groupDetailsStyles.deleteButtonCentered} 
                        onPress={handleDeleteGroup}
                    >
                        <Ionicons name="trash-outline" size={20} color="#fff" />
                        <Text style={[groupDetailsStyles.textWhite, {color: '#fff'}]}>Grubu Sil</Text>
                    </ScaleButton>
                )}
            </View>
          </ScrollView>
      )}

      {/* --- MODALS (Outside of Loading Check) --- */}
      <Modal visible={isImageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
        <View style={groupDetailsStyles.modalContainer}>
            <TouchableOpacity style={groupDetailsStyles.modalCloseButton} onPress={() => setImageModalVisible(false)}>
                <Ionicons name="chevron-back" size={32} color='#fff'/>
            </TouchableOpacity>
            {selectedImage && <Image source={selectedImage} style={groupDetailsStyles.fullScreenImage} />}
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModalVisible(false)}>
      <LinearGradient 
      colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
      style={groupDetailsStyles.container}
      >
      <StatusBar backgroundColor={isDark ? '#1a1a1a' : '#55efe1'} barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={groupDetailsStyles.editModalContainer}>
            <View style={groupDetailsStyles.editModalHeader}>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}><Ionicons name="chevron-back" size={30} color='#fff' /></TouchableOpacity>
                <Text style={groupDetailsStyles.editHeaderTitle}>Grubu Düzenle</Text>
                <ScaleButton
                    style={[
                        groupDetailsStyles.saveButton, 
                        (!hasChanges || saving) && groupDetailsStyles.saveButtonDisabled
                    ]}
                    onPress={handleSaveChanges} 
                    disabled={!hasChanges || saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={[
                            groupDetailsStyles.saveButtonText, 
                            hasChanges ? groupDetailsStyles.saveTextActive : groupDetailsStyles.saveTextInactive
                        ]}>
                            Kaydet
                        </Text>
                    )}
                </ScaleButton>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={groupDetailsStyles.editContent}>
                    <View style={groupDetailsStyles.editImageContainer}>
                        <TouchableOpacity onPress={() => editImage && handleImagePress(editImage)}>
                            <Image source={editImage ? { uri: editImage } : (groupThumb ? { uri: groupThumb } : defaultGroupImage)} style={groupDetailsStyles.editThumbnail} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleEditImageOptions}>
                            <Text style={groupDetailsStyles.changePhotoText}>Fotoğrafı Değiştir</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={groupDetailsStyles.inputContainer}>
                        <Text style={groupDetailsStyles.inputLabel}>Grup Adı:</Text>
                        <TextInput style={groupDetailsStyles.input} value={editName} onChangeText={onNameChange} placeholder="Grup adı" placeholderTextColor={colors.textSecondary} selectionColor={isDark ? "#ffffff" : "#000000"}/>
                    </View>
                    {/* DESCRIPTION EDIT FIELD */}
                    <View style={groupDetailsStyles.inputContainer}>
                        <Text style={groupDetailsStyles.inputLabel}>Açıklama (Maks: 255):</Text>
                        <TextInput 
                            style={groupDetailsStyles.input} 
                            value={editDescription} 
                            onChangeText={onDescriptionChange} 
                            placeholder="Grup açıklaması"
                            placeholderTextColor={colors.textSecondary}
                            maxLength={255}
                            multiline
                            selectionColor={isDark ? "#ffffff" : "#000000"}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
      </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}