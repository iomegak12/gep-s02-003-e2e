import { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(function Input(
  { startIcon, endIcon, invalid, className = '', ...rest },
  ref
) {
  const cls = ['input', invalid ? 'input--invalid' : '', className].filter(Boolean).join(' ');
  return (
    <span className={cls}>
      {startIcon && <span className="input__icon input__icon--start">{startIcon}</span>}
      <input ref={ref} aria-invalid={invalid || undefined} {...rest} />
      {endIcon && <span className="input__icon input__icon--end">{endIcon}</span>}
    </span>
  );
});

export default Input;
