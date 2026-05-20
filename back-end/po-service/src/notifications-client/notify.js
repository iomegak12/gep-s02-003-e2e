// Fire-and-forget push notification client.
// Calls IAM's internal endpoint POST /api/v1/internal/notifications/users with a shared secret.
// Errors are logged but never propagated to the caller — a failed push must never break a PO transition.

const axios = require('axios');

const iamUrl = process.env.AUTH_SERVICE_URL || process.env.IAM_URL || 'http://localhost:3001';
const secret = process.env.INTERNAL_SERVICE_TOKEN;

const http = axios.create({
  baseURL: `${iamUrl}/api/v1/internal`,
  timeout: 5_000,
});

function deepLinkForPo(poId) {
  return `/(app)/purchase-orders/${poId}`;
}

/**
 * Send a notification. `params` accepts the same shape as IAM's endpoint
 * (user_ids, roles, min_approval_limit, title, body, data, deep_link).
 * Returns the IAM response on success, or null on error.
 */
async function notify(params, correlationId) {
  if (!secret) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[notify] INTERNAL_SERVICE_TOKEN not set; skipping push for', params.title);
    }
    return null;
  }
  try {
    const headers = { 'X-Internal-Token': secret };
    if (correlationId) headers['X-Correlation-Id'] = correlationId;
    const { data } = await http.post('/notifications/users', params, { headers });
    return data;
  } catch (e) {
    const status = e.response?.status;
    const body = e.response?.data;
    console.warn(`[notify] failed (${status || 'no-response'}):`, body || e.message);
    return null;
  }
}

// --- Event helpers ---
// Each returns a promise that callers can either await or `.catch` and forget.

function poSubmitted(po, correlationId) {
  return notify({
    roles: ['APPROVER', 'ADMIN'],
    min_approval_limit: Number(po.total_amount),
    title: 'PO awaiting approval',
    body: `${po.po_number} from ${po.supplier_snapshot?.display_name || 'supplier'} · ${po.currency} ${po.total_amount}`,
    deep_link: '/(app)/approvals',
    data: { event: 'po.submitted', po_id: String(po.id), po_number: po.po_number },
  }, correlationId);
}

function poApproved(po, correlationId) {
  return notify({
    user_ids: po.buyer_id ? [po.buyer_id] : undefined,
    roles: ['ADMIN'],
    title: 'PO approved',
    body: `${po.po_number} · ${po.currency} ${po.total_amount} was approved`,
    deep_link: deepLinkForPo(po.id),
    data: { event: 'po.approved', po_id: String(po.id), po_number: po.po_number },
  }, correlationId);
}

function poRejected(po, reason, correlationId) {
  const trimmedReason = reason ? String(reason).slice(0, 120) : '';
  return notify({
    user_ids: po.buyer_id ? [po.buyer_id] : undefined,
    roles: ['ADMIN'],
    title: 'PO rejected',
    body: trimmedReason
      ? `${po.po_number} was rejected — ${trimmedReason}`
      : `${po.po_number} was rejected`,
    deep_link: deepLinkForPo(po.id),
    data: { event: 'po.rejected', po_id: String(po.id), po_number: po.po_number },
  }, correlationId);
}

function poFulfilled(po, correlationId) {
  return notify({
    roles: ['APPROVER', 'ADMIN'],
    title: 'PO fulfilled',
    body: `${po.po_number} marked fulfilled`,
    deep_link: deepLinkForPo(po.id),
    data: { event: 'po.fulfilled', po_id: String(po.id), po_number: po.po_number },
  }, correlationId);
}

function poClosed(po, correlationId) {
  return notify({
    roles: ['APPROVER', 'ADMIN'],
    title: 'PO closed',
    body: `${po.po_number} closed`,
    deep_link: deepLinkForPo(po.id),
    data: { event: 'po.closed', po_id: String(po.id), po_number: po.po_number },
  }, correlationId);
}

module.exports = { notify, poSubmitted, poApproved, poRejected, poFulfilled, poClosed };
