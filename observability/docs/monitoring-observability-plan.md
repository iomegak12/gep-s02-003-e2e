# GEP-003 Monitoring & Observability — Implementation Plan

**Project:** gep-003-e2e
**Owner:** Ramkumar
**Date:** 2026-05-21
**Status:** Approved (pending implementation)

---

## 0. Goals

End-to-end observability across the GEP SCM platform:

- **Browser (React + Faro RUM)** → **Nginx** → **IAM (Node 20)** / **PO (Node 20)** / **Supplier (FastAPI / Python 3.12)** → **Postgres / Mongo**
- Three signals: **metrics**, **structured logs**, **distributed traces**
- Plus: **RUM**, **Core Web Vitals**, **service-dependency graph**, **transaction analysis**, **SLO recording rules**
- 23 hand-crafted **Grafana dashboards**
- **TDD-first**: tests written before instrumentation code

---

## 1. Approved decisions (locked)

| # | Decision | Choice |
|---|---|---|
| Q1 | Instrumentation approach | **OpenTelemetry SDK** across all services |
| Q2 | Trace backend | **Tempo only** (no Jaeger) |
| Q3 | Log shipping path | App → **OTel Collector → Loki**, with `trace_id`/`span_id` correlation |
| Q4 | Deployment topology | Extend existing `back-end/docker-compose.yml` (single file) |
| Q5 | Dashboards & alerting | **Pre-built dashboards only**; no Alertmanager (yet) |
| Q6 | Business metrics & SLOs | **Domain counters + custom SLO recording rules** |
| Q7 | TDD orientation | **Tests first** for every observability behavior |
| Q8 | Collector registry | **GHCR** (`ghcr.io/open-telemetry/opentelemetry-collector-releases/...`) |
| Q9 | psutil approach | **Pin `psutil==6.1.0`** (manylinux wheel, slim image preserved) |
| Q10 | Service-graph generator | **Tempo `metrics_generator`** (service-graph + span-metrics) |
| Q11 | RUM SDK | **Grafana Faro Web SDK** |
| Q12 | Web Vitals source | **Faro built-in instrumentation** |
| Q13 | Browser→backend trace continuity | **W3C `traceparent` injected on every axios call** |
| Q14 | RUM transport | Browser → **OTel Collector** (OTLP/HTTP behind Nginx) |
| Q15 | RUM sampling / PII | **100% capture, no PII scrubbing** (training/demo env) |
| Q16 | Front-end TDD | **Vitest + MSW** mocking OTLP endpoint |
| Q17 | Dashboard scope | **All 23 dashboards** (full enterprise catalog) |
| Q18 | Dashboard source | **Hand-crafted JSONs** (no community imports) |

---

## 2. High-level architecture

```
                       ┌────────────────────────────────────────┐
                       │  Browser (React 18 + Vite + Faro SDK)  │
                       │  - RUM events                          │
                       │  - Core Web Vitals (Faro built-in)     │
                       │  - W3C traceparent on every axios call │
                       └───────────┬────────────────────────────┘
                                   │  OTLP/HTTP via Nginx /otlp/v1/*
                                   ▼
                ┌──────────────────────────────────────────────────┐
                │   OTel Collector (contrib 0.130)                 │
                │   Receivers: otlp/grpc(:4317), otlp/http(:4318)  │
                │   Processors: batch, resource, attributes        │
                │   Connectors: servicegraph, spanmetrics          │
                │   Exporters:                                     │
                │     - prometheus (:8889 scrape target)           │
                │     - otlp/tempo                                 │
                │     - loki                                       │
                └──┬─────────────────┬──────────────────┬──────────┘
                   ▼                 ▼                  ▼
        ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
        │ Prometheus   │    │   Loki 3.4.1 │   │ Tempo 2.7.0  │
        │ v3.1.0       │    │              │   │ + metrics_   │
        │ rules:       │    │              │   │   generator  │─┐
        │  - SLO recs  │    │              │   │              │ │ remote_write
        └──────┬───────┘    └──────┬───────┘   └──────┬───────┘ │ service-graph
               │                   │                  │         │ + spanmetrics
               └───────────┬───────┴──────────────────┘         │ back to Prom
                           ▼                                    │
                  ┌──────────────────┐                          │
                  │  Grafana 11.6.0  │   23 provisioned         │
                  │  datasources +   │   dashboards             │
                  │  dashboards      │                          │
                  └──────────────────┘                          │
                           ▲                                    │
                           └────────────────────────────────────┘
        ▲                  ▲                  ▲
        │ OTLP/gRPC :4317 (in compose network)
   ┌────┴────┐       ┌────┴─────┐      ┌─────┴─────┐
   │  IAM    │       │  PO      │      │  Supplier │
   │ (Node)  │       │ (Node)   │      │ (FastAPI) │
   └─────────┘       └──────────┘      └───────────┘
```

---

## 3. Runtime baselines (from existing Dockerfiles)

| Service | Image | Runtime |
|---|---|---|
| IAM | `node:20-alpine` | Node.js 20 LTS |
| PO  | `node:20-alpine` | Node.js 20 LTS |
| Supplier | `python:3.12-slim` | Python 3.12 |
| Front-end | (Nginx static + Vite build) | React 18.3, Vite 5.4 |

---

## 4. Dependency matrix (web-verified, 2026-05)

### 4.1 Node services (IAM + PO) — `package.json` additions

```jsonc
"dependencies": {
  "@opentelemetry/api":                                "^1.9.0",
  "@opentelemetry/sdk-node":                           "^0.218.0",
  "@opentelemetry/auto-instrumentations-node":         "^0.76.0",
  "@opentelemetry/exporter-trace-otlp-grpc":           "^0.218.0",
  "@opentelemetry/exporter-metrics-otlp-grpc":         "^0.218.0",
  "@opentelemetry/exporter-logs-otlp-grpc":            "^0.218.0",
  "@opentelemetry/resources":                          "^2.0.0",
  "@opentelemetry/semantic-conventions":               "^1.36.0",
  "@opentelemetry/host-metrics":                       "^0.38.3",
  "@opentelemetry/instrumentation-runtime-node":       "^0.18.0",
  "@opentelemetry/instrumentation-pino":               "^0.64.0",
  "pino":                                              "^9.5.0",
  "pino-opentelemetry-transport":                      "^3.0.0"
}
```

### 4.2 Supplier (Python) — `requirements.txt` additions

> Core (`1.42.0`) and contrib (`0.63b0`) MUST be locked together — mixing trains breaks imports.

```txt
# Core
opentelemetry-api==1.42.0
opentelemetry-sdk==1.42.0
opentelemetry-semantic-conventions==0.63b0
opentelemetry-exporter-otlp-proto-grpc==1.42.0

# Instrumentations
opentelemetry-instrumentation==0.63b0
opentelemetry-instrumentation-fastapi==0.63b0
opentelemetry-instrumentation-asgi==0.63b0
opentelemetry-instrumentation-pymongo==0.63b0
opentelemetry-instrumentation-httpx==0.63b0
opentelemetry-instrumentation-logging==0.63b0
opentelemetry-instrumentation-system-metrics==0.63b0

# Logging + system metrics support
structlog==24.4.0
python-json-logger==2.0.7
psutil==6.1.0
```

### 4.3 Front-end (React + Vite) — `front-end/package.json` additions

```jsonc
"dependencies": {
  "@grafana/faro-web-sdk":     "^1.13.0",
  "@grafana/faro-web-tracing": "^1.13.0",
  "@grafana/faro-react":       "^1.13.0"
},
"devDependencies": {
  "vitest":                  "^2.1.0",
  "@vitest/coverage-v8":     "^2.1.0",
  "jsdom":                   "^25.0.0",
  "msw":                     "^2.6.0"
}
```

### 4.4 Observability stack containers

| Service | Image | Tag |
|---|---|---|
| OTel Collector | `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib` | `0.130.0` |
| Prometheus | `prom/prometheus` | `v3.1.0` |
| Loki | `grafana/loki` | `3.4.1` |
| Tempo | `grafana/tempo` | `2.7.0` |
| Grafana | `grafana/grafana` | `11.6.0` |
| Postgres exporter (optional) | `quay.io/prometheuscommunity/postgres-exporter` | `v0.16.0` |
| MongoDB exporter (optional) | `percona/mongodb_exporter` | `0.43.1` |

---

## 5. Metrics captured (mapped to user asks)

| Ask | Source | Metric (Prom name after Collector translation) |
|---|---|---|
| **CPU** | host-metrics (Node) / system-metrics (Py) | `process_cpu_utilization`, `system_cpu_utilization` |
| **Memory** | same | `process_memory_usage`, `system_memory_usage` |
| **Network** | same | `system_network_io`, `system_network_errors` |
| **Disk IO** | same | `system_disk_io`, `system_disk_operations` |
| **HTTP** | auto-instr (Express / FastAPI) | `http_server_duration` histogram, `http_server_active_requests`, `http_server_request_body_size` |
| **Node runtime** | `instrumentation-runtime-node` | event-loop lag, GC duration, heap by space |
| **Service graph** | Tempo `metrics_generator` | `traces_service_graph_request_*` |
| **Span metrics (RED-from-traces)** | Tempo `metrics_generator` | `traces_spanmetrics_*` |
| **RUM Web Vitals** | Faro browser | `faro_web_vitals_lcp/inp/cls/fcp/ttfb` |
| **Domain — IAM** | custom counters | `iam_logins_total{result}`, `iam_jwt_issued_total{role}` |
| **Domain — Supplier** | custom counters | `supplier_blacklist_hits_total`, `supplier_crud_total{op,status}` |
| **Domain — PO** | custom counters + histogram | `po_state_transitions_total{from,to,outcome}`, `po_approval_duration_seconds` |

---

## 6. Full file layout

```
back-end/
├── docker-compose.yml                              MODIFIED  (add observability services)
├── observability/                                  NEW
│   ├── docs/
│   │   └── monitoring-observability-plan.md        THIS FILE
│   ├── otel-collector-config.yaml
│   ├── prometheus.yml
│   ├── prometheus-rules.yml                        SLO recording rules
│   ├── loki-config.yaml
│   ├── tempo-config.yaml
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/datasources.yaml
│       │   └── dashboards/dashboards.yaml
│       └── dashboards/
│           ├── A1_platform_overview.json
│           ├── A2_service_dependency_graph.json
│           ├── A3_transaction_flow.json
│           ├── B1_iam_red.json
│           ├── B2_supplier_red.json
│           ├── B3_po_red.json
│           ├── C1_node_runtime.json
│           ├── C2_python_runtime.json
│           ├── C3_container_resources.json
│           ├── D1_postgres.json
│           ├── D2_mongo.json
│           ├── E1_api_latency_heatmap.json
│           ├── E2_cross_service_calls.json
│           ├── F1_logs_explorer.json
│           ├── F2_error_logs_patterns.json
│           ├── G1_trace_search_apm.json
│           ├── G2_span_metrics.json
│           ├── H1_iam_domain.json
│           ├── H2_supplier_domain.json
│           ├── H3_po_domain_slo.json
│           ├── I1_rum_overview.json
│           ├── I2_core_web_vitals.json
│           ├── I3_frontend_errors.json
│           ├── I4_user_journeys.json
│           ├── I5_browser_to_api_trace.json
│           └── J1_collector_health.json
├── iam/
│   ├── Dockerfile                                  MODIFIED  (preload telemetry)
│   ├── package.json                                MODIFIED  (deps)
│   └── src/
│       ├── telemetry.js                            NEW
│       ├── metrics-domain.js                       NEW  login/jwt counters
│       ├── logger.js                               NEW  pino + OTLP transport
│       └── server.js                               MODIFIED
├── po-service/
│   ├── Dockerfile                                  MODIFIED
│   ├── package.json                                MODIFIED
│   └── src/
│       ├── telemetry.js                            NEW
│       ├── metrics-domain.js                       NEW  state-transition + approval-duration
│       ├── logger.js                               NEW
│       ├── main.js                                 MODIFIED
│       ├── purchase-orders/**                      MODIFIED  emit state-transition metric
│       └── suppliers-client/**                     MODIFIED  client-call counter
├── supplier-service/
│   ├── Dockerfile                                  MODIFIED
│   ├── requirements.txt                            MODIFIED
│   └── app/
│       ├── telemetry.py                            NEW
│       ├── metrics_domain.py                       NEW  blacklist/CRUD counters
│       ├── logger.py                               NEW  structlog JSON
│       └── main.py                                 MODIFIED

tests/
└── observability/                                  NEW (back-end TDD suite)
    ├── package.json
    ├── jest.config.js
    ├── helpers/
    │   ├── prom.js                                 parse exposition format
    │   ├── otlp-mock-collector.js                  in-test OTLP receiver
    │   └── docker.js
    └── specs/
        ├── metrics-endpoint.spec.js
        ├── runtime-metrics.spec.js                 CPU/mem/net/IO presence
        ├── http-metrics.spec.js
        ├── trace-propagation.spec.js               PO → IAM, PO → Supplier
        ├── log-correlation.spec.js                 trace_id in JSON logs
        ├── domain-metrics.spec.js
        ├── slo-rules.spec.js                       promtool test rules
        ├── service-graph.spec.js                   Tempo metrics_generator output
        └── dashboards.spec.js                      Grafana HTTP API smoke

front-end/
├── package.json                                    MODIFIED
├── src/
│   ├── observability/
│   │   ├── faro.js                                 NEW  Faro bootstrap
│   │   └── axios-trace.js                          NEW  traceparent injection
│   └── main.jsx                                    MODIFIED  init Faro before App
└── tests/
    └── observability/                              NEW (front-end TDD)
        ├── faro-init.test.js
        ├── web-vitals.test.js
        ├── traceparent-propagation.test.js
        ├── error-capture.test.js
        └── helpers/
            └── otlp-msw.js                         MSW handler mocking Collector
```

---

## 7. OTel Collector pipeline (summary of `otel-collector-config.yaml`)

```yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins: ["http://localhost:*", "https://localhost:*"]

processors:
  batch: {}
  resource:
    attributes:
      - { key: deployment.environment, value: dev, action: upsert }

connectors:
  servicegraph: {}
  spanmetrics:
    histogram: { explicit: { buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s] } }

exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
  otlp/tempo:
    endpoint: tempo:4317
    tls: { insecure: true }
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp/tempo, servicegraph, spanmetrics]
    metrics:
      receivers: [otlp, spanmetrics, servicegraph]
      processors: [batch, resource]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [loki]
```

---

## 8. SLO recording rules (`prometheus-rules.yml`)

- `slo:po_approval_latency:p99_5m`         — target `< 0.5s`
- `slo:http_error_ratio:5m{service=...}`   — target `< 1%`
- `slo:availability:30d{service=...}`      — burn-rate ready
- `slo:rum_web_vitals_lcp:p75_24h`         — target `< 2.5s` (Good)
- `slo:rum_web_vitals_inp:p75_24h`         — target `< 200ms`

---

## 9. TDD test catalog (write FIRST in every cycle)

### Back-end (`tests/observability/specs/`)
1. `metrics-endpoint.spec.js`  — Collector `:8889/metrics` returns Prometheus exposition format with expected series.
2. `runtime-metrics.spec.js`   — `process_cpu_utilization`, `process_memory_usage`, `system_network_io`, `system_disk_io` present per service.
3. `http-metrics.spec.js`      — `http_server_duration` histogram with route + status labels.
4. `trace-propagation.spec.js` — Create PO via API → assert single trace ID spans IAM (JWT) + Supplier (blacklist) + PO.
5. `log-correlation.spec.js`   — Every log line during a traced request has `trace_id` and `span_id`.
6. `domain-metrics.spec.js`    — `po_state_transitions_total`, `iam_logins_total`, `supplier_blacklist_hits_total` exposed.
7. `slo-rules.spec.js`         — `promtool test rules prometheus-rules.yml` passes.
8. `service-graph.spec.js`     — `traces_service_graph_request_total{client="po",server="supplier"}` exists after sample traffic.
9. `dashboards.spec.js`        — Grafana HTTP API confirms 23 dashboards loaded and each renders without datasource errors.

### Front-end (`front-end/tests/observability/`)
1. `faro-init.test.js`              — Faro initializes with correct app name, env, endpoint.
2. `web-vitals.test.js`             — LCP/INP/CLS/FCP/TTFB events posted on simulated page load.
3. `traceparent-propagation.test.js` — Every axios request carries a W3C `traceparent` header.
4. `error-capture.test.js`          — Thrown errors and unhandled rejections forwarded to Faro/Collector.

---

## 10. Rollout — TDD cycles

| Cycle | Goal | Key tests turning GREEN |
|---|---|---|
| **1** | Scaffold test suites (back-end + front-end). All specs RED. | (all RED) |
| **2** | Add Collector + Prom + Loki + Tempo + Grafana to compose. `promtool` rules valid. | `slo-rules.spec.js` |
| **3** | IAM `telemetry.js` (SDK + host-metrics + runtime-node + auto-instr). Repeat for PO. Then Supplier `telemetry.py`. | `metrics-endpoint`, `runtime-metrics`, `http-metrics` |
| **4** | Wire OTLP trace exporter. Propagation through axios (PO) and httpx (Supplier). | `trace-propagation` |
| **5** | Replace console.log with pino / structlog + OTLP log exporter. | `log-correlation` |
| **6** | Domain metric modules. SLO histogram for PO approval. | `domain-metrics`, `slo-rules` (extended) |
| **7** | Enable Tempo `metrics_generator` (service-graph + span-metrics). | `service-graph.spec.js` |
| **8** | Front-end: install Faro, init in `main.jsx`, route instrumentation, axios traceparent. | `faro-init`, `web-vitals`, `traceparent-propagation`, `error-capture` |
| **9** | Provision 23 Grafana dashboards. | `dashboards.spec.js` |
| **10** | End-to-end smoke: open UI → create PO → confirm single trace from browser click through 3 services in Tempo + Grafana RUM. | (manual + dashboards spec) |

---

## 11. Dashboard catalog (23, all hand-crafted)

| # | Dashboard | Source |
|---|---|---|
| A1 | Platform Overview (SLO Summary) | Prom recording rules |
| A2 | Service Dependency Graph | Tempo `metrics_generator` → Prom |
| A3 | Cross-Service Transaction Flow | Tempo (TraceQL) + spanmetrics |
| B1 | IAM — RED | Prom (otel http.server) |
| B2 | Supplier — RED | same |
| B3 | PO — RED | same |
| C1 | Node.js Runtime (IAM + PO) | host-metrics + runtime-node |
| C2 | Python Runtime (Supplier) | system-metrics + psutil |
| C3 | Container Resources | system-metrics |
| D1 | PostgreSQL (IAM + PO) | OTel pg/Prisma + postgres-exporter |
| D2 | MongoDB (Supplier) | OTel pymongo + mongodb-exporter |
| E1 | API Latency Heatmap | Prom histograms |
| E2 | Cross-Service Calls | client spans + custom counters |
| F1 | Unified Logs Explorer | Loki |
| F2 | Error Logs & Patterns | Loki LogQL `pattern` |
| G1 | Trace Search & APM | Tempo |
| G2 | Span Metrics (RED-from-traces) | Tempo metrics_generator |
| H1 | IAM Domain | custom counters |
| H2 | Supplier Domain | custom counters |
| H3 | PO Domain & Approval SLO | counters + histogram + recording rule |
| I1 | RUM Overview | Faro → Prom + Loki |
| I2 | Core Web Vitals | Faro metrics |
| I3 | Front-end Errors | Faro events → Loki |
| I4 | User Journeys & Page Performance | Faro events + traces |
| I5 | Browser → API End-to-End Trace | Faro + Tempo |
| J1 | OTel Collector Health | Collector self-telemetry |

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| OTel Python core/contrib version drift | Pin both trains (`1.42.0` + `0.63b0`) in `requirements.txt` |
| psutil native build on slim image | `psutil==6.1.0` ships manylinux wheels — no compiler |
| Browser CORS to Collector | Route `/otlp/v1/*` through existing Nginx; Collector CORS allow-listed |
| RUM payload PII (chose 15A) | Acceptable for dev/training; **before any prod use**, add Collector `attributes` processor to scrub `authorization`, `password`, `email` fields |
| Trace cardinality explosion | spanmetrics histogram uses bounded buckets; PO state-transition labels are bounded enums |
| GHCR pull failures behind proxy | Fallback: switch all `ghcr.io/...` tags to Docker Hub mirror images |

---

## 13. Out of scope (deferred)

- Alertmanager + PagerDuty / Slack / OnCall routing (Q5 = A)
- Synthetic monitoring (Grafana k6 / Blackbox exporter)
- Long-term metric retention (Mimir / Thanos)
- Production-grade Loki / Tempo (object storage, replication)
- PII redaction pipelines (training env only — see 15A)

---

## 14. Acceptance criteria

The plan is complete when:

1. All 23 dashboards load in Grafana with no datasource errors.
2. Creating a PO in the UI produces **one trace** spanning Browser → Nginx → PO → IAM → Supplier in Tempo.
3. Every log line emitted during that trace carries the matching `trace_id` and is searchable in Loki.
4. `promtool test rules` passes for all SLO recording rules.
5. `traces_service_graph_request_total` exists for all three inter-service edges (PO↔IAM, PO↔Supplier).
6. Faro Web Vitals (LCP, INP, CLS, FCP, TTFB) appear in dashboard I2 within 30 s of page load.
7. All 13 observability spec files (9 back-end + 4 front-end) are GREEN.
