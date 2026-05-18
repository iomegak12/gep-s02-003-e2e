const { Router } = require('express');
const { Prisma } = require('@prisma/client');
const prisma = require('../prisma');
const suppliers = require('../suppliers-client/suppliers-client');
const { asyncHandler } = require('../common/async-handler');
const { requireAuth } = require('../auth/auth');

const FULFILLED_STATUSES = ['APPROVED', 'FULFILLED', 'CLOSED'];

function periodToRange(period) {
  const now = new Date();
  const to = now;
  let from;
  if (period === 'ytd') {
    from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  } else if (period === 'last_30_days') {
    from = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  } else if (period === 'last_90_days') {
    from = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
  } else if (period === 'last_180_days') {
    from = new Date(now.getTime() - 180 * 24 * 3600 * 1000);
  } else {
    from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  }
  return { from, to };
}

async function byStatus() {
  const rows = await prisma.purchaseOrder.groupBy({
    by: ['status'], _count: { _all: true }, _sum: { total_amount: true },
  });
  return {
    data: rows.map(r => ({ status: r.status, count: r._count._all, total_amount: Number(r._sum.total_amount ?? 0) })),
    generated_at: new Date().toISOString(),
  };
}

async function spendBySupplier(period, limit) {
  const { from, to } = periodToRange(period);
  const rows = await prisma.purchaseOrder.groupBy({
    by: ['supplier_id'],
    where: { status: { in: FULFILLED_STATUSES }, created_at: { gte: from, lte: to } },
    _sum: { total_amount: true },
    _count: { _all: true },
    orderBy: { _sum: { total_amount: 'desc' } },
    take: limit,
  });
  return {
    period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    data: rows.map(r => ({ supplier_id: r.supplier_id, total_spend: Number(r._sum.total_amount ?? 0), po_count: r._count._all })),
    generated_at: new Date().toISOString(),
  };
}

async function spendByCategory(req, period) {
  const { from, to } = periodToRange(period);
  const rows = await prisma.purchaseOrder.groupBy({
    by: ['supplier_id'],
    where: { status: { in: FULFILLED_STATUSES }, created_at: { gte: from, lte: to } },
    _sum: { total_amount: true },
    _count: { _all: true },
  });
  const supplierIds = rows.map(r => r.supplier_id);
  const suppliersMap = await suppliers.getSuppliersByIds(req, supplierIds);
  const byCat = {};
  for (const r of rows) {
    const cat = suppliersMap[r.supplier_id]?.category ?? 'OTHER';
    const bucket = (byCat[cat] ??= { total_spend: 0, po_count: 0 });
    bucket.total_spend += Number(r._sum.total_amount ?? 0);
    bucket.po_count += r._count._all;
  }
  const data = Object.entries(byCat)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total_spend - a.total_spend);
  return {
    period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    data,
    generated_at: new Date().toISOString(),
  };
}

async function monthlySpend(year) {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));
  const rows = await prisma.$queryRaw`
    SELECT EXTRACT(MONTH FROM created_at)::int AS month,
           SUM(total_amount)::text AS total_spend,
           COUNT(*)::bigint AS po_count
    FROM purchase_orders
    WHERE created_at >= ${from} AND created_at < ${to}
      AND status IN ('APPROVED','FULFILLED','CLOSED')
    GROUP BY 1
    ORDER BY 1
  `;
  return {
    year,
    data: rows.map(r => ({ month: r.month, total_spend: Number(r.total_spend), po_count: Number(r.po_count) })),
    generated_at: new Date().toISOString(),
  };
}

async function pendingApprovals(principal) {
  const limit = principal.approval_limit;
  const where = { status: 'SUBMITTED' };
  if (limit != null) where.total_amount = { lte: new Prisma.Decimal(limit) };
  const [count, sum] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.aggregate({ where, _sum: { total_amount: true } }),
  ]);
  return { count, total_value: Number(sum._sum.total_amount ?? 0), generated_at: new Date().toISOString() };
}

async function cycleTime(req) {
  const fulfilled = await prisma.purchaseOrder.findMany({
    where: { status: { in: ['FULFILLED', 'CLOSED'] }, fulfilled_at: { not: null } },
    select: { supplier_id: true, created_at: true, fulfilled_at: true },
  });
  if (!fulfilled.length) return { data: [], generated_at: new Date().toISOString() };
  const supplierIds = Array.from(new Set(fulfilled.map(p => p.supplier_id)));
  const suppliersMap = await suppliers.getSuppliersByIds(req, supplierIds);
  const acc = {};
  for (const p of fulfilled) {
    const cat = suppliersMap[p.supplier_id]?.category ?? 'OTHER';
    const days = (p.fulfilled_at.getTime() - p.created_at.getTime()) / 86_400_000;
    const b = (acc[cat] ??= { totalDays: 0, n: 0 });
    b.totalDays += days;
    b.n += 1;
  }
  return {
    data: Object.entries(acc).map(([category, v]) => ({ category, average_days: +(v.totalDays / v.n).toFixed(2), po_count: v.n })),
    generated_at: new Date().toISOString(),
  };
}

const router = Router();
router.use(requireAuth);

router.get('/by-status', asyncHandler(async (_req, res) => res.json(await byStatus())));

router.get('/spend-by-supplier', asyncHandler(async (req, res) => {
  const period = req.query.period || 'last_90_days';
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
  res.json(await spendBySupplier(period, limit));
}));

router.get('/spend-by-category', asyncHandler(async (req, res) => {
  const period = req.query.period || 'ytd';
  res.json(await spendByCategory(req, period));
}));

router.get('/monthly-spend', asyncHandler(async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getUTCFullYear();
  res.json(await monthlySpend(year));
}));

router.get('/pending-approvals', asyncHandler(async (req, res) => res.json(await pendingApprovals(req.user))));

router.get('/cycle-time', asyncHandler(async (req, res) => res.json(await cycleTime(req))));

module.exports = router;
