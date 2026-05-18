import axios from 'axios';
import { newCorrelationId } from './correlation.js';

const AUTH_STORAGE_KEY = 'gep.auth';

function readToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch (_) {
    return null;
  }
}

export const apiClient = axios.create({
  // Same-origin: requests flow through Vite proxy (dev) or nginx (prod).
  baseURL: '/',
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Correlation-Id'] = newCorrelationId();
  return config;
});

// 401 handler is wired up from AuthProvider so we can also clear React state.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && typeof onUnauthorized === 'function') {
      onUnauthorized(err);
    }
    return Promise.reject(err);
  }
);
