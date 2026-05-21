const axios = require('axios');

function client(baseURL) {
  return axios.create({ baseURL, timeout: 10000, validateStatus: () => true });
}

async function loginAs(iamUrl, email, password) {
  const c = client(iamUrl);
  const res = await c.post('/api/v1/auth/login', { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data.accessToken || res.data.token;
}

function authedClient(baseURL, token) {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });
}

async function generateSampleTraffic({ iamUrl, supplierUrl, poUrl, adminEmail, seedPassword }) {
  // Bounce a few requests off each service so the OTel pipeline is exercised.
  const token = await loginAs(iamUrl, adminEmail, seedPassword);
  const iam = authedClient(iamUrl, token);
  const sup = authedClient(supplierUrl, token);
  const po = authedClient(poUrl, token);

  await Promise.allSettled([
    iam.get('/api/v1/users/me'),
    iam.get('/health'),
    sup.get('/api/v1/suppliers'),
    sup.get('/health'),
    po.get('/api/v1/purchase-orders'),
    po.get('/health'),
  ]);
  return { token };
}

module.exports = { client, loginAs, authedClient, generateSampleTraffic };
