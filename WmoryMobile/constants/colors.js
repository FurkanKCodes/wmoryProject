// Defines the color palette for the application (Light & Dark modes)

export const Colors = {
    light: {
      type: 'light',
      // Gradient colors for the main background (Top to Bottom)
      gradient: ['#ffffff', '#e6e6e6'], 
      
      // Core Colors
      background: '#ffffff',
      cardBg: '#f2f2f2',        // For list items, headers
      headerBg: '#ffffff',      // Top header background
      
      // Text Colors
      textPrimary: '#000000',   // Main titles
      textSecondary: '#666666', // Subtitles, descriptions
      
      // UI Elements
      tint: '#007AFF',          // Active icons (Blue)
      iconDefault: '#333333',   // Normal icons
      border: '#e0e0e0',        // Dividers
      danger: '#FF3B30',        // Red actions (Logout, Delete)
      
      // Modal
      modalBg: '#ffffff',
      overlay: 'rgba(0,0,0,0.5)',
    },
    
    dark: {
      type: 'dark',
      // Your existing gradient: Dark Gray to Blackish
      gradient: ['#4e4e4e', '#1a1a1a'], 
      
      // Core Colors
      background: '#333333',
      cardBg: '#2C2C2C',        // Your existing card color
      headerBg: '#1a1a1a',      // Your existing header color
      
      // Text Colors
      textPrimary: '#ffffff',
      textSecondary: '#cccccc',
      
      // UI Elements
      tint: '#0A84FF',          // Lighter blue for dark mode
      iconDefault: '#cccccc',
      border: '#444444',
      danger: '#FF453A',
      
      // Modal
      modalBg: '#2C2C2C',
      overlay: 'rgba(0,0,0,0.7)',
    },
  };