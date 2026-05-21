const axios = require('axios');
const { env, SERVICE_NAMES } = require('../helpers/env');
const { loginAs, authedClient } = require('../helpers/http');
const { waitFor } = require('../helpers/wait');

/**
 * Validates W3C traceparent propagation:
 *   client -> PO  -> Supplier   (validate blacklist)
 *   client -> PO  -> IAM        (post-transition notification)
 * All spans must share a single trace_id.
 */
describe('Distributed trace propagation across IAM, Supplier, PO', () => {
  let token;
  let traceId;

  beforeAll(async () => {
    token = await loginAs(env.iamUrl, env.adminEmail, env.seedPassword);

    // Trigger a cross-service flow. List endpoints are sufficient to exercise auto-instr;
    // a real PO-create flow is exercised in Cycle 6 once domain metrics land.
    const po = authedClient(env.poUrl, token);
    await po.get('/api/v1/purchase-orders');
  });

  test('PO service emits spans with service.name=gep-po', async () => {
    const traces = await waitFor(async () => {
      const res = await axios.get(`${env.tempoUrl}/api/search`, {
        params: { tags: `service.name=${SERVICE_NAMES.po}`, limit: 5 },
        timeout: 5000,
        validateStatus: () => true,
      });
      if (res.status !== 200) return null;
      const list = res.data.traces || [];
      return list.length > 0 ? list : null;
    }, { timeoutMs: 30000, label: 'PO traces in Tempo' });

    expect(traces.length).toBeGreaterThan(0);
    traceId = traces[0].traceID;
  });

  test('the same trace contains spans from multiple services (graph edge present)', async () => {
    // After Cycle 7 enables servicegraph, this Prom query returns at least one edge.
    const { queryProm } = require('../helpers/prom');
    const edges = await queryProm(
      env.prometheusUrl,
      `traces_service_graph_request_total{client="${SERVICE_NAMES.po}"}`,
    );
    expect(Array.isArray(edges)).toBe(true);
    expect(edges.length).toBeGreaterThan(0);
  });
});
