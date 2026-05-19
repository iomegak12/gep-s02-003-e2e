import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { newCorrelationId } from '../utils/correlationId';

const KEY_ACCESS = 'nexus.access_token';
const KEY_REFRESH = 'nexus.refresh_token';

const IAM_URL = process.env.EXPO_PUBLIC_IAM_URL;
const SUPPLIER_URL = process.env.EXPO_PUBLIC_SUPPLIER_URL;
const PO_URL = process.env.EXPO_PUBLIC_PO_URL;

if (__DEV__) {
  // Help trainees notice misconfigured envs.
  if (!IAM_URL || !SUPPLIER_URL || !PO_URL) {
    console.warn(
      '[NexusSCM] EXPO_PUBLIC_*_URL env vars not set. Check .env / .env.local.',
    );
  }
}

function buildInstance(baseURL, audienceTag) {
  const instance = axios.create({
    baseURL: `${baseURL}/api/v1`,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use(async (config) => {
    config.headers = config.headers || {};
    config.headers['X-Correlation-Id'] = config.headers['X-Correlation-Id'] || newCorrelationId();
    if (!config.headers.Authorization) {
      try {
        const token = await SecureStore.getItemAsync(KEY_ACCESS);
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch {}
    }
    config.__audience = audienceTag;
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      const status = error.response?.status;
      const code = error.response?.data?.error?.code;

      // Silent refresh on 401 once
      if (status === 401 && !original.__retried && code !== 'AUTH_FAILED') {
        original.__retried = true;
        try {
          const refresh = await SecureStore.getItemAsync(KEY_REFRESH);
          if (!refresh) throw new Error('no refresh token');
          const refreshResp = await axios.post(
            `${IAM_URL}/api/v1/auth/refresh`,
            { refresh_token: refresh },
            { headers: { 'X-Correlation-Id': newCorrelationId() }, timeout: 15000 },
          );
          const data = refreshResp.data || {};
          if (data.access_token) {
            await SecureStore.setItemAsync(KEY_ACCESS, data.access_token);
            if (data.refresh_token) {
              await SecureStore.setItemAsync(KEY_REFRESH, data.refresh_token);
            }
            original.headers.Authorization = `Bearer ${data.access_token}`;
            return instance.request(original);
          }
        } catch (refreshErr) {
          // Refresh failed; clear tokens. Navigation to /login is handled by AuthGate in app/_layout.js.
          await SecureStore.deleteItemAsync(KEY_ACCESS).catch(() => {});
          await SecureStore.deleteItemAsync(KEY_REFRESH).catch(() => {});
        }
      }

      return Promise.reject(error);
    },
  );

  return instance;
}

export const iam = buildInstance(IAM_URL || 'http://localhost:3001', 'iam');
export const supplier = buildInstance(SUPPLIER_URL || 'http://localhost:3002', 'supplier');
export const po = buildInstance(PO_URL || 'http://localhost:3003', 'po');

export const RAW_BASE_URLS = { IAM_URL, SUPPLIER_URL, PO_URL };

// Unwrap the standard error envelope { error: { code, message, correlation_id } }
export function extractApiError(err) {
  const env = err?.response?.data?.error;
  if (env) {
    return {
      code: env.code || 'UNKNOWN',
      message: env.message || 'Something went wrong.',
      correlationId: env.correlation_id || null,
      status: err.response?.status,
    };
  }
  if (err?.message === 'Network Error') {
    return { code: 'NETWORK', message: 'Cannot reach the server.', correlationId: null, status: 0 };
  }
  return {
    code: 'UNKNOWN',
    message: err?.message || 'Unexpected error.',
    correlationId: null,
    status: err?.response?.status || 0,
  };
}
