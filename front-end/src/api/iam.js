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

export async function changeOwnPassword(current_password, new_password) {
  await apiClient.patch('/api/v1/auth/me/password', { current_password, new_password });
}

/* ---------- Admin user CRUD ---------- */
const USERS = '/api/v1/auth/users';

export async function listUsers({ page = 1, page_size = 20 } = {}) {
  const { data } = await apiClient.get(USERS, { params: { page, page_size } });
  return data;
}
export async function getUser(id) {
  const { data } = await apiClient.get(`${USERS}/${id}`);
  return data;
}
export async function createUser(payload) {
  const { data } = await apiClient.post(USERS, payload);
  return data;
}
export async function updateUser(id, patch) {
  const { data } = await apiClient.patch(`${USERS}/${id}`, patch);
  return data;
}
export async function resetUserPassword(id, password) {
  await apiClient.post(`${USERS}/${id}/reset-password`, { password });
}
