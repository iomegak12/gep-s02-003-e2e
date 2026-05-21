// Vitest setup — wires MSW so tests can intercept OTLP/HTTP traffic.
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './otlp-msw';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Faro reads import.meta.env / window.location — provide sane defaults.
if (!globalThis.window.location) {
  // jsdom usually provides this; fall through if not.
}
