import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default empty for fresh install, unless set via environment variable
export const DEFAULT_TENANT_ID = process.env.EXPO_PUBLIC_DEFAULT_TENANT_ID ?? '';

/**
 * Smart Church ID parser from scanned QR code data, URL, or JSON.
 * Supports:
 * - http://domain.com?ChurchId=gpdi-vmm (also ?churchId=, ?tenant=, ?t=, ?id=)
 * - eklesia://church?id=gpdi-vmm
 * - {"churchId":"gpdi-vmm"}
 * - plain text slug: "gpdi-vmm"
 */
export function parseChurchId(data: string): string {
  if (!data) return '';
  const trimmed = data.trim();

  // 1. Try URL / Query string parsing
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      for (const [key, val] of url.searchParams.entries()) {
        const lowerKey = key.toLowerCase();
        if (['churchid', 'church_id', 'tenant', 'tenantid', 't', 'id'].includes(lowerKey)) {
          if (val && val.trim()) return val.trim().toLowerCase();
        }
      }
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && ['church', 'tenant', 'c', 't'].includes(pathParts[0].toLowerCase())) {
        return pathParts[1].toLowerCase();
      }
    } else if (trimmed.includes('?')) {
      const queryString = trimmed.slice(trimmed.indexOf('?') + 1);
      const searchParams = new URLSearchParams(queryString);
      for (const [key, val] of searchParams.entries()) {
        const lowerKey = key.toLowerCase();
        if (['churchid', 'church_id', 'tenant', 'tenantid', 't', 'id'].includes(lowerKey)) {
          if (val && val.trim()) return val.trim().toLowerCase();
        }
      }
    }
  } catch {}

  // 2. Try JSON parsing
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      const found =
        obj.churchId ||
        obj.ChurchId ||
        obj.church_id ||
        obj.tenant ||
        obj.tenantId ||
        obj.id;
      if (found && typeof found === 'string') {
        return found.trim().toLowerCase();
      }
    } catch {}
  }

  // 3. Fallback: plain slug without spaces
  return trimmed.replace(/\s+/g, '').toLowerCase();
}

export function getInitialTenantId(): string {
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, val] of params.entries()) {
      const lowerKey = key.toLowerCase();
      if (['churchid', 'church_id', 'tenant', 'tenantid', 't', 'id'].includes(lowerKey)) {
        if (val && val.trim()) return val.trim().toLowerCase();
      }
    }
  }
  return DEFAULT_TENANT_ID;
}

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
  let tenantId = await AsyncStorage.getItem('mobile_tenant_id');
  if (!tenantId) {
    tenantId = getInitialTenantId();
  }
  config.headers['x-tenant-id'] = tenantId;
  return config;
});
