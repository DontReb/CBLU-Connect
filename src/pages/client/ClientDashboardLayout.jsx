import { Outlet, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import ChecklistProvider from '../../lib/ChecklistProvider';
import PrivacyProvider from '../../lib/PrivacyProvider';
import { useAuth } from '../../lib/authContext';
import { usePrivacy } from '../../lib/privacyContext';
import PrivacyConsent from './PrivacyConsent';

const NAV_ITEMS = [
  { to: '/dashboard/client', label: 'Overview', icon: 'home', end: true },
  { to: '/dashboard/client/loan-application', label: 'Loan Application', icon: 'form' },
  { to: '/dashboard/client/requirements', label: 'Requirements', icon: 'document' },
  { to: '/dashboard/client/announcements', label: 'Announcements', icon: 'announcement' },
  { to: '/dashboard/client/profile', label: 'Profile', icon: 'user' },
  { to: '/dashboard/client/privacy', label: 'Privacy', icon: 'shield' },
];

// The dashboard pages appear only after the client has agreed to the
// current Privacy Notice; until then, the consent screen shows instead.
function ConsentGate({ onLogout }) {
  const { consents, status } = usePrivacy();
  if (status !== 'ready' || !consents.portal.current) return <PrivacyConsent onLogout={onLogout} />;
  return (
    <ChecklistProvider>
      <Outlet />
    </ChecklistProvider>
  );
}

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
      <PrivacyProvider>
        <ConsentGate onLogout={handleLogout} />
      </PrivacyProvider>
    </DashboardLayout>
  );
}