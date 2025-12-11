import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { X, Home, Search, Heart, MessageSquare, User, LayoutDashboard, FileText, Plus, Settings, LogOut, ChevronRight } from 'lucide-react';

const GV_MobileNav: React.FC = () => {
  const navigate = useNavigate();

  // CRITICAL: Individual selectors to prevent infinite loops
  const mobileNavOpen = useAppStore(state => state.ui_state.mobile_nav_open);
  const toggleMobileNav = useAppStore(state => state.toggle_mobile_nav);
  const logout = useAppStore(state => state.logout);
  
  // Authentication state
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isAgentAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_agent_authenticated);
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const currentAgent = useAppStore(state => state.authentication_state.current_agent);
  
  // Feature badges
  const savedPropertiesCount = useAppStore(state => state.user_favorites.saved_properties.length);
  const agentUnreadInquiries = useAppStore(state => state.agent_dashboard_state.unread_inquiry_count);

  // Prevent body scroll when nav is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileNavOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileNavOpen) {
        toggleMobileNav();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileNavOpen, toggleMobileNav]);

  const handleNavigate = (path: string) => {
    navigate(path);
    toggleMobileNav();
  };

  const handleLogout = () => {
    logout();
    toggleMobileNav();
  };

  // Don't render if not visible (performance optimization)
  if (!mobileNavOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={toggleMobileNav}
        aria-hidden="true"
      />

      {/* Mobile Navigation Panel */}
      <div
        className="fixed inset-y-0 left-0 w-full max-w-sm bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 id="mobile-nav-title" className="text-xl font-bold text-gray-900">
            Menu
          </h2>
          <button
            onClick={toggleMobileNav}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close navigation"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Profile Section (if authenticated) */}
        {isAuthenticated && currentUser && !isAgentAuthenticated && (
          <div className="border-b border-gray-200 px-6 py-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-4">
              {currentUser.profile_photo_url ? (
                <img
                  src={currentUser.profile_photo_url}
                  alt={currentUser.full_name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-md border-2 border-white">
                  {currentUser.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate">
                  {currentUser.full_name}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Agent Profile Section (if authenticated as agent) */}
        {isAgentAuthenticated && currentAgent && (
          <div className="border-b border-gray-200 px-6 py-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-4">
              {currentAgent.profile_photo_url ? (
                <img
                  src={currentAgent.profile_photo_url}
                  alt={currentAgent.full_name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-md border-2 border-white">
                  {currentAgent.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate">
                  {currentAgent.full_name}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {currentAgent.professional_title || currentAgent.agency_name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="px-4 py-6" aria-label="Mobile navigation">
          {/* Public/Guest Navigation */}
          {!isAuthenticated && (
            <div className="space-y-2">
              <button
                onClick={() => handleNavigate('/')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <Home className="w-5 h-5 text-gray-600" />
                  <span>Home</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleNavigate('/search?listing_type=sale')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <Search className="w-5 h-5 text-gray-600" />
                  <span>For Sale</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleNavigate('/search?listing_type=rent')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <Search className="w-5 h-5 text-gray-600" />
                  <span>For Rent</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Divider */}
              <div className="my-4 border-t border-gray-200" />

              {/* Authentication Links */}
              <button
                onClick={() => handleNavigate('/login')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <User className="w-5 h-5" />
                  <span>Sign In</span>
                </span>
                <ChevronRight className="w-5 h-5 text-blue-400" />
              </button>

              <button
                onClick={() => handleNavigate('/register')}
                className="w-full flex items-center justify-center px-4 py-3 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Register Free
              </button>

              {/* Divider */}
              <div className="my-4 border-t border-gray-200" />

              {/* Agent Login */}
              <button
                onClick={() => handleNavigate('/agent/login')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <span>Are you an agent? Sign In</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}

          {/* Authenticated Property Seeker Navigation */}
          {isAuthenticated && !isAgentAuthenticated && currentUser && (
            <div className="space-y-2">
              <button
                onClick={() => handleNavigate('/')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <Home className="w-5 h-5 text-gray-600" />
                  <span>Home</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleNavigate('/search?listing_type=sale')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <Search className="w-5 h-5 text-gray-600" />
                  <span>For Sale</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleNavigate('/search?listing_type=rent')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <Search className="w-5 h-5 text-gray-600" />
                  <span>For Rent</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Divider */}
              <div className="my-4 border-t border-gray-200" />

              {/* User-Specific Links */}
              <button
                onClick={() => handleNavigate('/saved-properties')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <Heart className="w-5 h-5 text-gray-600" />
                  <span>Saved Properties</span>
                </span>
                <div className="flex items-center space-x-2">
                  {savedPropertiesCount > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full min-w-[24px] text-center">
                      {savedPropertiesCount}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>

              <button
                onClick={() => handleNavigate('/my-inquiries')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <span>My Inquiries</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleNavigate('/account')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <span>My Account</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Divider */}
              <div className="my-4 border-t border-gray-200" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <span className="flex items-center space-x-3">
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </span>
                <ChevronRight className="w-5 h-5 text-red-400" />
              </button>
            </div>
          )}

          {/* Authenticated Agent Navigation */}
          {isAgentAuthenticated && currentAgent && (
            <div className="space-y-2">
              <button
                onClick={() => handleNavigate('/agent/dashboard')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <LayoutDashboard className="w-5 h-5 text-gray-600" />
                  <span>Dashboard</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleNavigate('/agent/listings')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span>My Listings</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleNavigate('/agent/listings/create')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <Plus className="w-5 h-5 text-gray-600" />
                  <span>Create Listing</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleNavigate('/agent/inquiries')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <span>Inquiries</span>
                </span>
                <div className="flex items-center space-x-2">
                  {agentUnreadInquiries > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                      {agentUnreadInquiries}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>

              <button
                onClick={() => handleNavigate('/agent/profile')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <span>Profile</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleNavigate('/agent/settings')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span>Settings</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Divider */}
              <div className="my-4 border-t border-gray-200" />

              {/* View Public Profile */}
              {currentAgent.agent_id && (
                <button
                  onClick={() => handleNavigate(`/agent/${currentAgent.agent_id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <span>View Public Profile</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              )}

              {/* Back to Website */}
              <button
                onClick={() => handleNavigate('/')}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <span>Back to Website</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Divider */}
              <div className="my-4 border-t border-gray-200" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <span className="flex items-center space-x-3">
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </span>
                <ChevronRight className="w-5 h-5 text-red-400" />
              </button>
            </div>
          )}
        </nav>

        {/* Footer (optional info) */}
        <div className="mt-auto px-6 py-6 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            © 2024 PropConnect. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
};

export default GV_MobileNav;