FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget openssl
COPY package.json ./
COPY prisma ./prisma
# --legacy-peer-deps: tolerate OTel JS peer-dep matrix (stable 1.x/2.x vs experimental 0.x).
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY src ./src
COPY scripts ./scripts
RUN npx prisma generate
ENV NODE_ENV=production
EXPOSE 3003
CMD ["sh", "-c", "node scripts/ensure-db.js && npx prisma db push --skip-generate --accept-data-loss && node --require ./src/telemetry.js src/main.js"]
