import { v4 as uuidv4 } from 'uuid';

// uuid v14+ relies on crypto.getRandomValues, which RN provides since 0.76 via Hermes.
// Fallback (extremely unlikely path): timestamp + random.
export function newCorrelationId() {
  try {
    return uuidv4();
  } catch {
    return `cid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
