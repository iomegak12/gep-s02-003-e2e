const { Router } = require('express');
const prisma = require('../prisma');
const { asyncHandler } = require('../common/async-handler');
const { requireAuth } = require('../auth/auth');

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  const take = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
  if (!q) return res.json({ data: [] });
  const rows = await prisma.purchaseOrder.findMany({
    where: {
      OR: [
        { po_number: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, po_number: true, status: true, total_amount: true, currency: true, supplier_id: true, supplier_snapshot: true },
    take,
  });
  res.json({ data: rows.map(r => ({ ...r, total_amount: Number(r.total_amount) })) });
}));

module.exports = router;
