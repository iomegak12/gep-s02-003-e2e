const { post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makePoPayload } = require('../../helpers/fixtures');
const { createActiveSupplier } = require('../../helpers/supplier-helper');
const { expectErrorEnvelope } = require('../../helpers/assert');
const { env } = require('../../helpers/env');

describe('po: approval-limit enforcement', () => {
  let buyerToken;
  let approverLoToken;
  let approverHiToken;
  let supplierId;

  beforeAll(async () => {
    buyerToken = await tokens.buyer();
    approverLoToken = await tokens.approverLo();
    approverHiToken = await tokens.approverHi();
    supplierId = (await createActiveSupplier()).id;
  });

  it('low-limit approver hitting a high-value PO → 403 APPROVAL_LIMIT_EXCEEDED', async () => {
    const big = Math.max(env.approvalThreshold + 50000, 200000);
    const create = await post(
      'po',
      '/api/v1/purchase-orders',
      makePoPayload({ supplier_id: supplierId, total: big }),
      { token: buyerToken },
    );
    expect(create.status).toBe(201);
    const submit = await post('po', `/api/v1/purchase-orders/${create.data.id}/submit`, {}, { token: buyerToken });
    expect(submit.data.status).toBe('SUBMITTED');
    const res = await post('po', `/api/v1/purchase-orders/${create.data.id}/approve`, {}, { token: approverLoToken });
    expectErrorEnvelope(res, 'APPROVAL_LIMIT_EXCEEDED', 403);
  });

  it('high-limit approver succeeds on the same PO', async () => {
    const big = Math.max(env.approvalThreshold + 50000, 200000);
    const create = await post(
      'po',
      '/api/v1/purchase-orders',
      makePoPayload({ supplier_id: supplierId, total: big }),
      { token: buyerToken },
    );
    await post('po', `/api/v1/purchase-orders/${create.data.id}/submit`, {}, { token: buyerToken });
    const res = await post('po', `/api/v1/purchase-orders/${create.data.id}/approve`, {}, { token: approverHiToken });
    expect([200, 201]).toContain(res.status);
    expect(res.data.status).toBe('APPROVED');
  });
});
