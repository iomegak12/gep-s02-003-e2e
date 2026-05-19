import { useEffect, useState } from 'react';
import { pingHealth as pingIam } from '../api/iam';
import { pingHealth as pingSupplier } from '../api/suppliers';
import { pingHealth as pingPo } from '../api/purchaseOrders';

const POLL_MS = Number(process.env.EXPO_PUBLIC_HEALTH_POLL_MS || 30000);

async function probe(fn) {
  const start = Date.now();
  try {
    await fn();
    const dt = Date.now() - start;
    return { state: dt > 2000 ? 'slow' : 'ok', latencyMs: dt, checkedAt: new Date().toISOString() };
  } catch (e) {
    return { state: 'down', latencyMs: null, error: e?.message, checkedAt: new Date().toISOString() };
  }
}

export function useHealth() {
  const [services, setServices] = useState({
    iam: { state: 'unknown' },
    supplier: { state: 'unknown' },
    po: { state: 'unknown' },
  });

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const [iam, sup, p] = await Promise.all([
        probe(pingIam),
        probe(pingSupplier),
        probe(pingPo),
      ]);
      if (!cancelled) setServices({ iam, supplier: sup, po: p });
    }

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const anyDown = Object.values(services).some((s) => s.state === 'down');
  const anySlow = Object.values(services).some((s) => s.state === 'slow');

  return { services, anyDown, anySlow };
}
