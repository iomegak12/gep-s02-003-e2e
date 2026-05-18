import { useQuery } from '@tanstack/react-query';
import { probeAllServices } from '../api/health.js';

/**
 * Polls all three back-end /health endpoints every 30s.
 * Returns the array shape [{key, status, latencyMs, checkedAt, error?}, ...].
 */
export function useServiceHealth() {
  return useQuery({
    queryKey: ['service-health'],
    queryFn: probeAllServices,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 25_000
  });
}

/** Reduce per-service statuses to a single overall dot color for the topbar. */
export function summariseHealth(items = []) {
  if (!items.length) return 'unknown';
  if (items.some((x) => x.status === 'down')) return 'down';
  if (items.some((x) => x.status === 'slow')) return 'slow';
  return 'ok';
}
