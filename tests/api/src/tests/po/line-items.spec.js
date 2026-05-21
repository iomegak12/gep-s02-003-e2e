const { del, get, patch, post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makePoPayload } = require('../../helpers/fixtures');
const { createActiveSupplier } = require('../../helpers/supplier-helper');
const { expectErrorEnvelope } = require('../../helpers/assert');

async function createDraftPo(supplierId, buyerToken, total = 1000) {
  const res = await post('po', '/api/v1/purchase-orders', makePoPayload({ supplier_id: supplierId, total }), {
    token: buyerToken,
  });
  expect(res.status).toBe(201);
  return res.data;
}

describe('po: nested line items', () => {
  let buyerToken;
  let supplierId;

  beforeAll(async () => {
    buyerToken = await tokens.buyer();
    supplierId = (await createActiveSupplier()).id;
  });

  it('POST a new line item recomputes totals', async () => {
    const po = await createDraftPo(supplierId, buyerToken);
    const totalBefore = Number(po.total_amount);
    const res = await post(
      'po',
      `/api/v1/purchase-orders/${po.id}/line-items`,
      {
        line_number: 2,
        item_description: 'Second item',
        quantity: 2,
        unit_of_measure: 'EA',
        unit_price: 500,
        tax_rate: 0,
      },
      { token: buyerToken },
    );
    expect(res.status).toBe(201);
    const after = await get('po', `/api/v1/purchase-orders/${po.id}`, { token: buyerToken });
    expect(after.status).toBe(200);
    expect(Number(after.data.total_amount)).toBeGreaterThan(totalBefore);
  });

  it('GET line items returns the list', async () => {
    const po = await createDraftPo(supplierId, buyerToken);
    const res = await get('po', `/api/v1/purchase-orders/${po.id}/line-items`, { token: buyerToken });
    expect(res.status).toBe(200);
    const items = Array.isArray(res.data) ? res.data : res.data.data ?? res.data;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it('PATCH updates a line item', async () => {
    const po = await createDraftPo(supplierId, buyerToken);
    const list = await get('po', `/api/v1/purchase-orders/${po.id}/line-items`, { token: buyerToken });
    const items = Array.isArray(list.data) ? list.data : list.data.data ?? list.data;
    const target = items[0];
    expect(target).toBeDefined();
    const res = await patch(
      'po',
      `/api/v1/purchase-orders/${po.id}/line-items/${target.id}`,
      { quantity: 3, unit_price: 250 },
      { token: buyerToken },
    );
    expect(res.status).toBe(200);
  });

  it('DELETE removes a line item', async () => {
    const po = await post(
      'po',
      '/api/v1/purchase-orders',
      makePoPayload({
        supplier_id: supplierId,
        lines: [
          { line_number: 1, item_description: 'a', quantity: 1, unit_of_measure: 'EA', unit_price: 500, tax_rate: 0 },
          { line_number: 2, item_description: 'b', quantity: 1, unit_of_measure: 'EA', unit_price: 500, tax_rate: 0 },
        ],
      }),
      { token: buyerToken },
    );
    expect(po.status).toBe(201);
    const list = await get('po', `/api/v1/purchase-orders/${po.data.id}/line-items`, { token: buyerToken });
    const items = Array.isArray(list.data) ? list.data : list.data.data ?? list.data;
    const last = items[items.length - 1];
    const res = await del('po', `/api/v1/purchase-orders/${po.data.id}/line-items/${last.id}`, { token: buyerToken });
    expect([200, 204]).toContain(res.status);
  });

  it('line-item add blocked once PO is not DRAFT (INVALID_STATE_FOR_EDIT)', async () => {
    const po = await createDraftPo(supplierId, buyerToken, 100);
    const submit = await post('po', `/api/v1/purchase-orders/${po.id}/submit`, {}, { token: buyerToken });
    expect([200, 201]).toContain(submit.status);
    expect(submit.data.status).toBe('APPROVED');
    const res = await post(
      'po',
      `/api/v1/purchase-orders/${po.id}/line-items`,
      { line_number: 99, item_description: 'late', quantity: 1, unit_of_measure: 'EA', unit_price: 10 },
      { token: buyerToken },
    );
    expectErrorEnvelope(res, 'INVALID_STATE_FOR_EDIT', 409);
  });
});
