const { v4: uuidv4 } = require('uuid');
const { verify } = require('./jwt');

function correlation(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || `req_${uuidv4()}`;
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
}

function authRequired(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Missing bearer token', correlation_id: req.correlationId } });
  }
  try {
    req.user = verify(h.slice(7));
    next();
  } catch (e) {
    const code = e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    return res.status(401).json({ error: { code, message: e.message, correlation_id: req.correlationId } });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    if (!roles.some(r => userRoles.includes(r))) {
      return res.status(403).json({ error: { code: 'INSUFFICIENT_ROLE', message: `Requires one of: ${roles.join(', ')}`, correlation_id: req.correlationId } });
    }
    next();
  };
}

function errorHandler(err, req, res, next) {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Validation failed', details: err.errors, correlation_id: req.correlationId } });
  }
  if (err.status && err.code) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details, correlation_id: req.correlationId } });
  }
  console.error('[iam] unhandled', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected error', correlation_id: req.correlationId } });
}

function httpError(status, code, message, details) {
  const e = new Error(message);
  e.status = status; e.code = code; e.details = details;
  return e;
}

module.exports = { correlation, authRequired, requireRole, errorHandler, httpError };
