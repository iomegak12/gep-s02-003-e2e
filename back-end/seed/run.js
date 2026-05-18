const axios = require('axios');

const AUTH = process.env.AUTH_SERVICE_URL || 'http://iam:3001/api/v1';
const SUPPLIERS = process.env.SUPPLIER_SERVICE_URL || 'http://supplier-service:3002/api/v1';
const PO = process.env.PO_SERVICE_URL || 'http://po-service:3003/api/v1';

const log = (...a) => console.log('[seed]', ...a);

async function login(email, password) {
  const { data } = await axios.post(`${AUTH}/auth/login`, { email, password });
  return { token: data.access_token, user: data.user };
}

function h(token) { return { headers: { Authorization: `Bearer ${token}` } }; }

async function ensureUser(adminToken, { email, full_name, password, roles, approval_limit = null }) {
  try {
    const { data } = await axios.post(`${AUTH}/auth/users`, { email, full_name, password, roles, approval_limit }, h(adminToken));
    log('user created', email);
    return data;
  } catch (e) {
    if (e.response?.status === 409) { log('user exists', email); return null; }
    throw e;
  }
}

async function createSupplier(token, payload) {
  try {
    const { data } = await axios.post(`${SUPPLIERS}/suppliers`, payload, h(token));
    return data;
  } catch (e) {
    if (e.response?.status === 409) {
      // Text search tokenizes hyphens, so paginate and filter exactly.
      let page = 1;
      while (true) {
        const { data } = await axios.get(`${SUPPLIERS}/suppliers`, { ...h(token), params: { page, page_size: 100 } });
        const hit = data.data.find(s => s.supplier_code === payload.supplier_code);
        if (hit) return hit;
        if (data.data.length < 100) return null;
        page++;
      }
    }
    throw e;
  }
}

const supplierTemplate = (i, opts) => ({
  supplier_code: `SUP-${opts.country}-${String(i).padStart(5, '0')}`,
  legal_name: `${opts.name} Pvt Ltd`,
  display_name: opts.name,
  category: opts.category,
  sub_category: opts.sub || null,
  country: opts.country,
  region: opts.country === 'IN' ? 'APAC' : 'EMEA',
  tax_id: `TAX-${i}`,
  contact: { primary_name: `Contact ${i}`, email: `c${i}@${opts.name.replace(/\s+/g, '').toLowerCase()}.com`, phone: '+91-9000000000' },
  address: { street: `Plot ${i}`, city: 'CityX', state: 'StateX', country: opts.country, postal_code: '000000' },
  payment_terms: opts.terms || 'NET_30',
  currency: opts.currency || 'INR',
  tags: opts.tags || [],
});

async function transition(token, sid, action, body) {
  return axios.post(`${SUPPLIERS}/suppliers/${sid}/${action}`, body || {}, h(token)).then(r => r.data);
}

async function poTransition(token, id, action, body) {
  return axios.post(`${PO}/purchase-orders/${id}/${action}`, body || {}, h(token)).then(r => r.data);
}

async function waitReady() {
  const services = [[`${AUTH}/../..`, '/health'], [`${SUPPLIERS}/../..`, '/health'], [`${PO}/../..`, '/health']];
  // The constants already include /api/v1, so .. /.. drops back to root. Just compose root explicitly.
  const roots = [AUTH.replace(/\/api\/v1$/, ''), SUPPLIERS.replace(/\/api\/v1$/, ''), PO.replace(/\/api\/v1$/, '')];
  for (const root of roots) {
    for (let i = 0; i < 60; i++) {
      try { await axios.get(`${root}/health`); break; }
      catch { await new Promise(r => setTimeout(r, 1000)); }
    }
  }
}

async function main() {
  await waitReady();

  const { token: adminToken } = await login('admin@demo.local', 'Passw0rd!');
  log('admin logged in');

  await ensureUser(adminToken, { email: 'buyer@demo.local',        full_name: 'Demo Buyer',        password: 'Passw0rd!', roles: ['BUYER'] });
  await ensureUser(adminToken, { email: 'approver-hi@demo.local',  full_name: 'High Limit Approver', password: 'Passw0rd!', roles: ['APPROVER'], approval_limit: 1_000_000 });
  await ensureUser(adminToken, { email: 'approver-lo@demo.local',  full_name: 'Low Limit Approver',  password: 'Passw0rd!', roles: ['APPROVER'], approval_limit: 50_000 });

  const { token: buyerToken } = await login('buyer@demo.local', 'Passw0rd!');

  const seeds = [
    { name: 'Acme Industrial', category: 'RAW_MATERIALS', country: 'IN', tags: ['preferred'] },
    { name: 'Sundaram Logistics', category: 'LOGISTICS', country: 'IN' },
    { name: 'TechSoft Consulting', category: 'IT_SERVICES', country: 'IN' },
    { name: 'NorthPack Packaging', category: 'PACKAGING', country: 'IN' },
    { name: 'GlobalSteel UK', category: 'RAW_MATERIALS', country: 'GB' },
    { name: 'EuroTrans Logistics', category: 'LOGISTICS', country: 'GB' },
    { name: 'BadActor Co', category: 'OTHER', country: 'IN' },
    { name: 'Pending Vendor', category: 'MRO', country: 'IN' },
  ];

  const suppliers = [];
  for (let i = 0; i < seeds.length; i++) {
    suppliers.push(await createSupplier(buyerToken, supplierTemplate(i + 1, seeds[i])));
  }
  log(`created/loaded ${suppliers.length} suppliers`);

  // Approve 6, blacklist 1 (BadActor), leave 1 pending (Pending Vendor)
  for (let i = 0; i < 6; i++) {
    if (suppliers[i].status === 'PENDING_APPROVAL') {
      await transition(adminToken, suppliers[i].id, 'approve');
    }
  }
  if (suppliers[6].status === 'PENDING_APPROVAL') {
    await transition(adminToken, suppliers[6].id, 'blacklist', { reason: 'Quality issues in prior engagement' });
  }
  log('supplier transitions done');

  // Create POs against active suppliers
  const activeSuppliers = suppliers.slice(0, 6);
  const pos = [];
  const linePresets = [
    { item_description: 'Standard widget', sku: 'WID-001', quantity: 10, unit_of_measure: 'EA', unit_price: 250.00, tax_rate: 18 },
    { item_description: 'Bulk material', sku: 'BMAT-77', quantity: 100, unit_of_measure: 'KG', unit_price: 35.50, tax_rate: 18 },
    { item_description: 'Premium service hours', quantity: 40, unit_of_measure: 'HR', unit_price: 1500.00, tax_rate: 18 },
    { item_description: 'Logistics fee, lane A', quantity: 1, unit_of_measure: 'EA', unit_price: 7500.00, tax_rate: 12 },
  ];

  for (let i = 0; i < 12; i++) {
    const supplier = activeSuppliers[i % activeSuppliers.length];
    // Pick line items: half low-value (auto-approve), half high-value
    const preset = i % 2 === 0 ? linePresets[i % 4] : { ...linePresets[i % 4], quantity: linePresets[i % 4].quantity * 50 };
    try {
      const { data } = await axios.post(`${PO}/purchase-orders`, {
        supplier_id: supplier.id,
        currency: 'INR',
        expected_delivery_date: '2026-06-30',
        payment_terms: 'NET_30',
        delivery_address: { street: 'Warehouse 3', city: 'Pune', state: 'MH', country: 'IN', postal_code: '411019' },
        notes: `Seed PO #${i + 1}`,
        line_items: [{ line_number: 1, ...preset }],
      }, h(buyerToken));
      pos.push(data);
    } catch (e) {
      log('PO create failed', e.response?.data || e.message);
    }
  }
  log(`created ${pos.length} POs`);

  const { token: approverHiToken } = await login('approver-hi@demo.local', 'Passw0rd!');

  for (const po of pos) {
    if (po.status !== 'DRAFT') continue;
    const submitted = await poTransition(buyerToken, po.id, 'submit');
    Object.assign(po, submitted);
  }

  let approvedCount = 0, rejectedOnce = false, fulfilledOnce = false, closedOnce = false;
  for (const po of pos) {
    if (po.status === 'SUBMITTED') {
      if (!rejectedOnce) {
        await poTransition(approverHiToken, po.id, 'reject', { reason: 'Pricing above market — please revise' });
        rejectedOnce = true;
      } else {
        const approved = await poTransition(approverHiToken, po.id, 'approve');
        Object.assign(po, approved);
        approvedCount++;
      }
    }
  }

  for (const po of pos) {
    if (po.status === 'APPROVED') {
      if (!fulfilledOnce) {
        const f = await poTransition(buyerToken, po.id, 'fulfill', { actual_delivery_date: '2026-05-01' });
        Object.assign(po, f);
        fulfilledOnce = true;
      }
    }
  }
  for (const po of pos) {
    if (po.status === 'FULFILLED' && !closedOnce) {
      await poTransition(buyerToken, po.id, 'close');
      closedOnce = true;
    }
  }

  log(`seed done — approved=${approvedCount}, rejected=${rejectedOnce}, fulfilled=${fulfilledOnce}, closed=${closedOnce}`);
}

main().catch(e => {
  console.error('[seed] failed:', e.response?.data || e.message || e);
  process.exit(1);
});
