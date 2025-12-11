import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import API_URL from '../config'; 
import cameraStyles from '../styles/cameraStyles';

export default function CameraScreen() {
  const router = useRouter();
  const { groupId, userId } = useLocalSearchParams();

  // --- PERMISSIONS ---
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // --- STATE ---
  const [mode, setMode] = useState('photo'); // 'photo' | 'video'
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  
  // Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  // Safety Check
  useEffect(() => {
    if (!groupId || !userId) {
      console.warn("Camera Warning: Missing groupId or userId params.");
    }
  }, [groupId, userId]);

  // --- BACKGROUND UPLOAD LOGIC ---
  const uploadMediaBackground = async (uri, type) => {
    if (!uri) return;

    console.log(`[Upload] Starting background upload for ${type}...`);

    const formData = new FormData();
    const filename = uri.split('/').pop();
    const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';

    formData.append('user_id', userId);
    formData.append('group_id', groupId);
    
    // Backend expects 'photo' key
    formData.append('photo', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: filename,
      type: mimeType,
    });

    try {
      const response = await fetch(`${API_URL}/upload-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'ngrok-skip-browser-warning': 'true'
        },
        body: formData,
      });

      const responseText = await response.text();

      try {
        const data = JSON.parse(responseText);
        if (response.ok) {
          console.log("✅ [Upload] Success:", data);
        } else {
          console.error("❌ [Upload] Server Error:", data);
        }
      } catch (jsonError) {
        console.error("❌ [Upload] Invalid Response:", responseText);
      }
      
    } catch (e) {
      console.error("❌ [Upload] Network Error:", e);
    }
  };

  // --- CAPTURE HANDLERS ---
  const handleCapture = async () => {
    if (!cameraRef.current) return;

    if (mode === 'photo') {
      try {
        // 1. Take Picture
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          skipProcessing: true,
          // Mirror only if front camera
          mirror: facing === 'front', 
        });
        
        let finalUri = photo.uri;

        // 2. FIX ORIENTATION (Android Specific)
        // If the photo is Landscape (width > height) but likely intended as Portrait,
        // OR simply to bake in the EXIF data so it displays correctly everywhere.
        if (Platform.OS === 'android') {
            // "Dummy" manipulation forces Android to bake the EXIF rotation into the pixel data
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                photo.uri,
                [{ resize: { width: photo.width } }], // Resizing to same width forces orientation fix
                { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
            );
            finalUri = manipulatedImage.uri;
        }
        
        // 3. Upload
        uploadMediaBackground(finalUri, 'photo');

      } catch (error) {
        console.error("Photo Capture Error:", error);
      }
    } else {
      // VIDEO MODE
      if (isRecording) {
        stopVideo();
      } else {
        startVideo();
      }
    }
  };

  const startVideo = async () => {
    if (cameraRef.current) {
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(s => s + 1), 1000);
      try {
        const video = await cameraRef.current.recordAsync();
        uploadMediaBackground(video.uri, 'video');
      } catch (e) {
        console.error("Video Capture Error:", e);
        stopVideo();
      }
    }
  };

  const stopVideo = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!permission) return <View style={cameraStyles.container} />;
  if (!permission.granted) {
    return (
      <View style={cameraStyles.permissionContainer}>
        <Text style={cameraStyles.message}>Camera permission is required.</Text>
        <TouchableOpacity style={cameraStyles.permButton} onPress={requestPermission}>
          <Text style={cameraStyles.permText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={cameraStyles.container}>
      <CameraView
        ref={cameraRef}
        style={cameraStyles.camera}
        facing={facing}
        flash={flash}
        mode={mode}
      >
        {/* --- TOP CONTROLS --- */}
        <View style={cameraStyles.topControls}>
          <TouchableOpacity onPress={() => router.back()} style={cameraStyles.iconButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')} style={cameraStyles.iconButton}>
            <Ionicons 
              name={flash === 'on' ? "flash" : "flash-off"} 
              size={24} 
              color={flash === 'on' ? "#FFD700" : "#fff"} 
            />
          </TouchableOpacity>
        </View>

        {/* --- VIDEO TIMER OVERLAY --- */}
        {isRecording && (
          <View style={cameraStyles.timerOverlay}>
            <View style={cameraStyles.redDot} />
            <Text style={cameraStyles.timerText}>{formatTime(duration)}</Text>
          </View>
        )}

        {/* --- BOTTOM CONTROLS --- */}
        <View style={cameraStyles.bottomControls}>
          <View style={{ width: 50 }} />

          <TouchableOpacity 
            style={cameraStyles.shutterContainer} 
            onPress={handleCapture}
            onLongPress={mode === 'photo' ? startVideo : null}
          >
            <View style={[
              cameraStyles.shutterInner,
              mode === 'video' && cameraStyles.videoShutterInner,
              isRecording && cameraStyles.recordingInner
            ]} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} style={cameraStyles.flipButton}>
            <Ionicons name="camera-reverse" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* --- MODE SELECTOR --- */}
        <View style={cameraStyles.modeContainer}>
          <TouchableOpacity onPress={() => setMode('photo')}>
            <Text style={[cameraStyles.modeText, mode === 'photo' && cameraStyles.activeMode]}>PHOTO</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('video')}>
            <Text style={[cameraStyles.modeText, mode === 'video' && cameraStyles.activeMode]}>VIDEO</Text>
          </TouchableOpacity>
        </View>

      </CameraView>
    </View>
  );
}