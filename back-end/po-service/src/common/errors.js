const { v4: uuidv4 } = require('uuid');

class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function correlationMiddleware(req, res, next) {
  const cid = req.headers['x-correlation-id'] || `req_${uuidv4()}`;
  req.correlationId = cid;
  res.setHeader('X-Correlation-Id', cid);
  next();
}

const STATUS_CODE_MAP = {
  400: 'VALIDATION_FAILED',
  401: 'AUTH_REQUIRED',
  403: 'INSUFFICIENT_ROLE',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'BUSINESS_RULE_VIOLATION',
};

function mapStatusToCode(status) {
  return STATUS_CODE_MAP[status] || 'ERROR';
}

function errorHandler(err, req, res, _next) {
  const correlation_id = req.correlationId;
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details, correlation_id },
    });
  }
  console.error('[po] unhandled', err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Unexpected error', correlation_id },
  });
}

module.exports = { AppError, correlationMiddleware, errorHandler, mapStatusToCode };
