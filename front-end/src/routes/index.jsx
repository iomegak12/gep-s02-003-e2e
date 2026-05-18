import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../components/shell/AppShell.jsx';
import RequireAuth from '../auth/RequireAuth.jsx';
import RequireRole from '../auth/RequireRole.jsx';
import { ROLES } from '../utils/roles.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { landingPathFor } from '../utils/roles.js';

import LoginPage from '../features/auth/LoginPage.jsx';
import PlaceholderDashboard from '../features/dashboard/PlaceholderDashboard.jsx';
import PlaceholderPage from '../features/common/PlaceholderPage.jsx';
import SupplierListPage from '../features/suppliers/SupplierListPage.jsx';
import SupplierDetailPage from '../features/suppliers/SupplierDetailPage.jsx';
import SupplierCreatePage from '../features/suppliers/SupplierCreatePage.jsx';
import SupplierEditPage from '../features/suppliers/SupplierEditPage.jsx';
import AdminSupplierPendingPage from '../features/suppliers/AdminSupplierPendingPage.jsx';
import PurchaseOrderListPage from '../features/purchase-orders/PurchaseOrderListPage.jsx';
import PurchaseOrderDetailPage from '../features/purchase-orders/PurchaseOrderDetailPage.jsx';
import PurchaseOrderCreatePage from '../features/purchase-orders/PurchaseOrderCreatePage.jsx';

function HomeRedirect() {
  const { isAuthenticated, roles } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={landingPathFor(roles)} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />

        <Route
          path="/buyer/dashboard"
          element={
            <RequireRole allow={[ROLES.BUYER, ROLES.ADMIN]}>
              <PlaceholderDashboard persona="BUYER" />
            </RequireRole>
          }
        />
        <Route
          path="/approver/dashboard"
          element={
            <RequireRole allow={[ROLES.APPROVER, ROLES.ADMIN]}>
              <PlaceholderDashboard persona="APPROVER" />
            </RequireRole>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <RequireRole allow={[ROLES.ADMIN]}>
              <PlaceholderDashboard persona="ADMIN" />
            </RequireRole>
          }
        />

        <Route
          path="/approvals"
          element={
            <RequireRole allow={[ROLES.APPROVER, ROLES.ADMIN]}>
              <PlaceholderPage title="Approvals inbox" phase="Phase 5" />
            </RequireRole>
          }
        />

        <Route path="/suppliers"           element={<SupplierListPage />} />
        <Route
          path="/suppliers/new"
          element={
            <RequireRole allow={[ROLES.BUYER, ROLES.ADMIN]}>
              <SupplierCreatePage />
            </RequireRole>
          }
        />
        <Route path="/suppliers/:id"       element={<SupplierDetailPage />} />
        <Route
          path="/suppliers/:id/edit"
          element={
            <RequireRole allow={[ROLES.BUYER, ROLES.ADMIN]}>
              <SupplierEditPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/suppliers/pending"
          element={
            <RequireRole allow={[ROLES.ADMIN]}>
              <AdminSupplierPendingPage />
            </RequireRole>
          }
        />
        <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
        <Route
          path="/purchase-orders/new"
          element={
            <RequireRole allow={[ROLES.BUYER, ROLES.ADMIN]}>
              <PurchaseOrderCreatePage />
            </RequireRole>
          }
        />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
        <Route
          path="/admin/users"
          element={
            <RequireRole allow={[ROLES.ADMIN]}>
              <PlaceholderPage title="Users" phase="Phase 6" />
            </RequireRole>
          }
        />
        <Route path="/profile"  element={<PlaceholderPage title="My profile" phase="Phase 7" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings"   phase="Phase 7" />} />

        <Route path="*" element={<PlaceholderPage title="Not found" />} />
      </Route>
    </Routes>
  );
}
