import { useEffect, useState } from 'react';

/**
 * Read a CSS variable off :root. Lets chart libs (which don't understand CSS
 * variables) get a usable hex/rgb string for fills/strokes/grid lines.
 */
export function cssVar(name) {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Re-read tokens whenever the theme attribute changes so Recharts re-fills
 * with the right colours in light/dark.
 */
export function useChartTheme() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const obs = new MutationObserver(() => setTick((n) => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  // tick used as cache-bust dep in calling components
  return {
    text:       cssVar('--text') || '#1a1b25',
    muted:      cssVar('--on-surface-variant') || '#7a7a8a',
    grid:       cssVar('--outline-variant') || '#c6c4d9',
    surface:    cssVar('--surface-container-lowest') || '#ffffff',
    primary:    cssVar('--primary') || '#3e46ff',
    primaryDim: cssVar('--primary-container') || '#3e46ff',
    statusActive:    cssVar('--status-active')    || '#10b981',
    statusPending:   cssVar('--status-pending')   || '#f59e0b',
    statusError:     cssVar('--status-error')     || '#ef4444',
    statusFulfilled: cssVar('--status-fulfilled') || '#14b8a6',
    statusSubmitted: cssVar('--status-submitted') || '#3e46ff',
    statusInactive:  cssVar('--status-inactive')  || '#6b7280',
    /** A long-enough categorical palette for unordered series. */
    series: [
      cssVar('--primary')    || '#3e46ff',
      cssVar('--status-active')    || '#10b981',
      cssVar('--status-pending')   || '#f59e0b',
      cssVar('--status-fulfilled') || '#14b8a6',
      cssVar('--tertiary-container') || '#b63600',
      cssVar('--status-submitted') || '#3e46ff',
      cssVar('--status-inactive')  || '#6b7280',
      cssVar('--status-error')     || '#ef4444'
    ],
    _tick: tick
  };
}

/** Map supplier/PO status to its tone colour. */
export const STATUS_COLOR = {
  // suppliers
  PENDING_APPROVAL: 'statusPending',
  ACTIVE:           'statusActive',
  INACTIVE:         'statusInactive',
  BLACKLISTED:      'statusError',
  // POs
  DRAFT:            'statusInactive',
  SUBMITTED:        'statusSubmitted',
  APPROVED:         'statusActive',
  REJECTED:         'statusError',
  FULFILLED:        'statusFulfilled',
  CLOSED:           'statusInactive',
  CANCELLED:        'statusError'
};

export function formatINR(amount, { compact = false } = {}) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  try {
    const n = Number(amount);
    if (compact && Math.abs(n) >= 1000) {
      // ₹54.56K, ₹12.3L, ₹4.5Cr — Indian compact
      const abs = Math.abs(n);
      const sign = n < 0 ? '-' : '';
      if (abs >= 1e7)  return `${sign}₹${(abs / 1e7).toFixed(abs >= 1e8 ? 1 : 2)}Cr`;
      if (abs >= 1e5)  return `${sign}₹${(abs / 1e5).toFixed(abs >= 1e6 ? 1 : 2)}L`;
      if (abs >= 1e3)  return `${sign}₹${(abs / 1e3).toFixed(abs >= 1e4 ? 1 : 2)}K`;
    }
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  } catch (_) {
    return `₹${Number(amount).toLocaleString()}`;
  }
}
