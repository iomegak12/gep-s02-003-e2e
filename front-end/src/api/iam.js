import { apiClient } from './client.js';

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 * Resp: { access_token, token_type, expires_in, user: { email, roles[], approval_limit? } }
 */
export async function login({ email, password }) {
  const { data } = await apiClient.post('/api/v1/auth/login', { email, password });
  return data;
}

export async function logout() {
  try {
    await apiClient.post('/api/v1/auth/logout', {});
  } catch (_) {
    /* best effort; client clears local session regardless */
  }
}

export async function me() {
  const { data } = await apiClient.get('/api/v1/auth/me');
  return data;
}
