const { post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makeSupplierPayload } = require('../../helpers/fixtures');
const { expectErrorEnvelope } = require('../../helpers/assert');

async function createSupplier(buyerToken) {
  const res = await post('supplier', '/api/v1/suppliers', makeSupplierPayload(), { token: buyerToken });
  expect(res.status).toBe(201);
  return res.data.id;
}

describe('supplier: state transitions', () => {
  let buyerToken;
  let adminToken;

  beforeAll(async () => {
    buyerToken = await tokens.buyer();
    adminToken = await tokens.admin();
  });

  it('approve: PENDING_APPROVAL → ACTIVE', async () => {
    const id = await createSupplier(buyerToken);
    const res = await post('supplier', `/api/v1/suppliers/${id}/approve`, {}, { token: adminToken });
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ACTIVE');
  });

  it('deactivate then reactivate', async () => {
    const id = await createSupplier(buyerToken);
    await post('supplier', `/api/v1/suppliers/${id}/approve`, {}, { token: adminToken });
    const deact = await post(
      'supplier',
      `/api/v1/suppliers/${id}/deactivate`,
      { reason: 'temp pause' },
      { token: adminToken },
    );
    expect(deact.status).toBe(200);
    expect(deact.data.status).toBe('INACTIVE');
    const react = await post('supplier', `/api/v1/suppliers/${id}/reactivate`, {}, { token: adminToken });
    expect(react.status).toBe(200);
    expect(react.data.status).toBe('ACTIVE');
  });

  it('blacklist requires reason and lands in BLACKLISTED', async () => {
    const id = await createSupplier(buyerToken);
    await post('supplier', `/api/v1/suppliers/${id}/approve`, {}, { token: adminToken });
    const res = await post(
      'supplier',
      `/api/v1/suppliers/${id}/blacklist`,
      { reason: 'fraud' },
      { token: adminToken },
    );
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('BLACKLISTED');
    expect(res.data.blacklist_reason).toBe('fraud');
  });

  it('invalid transition (approve already-ACTIVE) returns 409 INVALID_STATUS_TRANSITION', async () => {
    const id = await createSupplier(buyerToken);
    await post('supplier', `/api/v1/suppliers/${id}/approve`, {}, { token: adminToken });
    const res = await post('supplier', `/api/v1/suppliers/${id}/approve`, {}, { token: adminToken });
    expectErrorEnvelope(res, 'INVALID_STATUS_TRANSITION', 409);
  });

  it('non-admin cannot approve: 403 INSUFFICIENT_ROLE', async () => {
    const id = await createSupplier(buyerToken);
    const res = await post('supplier', `/api/v1/suppliers/${id}/approve`, {}, { token: buyerToken });
    expectErrorEnvelope(res, 'INSUFFICIENT_ROLE', 403);
  });
});
