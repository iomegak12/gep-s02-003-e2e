const express = require('express');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const { pool } = require('./db');
const { sign, TTL } = require('./jwt');
const { authRequired, requireRole, httpError } = require('./middleware');

const router = express.Router();

const ROLES = ['BUYER', 'APPROVER', 'ADMIN'];

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(200),
  password: z.string().min(8),
  roles: z.array(z.enum(ROLES)).min(1),
  approval_limit: z.number().nullable().optional(),
});
const patchUserSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  roles: z.array(z.enum(ROLES)).min(1).optional(),
  is_active: z.boolean().optional(),
  approval_limit: z.number().nullable().optional(),
});
const passwordSchema = z.object({ password: z.string().min(8) });
const changePasswordSchema = z.object({ current_password: z.string().min(1), new_password: z.string().min(8) });

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    roles: u.roles,
    is_active: u.is_active,
    approval_limit: u.approval_limit != null ? Number(u.approval_limit) : null,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
}

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const u = await findByEmail(email);
    if (!u || !u.is_active) throw httpError(401, 'AUTH_FAILED', 'Invalid credentials');
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) throw httpError(401, 'AUTH_FAILED', 'Invalid credentials');
    res.json({
      access_token: sign(u),
      token_type: 'Bearer',
      expires_in: TTL,
      user: publicUser(u),
    });
  } catch (e) { next(e); }
});

router.post('/auth/logout', authRequired, (req, res) => res.status(204).end());

router.get('/auth/me', authRequired, async (req, res, next) => {
  try {
    const u = await findById(req.user.sub);
    if (!u) throw httpError(404, 'USER_NOT_FOUND', 'User no longer exists');
    res.json(publicUser(u));
  } catch (e) { next(e); }
});

router.patch('/auth/me/password', authRequired, async (req, res, next) => {
  try {
    const { current_password, new_password } = changePasswordSchema.parse(req.body);
    const u = await findById(req.user.sub);
    if (!u) throw httpError(404, 'USER_NOT_FOUND', 'User no longer exists');
    if (!await bcrypt.compare(current_password, u.password_hash)) {
      throw httpError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is wrong');
    }
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, u.id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

router.post('/auth/users', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const existing = await findByEmail(body.email);
    if (existing) throw httpError(409, 'DUPLICATE_RESOURCE', 'Email already exists');
    const hash = await bcrypt.hash(body.password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, full_name, password_hash, roles, approval_limit)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [body.email.toLowerCase(), body.full_name, hash, body.roles, body.approval_limit ?? null]
    );
    res.status(201).json(publicUser(rows[0]));
  } catch (e) { next(e); }
});

router.get('/auth/users', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size || '20', 10)));
    const offset = (page - 1) * pageSize;
    const [{ rows: data }, { rows: cnt }] = await Promise.all([
      pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [pageSize, offset]),
      pool.query('SELECT COUNT(*)::int AS total FROM users'),
    ]);
    res.json({ data: data.map(publicUser), page, page_size: pageSize, total: cnt[0].total });
  } catch (e) { next(e); }
});

router.get('/auth/users/:id', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const u = await findById(req.params.id);
    if (!u) throw httpError(404, 'USER_NOT_FOUND', 'User not found');
    res.json(publicUser(u));
  } catch (e) { next(e); }
});

router.patch('/auth/users/:id', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const body = patchUserSchema.parse(req.body);
    const u = await findById(req.params.id);
    if (!u) throw httpError(404, 'USER_NOT_FOUND', 'User not found');
    const fields = []; const vals = [];
    for (const [k, v] of Object.entries(body)) {
      vals.push(v); fields.push(`${k} = $${vals.length}`);
    }
    if (!fields.length) return res.json(publicUser(u));
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    res.json(publicUser(rows[0]));
  } catch (e) { next(e); }
});

router.post('/auth/users/:id/reset-password', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { password } = passwordSchema.parse(req.body);
    const u = await findById(req.params.id);
    if (!u) throw httpError(404, 'USER_NOT_FOUND', 'User not found');
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, u.id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
