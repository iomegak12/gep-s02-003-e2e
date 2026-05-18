# Troubleshooting

## Health indicator shows red dots

Cause: the front-end can't reach one or more back-end services through the
proxy.

- **Dev (`npm run dev`)**: check that `docker compose ps` in `back-end/` shows
  `iam`, `supplier-service`, `po-service` as healthy on host ports
  `3001/3002/3003`.
- **Docker (`docker compose up`)**: confirm both stacks are on the
  `gep-network` — `docker network inspect gep-network` should list `gep-web`
  alongside the back-end containers.

## "network gep-network not found" when starting front-end stack

The back-end stack creates `gep-network`. Start it first:

```
cd back-end && docker compose up -d
cd ../front-end && docker compose up --build -d
```

## 401 Unauthorized on every request after login

Your stored access token may be expired. Open DevTools → Application →
LocalStorage and delete the `gep.auth` key, then sign in again.

## Theme doesn't persist across reload

Check that LocalStorage is not blocked (some private-browsing modes do).
Inspect `localStorage.getItem('gep.theme')` in the console — it should be
`"light"` or `"dark"` after you toggle.

## Vite dev server shows CORS errors

The dev server proxies `/api/v1/*` and `/health/*` to the back-end (see
[vite.config.js](vite.config.js)). If you're calling the back-end directly
(e.g., `http://localhost:3001/...`) you'll hit CORS — use the relative paths
the rest of the app uses (`/api/v1/...`).

## `docker compose up` rebuilds every time

That's expected on file changes. To skip rebuild after `npm install` changes,
prune the build cache with `docker compose build --no-cache web` and retry.

## Final image is larger than expected

The runtime stage is `nginx:alpine` + the contents of `dist/`. If your image
is unusually large, ensure `dist/` doesn't ship sourcemaps (sourcemaps are
off in [vite.config.js](vite.config.js) by default).
