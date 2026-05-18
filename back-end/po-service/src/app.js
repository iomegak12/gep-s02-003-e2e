const { Router } = require('express');
const aggregationsRouter = require('./aggregations/routes');
const searchRouter = require('./search/routes');
const purchaseOrdersRouter = require('./purchase-orders/routes');

function buildApiRouter() {
  const api = Router();
  // Order matters: aggregations and search must match before /:id.
  api.use('/purchase-orders/aggregations', aggregationsRouter);
  api.use('/purchase-orders/search', searchRouter);
  api.use('/purchase-orders', purchaseOrdersRouter);
  return api;
}

module.exports = { buildApiRouter };
