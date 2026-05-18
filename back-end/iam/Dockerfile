FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
COPY migrations ./migrations
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/server.js"]
