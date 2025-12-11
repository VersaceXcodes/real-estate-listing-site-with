import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPES & INTERFACES (matching Zod schemas)
// ============================================================================

interface PropertyInfo {
  title: string;
  address_street: string;
  price: number;
  thumbnail_url: string | null;
}

interface InquiryReply {
  reply_id: string;
  sender_type: 'agent' | 'user';
  message: string;
  created_at: string;
}

interface Inquiry {
  inquiry_id: string;
  property_id: string;
  user_id: string | null;
  inquirer_name: string;
  inquirer_email: string;
  inquirer_phone: string | null;
  message: string;
  viewing_requested: boolean;
  preferred_viewing_date: string | null;
  preferred_viewing_time: string | null;
  status: 'new' | 'responded' | 'scheduled' | 'completed' | 'closed';
  agent_read: boolean;
  agent_read_at: string | null;
  created_at: string;
  updated_at: string;
  property_info: PropertyInfo;
  replies: InquiryReply[];
}

interface InquiriesResponse {
  data: Inquiry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// ============================================================================
// UV_AgentInquiries COMPONENT
// ============================================================================

const UV_AgentInquiries: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Global state - CRITICAL: Individual selectors only
  const agentToken = useAppStore(state => state.authentication_state.agent_auth_token);
  const currentAgent = useAppStore(state => state.authentication_state.current_agent);
  const showToast = useAppStore(state => state.show_toast);
  const decrementUnreadInquiries = useAppStore(state => state.decrement_unread_inquiries);
  
  // Local state variables
  const [filterSettings, setFilterSettings] = useState({
    status: (searchParams.get('status') || '').split(',').filter(Boolean),
    property_id: searchParams.get('property_id') || null,
    viewing_requested: searchParams.get('viewing_requested') === 'true' ? true : null,
    date_from: searchParams.get('date_from') || null,
    date_to: searchParams.get('date_to') || null,
  });
  
  const [inquiryDetailModal, setInquiryDetailModal] = useState<{
    is_open: boolean;
    inquiry_id: string | null;
  }>({
    is_open: false,
    inquiry_id: null,
  });
  
  const [replyForm, setReplyForm] = useState({
    message: '',
    include_signature: true,
    template_selected: null as string | null,
    submitting: false,
    submit_success: false,
    submit_error: null as string | null,
  });
  
  const [selectedInquiryIds, setSelectedInquiryIds] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<'mark_read' | 'archive' | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'replied' | 'archived'>('all');
  
  // API Base URL
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  const { data: inquiriesData, isLoading, error, refetch } = useQuery<InquiriesResponse>({
    queryKey: ['agent-inquiries', filterSettings],
    queryFn: async () => {
      const params: any = {
        limit: 100,
        offset: 0,
        sort_by: 'created_at',
        sort_order: 'desc',
      };
      
      if (filterSettings.status.length > 0) {
        params.status = filterSettings.status;
      }
      if (filterSettings.property_id) {
        params.property_id = filterSettings.property_id;
      }
      if (filterSettings.viewing_requested !== null) {
        params.viewing_requested = filterSettings.viewing_requested;
      }
      if (filterSettings.date_from) {
        params.date_from = filterSettings.date_from;
      }
      if (filterSettings.date_to) {
        params.date_to = filterSettings.date_to;
      }
      
      const response = await axios.get(`${API_BASE}/api/inquiries/agent/my-inquiries`, {
        headers: {
          'Authorization': `Bearer ${agentToken}`,
        },
        params,
      });
      
      return response.data;
    },
    enabled: !!agentToken && !!currentAgent,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  const markAsReadMutation = useMutation({
    mutationFn: async (inquiry_id: string) => {
      await axios.put(
        `${API_BASE}/api/inquiries/${inquiry_id}/mark-read`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${agentToken}`,
          },
        }
      );
    },
    onSuccess: (_, inquiry_id) => {
      // Optimistic update
      queryClient.setQueryData<InquiriesResponse>(
        ['agent-inquiries', filterSettings],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map(inquiry =>
              inquiry.inquiry_id === inquiry_id
                ? { ...inquiry, agent_read: true, agent_read_at: new Date().toISOString() }
                : inquiry
            ),
          };
        }
      );
      
      decrementUnreadInquiries();
    },
  });
  
  const submitReplyMutation = useMutation({
    mutationFn: async ({ inquiry_id, message, include_signature }: {
      inquiry_id: string;
      message: string;
      include_signature: boolean;
    }) => {
      const response = await axios.post(
        `${API_BASE}/api/inquiries/${inquiry_id}/reply`,
        { message, include_signature },
        {
          headers: {
            'Authorization': `Bearer ${agentToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onMutate: () => {
      setReplyForm(prev => ({ ...prev, submitting: true, submit_error: null }));
    },
    onSuccess: (response, variables) => {
      // Update inquiry with new reply
      queryClient.setQueryData<InquiriesResponse>(
        ['agent-inquiries', filterSettings],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map(inquiry =>
              inquiry.inquiry_id === variables.inquiry_id
                ? {
                    ...inquiry,
                    status: 'responded' as const,
                    replies: [...inquiry.replies, {
                      reply_id: response.reply_id,
                      sender_type: 'agent' as const,
                      message: response.message,
                      created_at: response.created_at,
                    }],
                  }
                : inquiry
            ),
          };
        }
      );
      
      setReplyForm({
        message: '',
        include_signature: true,
        template_selected: null,
        submitting: false,
        submit_success: true,
        submit_error: null,
      });
      
      showToast('Reply sent successfully', 'success');
      
      // Auto-clear success state after 3 seconds
      setTimeout(() => {
        setReplyForm(prev => ({ ...prev, submit_success: false }));
      }, 3000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to send reply';
      setReplyForm(prev => ({
        ...prev,
        submitting: false,
        submit_error: errorMessage,
      }));
      showToast(errorMessage, 'error');
    },
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: async ({ inquiry_id, status }: {
      inquiry_id: string;
      status: string;
    }) => {
      await axios.put(
        `${API_BASE}/api/inquiries/${inquiry_id}/status`,
        { status },
        {
          headers: {
            'Authorization': `Bearer ${agentToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData<InquiriesResponse>(
        ['agent-inquiries', filterSettings],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map(inquiry =>
              inquiry.inquiry_id === variables.inquiry_id
                ? { ...inquiry, status: variables.status as any, updated_at: new Date().toISOString() }
                : inquiry
            ),
          };
        }
      );
      
      showToast('Inquiry status updated', 'success');
    },
  });
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleFilterChange = (filterName: string, value: any) => {
    const newFilters = { ...filterSettings, [filterName]: value };
    setFilterSettings(newFilters);
    
    // Update URL
    const params: any = {};
    if (newFilters.status.length > 0) params.status = newFilters.status.join(',');
    if (newFilters.property_id) params.property_id = newFilters.property_id;
    if (newFilters.viewing_requested !== null) params.viewing_requested = String(newFilters.viewing_requested);
    if (newFilters.date_from) params.date_from = newFilters.date_from;
    if (newFilters.date_to) params.date_to = newFilters.date_to;
    
    setSearchParams(params);
  };
  
  const handleStatusFilterChange = (status: string) => {
    const newStatusArray = filterSettings.status.includes(status)
      ? filterSettings.status.filter(s => s !== status)
      : [...filterSettings.status, status];
    
    handleFilterChange('status', newStatusArray);
  };
  
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    
    // Map tabs to status filters
    const statusMap: Record<typeof activeTab, string[]> = {
      'all': [],
      'new': ['new'],
      'replied': ['responded'],
      'archived': ['closed'],
    };
    
    handleFilterChange('status', statusMap[tab]);
  };
  
  const handleOpenInquiryDetail = (inquiry_id: string, inquiry: Inquiry) => {
    setInquiryDetailModal({ is_open: true, inquiry_id });
    
    // Mark as read if unread
    if (!inquiry.agent_read) {
      markAsReadMutation.mutate(inquiry_id);
    }
  };
  
  const handleCloseInquiryDetail = () => {
    setInquiryDetailModal({ is_open: false, inquiry_id: null });
    setReplyForm({
      message: '',
      include_signature: true,
      template_selected: null,
      submitting: false,
      submit_success: false,
      submit_error: null,
    });
  };
  
  const handleSubmitReply = () => {
    if (!inquiryDetailModal.inquiry_id || !replyForm.message.trim()) {
      setReplyForm(prev => ({ ...prev, submit_error: 'Please enter a message' }));
      return;
    }
    
    submitReplyMutation.mutate({
      inquiry_id: inquiryDetailModal.inquiry_id,
      message: replyForm.message,
      include_signature: replyForm.include_signature,
    });
  };
  
  const handleApplyTemplate = (template: string) => {
    const templates: Record<string, string> = {
      'thank_you': 'Thank you for your interest in this property. It is still available, and I would be happy to show it to you.',
      'schedule_viewing': 'I would be happy to schedule a viewing. What days and times work best for you?',
      'price_negotiation': 'Thank you for your inquiry. I would be happy to discuss the price and terms with you.',
    };
    
    setReplyForm(prev => ({
      ...prev,
      message: templates[template] || '',
      template_selected: template,
    }));
  };
  
  const handleSelectAll = () => {
    if (!inquiriesData) return;
    
    if (selectedInquiryIds.length === inquiriesData.data.length) {
      setSelectedInquiryIds([]);
    } else {
      setSelectedInquiryIds(inquiriesData.data.map(i => i.inquiry_id));
    }
  };
  
  const handleBulkMarkAsRead = async () => {
    if (selectedInquiryIds.length === 0) return;
    
    setBulkActionType('mark_read');
    
    for (const inquiry_id of selectedInquiryIds) {
      await markAsReadMutation.mutateAsync(inquiry_id);
    }
    
    setSelectedInquiryIds([]);
    setBulkActionType(null);
    showToast(`${selectedInquiryIds.length} inquiries marked as read`, 'success');
  };
  
  const handleClearFilters = () => {
    setFilterSettings({
      status: [],
      property_id: null,
      viewing_requested: null,
      date_from: null,
      date_to: null,
    });
    setSearchParams({});
  };
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const inquiries = inquiriesData?.data || [];
  const totalCount = inquiriesData?.pagination.total || 0;
  
  const unreadCount = inquiries.filter(i => !i.agent_read).length;
  const viewingRequestsCount = inquiries.filter(i => i.viewing_requested).length;
  
  const selectedInquiry = inquiryDetailModal.inquiry_id
    ? inquiries.find(i => i.inquiry_id === inquiryDetailModal.inquiry_id)
    : null;
  
  const hasActiveFilters = filterSettings.status.length > 0 ||
    filterSettings.property_id !== null ||
    filterSettings.viewing_requested !== null ||
    filterSettings.date_from !== null ||
    filterSettings.date_to !== null;
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'new': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'responded': 'bg-green-100 text-green-800 border-green-200',
      'scheduled': 'bg-blue-100 text-blue-800 border-blue-200',
      'completed': 'bg-gray-100 text-gray-800 border-gray-200',
      'closed': 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'new': 'New',
      'responded': 'Replied',
      'scheduled': 'Scheduled',
      'completed': 'Completed',
      'closed': 'Archived',
    };
    return labels[status] || status;
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage and respond to property inquiries
                </p>
              </div>
              
              {unreadCount > 0 && (
                <div className="bg-yellow-100 border border-yellow-200 rounded-lg px-4 py-2">
                  <span className="text-yellow-800 font-semibold">
                    {unreadCount} Unread
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Tabs */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {(['all', 'new', 'replied', 'archived'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors capitalize`}
                  >
                    {tab}
                    {tab === 'new' && unreadCount > 0 && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Secondary Filters */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Viewing Requests Filter */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filterSettings.viewing_requested === true}
                    onChange={(e) => handleFilterChange('viewing_requested', e.target.checked || null)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Viewing Requests Only</span>
                  {viewingRequestsCount > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                      {viewingRequestsCount}
                    </span>
                  )}
                </label>
                
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
                
                {/* Results count */}
                <div className="ml-auto text-sm text-gray-600">
                  {totalCount} {totalCount === 1 ? 'inquiry' : 'inquiries'}
                </div>
              </div>
            </div>
            
            {/* Bulk Actions */}
            {selectedInquiryIds.length > 0 && (
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedInquiryIds.length} selected
                </span>
                <div className="flex space-x-3">
                  <button
                    onClick={handleBulkMarkAsRead}
                    disabled={bulkActionType !== null}
                    className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    Mark as Read
                  </button>
                  <button
                    onClick={() => setSelectedInquiryIds([])}
                    className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Inquiries List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Inquiries</h3>
              <p className="text-gray-600 mb-4">Unable to fetch your inquiries. Please try again.</p>
              <button
                onClick={() => refetch()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Retry
              </button>
            </div>
          ) : inquiries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Inquiries Yet</h3>
              <p className="text-gray-600 mb-6">
                {hasActiveFilters
                  ? 'No inquiries match your filters. Try adjusting your search criteria.'
                  : 'When people contact you about your listings, their inquiries will appear here.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              {inquiries.length > 0 && (
                <div className="bg-white rounded-lg px-6 py-3 shadow border border-gray-200 flex items-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedInquiryIds.length === inquiries.length && inquiries.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Select All</span>
                  </label>
                </div>
              )}
              
              {/* Inquiry Cards */}
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.inquiry_id}
                  className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-200 hover:shadow-xl ${
                    !inquiry.agent_read
                      ? 'border-blue-300 bg-blue-50/30'
                      : selectedInquiryIds.includes(inquiry.inquiry_id)
                      ? 'border-blue-500'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Checkbox */}
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={selectedInquiryIds.includes(inquiry.inquiry_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInquiryIds([...selectedInquiryIds, inquiry.inquiry_id]);
                            } else {
                              setSelectedInquiryIds(selectedInquiryIds.filter(id => id !== inquiry.inquiry_id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      {/* Unread Indicator */}
                      {!inquiry.agent_read && (
                        <div className="pt-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                      
                      {/* Property Thumbnail */}
                      {inquiry.property_info.thumbnail_url && (
                        <img
                          src={inquiry.property_info.thumbnail_url}
                          alt={inquiry.property_info.title}
                          className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                        />
                      )}
                      
                      {/* Inquiry Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {inquiry.inquirer_name}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(inquiry.status)}`}>
                                {getStatusLabel(inquiry.status)}
                              </span>
                              {inquiry.viewing_requested && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 border border-orange-200 text-xs font-semibold rounded-full">
                                  Viewing Requested
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {inquiry.inquirer_email}
                              {inquiry.inquirer_phone && ` • ${inquiry.inquirer_phone}`}
                            </p>
                          </div>
                          
                          <div className="text-right text-sm text-gray-500">
                            {formatDate(inquiry.created_at)}
                          </div>
                        </div>
                        
                        {/* Property Info */}
                        <Link
                          to={`/property/${inquiry.property_id}`}
                          className="block mb-2 hover:underline"
                        >
                          <p className="text-sm font-medium text-blue-600">
                            {inquiry.property_info.address_street}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatPrice(inquiry.property_info.price)}
                          </p>
                        </Link>
                        
                        {/* Message Preview */}
                        <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                          {inquiry.message}
                        </p>
                        
                        {/* Viewing Details */}
                        {inquiry.viewing_requested && inquiry.preferred_viewing_date && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-3">
                            <p className="text-sm text-orange-900">
                              <span className="font-semibold">Preferred Viewing:</span>{' '}
                              {new Date(inquiry.preferred_viewing_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                              })}
                              {inquiry.preferred_viewing_time && ` at ${inquiry.preferred_viewing_time}`}
                            </p>
                          </div>
                        )}
                        
                        {/* Reply Count */}
                        {inquiry.replies.length > 0 && (
                          <p className="text-sm text-gray-500 mb-3">
                            {inquiry.replies.length} {inquiry.replies.length === 1 ? 'reply' : 'replies'}
                          </p>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleOpenInquiryDetail(inquiry.inquiry_id, inquiry)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                          >
                            View & Reply
                          </button>
                          
                          <a
                            href={`mailto:${inquiry.inquirer_email}`}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors border border-gray-300"
                          >
                            Email Direct
                          </a>
                          
                          {inquiry.inquirer_phone && (
                            <a
                              href={`tel:${inquiry.inquirer_phone}`}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors border border-gray-300"
                            >
                              Call
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Inquiry Detail Modal */}
        {inquiryDetailModal.is_open && selectedInquiry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Inquiry Details</h2>
                <button
                  onClick={handleCloseInquiryDetail}
                  className="text-white hover:text-gray-200 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                <div className="p-6 space-y-6">
                  {/* Property Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center space-x-4">
                      {selectedInquiry.property_info.thumbnail_url && (
                        <img
                          src={selectedInquiry.property_info.thumbnail_url}
                          alt={selectedInquiry.property_info.title}
                          className="w-24 h-24 rounded-lg object-cover border-2 border-white shadow-md"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {selectedInquiry.property_info.address_street}
                        </h3>
                        <p className="text-blue-600 font-bold text-xl mt-1">
                          {formatPrice(selectedInquiry.property_info.price)}
                        </p>
                        <Link
                          to={`/property/${selectedInquiry.property_id}`}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
                        >
                          View Listing →
                        </Link>
                      </div>
                    </div>
                  </div>
                  
                  {/* Inquirer Information */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-3 text-lg">Contact Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium text-gray-900">{selectedInquiry.inquirer_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <a href={`mailto:${selectedInquiry.inquirer_email}`} className="font-medium text-blue-600 hover:text-blue-700">
                          {selectedInquiry.inquirer_email}
                        </a>
                      </div>
                      {selectedInquiry.inquirer_phone && (
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <a href={`tel:${selectedInquiry.inquirer_phone}`} className="font-medium text-blue-600 hover:text-blue-700">
                            {selectedInquiry.inquirer_phone}
                          </a>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Received</p>
                        <p className="font-medium text-gray-900">{formatDate(selectedInquiry.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Original Message */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 text-lg">Original Message</h4>
                    <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {selectedInquiry.message}
                      </p>
                    </div>
                  </div>
                  
                  {/* Viewing Request Details */}
                  {selectedInquiry.viewing_requested && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                      <h4 className="font-semibold text-orange-900 mb-2 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Viewing Request
                      </h4>
                      {selectedInquiry.preferred_viewing_date && (
                        <p className="text-orange-900">
                          <span className="font-medium">Preferred Date:</span>{' '}
                          {new Date(selectedInquiry.preferred_viewing_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                      {selectedInquiry.preferred_viewing_time && (
                        <p className="text-orange-900 mt-1">
                          <span className="font-medium">Preferred Time:</span> {selectedInquiry.preferred_viewing_time}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Conversation Thread */}
                  {selectedInquiry.replies.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 text-lg">Conversation</h4>
                      <div className="space-y-4">
                        {selectedInquiry.replies.map((reply) => (
                          <div
                            key={reply.reply_id}
                            className={`rounded-xl p-4 ${
                              reply.sender_type === 'agent'
                                ? 'bg-blue-50 border-2 border-blue-200 ml-8'
                                : 'bg-gray-50 border-2 border-gray-200 mr-8'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {reply.sender_type === 'agent' ? 'You' : selectedInquiry.inquirer_name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(reply.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                              {reply.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Reply Form */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 text-lg">
                      {replyForm.submit_success ? 'Reply Sent!' : 'Send Reply'}
                    </h4>
                    
                    {replyForm.submit_success ? (
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                        <div className="text-green-600 mb-3">
                          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-green-900 mb-2">Reply Sent Successfully!</h3>
                        <p className="text-green-700 mb-4">
                          Your reply has been sent to {selectedInquiry.inquirer_name}.
                        </p>
                        <button
                          onClick={() => setReplyForm(prev => ({ ...prev, submit_success: false, message: '' }))}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Send Another Reply
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Template Selector */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quick Templates
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('thank_you')}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors border border-gray-300"
                            >
                              Thank You
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('schedule_viewing')}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors border border-gray-300"
                            >
                              Schedule Viewing
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('price_negotiation')}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors border border-gray-300"
                            >
                              Discuss Terms
                            </button>
                          </div>
                        </div>
                        
                        {/* Message Textarea */}
                        <div className="mb-4">
                          <label htmlFor="reply-message" className="block text-sm font-medium text-gray-700 mb-2">
                            Your Reply
                          </label>
                          <textarea
                            id="reply-message"
                            rows={6}
                            value={replyForm.message}
                            onChange={(e) => {
                              setReplyForm(prev => ({ ...prev, message: e.target.value, submit_error: null }));
                            }}
                            placeholder="Type your reply here..."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {replyForm.message.length} / 5000 characters
                          </p>
                        </div>
                        
                        {/* Signature Checkbox */}
                        <div className="mb-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={replyForm.include_signature}
                              onChange={(e) => setReplyForm(prev => ({ ...prev, include_signature: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Include my email signature</span>
                          </label>
                        </div>
                        
                        {/* Error Message */}
                        {replyForm.submit_error && (
                          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            <p className="text-sm text-red-700">{replyForm.submit_error}</p>
                          </div>
                        )}
                        
                        {/* Submit Button */}
                        <button
                          onClick={handleSubmitReply}
                          disabled={replyForm.submitting || !replyForm.message.trim()}
                          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                          {replyForm.submitting ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending Reply...
                            </span>
                          ) : (
                            'Send Reply'
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AgentInquiries;