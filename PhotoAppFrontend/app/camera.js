import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, ActivityIndicator } from 'react-native';
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

// Create Animated Camera component for zoom/exposure animations
const AnimatedCamera = createAnimatedComponent(Camera);

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Fallback for missing params
  const groupId = params.groupId || 'unknown_group';
  const userId = params.userId || 'unknown_user';

  const isFocused = useIsFocused();
  const cameraRef = useRef(null);

  // --- PERMISSIONS ---
  const { hasPermission: hasCamPerm, requestPermission: requestCamPerm } = useCameraPermission();
  const { hasPermission: hasMicPerm, requestPermission: requestMicPerm } = useMicrophonePermission();

  // --- STATE ---
  const [cameraPosition, setCameraPosition] = useState('back'); 
  const [mode, setMode] = useState('picture'); 
  const [isActive, setIsActive] = useState(true);
  const [flash, setFlash] = useState('off');
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  // Notification State
  const [notificationMsg, setNotificationMsg] = useState('');
  const [zoomLabel, setZoomLabel] = useState("1.0x");

  // Reanimated Shared Values
  const zoom = useSharedValue(1.0);
  const startZoom = useSharedValue(1.0);
  
  // Focus & Exposure
  const focusOpacity = useSharedValue(0);
  const focusX = useSharedValue(0);
  const focusY = useSharedValue(0);
  const exposureBias = useSharedValue(0); 
  const startExposure = useSharedValue(0);

  // Notification Opacity
  const notifOpacity = useSharedValue(0);

  // --- DEVICE & FORMAT ---
  const device = useCameraDevice(cameraPosition);
  
  // Format Selection (HEVC/H.265 for efficient storage)
  const format = useCameraFormat(device, [
    { videoResolution: 'max' },
    { photoResolution: 'max' },
    { videoCodec: 'h265' } 
  ]);

  // --- LIFECYCLE ---
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
    const filename = filePath.split('/').pop();
    const formData = new FormData();
    
    // Append photo file
    formData.append('photo', {
      uri: 'file://' + filePath,
      type: type === 'picture' ? 'image/jpeg' : 'video/mp4',
      name: filename,
    });
    
    // Append user and group IDs
    formData.append('user_id', userId);
    formData.append('group_id', groupId);

    // Backend upload endpoint
    const url = `${API_URL}/upload-photo`;

    console.log("Uploading to:", url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201 || response.status === 200) {
        runOnJS(showNotification)("Medya başarıyla yüklendi");
      } else if (response.status === 403) {
        // Handle limit or permission errors
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes("LIMIT_EXCEEDED")) {
             runOnJS(showNotification)("Limit aşıldı!");
        } else {
             runOnJS(showNotification)("Yetkisiz İşlem");
        }
      } else {
        const errorText = await response.text();
        console.log("Server Error:", errorText);
        runOnJS(showNotification)(`Hata: ${response.status}`);
      }

    } catch (error) {
      console.error("Upload Request Failed:", error);
      runOnJS(showNotification)("Bağlantı Hatası");
    }
  };

  // --- GESTURES ---
  
  // 1. Zoom (Pinch)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      const min = device?.minZoom || 1;
      const max = Math.min(device?.maxZoom || 5, 5);
      const newZoom = Math.max(min, Math.min(e.scale * startZoom.value, max));
      zoom.value = newZoom;
      runOnJS(setZoomLabel)(`${newZoom.toFixed(1)}x`);
    });

  // 2. Focus (Tap)
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .maxDistance(10) // Prevents conflict with pinch/zoom
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

  // 3. Exposure (Pan Vertical)
  const panGesture = Gesture.Pan()
    .onStart(() => {
        startExposure.value = exposureBias.value;
    })
    .onUpdate((e) => {
        const sensitivity = 0.005;
        let newExp = startExposure.value - (e.translationY * sensitivity);
        newExp = Math.max(-2, Math.min(newExp, 2));
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
    const translateY = interpolate(exposureBias.value, [2, -2], [0, 120]);
    return {
        transform: [{ translateY }]
    };
  });

  const notificationStyle = useAnimatedStyle(() => ({
    opacity: notifOpacity.value
  }));

  // --- CAPTURE HANDLERS ---
  const handleCapture = async () => {
    if (!cameraRef.current) return;

    if (mode === 'picture') {
      try {
        const photo = await cameraRef.current.takePhoto({
          flash: flash,
          enableShutterSound: true
        });
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
                flash: flash,
                onRecordingFinished: (video) => {
                    uploadMediaBackground(video.path, 'video');
                },
                onRecordingError: (e) => console.error("Rec error", e)
            });
        } catch(e) { 
            setIsRecording(false); 
        }
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- RENDER ---
  if (!device || !hasCamPerm) return <ActivityIndicator style={{flex:1, backgroundColor:'black'}} />;
  
  const composedGesture = Gesture.Simultaneous(pinchGesture, Gesture.Simultaneous(tapGesture, panGesture));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={cameraStyles.container}>
        
        <GestureDetector gesture={composedGesture}>
          <View style={StyleSheet.absoluteFill}>
            <AnimatedCamera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isFocused && isActive}
              format={format}
              photo={true}
              video={true}
              audio={true}
              animatedProps={animatedProps}
              enableZoomGesture={false} 
            />
            
            <Animated.View style={[cameraStyles.focusSquare, focusStyle]}>
                <View style={cameraStyles.exposureContainer} pointerEvents="none">
                    <Ionicons name="sunny" size={20} color="#FFD700" style={[cameraStyles.sunIcon, { top: -25, left: 85 }]} />
                    <View style={[cameraStyles.exposureLine, { left: 94, top: 0 }]} />
                    <Animated.View style={[cameraStyles.exposureKnob, { left: 89, top: 0 }, exposureKnobStyle]} />
                </View>
            </Animated.View>
          </View>
        </GestureDetector>

        {/* --- UI CONTROLS --- */}
        {/* Notification Toast - Independent from controls to maintain layout */}
        <Animated.View style={[cameraStyles.notificationContainer, notificationStyle]}>
           <View style={cameraStyles.notificationWrapper}>
              <Text style={cameraStyles.notificationText}>{notificationMsg}</Text>
           </View>
        </Animated.View>

        {/* Top Controls Container */}
        <View style={cameraStyles.topControls}>
          <TouchableOpacity onPress={() => router.back()} style={cameraStyles.iconButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setFlash(f => f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off')} 
            style={cameraStyles.iconButton}
          >
             <Ionicons 
               name={flash === 'on' ? "flash" : flash === 'auto' ? "flash" : "flash-off"} 
               size={24} 
               color={flash === 'off' ? "#fff" : "#FFD700"} 
             />
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

        {!isRecording && (
            <View style={cameraStyles.zoomIndicator}>
                <Text style={cameraStyles.zoomText}>{zoomLabel}</Text>
            </View>
        )}

        <View style={cameraStyles.bottomControls}>
          <View style={{ width: 50 }} /> 
          
          <TouchableOpacity 
            style={cameraStyles.shutterContainer} 
            onPress={handleCapture}
          >
            <View style={[
               cameraStyles.shutterInner,
               mode === 'video' && cameraStyles.videoShutterInner,
               isRecording && cameraStyles.recordingInner
            ]} />
          </TouchableOpacity>

          {!isRecording ? (
              <TouchableOpacity 
                onPress={() => {
                setCameraPosition(p => p === 'back' ? 'front' : 'back');
                zoom.value = 1.0; 
                setZoomLabel("1.0x");
                }} 
                style={cameraStyles.flipButton}
            >
                <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>
          ) : (
             <View style={{ width: 50 }} /> 
          )}
        </View>

      </View>
    </GestureHandlerRootView>
  );
}