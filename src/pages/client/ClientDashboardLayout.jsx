import { Outlet, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import ChecklistProvider from '../../lib/ChecklistProvider';
import PrivacyProvider from '../../lib/PrivacyProvider';
import { useAuth } from '../../lib/authContext';
import { usePrivacy } from '../../lib/privacyContext';
import PrivacyConsent from './PrivacyConsent';
import SetNewPassword from './SetNewPassword';

const NAV_ITEMS = [
  { to: '/dashboard/client', label: 'Overview', icon: 'home', end: true },
  { to: '/dashboard/client/loan-application', label: 'Loan Application', icon: 'form' },
  { to: '/dashboard/client/requirements', label: 'Requirements', icon: 'document' },
  { to: '/dashboard/client/announcements', label: 'Announcements', icon: 'announcement' },
  { to: '/dashboard/client/profile', label: 'Profile', icon: 'user' },
  { to: '/dashboard/client/privacy', label: 'Privacy', icon: 'shield' },
];

// Before the dashboard pages: first a client with a temporary password from
// the bank chooses their own, then they agree to the current Privacy
// Notice. Until then, those screens show instead.
function ConsentGate({ onLogout }) {
  const { user } = useAuth();
  const { consents, status } = usePrivacy();
  if (user.mustChangePassword) return <SetNewPassword onLogout={onLogout} />;
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