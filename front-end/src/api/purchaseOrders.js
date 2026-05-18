import { apiClient } from './client.js';

const BASE = '/api/v1/purchase-orders';

/**
 * GET /api/v1/purchase-orders
 * @param {{page?:number, page_size?:number, status?:string, q?:string, sort?:string}} params
 * @returns {{ data: Array, page:number, page_size:number, total:number }}
 */
export async function listPurchaseOrders(params = {}) {
  const clean = stripEmpty(params);
  const { data } = await apiClient.get(BASE, { params: clean });
  return data;
}

export async function searchPurchaseOrders(q, limit = 10) {
  if (!q || !q.trim()) return { data: [] };
  const { data } = await apiClient.get(`${BASE}/search`, { params: { q, limit } });
  return data;
}

export async function createPurchaseOrder(payload) {
  const { data } = await apiClient.post(BASE, payload);
  return data;
}

/* ---------- Line items (DRAFT only on the back-end) ---------- */
export async function addLineItem(poId, item) {
  const { data } = await apiClient.post(`${BASE}/${poId}/line-items`, item);
  return data;
}
export async function updateLineItem(poId, lineId, patch) {
  const { data } = await apiClient.patch(`${BASE}/${poId}/line-items/${lineId}`, patch);
  return data;
}
export async function deleteLineItem(poId, lineId) {
  const { data } = await apiClient.delete(`${BASE}/${poId}/line-items/${lineId}`);
  return data;
}

export async function getPurchaseOrder(id) {
  const { data } = await apiClient.get(`${BASE}/${id}`);
  return data;
}

/** The line-items endpoint may return a raw array OR `{ data: [...] }`. Normalise. */
export async function getPoLineItems(id) {
  const { data } = await apiClient.get(`${BASE}/${id}/line-items`);
  return Array.isArray(data) ? data : (data?.data || []);
}

/* ---------- Status transitions ---------- */
export async function submitPo(id)             { const { data } = await apiClient.post(`${BASE}/${id}/submit`,  {});       return data; }
export async function approvePo(id)            { const { data } = await apiClient.post(`${BASE}/${id}/approve`, {});       return data; }
export async function rejectPo(id, reason)     { const { data } = await apiClient.post(`${BASE}/${id}/reject`,  { reason }); return data; }
export async function fulfillPo(id, actual_delivery_date) {
  const { data } = await apiClient.post(`${BASE}/${id}/fulfill`, { actual_delivery_date });
  return data;
}
export async function cancelPo(id, reason)     { const { data } = await apiClient.post(`${BASE}/${id}/cancel`,  { reason }); return data; }
export async function revisePo(id)             { const { data } = await apiClient.post(`${BASE}/${id}/revise`,  {});       return data; }
export async function closePo(id)              { const { data } = await apiClient.post(`${BASE}/${id}/close`,   {});       return data; }

/* ---------- Aggregations ---------- */
export async function poAggregationsByStatus()  { const { data } = await apiClient.get(`${BASE}/aggregations/by-status`);            return data; }
export async function poMonthlySpend(year)      { const { data } = await apiClient.get(`${BASE}/aggregations/monthly-spend`, { params: { year } }); return data; }
export async function poSpendBySupplier(period = 'ytd', limit = 10) {
  const { data } = await apiClient.get(`${BASE}/aggregations/spend-by-supplier`, { params: { period, limit } });
  return data;
}
export async function poPendingApprovals()      { const { data } = await apiClient.get(`${BASE}/aggregations/pending-approvals`);    return data; }
export async function poCycleTime()             { const { data } = await apiClient.get(`${BASE}/aggregations/cycle-time`);          return data; }

function stripEmpty(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}
