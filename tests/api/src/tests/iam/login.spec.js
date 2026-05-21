const { post } = require('../../helpers/http');
const { env } = require('../../helpers/env');
const { expectErrorEnvelope } = require('../../helpers/assert');

describe('iam: POST /api/v1/auth/login', () => {
  it('logs in seed buyer and returns access_token + user', async () => {
    const res = await post('iam', '/api/v1/auth/login', {
      email: env.buyerEmail,
      password: env.seedPassword,
    });
    expect(res.status).toBe(200);
    expect(typeof res.data.access_token).toBe('string');
    expect(res.data.access_token.split('.').length).toBe(3);
    expect(res.data.token_type).toBe('Bearer');
    expect(res.data.expires_in).toBeGreaterThan(0);
    expect(res.data.user.email).toBe(env.buyerEmail);
    expect(res.data.user.roles).toContain('BUYER');
  });

  it('returns approval_limit for approver users', async () => {
    const res = await post('iam', '/api/v1/auth/login', {
      email: env.approverLoEmail,
      password: env.seedPassword,
    });
    expect(res.status).toBe(200);
    expect(res.data.user.roles).toContain('APPROVER');
    expect(typeof res.data.user.approval_limit).toBe('number');
  });

  it('rejects wrong password with 401 AUTH_FAILED', async () => {
    const res = await post('iam', '/api/v1/auth/login', {
      email: env.buyerEmail,
      password: 'wrong-password',
    });
    expectErrorEnvelope(res, 'AUTH_FAILED', 401);
  });

  it('rejects unknown email with 401 AUTH_FAILED', async () => {
    const res = await post('iam', '/api/v1/auth/login', {
      email: 'nobody@example.invalid',
      password: 'Passw0rd!',
    });
    expectErrorEnvelope(res, 'AUTH_FAILED', 401);
  });

  it('rejects missing body with 400 VALIDATION_FAILED', async () => {
    const res = await post('iam', '/api/v1/auth/login', {});
    expectErrorEnvelope(res, 'VALIDATION_FAILED', 400);
  });
});
