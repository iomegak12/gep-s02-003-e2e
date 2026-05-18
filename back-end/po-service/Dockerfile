FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget openssl
COPY package.json ./
COPY prisma ./prisma
RUN npm install
COPY src ./src
COPY scripts ./scripts
RUN npx prisma generate
ENV NODE_ENV=production
EXPOSE 3003
CMD ["sh", "-c", "node scripts/ensure-db.js && npx prisma db push --skip-generate --accept-data-loss && node src/main.js"]
