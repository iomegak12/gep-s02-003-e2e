import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../components/shell/AppShell.jsx';
import RequireAuth from '../auth/RequireAuth.jsx';
import RequireRole from '../auth/RequireRole.jsx';
import { ROLES } from '../utils/roles.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { landingPathFor } from '../utils/roles.js';

import LoginPage from '../features/auth/LoginPage.jsx';
import BuyerDashboard from '../features/dashboard/BuyerDashboard.jsx';
import ApproverDashboard from '../features/dashboard/ApproverDashboard.jsx';
import AdminDashboard from '../features/dashboard/AdminDashboard.jsx';
import PlaceholderPage from '../features/common/PlaceholderPage.jsx';
import SupplierListPage from '../features/suppliers/SupplierListPage.jsx';
import SupplierDetailPage from '../features/suppliers/SupplierDetailPage.jsx';
import SupplierCreatePage from '../features/suppliers/SupplierCreatePage.jsx';
import SupplierEditPage from '../features/suppliers/SupplierEditPage.jsx';
import AdminSupplierPendingPage from '../features/suppliers/AdminSupplierPendingPage.jsx';
import PurchaseOrderListPage from '../features/purchase-orders/PurchaseOrderListPage.jsx';
import PurchaseOrderDetailPage from '../features/purchase-orders/PurchaseOrderDetailPage.jsx';
import PurchaseOrderCreatePage from '../features/purchase-orders/PurchaseOrderCreatePage.jsx';
import ApprovalsInboxPage from '../features/approvals/ApprovalsInboxPage.jsx';
import UserListPage from '../features/admin-users/UserListPage.jsx';
import UserDetailPage from '../features/admin-users/UserDetailPage.jsx';
import UserCreatePage from '../features/admin-users/UserCreatePage.jsx';
import UserEditPage from '../features/admin-users/UserEditPage.jsx';
import ProfilePage from '../features/profile/ProfilePage.jsx';
import SettingsPage from '../features/settings/SettingsPage.jsx';
import TermsPage from '../features/legal/TermsPage.jsx';
import SupportPage from '../features/support/SupportPage.jsx';

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
              <BuyerDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/approver/dashboard"
          element={
            <RequireRole allow={[ROLES.APPROVER, ROLES.ADMIN]}>
              <ApproverDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <RequireRole allow={[ROLES.ADMIN]}>
              <AdminDashboard />
            </RequireRole>
          }
        />

        <Route
          path="/approvals"
          element={
            <RequireRole allow={[ROLES.APPROVER, ROLES.ADMIN]}>
              <ApprovalsInboxPage />
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
              <UserListPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users/new"
          element={
            <RequireRole allow={[ROLES.ADMIN]}>
              <UserCreatePage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <RequireRole allow={[ROLES.ADMIN]}>
              <UserDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users/:id/edit"
          element={
            <RequireRole allow={[ROLES.ADMIN]}>
              <UserEditPage />
            </RequireRole>
          }
        />
        <Route path="/profile"  element={<ProfilePage  />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/terms"    element={<TermsPage    />} />
        <Route path="/support"  element={<SupportPage  />} />

        <Route path="*" element={<PlaceholderPage title="Not found" />} />
      </Route>
    </Routes>
  );
}
