import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShoppingCart, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import Tooltip from '../../components/ui/Tooltip.jsx';
import { login as loginApi } from '../../api/iam.js';
import { normaliseError } from '../../api/errors.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { landingPathFor } from '../../utils/roles.js';
import LoginCarousel from './LoginCarousel.jsx';
import './LoginPage.css';

const SAMPLE_CREDS = [
  { key: 'buyer',    email: 'buyer@demo.local',       password: 'Passw0rd!', label: 'Buyer',    Icon: ShoppingCart },
  { key: 'approver', email: 'approver-hi@demo.local', password: 'Passw0rd!', label: 'Approver', Icon: CheckCircle2 },
  { key: 'admin',    email: 'admin@demo.local',       password: 'Passw0rd!', label: 'Admin',    Icon: ShieldCheck }
];

const REMEMBER_KEY = 'gep.login.remember';

export default function LoginPage() {
  const { setSession, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Hydrate remembered email on first load (does NOT remember password).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) { setEmail(saved); setRemember(true); }
    } catch (_) { /* ignore */ }
  }, []);

  if (isAuthenticated && user) {
    const from = location.state?.from?.pathname;
    navigate(from || landingPathFor(user.roles || []), { replace: true });
    return null;
  }

  const fillCreds = (cred) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setTopError(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTopError(null);
    setFieldErrors({});

    const local = {};
    if (!email.trim()) local.email = 'Email is required';
    if (!password) local.password = 'Password is required';
    if (Object.keys(local).length) { setFieldErrors(local); return; }

    setSubmitting(true);
    try {
      const data = await loginApi({ email: email.trim(), password });
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch (_) { /* ignore */ }
      setSession(data);
      navigate(landingPathFor(data.user?.roles || []), { replace: true });
    } catch (err) {
      const e2 = normaliseError(err);
      if (e2.code === 'VALIDATION_FAILED' && e2.details && typeof e2.details === 'object') {
        const flat = {};
        for (const [k, v] of Object.entries(e2.details)) {
          flat[k] = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : 'Invalid value';
        }
        setFieldErrors(flat);
        setTopError({ message: e2.message || 'Please correct the highlighted fields.' });
      } else if (e2.code === 'AUTH_FAILED') {
        setTopError({ message: 'Email or password is incorrect.' });
      } else {
        setTopError({ message: e2.message || 'Sign in failed. Try again.', correlationId: e2.correlationId });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className="lp">
      <div className="lp__card">
        {/* ---- Form side ---- */}
        <div className="lp__form-side">
          <header className="lp__brand">
            <span className="lp__brand-logo">N</span>
            <span>Nexus SCM</span>
          </header>

          <div className="lp__form-wrap">
            <div className="lp__intro">
              <h1 className="lp__title">Welcome back</h1>
              <p className="lp__subtitle">Enter your email and password to access your account.</p>
            </div>

            {topError && (
              <div className="lp__banner" role="alert">
                <div>{topError.message}</div>
                {topError.correlationId && (
                  <div className="t-body-sm mono" style={{ marginTop: 4, opacity: 0.85 }}>
                    ref: {topError.correlationId}
                  </div>
                )}
              </div>
            )}

            <form className="lp__form" onSubmit={handleSubmit} noValidate>
              <label className="lp__field">
                <span className="lp__label">Email</span>
                <input
                  type="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  aria-invalid={!!fieldErrors.email}
                />
                {fieldErrors.email && <span className="lp__field-error">{fieldErrors.email}</span>}
              </label>

              <label className="lp__field">
                <span className="lp__label">Password</span>
                <div className="lp__password">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    aria-invalid={!!fieldErrors.password}
                  />
                  <button
                    type="button"
                    className="lp__reveal"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && <span className="lp__field-error">{fieldErrors.password}</span>}
              </label>

              <div className="lp__row">
                <label className="lp__remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={submitting}
                  />
                  <span>Remember me</span>
                </label>
                <Tooltip label="Ask your admin to reset your password" placement="bottom">
                  <span className="lp__help">Need help?</span>
                </Tooltip>
              </div>

              <Button type="submit" loading={submitting} disabled={submitting} className="lp__submit">
                Log in
              </Button>
            </form>

            <div className="lp__divider"><span>Or sign in as</span></div>

            <div className="lp__samples" aria-label="Sample credentials">
              {SAMPLE_CREDS.map(({ key, label, Icon, email: e, password: p }) => (
                <Tooltip key={key} label={`Fill ${label} (${e})`} placement="top">
                  <button
                    type="button"
                    className="lp__sample"
                    onClick={() => fillCreds({ email: e, password: p })}
                    aria-label={`Fill ${label} sample credentials`}
                  >
                    <Icon size={18} />
                  </button>
                </Tooltip>
              ))}
            </div>

            <p className="lp__footnote">
              Don't have an account? <strong>Contact your admin.</strong>
            </p>
          </div>

          <footer className="lp__footer">
            <span>© {year} Nexus SCM. All rights reserved.</span>
            <span>Privacy Policy</span>
          </footer>
        </div>

        {/* ---- Brand carousel side ---- */}
        <div className="lp__brand-side">
          <LoginCarousel />
        </div>
      </div>
    </div>
  );
}
