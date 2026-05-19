import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import ChipGroup from '../../components/ui/ChipGroup.jsx';
import Field from '../../components/forms/Field.jsx';
import { changeOwnPassword } from '../../api/iam.js';
import { normaliseError } from '../../api/errors.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';
import { useDebugPrefs } from '../../hooks/useDebugPrefs.js';
import './SettingsPage.css';

export default function SettingsPage() {
  return (
    <div>
      <header style={{ marginBottom: 16 }}>
        <h1 className="t-headline">Settings</h1>
        <p className="t-body-sm">Account password, theme, and debug toggles.</p>
      </header>

      <div className="settings__grid">
        <ChangePasswordSection />
        <AppearanceSection />
        <DebugSection />
      </div>
    </div>
  );
}

/* ---------- 1. Change password ---------- */

function ChangePasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [topError, setTopError] = useState(null);

  const mutation = useMutation({
    mutationFn: () => changeOwnPassword(current, next),
    onSuccess: () => {
      toast.success('Password updated');
      setCurrent(''); setNext(''); setConfirm('');
      setErrors({}); setTopError(null);
    },
    onError: (err) => {
      const e = normaliseError(err);
      if (e.code === 'INVALID_CURRENT_PASSWORD') {
        setErrors({ current: 'Current password is incorrect' });
      } else if (e.code === 'VALIDATION_FAILED') {
        setTopError({ message: e.message || 'Please correct the highlighted fields.', correlationId: e.correlationId });
      } else {
        setTopError({ message: e.message || 'Could not update password.', correlationId: e.correlationId });
      }
    }
  });

  const submit = (ev) => {
    ev.preventDefault();
    const local = {};
    if (!current) local.current = 'Current password is required';
    if (!next || next.length < 8) local.next = 'New password must be ≥ 8 characters';
    if (next !== confirm) local.confirm = 'Passwords do not match';
    if (current && next && current === next) local.next = 'Pick a password different from your current one';

    if (Object.keys(local).length) { setErrors(local); return; }
    setErrors({}); setTopError(null);
    mutation.mutate();
  };

  return (
    <Section title="Change password">
      {topError && (
        <div className="settings__banner" role="alert">
          <div>{topError.message}</div>
          {topError.correlationId && (
            <div className="t-body-sm mono" style={{ marginTop: 4 }}>ref: {topError.correlationId}</div>
          )}
        </div>
      )}
      <form className="settings__form" onSubmit={submit} noValidate>
        <PwField
          label="Current password" value={current} onChange={setCurrent}
          show={show.current} onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
          autoComplete="current-password"
          disabled={mutation.isPending}
          error={errors.current}
        />
        <PwField
          label="New password" value={next} onChange={setNext}
          show={show.next} onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
          hint="At least 8 characters."
          autoComplete="new-password"
          disabled={mutation.isPending}
          error={errors.next}
        />
        <PwField
          label="Confirm new password" value={confirm} onChange={setConfirm}
          show={show.confirm} onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
          autoComplete="new-password"
          disabled={mutation.isPending}
          error={errors.confirm}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" loading={mutation.isPending} disabled={mutation.isPending}>
            Update password
          </Button>
        </div>
      </form>
    </Section>
  );
}

function PwField({ label, value, onChange, show, onToggle, hint, error, autoComplete, disabled }) {
  return (
    <Field label={label} required error={error} hint={!error ? hint : undefined}>
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        invalid={!!error}
        endIcon={
          <button type="button" onClick={onToggle} aria-label={show ? 'Hide' : 'Show'} style={{ display: 'inline-flex' }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      />
    </Field>
  );
}

/* ---------- 2. Appearance ---------- */

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <Section title="Appearance">
      <Field label="Theme" hint="Mirrors the top-bar toggle. Saved to localStorage.">
        <ChipGroup
          ariaLabel="Theme"
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark',  label: 'Dark' }
          ]}
          value={theme}
          onChange={setTheme}
        />
        <span className="t-body-sm" style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
          Currently using <strong>{theme}</strong>.
        </span>
      </Field>
    </Section>
  );
}

/* ---------- 3. Debug ---------- */

function DebugSection() {
  const { showCorrelationIds, setShowCorrelationIds } = useDebugPrefs();
  return (
    <Section title="Debug">
      <label className="settings__toggle">
        <input
          type="checkbox"
          checked={showCorrelationIds}
          onChange={(e) => setShowCorrelationIds(e.target.checked)}
        />
        <span>
          <span style={{ fontWeight: 500 }}>Show correlation IDs in error toasts</span>
          <span className="t-body-sm" style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>
            Useful when reporting issues. Error toasts already include the ID in their
            <em> Details</em> expander; this surfaces it directly without a click.
          </span>
        </span>
      </label>
    </Section>
  );
}

/* ---------- shared section wrapper ---------- */

function Section({ title, children }) {
  return (
    <section className="settings__section">
      <h2 className="t-caps" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}
