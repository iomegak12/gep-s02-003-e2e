import { toast } from 'sonner';
import { getShowCorrelationIds } from '../hooks/useDebugPrefs.js';

/**
 * Build a description that optionally appends the correlation id, gated by
 * the debug pref. Use from any error-toast caller:
 *
 *   toast.error('Could not foo', { description: withCorr(e.message, e.correlationId) });
 */
export function withCorr(message, correlationId) {
  if (!correlationId) return message;
  if (!getShowCorrelationIds()) return message;
  return `${message || ''}\nref: ${correlationId}`.trim();
}
