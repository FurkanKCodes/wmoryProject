import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CACHE KEYS ---
export const CACHE_KEYS = {
    USER_GROUPS: (userId) => `cache_user_groups_${userId}`,
    USER_PROFILE: (userId) => `cache_user_profile_${userId}`,
    GROUP_DETAILS: (groupId) => `cache_group_details_${groupId}`,
    GROUP_PHOTOS: (groupId) => `cache_group_photos_${groupId}`,
};

// --- SAVE DATA TO CACHE ---
export const saveDataToCache = async (key, data) => {
    try {
        const jsonValue = JSON.stringify(data);
        await AsyncStorage.setItem(key, jsonValue);
    } catch (e) {
        console.log('Error saving cache:', e);
    }
};

// --- LOAD DATA FROM CACHE ---
export const loadDataFromCache = async (key) => {
    try {
        const jsonValue = await AsyncStorage.getItem(key);
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
        console.log('Error reading cache:', e);
        return null;
    }
};

// --- CLEAR SPECIFIC CACHE ---
export const clearCacheKey = async (key) => {
    try {
        await AsyncStorage.removeItem(key);
    } catch (e) {
        // ignore error
    }
};