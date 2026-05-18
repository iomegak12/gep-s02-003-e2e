const { Prisma } = require('@prisma/client');
const prisma = require('../prisma');
const suppliers = require('../suppliers-client/suppliers-client');
const { AppError } = require('../common/errors');
const { assertTransition } = require('./state-machine');

const threshold = new Prisma.Decimal(process.env.DEFAULT_APPROVAL_THRESHOLD ?? '100000');

function d(n) { return new Prisma.Decimal(n); }
function round2(n) { return n.toDecimalPlaces(2); }

function computeTotals(items) {
  let subtotal = d(0);
  let tax = d(0);
  for (const li of items) {
    const lineTotal = d(li.quantity).mul(d(li.unit_price));
    subtotal = subtotal.add(lineTotal);
    tax = tax.add(lineTotal.mul(d(li.tax_rate ?? 0)).div(100));
  }
  subtotal = round2(subtotal);
  tax = round2(tax);
  return { subtotal, tax_amount: tax, total_amount: round2(subtotal.add(tax)) };
}

function serialize(po) {
  if (po == null) return po;
  if (Array.isArray(po)) return po.map(serialize);
  if (po instanceof Prisma.Decimal) return Number(po);
  if (po instanceof Date) return po.toISOString();
  if (typeof po === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(po)) out[k] = serialize(v);
    return out;
  }
  return po;
}

async function nextPoNumber(tx) {
  const year = new Date().getUTCFullYear();
  await tx.poNumberSeq.upsert({ where: { year }, create: { year, last_value: 0 }, update: {} });
  const updated = await tx.$queryRaw`
    UPDATE po_number_seq SET last_value = last_value + 1 WHERE year = ${year} RETURNING last_value
  `;
  const n = updated[0].last_value;
  return `PO-${year}-${String(n).padStart(5, '0')}`;
}

async function loadRaw(id) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { line_items: true } });
  if (!po) throw new AppError(404, 'PURCHASE_ORDER_NOT_FOUND', `PO ${id} not found`, { id });
  return po;
}

async function create(req, principal, body) {
  const supplier = await suppliers.getSupplier(req, body.supplier_id);
  if (supplier.status !== 'ACTIVE') {
    throw new AppError(422, 'SUPPLIER_NOT_ACTIVE', `Supplier ${supplier.id} is ${supplier.status}`, { supplier_id: supplier.id, status: supplier.status });
  }

  const totals = computeTotals(body.line_items);
  const requires_approval = totals.total_amount.gt(threshold);

  const po = await prisma.$transaction(async tx => {
    const po_number = await nextPoNumber(tx);
    return tx.purchaseOrder.create({
      data: {
        po_number,
        supplier_id: body.supplier_id,
        supplier_snapshot: { display_name: supplier.display_name, category: supplier.category },
        buyer_id: principal.sub,
        status: 'DRAFT',
        currency: body.currency,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total_amount: totals.total_amount,
        expected_delivery_date: body.expected_delivery_date ? new Date(body.expected_delivery_date) : null,
        delivery_address: body.delivery_address,
        payment_terms: body.payment_terms,
        notes: body.notes,
        requires_approval,
        approval_threshold: threshold,
        line_items: {
          create: body.line_items.map(li => ({
            line_number: li.line_number,
            item_description: li.item_description,
            sku: li.sku,
            quantity: d(li.quantity),
            unit_of_measure: li.unit_of_measure,
            unit_price: d(li.unit_price),
            tax_rate: d(li.tax_rate ?? 0),
            line_total: round2(d(li.quantity).mul(d(li.unit_price))),
            notes: li.notes,
          })),
        },
      },
      include: { line_items: true },
    });
  });
  return serialize(po);
}

async function list(filters) {
  const page = Math.max(1, parseInt(filters.page || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(filters.page_size || '20', 10)));

  const where = {};
  if (filters.status) {
    const vals = String(filters.status).split(',');
    where.status = vals.length > 1 ? { in: vals } : vals[0];
  }
  if (filters.supplier_id) where.supplier_id = filters.supplier_id;
  if (filters.buyer_id) where.buyer_id = filters.buyer_id;
  if (filters.currency) where.currency = filters.currency;
  if (filters.created_after || filters.created_before) {
    where.created_at = {};
    if (filters.created_after) where.created_at.gte = new Date(filters.created_after);
    if (filters.created_before) where.created_at.lte = new Date(filters.created_before);
  }
  if (filters.min_amount || filters.max_amount) {
    where.total_amount = {};
    if (filters.min_amount) where.total_amount.gte = d(filters.min_amount);
    if (filters.max_amount) where.total_amount.lte = d(filters.max_amount);
  }
  if (filters.q) {
    where.OR = [
      { po_number: { contains: filters.q, mode: 'insensitive' } },
      { notes: { contains: filters.q, mode: 'insensitive' } },
      { line_items: { some: { item_description: { contains: filters.q, mode: 'insensitive' } } } },
    ];
  }

  const sort = String(filters.sort || '-created_at');
  const orderBy = sort.split(',').map(s => {
    s = s.trim();
    const desc = s.startsWith('-');
    return { [desc ? s.slice(1) : s]: desc ? 'desc' : 'asc' };
  });

  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: { line_items: true },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);
  return { data: serialize(data), page, page_size: pageSize, total };
}

async function getById(id) {
  return serialize(await loadRaw(id));
}

async function update(id, body) {
  const po = await loadRaw(id);
  if (po.status !== 'DRAFT') throw new AppError(409, 'INVALID_STATE_FOR_EDIT', 'Only DRAFT POs can be edited');
  const patch = { ...body };
  if (body.expected_delivery_date) patch.expected_delivery_date = new Date(body.expected_delivery_date);
  const updated = await prisma.purchaseOrder.update({
    where: { id }, data: patch, include: { line_items: true },
  });
  return serialize(updated);
}

async function deleteOne(id) {
  const po = await loadRaw(id);
  if (!['DRAFT', 'CANCELLED'].includes(po.status)) {
    throw new AppError(409, 'INVALID_STATE_FOR_DELETE', 'Only DRAFT or CANCELLED POs can be deleted');
  }
  await prisma.purchaseOrder.delete({ where: { id } });
}

async function addLineItem(po_id, item) {
  const po = await loadRaw(po_id);
  if (po.status !== 'DRAFT') throw new AppError(409, 'INVALID_STATE_FOR_EDIT', 'Only DRAFT POs can be edited');
  const line_total = round2(d(item.quantity).mul(d(item.unit_price)));
  await prisma.pOLineItem.create({
    data: {
      ...item,
      po_id,
      quantity: d(item.quantity),
      unit_price: d(item.unit_price),
      tax_rate: d(item.tax_rate ?? 0),
      line_total,
    },
  });
  return recalcAndReturn(po_id);
}

async function listLineItems(po_id) {
  await loadRaw(po_id);
  const items = await prisma.pOLineItem.findMany({ where: { po_id }, orderBy: { line_number: 'asc' } });
  return { data: serialize(items) };
}

async function updateLineItem(po_id, line_id, body) {
  const po = await loadRaw(po_id);
  if (po.status !== 'DRAFT') throw new AppError(409, 'INVALID_STATE_FOR_EDIT', 'Only DRAFT POs can be edited');
  const item = await prisma.pOLineItem.findFirst({ where: { id: line_id, po_id } });
  if (!item) throw new AppError(404, 'LINE_ITEM_NOT_FOUND', `Line item ${line_id} not found`);
  const merged = { ...item, ...body };
  const line_total = round2(d(merged.quantity).mul(d(merged.unit_price)));
  await prisma.pOLineItem.update({
    where: { id: line_id },
    data: {
      item_description: body.item_description,
      sku: body.sku,
      quantity: body.quantity != null ? d(body.quantity) : undefined,
      unit_of_measure: body.unit_of_measure,
      unit_price: body.unit_price != null ? d(body.unit_price) : undefined,
      tax_rate: body.tax_rate != null ? d(body.tax_rate) : undefined,
      notes: body.notes,
      line_total,
    },
  });
  return recalcAndReturn(po_id);
}

async function deleteLineItem(po_id, line_id) {
  const po = await loadRaw(po_id);
  if (po.status !== 'DRAFT') throw new AppError(409, 'INVALID_STATE_FOR_EDIT', 'Only DRAFT POs can be edited');
  const item = await prisma.pOLineItem.findFirst({ where: { id: line_id, po_id } });
  if (!item) throw new AppError(404, 'LINE_ITEM_NOT_FOUND', `Line item ${line_id} not found`);
  await prisma.pOLineItem.delete({ where: { id: line_id } });
  return recalcAndReturn(po_id);
}

async function recalcAndReturn(po_id) {
  const items = await prisma.pOLineItem.findMany({ where: { po_id } });
  const totals = computeTotals(items.map(i => ({
    quantity: i.quantity.toString(),
    unit_price: i.unit_price.toString(),
    tax_rate: i.tax_rate.toString(),
  })));
  const requires_approval = totals.total_amount.gt(threshold);
  const updated = await prisma.purchaseOrder.update({
    where: { id: po_id },
    data: { subtotal: totals.subtotal, tax_amount: totals.tax_amount, total_amount: totals.total_amount, requires_approval },
    include: { line_items: true },
  });
  return serialize(updated);
}

async function submit(id, principal) {
  const po = await loadRaw(id);
  if (po.buyer_id !== principal.sub && !principal.roles.includes('ADMIN')) {
    throw new AppError(403, 'INSUFFICIENT_ROLE', 'Only the buyer can submit this PO');
  }
  assertTransition(po.status, 'SUBMITTED');
  if (po.total_amount.lte(threshold)) {
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED', submitted_at: new Date(), approved_at: new Date() },
      include: { line_items: true },
    });
    return { ...serialize(updated), auto_approved: true };
  }
  const updated = await prisma.purchaseOrder.update({
    where: { id }, data: { status: 'SUBMITTED', submitted_at: new Date() }, include: { line_items: true },
  });
  return { ...serialize(updated), auto_approved: false };
}

async function approve(id, principal) {
  const po = await loadRaw(id);
  assertTransition(po.status, 'APPROVED');
  const limit = principal.approval_limit;
  if (limit == null || po.total_amount.gt(d(limit))) {
    throw new AppError(403, 'APPROVAL_LIMIT_EXCEEDED', `Your approval limit (${limit ?? 0}) is below PO total (${po.total_amount})`, { approval_limit: limit, total_amount: Number(po.total_amount) });
  }
  const updated = await prisma.purchaseOrder.update({
    where: { id }, data: { status: 'APPROVED', approver_id: principal.sub, approved_at: new Date() }, include: { line_items: true },
  });
  return serialize(updated);
}

async function reject(id, principal, reason) {
  const po = await loadRaw(id);
  assertTransition(po.status, 'REJECTED');
  const updated = await prisma.purchaseOrder.update({
    where: { id }, data: { status: 'REJECTED', approver_id: principal.sub, rejection_reason: reason }, include: { line_items: true },
  });
  return serialize(updated);
}

async function fulfill(id, actual_delivery_date) {
  const po = await loadRaw(id);
  assertTransition(po.status, 'FULFILLED');
  const updated = await prisma.purchaseOrder.update({
    where: { id }, data: { status: 'FULFILLED', fulfilled_at: new Date(), actual_delivery_date: new Date(actual_delivery_date) }, include: { line_items: true },
  });
  return serialize(updated);
}

async function cancel(id, reason) {
  const po = await loadRaw(id);
  assertTransition(po.status, 'CANCELLED');
  const updated = await prisma.purchaseOrder.update({
    where: { id }, data: { status: 'CANCELLED', notes: reason ? `${po.notes ?? ''}\n[cancelled] ${reason}`.trim() : po.notes }, include: { line_items: true },
  });
  return serialize(updated);
}

async function revise(id) {
  const po = await loadRaw(id);
  assertTransition(po.status, 'DRAFT');
  const updated = await prisma.purchaseOrder.update({
    where: { id }, data: { status: 'DRAFT', submitted_at: null, approved_at: null, rejection_reason: null, approver_id: null }, include: { line_items: true },
  });
  return serialize(updated);
}

async function close(id) {
  const po = await loadRaw(id);
  assertTransition(po.status, 'CLOSED');
  const updated = await prisma.purchaseOrder.update({
    where: { id }, data: { status: 'CLOSED', closed_at: new Date() }, include: { line_items: true },
  });
  return serialize(updated);
}

module.exports = {
  create, list, getById, update, deleteOne,
  addLineItem, listLineItems, updateLineItem, deleteLineItem,
  submit, approve, reject, fulfill, cancel, revise, close,
};
