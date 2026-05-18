const { Router } = require('express');
const { asyncHandler } = require('../common/async-handler');
const { requireAuth, requireRoles } = require('../auth/auth');
const svc = require('./service');
const {
  validate,
  createPoSchema,
  updatePoSchema,
  lineItemSchema,
  updateLineItemSchema,
  reasonSchema,
  optionalReasonSchema,
  fulfillSchema,
} = require('./dto');

const router = Router();
router.use(requireAuth);

router.post('/',
  requireRoles('BUYER'),
  validate(createPoSchema),
  asyncHandler(async (req, res) => res.status(201).json(await svc.create(req, req.user, req.body))),
);

router.get('/',
  asyncHandler(async (req, res) => res.json(await svc.list(req.query))),
);

router.get('/:id',
  asyncHandler(async (req, res) => res.json(await svc.getById(req.params.id))),
);

router.patch('/:id',
  requireRoles('BUYER'),
  validate(updatePoSchema),
  asyncHandler(async (req, res) => res.json(await svc.update(req.params.id, req.body))),
);

router.delete('/:id',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => { await svc.deleteOne(req.params.id); res.status(204).end(); }),
);

router.post('/:id/line-items',
  requireRoles('BUYER'),
  validate(lineItemSchema),
  asyncHandler(async (req, res) => res.status(201).json(await svc.addLineItem(req.params.id, req.body))),
);

router.get('/:id/line-items',
  asyncHandler(async (req, res) => res.json(await svc.listLineItems(req.params.id))),
);

router.patch('/:id/line-items/:line_id',
  requireRoles('BUYER'),
  validate(updateLineItemSchema),
  asyncHandler(async (req, res) => res.json(await svc.updateLineItem(req.params.id, req.params.line_id, req.body))),
);

router.delete('/:id/line-items/:line_id',
  requireRoles('BUYER'),
  asyncHandler(async (req, res) => res.json(await svc.deleteLineItem(req.params.id, req.params.line_id))),
);

router.post('/:id/submit',
  requireRoles('BUYER'),
  asyncHandler(async (req, res) => res.json(await svc.submit(req.params.id, req.user))),
);

router.post('/:id/approve',
  requireRoles('APPROVER'),
  asyncHandler(async (req, res) => res.json(await svc.approve(req.params.id, req.user))),
);

router.post('/:id/reject',
  requireRoles('APPROVER'),
  validate(reasonSchema),
  asyncHandler(async (req, res) => res.json(await svc.reject(req.params.id, req.user, req.body.reason))),
);

router.post('/:id/fulfill',
  requireRoles('BUYER'),
  validate(fulfillSchema),
  asyncHandler(async (req, res) => res.json(await svc.fulfill(req.params.id, req.body.actual_delivery_date))),
);

router.post('/:id/cancel',
  requireRoles('BUYER'),
  validate(optionalReasonSchema),
  asyncHandler(async (req, res) => res.json(await svc.cancel(req.params.id, req.body?.reason))),
);

router.post('/:id/revise',
  requireRoles('BUYER'),
  asyncHandler(async (req, res) => res.json(await svc.revise(req.params.id))),
);

router.post('/:id/close',
  requireRoles('BUYER', 'APPROVER'),
  asyncHandler(async (req, res) => res.json(await svc.close(req.params.id))),
);

module.exports = router;
