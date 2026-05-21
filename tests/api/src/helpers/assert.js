function expectErrorEnvelope(res, expectedCode, expectedStatus) {
  expect(res.status).toBe(expectedStatus);
  expect(res.data).toBeDefined();
  expect(res.data.error).toBeDefined();
  expect(res.data.error.code).toBe(expectedCode);
  expect(typeof res.data.error.message).toBe('string');
  expect(typeof res.data.error.correlation_id).toBe('string');
  expect(res.data.error.correlation_id.length).toBeGreaterThan(0);
}

function expectOk(res) {
  expect([200, 201, 204]).toContain(res.status);
}

function expectPaginated(res) {
  expect(res.status).toBe(200);
  expect(res.data).toBeDefined();
  expect(Array.isArray(res.data.data)).toBe(true);
  expect(typeof res.data.page).toBe('number');
  expect(typeof res.data.page_size).toBe('number');
  expect(typeof res.data.total).toBe('number');
}

module.exports = { expectErrorEnvelope, expectOk, expectPaginated };
