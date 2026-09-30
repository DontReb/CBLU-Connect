import { Outlet, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import AgentSessionsProvider from '../../lib/AgentSessionsProvider';
import { useAuth } from '../../lib/authContext';

const NAV_ITEMS = [
  { to: '/dashboard/agent', label: 'Queue', icon: 'chat', end: true },
  { to: '/dashboard/agent/closed', label: 'Closed', icon: 'review' },
];

export default function AgentDashboardLayout() {
  // RequireRole guarantees a logged-in agent by the time this renders.
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <DashboardLayout
      roleLabel="Agent"
      userName={user.fullName}
      navItems={NAV_ITEMS}
      onLogout={handleLogout}
    >
      <AgentSessionsProvider>
        <Outlet />
      </AgentSessionsProvider>
    </DashboardLayout>
  );
}