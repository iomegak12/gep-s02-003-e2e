const { post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makePoPayload } = require('../../helpers/fixtures');
const { createActiveSupplier } = require('../../helpers/supplier-helper');
const { expectErrorEnvelope } = require('../../helpers/assert');

describe('po: role-based access', () => {
  let buyerToken;
  let approverHiToken;
  let supplierId;

  beforeAll(async () => {
    buyerToken = await tokens.buyer();
    approverHiToken = await tokens.approverHi();
    supplierId = (await createActiveSupplier()).id;
  });

  it('APPROVER cannot create a PO (403)', async () => {
    const res = await post('po', '/api/v1/purchase-orders', makePoPayload({ supplier_id: supplierId }), {
      token: approverHiToken,
    });
    expectErrorEnvelope(res, 'INSUFFICIENT_ROLE', 403);
  });

  it('BUYER cannot approve a PO (403)', async () => {
    const create = await post('po', '/api/v1/purchase-orders', makePoPayload({ supplier_id: supplierId, total: 500000 }), {
      token: buyerToken,
    });
    await post('po', `/api/v1/purchase-orders/${create.data.id}/submit`, {}, { token: buyerToken });
    const res = await post('po', `/api/v1/purchase-orders/${create.data.id}/approve`, {}, { token: buyerToken });
    expectErrorEnvelope(res, 'INSUFFICIENT_ROLE', 403);
  });
});
