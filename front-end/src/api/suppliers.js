import { apiClient } from './client.js';

const BASE = '/api/v1/suppliers';

/**
 * GET /api/v1/suppliers
 * @param {{page?:number, page_size?:number, status?:string|string[], category?:string,
 *          country?:string, min_rating?:number, tag?:string, q?:string, sort?:string}} params
 * @returns {{ data: Array, page:number, page_size:number, total:number }}
 */
export async function listSuppliers(params = {}) {
  const clean = stripUndefined({
    ...params,
    status: Array.isArray(params.status) ? params.status.join(',') : params.status
  });
  const { data } = await apiClient.get(BASE, { params: clean });
  return data;
}

export async function searchSuppliers(q, limit = 10) {
  if (!q || !q.trim()) return { data: [] };
  const { data } = await apiClient.get(`${BASE}/search`, { params: { q, limit } });
  return data;
}

export async function createSupplier(payload) {
  const { data } = await apiClient.post(BASE, payload);
  return data;
}

export async function updateSupplier(id, payload) {
  const { data } = await apiClient.patch(`${BASE}/${id}`, payload);
  return data;
}

export async function getSupplier(id) {
  const { data } = await apiClient.get(`${BASE}/${id}`);
  return data;
}

export async function getSupplierScorecard(id) {
  const { data } = await apiClient.get(`${BASE}/${id}/scorecard`);
  return data;
}

/* ---------- Status transitions (ADMIN only on the back-end) ---------- */

export async function approveSupplier(id) {
  const { data } = await apiClient.post(`${BASE}/${id}/approve`, {});
  return data;
}
export async function deactivateSupplier(id, reason) {
  const { data } = await apiClient.post(`${BASE}/${id}/deactivate`, { reason });
  return data;
}
export async function reactivateSupplier(id) {
  const { data } = await apiClient.post(`${BASE}/${id}/reactivate`, {});
  return data;
}
export async function blacklistSupplier(id, reason) {
  const { data } = await apiClient.post(`${BASE}/${id}/blacklist`, { reason });
  return data;
}
export async function deleteSupplier(id) {
  const { data } = await apiClient.delete(`${BASE}/${id}`);
  return data;
}

export async function aggregationsByStatus() {
  const { data } = await apiClient.get(`${BASE}/aggregations/by-status`);
  return data;
}
export async function aggregationsByCategory() {
  const { data } = await apiClient.get(`${BASE}/aggregations/by-category`);
  return data;
}
export async function aggregationsByCountry() {
  const { data } = await apiClient.get(`${BASE}/aggregations/by-country`);
  return data;
}

function stripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}
