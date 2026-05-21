const { post } = require('../../helpers/http');
const { tokens } = require('../../helpers/auth');
const { makePoPayload } = require('../../helpers/fixtures');
const { expectErrorEnvelope } = require('../../helpers/assert');
const { v4: uuid } = require('uuid');

describe('cross-service: PO against unknown supplier UUID', () => {
  it('returns 422 SUPPLIER_NOT_FOUND', async () => {
    const buyer = await tokens.buyer();
    const res = await post('po', '/api/v1/purchase-orders', makePoPayload({ supplier_id: uuid() }), { token: buyer });
    expectErrorEnvelope(res, 'SUPPLIER_NOT_FOUND', 422);
  });
});
