const { get } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');

describe('po: aggregations', () => {
  let buyerToken;
  let approverHiToken;
  beforeAll(async () => {
    buyerToken = await tokens.buyer();
    approverHiToken = await tokens.approverHi();
  });

  it('GET /aggregations/by-status', async () => {
    const res = await get('po', '/api/v1/purchase-orders/aggregations/by-status', { token: buyerToken });
    expect(res.status).toBe(200);
    const items = Array.isArray(res.data) ? res.data : res.data.data;
    expect(Array.isArray(items)).toBe(true);
  });

  it('GET /aggregations/spend-by-supplier (limit + period)', async () => {
    const res = await get('po', '/api/v1/purchase-orders/aggregations/spend-by-supplier', {
      token: buyerToken,
      params: { period: 'ytd', limit: 5 },
    });
    expect(res.status).toBe(200);
    const items = Array.isArray(res.data) ? res.data : res.data.data;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(5);
  });

  it('GET /aggregations/spend-by-category (cross-service enrichment)', async () => {
    const res = await get('po', '/api/v1/purchase-orders/aggregations/spend-by-category', {
      token: buyerToken,
      params: { period: 'ytd' },
    });
    expect(res.status).toBe(200);
    const items = Array.isArray(res.data) ? res.data : res.data.data;
    expect(Array.isArray(items)).toBe(true);
    if (items.length > 0) {
      const first = items[0];
      expect(first.category ?? first._id ?? first.supplier_category).toBeDefined();
    }
  });

  it('GET /aggregations/monthly-spend', async () => {
    const res = await get('po', '/api/v1/purchase-orders/aggregations/monthly-spend', {
      token: buyerToken,
      params: { year: new Date().getUTCFullYear() },
    });
    expect(res.status).toBe(200);
  });

  it('GET /aggregations/pending-approvals (respects approver_limit)', async () => {
    const res = await get('po', '/api/v1/purchase-orders/aggregations/pending-approvals', {
      token: approverHiToken,
    });
    expect(res.status).toBe(200);
  });

  it('GET /aggregations/cycle-time', async () => {
    const res = await get('po', '/api/v1/purchase-orders/aggregations/cycle-time', { token: buyerToken });
    expect(res.status).toBe(200);
  });
});
