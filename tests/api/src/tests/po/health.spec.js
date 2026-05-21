const { get } = require('../../helpers/http');

describe('po: GET /health', () => {
  it('returns 200 ok:true', async () => {
    const res = await get('po', '/health');
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
  });
});
