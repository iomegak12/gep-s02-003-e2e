import './Select.css';

/**
 * Native <select> styled to match Input. Accepts:
 *   options: Array<{ value, label } | string>
 *   placeholder: rendered as empty option
 */
export default function Select({ options = [], placeholder, value, onChange, className = '', ...rest }) {
  const cls = ['select', className].filter(Boolean).join(' ');
  return (
    <select className={cls} value={value ?? ''} onChange={onChange} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((opt) => {
        const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
        return <option key={o.value} value={o.value}>{o.label}</option>;
      })}
    </select>
  );
}
