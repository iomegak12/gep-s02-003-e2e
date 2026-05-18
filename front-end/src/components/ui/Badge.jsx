import './Badge.css';

/**
 * Tone maps to a CSS color variable. Use one of:
 *   active | pending | error | fulfilled | submitted | inactive
 *   ok | slow | down
 *   neutral | primary
 * Variant: 'soft' (10% tint bg) or 'outline'.
 */
export default function Badge({ tone = 'neutral', variant = 'soft', children, className = '' }) {
  const cls = ['badge', `badge--${variant}`, `badge--tone-${tone}`, className].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}
