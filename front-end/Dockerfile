# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps with a deterministic lock if present; otherwise install.
COPY package.json ./
COPY package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

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
