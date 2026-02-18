import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  View, Text, Image, TouchableOpacity, FlatList, Alert, 
  ActivityIndicator, StatusBar, Modal, Dimensions, ScrollView,
  TouchableWithoutFeedback, SectionList, Animated, Pressable, RefreshControl
} from 'react-native';
import Reanimated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    runOnJS,
    FadeIn,
    FadeOut 
  } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av'; 
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'; 
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import API_URL from '../config';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { getMediaStyles } from '../styles/mediaStyles';
import { saveDataToCache, loadDataFromCache, CACHE_KEYS } from '../utils/cacheHelper';

const { width, height } = Dimensions.get('window');
const defaultUserImage = require('../assets/no-pic.jpg'); 

const COLUMN_OPTIONS = [2, 3, 4, 6, 8];

// --- ANDROID & IOS COMPATIBLE ZOOM COMPONENT (FIXED SCROLL) ---
const ZoomableImage = ({ uri, onPress, onZoomChange }) => {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    // YENİ: Zoom durumunu takip eden state
    // Bu state sayesinde resim zoomlanmamışken Pan gesture'ı devre dışı bırakacağız.
    const [isZoomed, setIsZoomed] = useState(false);
  
    // Pinch Handler (Zoom In/Out)
    const pinchGesture = Gesture.Pinch()
      .onStart(() => {
        savedScale.value = scale.value;
      })
      .onUpdate((e) => {
        scale.value = savedScale.value * e.scale;
      })
      .onEnd(() => {
        // Eğer scale 1'in altına indiyse veya çok az büyüdüyse (1.1) normale döndür
        if (scale.value < 1.1) {
          scale.value = withTiming(1);
          savedScale.value = 1;
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          
          // State güncellemeleri (JS thread'inde çalıştırılır)
          runOnJS(setIsZoomed)(false);  // Pan gesture'ı kapat
          runOnJS(onZoomChange)(true);  // FlatList kaydırmasını aç
        } else {
          savedScale.value = scale.value;
          
          runOnJS(setIsZoomed)(true);   // Pan gesture'ı aç
          runOnJS(onZoomChange)(false); // FlatList kaydırmasını kapat
        }
      });
  
    // Pan Handler (Move image when zoomed in)
    const panGesture = Gesture.Pan()
      .enabled(isZoomed) // KRİTİK NOKTA: Sadece zoom yapıldıysa çalışır!
      .averageTouches(true)
      .onStart(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
      })
      .onUpdate((e) => {
          if (scale.value > 1) {
              translateX.value = savedTranslateX.value + e.translationX;
              translateY.value = savedTranslateY.value + e.translationY;
          }
      });
  
    // Double Tap (Quick Zoom Reset)
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        if (scale.value > 1) {
          // Reset to 1x
          scale.value = withTiming(1);
          savedScale.value = 1;
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);

          runOnJS(setIsZoomed)(false);
          runOnJS(onZoomChange)(true);
        } else {
          // Quick zoom to 2x
          scale.value = withTiming(2);
          savedScale.value = 2;

          runOnJS(setIsZoomed)(true);
          runOnJS(onZoomChange)(false);
        }
      });
  
    // Single Tap (Toggle Controls)
    const singleTap = Gesture.Tap()
      .onEnd(() => {
        runOnJS(onPress)();
      });
  
    const composed = Gesture.Simultaneous(pinchGesture, panGesture);
    const taps = Gesture.Exclusive(doubleTap, singleTap);
    
    const gesture = Gesture.Simultaneous(composed, taps);
  
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ]
    }));
  
    return (
      <GestureDetector gesture={gesture}>
        <Reanimated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Reanimated.Image 
            source={{ uri }} 
            style={[{ width: width, height: height, resizeMode: 'contain' }, animatedStyle]} 
          />
        </Reanimated.View>
      </GestureDetector>
    );
};

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

export default function MediaGalleryScreen() {
    // --- THEME HOOK ---
  const { colors, isDark } = useTheme();
  const mediaStyles = getMediaStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { groupId, userId } = params;

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // --- FILTER STATES ---
  const [members, setMembers] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]); // Aktif filtre
  const [tempSelectedMemberIds, setTempSelectedMemberIds] = useState([]); // Modal içindeki geçici seçim

  // --- DYNAMIC COLUMNS STATE ---
  const [numColumns, setNumColumns] = useState(4); // Varsayılan 4

  // --- SCROLL BUBBLE STATES ---
  const [scrollDate, setScrollDate] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef(null);

  // Full Screen Viewer State
  const [isViewerVisible, setViewerVisible] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // ANIMATION STATE
  const [showControls, setShowControls] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current; // Opacity value 1 (visible)

  const [scrollEnabled, setScrollEnabled] = useState(true); // Control FlatList scrolling during zoom

  // Toggle Controls with Smooth Fade
  const toggleControls = () => {
    // 1. Priority: If options menu is open, just close it. Don't hide the UI.
    if (showOptions) {
        setShowOptions(false);
        return;
    }

    // 2. Priority: If report modal is active, do nothing (it handles its own taps).
    if (showReportModal) {
        return;
    }
    
    // 3. Normal Behavior: Toggle header/footer visibility
    const toValue = showControls ? 0 : 1;
    
    Animated.timing(fadeAnim, {
      toValue,
      duration: 300, 
      useNativeDriver: true,
    }).start();

    setShowControls(!showControls);
  };
  
  // SELECTION MODE STATE
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkOptions, setShowBulkOptions] = useState(false);

  // Current Media Index
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const fullScreenListRef = useRef(null);

  // --- PINCH GESTURE LOGIC ---
  const isZoomProcessed = useRef(false);
  
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      isZoomProcessed.current = false;
    })
    .onUpdate((e) => {
      if (isZoomProcessed.current) return;

      const scale = e.scale;
      const currentIndex = COLUMN_OPTIONS.indexOf(numColumns);

      // ZOOM IN (Büyütme -> Sütun Sayısı Azalır)
      if (scale > 1.5 && currentIndex > 0) {
         try {
             setNumColumns(COLUMN_OPTIONS[currentIndex - 1]);
             isZoomProcessed.current = true;
         } catch(err) {}
      }

      // ZOOM OUT (Küçültme -> Sütun Sayısı Artar)
      if (scale < 0.6 && currentIndex < COLUMN_OPTIONS.length - 1) {
         try {
             setNumColumns(COLUMN_OPTIONS[currentIndex + 1]);
             isZoomProcessed.current = true;
         } catch(err) {}
      }
    })
    .runOnJS(true);

  // --- INTERNET CHECK LOGIC ---
  useEffect(() => {
    NetInfo.fetch(); 
  }, []);

  const checkInternetConnection = async () => {
      const state = await NetInfo.fetch();
      if (state.isConnected === false) {
          Alert.alert("Bağlantı Hatası", "Lütfen bir internete bağlı olduğunuzdan emin olun.");
          return false;
      }
      return true;
  };

  // --- HELPER: UPDATE STATE FROM DATA ---
  const updateMediaState = (photosData, membersData) => {
    if (photosData) {
        setPhotos(photosData);
    }

    if (membersData) {
        // Sort members alphabetically (Same as original logic)
        const sortedMembers = [...membersData].sort((a, b) => a.username.localeCompare(b.username));
        setMembers(sortedMembers);
        
        // Default: Select all members for filtering
        // We check if we already have a selection to avoid resetting user's active filter during background refresh
        if (selectedMemberIds.length === 0) {
            const allIds = sortedMembers.map(m => m.id.toString());
            setSelectedMemberIds(allIds);
            setTempSelectedMemberIds(allIds);
        }
    }
};

// --- FETCH DATA (CACHE FIRST STRATEGY) ---
const fetchData = async () => {
  // 1. Define Cache Key
  const cacheKey = CACHE_KEYS.GROUP_PHOTOS(groupId);

  // 2. CACHE LAYER: Try to load from device storage first
  try {
      const cachedData = await loadDataFromCache(cacheKey);
      if (cachedData) {
          // cachedData structure: { photos: [...], members: [...] }
          updateMediaState(cachedData.photos, cachedData.members);
          setLoading(false); 
      }
  } catch (e) {
      console.log("Cache load error:", e);
  }

  // 3. NETWORK LAYER: Fetch fresh data from API
  try {
    const [photoRes, memberRes] = await Promise.all([
        fetch(`${API_URL}/group-photos?group_id=${groupId}&user_id=${userId}`, { headers: { 'ngrok-skip-browser-warning': 'true' }}),
        fetch(`${API_URL}/get-group-members?group_id=${groupId}&current_user_id=${userId}`, { headers: { 'ngrok-skip-browser-warning': 'true' }})
    ]);

    const freshData = {};

    if (photoRes.ok) {
      freshData.photos = await photoRes.json();
    }

    if (memberRes.ok) {
        freshData.members = await memberRes.json();
    }

    // Update UI with fresh data
    updateMediaState(freshData.photos, freshData.members);

    // Save combined data to cache
    if (freshData.photos || freshData.members) {
         // If one failed, fallback to existing cache or empty array
         const dataToSave = {
             photos: freshData.photos || (cachedData ? cachedData.photos : []),
             members: freshData.members || (cachedData ? cachedData.members : [])
         };
         await saveDataToCache(cacheKey, dataToSave);
    }

  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    setLoading(false);
    if (typeof setRefreshing === 'function') setRefreshing(false);
  }
};
  // --- REFRESH STATE ---
  const [refreshing, setRefreshing] = useState(false);

  // --- REFRESH HANDLER ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Verileri ve filtreleri yeniden çek
      await fetchData();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // --- TIMELINE GROUPING LOGIC (FİLTRELİ) ---
  const groupedPhotos = useMemo(() => {
    // 1. ADIM: Filtreleme
    const filteredPhotos = photos.filter(p => selectedMemberIds.includes(p.uploader_id.toString()));

    if (!filteredPhotos || filteredPhotos.length === 0) return [];

    const sections = [];
    const now = new Date();
    
    const buckets = {
        today: [],
        thisWeek: [],
        thisMonth: [],
        thisYear: [],
        older: {} 
    };

    filteredPhotos.forEach(photo => {
        const date = new Date(photo.date);
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (date.toDateString() === now.toDateString()) {
            buckets.today.push(photo);
        } else if (diffDays <= 7) {
            buckets.thisWeek.push(photo);
        } else if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
            buckets.thisMonth.push(photo);
        } else if (date.getFullYear() === now.getFullYear()) {
            buckets.thisYear.push(photo);
        } else {
            const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            if (!buckets.older[key]) buckets.older[key] = [];
            buckets.older[key].push(photo);
        }
    });

    // Chunk array based on CURRENT numColumns state
    const chunkArray = (array, size) => {
        const results = [];
        for (let i = 0; i < array.length; i += size) {
            results.push(array.slice(i, i + size));
        }
        return results;
    };

    if (buckets.today.length > 0) {
        sections.push({ title: 'Bugün', data: chunkArray(buckets.today, numColumns) });
    }
    if (buckets.thisWeek.length > 0) {
        sections.push({ title: 'Bu Hafta', data: chunkArray(buckets.thisWeek, numColumns) });
    }
    if (buckets.thisMonth.length > 0) {
        sections.push({ title: 'Bu Ay', data: chunkArray(buckets.thisMonth, numColumns) });
    }
    if (buckets.thisYear.length > 0) {
        sections.push({ title: 'Bu Yıl', data: chunkArray(buckets.thisYear, numColumns) });
    }
    
    Object.keys(buckets.older).forEach(key => {
        sections.push({ title: key, data: chunkArray(buckets.older[key], numColumns) });
    });

    return sections;
  }, [photos, numColumns, selectedMemberIds]);

  // --- FILTER LOGIC ---
  const handleOpenFilter = () => {
      setTempSelectedMemberIds(selectedMemberIds); 
      setFilterModalVisible(true);
  };

  const toggleMemberFilter = (id) => {
      const idStr = id.toString();
      
      // "Herkes" seçeneği
      if (id === 'all') {
          const allIds = members.map(m => m.id.toString());
          if (tempSelectedMemberIds.length === members.length) {
              return; 
          } else {
              setTempSelectedMemberIds(allIds);
          }
          return;
      }

      // Tekil Seçim
      if (tempSelectedMemberIds.includes(idStr)) {
          if (tempSelectedMemberIds.length === 1) {
              Alert.alert("Uyarı", "En az bir kişi seçili olmalıdır.");
              return;
          }
          setTempSelectedMemberIds(tempSelectedMemberIds.filter(mid => mid !== idStr));
      } else {
          setTempSelectedMemberIds([...tempSelectedMemberIds, idStr]);
      }
  };

  const applyFilter = () => {
      setSelectedMemberIds(tempSelectedMemberIds);
      setFilterModalVisible(false);
  };

  const isAllSelected = tempSelectedMemberIds.length === members.length;

  // --- SCROLL HANDLERS ---
  const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
  };

  const handleScrollEnd = () => {
      scrollTimeout.current = setTimeout(() => {
          setIsScrolling(false);
      }, 1000); 
  };

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
      if (viewableItems.length > 0) {
          const firstItem = viewableItems[0];
          if (firstItem.section && firstItem.section.title) {
              setScrollDate(firstItem.section.title);
          }
      }
  }).current;


  // --- UPLOAD HANDLER ---
  const handleUpload = async () => {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("İzin Gerekli", "Galeri erişimi reddedildi.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, 
      allowsMultipleSelection: true, 
      quality: 1.0, 
    });

    if (!result.canceled) {
      setUploading(true);
      for (const asset of result.assets) {
        await uploadSingleFile(asset);
      }
      setUploading(false);
      fetchData(); 
    }
  };

  const uploadSingleFile = async (asset) => {
    try {
      const filename = asset.uri.split('/').pop();
      let type = 'image/jpeg';
      
      if (asset.type === 'video' || filename.endsWith('.mp4') || filename.endsWith('.mov')) {
          type = 'video/mp4';
      }

      // Step 1: Get Presigned URL from Backend
      const presignRes = await fetch(`${API_URL}/generate-upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_type: type })
      });
      
      if (!presignRes.ok) throw new Error("Could not get upload URL");
      const { upload_url, object_key } = await presignRes.json();

      // Step 2: Convert local file to Blob and Upload DIRECTLY to AWS S3
      const fileData = await fetch(asset.uri);
      const blob = await fileData.blob();

      const s3Res = await fetch(upload_url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': type }
      });

      if (!s3Res.ok) throw new Error("S3 Upload Failed");

      // Step 3: Confirm with Backend to save in MySQL
      const fileSize = asset.fileSize || blob.size || 0;
      const confirmRes = await fetch(`${API_URL}/confirm-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              user_id: userId,
              group_id: groupId,
              file_name: object_key,
              file_size: fileSize
          })
      });

      if (confirmRes.status === 403) {
          const data = await confirmRes.json();
          if (data.error && data.error.includes('LIMIT_EXCEEDED')) {
              Alert.alert("Demo!", "Günlük sınır aşıldı.");
          }
          return false;
      }

      return true; 

    } catch (error) {
      console.error("Direct S3 Upload failed:", error);
      return true; // Return true to continue queue even if one fails
    }
  };

  // --- SELECTION LOGIC ---
  const toggleSelectionMode = () => {
      setSelectionMode(!isSelectionMode);
      setSelectedIds([]);
      setShowOptions(false); 
  };

  const toggleSelection = (id) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(selectedIds.filter(item => item !== id));
      } else {
          if (selectedIds.length >= 30) {
              Alert.alert("Uyarı", "Maksimum 30 tane seçebilirsiniz.");
              return;
          }
          setSelectedIds([...selectedIds, id]);
      }
  };

  // --- GÜNCELLENEN FONKSİYON: GALERİYE KAYDETME (METADATA SIFIRLAMA) ---
  const saveFileToGallery = async (remoteUrl) => {
    // 1. İzin İste
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert("İzin Gerekli", "Galeriye kaydetmek için medya erişim izni vermelisiniz.");
        return false;
    }

    try {
        const extension = remoteUrl.split('.').pop();
        // Benzersiz bir dosya adı oluşturuyoruz
        const tempFilename = `temp_dl_${Date.now()}.${extension}`;
        const tempUri = FileSystem.documentDirectory + tempFilename;

        // 2. Dosyayı indir
        const { uri: downloadedUri } = await FileSystem.downloadAsync(remoteUrl, tempUri);
        
        let finalUri = downloadedUri;

        // 3. Metadata Sıfırlama (ImageManipulator Hilesi)
        // Bu işlem dosyanın yeni bir kopyasını oluşturur, böylece "Oluşturulma Tarihi" şu an olur.
        // Sadece resim formatları için geçerlidir.
        const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(extension.toLowerCase());

        if (isImage) {
            const manipulatedResult = await ImageManipulator.manipulateAsync(
                downloadedUri,
                [], // Hiçbir düzenleme yapmadan kopyala
                { format: ImageManipulator.SaveFormat.JPEG, compress: 1.0 } // %100 Kalite
            );
            finalUri = manipulatedResult.uri;
        }

        // 4. Galeriye Kaydet
        await MediaLibrary.createAssetAsync(finalUri);
        
        // 5. Temizlik
        // Oluşturduğumuz geçici dosyaları siliyoruz
        if (finalUri !== downloadedUri) {
            // Manipülasyon sonucu oluşan dosyayı sil (MediaLibrary zaten kopyasını aldı)
             await FileSystem.deleteAsync(downloadedUri, { idempotent: true });
        } else {
             await FileSystem.deleteAsync(downloadedUri, { idempotent: true });
        }
        
        return true;
    } catch (e) {
        console.error("Save Error:", e);
        return false;
    }
  };

  const handleBulkActionPress = () => {
    if (selectedIds.length === 0) return;
    setShowBulkOptions(!showBulkOptions);
  };

  // --- YENİ EKLENEN: TOPLU KAYDETME ---
  const handleBulkSave = async () => {
      Alert.alert("İşlem Başladı", "Seçilen medyalar galeriye kaydediliyor...");
      
      let successCount = 0;
      for (const id of selectedIds) {
          const photo = photos.find(p => p.id === id);
          if (photo) {
              // Yüksek kaliteli URL (original url) kullanılır
              const result = await saveFileToGallery(photo.url); 
              if (result) successCount++;
          }
      }

      Alert.alert("Tamamlandı", `${successCount} adet medya galeriye başarıyla kaydedildi.`);
      toggleSelectionMode();
  };

  const handleBulkRemoveConfirmation = () => {
      const selectedMedia = photos.filter(p => selectedIds.includes(p.id));
      const allMine = selectedMedia.every(p => p.uploader_id.toString() === userId.toString());

      if (allMine) {
          Alert.alert("Seçilenleri Kaldır", "Seçilen medyaları nasıl kaldırmak istersiniz?", [
              { text: "Vazgeç", style: "cancel" },
              { text: "Kendim için kaldır", onPress: () => processBulkRemove('hide') },
              { text: "Herkes için kaldır", style: 'destructive', onPress: () => processBulkRemove('delete') }
          ]);
      } else {
          Alert.alert("Seçilenleri Gizle", "Seçilen medyaları galerinizden kaldırmak istiyor musunuz?", [
              { text: "Vazgeç", style: "cancel" },
              { text: "Evet, Kaldır", onPress: () => processBulkRemove('hide') }
          ]);
      }
  };

  const processBulkRemove = async (type) => {
      const hasInternet = await checkInternetConnection();
      if (!hasInternet) return;

      setLoading(true);
      try {
          const response = await fetch(`${API_URL}/bulk-action`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true' 
              },
              body: JSON.stringify({
                  user_id: userId,
                  photo_ids: selectedIds,
                  action_type: type 
              })
          });

          if (response.ok) {
              Alert.alert("Başarılı", "İşlem tamamlandı.");
              fetchData();
          } else {
              const err = await response.json();
              Alert.alert("Hata", err.error || "İşlem başarısız.");
          }
      } catch (error) {
          console.error(error);
          Alert.alert("Hata", "Sunucu hatası.");
      } finally {
          setLoading(false);
          toggleSelectionMode();
      }
  };

  // --- REPORT & SINGLE ACTIONS ---
  const handleReport = () => {
    // Close options menu and open custom report modal
    setShowOptions(false); 
    setShowReportModal(true);
  };

  const submitReport = async (photoId, reason) => {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) return;

    try {
        const response = await fetch(`${API_URL}/report-content`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true' 
            },
            body: JSON.stringify({
                reporter_id: userId,
                photo_id: photoId,
                reason: reason
            })
        });

        if (response.ok) {
            Alert.alert("Teşekkürler", "Bildiriminiz alındı.");
            setShowOptions(false);
        } else {
            Alert.alert("Hata", "Bildirim gönderilemedi.");
        }
    } catch (error) {
        console.error("Report error:", error);
        Alert.alert("Hata", "Sunucu hatası.");
    }
  };

  // --- YENİ EKLENEN: TEKLİ KAYDETME ---
  const handleSaveToGallery = async () => {
    setShowOptions(false); // Menüyü kapat
    const currentMedia = photos[currentIndex];
    
    if (!currentMedia) return;

    // İşlem başladığını hissettirmek için basit bir uyarı veya direkt işlem
    const success = await saveFileToGallery(currentMedia.url);

    if (success) {
        Alert.alert("Başarılı", "Medya galeriye kaydedildi.");
    } else {
        Alert.alert("Hata", "Kaydetme işlemi başarısız oldu.");
    }
  };

  const handleRemove = () => {
    const currentMedia = photos[currentIndex];
    if (!currentMedia) return;
    setShowOptions(false); 

    const isOwner = currentMedia.uploader_id.toString() === userId.toString();

    if (isOwner) {
        Alert.alert(
            "Medyayı Kaldır",
            "Seçenekler:",
            [
                { text: "Vazgeç", style: "cancel" },
                { text: "Kendim için kaldır", onPress: () => performHidePhoto(currentMedia.id) },
                { text: "Herkes için kaldır", style: 'destructive', onPress: () => performDeletePhoto(currentMedia.id) }
            ]
        );
    } else {
        Alert.alert(
            "Medyayı Gizle",
            "Bu medyayı kaldırmak istiyor musunuz?",
            [
                { text: "Vazgeç", style: "cancel" },
                { text: "Evet, Kaldır", onPress: () => performHidePhoto(currentMedia.id) }
            ]
        );
    }
  };

  const handlePostDeleteNavigation = (deletedId) => {
      const updatedPhotos = photos.filter(p => p.id !== deletedId);
      setPhotos(updatedPhotos);
      if (updatedPhotos.length === 0) {
          setViewerVisible(false);
      } else {
          if (currentIndex >= updatedPhotos.length) {
              setCurrentIndex(updatedPhotos.length - 1);
          }
      }
  };

  const performHidePhoto = async (photoId) => {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) return;

    try {
        // We use the '/bulk-action' endpoint logic even for a single item.
        // Backend expects 'photo_ids' (array) and 'action_type'.
        const response = await fetch(`${API_URL}/bulk-action`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true' 
            },
            body: JSON.stringify({ 
                user_id: userId, 
                photo_ids: [photoId], // Wrap the single ID in an array
                action_type: 'hide'   // Explicitly send the action type
            })
        });
        
        if (response.ok) {
            // Update UI locally without refreshing
            handlePostDeleteNavigation(photoId); 
        } else {
            const err = await response.json();
            Alert.alert("Hata", err.error || "İşlem başarısız.");
        }
    } catch (error) { 
        console.error(error); 
        Alert.alert("Hata", "Sunucu hatası.");
    }
  };

  const performDeletePhoto = async (photoId) => {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) return;

    try {
        const response = await fetch(`${API_URL}/delete-photo?user_id=${userId}&photo_id=${photoId}`, {
            method: 'DELETE',
        });
        if (response.ok) {
            handlePostDeleteNavigation(photoId);
        }
    } catch (error) { console.error(error); }
  };

  // --- RENDERERS ---
  
  const renderSectionHeader = ({ section: { title } }) => (
    <View style={mediaStyles.sectionHeaderContainer}>
        <Text style={mediaStyles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderRow = ({ item }) => {
      return (
          <View style={mediaStyles.rowContainer}>
              {item.map((photo) => {
                  const isSelected = selectedIds.includes(photo.id);
                  const itemWidth = width / numColumns;
                  
                  return (
                    <TouchableOpacity 
                        key={photo.id}
                        style={[mediaStyles.mediaItem, isSelected && mediaStyles.mediaItemSelected, { width: itemWidth, height: itemWidth }]} 
                        onPress={() => {
                            if (isSelectionMode) {
                                toggleSelection(photo.id);
                            } else {
                                const globalIndex = photos.findIndex(p => p.id === photo.id);
                                setCurrentIndex(globalIndex !== -1 ? globalIndex : 0);
                                setViewerVisible(true);
                                setShowControls(true);
                            }
                        }}
                    >
                        <Image source={{ uri: photo.thumbnail || photo.url }} style={mediaStyles.imageThumbnail} />
                        {photo.type === 'video' && (
                            <Ionicons name="play-circle" size={30} color="#fff" style={mediaStyles.playIconOverlay} />
                        )}
                        {isSelectionMode && (
                            <View style={mediaStyles.selectionOverlay}>
                                <Ionicons 
                                    name={isSelected ? "checkbox" : "square-outline"} 
                                    size={24} 
                                    color={isSelected ? "#FFF" : "#fff"} 
                                />
                            </View>
                        )}
                    </TouchableOpacity>
                  );
              })}
          </View>
      );
  };

  const renderFullScreenItem = ({ item }) => {
    // 1. VIDEO (No Zoom, just toggle controls)
    if (item.type === 'video') {
        return (
          <TouchableWithoutFeedback onPress={toggleControls}>
            <View style={mediaStyles.fullScreenContent}>
                <Video
                    source={{ uri: item.url }} 
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={true} 
                    useNativeControls
                    style={mediaStyles.fullVideo}
                />
            </View>
          </TouchableWithoutFeedback>
        );
    }

    // 2. IMAGE (ZOOMABLE COMPONENT)
    return (
      <View style={mediaStyles.fullScreenContent}>
         <ZoomableImage 
            uri={item.url} 
            onPress={toggleControls} 
            onZoomChange={setScrollEnabled} // Lock list when zooming
         />
      </View>
    );
  };

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index);
    }
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  return (
    // Gesture Handler Root is required for gestures to work
    <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient 
            colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
            style={mediaStyles.container}
        >
        <StatusBar 
            backgroundColor={isDark ? '#1a1a1a' : '#55efe1'}
            barStyle={isDark ? "light-content" : "dark-content"} 
        />
        
        {/* HEADER */}
        <View style={mediaStyles.headerContainer}>
            {isSelectionMode ? (
            <>
                <ScaleButton onPress={toggleSelectionMode}>
                    <Text style={{color: '#fff', fontSize:16, fontWeight:'600'}}>İptal</Text>
                </ScaleButton>
                
                <Text style={mediaStyles.headerTitle}>{selectedIds.length} Seçildi</Text>
                
                <View style={{ zIndex: 200 }}> 
                    {/* 3 Dot Button */}
                    <TouchableOpacity onPress={handleBulkActionPress}>
                        <Ionicons name="ellipsis-vertical" size={24} color='#fff' />
                    </TouchableOpacity>

                    {/* NEW: Custom Bulk Options Menu */}
                    {showBulkOptions && (
                        <>
                            {/* Transparent Overlay to close menu when clicking outside */}
                            <TouchableWithoutFeedback onPress={() => setShowBulkOptions(false)}>
                                <View style={{ 
                                    position: 'absolute', 
                                    top: -50, right: -20, // Adjust to cover full screen from this relative point
                                    width: width, height: height, 
                                    backgroundColor: 'transparent', 
                                    zIndex: 199 
                                }} />
                            </TouchableWithoutFeedback>

                            {/* The Menu Box (Matched with Dark Theme) */}
                            <View style={[mediaStyles.optionsMenu, { top: 35, right: 0, zIndex: 200 }]}>
                                
                                {/* Option 1: Save */}
                                <TouchableOpacity 
                                    style={mediaStyles.optionItem} 
                                    onPress={() => { setShowBulkOptions(false); handleBulkSave(); }}
                                >
                                    <Text style={mediaStyles.optionText}>Kaydet</Text>
                                </TouchableOpacity>
                                
                                {/* Option 2: Remove (Red) */}
                                <TouchableOpacity 
                                    style={[mediaStyles.optionItem, { borderBottomWidth: 0 }]} 
                                    onPress={() => { setShowBulkOptions(false); handleBulkRemoveConfirmation(); }}
                                >
                                    <Text style={mediaStyles.optionText}>
                                        Kaldır
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </>
            ) : (
                <>
                    {/* Back Button */}
                    <TouchableOpacity style={mediaStyles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={32} color='#fff' />
                    </TouchableOpacity>
                    {/* Select Button */}
                    <ScaleButton style={{marginLeft: -55}} onPress={toggleSelectionMode}>
                        <Text style={{color:'#fff', fontWeight: '600', fontSize: 16}}>Seç</Text>
                    </ScaleButton>
                    <Text style={[mediaStyles.headerTitle, {marginLeft: -40}]}>Medya</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        {/* filter Button */}
                        <ScaleButton style={{marginRight: 20}} onPress={handleOpenFilter}>
                            <Ionicons name="filter" size={24} color='#fff' />
                        </ScaleButton>
                        {/* Add Button */}
                        <ScaleButton style={mediaStyles.addButton} onPress={handleUpload}>
                            {uploading ? <ActivityIndicator color={isDark ? '#fff' : '#000'} /> : <Ionicons name="add" size={32} color= {isDark ? '#fff' : '#000'} />}
                        </ScaleButton>
                    </View>
                </>
            )}
        </View>

        {/* TIMELINE LIST (SectionList with Pinch Gesture) */}
        <View style={{ flex: 1 }}> 
            {loading ? (
                <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} style={{ marginTop: 50 }} />
            ) : (
                <GestureDetector gesture={pinchGesture}>
                    <SectionList
                        sections={groupedPhotos}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderRow}
                        renderSectionHeader={renderSectionHeader}
                        stickySectionHeadersEnabled={true}
                        
                        // SCROLL EVENTS FOR BUBBLE
                        onScroll={handleScroll}
                        onScrollBeginDrag={handleScroll}
                        onScrollEndDrag={handleScrollEnd}
                        onMomentumScrollEnd={handleScrollEnd}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}

                        contentContainerStyle={{ paddingBottom: 100 }}

                        // --- ADDED: PULL TO REFRESH CONTROL ---
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                // Tema uyumlu renk ayarları
                                colors={[isDark ? '#000' : '#000000']} // Android
                                tintColor={isDark ? '#000' : '#000000'} // iOS
                            />
                        }

                        ListEmptyComponent={
                            <View style={{alignItems:'center', marginTop: 50}}>
                                <Text style={{color: colors.textSecondary}}>Henüz medya yok.</Text>
                            </View>
                        }
                    />
                </GestureDetector>
            )}

            {/* --- DYNAMIC SCROLL DATE BUBBLE --- */}
            {isScrolling && scrollDate !== '' && (
                <View style={mediaStyles.scrollBubble}>
                    <Text style={mediaStyles.scrollBubbleText}>{scrollDate}</Text>
                </View>
            )}
        </View>

        {/* --- FILTER MODAL --- */}
        <Modal 
            visible={filterModalVisible} 
            transparent={true} 
            animationType="slide"
            onRequestClose={() => setFilterModalVisible(false)}
        >
            <View style={mediaStyles.filterModalOverlay}>
                <View style={mediaStyles.filterModalContainer}>
                    <View style={mediaStyles.filterHeader}>
                        <Text style={mediaStyles.filterTitle}>Yükleyen Kişi Filtresi</Text>
                        <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                            <Ionicons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={mediaStyles.filterContent}>
                        {/* Everyone Option */}
                        <TouchableOpacity style={mediaStyles.filterRow} onPress={() => toggleMemberFilter('all')}>
                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                <View style={mediaStyles.filterAvatarPlaceholder}>
                                    <Ionicons name="people" size={20} color={isDark ? '#000' : '#fff'} />
                                </View>
                                <Text style={mediaStyles.filterName}>Herkes</Text>
                            </View>
                            <Ionicons 
                                name={isAllSelected ? "checkbox" : "square-outline"} 
                                size={24} 
                                color={isAllSelected ? (isDark ? '#fff' : '#2c2c2c') : (isDark ? '#ccc' : '#2c2c2c')} 
                            />
                        </TouchableOpacity>

                        <View style={mediaStyles.filterSeparator} />

                        {/* Members List */}
                        {members.map(member => {
                            const isSelected = tempSelectedMemberIds.includes(member.id.toString());
                            const thumb = member.thumbnail_url || member.profile_url;
                            return (
                                <TouchableOpacity key={member.id} style={mediaStyles.filterRow} onPress={() => toggleMemberFilter(member.id)}>
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <Image source={thumb ? {uri: thumb} : defaultUserImage} style={mediaStyles.filterAvatar} />
                                        <Text style={mediaStyles.filterName}>{member.username}</Text>
                                    </View>
                                    <Ionicons 
                                        name={isSelected ? "checkbox" : "square-outline"} 
                                        size={24} 
                                        color={isSelected ? (isDark ? '#fff' : '#2c2c2c') : (isDark ? '#ccc' : '#2c2c2c')} 
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={mediaStyles.filterFooter}>
                        <TouchableOpacity style={mediaStyles.applyButton} onPress={applyFilter}>
                            <Text style={mediaStyles.applyButtonText}>Uygula</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        {/* FULL SCREEN VIEWER */}
        <Modal 
            visible={isViewerVisible} 
            transparent={true} 
            animationType="fade"
            onRequestClose={() => setViewerVisible(false)} 
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={mediaStyles.fullScreenContainer}>
                    
                    {/* --- ANIMATED HEADER --- */}
                    <Animated.View 
                        style={[
                            mediaStyles.fullScreenHeader, 
                            { opacity: fadeAnim } 
                        ]}
                        pointerEvents={showControls ? 'auto' : 'none'}
                    >
                        <TouchableOpacity style={[mediaStyles.controlButton, {marginLeft: -10}]} onPress={() => setViewerVisible(false)}>
                            <Ionicons name="chevron-back" size={28} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity style={mediaStyles.controlButton} onPress={() => setShowOptions(!showOptions)}>
                            <Ionicons name="ellipsis-vertical" size={28} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* --- OPTIONS MENU (Animated) --- */}
                    {showOptions && showControls && (
                        <Reanimated.View 
                            entering={FadeIn.duration(200)} // Fade In (200ms)
                            exiting={FadeOut.duration(200)} // Fade Out (200ms)
                            style={[mediaStyles.optionsMenu, { zIndex: 200 }]}
                        >
                            <TouchableOpacity style={mediaStyles.optionItem} onPress={handleSaveToGallery}>
                                <Text style={mediaStyles.optionText}>Kaydet</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={mediaStyles.optionItem} onPress={handleRemove}>
                                <Text style={mediaStyles.optionText}>Kaldır</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[mediaStyles.optionItem, { borderBottomWidth: 0 }]} onPress={handleReport}>
                                <Text style={[mediaStyles.optionText, mediaStyles.reportText]}>Bildir</Text>
                            </TouchableOpacity>
                        </Reanimated.View>
                    )}

                    {/* --- REPORT MODAL (Animated Dialog) --- */}
                    {showReportModal && (
                        <Reanimated.View 
                            entering={FadeIn.duration(300)} // Smooth entry
                            exiting={FadeOut.duration(300)} // Smooth exit
                            style={[mediaStyles.reportCenteredView, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                        >
                            {/* Tap outside to close Report Modal */}
                            <TouchableWithoutFeedback onPress={() => setShowReportModal(false)}>
                                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                            </TouchableWithoutFeedback>

                            {/* The Modal Box */}
                            <View style={mediaStyles.reportModalBox}>
                                <Text style={mediaStyles.reportHeader}>Bildirim Sebebi</Text>
                                
                                {["Şiddet / Tehlikeli", "Çıplaklık / Cinsellik", "Taciz / Zorbalık", "Nefret Söylemi", "Diğer"].map((reason) => (
                                    <TouchableOpacity 
                                        key={reason} 
                                        style={mediaStyles.reportOption}
                                        onPress={() => { 
                                            // Close modal (triggers FadeOut automatically)
                                            setShowReportModal(false); 
                                            submitReport(photos[currentIndex].id, reason); 
                                        }}
                                    >
                                        <Text style={mediaStyles.reportOptionText}>{reason}</Text>
                                    </TouchableOpacity>
                                ))}
                                
                                <TouchableOpacity 
                                    style={[mediaStyles.reportOption, { borderBottomWidth: 0 }]}
                                    onPress={() => setShowReportModal(false)}
                                >
                                     <Text style={[mediaStyles.reportOptionText, { color: '#FF3B30' }]}>Vazgeç</Text>
                                </TouchableOpacity>
                            </View>
                        </Reanimated.View>
                    )}

                    {/* MEDIA LIST */}
                    <FlatList
                        ref={fullScreenListRef}
                        scrollEnabled={scrollEnabled}
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

                    {/* --- ANIMATED FOOTER --- */}
                    <Animated.View 
                        style={[
                            mediaStyles.fullScreenFooter, 
                            { opacity: fadeAnim }
                        ]}
                        pointerEvents="none"
                    >
                        <View>
                            <Text style={mediaStyles.infoText}>
                                {photos[currentIndex]?.uploaded_by}
                            </Text>
                            <Text style={mediaStyles.dateText}>
                                {photos[currentIndex] ? new Date(photos[currentIndex].date).toLocaleDateString() : ''}
                            </Text>
                        </View>
                    </Animated.View>
                </View>
            </GestureHandlerRootView>
        </Modal>
        </LinearGradient>
    </GestureHandlerRootView>
  );
}