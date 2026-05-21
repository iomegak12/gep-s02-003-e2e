FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
COPY package.json ./
# --legacy-peer-deps: tolerate OTel JS peer-dep matrix (stable 1.x/2.x vs experimental 0.x).
# No package-lock.json copied: lockfile is regenerated to match the OTel deps added in Cycle 3.
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund
COPY src ./src
COPY migrations ./migrations
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "--require", "./src/telemetry.js", "src/server.js"]
