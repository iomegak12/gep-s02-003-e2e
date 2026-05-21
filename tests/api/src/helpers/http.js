const axios = require('axios');
const { v4: uuid } = require('uuid');
const { env } = require('./env');

const baseUrls = {
  iam: env.iamUrl,
  supplier: env.supplierUrl,
  po: env.poUrl,
};

function client(service) {
  return axios.create({
    baseURL: baseUrls[service],
    validateStatus: () => true,
    timeout: 15000,
  });
}

function buildConfig(opts = {}) {
  const headers = {
    'X-Correlation-Id': opts.correlationId ?? `test-${uuid()}`,
    ...(opts.headers ?? {}),
  };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  return { headers, params: opts.params };
}

async function get(service, path, opts = {}) {
  return client(service).get(path, buildConfig(opts));
}
async function del(service, path, opts = {}) {
  return client(service).delete(path, buildConfig(opts));
}
async function post(service, path, body = {}, opts = {}) {
  return client(service).post(path, body, buildConfig(opts));
}
async function patch(service, path, body = {}, opts = {}) {
  return client(service).patch(path, body, buildConfig(opts));
}

function isAxiosError(e) {
  return axios.isAxiosError(e);
}

module.exports = { get, del, post, patch, isAxiosError };
