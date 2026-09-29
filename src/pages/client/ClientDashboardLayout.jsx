import { Outlet } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { MOCK_CLIENT } from '../../lib/mockClient';

// TODO: once /api/auth/login exists, userName should come from the
// authenticated session instead of MOCK_CLIENT, and this route should
// redirect to /login if there isn't one.
const NAV_ITEMS = [
  { to: '/dashboard/client', label: 'Overview', icon: 'home', end: true },
  { to: '/dashboard/client/documents', label: 'Documents', icon: 'document' },
  { to: '/dashboard/client/profile', label: 'Profile', icon: 'user' },
];

export default function ClientDashboardLayout() {
  return (
    <DashboardLayout roleLabel="Client" userName={MOCK_CLIENT.fullName} navItems={NAV_ITEMS}>
      <Outlet />
    </DashboardLayout>
  );
}