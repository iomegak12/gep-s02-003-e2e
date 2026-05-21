# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# `npm install` (not `npm ci`) so a stale package-lock.json gets regenerated
# when new dependencies are added (Faro / Vitest were added in Cycle 8).
# `--legacy-peer-deps` tolerates OTel/Faro peer-dep ranges.
COPY package.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source and build
COPY index.html ./
COPY vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---------- Stage 2: runtime (nginx) ----------
FROM nginx:1.27-alpine AS runner

# Replace default site config with ours
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Static assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
