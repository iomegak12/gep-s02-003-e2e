import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler } from '../api/client.js';

const AUTH_STORAGE_KEY = 'gep.auth';
const AuthContext = createContext(null);

/**
 * Decode the JWT payload without verifying the signature (verification happens
 * server-side). Used only to read display claims (roles, approval_limit, exp).
 */
function decodeJwt(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (_) {
    return null;
  }
}

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token) return null;
    if (parsed.expires_at && Date.now() >= parsed.expires_at) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function persistAuth(value) {
  if (!value) localStorage.removeItem(AUTH_STORAGE_KEY);
  else localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  // Persist + sync on change.
  useEffect(() => { persistAuth(auth); }, [auth]);

  const logout = useCallback(() => {
    setAuth(null);
    // Hard-redirect avoids stale route guards holding cached components.
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }, []);

  // Wire the axios 401 handler exactly once.
  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  /**
   * Persist a fresh login response.
   * Expected shape per IAM tests:
   *   { access_token, token_type, expires_in, user: { email, roles[], approval_limit? } }
   */
  const setSession = useCallback((loginResponse) => {
    if (!loginResponse?.access_token) return;
    const expiresAt = loginResponse.expires_in
      ? Date.now() + loginResponse.expires_in * 1000
      : null;
    const decoded = decodeJwt(loginResponse.access_token) || {};
    const user = {
      ...(loginResponse.user || {}),
      sub: decoded.sub,
      roles: loginResponse.user?.roles || decoded.roles || [],
      approval_limit: loginResponse.user?.approval_limit ?? decoded.approval_limit ?? null
    };
    setAuth({
      access_token: loginResponse.access_token,
      token_type: loginResponse.token_type || 'Bearer',
      expires_at: expiresAt,
      user
    });
  }, []);

  const value = useMemo(() => {
    const roles = auth?.user?.roles || [];
    return {
      auth,
      user: auth?.user || null,
      isAuthenticated: !!auth?.access_token,
      roles,
      hasRole: (r) => roles.includes(r),
      setSession,
      logout
    };
  }, [auth, setSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
