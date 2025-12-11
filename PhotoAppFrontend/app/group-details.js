import React, { useState, useEffect } from 'react';
import { 
  View, Text, Image, TouchableOpacity, StatusBar, 
  ScrollView, ActivityIndicator, Modal, FlatList, TextInput, Alert, KeyboardAvoidingView, Platform, Switch, TouchableWithoutFeedback 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import API_URL from '../config';
import groupDetailsStyles from '../styles/groupDetailsStyles';

const defaultGroupImage = require('../assets/no-pic.jpg'); 
const defaultUserImage = require('../assets/no-pic.jpg');

export default function GroupDetailsScreen() {
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
  const [editImage, setEditImage] = useState(null); 
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Admin Action Modal States (White Popup)
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
      // 1. Group Details
      const groupRes = await fetch(`${API_URL}/get-group-details?group_id=${groupId}`, { headers: { 'ngrok-skip-browser-warning': 'true' }});
      const groupData = await groupRes.json();
      if (groupRes.ok) setGroupDetails(groupData);

      // 2. Members
      const membersRes = await fetch(`${API_URL}/get-group-members?group_id=${groupId}&current_user_id=${userId}`, { headers: { 'ngrok-skip-browser-warning': 'true' }});
      const membersData = await membersRes.json();
      if (membersRes.ok) {
        setMembers(membersData);
        // Check Admin Status
        const currentUser = membersData.find(m => m.id.toString() === userId.toString());
        setIsAdmin(currentUser?.is_admin === 1);
      }

      // 3. Requests
      const reqRes = await fetch(`${API_URL}/get-group-requests?group_id=${groupId}`, { headers: { 'ngrok-skip-browser-warning': 'true' }});
      if (reqRes.ok) setRequests(await reqRes.json());

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId, userId]);

  // --- HANDLERS: ADMIN ACTIONS (CUSTOM WHITE POPUP) ---
  const handleMemberPress = (member) => {
    // Logic: If user clicks themselves OR is not admin -> Just show image
    if (member.id.toString() === userId.toString() || !isAdmin) {
       if(member.profile_url) handleImagePress(member.profile_url);
       return;
    }

    // Logic: Admin clicks another member -> Open White Popup
    setSelectedMember(member);
    setActionModalVisible(true);
  };

  const onPromotePress = () => {
      setActionModalVisible(false); // Close menu
      // Confirmation Alert (Black system alert)
      Alert.alert(
          "Onay",
          "Yönetici yapmak istediğinizden emin misiniz?",
          [
              { text: "Hayır", style: "cancel" },
              { text: "Evet", onPress: () => performMemberAction(selectedMember.id, 'promote') }
          ]
      );
  };

  const onKickPress = () => {
      setActionModalVisible(false); // Close menu
      // Confirmation Alert
      Alert.alert(
          "Onay",
          "Gruptan atmak istediğinize emin misiniz?",
          [
              { text: "Hayır", style: "cancel" },
              { text: "Evet", onPress: () => performMemberAction(selectedMember.id, 'kick') }
          ]
      );
  };

  const performMemberAction = async (targetId, action) => {
      try {
          const response = await fetch(`${API_URL}/manage-member`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({
                  admin_id: userId,
                  group_id: groupId,
                  target_user_id: targetId,
                  action: action
              })
          });
          if(response.ok) {
              fetchData(); 
              if(action === 'promote') Alert.alert("Başarılı", "Yöneticilik devredildi.");
          } else {
              Alert.alert("Hata", "İşlem başarısız.");
          }
      } catch(e) { console.error(e); }
  };

  // --- HANDLERS: REQUESTS ---
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

  // --- HANDLERS: TOGGLE JOINING ---
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

  // --- HANDLERS: LEAVE GROUP ---
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

  // --- EDIT GROUP LOGIC ---
  const handleEditGroupPress = () => {
    setEditName(groupDetails?.group_name || '');
    setEditImage(null);
    setHasChanges(false);
    setEditModalVisible(true);
  };
  const onNameChange = (text) => { setEditName(text); checkChanges(text, editImage); };
  const handleEditImageOptions = () => { Alert.alert("Fotoğraf Seç", "Seçenekler:", [{ text: "Kamera", onPress: openCamera }, { text: "Galeri", onPress: openGallery }, { text: "İptal", style: "cancel" }]); };
  const openCamera = async () => { const { status } = await ImagePicker.requestCameraPermissionsAsync(); if (status !== 'granted') return; const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 }); if (!result.canceled) { setEditImage(result.assets[0].uri); checkChanges(editName, result.assets[0].uri); } };
  const openGallery = async () => { const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (status !== 'granted') return; const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 }); if (!result.canceled) { setEditImage(result.assets[0].uri); checkChanges(editName, result.assets[0].uri); } };
  const checkChanges = (newName, newImg) => { setHasChanges(newName.trim() !== groupDetails?.group_name || newImg !== null); };
  
  const handleSaveChanges = async () => { 
      if (!hasChanges) return; setSaving(true); 
      try { 
          const formData = new FormData(); 
          formData.append('user_id', userId); formData.append('group_id', groupId); formData.append('group_name', editName); 
          if (editImage) { 
              const filename = editImage.split('/').pop(); 
              const match = /\.(\w+)$/.exec(filename); const type = match ? `image/${match[1]}` : `image`; 
              formData.append('picture', { uri: editImage, name: filename, type }); 
          } 
          const response = await fetch(`${API_URL}/edit-group`, { method: 'POST', headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }, body: formData }); 
          if (response.ok) { setEditModalVisible(false); fetchData(); } 
      } catch (error) { Alert.alert("Hata", "Sunucu hatası."); } finally { setSaving(false); } 
  };

  // Full Screen Image
  const handleImagePress = (imageUrl) => { if (imageUrl) { setSelectedImage({ uri: imageUrl }); setImageModalVisible(true); } };

  // --- RENDER HELPERS ---
  const renderMemberItem = ({ item }) => {
    const thumbUrl = item.thumbnail_url || item.profile_url;
    const memberPic = thumbUrl ? { uri: thumbUrl } : defaultUserImage;
    const isCurrentUser = item.id.toString() === userId.toString();

    return (
      <TouchableOpacity 
        style={groupDetailsStyles.memberItem} 
        onPress={() => handleMemberPress(item)} 
      >
        <Image source={memberPic} style={groupDetailsStyles.memberImage} />
        <View style={groupDetailsStyles.memberInfo}>
          <Text style={groupDetailsStyles.memberName}>
            {item.username} {isCurrentUser && <Text style={groupDetailsStyles.youTag}>(Sen)</Text>}
          </Text>
          {item.is_admin === 1 && <Text style={groupDetailsStyles.adminTag}>Yönetici</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestItem = ({ item }) => {
      const thumbUrl = item.thumbnail_url;
      const pic = thumbUrl ? { uri: thumbUrl } : defaultUserImage;
      return (
          <View style={groupDetailsStyles.requestItem}>
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

  if (loading) return <ActivityIndicator size="large" color="#007AFF" style={{flex:1}} />;

  const groupThumb = groupDetails?.thumbnail_url || groupDetails?.picture_url;
  const groupOriginal = groupDetails?.picture_url;
  const isJoiningOpen = groupDetails?.is_joining_active === 1;

  return (
    <View style={groupDetailsStyles.container}>
      <StatusBar backgroundColor="#007AFF" barStyle="light-content" />

      {/* HEADER */}
      <View style={groupDetailsStyles.headerContainer}>
        <TouchableOpacity style={groupDetailsStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={32} color="#fff" />
        </TouchableOpacity>
        <Text style={groupDetailsStyles.headerTitle}>{groupDetails?.group_name}</Text>
        <TouchableOpacity style={groupDetailsStyles.mediaButton} onPress={() => router.push({ pathname: '/media-gallery', params: { groupId, userId } })}>
            <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Medya</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* GROUP INFO */}
        <View style={groupDetailsStyles.groupInfoContainer}>
            <TouchableOpacity onPress={() => groupOriginal && handleImagePress(groupOriginal)}>
                <Image source={groupThumb ? { uri: groupThumb } : defaultGroupImage} style={groupDetailsStyles.largeGroupImage} />
            </TouchableOpacity>
            <Text style={groupDetailsStyles.groupNameText}>{groupDetails?.group_name}</Text>
            {isAdmin && (
                <TouchableOpacity onPress={handleEditGroupPress} style={groupDetailsStyles.editGroupButton}>
                    <Text style={groupDetailsStyles.editGroupText}>Grubu Düzenle</Text>
                </TouchableOpacity>
            )}
        </View>

        {/* MEMBERS LIST */}
        <Text style={groupDetailsStyles.membersTitle}>Üyeler</Text>
        <FlatList
            data={members}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMemberItem}
            scrollEnabled={false} 
        />

        {/* REQUESTS & TOGGLE SECTION */}
        <View style={groupDetailsStyles.sectionHeader}>
            <Text style={groupDetailsStyles.membersTitle}>İstekler</Text>
            <View style={groupDetailsStyles.toggleContainer}>
                <View style={{alignItems: 'center', marginRight: 10}}>
                    <Text style={groupDetailsStyles.toggleLabel}>Gruba Alımlar</Text>
                    <Text style={[groupDetailsStyles.toggleStatus, {color: isJoiningOpen ? 'green' : 'red'}]}>
                        {isJoiningOpen ? 'Açık' : 'Kapalı'}
                    </Text>
                </View>
                <Switch 
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={isJoiningOpen ? "#007AFF" : "#f4f3f4"}
                    onValueChange={handleToggleJoining}
                    value={isJoiningOpen}
                />
            </View>
        </View>

        {requests.length > 0 ? (
            <FlatList
                data={requests}
                keyExtractor={(item) => item.request_id.toString()}
                renderItem={renderRequestItem}
                scrollEnabled={false}
            />
        ) : (
            <Text style={groupDetailsStyles.emptyText}>Şuan bir istek bulunmamaktadır</Text>
        )}

        {/* LEAVE BUTTON */}
        <TouchableOpacity style={groupDetailsStyles.leaveButton} onPress={handleLeaveGroup}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <Text style={groupDetailsStyles.leaveText}>Gruptan Ayrıl</Text>
        </TouchableOpacity>
        <View style={{height: 50}} /> 
      </ScrollView>

      {/* --- FULL SCREEN IMAGE MODAL --- */}
      <Modal visible={isImageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
        <View style={groupDetailsStyles.modalContainer}>
            <TouchableOpacity style={groupDetailsStyles.modalCloseButton} onPress={() => setImageModalVisible(false)}>
                <Ionicons name="chevron-back" size={32} color="#fff" />
            </TouchableOpacity>
            {selectedImage && <Image source={selectedImage} style={groupDetailsStyles.fullScreenImage} />}
        </View>
      </Modal>

      {/* --- EDIT GROUP MODAL --- */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModalVisible(false)}>
        <View style={groupDetailsStyles.editModalContainer}>
            <View style={groupDetailsStyles.editModalHeader}>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}><Ionicons name="chevron-back" size={30} color="#fff" /></TouchableOpacity>
                <Text style={groupDetailsStyles.editHeaderTitle}>Grubu Düzenle</Text>
                <TouchableOpacity onPress={handleSaveChanges} disabled={!hasChanges || saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={[groupDetailsStyles.saveText, hasChanges ? groupDetailsStyles.activeSave : groupDetailsStyles.inactiveSave]}>Kaydet</Text>}
                </TouchableOpacity>
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
                        <TextInput style={groupDetailsStyles.input} value={editName} onChangeText={onNameChange} placeholder="Grup adı" />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- ADMIN ACTION CUSTOM MODAL (White Popup) --- */}
      <Modal visible={actionModalVisible} transparent={true} animationType="fade" onRequestClose={() => setActionModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setActionModalVisible(false)}>
              <View style={groupDetailsStyles.actionModalOverlay}>
                  <TouchableWithoutFeedback>
                      <View style={groupDetailsStyles.actionModalContent}>
                          <Text style={groupDetailsStyles.actionModalTitle}>{selectedMember?.username}</Text>
                          
                          <TouchableOpacity style={groupDetailsStyles.actionButton} onPress={onPromotePress}>
                              <Text style={groupDetailsStyles.actionButtonText}>Yönetici Yap</Text>
                          </TouchableOpacity>
                          
                          <View style={groupDetailsStyles.separator} />
                          
                          <TouchableOpacity style={groupDetailsStyles.actionButton} onPress={onKickPress}>
                              <Text style={[groupDetailsStyles.actionButtonText, {color: 'red'}]}>Gruptan At</Text>
                          </TouchableOpacity>
                      </View>
                  </TouchableWithoutFeedback>
              </View>
          </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}