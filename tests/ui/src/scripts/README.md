# GEP UI CLI Driver

CLI-driven browser UI testing for the GEP SCM web app. Built on
**Playwright (Chromium, headless)** — reuses the install already pinned by
`tests/ui/package.json`.

## Subcommands

| Command                       | What it does                                                                 |
|-------------------------------|------------------------------------------------------------------------------|
| `npm run ui:smoke`            | Login as admin → search suppliers → visit dashboards. Pass/fail.            |
| `npm run ui:observability`    | Smoke flow + asserts Prom/Loki/Tempo have the resulting signals.            |
| `npm run ui:load`             | Repeats the smoke flow N times (default 10×, 2 workers in parallel).        |

All three exit **non-zero on first failure** (Q9 = A).

## Flags

Pass through to the underlying Node script:

```powershell
node src/scripts/cli.js load --iterations 50 --concurrency 4
```

Recognised flags:

- `--iterations <N>` — load mode only
- `--concurrency <N>` — load mode only

## Configuration (env)

Read from `tests/ui/.env.tests` (same file as the Playwright specs):

| Variable          | Default                    |
|-------------------|----------------------------|
| `WEB_BASE_URL`    | `http://localhost:8080`    |
| `ADMIN_EMAIL`     | `admin@demo.local`         |
| `SEED_PASSWORD`   | `Passw0rd!`                |
| `PROMETHEUS_URL`  | `http://localhost:9090`    |
| `LOKI_URL`        | `http://localhost:3100`    |
| `TEMPO_URL`       | `http://localhost:3200`    |

## Direct invocation

```powershell
node src/scripts/cli.js smoke
node src/scripts/cli.js observability
node src/scripts/cli.js load --iterations 20 --concurrency 3
```

## Exit codes

- `0` — every step succeeded
- `1` — a UI step or an observability assertion failed
- `2` — bad CLI usage (unknown subcommand)
