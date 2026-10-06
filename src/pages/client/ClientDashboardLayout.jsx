import { Outlet, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import ChecklistProvider from '../../lib/ChecklistProvider';
import { useAuth } from '../../lib/authContext';

const NAV_ITEMS = [
  { to: '/dashboard/client', label: 'Overview', icon: 'home', end: true },
  { to: '/dashboard/client/documents', label: 'Documents', icon: 'document' },
  { to: '/dashboard/client/loan-application', label: 'Loan Application', icon: 'form' },
  { to: '/dashboard/client/profile', label: 'Profile', icon: 'user' },
];

export default function ClientDashboardLayout() {
  // RequireRole guarantees a logged-in client by the time this renders.
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <DashboardLayout
      roleLabel="Client"
      userName={user.fullName}
      navItems={NAV_ITEMS}
      onLogout={handleLogout}
    >
      <ChecklistProvider>
        <Outlet />
      </ChecklistProvider>
    </DashboardLayout>
  );
}