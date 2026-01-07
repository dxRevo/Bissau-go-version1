import axios from 'axios';

// IMPORTANT: L'URL doit pointer vers le backend NestJS, pas vers Next.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008/api';

console.log('🔧 API URL configurée:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth-storage');
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.token) {
          config.headers.Authorization = `Bearer ${parsed.token}`;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  return config;
});

// Log errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API Error:', error.config?.url, error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
