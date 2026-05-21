const { v4: uuid } = require('uuid');

function makeSupplierPayload(opts = {}) {
  const stamp = Date.now().toString(36) + uuid().slice(0, 4);
  return {
    supplier_code: `SUP-TEST-${stamp}`.toUpperCase(),
    legal_name: opts.display_name ?? `Test Supplier ${stamp}`,
    display_name: opts.display_name ?? `Test Supplier ${stamp}`,
    category: opts.category ?? 'RAW_MATERIALS',
    sub_category: 'STEEL',
    country: opts.country ?? 'IN',
    region: 'APAC',
    tax_id: `TAX-${stamp}`,
    contact: {
      primary_name: 'Test Contact',
      email: `contact-${stamp}@example.com`,
      phone: '+91-9999999999',
    },
    address: {
      street: 'Plot 42',
      city: 'Pune',
      state: 'MH',
      country: opts.country ?? 'IN',
      postal_code: '411001',
    },
    payment_terms: 'NET_30',
    currency: 'INR',
    tags: ['test'],
  };
}

function makePoPayload(opts) {
  const lines = opts.lines ?? [
    {
      line_number: 1,
      item_description: 'Test item',
      quantity: 1,
      unit_of_measure: 'EA',
      unit_price: opts.total ?? 1000,
      tax_rate: 0,
    },
  ];
  return {
    supplier_id: opts.supplier_id,
    currency: opts.currency ?? 'INR',
    payment_terms: opts.payment_terms ?? 'NET_30',
    expected_delivery_date: '2026-12-31',
    delivery_address: {
      street: 'Warehouse 3',
      city: 'Pune',
      state: 'MH',
      country: 'IN',
      postal_code: '411019',
    },
    notes: 'auto-test',
    line_items: lines,
  };
}

module.exports = { makeSupplierPayload, makePoPayload };
