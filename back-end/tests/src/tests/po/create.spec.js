const { get, post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makePoPayload } = require('../../helpers/fixtures');
const { createActiveSupplier } = require('../../helpers/supplier-helper');
const { expectErrorEnvelope } = require('../../helpers/assert');

describe('po: POST /purchase-orders', () => {
  let buyerToken;
  let supplierId;

  beforeAll(async () => {
    buyerToken = await tokens.buyer();
    supplierId = (await createActiveSupplier()).id;
  });

  it('creates a PO in DRAFT with auto-generated po_number and supplier_snapshot', async () => {
    const res = await post('po', '/api/v1/purchase-orders', makePoPayload({ supplier_id: supplierId, total: 1000 }), {
      token: buyerToken,
    });
    expect(res.status).toBe(201);
    expect(res.data.status).toBe('DRAFT');
    expect(res.data.po_number).toMatch(/^PO-\d{4}-\d{5}$/);
    expect(res.data.supplier_id).toBe(supplierId);
    expect(res.data.supplier_snapshot).toBeDefined();
    expect(res.data.supplier_snapshot.category).toBeDefined();
    expect(Number(res.data.total_amount)).toBeGreaterThan(0);
  });

  it('GET /:id returns the PO', async () => {
    const create = await post('po', '/api/v1/purchase-orders', makePoPayload({ supplier_id: supplierId }), { token: buyerToken });
    const res = await get('po', `/api/v1/purchase-orders/${create.data.id}`, { token: buyerToken });
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(create.data.id);
  });

  it('GET /:id unknown returns 404', async () => {
    const res = await get('po', '/api/v1/purchase-orders/00000000-0000-0000-0000-000000000000', { token: buyerToken });
    expectErrorEnvelope(res, 'PURCHASE_ORDER_NOT_FOUND', 404);
  });

  it('rejects PO with no line_items (validation)', async () => {
    const payload = makePoPayload({ supplier_id: supplierId });
    payload.line_items = [];
    const res = await post('po', '/api/v1/purchase-orders', payload, { token: buyerToken });
    expectErrorEnvelope(res, 'VALIDATION_FAILED', 400);
  });

  it('rejects without auth: 401', async () => {
    const res = await post('po', '/api/v1/purchase-orders', makePoPayload({ supplier_id: supplierId }));
    expectErrorEnvelope(res, 'AUTH_REQUIRED', 401);
  });
});
