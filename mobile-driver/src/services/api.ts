import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3008/api';

console.log('🔧 API URL configured:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 secondes de timeout
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('⚠️ No auth token found for request:', config.url);
  }
  console.log(`📤 Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

// Log responses and errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error(`⏱️ Request timeout: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    } else if (error.message === 'Network Error' || !error.response) {
      console.error(`🌐 Network Error: ${error.config?.method?.toUpperCase()} ${error.config?.baseURL}${error.config?.url}`);
      console.error('Possible causes:');
      console.error('  - Backend not running or not accessible');
      console.error('  - Wrong IP address or port');
      console.error('  - Network connectivity issue');
      console.error('  - CORS issue (check backend CORS configuration)');
    } else {
      console.error(`❌ Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
      console.error('Error details:', error.response?.data || error.message);
      
      // Handle 401 errors - token expired or invalid
      if (error.response?.status === 401) {
        console.warn('⚠️ 401 Unauthorized - Token expired or invalid, clearing storage');
        try {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('user');
          console.log('✅ Auth storage cleared after 401 error');
        } catch (storageError) {
          console.error('Error clearing storage:', storageError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
