import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPES & INTERFACES (matching agentSchema)
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
  specializations: string[] | null;
  service_areas: string[] | null;
  languages_spoken: string[] | null;
  social_media_links: Record<string, string> | null;
  certifications: string[] | null;
  approved: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  account_status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

interface ApprovalResponse {
  success: boolean;
  agent?: Agent;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminAgentApprovals: React.FC = () => {
  // ========== URL PARAMS ==========
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get('status') || 'pending';
  
  // ========== GLOBAL STATE ACCESS (CRITICAL: Individual selectors) ==========
  const adminToken = useAppStore(state => state.authentication_state.admin_auth_token);
  const currentAdmin = useAppStore(state => state.authentication_state.current_admin);
  const isAdminAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_admin_authenticated);
  const showToast = useAppStore(state => state.show_toast);
  
  // ========== LOCAL STATE ==========
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected'>(
    urlStatus as 'pending' | 'approved' | 'rejected'
  );

  const [approvalModal, setApprovalModal] = useState({
    is_open: false,
    agent_id: null as string | null,
    action: null as 'approve' | 'reject' | null,
    welcome_message: '',
    rejection_reason: '',
    submitting: false
  });
  const [documentViewer, setDocumentViewer] = useState({
    is_open: false,
    document_url: null as string | null
  });
  
  // ========== REACT QUERY ==========
  const queryClient = useQueryClient();
  
  // Load agents query
  const {
    data: agentsData,
    isLoading: agentsLoading,
    error: agentsError,
    refetch: refetchAgents
  } = useQuery({
    queryKey: ['admin', 'agents', filterStatus],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/agents/pending`,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          },
          params: {
            approval_status: filterStatus,
            limit: 100,
            offset: 0
          }
        }
      );
      return response.data.data as Agent[];
    },
    enabled: !!adminToken && isAdminAuthenticated,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });
  
  // Approve agent mutation
  const approveMutation = useMutation({
    mutationFn: async ({ agent_id, welcome_message }: { agent_id: string; welcome_message: string }) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/agents/${agent_id}/approve`,
        { welcome_message: welcome_message || undefined },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          }
        }
      );
      return response.data as ApprovalResponse;
    },
    onSuccess: () => {
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
      
      // Close modal
      setApprovalModal({
        is_open: false,
        agent_id: null,
        action: null,
        welcome_message: '',
        rejection_reason: '',
        submitting: false
      });
      
      // Show success toast
      showToast('Agent approved successfully. Welcome email sent.', 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to approve agent';
      showToast(errorMessage, 'error');
      
      setApprovalModal(prev => ({ ...prev, submitting: false }));
    }
  });
  
  // Reject agent mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ agent_id, rejection_reason }: { agent_id: string; rejection_reason: string }) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/agents/${agent_id}/reject`,
        { 
          rejection_reason,
          message: null
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          }
        }
      );
      return response.data as ApprovalResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
      
      setApprovalModal({
        is_open: false,
        agent_id: null,
        action: null,
        welcome_message: '',
        rejection_reason: '',
        submitting: false
      });
      
      showToast('Agent application rejected. Notification email sent.', 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to reject agent';
      showToast(errorMessage, 'error');
      
      setApprovalModal(prev => ({ ...prev, submitting: false }));
    }
  });
  
  // ========== HANDLERS ==========
  
  const handleFilterChange = (status: 'pending' | 'approved' | 'rejected') => {
    setFilterStatus(status);
    setSearchParams({ status });
  };
  
  const handleViewLicenseDocument = (documentUrl: string) => {
    setDocumentViewer({
      is_open: true,
      document_url: documentUrl
    });
  };
  
  const handleOpenApprovalModal = (agentId: string, action: 'approve' | 'reject') => {
    setApprovalModal({
      is_open: true,
      agent_id: agentId,
      action,
      welcome_message: '',
      rejection_reason: '',
      submitting: false
    });
  };
  
  const handleCloseApprovalModal = () => {
    setApprovalModal({
      is_open: false,
      agent_id: null,
      action: null,
      welcome_message: '',
      rejection_reason: '',
      submitting: false
    });
  };
  
  const handleConfirmApproval = async () => {
    if (!approvalModal.agent_id) return;
    
    setApprovalModal(prev => ({ ...prev, submitting: true }));
    
    if (approvalModal.action === 'approve') {
      await approveMutation.mutateAsync({
        agent_id: approvalModal.agent_id,
        welcome_message: approvalModal.welcome_message
      });
    } else if (approvalModal.action === 'reject') {
      if (!approvalModal.rejection_reason.trim()) {
        showToast('Please provide a rejection reason', 'error');
        setApprovalModal(prev => ({ ...prev, submitting: false }));
        return;
      }
      
      await rejectMutation.mutateAsync({
        agent_id: approvalModal.agent_id,
        rejection_reason: approvalModal.rejection_reason
      });
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // ========== REDIRECT IF NOT AUTHENTICATED ==========
  useEffect(() => {
    if (!isAdminAuthenticated) {
      window.location.href = '/admin/login';
    }
  }, [isAdminAuthenticated]);
  
  // ========== RENDER ==========
  
  if (!isAdminAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying authentication...</p>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link to="/admin/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Agent Approvals</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Admin: {currentAdmin?.full_name}
                </span>
                <Link
                  to="/admin/dashboard"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Filter by Status</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {agentsData?.length || 0} agent{agentsData?.length !== 1 ? 's' : ''} found
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <select
                  value={filterStatus}
                  onChange={(e) => handleFilterChange(e.target.value as 'pending' | 'approved' | 'rejected')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700 bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                
                <button
                  onClick={() => refetchAgents()}
                  disabled={agentsLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className={`w-4 h-4 ${agentsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Error State */}
          {agentsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error Loading Agents</h3>
                  <p className="text-sm text-red-700 mt-1">
                    {(agentsError as any)?.response?.data?.error?.message || 'Failed to load agents. Please try again.'}
                  </p>
                  <button
                    onClick={() => refetchAgents()}
                    className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {agentsLoading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading agents...</p>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!agentsLoading && !agentsError && (!agentsData || agentsData.length === 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No {filterStatus === 'pending' ? 'Pending' : filterStatus === 'approved' ? 'Approved' : 'Rejected'} Agents
                </h3>
                <p className="text-gray-600 mb-6">
                  {filterStatus === 'pending' 
                    ? "You're all caught up! No agents awaiting approval."
                    : `No ${filterStatus} agents found.`}
                </p>
                {filterStatus !== 'pending' && (
                  <button
                    onClick={() => handleFilterChange('pending')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Pending Agents
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Agents Table */}
          {!agentsLoading && !agentsError && agentsData && agentsData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Agent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        License
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Agency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Applied
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Documentation
                      </th>
                      {filterStatus === 'pending' && (
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {agentsData.map((agent) => (
                      <tr key={agent.agent_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {agent.profile_photo_url ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={agent.profile_photo_url}
                                  alt={agent.full_name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    {agent.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {agent.full_name}
                              </div>
                              {agent.professional_title && (
                                <div className="text-sm text-gray-500">
                                  {agent.professional_title}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{agent.email}</div>
                          <div className="text-sm text-gray-500">{agent.phone_number}</div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {agent.license_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {agent.license_state}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {agent.agency_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {agent.office_address_city}, {agent.office_address_state}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(agent.created_at)}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {agent.license_document_url ? (
                            <button
                              onClick={() => handleViewLicenseDocument(agent.license_document_url!)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View License
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">No document</span>
                          )}
                        </td>
                        
                        {filterStatus === 'pending' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleOpenApprovalModal(agent.agent_id, 'approve')}
                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenApprovalModal(agent.agent_id, 'reject')}
                                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Reject
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
        
        {/* License Document Viewer Modal */}
        {documentViewer.is_open && documentViewer.document_url && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={() => setDocumentViewer({ is_open: false, document_url: null })}
              ></div>
              
              {/* Modal */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">License Documentation</h3>
                  <button
                    onClick={() => setDocumentViewer({ is_open: false, document_url: null })}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Document Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                  {documentViewer.document_url.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={documentViewer.document_url}
                      className="w-full h-[600px] border border-gray-200 rounded-lg"
                      title="License Document"
                    />
                  ) : (
                    <img
                      src={documentViewer.document_url}
                      alt="License Document"
                      className="w-full h-auto rounded-lg border border-gray-200"
                    />
                  )}
                </div>
                
                {/* Footer */}
                <div className="flex justify-end p-6 border-t border-gray-200">
                  <button
                    onClick={() => setDocumentViewer({ is_open: false, document_url: null })}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Approval/Rejection Modal */}
        {approvalModal.is_open && approvalModal.agent_id && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={!approvalModal.submitting ? handleCloseApprovalModal : undefined}
              ></div>
              
              {/* Modal */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {approvalModal.action === 'approve' ? 'Approve Agent Application' : 'Reject Agent Application'}
                  </h3>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  {approvalModal.action === 'approve' ? (
                    <>
                      <p className="text-gray-600 mb-4">
                        Are you sure you want to approve this agent? They will receive a welcome email and gain access to the agent dashboard.
                      </p>
                      
                      <div className="mb-4">
                        <label htmlFor="welcome_message" className="block text-sm font-medium text-gray-700 mb-2">
                          Welcome Message (Optional)
                        </label>
                        <textarea
                          id="welcome_message"
                          value={approvalModal.welcome_message}
                          onChange={(e) => setApprovalModal(prev => ({ ...prev, welcome_message: e.target.value }))}
                          placeholder="Add a personalized welcome message..."
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This message will be included in the approval email
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-4">
                        Please provide a reason for rejecting this application. The agent will receive an email with your explanation.
                      </p>
                      
                      <div className="mb-4">
                        <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700 mb-2">
                          Rejection Reason <span className="text-red-600">*</span>
                        </label>
                        <select
                          id="rejection_reason"
                          value={approvalModal.rejection_reason}
                          onChange={(e) => setApprovalModal(prev => ({ ...prev, rejection_reason: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select reason...</option>
                          <option value="Invalid license">Invalid license</option>
                          <option value="Unable to verify credentials">Unable to verify credentials</option>
                          <option value="Incomplete application">Incomplete application</option>
                          <option value="Duplicate account">Duplicate account</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Footer */}
                <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                  <button
                    onClick={handleCloseApprovalModal}
                    disabled={approvalModal.submitting}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmApproval}
                    disabled={approvalModal.submitting || (approvalModal.action === 'reject' && !approvalModal.rejection_reason.trim())}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      approvalModal.action === 'approve'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {approvalModal.submitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      approvalModal.action === 'approve' ? 'Approve Agent' : 'Reject Application'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminAgentApprovals;