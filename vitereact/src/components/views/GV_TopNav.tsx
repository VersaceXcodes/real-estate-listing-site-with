import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Home, Search, Building2, Menu, X, ChevronDown, User, Heart, MessageSquare, Settings, LogOut } from 'lucide-react';

const GV_TopNav: React.FC = () => {
  // ========== LOCAL STATE ==========
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // ========== GLOBAL STATE (INDIVIDUAL SELECTORS - CRITICAL) ==========
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const currentAgent = useAppStore(state => state.authentication_state.current_agent);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isAgentAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_agent_authenticated);
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);
  const unreadInquiryCount = useAppStore(state => state.agent_dashboard_state.unread_inquiry_count);
  const mobileNavOpen = useAppStore(state => state.ui_state.mobile_nav_open);
  const logoutAction = useAppStore(state => state.logout);
  const toggleMobileNav = useAppStore(state => state.toggle_mobile_nav);
  
  // ========== ROUTER ==========
  const location = useLocation();
  const currentPath = location.pathname;
  
  // ========== EFFECTS ==========
  
  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userDropdownOpen]);
  
  // Close dropdown on route change
  useEffect(() => {
    setUserDropdownOpen(false);
  }, [currentPath]);
  
  // Close mobile nav on route change
  useEffect(() => {
    if (mobileNavOpen) {
      toggleMobileNav();
    }
  }, [currentPath]);
  
  // ========== HANDLERS ==========
  
  const handleLogout = () => {
    setUserDropdownOpen(false);
    logoutAction();
  };
  
  const toggleUserDropdown = () => {
    setUserDropdownOpen(!userDropdownOpen);
  };
  
  const handleMobileMenuToggle = () => {
    toggleMobileNav();
  };
  
  // ========== HELPER FUNCTIONS ==========
  
  const isActivePath = (path: string): boolean => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };
  
  const getNavLinkClasses = (path: string): string => {
    const baseClasses = "px-4 py-2 rounded-lg font-medium transition-all duration-200";
    const activeClasses = "bg-blue-50 text-blue-700";
    const inactiveClasses = "text-gray-700 hover:bg-gray-100 hover:text-gray-900";
    
    return `${baseClasses} ${isActivePath(path) ? activeClasses : inactiveClasses}`;
  };
  
  const getUserInitials = (): string => {
    const name = currentUser?.full_name || currentAgent?.full_name || '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const getUserDisplayName = (): string => {
    return currentUser?.full_name || currentAgent?.full_name || 'User';
  };
  
  const getUserPhotoUrl = (): string | null => {
    return currentUser?.profile_photo_url || currentAgent?.profile_photo_url || null;
  };
  
  // ========== RENDER ==========
  
  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm backdrop-blur-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* ========== LEFT SECTION: LOGO & MAIN NAV ========== */}
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link 
                to="/"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Building2 className="h-8 w-8" />
                <span className="text-xl font-bold hidden sm:block">PropConnect</span>
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-1">
                <Link 
                  to="/"
                  className={getNavLinkClasses('/')}
                >
                  Home
                </Link>
                
                <Link 
                  to="/search?listing_type=sale"
                  className={getNavLinkClasses('/search')}
                >
                  Buy
                </Link>
                
                <Link 
                  to="/search?listing_type=rent"
                  className={getNavLinkClasses('/rent')}
                >
                  Rent
                </Link>
                
                {/* Agents link - future feature */}
                {/* <Link 
                  to="/agents"
                  className={getNavLinkClasses('/agents')}
                >
                  Agents
                </Link> */}
              </div>
            </div>
            
            {/* ========== RIGHT SECTION: AUTH / USER MENU ========== */}
            <div className="flex items-center space-x-4">
              
              {/* ========== GUEST (NOT AUTHENTICATED) ========== */}
              {!isAuthenticated && !isAgentAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="hidden sm:block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Register
                  </Link>
                </>
              )}
              
              {/* ========== PROPERTY SEEKER (AUTHENTICATED USER) ========== */}
              {isAuthenticated && userType === 'property_seeker' && currentUser && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleUserDropdown}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-expanded={userDropdownOpen}
                    aria-haspopup="true"
                  >
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md overflow-hidden">
                      {getUserPhotoUrl() ? (
                        <img 
                          src={getUserPhotoUrl()!} 
                          alt={getUserDisplayName()}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{getUserInitials()}</span>
                      )}
                    </div>
                    
                    {/* User Name (hidden on mobile) */}
                    <span className="hidden lg:block text-sm font-medium text-gray-700">
                      {getUserDisplayName()}
                    </span>
                    
                    {/* Dropdown Icon */}
                    <ChevronDown 
                      className={`hidden lg:block h-4 w-4 text-gray-500 transition-transform duration-200 ${
                        userDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  
                  {/* User Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 divide-y divide-gray-100">
                      {/* User Info Header */}
                      <div className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {currentUser.full_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {currentUser.email}
                        </p>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          to="/account"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          <User className="h-4 w-4 mr-3 text-gray-400" />
                          My Account
                        </Link>
                        
                        <Link
                          to="/saved-properties"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          <Heart className="h-4 w-4 mr-3 text-gray-400" />
                          Saved Properties
                        </Link>
                        
                        <Link
                          to="/my-inquiries"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          <MessageSquare className="h-4 w-4 mr-3 text-gray-400" />
                          My Inquiries
                        </Link>
                      </div>
                      
                      {/* Logout */}
                      <div className="py-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* ========== AGENT (AUTHENTICATED) ========== */}
              {isAgentAuthenticated && userType === 'agent' && currentAgent && (
                <div className="flex items-center space-x-3">
                  {/* Agent Dashboard Button */}
                  <Link
                    to="/agent/dashboard"
                    className="hidden sm:flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Dashboard
                  </Link>
                  
                  {/* Agent Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={toggleUserDropdown}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-expanded={userDropdownOpen}
                      aria-haspopup="true"
                    >
                      {/* Agent Avatar */}
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold shadow-md overflow-hidden">
                          {getUserPhotoUrl() ? (
                            <img 
                              src={getUserPhotoUrl()!} 
                              alt={getUserDisplayName()}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{getUserInitials()}</span>
                          )}
                        </div>
                        
                        {/* Unread Inquiry Badge */}
                        {unreadInquiryCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                            <span className="text-xs font-bold text-white">
                              {unreadInquiryCount > 9 ? '9+' : unreadInquiryCount}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Agent Name */}
                      <span className="hidden lg:block text-sm font-medium text-gray-700">
                        {getUserDisplayName()}
                      </span>
                      
                      {/* Dropdown Icon */}
                      <ChevronDown 
                        className={`hidden lg:block h-4 w-4 text-gray-500 transition-transform duration-200 ${
                          userDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    
                    {/* Agent Dropdown Menu */}
                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 divide-y divide-gray-100">
                        {/* Agent Info Header */}
                        <div className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {currentAgent.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {currentAgent.email}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {currentAgent.agency_name}
                          </p>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="py-2">
                          <Link
                            to="/agent/dashboard"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <Home className="h-4 w-4 mr-3 text-gray-400" />
                            Dashboard
                          </Link>
                          
                          <Link
                            to="/agent/listings"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <Building2 className="h-4 w-4 mr-3 text-gray-400" />
                            My Listings
                          </Link>
                          
                          <Link
                            to="/agent/inquiries"
                            className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <div className="flex items-center">
                              <MessageSquare className="h-4 w-4 mr-3 text-gray-400" />
                              Inquiries
                            </div>
                            {unreadInquiryCount > 0 && (
                              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                {unreadInquiryCount > 99 ? '99+' : unreadInquiryCount}
                              </span>
                            )}
                          </Link>
                          
                          <Link
                            to="/agent/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <User className="h-4 w-4 mr-3 text-gray-400" />
                            My Profile
                          </Link>
                          
                          <Link
                            to="/agent/settings"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <Settings className="h-4 w-4 mr-3 text-gray-400" />
                            Settings
                          </Link>
                        </div>
                        
                        {/* Logout */}
                        <div className="py-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="h-4 w-4 mr-3" />
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* ========== MOBILE MENU BUTTON ========== */}
              <button
                onClick={handleMobileMenuToggle}
                className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Toggle mobile menu"
                aria-expanded={mobileNavOpen}
              >
                {mobileNavOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </nav>
        
        {/* ========== MOBILE NAVIGATION MENU ========== */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-2">
              {/* Mobile Nav Links */}
              <Link
                to="/"
                className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                onClick={handleMobileMenuToggle}
              >
                <div className="flex items-center">
                  <Home className="h-5 w-5 mr-3 text-gray-400" />
                  Home
                </div>
              </Link>
              
              <Link
                to="/search?listing_type=sale"
                className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                onClick={handleMobileMenuToggle}
              >
                <div className="flex items-center">
                  <Search className="h-5 w-5 mr-3 text-gray-400" />
                  Buy
                </div>
              </Link>
              
              <Link
                to="/search?listing_type=rent"
                className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                onClick={handleMobileMenuToggle}
              >
                <div className="flex items-center">
                  <Building2 className="h-5 w-5 mr-3 text-gray-400" />
                  Rent
                </div>
              </Link>
              
              {/* Mobile Auth Section */}
              {!isAuthenticated && !isAgentAuthenticated && (
                <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
                  <Link
                    to="/login"
                    className="block px-4 py-3 text-center rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors border border-gray-300"
                    onClick={handleMobileMenuToggle}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-3 text-center rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                    onClick={handleMobileMenuToggle}
                  >
                    Register
                  </Link>
                </div>
              )}
              
              {/* Mobile Authenticated User Menu */}
              {isAuthenticated && userType === 'property_seeker' && currentUser && (
                <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium text-gray-900">
                      {currentUser.full_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {currentUser.email}
                    </p>
                  </div>
                  
                  <Link
                    to="/account"
                    className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={handleMobileMenuToggle}
                  >
                    <User className="h-5 w-5 mr-3 text-gray-400" />
                    My Account
                  </Link>
                  
                  <Link
                    to="/saved-properties"
                    className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={handleMobileMenuToggle}
                  >
                    <Heart className="h-5 w-5 mr-3 text-gray-400" />
                    Saved Properties
                  </Link>
                  
                  <Link
                    to="/my-inquiries"
                    className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={handleMobileMenuToggle}
                  >
                    <MessageSquare className="h-5 w-5 mr-3 text-gray-400" />
                    My Inquiries
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Logout
                  </button>
                </div>
              )}
              
              {/* Mobile Agent Menu */}
              {isAgentAuthenticated && userType === 'agent' && currentAgent && (
                <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium text-gray-900">
                      {currentAgent.full_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {currentAgent.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {currentAgent.agency_name}
                    </p>
                  </div>
                  
                  <Link
                    to="/agent/dashboard"
                    className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={handleMobileMenuToggle}
                  >
                    <Home className="h-5 w-5 mr-3 text-gray-400" />
                    Dashboard
                  </Link>
                  
                  <Link
                    to="/agent/listings"
                    className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={handleMobileMenuToggle}
                  >
                    <Building2 className="h-5 w-5 mr-3 text-gray-400" />
                    My Listings
                  </Link>
                  
                  <Link
                    to="/agent/inquiries"
                    className="flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={handleMobileMenuToggle}
                  >
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-3 text-gray-400" />
                      Inquiries
                    </div>
                    {unreadInquiryCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {unreadInquiryCount > 99 ? '99+' : unreadInquiryCount}
                      </span>
                    )}
                  </Link>
                  
                  <Link
                    to="/agent/profile"
                    className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={handleMobileMenuToggle}
                  >
                    <User className="h-5 w-5 mr-3 text-gray-400" />
                    My Profile
                  </Link>
                  
                  <Link
                    to="/agent/settings"
                    className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={handleMobileMenuToggle}
                  >
                    <Settings className="h-5 w-5 mr-3 text-gray-400" />
                    Settings
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default GV_TopNav;