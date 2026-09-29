import { Outlet } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import AgentSessionsProvider from '../../lib/AgentSessionsProvider';
import { MOCK_AGENT } from '../../lib/mockAgent';

// TODO: once /api/auth/login exists, userName should come from the
// authenticated session instead of MOCK_AGENT, and this route should
// redirect to /login if there isn't one (or to the right dashboard for
// whatever role is actually logged in).
const NAV_ITEMS = [
  { to: '/dashboard/agent', label: 'Queue', icon: 'chat', end: true },
  { to: '/dashboard/agent/closed', label: 'Closed', icon: 'review' },
];

export default function AgentDashboardLayout() {
  return (
    <DashboardLayout roleLabel="Agent" userName={MOCK_AGENT.fullName} navItems={NAV_ITEMS}>
      <AgentSessionsProvider>
        <Outlet />
      </AgentSessionsProvider>
    </DashboardLayout>
  );
}