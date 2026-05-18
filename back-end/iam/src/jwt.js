const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const SECRET = process.env.JWT_SECRET;
const ISSUER = process.env.JWT_ISSUER || 'gep-auth';
const TTL = parseInt(process.env.ACCESS_TOKEN_TTL_SECONDS || '86400', 10);

function sign(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.full_name,
    roles: user.roles,
    approval_limit: user.approval_limit != null ? Number(user.approval_limit) : null,
    iss: ISSUER,
    aud: ['gep-supplier', 'gep-po'],
    jti: uuidv4(),
  };
  return jwt.sign(payload, SECRET, { algorithm: 'HS256', expiresIn: TTL });
}

function verify(token) {
  return jwt.verify(token, SECRET, { algorithms: ['HS256'], issuer: ISSUER });
}

module.exports = { sign, verify, TTL };
