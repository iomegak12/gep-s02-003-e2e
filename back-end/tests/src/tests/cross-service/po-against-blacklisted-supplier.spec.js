const { post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makePoPayload } = require('../../helpers/fixtures');
const { createBlacklistedSupplier } = require('../../helpers/supplier-helper');
const { expectErrorEnvelope } = require('../../helpers/assert');

describe('cross-service: PO against non-ACTIVE supplier', () => {
  it('blacklisted supplier → 422 SUPPLIER_NOT_ACTIVE', async () => {
    const buyer = await tokens.buyer();
    const sid = await createBlacklistedSupplier();
    const res = await post('po', '/api/v1/purchase-orders', makePoPayload({ supplier_id: sid }), { token: buyer });
    expectErrorEnvelope(res, 'SUPPLIER_NOT_ACTIVE', 422);
  });
});
