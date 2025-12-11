import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPES (matching Zod schemas exactly - snake_case)
// ============================================================================

interface PropertyReport {
  report_id: string;
  property_id: string;
  reporter_user_id: string | null;
  reporter_email: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  resolved_by_admin_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface Property {
  property_id: string;
  title: string;
  description: string;
  listing_type: 'sale' | 'rent';
  property_type: string;
  status: string;
  price: number;
  currency: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  agent_id: string;
}

interface ReportWithProperty extends PropertyReport {
  property?: Property;
  agent_name?: string;
}

interface GetReportsParams {
  status?: string[];
  reason?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
}

interface UpdateReportPayload {
  status: 'resolved' | 'dismissed';
  admin_notes: string;
  action_taken?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchReportedListings = async (params: GetReportsParams, token: string): Promise<{ data: ReportWithProperty[] }> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/property-reports`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        status: params.status?.join(','),
        reason: params.reason,
        limit: params.limit || 20,
        offset: params.offset || 0,
        sort_by: params.sort_by || 'created_at',
        sort_order: params.sort_order || 'desc'
      }
    }
  );
  return response.data;
};

const fetchPropertyDetails = async (property_id: string, token: string): Promise<Property> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

const updateReportStatus = async (
  report_id: string,
  payload: UpdateReportPayload,
  token: string
): Promise<PropertyReport> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/property-reports/${report_id}`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminReportedListings: React.FC = () => {
  // URL Params
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Global State (CRITICAL: Individual selectors only!)
  const adminAuthToken = useAppStore(state => state.authentication_state.admin_auth_token);
  const isAdminAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_admin_authenticated);
  const showToast = useAppStore(state => state.show_toast);
  
  const queryClient = useQueryClient();
  
  // Local State Variables
  const [filter_criteria, setFilterCriteria] = useState<{
    status: string[];
    reason: string | null;
  }>({
    status: searchParams.get('status')?.split(',') || ['pending'],
    reason: searchParams.get('reason') || null
  });
  
  const [report_detail_modal, setReportDetailModal] = useState<{
    is_open: boolean;
    report_id: string | null;
    report_data: PropertyReport | null;
    property_data: Property | null;
    loading: boolean;
  }>({
    is_open: false,
    report_id: null,
    report_data: null,
    property_data: null,
    loading: false
  });
  
  const [resolution_form, setResolutionForm] = useState<{
    action: 'resolve' | 'dismiss' | null;
    admin_notes: string;
    submitting: boolean;
  }>({
    action: null,
    admin_notes: '',
    submitting: false
  });
  
  // Load Reported Listings Query
  const { data: reported_listings, isLoading: reports_loading, error: reports_error, refetch } = useQuery({
    queryKey: ['admin-reported-listings', filter_criteria],
    queryFn: () => fetchReportedListings(
      {
        status: filter_criteria.status,
        reason: filter_criteria.reason || undefined,
        limit: 50,
        offset: 0
      },
      adminAuthToken!
    ),
    enabled: !!adminAuthToken && isAdminAuthenticated,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter_criteria.status.length > 0 && filter_criteria.status[0] !== 'pending') {
      params.set('status', filter_criteria.status.join(','));
    }
    if (filter_criteria.reason) {
      params.set('reason', filter_criteria.reason);
    }
    setSearchParams(params, { replace: true });
  }, [filter_criteria, setSearchParams]);
  
  // Mutation for resolving/dismissing reports
  const updateReportMutation = useMutation({
    mutationFn: ({ report_id, payload }: { report_id: string; payload: UpdateReportPayload }) =>
      updateReportStatus(report_id, payload, adminAuthToken!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reported-listings'] });
      setReportDetailModal({ is_open: false, report_id: null, report_data: null, property_data: null, loading: false });
      setResolutionForm({ action: null, admin_notes: '', submitting: false });
      showToast(`Report ${data.status === 'resolved' ? 'resolved' : 'dismissed'} successfully`, 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update report';
      showToast(errorMessage, 'error');
      setResolutionForm(prev => ({ ...prev, submitting: false }));
    }
  });
  
  // Handler: Change filter
  const handleFilterChange = (filterName: 'status' | 'reason', value: any) => {
    setFilterCriteria(prev => ({
      ...prev,
      [filterName]: value
    }));
  };
  
  // Handler: Clear filters
  const handleClearFilters = () => {
    setFilterCriteria({ status: ['pending'], reason: null });
  };
  
  // Handler: View report detail
  const handleViewReport = async (report: PropertyReport) => {
    setReportDetailModal({
      is_open: true,
      report_id: report.report_id,
      report_data: report,
      property_data: null,
      loading: true
    });
    
    // Load property details
    try {
      const property = await fetchPropertyDetails(report.property_id, adminAuthToken!);
      setReportDetailModal(prev => ({
        ...prev,
        property_data: property,
        loading: false
      }));
    } catch (error) {
      console.error('Failed to load property details:', error);
      setReportDetailModal(prev => ({ ...prev, loading: false }));
      showToast('Failed to load property details', 'error');
    }
  };
  
  // Handler: Close modal
  const handleCloseModal = () => {
    setReportDetailModal({
      is_open: false,
      report_id: null,
      report_data: null,
      property_data: null,
      loading: false
    });
    setResolutionForm({ action: null, admin_notes: '', submitting: false });
  };
  
  // Handler: Submit resolution
  const handleSubmitResolution = async () => {
    if (!resolution_form.action || !report_detail_modal.report_id) return;
    
    setResolutionForm(prev => ({ ...prev, submitting: true }));
    
    const payload: UpdateReportPayload = {
      status: resolution_form.action === 'resolve' ? 'resolved' : 'dismissed',
      admin_notes: resolution_form.admin_notes || '',
      action_taken: resolution_form.action === 'resolve' ? 'no_action' : undefined
    };
    
    updateReportMutation.mutate({
      report_id: report_detail_modal.report_id,
      payload
    });
  };
  
  // Derived data
  const reports = reported_listings?.data || [];
  const pending_count = reports.filter(r => r.status === 'pending').length;
  const resolved_count = reports.filter(r => r.status === 'resolved').length;
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'dismissed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Get reason badge color
  const getReasonBadgeColor = (reason: string) => {
    if (reason.toLowerCase().includes('inappropriate')) return 'bg-red-100 text-red-800';
    if (reason.toLowerCase().includes('incorrect')) return 'bg-orange-100 text-orange-800';
    if (reason.toLowerCase().includes('spam')) return 'bg-purple-100 text-purple-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">Content Moderation</h1>
                <p className="mt-2 text-base text-gray-600">Review and manage reported property listings</p>
              </div>
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Reports</p>
                  <p className="mt-2 text-3xl font-bold text-yellow-600">{pending_count}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolved</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">{resolved_count}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{reports.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Status Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filter_criteria.status[0] || 'pending'}
                    onChange={(e) => handleFilterChange('status', [e.target.value])}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                  >
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                    <option value="">All Statuses</option>
                  </select>
                </div>
                
                {/* Reason Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <select
                    value={filter_criteria.reason || ''}
                    onChange={(e) => handleFilterChange('reason', e.target.value || null)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                  >
                    <option value="">All Reasons</option>
                    <option value="Incorrect Information">Incorrect Information</option>
                    <option value="Suspicious Listing">Suspicious Listing</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Spam">Spam</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-end gap-3">
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => refetch()}
                  disabled={reports_loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reports_loading ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Refresh'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {reports_loading && (
              <div className="p-12 text-center">
                <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Loading reports...</p>
              </div>
            )}
            
            {reports_error && (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load reports</h3>
                <p className="text-gray-600 mb-4">An error occurred while loading the reported listings.</p>
                <button
                  onClick={() => refetch()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
                >
                  Retry
                </button>
              </div>
            )}
            
            {!reports_loading && !reports_error && reports.length === 0 && (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Found</h3>
                <p className="text-gray-600">
                  {filter_criteria.status[0] === 'pending' 
                    ? "All clear! No pending reports to review."
                    : "No reports match your current filters."}
                </p>
              </div>
            )}
            
            {!reports_loading && !reports_error && reports.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Property
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Reporter
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Reason
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Reported
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report.report_id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                Property ID: {report.property_id.substring(0, 12)}...
                              </div>
                              <div className="text-xs text-gray-500">
                                Click to view details
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {report.reporter_email || 'Anonymous'}
                          </div>
                          {report.reporter_user_id && (
                            <div className="text-xs text-gray-500">
                              User ID: {report.reporter_user_id.substring(0, 8)}...
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getReasonBadgeColor(report.reason)}`}>
                            {report.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(report.status)}`}>
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(report.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Report Detail Modal */}
        {report_detail_modal.is_open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Report Details</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-8 py-6 space-y-6">
                {/* Report Information */}
                {report_detail_modal.report_data && (
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Information</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Reporter</p>
                        <p className="mt-1 text-sm text-gray-900">
                          {report_detail_modal.report_data.reporter_email || 'Anonymous User'}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-600">Reported On</p>
                        <p className="mt-1 text-sm text-gray-900">
                          {formatDate(report_detail_modal.report_data.created_at)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-600">Reason</p>
                        <p className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getReasonBadgeColor(report_detail_modal.report_data.reason)}`}>
                            {report_detail_modal.report_data.reason}
                          </span>
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        <p className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(report_detail_modal.report_data.status)}`}>
                            {report_detail_modal.report_data.status.charAt(0).toUpperCase() + report_detail_modal.report_data.status.slice(1)}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    {report_detail_modal.report_data.details && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-600">Additional Details</p>
                        <p className="mt-2 text-sm text-gray-900 leading-relaxed bg-white p-4 rounded-lg border border-gray-200">
                          {report_detail_modal.report_data.details}
                        </p>
                      </div>
                    )}
                    
                    {report_detail_modal.report_data.admin_notes && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-600">Admin Notes</p>
                        <p className="mt-2 text-sm text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
                          {report_detail_modal.report_data.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Property Information */}
                {report_detail_modal.loading && (
                  <div className="flex items-center justify-center py-8">
                    <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-3 text-gray-600">Loading property details...</span>
                  </div>
                )}
                
                {report_detail_modal.property_data && (
                  <div className="border-2 border-gray-200 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Reported Property</h3>
                      <Link
                        to={`/property/${report_detail_modal.property_data.property_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
                      >
                        View Listing
                        <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">{report_detail_modal.property_data.title}</h4>
                        <p className="mt-1 text-lg font-semibold text-blue-600">
                          ${Number(report_detail_modal.property_data.price || 0).toLocaleString()}
                          {report_detail_modal.property_data.listing_type === 'rent' && '/month'}
                        </p>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {report_detail_modal.property_data.address_street}, {report_detail_modal.property_data.address_city}, {report_detail_modal.property_data.address_state} {report_detail_modal.property_data.address_zip}
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-700">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          <span className="font-medium">{report_detail_modal.property_data.bedrooms} bd</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                          </svg>
                          <span className="font-medium">{report_detail_modal.property_data.bathrooms} ba</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                          </svg>
                          <span className="font-medium">{Number(report_detail_modal.property_data.square_footage || 0).toLocaleString()} sqft</span>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                          {report_detail_modal.property_data.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resolution Form */}
                {report_detail_modal.report_data?.status === 'pending' && (
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Resolution Action</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                      <textarea
                        value={resolution_form.admin_notes}
                        onChange={(e) => setResolutionForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                        rows={4}
                        placeholder="Enter notes about this report review and any actions taken..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 resize-none"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setResolutionForm(prev => ({ ...prev, action: 'dismiss' }));
                          handleSubmitResolution();
                        }}
                        disabled={resolution_form.submitting}
                        className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resolution_form.submitting && resolution_form.action === 'dismiss' ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Dismissing...
                          </span>
                        ) : (
                          'Dismiss Report'
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          setResolutionForm(prev => ({ ...prev, action: 'resolve' }));
                          handleSubmitResolution();
                        }}
                        disabled={resolution_form.submitting}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resolution_form.submitting && resolution_form.action === 'resolve' ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Resolving...
                          </span>
                        ) : (
                          'Resolve Report'
                        )}
                      </button>
                    </div>
                    
                    <p className="text-xs text-gray-500 text-center">
                      Dismissing marks the report as invalid. Resolving acknowledges the issue is addressed.
                    </p>
                  </div>
                )}
                
                {report_detail_modal.report_data?.status !== 'pending' && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-blue-900">
                          This report has been {report_detail_modal.report_data.status}
                        </p>
                        {report_detail_modal.report_data.resolved_at && (
                          <p className="text-sm text-blue-700 mt-1">
                            Resolved on {formatDate(report_detail_modal.report_data.resolved_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-6">
                <button
                  onClick={handleCloseModal}
                  className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminReportedListings;