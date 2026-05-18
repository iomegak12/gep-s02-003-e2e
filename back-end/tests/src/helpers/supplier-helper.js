const { post } = require('./http');
const { tokens } = require('./auth');
const { makeSupplierPayload } = require('./fixtures');

async function createActiveSupplier(category = 'RAW_MATERIALS', country = 'IN') {
  const buyer = await tokens.buyer();
  const admin = await tokens.admin();
  const create = await post('supplier', '/api/v1/suppliers', makeSupplierPayload({ category, country }), { token: buyer });
  if (create.status !== 201) {
    throw new Error(`Could not create supplier: ${create.status} ${JSON.stringify(create.data)}`);
  }
  const sid = create.data.id;
  const approve = await post('supplier', `/api/v1/suppliers/${sid}/approve`, {}, { token: admin });
  if (approve.status !== 200) {
    throw new Error(`Could not approve supplier: ${approve.status} ${JSON.stringify(approve.data)}`);
  }
  return { id: sid, category };
}

async function createBlacklistedSupplier() {
  const buyer = await tokens.buyer();
  const admin = await tokens.admin();
  const create = await post('supplier', '/api/v1/suppliers', makeSupplierPayload(), { token: buyer });
  const sid = create.data.id;
  await post('supplier', `/api/v1/suppliers/${sid}/blacklist`, { reason: 'test' }, { token: admin });
  return sid;
}

module.exports = { createActiveSupplier, createBlacklistedSupplier };
