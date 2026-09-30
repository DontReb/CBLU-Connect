import { Outlet, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import AdminDataProvider from '../../lib/AdminDataProvider';
import { useAuth } from '../../lib/authContext';

const NAV_ITEMS = [
  { to: '/dashboard/admin', label: 'Overview', icon: 'home', end: true },
  { to: '/dashboard/admin/clients', label: 'Clients', icon: 'user' },
  { to: '/dashboard/admin/checklists', label: 'Checklists', icon: 'document' },
  { to: '/dashboard/admin/reviews', label: 'Reviews', icon: 'review' },
];

export default function AdminDashboardLayout() {
  // RequireRole guarantees a logged-in admin by the time this renders.
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <DashboardLayout
      roleLabel="Admin"
      userName={user.fullName}
      navItems={NAV_ITEMS}
      onLogout={handleLogout}
    >
      <AdminDataProvider>
        <Outlet />
      </AdminDataProvider>
    </DashboardLayout>
  );
}