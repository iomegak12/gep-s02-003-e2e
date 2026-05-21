const { post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makePoPayload } = require('../../helpers/fixtures');
const { createActiveSupplier } = require('../../helpers/supplier-helper');
const { expectErrorEnvelope, expectOk } = require('../../helpers/assert');
const { env } = require('../../helpers/env');

describe('po: state machine', () => {
  let buyerToken;
  let approverHiToken;
  let supplierId;

  beforeAll(async () => {
    buyerToken = await tokens.buyer();
    approverHiToken = await tokens.approverHi();
    supplierId = (await createActiveSupplier()).id;
  });

  async function newDraft(total) {
    const res = await post('po', '/api/v1/purchase-orders', makePoPayload({ supplier_id: supplierId, total }), {
      token: buyerToken,
    });
    expect(res.status).toBe(201);
    return res.data;
  }

  it('submit on low-value PO auto-approves (total ≤ threshold)', async () => {
    const po = await newDraft(env.approvalThreshold - 1);
    const res = await post('po', `/api/v1/purchase-orders/${po.id}/submit`, {}, { token: buyerToken });
    expectOk(res);
    expect(res.data.status).toBe('APPROVED');
    expect(res.data.auto_approved).toBe(true);
  });

  it('submit on high-value PO goes to SUBMITTED (not auto-approved)', async () => {
    const po = await newDraft(env.approvalThreshold + 50000);
    const res = await post('po', `/api/v1/purchase-orders/${po.id}/submit`, {}, { token: buyerToken });
    expectOk(res);
    expect(res.data.status).toBe('SUBMITTED');
  });

  it('approve a SUBMITTED PO as high-limit approver', async () => {
    const po = await newDraft(env.approvalThreshold + 50000);
    await post('po', `/api/v1/purchase-orders/${po.id}/submit`, {}, { token: buyerToken });
    const res = await post('po', `/api/v1/purchase-orders/${po.id}/approve`, {}, { token: approverHiToken });
    expectOk(res);
    expect(res.data.status).toBe('APPROVED');
  });

  it('reject moves a SUBMITTED PO to REJECTED', async () => {
    const po = await newDraft(env.approvalThreshold + 50000);
    await post('po', `/api/v1/purchase-orders/${po.id}/submit`, {}, { token: buyerToken });
    const res = await post(
      'po',
      `/api/v1/purchase-orders/${po.id}/reject`,
      { reason: 'duplicate' },
      { token: approverHiToken },
    );
    expectOk(res);
    expect(res.data.status).toBe('REJECTED');
  });

  it('fulfill an APPROVED PO with actual_delivery_date', async () => {
    const po = await newDraft(env.approvalThreshold - 100);
    await post('po', `/api/v1/purchase-orders/${po.id}/submit`, {}, { token: buyerToken });
    const res = await post(
      'po',
      `/api/v1/purchase-orders/${po.id}/fulfill`,
      { actual_delivery_date: '2026-01-15' },
      { token: buyerToken },
    );
    expectOk(res);
    expect(res.data.status).toBe('FULFILLED');
  });

  it('close a FULFILLED PO', async () => {
    const po = await newDraft(env.approvalThreshold - 100);
    await post('po', `/api/v1/purchase-orders/${po.id}/submit`, {}, { token: buyerToken });
    await post('po', `/api/v1/purchase-orders/${po.id}/fulfill`, { actual_delivery_date: '2026-01-15' }, { token: buyerToken });
    const res = await post('po', `/api/v1/purchase-orders/${po.id}/close`, {}, { token: buyerToken });
    expectOk(res);
    expect(res.data.status).toBe('CLOSED');
  });

  it('cancel a DRAFT PO', async () => {
    const po = await newDraft(100);
    const res = await post('po', `/api/v1/purchase-orders/${po.id}/cancel`, { reason: 'oops' }, { token: buyerToken });
    expectOk(res);
    expect(res.data.status).toBe('CANCELLED');
  });

  it('revise a REJECTED PO back to DRAFT', async () => {
    const po = await newDraft(env.approvalThreshold + 50000);
    await post('po', `/api/v1/purchase-orders/${po.id}/submit`, {}, { token: buyerToken });
    await post('po', `/api/v1/purchase-orders/${po.id}/reject`, { reason: 'rev' }, { token: approverHiToken });
    const res = await post('po', `/api/v1/purchase-orders/${po.id}/revise`, {}, { token: buyerToken });
    expectOk(res);
    expect(res.data.status).toBe('DRAFT');
  });

  it('invalid transition (approve a DRAFT) → 409 INVALID_STATUS_TRANSITION', async () => {
    const po = await newDraft(100);
    const res = await post('po', `/api/v1/purchase-orders/${po.id}/approve`, {}, { token: approverHiToken });
    expectErrorEnvelope(res, 'INVALID_STATUS_TRANSITION', 409);
  });
});
