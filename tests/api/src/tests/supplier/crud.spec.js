const { del, get, patch, post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makeSupplierPayload } = require('../../helpers/fixtures');
const { expectErrorEnvelope, expectPaginated } = require('../../helpers/assert');

describe('supplier: CRUD /api/v1/suppliers', () => {
  let buyerToken;
  let adminToken;
  let createdId;

  beforeAll(async () => {
    buyerToken = await tokens.buyer();
    adminToken = await tokens.admin();
  });

  it('POST creates a supplier in PENDING_APPROVAL', async () => {
    const payload = makeSupplierPayload({ category: 'PACKAGING', country: 'IN' });
    const res = await post('supplier', '/api/v1/suppliers', payload, { token: buyerToken });
    expect(res.status).toBe(201);
    expect(res.data.status).toBe('PENDING_APPROVAL');
    expect(res.data.supplier_code).toBe(payload.supplier_code);
    expect(res.data.id).toBeDefined();
    createdId = res.data.id;
  });

  it('POST duplicate supplier_code returns 409 DUPLICATE_RESOURCE', async () => {
    const payload = makeSupplierPayload();
    const first = await post('supplier', '/api/v1/suppliers', payload, { token: buyerToken });
    expect(first.status).toBe(201);
    const dup = await post('supplier', '/api/v1/suppliers', payload, { token: buyerToken });
    expectErrorEnvelope(dup, 'DUPLICATE_RESOURCE', 409);
  });

  it('GET /:id returns the created supplier', async () => {
    const res = await get('supplier', `/api/v1/suppliers/${createdId}`, { token: buyerToken });
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(createdId);
  });

  it('GET /:id unknown returns 404 SUPPLIER_NOT_FOUND', async () => {
    const res = await get('supplier', '/api/v1/suppliers/00000000-0000-0000-0000-000000000000', { token: buyerToken });
    expectErrorEnvelope(res, 'SUPPLIER_NOT_FOUND', 404);
  });

  it('PATCH updates a supplier', async () => {
    const res = await patch(
      'supplier',
      `/api/v1/suppliers/${createdId}`,
      { display_name: 'Renamed Co' },
      { token: buyerToken },
    );
    expect(res.status).toBe(200);
    expect(res.data.display_name).toBe('Renamed Co');
  });

  it('GET / paginates and supports filters', async () => {
    const res = await get('supplier', '/api/v1/suppliers', {
      token: buyerToken,
      params: { page: 1, page_size: 10, status: 'PENDING_APPROVAL' },
    });
    expectPaginated(res);
    expect(res.data.data.every(s => s.status === 'PENDING_APPROVAL')).toBe(true);
  });

  it('DELETE soft-deletes (admin only)', async () => {
    const res = await del('supplier', `/api/v1/suppliers/${createdId}`, { token: adminToken });
    expect(res.status).toBe(204);
    const after = await get('supplier', `/api/v1/suppliers/${createdId}`, { token: buyerToken });
    if (after.status === 200) {
      expect(after.data.deleted_at).toBeTruthy();
    } else {
      expectErrorEnvelope(after, 'SUPPLIER_NOT_FOUND', 404);
    }
  });

  it('Unauthenticated request returns 401 AUTH_REQUIRED', async () => {
    const res = await get('supplier', '/api/v1/suppliers');
    expectErrorEnvelope(res, 'AUTH_REQUIRED', 401);
  });
});
