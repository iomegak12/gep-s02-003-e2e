const { get, post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makeSupplierPayload } = require('../../helpers/fixtures');

describe('supplier: scorecard', () => {
  it('GET /:id/scorecard returns metrics + trend stub', async () => {
    const buyer = await tokens.buyer();
    const admin = await tokens.admin();
    const create = await post('supplier', '/api/v1/suppliers', makeSupplierPayload(), { token: buyer });
    expect(create.status).toBe(201);
    await post('supplier', `/api/v1/suppliers/${create.data.id}/approve`, {}, { token: admin });

    const res = await get('supplier', `/api/v1/suppliers/${create.data.id}/scorecard`, { token: buyer });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(['rating', 'on_time_delivery_rate', 'total_orders_count'].some(k => k in res.data)).toBe(true);
  });
});
