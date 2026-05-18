const { get } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { expectPaginated } = require('../../helpers/assert');

describe('po: list & search', () => {
  let buyerToken;
  beforeAll(async () => {
    buyerToken = await tokens.buyer();
  });

  it('GET /purchase-orders is paginated', async () => {
    const res = await get('po', '/api/v1/purchase-orders', { token: buyerToken, params: { page: 1, page_size: 5 } });
    expectPaginated(res);
    expect(res.data.data.length).toBeLessThanOrEqual(5);
  });

  it('GET /purchase-orders filters by status', async () => {
    const res = await get('po', '/api/v1/purchase-orders', {
      token: buyerToken,
      params: { status: 'DRAFT', page_size: 10 },
    });
    expectPaginated(res);
    expect(res.data.data.every(p => p.status === 'DRAFT')).toBe(true);
  });

  it('GET /purchase-orders/search returns matches', async () => {
    const res = await get('po', '/api/v1/purchase-orders/search', {
      token: buyerToken,
      params: { q: 'PO-', limit: 5 },
    });
    expect(res.status).toBe(200);
    const items = Array.isArray(res.data) ? res.data : res.data.data ?? res.data;
    expect(Array.isArray(items)).toBe(true);
  });
});
