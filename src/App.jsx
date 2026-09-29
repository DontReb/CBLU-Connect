import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PageTransition from './components/PageTransition';
import ClientDashboardLayout from './pages/client/ClientDashboardLayout';
import ClientOverview from './pages/client/ClientOverview';
import ClientDocuments from './pages/client/ClientDocuments';
import ClientProfile from './pages/client/ClientProfile';

// A dashboard has its own internal tabs (Overview/Documents/Profile) that
// shouldn't replay the page-enter/exit animation every time you click
// between them — only the move into or out of the dashboard as a whole
// should. So the AnimatePresence key groups by the top-level area
// ("/dashboard/client") rather than the full, ever-changing pathname.
function animationKey(pathname) {
  const dashboardMatch = pathname.match(/^\/dashboard\/[^/]+/);
  return dashboardMatch ? dashboardMatch[0] : pathname;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={animationKey(location.pathname)}>
        <Route
          path="/"
          element={
            <PageTransition>
              <LandingPage />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              <LoginPage />
            </PageTransition>
          }
        />
        <Route
          path="/dashboard/client"
          element={
            <PageTransition>
              <ClientDashboardLayout />
            </PageTransition>
          }
        >
          <Route index element={<ClientOverview />} />
          <Route path="documents" element={<ClientDocuments />} />
          <Route path="profile" element={<ClientProfile />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}