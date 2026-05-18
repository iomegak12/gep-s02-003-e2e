const jwt = require('jsonwebtoken');
const { AppError } = require('../common/errors');

function jwtMiddleware(req, _res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) {
    return next();
  }
  try {
    const payload = jwt.verify(h.slice(7), process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISSUER || 'gep-auth',
      audience: process.env.JWT_AUDIENCE || 'gep-po',
    });
    req.user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles || [],
      approval_limit: payload.approval_limit ?? null,
    };
    next();
  } catch (e) {
    const code = e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    next(new AppError(401, code, e.message));
  }
}

function requireAuth(req, _res, next) {
  if (!req.user) return next(new AppError(401, 'AUTH_REQUIRED', 'Missing bearer token'));
  next();
}

function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'AUTH_REQUIRED', 'Missing bearer token'));
    if (roles.length && !roles.some(r => req.user.roles.includes(r))) {
      return next(new AppError(403, 'INSUFFICIENT_ROLE', `Requires one of: ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = { jwtMiddleware, requireAuth, requireRoles };
