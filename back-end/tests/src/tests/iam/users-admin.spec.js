const { get, patch, post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { expectErrorEnvelope, expectPaginated } = require('../../helpers/assert');

describe('iam: admin user management', () => {
  let adminToken;
  let buyerToken;
  let createdId;
  const newEmail = `user-${Date.now()}@example.com`;

  beforeAll(async () => {
    adminToken = await tokens.admin();
    buyerToken = await tokens.buyer();
  });

  it('POST /users creates a user (201)', async () => {
    const res = await post(
      'iam',
      '/api/v1/auth/users',
      { email: newEmail, full_name: 'New User', password: 'Passw0rd!', roles: ['BUYER'] },
      { token: adminToken },
    );
    expect(res.status).toBe(201);
    expect(res.data.email).toBe(newEmail.toLowerCase());
    expect(res.data.roles).toContain('BUYER');
    createdId = res.data.id;
  });

  it('POST /users duplicate email returns 409 DUPLICATE_RESOURCE', async () => {
    const res = await post(
      'iam',
      '/api/v1/auth/users',
      { email: newEmail, full_name: 'dup', password: 'Passw0rd!', roles: ['BUYER'] },
      { token: adminToken },
    );
    expectErrorEnvelope(res, 'DUPLICATE_RESOURCE', 409);
  });

  it('POST /users as buyer returns 403 INSUFFICIENT_ROLE', async () => {
    const res = await post(
      'iam',
      '/api/v1/auth/users',
      { email: `nope-${Date.now()}@x.com`, full_name: 'x', password: 'Passw0rd!', roles: ['BUYER'] },
      { token: buyerToken },
    );
    expectErrorEnvelope(res, 'INSUFFICIENT_ROLE', 403);
  });

  it('GET /users paginates', async () => {
    const res = await get('iam', '/api/v1/auth/users', { token: adminToken, params: { page: 1, page_size: 5 } });
    expectPaginated(res);
    expect(res.data.data.length).toBeLessThanOrEqual(5);
  });

  it('GET /users/:id returns the created user', async () => {
    const res = await get('iam', `/api/v1/auth/users/${createdId}`, { token: adminToken });
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(createdId);
  });

  it('GET /users/:id unknown id returns 404 USER_NOT_FOUND', async () => {
    const res = await get('iam', '/api/v1/auth/users/00000000-0000-0000-0000-000000000000', { token: adminToken });
    expectErrorEnvelope(res, 'USER_NOT_FOUND', 404);
  });

  it('PATCH /users/:id updates roles + approval_limit', async () => {
    const res = await patch(
      'iam',
      `/api/v1/auth/users/${createdId}`,
      { roles: ['APPROVER'], approval_limit: 75000 },
      { token: adminToken },
    );
    expect(res.status).toBe(200);
    expect(res.data.roles).toContain('APPROVER');
    expect(Number(res.data.approval_limit)).toBe(75000);
  });

  it('POST /users/:id/reset-password returns 204', async () => {
    const res = await post(
      'iam',
      `/api/v1/auth/users/${createdId}/reset-password`,
      { password: 'BrandNew1!' },
      { token: adminToken },
    );
    expect(res.status).toBe(204);
    const login = await post('iam', '/api/v1/auth/login', { email: newEmail, password: 'BrandNew1!' });
    expect(login.status).toBe(200);
  });

  it('PATCH is_active=false makes the user fail login', async () => {
    await patch('iam', `/api/v1/auth/users/${createdId}`, { is_active: false }, { token: adminToken });
    const res = await post('iam', '/api/v1/auth/login', { email: newEmail, password: 'BrandNew1!' });
    expectErrorEnvelope(res, 'AUTH_FAILED', 401);
  });

  it('Admin endpoints require auth (401 AUTH_REQUIRED)', async () => {
    const res = await get('iam', '/api/v1/auth/users');
    expectErrorEnvelope(res, 'AUTH_REQUIRED', 401);
  });
});
