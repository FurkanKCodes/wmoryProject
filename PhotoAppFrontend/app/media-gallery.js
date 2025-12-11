import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, Image, TouchableOpacity, FlatList, Alert, 
  ActivityIndicator, StatusBar, Modal, Dimensions, ScrollView,
  TouchableWithoutFeedback 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// Using expo-av (Stable for SDK 52)
import { Video, ResizeMode } from 'expo-av'; 
import API_URL from '../config';
import mediaStyles from '../styles/mediaStyles';

const { width, height } = Dimensions.get('window');

export default function MediaGalleryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { groupId, userId } = params;

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Full Screen Viewer State
  const [isViewerVisible, setViewerVisible] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [areControlsVisible, setControlsVisible] = useState(true);
  
  // Current Media Index
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const fullScreenListRef = useRef(null);

  // --- FETCH PHOTOS ---
  const fetchPhotos = async () => {
    try {
      const response = await fetch(`${API_URL}/group-photos?group_id=${groupId}&user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  // --- UPLOAD HANDLER ---
  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("İzin Gerekli", "Galeri erişimi reddedildi.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, 
      allowsMultipleSelection: true, 
      quality: 0.7,
    });

    if (!result.canceled) {
      setUploading(true);
      for (const asset of result.assets) {
        await uploadSingleFile(asset);
      }
      setUploading(false);
      fetchPhotos(); 
    }
  };

  const uploadSingleFile = async (asset) => {
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('group_id', groupId);
      
      const filename = asset.uri.split('/').pop();
      let type = 'image/jpeg';
      // Basic type checking
      if (asset.type === 'video' || filename.endsWith('.mp4') || filename.endsWith('.mov')) {
          type = 'video/mp4';
      }
      
      formData.append('photo', {
        uri: asset.uri,
        name: filename,
        type: type,
      });

      await fetch(`${API_URL}/upload-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  // --- SAVE TO GALLERY (SIMULATION ONLY) ---
  const handleSaveToGallery = async () => {
    setShowOptions(false);
    Alert.alert("Başarılı", "Fotoğraf galeriye kaydedildi (Simülasyon).");
  };

  const handleReport = () => {
    Alert.alert("Raporlandı", "İçerik incelenmek üzere bildirildi.");
    setShowOptions(false);
  };

  // --- REMOVE / HIDE PHOTO LOGIC ---
  const handleRemove = () => {
    const currentMedia = photos[currentIndex];
    if (!currentMedia) return;

    setShowOptions(false); // Close menu

    // Check ownership
    const isOwner = currentMedia.uploader_id.toString() === userId.toString();

    if (isOwner) {
        // SCENARIO A: Owner
        Alert.alert(
            "Fotoğrafı Kaldır",
            "Bu fotoğrafı nasıl kaldırmak istersiniz?",
            [
                { 
                    text: "Vazgeç", 
                    style: "cancel" 
                },
                {
                    text: "Kendim için kaldır",
                    onPress: () => performHidePhoto(currentMedia.id)
                },
                {
                    text: "Herkes için kaldır",
                    style: "destructive",
                    onPress: () => performDeletePhoto(currentMedia.id)
                }
            ]
        );
    } else {
        // SCENARIO B: Not Owner
        Alert.alert(
            "Fotoğrafı Gizle",
            "Bu fotoğrafı galerinizden kaldırmak istiyor musunuz? (Diğer üyeler görmeye devam eder)",
            [
                { text: "Vazgeç", style: "cancel" },
                { 
                    text: "Evet, Kaldır", 
                    onPress: () => performHidePhoto(currentMedia.id) 
                }
            ]
        );
    }
  };

  // 1. Hide Photo
  const performHidePhoto = async (photoId) => {
    try {
        const response = await fetch(`${API_URL}/hide-photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, photo_id: photoId })
        });

        if (response.ok) {
            Alert.alert("Başarılı", "Fotoğraf gizlendi.");
            closeViewerAndRefresh();
        } else {
            Alert.alert("Hata", "İşlem başarısız.");
        }
    } catch (error) {
        console.error(error);
    }
  };

  // 2. Delete Photo
  const performDeletePhoto = async (photoId) => {
    try {
        const response = await fetch(`${API_URL}/delete-photo?user_id=${userId}&photo_id=${photoId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            Alert.alert("Başarılı", "Fotoğraf herkes için silindi.");
            closeViewerAndRefresh();
        } else {
            Alert.alert("Hata", "Silme işlemi başarısız.");
        }
    } catch (error) {
        console.error(error);
    }
  };

  const closeViewerAndRefresh = () => {
    setViewerVisible(false);
    fetchPhotos(); // Refresh grid
  };

  // --- TOGGLE CONTROLS ---
  const toggleControls = () => {
    setControlsVisible(!areControlsVisible);
    if (showOptions) setShowOptions(false); 
  };

  // --- RENDER GRID ITEM ---
  const renderGridItem = ({ item, index }) => (
    <TouchableOpacity 
      style={mediaStyles.mediaItem} 
      onPress={() => {
        setCurrentIndex(index);
        setViewerVisible(true);
        setControlsVisible(true);
      }}
    >
      {/* USE THUMBNAIL IF AVAILABLE */}
      <Image source={{ uri: item.thumbnail || item.url }} style={mediaStyles.imageThumbnail} />
      {item.type === 'video' && (
          <Ionicons name="play-circle" size={30} color="#fff" style={mediaStyles.playIconOverlay} />
      )}
    </TouchableOpacity>
  );

  // --- RENDER FULL SCREEN ITEM ---
  const renderFullScreenItem = ({ item }) => {
    return (
      <TouchableWithoutFeedback onPress={toggleControls}>
        <View style={mediaStyles.fullScreenContent}>
          {item.type === 'video' ? (
             <Video
                source={{ uri: item.url }} // Always use full quality URL here
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={true}
                useNativeControls
                style={mediaStyles.fullVideo}
            />
          ) : (
            <ScrollView
                style={{ width, height }}
                contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}
                maximumZoomScale={3}
                minimumZoomScale={1}
                centerContent={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
            >
               <TouchableWithoutFeedback onPress={toggleControls}>
                  <Image source={{ uri: item.url }} style={mediaStyles.fullImage} />
               </TouchableWithoutFeedback>
            </ScrollView>
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  };

  // --- VIEWABILITY CONFIG ---
  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index);
    }
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  return (
    <View style={mediaStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      {/* HEADER */}
      <View style={mediaStyles.headerContainer}>
        <TouchableOpacity style={mediaStyles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={32} color="#fff" />
        </TouchableOpacity>
        <Text style={mediaStyles.headerTitle}>Medya</Text>
        <TouchableOpacity style={mediaStyles.addButton} onPress={handleUpload}>
            {uploading ? <ActivityIndicator color="#fff" /> : <Ionicons name="add" size={32} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* GRID LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
            data={photos}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderGridItem}
            numColumns={4}
            contentContainerStyle={mediaStyles.gridContainer}
        />
      )}

      {/* FULL SCREEN VIEWER (MODAL) */}
      <Modal visible={isViewerVisible} transparent={true} animationType="fade">
        <View style={mediaStyles.fullScreenContainer}>
            
            {/* Top Controls */}
            {areControlsVisible && (
                <View style={mediaStyles.topControls}>
                    <TouchableOpacity style={mediaStyles.controlButton} onPress={() => setViewerVisible(false)}>
                        <Ionicons name="chevron-back" size={28} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={mediaStyles.controlButton} onPress={() => setShowOptions(!showOptions)}>
                        <Ionicons name="ellipsis-vertical" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Options Menu */}
            {showOptions && areControlsVisible && (
                <View style={mediaStyles.optionsMenu}>
                    <TouchableOpacity style={mediaStyles.optionItem} onPress={handleSaveToGallery}>
                        <Text style={mediaStyles.optionText}>Kaydet</Text>
                    </TouchableOpacity>
                    
                    {/* Remove Option */}
                    <TouchableOpacity style={mediaStyles.optionItem} onPress={handleRemove}>
                        <Text style={mediaStyles.optionText}>Kaldır</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[mediaStyles.optionItem, { borderBottomWidth: 0 }]} onPress={handleReport}>
                        <Text style={[mediaStyles.optionText, mediaStyles.reportText]}>Bildir</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* SWIPABLE LIST */}
            <FlatList
                ref={fullScreenListRef}
                data={photos}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderFullScreenItem}
                horizontal
                pagingEnabled 
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={currentIndex} 
                onViewableItemsChanged={onViewRef.current}
                viewabilityConfig={viewConfigRef.current}
                getItemLayout={(data, index) => (
                    {length: width, offset: width * index, index}
                )}
            />

            {/* Bottom Info */}
            {areControlsVisible && (
                <View style={mediaStyles.bottomInfo}>
                    <Text style={mediaStyles.infoText}>
                        {photos[currentIndex]?.uploaded_by}
                    </Text>
                    <Text style={mediaStyles.dateText}>
                        {photos[currentIndex] ? new Date(photos[currentIndex].date).toLocaleDateString() : ''}
                    </Text>
                </View>
            )}

        </View>
      </Modal>
    </View>
  );
}