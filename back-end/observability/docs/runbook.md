# Observability Runbook

Quick reference for running and validating the GEP-003 observability stack.

## Bring the full stack up

```powershell
cd "c:\000 - GEP - S02 - 003\gep-003-e2e\back-end"
docker compose up -d --build
```

Wait ~60s for everything to become healthy, then:

| Component        | URL                                |
|------------------|------------------------------------|
| Grafana          | http://localhost:3000  (admin/admin) |
| Prometheus       | http://localhost:9090              |
| Loki             | http://localhost:3100              |
| Tempo            | http://localhost:3200              |
| OTel Collector   | grpc 4317 / http 4318 / metrics 8889 / health 13133 |
| IAM              | http://localhost:3001              |
| Supplier         | http://localhost:3002              |
| PO               | http://localhost:3003              |

## Validate

```powershell
# 1. Collector exposed metrics?
curl http://localhost:8889/metrics | findstr http_server_duration

# 2. Prometheus rules loaded?
curl http://localhost:9090/api/v1/rules

# 3. Tempo has traces?
curl "http://localhost:3200/api/search?tags=service.name%3Dgep-po&limit=5"

# 4. Loki has logs?
curl "http://localhost:3100/loki/api/v1/query_range?query={service_name=`"gep-po`"}&limit=5"

# 5. Run the observability test suite
cd ..\tests\observability
npm install
npm test
```

## Front-end Faro

```powershell
cd "c:\000 - GEP - S02 - 003\gep-003-e2e\front-end"
npm install
npm run dev
# open http://localhost:5173, then in Grafana → Explore → Tempo, search
# `{ service.name = "gep-scm-web" }` to see RUM root spans linking into the API.
```

## Promtool (optional)

If `promtool` is on `PATH`, the SLO rules can be validated locally:

```powershell
promtool check rules back-end\observability\prometheus-rules.yml
promtool test  rules back-end\observability\prometheus-rules-tests.yml
```

## Regenerate dashboards

Each dashboard JSON is hand-authored via the generator script:

```powershell
node back-end\observability\tools\generate-dashboards.js
```

The 26 JSONs in `back-end/observability/grafana/dashboards/` are auto-loaded
by Grafana's file provider on the next container restart (or after the
30-second provisioning poll interval).
