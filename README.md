# GEP E2E — Procurement Platform

End-to-end procurement demo: IAM, Supplier, and Purchase Order microservices behind a React web UI, fully containerised with Docker Compose.

## Architecture

| Component       | Tech                | Image                       | Port |
| --------------- | ------------------- | --------------------------- | ---- |
| Web UI          | React + Vite + Nginx| `iomega/gep-web`            | 8080 |
| IAM             | Node.js + Postgres  | `iomega/gep-iam`            | 3001 |
| Supplier        | Python + MongoDB    | `iomega/gep-supplier`       | 3002 |
| Purchase Order  | Node.js + Postgres  | `iomega/gep-po`             | 3003 |
| Seed            | One-shot bootstrap  | `iomega/gep-seed`           | —    |
| Postgres        | Database            | `postgres:16-alpine`        | 5432 |
| MongoDB         | Database            | `mongo:7`                   | 27017|
| CloudBeaver     | Postgres UI         | `dbeaver/cloudbeaver`       | 8978 |
| Mongo Express   | Mongo UI            | `mongo-express`             | 8081 |

## Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)
- PowerShell 7+ (pwsh) — for the scripts under [scripts/](scripts/)
- A Docker Hub account + Personal Access Token (only for `build-and-push`)

## Quick start

Interactive menu (recommended):

```powershell
./scripts/devops.ps1
```

Direct commands:

```powershell
# Build all images locally and push to Docker Hub
./scripts/build-and-push.ps1 -Username iomega -Pat <DOCKERHUB_PAT>

# Run all containers using published images
./scripts/run.ps1
```

Once running:

- Web UI: http://localhost:8080
- IAM API: http://localhost:3001
- Supplier API: http://localhost:3002
- PO API: http://localhost:3003
- CloudBeaver: http://localhost:8978
- Mongo Express: http://localhost:8081

Bootstrap admin: `admin@demo.local` / `Passw0rd!`

## Compose files

- [docker-compose.yml](docker-compose.yml) — builds images locally from source
- [docker-compose.prod.yml](docker-compose.prod.yml) — pulls pre-built images from Docker Hub

## License

MIT — see [LICENSE](LICENSE).
