import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PageTransition from './components/PageTransition';
import AuthProvider from './lib/AuthProvider';
import ChatProvider from './lib/ChatProvider';
import { useChat } from './lib/chatContext';
import { useAuth } from './lib/authContext';
import ChatWidget from './components/ChatWidget';
import RequireRole from './components/RequireRole';
import ClientDashboardLayout from './pages/client/ClientDashboardLayout';
import ClientOverview from './pages/client/ClientOverview';
import ClientRequirements from './pages/client/ClientRequirements';
import ClientLoanApplication from './pages/client/ClientLoanApplication';
import ClientLoanApplicationPrint from './pages/client/ClientLoanApplicationPrint';
import ClientProfile from './pages/client/ClientProfile';
import AdminDashboardLayout from './pages/admin/AdminDashboardLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminClients from './pages/admin/AdminClients';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminRequirements from './pages/admin/AdminRequirements';
import AgentDashboardLayout from './pages/agent/AgentDashboardLayout';
import AgentQueue from './pages/agent/AgentQueue';
import AgentClosedSessions from './pages/agent/AgentClosedSessions';

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

        <Route element={<RequireRole role="client" />}>
          <Route
            path="/dashboard/client"
            element={
              <PageTransition>
                <ClientDashboardLayout />
              </PageTransition>
            }
          >
            <Route index element={<ClientOverview />} />
            <Route path="loan-application" element={<ClientLoanApplication />} />
            <Route path="requirements" element={<ClientRequirements />} />
            <Route path="documents" element={<Navigate to="/dashboard/client/requirements" replace />} />
            <Route path="profile" element={<ClientProfile />} />
          </Route>
          {/* Outside the dashboard layout, so only the form itself prints */}
          <Route path="/print/loan-application" element={<ClientLoanApplicationPrint />} />
        </Route>

        <Route element={<RequireRole role="admin" />}>
          <Route
            path="/dashboard/admin"
            element={
              <PageTransition>
                <AdminDashboardLayout />
              </PageTransition>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="requirements" element={<AdminRequirements />} />
            <Route path="checklists" element={<Navigate to="/dashboard/admin/requirements" replace />} />
          </Route>
        </Route>

        <Route element={<RequireRole role="agent" />}>
          <Route
            path="/dashboard/agent"
            element={
              <PageTransition>
                <AgentDashboardLayout />
              </PageTransition>
            }
          >
            <Route index element={<AgentQueue />} />
            <Route path="closed" element={<AgentClosedSessions />} />
          </Route>
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

// The chatbot sits outside <Routes>, so it shows on every page and keeps
// its conversation when the visitor moves between pages. The key starts it
// fresh whenever someone logs in or out, so one person's chat is never left
// on screen for the next.
function SiteChat() {
  const { isOpen, closeChat, toggleChat } = useChat();
  const { user } = useAuth();
  return (
    <ChatWidget key={user?.id ?? 'guest'} user={user} isOpen={isOpen} onClose={closeChat} onToggle={toggleChat} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <AnimatedRoutes />
          <SiteChat />
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  );
}