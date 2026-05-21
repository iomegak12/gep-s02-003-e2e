const { get } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { expectErrorEnvelope } = require('../../helpers/assert');

describe('cross-service: JWT issued by IAM is accepted by other services', () => {
  it('buyer token works against supplier-service', async () => {
    const buyer = await tokens.buyer();
    const res = await get('supplier', '/api/v1/suppliers', { token: buyer, params: { page_size: 1 } });
    expect(res.status).toBe(200);
  });

  it('buyer token works against po-service', async () => {
    const buyer = await tokens.buyer();
    const res = await get('po', '/api/v1/purchase-orders', { token: buyer, params: { page_size: 1 } });
    expect(res.status).toBe(200);
  });

  it('tampered token rejected by supplier-service (401 TOKEN_INVALID)', async () => {
    const buyer = await tokens.buyer();
    const tampered = buyer.slice(0, -2) + (buyer.slice(-2) === 'AA' ? 'BB' : 'AA');
    const res = await get('supplier', '/api/v1/suppliers', { token: tampered });
    expectErrorEnvelope(res, 'TOKEN_INVALID', 401);
  });

  it('tampered token rejected by po-service (401 TOKEN_INVALID)', async () => {
    const buyer = await tokens.buyer();
    const tampered = buyer.slice(0, -2) + (buyer.slice(-2) === 'AA' ? 'BB' : 'AA');
    const res = await get('po', '/api/v1/purchase-orders', { token: tampered });
    expectErrorEnvelope(res, 'TOKEN_INVALID', 401);
  });
});
