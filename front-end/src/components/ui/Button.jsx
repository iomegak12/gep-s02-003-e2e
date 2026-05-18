import './Button.css';

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  startIcon,
  endIcon,
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}) {
  const cls = ['btn', `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {startIcon && <span className="btn__icon">{startIcon}</span>}
      <span className="btn__label">{loading ? 'Working…' : children}</span>
      {endIcon && <span className="btn__icon">{endIcon}</span>}
    </button>
  );
}
