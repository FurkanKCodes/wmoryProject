import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, ActivityIndicator, AppState, Dimensions } from 'react-native';
// Vision Camera Imports
import { 
  Camera, 
  useCameraDevice, 
  useCameraPermission, 
  useMicrophonePermission,
  useCameraFormat
} from 'react-native-vision-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
// Gesture & Animation Imports
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  runOnJS,
  useAnimatedProps,
  interpolate,
  createAnimatedComponent
} from 'react-native-reanimated';

// Custom Styles & Utils
import cameraStyles from '../styles/cameraStyles';
import { setImmersiveMode, restoreSystemBars } from '../utils/androidNavigation';

// Backend URL Config
import API_URL from '../config'; 

const AnimatedCamera = createAnimatedComponent(Camera);
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_RATIO = SCREEN_HEIGHT / SCREEN_WIDTH;

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const groupId = params.groupId || 'unknown_group';
  const userId = params.userId || 'unknown_user';

  // Navigation Focus State
  const isFocused = useIsFocused();
  
  // App Lifecycle State (Background/Foreground)
  const [appState, setAppState] = useState(AppState.currentState);

  const cameraRef = useRef(null);

  // --- PERMISSIONS ---
  const { hasPermission: hasCamPerm, requestPermission: requestCamPerm } = useCameraPermission();
  const { hasPermission: hasMicPerm, requestPermission: requestMicPerm } = useMicrophonePermission();

  // --- STATE ---
  const [cameraPosition, setCameraPosition] = useState('back'); 
  const [mode, setMode] = useState('picture'); 
  const [flash, setFlash] = useState('off');
  
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  const [notificationMsg, setNotificationMsg] = useState('');
  const [zoomLabel, setZoomLabel] = useState("1.0x");

  // Reanimated Shared Values
  const zoom = useSharedValue(1.0);
  const startZoom = useSharedValue(1.0);
  
  const focusOpacity = useSharedValue(0);
  const focusX = useSharedValue(0);
  const focusY = useSharedValue(0);
  
  const exposureBias = useSharedValue(0); 
  const startExposure = useSharedValue(0);

  const notifOpacity = useSharedValue(0);

  // --- DEVICE & FORMAT ---
  // We explicitly look for the 'back' camera.
  // Note: On some Androids, the 'ultra-wide' is a separate ID. 
  // VisionCamera usually handles 'back' as the main logical camera.
  const device = useCameraDevice(cameraPosition);
  
  // Format Selection Strategy:
  // 1. Must match current Photo/Video requirements.
  // 2. We prefer H.265 (HEVC) for size efficiency.
  // 3. To fix "Zoomed In" look: We try to find a format closer to the Screen Aspect Ratio 
  //    to minimize cropping, OR highest Field of View (FOV).
  const format = useCameraFormat(device, [
    { videoAspectRatio: 16 / 9 },
    { videoResolution: 'max' },
    { photoResolution: 'max' },
    { videoCodec: 'h265' } 
  ]);

  // Active State Logic
  // Critical for "Camera already in use" error.
  // Camera is ONLY active if: User is on this screen AND App is in foreground.
  const isActive = isFocused && appState === 'active';

  // --- LIFECYCLE: APP STATE ---
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        // Stop recording if active
        if (isRecording && cameraRef.current) {
           cameraRef.current.stopRecording().catch(() => {});
           setIsRecording(false);
        }
        // Force navigation back to Home screen to release camera resources
        if (router.canGoBack()) {
          router.back();
        }
      }
      setAppState(nextAppState);
    });
    return () => {
      subscription.remove();
    };
  }, [appState, isRecording]);

  // --- LIFECYCLE: IMMERSIVE MODE ---
  useEffect(() => {
    if (Platform.OS === 'android') {
      setTimeout(() => setImmersiveMode(), 100);
      return () => restoreSystemBars();
    }
  }, []);

  useEffect(() => {
    if (!hasCamPerm) requestCamPerm();
    if (!hasMicPerm) requestMicPerm();
  }, []);

  // --- INITIAL ZOOM ---
  // Reset zoom when device changes or app starts
  useEffect(() => {
    if (device?.neutralZoom) {
      zoom.value = device.neutralZoom;
      setZoomLabel(`${device.neutralZoom.toFixed(1)}x`);
    } else {
        zoom.value = 1.0;
        setZoomLabel("1.0x");
    }
  }, [device]);

  // --- NOTIFICATION HELPER ---
  const showNotification = (message) => {
    setNotificationMsg(message);
    notifOpacity.value = withSequence(
      withTiming(1, { duration: 300 }), 
      withTiming(1, { duration: 2500 }), 
      withTiming(0, { duration: 500 }) 
    );
  };

  // --- UPLOAD LOGIC ---
  const uploadMediaBackground = async (filePath, type) => {
    try {
      const actualType = type === 'picture' ? 'image/jpeg' : 'video/mp4';

      // Step 1: Get Presigned URL
      const presignRes = await fetch(`${API_URL}/generate-upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_type: actualType })
      });
      
      if (!presignRes.ok) throw new Error("Presigned URL error");
      const { upload_url, object_key } = await presignRes.json();

      // Step 2: Fetch Blob & Upload to S3
      const fileUri = 'file://' + filePath;
      const fileData = await fetch(fileUri);
      const blob = await fileData.blob();

      const s3Res = await fetch(upload_url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': actualType }
      });

      if (!s3Res.ok) throw new Error("S3 Upload Error");

      // Step 3: Confirm Upload with Backend
      const confirmRes = await fetch(`${API_URL}/confirm-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              user_id: userId,
              group_id: groupId,
              file_name: object_key,
              file_size: blob.size || 0
          })
      });

      if (confirmRes.status === 201 || confirmRes.status === 200) {
        runOnJS(showNotification)("Medya başarıyla yüklendi");
      } else if (confirmRes.status === 403) {
        runOnJS(showNotification)("Limit aşıldı veya yetkisiz");
      } else {
        runOnJS(showNotification)(`Hata: ${confirmRes.status}`);
      }

    } catch (error) {
      console.error("Camera Upload Error:", error);
      runOnJS(showNotification)("Bağlantı Hatası");
    }
  };

  // --- GESTURES ---
  
  // 1. ZOOM (Pinch)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      const min = device?.minZoom || 1;
      const max = Math.min(device?.maxZoom || 10, 10);
      const newZoom = Math.max(min, Math.min(e.scale * startZoom.value, max));
      zoom.value = newZoom;
      runOnJS(setZoomLabel)(`${newZoom.toFixed(1)}x`);
    });

  // 2. FOCUS (Tap)
  // Strict Mode: maxDistance(5). If finger moves > 5 pixels, it's NOT a tap.
  // This helps distinguish between starting a Pinch (fingers move) vs a Tap (static).
  const tapGesture = Gesture.Tap()
    .maxDuration(200) // Quick tap
    .maxDistance(5)   // Very strict movement limit
    .onEnd((e) => {
      runOnJS(handleFocus)(e.x, e.y);

      focusX.value = e.x - 35; 
      focusY.value = e.y - 35;
      
      exposureBias.value = 0; 
      
      focusOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 1500 }), 
        withTiming(0, { duration: 800 })   
      );
    });

  // 3. Slide-to-Zoom on the indicator
  const zoomPanGesture = Gesture.Pan()
  .onStart(() => {
    startZoom.value = zoom.value;
  })
  .onUpdate((e) => {
    // Sensitivity: 1 pixel movement = 0.02x zoom change
    const sensitivity = 0.02; 
    let newZoom = startZoom.value + (e.translationX * sensitivity);
    
    const min = device?.minZoom || 1;
    const max = Math.min(device?.maxZoom || 10, 10);
    
    // Clamp values
    newZoom = Math.max(min, Math.min(newZoom, max));
    
    zoom.value = newZoom;
    runOnJS(setZoomLabel)(`${newZoom.toFixed(1)}x`);
  });

  // 4. EXPOSURE (Pan Vertical)
  // Increased sensitivity for easier control.
  const panGesture = Gesture.Pan()
    .onStart(() => {
        startExposure.value = exposureBias.value;
    })
    .onUpdate((e) => {
        // Sensitivity increased from 0.005 to 0.015 for easier movement
        const sensitivity = 0.015; 
        
        let newExp = startExposure.value - (e.translationY * sensitivity);
        
        const minExp = device?.minExposure ?? -2;
        const maxExp = device?.maxExposure ?? 2;

        newExp = Math.max(minExp, Math.min(newExp, maxExp));
        exposureBias.value = newExp;
        
        focusOpacity.value = 1; 
    })
    .onEnd(() => {
         focusOpacity.value = withSequence(
            withTiming(1, { duration: 1000 }),
            withTiming(0, { duration: 800 })
         );
    });

  function handleFocus(x, y) {
    if (cameraRef.current) {
        cameraRef.current.focus({ x, y }).catch(() => {});
    }
  }

  // --- GESTURE COMPOSITION ---
  // Race: "Pinch" and "Tap" race against each other.
  // If Pinch is detected (2 fingers), Tap is cancelled immediately.
  // If Tap is detected (1 finger, no movement), it fires.
  // Pan (Exposure) runs simultaneously but only affects vertical drag.
  const composedGesture = Gesture.Simultaneous(
    Gesture.Race(pinchGesture, tapGesture), 
    panGesture
  );

  // --- ANIMATED PROPS ---
  const animatedProps = useAnimatedProps(() => {
    return {
      zoom: zoom.value,
      exposure: exposureBias.value 
    };
  }, [zoom, exposureBias]);

  const focusStyle = useAnimatedStyle(() => ({
    left: focusX.value,
    top: focusY.value,
    opacity: focusOpacity.value
  }));

  const exposureKnobStyle = useAnimatedStyle(() => {
    const minExp = device?.minExposure ?? -2;
    const maxExp = device?.maxExposure ?? 2;
    // Map exposure range to slider height (150px container -> 120px track)
    const translateY = interpolate(exposureBias.value, [maxExp, minExp], [0, 120]);
    return {
        transform: [{ translateY }]
    };
  });

  const notificationStyle = useAnimatedStyle(() => ({
    opacity: notifOpacity.value
  }));

  // --- CAPTURE ---
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    if (mode === 'picture') {
      try {
        const photo = await cameraRef.current.takePhoto({ flash, enableShutterSound: true });
        await uploadMediaBackground(photo.path, 'picture');
      } catch (e) { console.error("Capture failed", e); }
    } else {
      if (isRecording) {
        await cameraRef.current.stopRecording();
        setIsRecording(false);
        clearInterval(timerRef.current);
      } else {
        setIsRecording(true);
        setDuration(0);
        timerRef.current = setInterval(() => setDuration(s => s + 1), 1000);
        try {
            cameraRef.current.startRecording({
                flash,
                onRecordingFinished: (v) => uploadMediaBackground(v.path, 'video'),
                onRecordingError: (e) => console.error("Rec error", e)
            });
        } catch(e) { setIsRecording(false); }
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!device || !hasCamPerm) return <ActivityIndicator style={{flex:1, backgroundColor:'black'}} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={cameraStyles.container}>
        
        <GestureDetector gesture={composedGesture}>
          <View style={StyleSheet.absoluteFill}>
            <AnimatedCamera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isActive}
              format={format}
              photo={true}
              video={true}
              audio={true}
              animatedProps={animatedProps}
              enableZoomGesture={false} 
              resizeMode="cover" // Cover fills screen (crops), Contain shows black bars (no crop)
            />
            
            {/* FOCUS & EXPOSURE OVERLAY */}
            <Animated.View style={[cameraStyles.focusSquare, focusStyle]}>
                {/* Exposure Slider Area - Widened in Styles for easier touch */}
                <View style={cameraStyles.exposureContainer} pointerEvents="none">
                    <Ionicons name="sunny" size={20} color="#FFD700" style={[cameraStyles.sunIcon, { top: -25, left: 85 }]} />
                    <View style={[cameraStyles.exposureLine, { left: 94, top: 0 }]} />
                    <Animated.View style={[cameraStyles.exposureKnob, { left: 89, top: 0 }, exposureKnobStyle]} />
                </View>
            </Animated.View>
          </View>
        </GestureDetector>

        {/* --- UI --- */}
        <Animated.View style={[cameraStyles.notificationContainer, notificationStyle]}>
           <View style={cameraStyles.notificationWrapper}>
              <Text style={cameraStyles.notificationText}>{notificationMsg}</Text>
           </View>
        </Animated.View>

        <View style={cameraStyles.topControls}>
          <TouchableOpacity onPress={() => router.back()} style={cameraStyles.iconButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFlash(f => f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off')} 
            style={cameraStyles.iconButton}
          >
             <Ionicons name={flash === 'on' || flash === 'auto' ? "flash" : "flash-off"} size={24} color={flash === 'off' ? "#fff" : "#FFD700"} />
             {flash === 'auto' && <Text style={{position:'absolute', fontSize:10, fontWeight:'bold', color:'#fff', bottom:8}}>A</Text>}
          </TouchableOpacity>
        </View>

        {isRecording && (
          <View style={cameraStyles.timerOverlay}>
            <View style={cameraStyles.redDot} />
            <Text style={cameraStyles.timerText}>{formatTime(duration)}</Text>
          </View>
        )}

        {!isRecording && (
            <View style={cameraStyles.modeContainer}>
            <TouchableOpacity onPress={() => setMode('picture')}>
                <Text style={[cameraStyles.modeText, mode === 'picture' && cameraStyles.activeMode]}>FOTOĞRAF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('video')}>
                <Text style={[cameraStyles.modeText, mode === 'video' && cameraStyles.activeMode]}>VİDEO</Text>
            </TouchableOpacity>
            </View>
        )}

        {/* Zoom Label - Slide to Zoom Logic */}
        {!isRecording && (
          <GestureDetector gesture={zoomPanGesture}>
            <View style={cameraStyles.zoomIndicator}>
                <Text style={cameraStyles.zoomText}>{zoomLabel}</Text>
            </View>
          </GestureDetector>
        )}

        <View style={cameraStyles.bottomControls}>
          <View style={{ width: 50 }} /> 
          <TouchableOpacity style={cameraStyles.shutterContainer} onPress={handleCapture}>
            <View style={[cameraStyles.shutterInner, mode === 'video' && cameraStyles.videoShutterInner, isRecording && cameraStyles.recordingInner]} />
          </TouchableOpacity>
          {!isRecording ? (
              <TouchableOpacity 
                onPress={() => {
                  setCameraPosition(p => p === 'back' ? 'front' : 'back');
                }} 
                style={cameraStyles.flipButton}
            >
                <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>
          ) : (<View style={{ width: 50 }} />)}
        </View>

      </View>
    </GestureHandlerRootView>
  );
}