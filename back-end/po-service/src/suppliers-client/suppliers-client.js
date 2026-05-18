const axios = require('axios');
const { AppError } = require('../common/errors');

const RETRY_DELAYS = [200, 800];
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000;

const state = {
  failures: 0,
  openedAt: null,
};

const http = axios.create({
  baseURL: process.env.SUPPLIER_SERVICE_URL,
  timeout: 5_000,
});

async function withRetry(fn) {
  if (state.openedAt && Date.now() - state.openedAt < COOLDOWN_MS) {
    throw new AppError(503, 'SUPPLIER_SERVICE_UNAVAILABLE', 'Circuit breaker open');
  }
  let lastErr;
  for (let i = 0; i <= RETRY_DELAYS.length; i++) {
    try {
      const res = await fn();
      state.failures = 0;
      state.openedAt = null;
      return res;
    } catch (e) {
      lastErr = e;
      if (e.response && e.response.status >= 400 && e.response.status < 500) break;
      if (i < RETRY_DELAYS.length) await new Promise(r => setTimeout(r, RETRY_DELAYS[i]));
    }
  }
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) state.openedAt = Date.now();
  throw lastErr;
}

function headers(req) {
  const h = {};
  if (req.headers.authorization) h.Authorization = req.headers.authorization;
  if (req.correlationId) h['X-Correlation-Id'] = req.correlationId;
  return h;
}

async function getSupplier(req, id) {
  try {
    const res = await withRetry(() => http.get(`/suppliers/${id}`, { headers: headers(req) }));
    return res.data;
  } catch (e) {
    if (e.response?.status === 404) {
      throw new AppError(422, 'SUPPLIER_NOT_FOUND', `Supplier ${id} not found`, { supplier_id: id });
    }
    throw e;
  }
}

async function getSuppliersByIds(req, ids) {
  const results = await Promise.all(
    ids.map(id =>
      http
        .get(`/suppliers/${id}`, { headers: headers(req) })
        .then(r => [id, r.data])
        .catch(() => [id, null]),
    ),
  );
  return Object.fromEntries(results.filter(([, v]) => v));
}

module.exports = { getSupplier, getSuppliersByIds };
