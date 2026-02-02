import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, Image, TouchableOpacity, FlatList, Alert, 
  ActivityIndicator, StatusBar, Modal, TextInput, Dimensions,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Pressable,
  TouchableWithoutFeedback 
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons'; 
import * as ImagePicker from 'expo-image-picker'; 
// EKLENDİ: İnternet kontrolü için kütüphane
import NetInfo from '@react-native-community/netinfo';
import API_URL from '../config';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { getHomeStyles } from '../styles/homeStyles';

const defaultProfileImage = require('../assets/no-pic.jpg');
const { width } = Dimensions.get('window');

// --- HELPER COMPONENT: ANIMATED SCALE BUTTON ---
// --- HELPER COMPONENT: ANIMATED SCALE BUTTON ---
// --- HELPER COMPONENT: ANIMATED SCALE BUTTON ---
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

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const homeStyles = getHomeStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId; 

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  // Store the profile thumbnail URL here
  const [userProfilePic, setUserProfilePic] = useState(null); 
  
  // UI States (Modals & Tabs)
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('create'); 
  
  // Form States
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupImage, setNewGroupImage] = useState(null); 
  const [joinCode, setJoinCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Full Screen Image State
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [selectedGroupImage, setSelectedGroupImage] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  // Search Bar Animation Value
  const searchScale = useRef(new Animated.Value(1)).current;

  const animateSearch = (focused) => {
      Animated.spring(searchScale, {
          toValue: focused ? 1.05 : 1,
          useNativeDriver: true,
      }).start();
  };

  // --- INTERNET WARM-UP ---
  // Sayfa açıldığında NetInfo'yu bir kez tetikliyoruz ki ilk tıklamada hazır olsun.
  useEffect(() => {
    NetInfo.fetch(); 
  }, []);

  const checkInternetConnection = async () => {
      const state = await NetInfo.fetch();
      // Sadece kesin olarak "bağlı değil" (false) ise hata ver.
      if (state.isConnected === false) {
          Alert.alert("Bağlantı Hatası", "Lütfen bir internete bağlı olduğunuzdan emin olun.");
          return false;
      }
      return true;
  };

  // --- FETCH DATA (GROUPS & PROFILE) ---
  const fetchData = async () => {
    if (!userId) return;
    
    try {
      // 1. Fetch User Groups
      const groupsRes = await fetch(`${API_URL}/my-groups?user_id=${userId}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData);
      }

      // 2. Fetch User Profile (To get header thumbnail)
      const userRes = await fetch(`${API_URL}/get-user?user_id=${userId}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        // Prioritize thumbnail, fallback to original, else null
        setUserProfilePic(userData.thumbnail_url || userData.profile_url);
      }

    } catch (error) {
      console.error("Connection Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reload data when screen gains focus (e.g. returning from profile update)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [userId])
  );

  // --- IMAGE PICKER HANDLERS ---
  const handleGroupImageOptions = () => {
    Alert.alert(
      "Grup Fotoğrafı",
      "Seçenek Belirleyin:",
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
        Alert.alert("Error", "Camera permission needed.");
        return;
    }
    const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
    });
    if (!result.canceled) {
        setNewGroupImage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert("Error", "Gallery permission needed.");
        return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) {
        setNewGroupImage(result.assets[0].uri);
    }
  };

  // --- UI ACTION HANDLERS ---
  
  // Open Full Screen Image
  const handleImagePress = (originalUrl) => {
    if (originalUrl) {
        setSelectedGroupImage({ uri: originalUrl }); 
        setImageModalVisible(true);
    }
  };

  // --- KAMERA YÖNLENDİRME (GÜNCELLENDİ) ---
  const handleCameraAction = async (groupId) => {
      // 1. İNTERNET KONTROLÜ
      const hasInternet = await checkInternetConnection();
      if (!hasInternet) return; // İnternet yoksa durdur

      // ID kontrolü
      if (!groupId || !userId) {
          Alert.alert("Hata", "Grup veya kullanıcı bilgisi eksik.");
          return;
      }

      // Parametreleri router.push içine obje olarak ekliyoruz
      router.push({
          pathname: '/camera',
          params: { 
              groupId: groupId,
              userId: userId 
          }
      });
  };

  // --- CREATE GROUP LOGIC ---
  const handleCreateGroup = async () => {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) return;

    if (!newGroupName.trim()) {
      Alert.alert("Hata", "Lütfen bir grup adı giriniz.");
      return;
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('group_name', newGroupName);
      formData.append('description', newGroupDescription);

      if (newGroupImage) {
        const filename = newGroupImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('picture', {
          uri: newGroupImage,
          name: filename,
          type: type,
        });
      }

      const response = await fetch(`${API_URL}/create-group`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'multipart/form-data', 
            'ngrok-skip-browser-warning': 'true' 
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Başarılı", `Grup oluşturuldu!\nKod: ${data.group_code}`);
        setModalVisible(false);
        setNewGroupName('');
        setNewGroupImage(null);
        fetchData(); // Refresh list
      } else {
        Alert.alert("Hata", data.error || "Hata gerçekleşti.");
      }
    } catch (error) {
      Alert.alert("Hata", "Bağlantı hatası.");
    } finally {
      setActionLoading(false);
    }
  };

  // --- JOIN GROUP LOGIC ---
  const handleJoinGroup = async () => {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) return;

    if (!joinCode.trim()) {
      Alert.alert("Hata", "Lütfen geçerli bir kod giriniz.");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/join-group`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'ngrok-skip-browser-warning': 'true' 
        },
        body: JSON.stringify({ user_id: userId, group_code: joinCode }),
      });
      const data = await response.json();

      if (response.ok) {
        Alert.alert("Info", data.message);
        setModalVisible(false);
        setJoinCode('');
        fetchData(); 
      } else {
        Alert.alert("Uyarı!", data.message || "Hata.");
      }
    } catch (error) {
        Alert.alert("Hata", "Bağlantı hatası.");
    } finally {
        setActionLoading(false);
    }
  };

  // --- HEADER COMPONENT ---
  const CustomHeader = () => (
    <View style={homeStyles.headerContainer}>
      {/* Profile Image (Clickable) */}
      <TouchableOpacity onPress={() => router.push({ pathname: '/profile', params: { userId: userId } })}>
        <Image 
          source={userProfilePic ? { uri: userProfilePic } : defaultProfileImage} 
          style={homeStyles.profileImage} 
        />
      </TouchableOpacity>
      
      <Text style={homeStyles.headerTitle}>AllSent</Text>
      
      {/* Add Button */}
      <TouchableOpacity style={homeStyles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  // --- RENDER ITEM ---
  const renderGroupItem = ({ item }) => {
    const thumbUrl = item.thumbnail_url || item.picture_url;
    const originalUrl = item.picture_url;

    let sortedMembers = [];
    if (item.members) {
        const me = item.members.find(m => m.id.toString() === userId.toString());
        const others = item.members.filter(m => m.id.toString() !== userId.toString());
        others.sort((a, b) => a.username.localeCompare(b.username));
        if (me) sortedMembers.push({ ...me, displayName: "Siz" });
        sortedMembers = [...sortedMembers, ...others];
    }
    const formatName = (name) => (name === "Siz" || name.length <= 6) ? name : name.substring(0, 6) + '...';

    const goToDetails = () => router.push({ pathname: '/group-details', params: { groupId: item.id, userId: userId } });

    return (
      // OUTER CARD: Handles Animation & Navigation for Background/Empty Areas
      <ScaleButton 
        onPress={goToDetails} 
        style={homeStyles.groupCard}
        activeOpacity={1} 
      >
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            
            {/* LEFT CONTENT AREA */}
            <View style={{flex: 1}}>
                
                {/* HEADER (Image + Name) */}
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                    {/* Profile Image - Intercepts click for Full Screen Image */}
                    <TouchableOpacity onPress={() => handleImagePress(originalUrl)} activeOpacity={0.8} style={{marginRight: 15}}>
                        {thumbUrl ? (
                            <Image source={{ uri: thumbUrl }} style={homeStyles.groupImage} />
                        ) : (
                            <View style={homeStyles.groupIconPlaceholder}>
                                <Ionicons name="people" size={24} color={isDark ? "#000000" : "#000000"} />
                            </View>
                        )}
                    </TouchableOpacity>
                    
                    <Text style={homeStyles.groupName}>{item.group_name}</Text>
                </View>

                {/* MEMBERS LIST (Scrollable) */}
                <View>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    > 
                        {sortedMembers.map((member) => (
                            // WRAPPING MEMBER IN TOUCHABLE FIXES SCROLLING:
                            // It prevents the parent ScaleButton from locking the touch stream immediately,
                            // allowing the ScrollView to detect the drag.
                            <TouchableOpacity 
                                key={member.id} 
                                style={homeStyles.memberPill}
                                onPress={goToDetails}
                                activeOpacity={0.8}
                            >
                                <Text style={homeStyles.memberPillText}>
                                    {formatName(member.displayName || member.username)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* CAMERA BUTTON */}
            <ScaleButton 
                onPress={() => handleCameraAction(item.id)} 
                style={homeStyles.cameraButtonContainer}
            >
                <Ionicons name="camera-outline" size={30} color={isDark ? "#fff" : "#000"} />
            </ScaleButton>

        </View>
      </ScaleButton>
    );
  };

  // --- BUTTON STATE COLORS ---
  const getButtonColors = (isActive) => {
    if (isDark) {
        // Dark Mode: Active Black, Inactive #686868
        return { bg: isActive ? '#000000' : '#686868', text: '#fff' };
    } else {
        // Light Mode: Active #2c2c2c, Inactive #545454
        return { bg: isActive ? '#2c2c2c' : '#545454', text: '#fff' };
    }
  };

  const isCreateEnabled = newGroupName.length > 0;
  const isJoinEnabled = joinCode.length > 0;

  const createBtnStyle = getButtonColors(isCreateEnabled);
  const joinBtnStyle = getButtonColors(isJoinEnabled);

  if (!userId) {
    // Dynamic Color: White for Dark Mode, Black for Light Mode
    return (
      <ActivityIndicator 
          size="large" 
          color={isDark ? '#ffffff' : '#000000'} 
          style={{flex: 1, backgroundColor: isDark ? '#333' : '#fff'}} 
      />
    );
  }


  // --- HELPER: FILTER & SORT GROUPS ---
  // Filters groups starting with the query (case-insensitive) and sorts alphabetically
  const getFilteredGroups = () => {
    if (!groups) return [];
    
    // 1. Filter Logic: Matches "Starts With" pattern (SQL: LIKE 'query%')
    let filtered = groups.filter(group => 
      group.group_name.toLowerCase().startsWith(searchQuery.toLowerCase())
    );

    // 2. Sort Logic: Alphabetical (A-Z)
    filtered.sort((a, b) => a.group_name.localeCompare(b.group_name));

    return filtered;
  };

  const filteredData = getFilteredGroups();

  return (
    <LinearGradient 
      colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
      style={homeStyles.container}
    >
      <StatusBar backgroundColor={isDark ? '#1a1a1a' : '#55efe1'} barStyle={isDark ? "light-content" : "dark-content"} />
      {/* --- HEADER --- */}
      <View style={homeStyles.headerContainer}>
        {/* Profile Pic */}
        <ScaleButton onPress={() => router.push({ pathname: '/profile', params: { userId: userId } })}>
            <Image 
              source={userProfilePic ? { uri: userProfilePic } : defaultProfileImage} 
              style={homeStyles.profileImage} 
            />
        </ScaleButton>
        
        <Text style={homeStyles.headerTitle}>AllSent</Text>
        
        {/* Add Button */}
        <ScaleButton 
            style={homeStyles.addButton} 
            onPress={() => setModalVisible(true)}
        >
            {/* Icon Color: Light Mode #a9a9a9, Dark Mode #fff */}
            <Ionicons name="add" size={30} color={isDark ? '#fff' : '#000'} />
        </ScaleButton>
      </View>

      {/* --- SEARCH BAR SECTION --- */}
      <Animated.View style={[homeStyles.searchContainer, { transform: [{ scale: searchScale }] }]}>
        <Ionicons name="search" size={20} color={isDark ? '#989898' : '#e9e9e9'} style={homeStyles.searchIcon} />
        
        <TextInput
          style={homeStyles.searchInput}
          placeholder="Ara"
          placeholderTextColor={isDark ? '#989898' : '#e9e9e9'} 
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => animateSearch(true)}
          onBlur={() => animateSearch(false)}
          autoCapitalize="none"
          autoCorrect={false}
          // Fixed: Cursor color white
          selectionColor="#ffffff" 
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={homeStyles.clearButton}>
            <Ionicons name="close" size={14} color={isDark ? '#ffffff' : '#000000'} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* --- MODAL (CREATE/JOIN) --- */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        {/* Outer Touchable to detect outside taps */}
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={homeStyles.modalOverlay}
            >
            {/* Stop propagation so tapping the modal itself doesn't close it */}
            <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[homeStyles.modalContainer, { paddingVertical: 20 }]}>
                    
                    {/* REMOVED HEADER AREA AND CLOSE BUTTONS AS REQUESTED */}

                    {/* Tabs */}
                    <View style={homeStyles.tabContainer}>
                    <TouchableOpacity 
                        style={[homeStyles.tabButton, activeTab === 'create' && homeStyles.activeTab]}
                        onPress={() => setActiveTab('create')}
                    >
                        <Text style={[homeStyles.tabText, activeTab === 'create' && homeStyles.activeTabText]}>Grup Oluştur</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[homeStyles.tabButton, activeTab === 'join' && homeStyles.activeTab]}
                        onPress={() => setActiveTab('join')}
                    >
                        <Text style={[homeStyles.tabText, activeTab === 'join' && homeStyles.activeTabText]}>Gruba Katıl</Text>
                    </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                        <View style={homeStyles.modalContent}>
                        {activeTab === 'create' ? (
                            <View style={homeStyles.formContainer}>
                                <TouchableOpacity onPress={handleGroupImageOptions} style={homeStyles.imagePicker}>
                                    {newGroupImage ? (
                                        <Image source={{ uri: newGroupImage }} style={homeStyles.selectedImage} />
                                    ) : (
                                        <View style={homeStyles.defaultImagePlaceholder}>
                                            <Ionicons name="camera" size={30} color={isDark ? "#fff" : "#000"} />
                                        </View>
                                    )}
                                    <Text style={homeStyles.selectPhotoText}>Fotoğraf Seçin</Text>
                                </TouchableOpacity>

                                <Text style={homeStyles.label}>Grup Adı:</Text>
                                <TextInput 
                                    style={homeStyles.input}
                                    placeholder="Örn: Tatil Fotoğrafları"
                                    placeholderTextColor={isDark ? "#999" : "#ccc"}
                                    value={newGroupName}
                                    onChangeText={setNewGroupName}
                                    selectionColor={isDark ? "#ffffff" : "#000000"}
                                />

                                <Text style={homeStyles.label}>Açıklama: (isteğe bağlı)</Text>
                                <TextInput 
                                    style={homeStyles.input} 
                                    placeholder="Maks 255 karakter" 
                                    placeholderTextColor={isDark ? "#999" : "#ccc"}
                                    value={newGroupDescription} 
                                    onChangeText={setNewGroupDescription}
                                    maxLength={255}
                                    multiline
                                    selectionColor={isDark ? "#ffffff" : "#000000"}
                                />

                                <ScaleButton 
                                  wrapperStyle={{ width: '100%' }} // FIX: Restore full width
                                  style={[homeStyles.actionButton, { backgroundColor: createBtnStyle.bg }]} 
                                  onPress={handleCreateGroup}
                                  disabled={actionLoading || !isCreateEnabled}
                                >
                                  {actionLoading ? <ActivityIndicator color={isDark ? '#ffffff' : '#000000'} /> : <Text style={[homeStyles.actionButtonText, {color: createBtnStyle.text}]}>Oluştur</Text>}
                                </ScaleButton>
                            </View>
                        ) : (
                            <View style={homeStyles.formContainer}>
                                <Text style={homeStyles.label}>Grup Kodu:</Text>
                                <TextInput 
                                    style={homeStyles.input}
                                    placeholder="Kodu buraya girin"
                                    placeholderTextColor={isDark ? "#999" : "#ccc"}
                                    value={joinCode}
                                    onChangeText={setJoinCode}
                                    autoCapitalize="characters"
                                    selectionColor={isDark ? "#ffffff" : "#000000"}
                                />
                                <ScaleButton 
                                  wrapperStyle={{ width: '100%' }} // FIX: Restore full width
                                  style={[homeStyles.actionButton, { backgroundColor: joinBtnStyle.bg }]} 
                                  onPress={handleJoinGroup}
                                  disabled={actionLoading || !isJoinEnabled}
                                >
                                  {actionLoading ? <ActivityIndicator color={isDark ? '#ffffff' : '#000000'} /> : <Text style={[homeStyles.actionButtonText, {color: joinBtnStyle.text}]}>Katıl</Text>}
                                </ScaleButton>
                            </View>
                        )}
                        </View>
                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- FULL SCREEN IMAGE MODAL --- */}
      <Modal visible={isImageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
            {/* Updated Style for Alignment */}
            <TouchableOpacity 
                style={homeStyles.fullScreenBackButton} 
                onPress={() => setImageModalVisible(false)}
            >
                <Ionicons name="chevron-back" size={32} color="#fff" />
            </TouchableOpacity>
            
            {selectedGroupImage && (
                <Image 
                    source={selectedGroupImage} 
                    style={{ width: width, height: width, resizeMode: 'contain' }} 
                />
            )}
        </View>
      </Modal>

      {/* --- GROUP LIST --- */}
      <View style={homeStyles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={isDark ? '#ffffff' : '#000000'} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderGroupItem}
            contentContainerStyle={homeStyles.listContainer}
            ListEmptyComponent={
              searchQuery.length > 0 ? (
                // SEARCH NO RESULT STATE
                <View style={{ marginTop: 50 }}>
                   <Text style={homeStyles.noResultText}>Sonuç Yok</Text>
                </View>
              ) : (
                // DEFAULT EMPTY STATE (No groups at all)
                <View style={homeStyles.emptyContainer}>
                  <Ionicons name="images-outline" size={64} color="#ccc" />
                  <Text style={homeStyles.emptyText}>Grup bulunamadı.</Text>
                  <Text style={homeStyles.emptySubText}>Sağ üstteki + butonuna basarak başlayın.</Text>
                </View>
              )
            }
          />
        )}
      </View>
    </LinearGradient>
  );
}