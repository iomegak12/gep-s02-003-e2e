const { get } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');

describe('supplier: search & aggregations', () => {
  let buyerToken;
  beforeAll(async () => {
    buyerToken = await tokens.buyer();
  });

  it('GET /search returns matches against seeded suppliers', async () => {
    const res = await get('supplier', '/api/v1/suppliers/search', {
      token: buyerToken,
      params: { q: 'Acme', limit: 10 },
    });
    expect(res.status).toBe(200);
    const items = Array.isArray(res.data) ? res.data : res.data.data;
    expect(Array.isArray(items)).toBe(true);
  });

  it('GET /aggregations/by-category returns grouped counts', async () => {
    const res = await get('supplier', '/api/v1/suppliers/aggregations/by-category', { token: buyerToken });
    expect(res.status).toBe(200);
    const items = Array.isArray(res.data) ? res.data : res.data.data;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    items.forEach(it => {
      expect(it.category ?? it._id).toBeDefined();
      expect(typeof (it.count ?? it.total)).toBe('number');
    });
  });

  it('GET /aggregations/by-country returns groups', async () => {
    const res = await get('supplier', '/api/v1/suppliers/aggregations/by-country', { token: buyerToken });
    expect(res.status).toBe(200);
    const items = Array.isArray(res.data) ? res.data : res.data.data;
    expect(items.length).toBeGreaterThan(0);
  });

  it('GET /aggregations/by-status returns groups', async () => {
    const res = await get('supplier', '/api/v1/suppliers/aggregations/by-status', { token: buyerToken });
    expect(res.status).toBe(200);
    const items = Array.isArray(res.data) ? res.data : res.data.data;
    expect(items.length).toBeGreaterThan(0);
  });

  it('GET /aggregations/top-rated respects limit clamp', async () => {
    const res = await get('supplier', '/api/v1/suppliers/aggregations/top-rated', {
      token: buyerToken,
      params: { limit: 5, min_orders: 0 },
    });
    expect(res.status).toBe(200);
    const items = Array.isArray(res.data) ? res.data : res.data.data;
    expect(items.length).toBeLessThanOrEqual(5);
  });
});
