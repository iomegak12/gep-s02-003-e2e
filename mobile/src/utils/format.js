// Lightweight formatting helpers. Avoid `Intl` for currency (RN's Intl polyfill is uneven).

export function formatCurrency(amount, currency = 'INR') {
  if (amount == null || isNaN(amount)) return '—';
  const n = Number(amount);
  const fixed = n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  return `${currency} ${fixed}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return String(iso).slice(0, 10); // YYYY-MM-DD per spec
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return String(iso).replace('T', ' ').replace(/\..*Z?$/, '');
}

export function daysAgo(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}
