import { Outlet } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import AdminDataProvider from '../../lib/AdminDataProvider';
import { MOCK_ADMIN } from '../../lib/mockAdmin';

// TODO: once /api/auth/login exists, userName should come from the
// authenticated session instead of MOCK_ADMIN, and this route should
// redirect to /login if there isn't one (or to the right dashboard for
// whatever role is actually logged in).
const NAV_ITEMS = [
  { to: '/dashboard/admin', label: 'Overview', icon: 'home', end: true },
  { to: '/dashboard/admin/clients', label: 'Clients', icon: 'user' },
  { to: '/dashboard/admin/checklists', label: 'Checklists', icon: 'document' },
  { to: '/dashboard/admin/reviews', label: 'Reviews', icon: 'review' },
];

export default function AdminDashboardLayout() {
  return (
    <DashboardLayout roleLabel="Admin" userName={MOCK_ADMIN.fullName} navItems={NAV_ITEMS}>
      <AdminDataProvider>
        <Outlet />
      </AdminDataProvider>
    </DashboardLayout>
  );
}