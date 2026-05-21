# Observability Test Suite (TDD-first)

This Jest suite drives the rollout of the GEP-003 observability stack
(IAM / Supplier / PO + OTel Collector + Prometheus + Loki + Tempo + Grafana).

> All specs are written **before** the corresponding implementation cycle, so
> they start **RED** and turn GREEN as each cycle is delivered.

## Spec → Cycle map

| Spec | Cycle |
|---|---|
| `metrics-endpoint.spec.js` | 2–3 |
| `runtime-metrics.spec.js`  | 3 |
| `http-metrics.spec.js`     | 3 |
| `trace-propagation.spec.js`| 4 |
| `log-correlation.spec.js`  | 5 |
| `domain-metrics.spec.js`   | 6 |
| `service-graph.spec.js`    | 7 |
| `slo-rules.spec.js`        | 2 + 6 |
| `dashboards.spec.js`       | 9 |

## Run

```bash
cd tests/observability
cp .env.example .env          # adjust if needed
npm install
npm test
```

The suite assumes the full stack is reachable on `localhost` (compose default).

## Notes

- `slo-rules.spec.js` shells out to `promtool`. If `promtool` isn't on PATH, the
  rule-unit-test cases are skipped (the file-existence and Prometheus-runtime
  cases still run).
- `maxWorkers: 1` is used so OTel exports from one spec don't pollute another.
