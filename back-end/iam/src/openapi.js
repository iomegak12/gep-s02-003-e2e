// Hand-written OpenAPI 3.0 spec for the iam service.
// Served as JSON at /api/v1/openapi.json and rendered by swagger-ui-express at /api/v1/docs.

const errorResponse = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'AUTH_FAILED' },
        message: { type: 'string' },
        details: {},
        correlation_id: { type: 'string' },
      },
    },
  },
};

const user = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    full_name: { type: 'string' },
    roles: { type: 'array', items: { type: 'string', enum: ['BUYER', 'APPROVER', 'ADMIN'] } },
    is_active: { type: 'boolean' },
    approval_limit: { type: 'number', nullable: true },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

const standardErrors = {
  401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  409: { description: 'Conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
};

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'GEP-SCM Auth Service',
    version: '1.0.0',
    description: 'Issues JWTs (HS256) consumed by supplier-service and po-service, plus admin user management.',
  },
  servers: [{ url: 'http://localhost:3001', description: 'Local dev' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: { Error: errorResponse, User: user },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        security: [],
        responses: { 200: { description: 'OK' }, 503: { description: 'DB unreachable' } },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange email+password for an access token (HS256, 24h)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Token issued',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    access_token: { type: 'string' },
                    token_type: { type: 'string', example: 'Bearer' },
                    expires_in: { type: 'integer', example: 86400 },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: standardErrors[409],
          401: standardErrors[401],
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'No-op (tokens are stateless); returns 204',
        responses: { 204: { description: 'OK' }, 401: standardErrors[401] },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Return the current user',
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: standardErrors[401],
        },
      },
    },
    '/api/v1/auth/me/password': {
      patch: {
        tags: ['Auth'],
        summary: 'Change own password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['current_password', 'new_password'],
                properties: { current_password: { type: 'string' }, new_password: { type: 'string', minLength: 8 } },
              },
            },
          },
        },
        responses: { 204: { description: 'OK' }, 400: standardErrors[409], 401: standardErrors[401] },
      },
    },
    '/api/v1/auth/users': {
      get: {
        tags: ['Admin · Users'],
        summary: 'List users (paginated, ADMIN only)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'page_size', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                    page: { type: 'integer' },
                    page_size: { type: 'integer' },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          401: standardErrors[401],
          403: standardErrors[403],
        },
      },
      post: {
        tags: ['Admin · Users'],
        summary: 'Create a user (ADMIN only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'full_name', 'password', 'roles'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  full_name: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                  roles: { type: 'array', items: { type: 'string', enum: ['BUYER', 'APPROVER', 'ADMIN'] } },
                  approval_limit: { type: 'number', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: standardErrors[401],
          403: standardErrors[403],
          409: standardErrors[409],
        },
      },
    },
    '/api/v1/auth/users/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Admin · Users'],
        summary: 'Get a user by id (ADMIN only)',
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: standardErrors[401],
          403: standardErrors[403],
          404: standardErrors[404],
        },
      },
      patch: {
        tags: ['Admin · Users'],
        summary: 'Update a user (roles, is_active, approval_limit) (ADMIN only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  full_name: { type: 'string' },
                  roles: { type: 'array', items: { type: 'string', enum: ['BUYER', 'APPROVER', 'ADMIN'] } },
                  is_active: { type: 'boolean' },
                  approval_limit: { type: 'number', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: standardErrors[401],
          403: standardErrors[403],
          404: standardErrors[404],
        },
      },
    },
    '/api/v1/auth/users/{id}/reset-password': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      post: {
        tags: ['Admin · Users'],
        summary: 'Set a new password for any user (ADMIN only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: { password: { type: 'string', minLength: 8 } },
              },
            },
          },
        },
        responses: { 204: { description: 'OK' }, 401: standardErrors[401], 403: standardErrors[403], 404: standardErrors[404] },
      },
    },
  },
};

module.exports = spec;
