import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/authContext';

const DASHBOARD_PATH_BY_ROLE = {
  admin: '/dashboard/admin',
  client: '/dashboard/client',
  agent: '/dashboard/agent',
};

// Wraps a dashboard's <Route> in App.jsx: renders the nested routes via
// <Outlet /> only if the logged-in user's role matches; otherwise sends
// them to /login (no session) or their own dashboard (wrong role).
export default function RequireRole({ role }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== role) {
    return <Navigate to={DASHBOARD_PATH_BY_ROLE[user.role] ?? '/login'} replace />;
  }

  return <Outlet />;
}