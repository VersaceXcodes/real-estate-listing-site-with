import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS (from Zod schemas)
// ============================================================================

interface Agent {
  agent_id: string;
  email: string;
  full_name: string;
  phone_number: string;
  license_number: string;
  license_state: string;
  agency_name: string;
  office_address_street: string;
  office_address_city: string;
  office_address_state: string;
  office_address_zip: string;
  years_experience: string;
  license_document_url: string | null;
  profile_photo_url: string | null;
  professional_title: string | null;
  bio: string | null;
  approved: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  account_status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

interface PropertyReport {
  report_id: string;
  property_id: string;
  reporter_user_id: string | null;
  reporter_email: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface DashboardStats {
  total_agents: number;
  pending_approvals: number;
  total_properties: number;
  total_users: number;
  total_inquiries: number;
  reports_pending: number;
  featured_listings_count: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchRecentAgentApplications = async (token: string): Promise<Agent[]> => {
  const response = await axios.get<PaginatedResponse<Agent>>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/agents/pending`,
    {
      params: {
        limit: 5,
        offset: 0,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

const fetchRecentReports = async (token: string): Promise<PropertyReport[]> => {
  const response = await axios.get<PaginatedResponse<PropertyReport>>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/property-reports`,
    {
      params: {
        status: 'pending',
        limit: 5,
        offset: 0,
      },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

const fetchDashboardStats = async (token: string): Promise<DashboardStats> => {
  // WORKAROUND: Since /api/admin/dashboard/stats is MISSING, aggregate from multiple endpoints
  try {
    const [agentsRes, pendingAgentsRes, propertiesRes, reportsRes] = await Promise.all([
      axios.get<PaginatedResponse<Agent>>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/agents`,
        {
          params: { limit: 1, offset: 0 },
          headers: { 'Authorization': `Bearer ${token}` },
        }
      ),
      axios.get<PaginatedResponse<Agent>>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/agents/pending`,
        {
          params: { limit: 1, offset: 0 },
          headers: { 'Authorization': `Bearer ${token}` },
        }
      ),
      axios.get<PaginatedResponse<any>>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties`,
        {
          params: { limit: 1, offset: 0 },
          headers: { 'Authorization': `Bearer ${token}` },
        }
      ),
      axios.get<PaginatedResponse<PropertyReport>>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/property-reports`,
        {
          params: { status: 'pending', limit: 1, offset: 0 },
          headers: { 'Authorization': `Bearer ${token}` },
        }
      ),
    ]);

    return {
      total_agents: agentsRes.data.pagination.total,
      pending_approvals: pendingAgentsRes.data.pagination.total,
      total_properties: propertiesRes.data.pagination.total,
      total_users: 0, // Would need dedicated endpoint
      total_inquiries: 0, // Would need dedicated endpoint
      reports_pending: reportsRes.data.pagination.total,
      featured_listings_count: 0, // Would need dedicated endpoint
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      total_agents: 0,
      pending_approvals: 0,
      total_properties: 0,
      total_users: 0,
      total_inquiries: 0,
      reports_pending: 0,
      featured_listings_count: 0,
    };
  }
};

const approveAgent = async (agentId: string, token: string): Promise<void> => {
  await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/agents/${agentId}/approve`,
    { welcome_message: null },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminDashboard: React.FC = () => {
  // CRITICAL: Individual selectors - no object destructuring
  const adminAuthToken = useAppStore(state => state.authentication_state.admin_auth_token);
  const currentAdmin = useAppStore(state => state.authentication_state.current_admin);
  const isAdminAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_admin_authenticated);
  const showToast = useAppStore(state => state.show_toast);
  
  const queryClient = useQueryClient();

  // Redirect if not admin
  useEffect(() => {
    if (!isAdminAuthenticated) {
      window.location.href = '/admin/login';
    }
  }, [isAdminAuthenticated]);

  // Fetch dashboard stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => fetchDashboardStats(adminAuthToken!),
    enabled: !!adminAuthToken,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Fetch recent agent applications
  const {
    data: recentApplications,
    isLoading: applicationsLoading,
    error: applicationsError,
  } = useQuery({
    queryKey: ['recent-agent-applications'],
    queryFn: () => fetchRecentAgentApplications(adminAuthToken!),
    enabled: !!adminAuthToken,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Fetch recent reports
  const {
    data: recentReports,
    isLoading: reportsLoading,
    error: reportsError,
  } = useQuery({
    queryKey: ['recent-property-reports'],
    queryFn: () => fetchRecentReports(adminAuthToken!),
    enabled: !!adminAuthToken,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Approve agent mutation
  const approveAgentMutation = useMutation({
    mutationFn: (agentId: string) => approveAgent(agentId, adminAuthToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-agent-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      showToast('Agent approved successfully', 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to approve agent';
      showToast(errorMessage, 'error');
    },
  });

  const handleQuickApprove = (agentId: string) => {
    if (window.confirm('Approve this agent application?')) {
      approveAgentMutation.mutate(agentId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isAdminAuthenticated) {
    return null; // Will redirect
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Welcome back, {currentAdmin?.full_name}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                  {currentAdmin?.role || 'Admin'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Overview</h2>
            
            {statsLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : statsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-red-700 text-sm">Failed to load statistics</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Agents */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Agents</p>
                      <p className="text-3xl font-bold text-gray-900">{stats?.total_agents || 0}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Pending Approvals */}
                <Link to="/admin/agent-approvals" className="block">
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-200 hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Pending Approvals</p>
                        <p className="text-3xl font-bold text-orange-600">{stats?.pending_approvals || 0}</p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Total Properties */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Properties</p>
                      <p className="text-3xl font-bold text-gray-900">{stats?.total_properties || 0}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Reports Pending */}
                <Link to="/admin/reported-listings" className="block">
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-200 hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Reports Pending</p>
                        <p className="text-3xl font-bold text-red-600">{stats?.reports_pending || 0}</p>
                      </div>
                      <div className="p-3 bg-red-100 rounded-lg">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Total Users */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900">{stats?.total_users || 0}</p>
                    </div>
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Total Inquiries */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Inquiries</p>
                      <p className="text-3xl font-bold text-gray-900">{stats?.total_inquiries || 0}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Featured Listings */}
                <Link to="/admin/featured-listings" className="block">
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-200 hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Featured Listings</p>
                        <p className="text-3xl font-bold text-gray-900">{stats?.featured_listings_count || 0}</p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/admin/agent-approvals"
                className="bg-white rounded-lg shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-orange-100 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">Agent Approvals</p>
                    <p className="text-xs text-gray-600">Review applications</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/reported-listings"
                className="bg-white rounded-lg shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-red-100 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">Reported Listings</p>
                    <p className="text-xs text-gray-600">Moderate content</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/featured-listings"
                className="bg-white rounded-lg shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">Featured Listings</p>
                    <p className="text-xs text-gray-600">Manage homepage</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/agents"
                className="bg-white rounded-lg shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">All Agents</p>
                    <p className="text-xs text-gray-600">Manage accounts</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Agent Applications */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Agent Applications</h3>
                  <Link
                    to="/admin/agent-approvals"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View All
                  </Link>
                </div>
              </div>

              {applicationsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : applicationsError ? (
                <div className="p-6">
                  <p className="text-sm text-red-600">Failed to load applications</p>
                </div>
              ) : recentApplications && recentApplications.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {recentApplications.map((agent) => (
                    <div key={agent.agent_id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            {agent.profile_photo_url ? (
                              <img
                                src={agent.profile_photo_url}
                                alt={agent.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-600 font-medium text-sm">
                                  {agent.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{agent.full_name}</p>
                              <p className="text-xs text-gray-600">{agent.agency_name}</p>
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">License:</span> {agent.license_number} ({agent.license_state})
                            </p>
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Experience:</span> {agent.years_experience} years
                            </p>
                            <p className="text-xs text-gray-500">
                              Applied {formatDate(agent.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => handleQuickApprove(agent.agent_id)}
                            disabled={approveAgentMutation.isPending}
                            className="px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {approveAgentMutation.isPending ? 'Approving...' : 'Approve'}
                          </button>
                          <Link
                            to="/admin/agent-approvals"
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors text-center"
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">No pending applications</p>
                  <p className="text-xs text-gray-500 mt-1">New agent applications will appear here</p>
                </div>
              )}
            </div>

            {/* Recent Reports */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
                  <Link
                    to="/admin/reported-listings"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View All
                  </Link>
                </div>
              </div>

              {reportsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : reportsError ? (
                <div className="p-6">
                  <p className="text-sm text-red-600">Failed to load reports</p>
                </div>
              ) : recentReports && recentReports.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {recentReports.map((report) => (
                    <div key={report.report_id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                              {report.reason}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(report.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 mb-1">
                            Property ID: <span className="font-mono text-xs text-gray-600">{report.property_id}</span>
                          </p>
                          {report.details && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                              {report.details}
                            </p>
                          )}
                          {report.reporter_email && (
                            <p className="text-xs text-gray-500 mt-1">
                              Reported by: {report.reporter_email}
                            </p>
                          )}
                        </div>
                        <Link
                          to="/admin/reported-listings"
                          className="ml-4 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">No pending reports</p>
                  <p className="text-xs text-gray-500 mt-1">Property reports will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Admin Links */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/admin/agents"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
              >
                <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">All Agents</p>
                  <p className="text-xs text-gray-600">Manage agent accounts</p>
                </div>
              </Link>

              <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex-shrink-0 p-2 bg-gray-200 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Analytics</p>
                  <p className="text-xs text-gray-400">Coming soon</p>
                </div>
              </div>

              <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex-shrink-0 p-2 bg-gray-200 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Settings</p>
                  <p className="text-xs text-gray-400">Coming soon</p>
                </div>
              </div>

              <Link
                to="/"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
              >
                <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">View Public Site</p>
                  <p className="text-xs text-gray-600">See user experience</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
    </>
  );
};

export default UV_AdminDashboard;