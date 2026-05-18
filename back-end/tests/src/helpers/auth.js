const { post } = require('./http');
const { env } = require('./env');

const tokenCache = new Map();
const userCache = new Map();

async function login(email, password = env.seedPassword) {
  const cached = tokenCache.get(email);
  if (cached) return cached;
  const res = await post('iam', '/api/v1/auth/login', { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  tokenCache.set(email, res.data.access_token);
  userCache.set(email, res.data.user);
  return res.data.access_token;
}

async function loginFull(email, password = env.seedPassword) {
  const res = await post('iam', '/api/v1/auth/login', { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  tokenCache.set(email, res.data.access_token);
  userCache.set(email, res.data.user);
  return res.data;
}

async function getUser(email) {
  if (!userCache.has(email)) await login(email);
  return userCache.get(email);
}

const tokens = {
  admin: () => login(env.adminEmail),
  buyer: () => login(env.buyerEmail),
  approverHi: () => login(env.approverHiEmail),
  approverLo: () => login(env.approverLoEmail),
};

module.exports = { login, loginFull, getUser, tokens };
