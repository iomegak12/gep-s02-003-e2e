import './Field.css';

/**
 * Layout-only wrapper around an input.
 *   <Field label="Email" error={errors.email?.message}>
 *     <Input ... />
 *   </Field>
 */
export default function Field({ label, error, hint, required, children, htmlFor }) {
  return (
    <label className="field" htmlFor={htmlFor}>
      {label && (
        <span className="field__label">
          {label}{required && <span className="field__required" aria-hidden="true"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error" role="alert">{error}</span>}
    </label>
  );
}
