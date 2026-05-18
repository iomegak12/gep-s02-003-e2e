import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';

/**
 * Allows the route iff the user holds any of `allow` roles.
 * Falls back to the home dashboard for that role on mismatch.
 */
export default function RequireRole({ allow = [], children }) {
  const { isAuthenticated, roles } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const allowed = allow.some((r) => roles.includes(r));
  if (!allowed) return <Navigate to="/" replace />;
  return children;
}
