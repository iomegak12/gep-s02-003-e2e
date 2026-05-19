import axios from 'axios';
import { po, RAW_BASE_URLS } from './client';

export async function listPurchaseOrders(params = {}) {
  const { data } = await po.get('/purchase-orders', { params });
  return data;
}

export async function getPurchaseOrder(id) {
  const { data } = await po.get(`/purchase-orders/${id}`);
  return data;
}

export async function getLineItems(id) {
  const { data } = await po.get(`/purchase-orders/${id}/line-items`);
  return data;
}

export async function pendingApprovals() {
  const { data } = await po.get('/purchase-orders/aggregations/pending-approvals');
  return data;
}

export async function approvePO(id) {
  const { data } = await po.post(`/purchase-orders/${id}/approve`, {});
  return data;
}

export async function rejectPO(id, reason) {
  const { data } = await po.post(`/purchase-orders/${id}/reject`, { reason });
  return data;
}

export async function aggByStatus() {
  const { data } = await po.get('/purchase-orders/aggregations/by-status');
  return data;
}

export async function monthlySpend(year) {
  const { data } = await po.get('/purchase-orders/aggregations/monthly-spend', { params: { year } });
  return data;
}

export async function cycleTime() {
  const { data } = await po.get('/purchase-orders/aggregations/cycle-time');
  return data;
}

export async function pingHealth() {
  const { data } = await axios.get(`${RAW_BASE_URLS.PO_URL}/health`, { timeout: 5000 });
  return data;
}
