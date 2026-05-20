// Internal endpoint for service-to-service notification fanout.
// Auth: shared secret header `X-Internal-Token: <INTERNAL_SERVICE_TOKEN>`.
// Looks up device tokens for the requested users (explicit ids + role-based fanout),
// sends the same FCM payload to each, and prunes invalidated tokens.

const express = require('express');
const { z } = require('zod');
const { pool } = require('./db');
const { httpError } = require('./middleware');
const fcm = require('./fcm');

const router = express.Router();

function internalAuth(req, res, next) {
  const secret = process.env.INTERNAL_SERVICE_TOKEN;
  if (!secret) {
    return res.status(503).json({
      error: {
        code: 'INTERNAL_AUTH_NOT_CONFIGURED',
        message: 'INTERNAL_SERVICE_TOKEN is not set on IAM',
        correlation_id: req.correlationId,
      },
    });
  }
  const provided = req.headers['x-internal-token'];
  if (!provided || provided !== secret) {
    return res.status(401).json({
      error: {
        code: 'INTERNAL_AUTH_REQUIRED',
        message: 'Missing or invalid X-Internal-Token header',
        correlation_id: req.correlationId,
      },
    });
  }
  next();
}

const notifyBodySchema = z.object({
  user_ids: z.array(z.string().uuid()).optional(),
  roles: z.array(z.enum(['BUYER', 'APPROVER', 'ADMIN'])).optional(),
  min_approval_limit: z.number().nonnegative().optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  data: z.record(z.string()).optional(),
  deep_link: z.string().max(256).optional(),
}).refine(
  (v) => (v.user_ids && v.user_ids.length) || (v.roles && v.roles.length),
  { message: 'Provide user_ids or roles' },
);

/**
 * Resolves the recipient set: union of explicit user ids and role-based fanout.
 * When `min_approval_limit` is set, APPROVERs are filtered to those whose limit >= the value.
 */
async function resolveTargetUserIds({ user_ids, roles, min_approval_limit }) {
  const ids = new Set();

  if (user_ids && user_ids.length) {
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE id = ANY($1::uuid[]) AND is_active = TRUE',
      [user_ids],
    );
    for (const r of rows) ids.add(r.id);
  }

  if (roles && roles.length) {
    const params = [roles];
    let sql = 'SELECT id FROM users WHERE is_active = TRUE AND roles && $1::text[]';
    if (min_approval_limit != null) {
      // APPROVERs must clear the limit; non-APPROVERs in the role set (e.g., ADMIN) always qualify.
      params.push(min_approval_limit);
      sql += ` AND ((NOT ('APPROVER' = ANY(roles))) OR (approval_limit IS NOT NULL AND approval_limit >= $${params.length}))`;
    }
    const { rows } = await pool.query(sql, params);
    for (const r of rows) ids.add(r.id);
  }

  return [...ids];
}

async function deviceTokensFor(userIds) {
  if (userIds.length === 0) return [];
  const { rows } = await pool.query(
    'SELECT token FROM devices WHERE user_id = ANY($1::uuid[])',
    [userIds],
  );
  return rows.map((r) => r.token);
}

async function pruneTokens(tokens) {
  if (tokens.length === 0) return 0;
  const { rowCount } = await pool.query(
    'DELETE FROM devices WHERE token = ANY($1::text[])',
    [tokens],
  );
  return rowCount;
}

router.post('/notifications/users', internalAuth, async (req, res, next) => {
  try {
    const body = notifyBodySchema.parse(req.body);
    const recipientIds = await resolveTargetUserIds(body);
    const tokens = await deviceTokensFor(recipientIds);

    if (tokens.length === 0) {
      return res.json({ recipients: recipientIds.length, devices: 0, sent: 0, failed: 0, pruned: 0 });
    }

    if (!fcm.isConfigured()) {
      return res.status(503).json({
        error: {
          code: 'FCM_NOT_CONFIGURED',
          message: 'IAM is missing FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON',
          correlation_id: req.correlationId,
        },
      });
    }

    const { sent, failed, pruneTokens: bad } = await fcm.sendToTokens(tokens, {
      title: body.title,
      body: body.body,
      data: body.data,
      deepLink: body.deep_link,
    });
    const pruned = await pruneTokens(bad);

    res.json({
      recipients: recipientIds.length,
      devices: tokens.length,
      sent,
      failed,
      pruned,
    });
  } catch (e) { next(e); }
});

module.exports = router;
