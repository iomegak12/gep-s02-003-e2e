import { apiClient } from './client.js';

/**
 * Probe a single service health endpoint through nginx (or the Vite dev proxy).
 * Returns a small descriptor regardless of success/failure so the UI can render.
 */
export async function probeService(key, path) {
  const start = performance.now();
  try {
    const res = await apiClient.get(path, { timeout: 4000 });
    const ms = Math.round(performance.now() - start);
    const ok = res?.data?.ok === true || res?.status === 200;
    let status = 'down';
    if (ok && ms < 2000) status = 'ok';
    else if (ok) status = 'slow';
    return { key, status, latencyMs: ms, checkedAt: new Date().toISOString(), raw: res?.data };
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    return {
      key,
      status: 'down',
      latencyMs: ms,
      checkedAt: new Date().toISOString(),
      error: err?.message || 'request failed'
    };
  }
}

export function probeAllServices() {
  return Promise.all([
    probeService('iam', '/health/iam'),
    probeService('sup', '/health/sup'),
    probeService('po',  '/health/po')
  ]);
}
