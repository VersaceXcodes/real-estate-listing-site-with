import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Home, Mail, Eye, Heart, TrendingUp, Plus, List, RefreshCw } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface DashboardStats {
  total_active_listings: number;
  total_views_this_month: number;
  total_inquiries_this_month: number;
  total_favorites: number;
  properties_sold_this_month: number;
  properties_rented_this_month: number;
  unread_inquiry_count: number;
}

interface PropertyInfo {
  property_id: string;
  address_street: string;
  address_city: string;
  address_state: string;
  price: number;
  thumbnail_url: string | null;
}

interface RecentInquiry {
  inquiry_id: string;
  property_id: string;
  inquirer_name: string;
  inquirer_email: string;
  inquirer_phone: string | null;
  message: string;
  viewing_requested: boolean;
  status: 'new' | 'responded' | 'scheduled' | 'completed' | 'closed';
  agent_read: boolean;
  created_at: string;
  property_info?: PropertyInfo;
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

const fetchDashboardStats = async (agentToken: string): Promise<DashboardStats> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/dashboard/stats`,
    {
      headers: {
        'Authorization': `Bearer ${agentToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  // Convert NUMERIC fields to numbers
  return {
    total_active_listings: Number(response.data.total_active_listings || 0),
    total_views_this_month: Number(response.data.total_views_this_month || 0),
    total_inquiries_this_month: Number(response.data.total_inquiries_this_month || 0),
    total_favorites: Number(response.data.total_favorites || 0),
    properties_sold_this_month: Number(response.data.properties_sold_this_month || 0),
    properties_rented_this_month: Number(response.data.properties_rented_this_month || 0),
    unread_inquiry_count: Number(response.data.unread_inquiry_count || 0)
  };
};

const fetchRecentInquiries = async (agentToken: string): Promise<RecentInquiry[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inquiries/agent/my-inquiries`,
    {
      headers: {
        'Authorization': `Bearer ${agentToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        limit: 5,
        offset: 0,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
    }
  );
  
  // Transform response and convert numeric fields
  return response.data.data.map((inquiry: any) => ({
    inquiry_id: inquiry.inquiry_id,
    property_id: inquiry.property_id,
    inquirer_name: inquiry.inquirer_name,
    inquirer_email: inquiry.inquirer_email,
    inquirer_phone: inquiry.inquirer_phone,
    message: inquiry.message,
    viewing_requested: inquiry.viewing_requested,
    status: inquiry.status,
    agent_read: inquiry.agent_read,
    created_at: inquiry.created_at,
    property_info: inquiry.property_info ? {
      property_id: inquiry.property_info.property_id,
      address_street: inquiry.property_info.address_street,
      address_city: inquiry.property_info.address_city,
      address_state: inquiry.property_info.address_state,
      price: Number(inquiry.property_info.price || 0),
      thumbnail_url: inquiry.property_info.thumbnail_url
    } : undefined
  }));
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // CRITICAL: Individual selectors to prevent infinite loops
  const currentAgent = useAppStore(state => state.authentication_state.current_agent);
  const agentAuthToken = useAppStore(state => state.authentication_state.agent_auth_token);
  const isAgentAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_agent_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  
  // Check authentication and approval status
  React.useEffect(() => {
    if (!isLoading) {
      if (!isAgentAuthenticated || !currentAgent) {
        navigate('/agent/login');
        return;
      }
      
      if (!currentAgent.approved || currentAgent.approval_status !== 'approved') {
        navigate('/agent/pending-approval');
        return;
      }
      
      if (currentAgent.account_status !== 'active') {
        navigate('/agent/suspended');
        return;
      }
    }
  }, [isAgentAuthenticated, currentAgent, isLoading, navigate]);
  
  // Fetch dashboard statistics with React Query
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['agent-dashboard-stats', currentAgent?.agent_id],
    queryFn: () => fetchDashboardStats(agentAuthToken!),
    enabled: !!agentAuthToken && !!currentAgent,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Auto-refresh every minute
    retry: 1
  });
  
  // Fetch recent inquiries
  const {
    data: recentInquiries,
    isLoading: inquiriesLoading,
    error: inquiriesError,
    refetch: refetchInquiries
  } = useQuery({
    queryKey: ['agent-recent-inquiries', currentAgent?.agent_id],
    queryFn: () => fetchRecentInquiries(agentAuthToken!),
    enabled: !!agentAuthToken && !!currentAgent,
    staleTime: 30000, // 30 seconds
    retry: 1
  });
  
  // Manual refresh handler
  const handleRefresh = () => {
    refetchStats();
    refetchInquiries();
  };
  
  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    }
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Status badge colors
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'responded':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'scheduled':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };
  
  // Show loading state during auth check
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }
  
  // Don't render if not authenticated (redirect will happen)
  if (!isAgentAuthenticated || !currentAgent) {
    return null;
  }
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Welcome back, {currentAgent.full_name}!
                </p>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={statsLoading || inquiriesLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 ${(statsLoading || inquiriesLoading) ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">Refresh</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Action Buttons */}
          <div className="mb-8 flex flex-wrap gap-4">
            <Link
              to="/agent/listings/create"
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Listing</span>
            </Link>
            
            <Link
              to="/agent/inquiries"
              className="flex items-center space-x-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Mail className="h-5 w-5" />
              <span>View Inquiries</span>
              {stats && stats.unread_inquiry_count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {stats.unread_inquiry_count}
                </span>
              )}
            </Link>
            
            <Link
              to="/agent/listings"
              className="flex items-center space-x-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <List className="h-5 w-5" />
              <span>Manage Listings</span>
            </Link>
          </div>
          
          {/* Statistics Cards */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
            
            {statsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-red-800 font-medium">Failed to load statistics</h3>
                    <p className="text-red-600 text-sm mt-1">
                      {statsError instanceof Error ? statsError.message : 'An error occurred'}
                    </p>
                  </div>
                  <button
                    onClick={() => refetchStats()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Active Listings Card */}
                <Link
                  to="/agent/listings"
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Home className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-500 font-medium">View All →</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stats.total_active_listings}
                  </div>
                  <div className="text-sm text-gray-600">Active Listings</div>
                </Link>
                
                {/* New Inquiries Card */}
                <Link
                  to="/agent/inquiries?status=new"
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-green-600" />
                    </div>
                    {stats.unread_inquiry_count > 0 && (
                      <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        {stats.unread_inquiry_count} New
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stats.total_inquiries_this_month}
                  </div>
                  <div className="text-sm text-gray-600">Inquiries This Month</div>
                </Link>
                
                {/* Total Views Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Eye className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stats.total_views_this_month.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Property Views</div>
                </div>
                
                {/* Total Favorites Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Heart className="h-6 w-6 text-pink-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stats.total_favorites}
                  </div>
                  <div className="text-sm text-gray-600">Times Favorited</div>
                </div>
                
                {/* Properties Sold Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stats.properties_sold_this_month}
                  </div>
                  <div className="text-sm text-gray-600">Properties Sold</div>
                </div>
                
                {/* Properties Rented Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Home className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stats.properties_rented_this_month}
                  </div>
                  <div className="text-sm text-gray-600">Properties Rented</div>
                </div>
              </div>
            ) : null}
          </div>
          
          {/* Recent Inquiries Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Inquiries</h2>
              <Link
                to="/agent/inquiries"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                View All →
              </Link>
            </div>
            
            {inquiriesError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-red-800 font-medium">Failed to load inquiries</h3>
                    <p className="text-red-600 text-sm mt-1">
                      {inquiriesError instanceof Error ? inquiriesError.message : 'An error occurred'}
                    </p>
                  </div>
                  <button
                    onClick={() => refetchInquiries()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : inquiriesLoading ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-6 animate-pulse">
                      <div className="flex items-start space-x-4">
                        <div className="h-16 w-16 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 w-32 bg-gray-200 rounded mb-3"></div>
                          <div className="h-3 w-full bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : recentInquiries && recentInquiries.length > 0 ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {recentInquiries.map((inquiry) => (
                    <div
                      key={inquiry.inquiry_id}
                      className={`p-6 hover:bg-gray-50 transition-colors ${!inquiry.agent_read ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Property Thumbnail */}
                        <div className="flex-shrink-0">
                          {inquiry.property_info?.thumbnail_url ? (
                            <img
                              src={inquiry.property_info.thumbnail_url}
                              alt={inquiry.property_info.address_street}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Home className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Inquiry Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-semibold text-gray-900">
                                  {inquiry.inquirer_name}
                                </h3>
                                {!inquiry.agent_read && (
                                  <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {inquiry.inquirer_email}
                                {inquiry.inquirer_phone && ` • ${inquiry.inquirer_phone}`}
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end space-y-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(inquiry.status)}`}>
                                {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(inquiry.created_at)}
                              </span>
                            </div>
                          </div>
                          
                          {inquiry.property_info && (
                            <Link
                              to={`/property/${inquiry.property_id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700 mb-2 inline-block"
                            >
                              {inquiry.property_info.address_street}, {inquiry.property_info.address_city}, {inquiry.property_info.address_state}
                            </Link>
                          )}
                          
                          <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                            {inquiry.message}
                          </p>
                          
                          {inquiry.viewing_requested && (
                            <div className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded inline-flex">
                              <span className="font-medium">📅 Viewing Requested</span>
                            </div>
                          )}
                          
                          <div className="mt-3 flex items-center space-x-3">
                            <Link
                              to={`/agent/inquiries?highlight=${inquiry.inquiry_id}`}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Reply →
                            </Link>
                            <Link
                              to={`/property/${inquiry.property_id}`}
                              className="text-sm text-gray-600 hover:text-gray-700"
                            >
                              View Property
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <Link
                    to="/agent/inquiries"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All Inquiries →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Inquiries Yet</h3>
                <p className="text-gray-600 mb-6">
                  When people contact you about your listings, their inquiries will appear here
                </p>
                <Link
                  to="/agent/listings/create"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Your First Listing</span>
                </Link>
              </div>
            )}
          </div>
          
          {/* Additional Info Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-2">Ready to grow your business?</h3>
            <p className="text-blue-100 mb-6">
              List more properties to reach potential buyers and renters
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/agent/listings/create"
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 shadow-lg transition-all duration-200"
              >
                Create New Listing
              </Link>
              <Link
                to="/agent/analytics"
                className="px-6 py-3 bg-blue-500 bg-opacity-30 backdrop-blur text-white rounded-lg font-medium hover:bg-opacity-40 border border-white border-opacity-20 transition-all duration-200"
              >
                View Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AgentDashboard;