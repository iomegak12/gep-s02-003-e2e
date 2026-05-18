const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'GEP-SCM Purchase Order Service',
    description: 'Purchase order CRUD, line items, state-machine transitions, and cross-service supplier validation.',
    version: '1.0.0',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
              correlation_id: { type: 'string' },
            },
          },
        },
      },
      Address: {
        type: 'object',
        required: ['street', 'city', 'state', 'country', 'postal_code'],
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          country: { type: 'string' },
          postal_code: { type: 'string' },
        },
      },
      LineItem: {
        type: 'object',
        required: ['line_number', 'item_description', 'quantity', 'unit_of_measure', 'unit_price'],
        properties: {
          line_number: { type: 'integer', minimum: 1 },
          item_description: { type: 'string' },
          sku: { type: 'string' },
          quantity: { type: 'number' },
          unit_of_measure: { type: 'string' },
          unit_price: { type: 'number' },
          tax_rate: { type: 'number' },
          notes: { type: 'string' },
        },
      },
      CreatePO: {
        type: 'object',
        required: ['supplier_id', 'currency', 'payment_terms', 'line_items'],
        properties: {
          supplier_id: { type: 'string' },
          currency: { type: 'string' },
          expected_delivery_date: { type: 'string', format: 'date' },
          payment_terms: { type: 'string', enum: ['NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'IMMEDIATE', 'ADVANCE_50_50'] },
          delivery_address: { $ref: '#/components/schemas/Address' },
          notes: { type: 'string' },
          line_items: { type: 'array', items: { $ref: '#/components/schemas/LineItem' }, minItems: 1 },
        },
      },
      UpdatePO: {
        type: 'object',
        properties: {
          expected_delivery_date: { type: 'string', format: 'date' },
          payment_terms: { type: 'string', enum: ['NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'IMMEDIATE', 'ADVANCE_50_50'] },
          delivery_address: { $ref: '#/components/schemas/Address' },
          notes: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/purchase-orders': {
      get: { summary: 'List purchase orders', responses: { 200: { description: 'OK' } } },
      post: {
        summary: 'Create purchase order',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePO' } } } },
        responses: { 200: { description: 'Created' }, 400: { description: 'Validation failed' }, 422: { description: 'Supplier invalid' } },
      },
    },
    '/purchase-orders/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { summary: 'Get purchase order', responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } } },
      patch: {
        summary: 'Update purchase order',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdatePO' } } } },
        responses: { 200: { description: 'OK' }, 409: { description: 'Invalid state' } },
      },
      delete: { summary: 'Delete purchase order', responses: { 204: { description: 'Deleted' } } },
    },
    '/purchase-orders/{id}/line-items': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { summary: 'List line items', responses: { 200: { description: 'OK' } } },
      post: {
        summary: 'Add line item',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LineItem' } } } },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/purchase-orders/{id}/line-items/{line_id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'line_id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      patch: { summary: 'Update line item', responses: { 200: { description: 'OK' } } },
      delete: { summary: 'Delete line item', responses: { 200: { description: 'OK' } } },
    },
    '/purchase-orders/{id}/submit':   { post: { summary: 'Submit PO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/{id}/approve':  { post: { summary: 'Approve PO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/{id}/reject':   { post: { summary: 'Reject PO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/{id}/fulfill':  { post: { summary: 'Fulfill PO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/{id}/cancel':   { post: { summary: 'Cancel PO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/{id}/revise':   { post: { summary: 'Revise PO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/{id}/close':    { post: { summary: 'Close PO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },

    '/purchase-orders/aggregations/by-status':           { get: { summary: 'Counts and totals by status', responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/aggregations/spend-by-supplier':   { get: { summary: 'Top suppliers by spend', responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/aggregations/spend-by-category':   { get: { summary: 'Spend grouped by supplier category', responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/aggregations/monthly-spend':       { get: { summary: 'Monthly spend for a year', responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/aggregations/pending-approvals':   { get: { summary: 'POs awaiting approval within the user limit', responses: { 200: { description: 'OK' } } } },
    '/purchase-orders/aggregations/cycle-time':          { get: { summary: 'Average DRAFT→FULFILLED days by category', responses: { 200: { description: 'OK' } } } },

    '/purchase-orders/search': { get: { summary: 'Search purchase orders', responses: { 200: { description: 'OK' } } } },
  },
};

module.exports = openapi;
