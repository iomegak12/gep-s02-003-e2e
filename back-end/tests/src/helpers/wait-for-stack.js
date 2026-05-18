const axios = require('axios');
const { env } = require('./env');

const services = [
  { name: 'iam', url: `${env.iamUrl}/health` },
  { name: 'supplier', url: `${env.supplierUrl}/health` },
  { name: 'po', url: `${env.poUrl}/health` },
];

async function pollHealthy(url, deadline) {
  while (true) {
    try {
      const res = await axios.get(url, { timeout: 2000, validateStatus: () => true });
      if (res.status === 200 && res.data && res.data.ok === true) return;
    } catch {
      // connection refused while stack boots — keep trying
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${url}`);
    await new Promise(r => setTimeout(r, 1000));
  }
}

module.exports = async function globalSetup() {
  const deadline = Date.now() + env.waitTimeoutMs;
  await Promise.all(
    services.map(async s => {
      await pollHealthy(s.url, deadline);
      console.log(`[wait-for-stack] ${s.name} healthy`);
    }),
  );
};
