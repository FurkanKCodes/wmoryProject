import { StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

// Android status bar adjustment
const TOP_PADDING = Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 20;
const BOTTOM_PADDING = Platform.OS === 'ios' ? 50 : 30;

const cameraStyles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  // Camera Component
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  // --- PERMISSION VIEWS ---
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  permButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  permText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // --- FOCUS & EXPOSURE UI ---
  // The yellow focus square
  focusSquare: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderWidth: 2,
    borderColor: '#FFD700', // Gold/Yellow
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  
  // Exposure Control Container (Right side of focus box)
  exposureContainer: {
    position: 'absolute',
    width: 40,
    height: 150, // Height of the slider area
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  // The sun icon
  sunIcon: {
    position: 'absolute',
    zIndex: 12,
  },
  // The vertical line
  exposureLine: {
    position: 'absolute',
    width: 2,
    height: 120,
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
    borderRadius: 1,
    zIndex: 11,
  },
  // The moving knob
  exposureKnob: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD700',
    zIndex: 13,
  },

  // --- TOP CONTROLS & NOTIFICATION ---
  topControls: {
    position: 'absolute',
    top: TOP_PADDING,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 20,
    alignItems: 'center', // Align items vertically
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 22,
  },

  // Custom Notification Toast (The pill between buttons)
  notificationContainer: {
    position: 'absolute',
    top: TOP_PADDING + 6, // Aligned with top buttons
    left: 0,
    right: 0,
    alignItems: 'center', // Center horizontally
    justifyContent: 'center',
    zIndex: 30, 
    pointerEvents: 'none', // Let touches pass through to buttons if needed
  },
  notificationWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  notificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // --- TIMER (Above Mode Selector) ---
  timerOverlay: {
    position: 'absolute',
    bottom: BOTTOM_PADDING + 100, // Positioned where mode selector usually is
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 25,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  timerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // --- ZOOM INDICATOR ---
  zoomIndicator: {
    position: 'absolute',
    bottom: BOTTOM_PADDING + 140, 
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    zIndex: 20,
  },
  zoomText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // --- MODE SELECTOR ---
  modeContainer: {
    position: 'absolute',
    bottom: BOTTOM_PADDING + 90,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 20,
  },
  modeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 15,
    letterSpacing: 1,
  },
  activeMode: {
    color: '#FFD700',
    opacity: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // --- BOTTOM CONTROLS ---
  bottomControls: {
    position: 'absolute',
    bottom: BOTTOM_PADDING,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  shutterContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  videoShutterInner: {
    backgroundColor: '#ff4040',
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  recordingInner: {
    width: 30,
    height: 30,
    borderRadius: 4,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default cameraStyles;