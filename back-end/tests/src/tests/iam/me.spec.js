const { get, patch, post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { env } = require('../../helpers/env');
const { expectErrorEnvelope } = require('../../helpers/assert');

describe('iam: /me', () => {
  it('GET /me returns the current user', async () => {
    const token = await tokens.buyer();
    const res = await get('iam', '/api/v1/auth/me', { token });
    expect(res.status).toBe(200);
    expect(res.data.email).toBe(env.buyerEmail);
    expect(res.data.roles).toContain('BUYER');
  });

  it('GET /me without token returns 401 AUTH_REQUIRED', async () => {
    const res = await get('iam', '/api/v1/auth/me');
    expectErrorEnvelope(res, 'AUTH_REQUIRED', 401);
  });

  it('GET /me with garbage token returns 401 TOKEN_INVALID', async () => {
    const res = await get('iam', '/api/v1/auth/me', { token: 'not-a-jwt' });
    expectErrorEnvelope(res, 'TOKEN_INVALID', 401);
  });

  it('POST /logout returns 204', async () => {
    const token = await tokens.buyer();
    const res = await post('iam', '/api/v1/auth/logout', {}, { token });
    expect(res.status).toBe(204);
  });

  describe('PATCH /me/password', () => {
    let throwawayEmail;
    let throwawayPwd = 'Passw0rd!';
    beforeAll(async () => {
      const admin = await tokens.admin();
      throwawayEmail = `me-pwd-${Date.now()}@example.com`;
      const created = await post(
        'iam',
        '/api/v1/auth/users',
        {
          email: throwawayEmail,
          full_name: 'Pwd Test',
          password: throwawayPwd,
          roles: ['BUYER'],
        },
        { token: admin },
      );
      expect(created.status).toBe(201);
    });

    it('changes password when current_password matches', async () => {
      const loginRes = await post('iam', '/api/v1/auth/login', { email: throwawayEmail, password: throwawayPwd });
      expect(loginRes.status).toBe(200);
      const newPwd = 'Passw0rd!New';
      const res = await patch(
        'iam',
        '/api/v1/auth/me/password',
        { current_password: throwawayPwd, new_password: newPwd },
        { token: loginRes.data.access_token },
      );
      expect(res.status).toBe(204);
      throwawayPwd = newPwd;
      const reLogin = await post('iam', '/api/v1/auth/login', { email: throwawayEmail, password: newPwd });
      expect(reLogin.status).toBe(200);
    });

    it('rejects wrong current_password with 400 INVALID_CURRENT_PASSWORD', async () => {
      const loginRes = await post('iam', '/api/v1/auth/login', { email: throwawayEmail, password: throwawayPwd });
      const res = await patch(
        'iam',
        '/api/v1/auth/me/password',
        { current_password: 'wrong', new_password: 'Whatever1!' },
        { token: loginRes.data.access_token },
      );
      expectErrorEnvelope(res, 'INVALID_CURRENT_PASSWORD', 400);
    });
  });
});
