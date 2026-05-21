const axios = require('axios');

/**
 * Minimal Prometheus exposition-format parser.
 * Returns: { [metricName]: [{ labels: {k:v}, value: number }] }
 */
function parseExposition(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // metric_name{a="x",b="y"} 12.3   OR   metric_name 12.3
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+([-+0-9eE.NaIfin]+)/);
    if (!m) continue;

    const [, name, labelBlock, valueStr] = m;
    const labels = {};
    if (labelBlock) {
      const inner = labelBlock.slice(1, -1);
      for (const pair of splitLabels(inner)) {
        const eq = pair.indexOf('=');
        if (eq < 0) continue;
        const k = pair.slice(0, eq).trim();
        let v = pair.slice(eq + 1).trim();
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"');
        labels[k] = v;
      }
    }
    (out[name] ||= []).push({ labels, value: Number(valueStr) });
  }
  return out;
}

function splitLabels(s) {
  const parts = [];
  let buf = '';
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' && s[i - 1] !== '\\') inQuote = !inQuote;
    if (ch === ',' && !inQuote) { parts.push(buf); buf = ''; }
    else buf += ch;
  }
  if (buf) parts.push(buf);
  return parts;
}

async function fetchCollectorMetrics(url) {
  const res = await axios.get(url, { timeout: 5000, transformResponse: x => x });
  return parseExposition(res.data);
}

async function queryProm(promUrl, promql) {
  const res = await axios.get(`${promUrl}/api/v1/query`, {
    params: { query: promql },
    timeout: 10000,
  });
  if (res.data.status !== 'success') {
    throw new Error(`Prometheus query failed: ${JSON.stringify(res.data)}`);
  }
  return res.data.data.result;
}

function findSeries(parsed, name, matchLabels = {}) {
  const series = parsed[name] || [];
  return series.filter(s => Object.entries(matchLabels).every(([k, v]) => s.labels[k] === v));
}

module.exports = { parseExposition, fetchCollectorMetrics, queryProm, findSeries };
