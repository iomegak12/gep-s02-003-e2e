const env = {
  iamUrl:        process.env.IAM_URL        ?? 'http://localhost:3001',
  supplierUrl:   process.env.SUPPLIER_URL   ?? 'http://localhost:3002',
  poUrl:         process.env.PO_URL         ?? 'http://localhost:3003',

  collectorMetricsUrl: process.env.COLLECTOR_METRICS_URL ?? 'http://localhost:8889/metrics',
  collectorHealthUrl:  process.env.COLLECTOR_HEALTH_URL  ?? 'http://localhost:13133/',
  prometheusUrl:       process.env.PROMETHEUS_URL        ?? 'http://localhost:9090',
  lokiUrl:             process.env.LOKI_URL              ?? 'http://localhost:3100',
  tempoUrl:            process.env.TEMPO_URL             ?? 'http://localhost:3200',
  grafanaUrl:          process.env.GRAFANA_URL           ?? 'http://localhost:3000',
  grafanaUser:         process.env.GRAFANA_USER          ?? 'admin',
  grafanaPassword:     process.env.GRAFANA_PASSWORD      ?? 'admin',

  adminEmail:    process.env.ADMIN_EMAIL    ?? 'admin@demo.local',
  buyerEmail:    process.env.BUYER_EMAIL    ?? 'buyer@demo.local',
  seedPassword:  process.env.SEED_PASSWORD  ?? 'Passw0rd!',

  waitTimeoutMs: Number(process.env.WAIT_FOR_STACK_TIMEOUT ?? '120000'),
};

const SERVICE_NAMES = {
  iam: 'gep-iam',
  supplier: 'gep-supplier',
  po: 'gep-po',
};

module.exports = { env, SERVICE_NAMES };
