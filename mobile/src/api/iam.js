import axios from 'axios';
import { iam, RAW_BASE_URLS } from './client';

export async function login(email, password) {
  const { data } = await iam.post('/auth/login', { email, password });
  return data;
}

export async function logout() {
  try {
    await iam.post('/auth/logout', {});
  } catch {
    // Best-effort; client-side token wipe happens regardless.
  }
}

export async function getMe() {
  const { data } = await iam.get('/auth/me');
  return data;
}

export async function changePassword(current_password, new_password) {
  const { data } = await iam.patch('/auth/me/password', { current_password, new_password });
  return data;
}

export async function listUsers(page = 1, page_size = 20) {
  const { data } = await iam.get('/auth/users', { params: { page, page_size } });
  return data;
}

export async function getUser(id) {
  const { data } = await iam.get(`/auth/users/${id}`);
  return data;
}

export async function pingHealth() {
  // /health is at root, not under /api/v1.
  const { data } = await axios.get(`${RAW_BASE_URLS.IAM_URL}/health`, { timeout: 5000 });
  return data;
}
