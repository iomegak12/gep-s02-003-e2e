const { post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makePoPayload } = require('../../helpers/fixtures');
const { createActiveSupplier } = require('../../helpers/supplier-helper');

describe('cross-service: correlation-id propagation', () => {
  it('client-supplied X-Correlation-Id is echoed back on PO create', async () => {
    const buyer = await tokens.buyer();
    const supplier = await createActiveSupplier();
    const cid = `corr-test-${Date.now()}`;
    const res = await post('po', '/api/v1/purchase-orders', makePoPayload({ supplier_id: supplier.id }), {
      token: buyer,
      correlationId: cid,
    });
    expect(res.status).toBe(201);
    expect(res.headers['x-correlation-id']).toBe(cid);
  });

  it('error responses also carry the correlation_id in the envelope', async () => {
    const buyer = await tokens.buyer();
    const cid = `corr-err-${Date.now()}`;
    const res = await post(
      'po',
      '/api/v1/purchase-orders',
      makePoPayload({ supplier_id: '00000000-0000-0000-0000-000000000000' }),
      { token: buyer, correlationId: cid },
    );
    expect(res.status).toBe(422);
    expect(res.data.error.correlation_id).toBe(cid);
  });
});
