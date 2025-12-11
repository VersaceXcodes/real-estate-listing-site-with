import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './store/main';

// Global Components
import GV_TopNav from './components/views/GV_TopNav';
import GV_Footer from './components/views/GV_Footer';
import GV_MobileNav from './components/views/GV_MobileNav';
import GV_AuthModal from './components/views/GV_AuthModal';

// Page Views
import UV_Landing from './components/views/UV_Landing';
import UV_Login from './components/views/UV_Login';
import UV_Register from './components/views/UV_Register';
import UV_SearchResults from './components/views/UV_SearchResults';
import UV_PropertyDetail from './components/views/UV_PropertyDetail';
import UV_Contact from './components/views/UV_Contact';
import UV_Dashboard from './components/views/UV_Dashboard';
import UV_SavedProperties from './components/views/UV_SavedProperties';
import UV_UserInquiries from './components/views/UV_UserInquiries';
import UV_UserAccount from './components/views/UV_UserAccount';
import UV_AgentLogin from './components/views/UV_AgentLogin';
import UV_AgentRegister from './components/views/UV_AgentRegister';
import UV_AgentDashboard from './components/views/UV_AgentDashboard';
import UV_AgentListings from './components/views/UV_AgentListings';
import UV_CreateListing from './components/views/UV_CreateListing';
import UV_EditListing from './components/views/UV_EditListing';
import UV_AgentInquiries from './components/views/UV_AgentInquiries';
import UV_AgentProfile from './components/views/UV_AgentProfile';
import UV_AgentSettings from './components/views/UV_AgentSettings';
import UV_AdminDashboard from './components/views/UV_AdminDashboard';
import UV_AdminAgentApprovals from './components/views/UV_AdminAgentApprovals';
import UV_AdminFeaturedListings from './components/views/UV_AdminFeaturedListings';
import UV_AdminReportedListings from './components/views/UV_AdminReportedListings';
import UV_ForgotPassword from './components/views/UV_ForgotPassword';
import UV_ResetPassword from './components/views/UV_ResetPassword';
import UV_EmailVerification from './components/views/UV_EmailVerification';
import UV_Terms from './components/views/UV_Terms';
import UV_Privacy from './components/views/UV_Privacy';
import UV_404 from './components/views/UV_404';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Documentation: ZUSTAND STATE SELECTION PATTERNS
// ✅ CORRECT - Individual selectors (prevents infinite loops)
// const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
// const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);

// ❌ WRONG - Object destructuring causes infinite loops
// const { is_authenticated, is_loading } = useAppStore(state => state.authentication_state.authentication_status);

// Protected Route Wrapper for authenticated users
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Protected Route Wrapper for agents
const AgentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAgentAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_agent_authenticated);
  return isAgentAuthenticated ? <>{children}</> : <Navigate to="/agent/login" replace />;
};

// Protected Route Wrapper for admins
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAdminAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_admin_authenticated);
  return isAdminAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <GV_TopNav />
          <GV_MobileNav />
          
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<UV_Landing />} />
              <Route path="/login" element={<UV_Login />} />
              <Route path="/register" element={<UV_Register />} />
              <Route path="/search" element={<UV_SearchResults />} />
              <Route path="/property/:id" element={<UV_PropertyDetail />} />
              <Route path="/agent/:id" element={<UV_AgentProfile />} />
              <Route path="/contact" element={<UV_Contact />} />
              <Route path="/forgot-password" element={<UV_ForgotPassword />} />
              <Route path="/reset-password" element={<UV_ResetPassword />} />
              <Route path="/verify-email" element={<UV_EmailVerification />} />
              <Route path="/terms" element={<UV_Terms />} />
              <Route path="/privacy" element={<UV_Privacy />} />

              {/* Agent Routes */}
              <Route path="/agent/login" element={<UV_AgentLogin />} />
              <Route path="/agent/register" element={<UV_AgentRegister />} />
              <Route path="/agent/dashboard" element={<AgentRoute><UV_AgentDashboard /></AgentRoute>} />
              <Route path="/agent/listings" element={<AgentRoute><UV_AgentListings /></AgentRoute>} />
              <Route path="/agent/listings/create" element={<AgentRoute><UV_CreateListing /></AgentRoute>} />
              <Route path="/agent/listings/edit/:id" element={<AgentRoute><UV_EditListing /></AgentRoute>} />
              <Route path="/agent/inquiries" element={<AgentRoute><UV_AgentInquiries /></AgentRoute>} />
              <Route path="/agent/settings" element={<AgentRoute><UV_AgentSettings /></AgentRoute>} />

              {/* User Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><UV_Dashboard /></ProtectedRoute>} />
              <Route path="/saved" element={<ProtectedRoute><UV_SavedProperties /></ProtectedRoute>} />
              <Route path="/inquiries" element={<ProtectedRoute><UV_UserInquiries /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><UV_UserAccount /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<AdminRoute><UV_AdminDashboard /></AdminRoute>} />
              <Route path="/admin/agents" element={<AdminRoute><UV_AdminAgentApprovals /></AdminRoute>} />
              <Route path="/admin/featured" element={<AdminRoute><UV_AdminFeaturedListings /></AdminRoute>} />
              <Route path="/admin/reports" element={<AdminRoute><UV_AdminReportedListings /></AdminRoute>} />

              {/* 404 Route */}
              <Route path="*" element={<UV_404 />} />
            </Routes>
          </main>

          <GV_Footer />
          <GV_AuthModal />
        </div>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
