import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use EXPO_PUBLIC_ env var for React Native / Expo
// Set EXPO_PUBLIC_API_URL in your .env / eas.json for production
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.12:3000/api/mobile';

export const SERVER_BASE_URL = API_URL.replace(/\/api\/mobile$/, '');

export const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('mobile_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const tenantId = await AsyncStorage.getItem('mobile_tenant_id') || 'gbi-hos';
  config.headers['x-tenant-id'] = tenantId;
  return config;
});
