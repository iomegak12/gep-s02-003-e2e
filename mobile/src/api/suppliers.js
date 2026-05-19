import axios from 'axios';
import { supplier, RAW_BASE_URLS } from './client';

export async function listSuppliers(params = {}) {
  const { data } = await supplier.get('/suppliers', { params });
  return data;
}

export async function getSupplier(id) {
  const { data } = await supplier.get(`/suppliers/${id}`);
  return data;
}

export async function getSupplierScorecard(id) {
  const { data } = await supplier.get(`/suppliers/${id}/scorecard`);
  return data;
}

export async function searchSuppliers(q, limit = 20) {
  const { data } = await supplier.get('/suppliers/search', { params: { q, limit } });
  return data;
}

export async function aggByStatus() {
  const { data } = await supplier.get('/suppliers/aggregations/by-status');
  return data;
}

export async function aggByCategory() {
  const { data } = await supplier.get('/suppliers/aggregations/by-category');
  return data;
}

export async function aggByCountry() {
  const { data } = await supplier.get('/suppliers/aggregations/by-country');
  return data;
}

export async function pingHealth() {
  const { data } = await axios.get(`${RAW_BASE_URLS.SUPPLIER_URL}/health`, { timeout: 5000 });
  return data;
}
