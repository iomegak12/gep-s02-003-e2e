const express = require('express');
const swaggerUi = require('swagger-ui-express');
const prisma = require('./prisma');
const { buildApiRouter } = require('./app');
const { correlationMiddleware, errorHandler } = require('./common/errors');
const { jwtMiddleware } = require('./auth/auth');
const openapi = require('./openapi');

async function bootstrap() {
  const app = express();

  const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (origins.length) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && origins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
      }
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Authorization,Content-Type,X-Correlation-Id');
        return res.status(204).end();
      }
      next();
    });
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(correlationMiddleware);
  app.use(jwtMiddleware);

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  app.get('/api/v1/openapi.json', (_req, res) => res.json(openapi));
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'GEP-SCM PO Service · API Docs' }));

  app.use('/api/v1', buildApiRouter());

  app.use(errorHandler);

  await prisma.$connect();

  const port = parseInt(process.env.PORT || '3003', 10);
  app.listen(port, () => console.log(`[po-service] listening on :${port}`));
}

bootstrap().catch(e => { console.error('[po-service] fatal', e); process.exit(1); });
