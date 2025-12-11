import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Mail, Phone, Home, Calendar, Clock, MessageSquare, X, ChevronRight, AlertCircle, Inbox } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES (matching Zod schemas)
// ============================================================================

interface Inquiry {
  inquiry_id: string;
  property_id: string;
  agent_id: string;
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
  // Joined data from backend
  property_info?: {
    title: string;
    address_street: string;
    address_city: string;
    address_state: string;
    price: number;
    primary_photo: {
      image_url: string;
      thumbnail_url: string | null;
    } | null;
  };
  agent_info?: {
    full_name: string;
    phone_number: string;
    email: string;
    profile_photo_url: string | null;
  };
  replies?: InquiryReply[];
}

interface InquiryReply {
  reply_id: string;
  inquiry_id: string;
  sender_type: 'agent' | 'user';
  sender_id: string;
  message: string;
  include_signature: boolean;
  created_at: string;
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
// API FUNCTIONS
// ============================================================================

const fetchUserInquiries = async (
  token: string,
  statusFilter: string[] | null,
  propertyFilter: string | null
): Promise<InquiriesResponse> => {
  const params: any = {
    limit: 100,
    offset: 0,
    sort_by: 'created_at',
    sort_order: 'desc'
  };
  
  if (statusFilter && statusFilter.length > 0) {
    params.status = statusFilter.join(',');
  }
  
  if (propertyFilter) {
    params.property_id = propertyFilter;
  }
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inquiries/my-inquiries`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params
    }
  );
  
  return response.data;
};

const fetchInquiryDetail = async (
  token: string,
  inquiryId: string
): Promise<{ inquiry: Inquiry; replies: InquiryReply[] }> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inquiries/${inquiryId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_UserInquiries: React.FC = () => {
  // ========== ZUSTAND STORE ACCESS (Individual Selectors) ==========
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.user_auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  
  // ========== URL PARAMETERS ==========
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ========== LOCAL STATE ==========
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string | null>(
    searchParams.get('property_id') || null
  );
  
  const [filterStatus, setFilterStatus] = useState<string[] | null>(() => {
    const statusParam = searchParams.get('status');
    return statusParam ? statusParam.split(',') : null;
  });
  
  const [inquiryDetailModal, setInquiryDetailModal] = useState<{
    is_open: boolean;
    inquiry_id: string | null;
    loading: boolean;
  }>({
    is_open: false,
    inquiry_id: null,
    loading: false
  });
  
  // ========== REACT QUERY - FETCH INQUIRIES ==========
  const {
    data: inquiriesData,
    isLoading: inquiriesLoading,
    error: inquiriesError,
    refetch: refetchInquiries
  } = useQuery({
    queryKey: ['user-inquiries', filterStatus, selectedPropertyFilter],
    queryFn: () => fetchUserInquiries(authToken!, filterStatus, selectedPropertyFilter),
    enabled: !!authToken && isAuthenticated,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });
  
  // ========== REACT QUERY - FETCH INQUIRY DETAIL ==========
  const {
    data: inquiryDetailData,
    isLoading: detailLoading
  } = useQuery({
    queryKey: ['inquiry-detail', inquiryDetailModal.inquiry_id],
    queryFn: () => fetchInquiryDetail(authToken!, inquiryDetailModal.inquiry_id!),
    enabled: !!authToken && !!inquiryDetailModal.inquiry_id && inquiryDetailModal.is_open,
    staleTime: 10000
  });
  
  // ========== DERIVED STATE ==========
  const inquiries = inquiriesData?.data || [];
  const totalCount = inquiriesData?.pagination.total || 0;
  
  // Group inquiries by status for filtering
  const inquiriesByStatus = useMemo(() => {
    return {
      all: inquiries,
      waiting: inquiries.filter(i => i.status === 'new'),
      replied: inquiries.filter(i => i.status === 'responded' || i.status === 'scheduled' || i.status === 'completed'),
      archived: inquiries.filter(i => i.status === 'closed')
    };
  }, [inquiries]);
  
  // Get unique properties from inquiries for filter dropdown
  const uniqueProperties = useMemo(() => {
    const propertyMap = new Map();
    inquiries.forEach(inquiry => {
      if (inquiry.property_info && !propertyMap.has(inquiry.property_id)) {
        propertyMap.set(inquiry.property_id, {
          property_id: inquiry.property_id,
          title: inquiry.property_info.title,
          address: `${inquiry.property_info.address_street}, ${inquiry.property_info.address_city}`
        });
      }
    });
    return Array.from(propertyMap.values());
  }, [inquiries]);
  
  // ========== HANDLERS ==========
  const handleStatusFilterChange = (status: string[] | null) => {
    setFilterStatus(status);
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (status && status.length > 0) {
      newParams.set('status', status.join(','));
    } else {
      newParams.delete('status');
    }
    setSearchParams(newParams);
  };
  
  const handlePropertyFilterChange = (propertyId: string | null) => {
    setSelectedPropertyFilter(propertyId);
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (propertyId) {
      newParams.set('property_id', propertyId);
    } else {
      newParams.delete('property_id');
    }
    setSearchParams(newParams);
  };
  
  const openInquiryDetail = (inquiryId: string) => {
    setInquiryDetailModal({
      is_open: true,
      inquiry_id: inquiryId,
      loading: true
    });
  };
  
  const closeInquiryDetail = () => {
    setInquiryDetailModal({
      is_open: false,
      inquiry_id: null,
      loading: false
    });
  };
  
  // ========== UTILITY FUNCTIONS ==========
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'responded':
      case 'scheduled':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return 'Waiting for Reply';
      case 'responded':
        return 'Replied';
      case 'scheduled':
        return 'Viewing Scheduled';
      case 'completed':
        return 'Completed';
      case 'closed':
        return 'Archived';
      default:
        return status;
    }
  };
  
  // ========== FILTERED INQUIRIES DISPLAY ==========
  const displayedInquiries = useMemo(() => {
    let filtered = inquiries;
    
    if (filterStatus && filterStatus.length > 0) {
      filtered = filtered.filter(inquiry => filterStatus.includes(inquiry.status));
    }
    
    if (selectedPropertyFilter) {
      filtered = filtered.filter(inquiry => inquiry.property_id === selectedPropertyFilter);
    }
    
    return filtered;
  }, [inquiries, filterStatus, selectedPropertyFilter]);
  
  // ========== RENDER ==========
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">My Inquiries</h1>
                <p className="mt-2 text-base text-gray-600">
                  {totalCount} {totalCount === 1 ? 'inquiry' : 'inquiries'} sent
                </p>
              </div>
              
              {/* Property Filter Dropdown */}
              {uniqueProperties.length > 1 && (
                <div className="mt-4 sm:mt-0">
                  <select
                    value={selectedPropertyFilter || ''}
                    onChange={(e) => handlePropertyFilterChange(e.target.value || null)}
                    className="block w-full sm:w-64 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  >
                    <option value="">All Properties</option>
                    {uniqueProperties.map(prop => (
                      <option key={prop.property_id} value={prop.property_id}>
                        {prop.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Tabs */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            <div className="flex flex-wrap border-b border-gray-200">
              <button
                onClick={() => handleStatusFilterChange(null)}
                className={`px-6 py-4 font-medium transition-all ${
                  !filterStatus || filterStatus.length === 0
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                All ({inquiriesByStatus.all.length})
              </button>
              
              <button
                onClick={() => handleStatusFilterChange(['new'])}
                className={`px-6 py-4 font-medium transition-all ${
                  filterStatus?.includes('new')
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Waiting for Reply ({inquiriesByStatus.waiting.length})
              </button>
              
              <button
                onClick={() => handleStatusFilterChange(['responded', 'scheduled', 'completed'])}
                className={`px-6 py-4 font-medium transition-all ${
                  filterStatus?.some(s => ['responded', 'scheduled', 'completed'].includes(s))
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Replied ({inquiriesByStatus.replied.length})
              </button>
              
              <button
                onClick={() => handleStatusFilterChange(['closed'])}
                className={`px-6 py-4 font-medium transition-all ${
                  filterStatus?.includes('closed')
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Archived ({inquiriesByStatus.archived.length})
              </button>
            </div>
          </div>
          
          {/* Loading State */}
          {inquiriesLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
                  <div className="flex space-x-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Error State */}
          {inquiriesError && (
            <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Inquiries</h3>
              <p className="text-gray-600 mb-4">
                {inquiriesError instanceof Error ? inquiriesError.message : 'An error occurred'}
              </p>
              <button
                onClick={() => refetchInquiries()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
              >
                Try Again
              </button>
            </div>
          )}
          
          {/* Empty State */}
          {!inquiriesLoading && !inquiriesError && displayedInquiries.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="max-w-md mx-auto">
                <Inbox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {filterStatus || selectedPropertyFilter ? 'No Inquiries Match Your Filters' : 'No Inquiries Yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {filterStatus || selectedPropertyFilter
                    ? 'Try adjusting your filters to see more inquiries.'
                    : 'When you contact agents about properties, your inquiries will appear here.'}
                </p>
                {!filterStatus && !selectedPropertyFilter && (
                  <Link
                    to="/search"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Browse Properties
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Link>
                )}
                {(filterStatus || selectedPropertyFilter) && (
                  <button
                    onClick={() => {
                      handleStatusFilterChange(null);
                      handlePropertyFilterChange(null);
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-all"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Inquiries List */}
          {!inquiriesLoading && !inquiriesError && displayedInquiries.length > 0 && (
            <div className="space-y-4">
              {displayedInquiries.map(inquiry => (
                <div
                  key={inquiry.inquiry_id}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer"
                  onClick={() => openInquiryDetail(inquiry.inquiry_id)}
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                      {/* Property Thumbnail */}
                      {inquiry.property_info?.primary_photo && (
                        <div className="flex-shrink-0">
                          <img
                            src={inquiry.property_info.primary_photo.thumbnail_url || inquiry.property_info.primary_photo.image_url}
                            alt={inquiry.property_info.title}
                            className="w-full lg:w-32 h-32 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      
                      {/* Inquiry Details */}
                      <div className="flex-1 min-w-0">
                        {/* Property Info */}
                        <div className="mb-3">
                          <Link
                            to={`/property/${inquiry.property_id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {inquiry.property_info?.title || 'Property'}
                          </Link>
                          <p className="text-sm text-gray-600 mt-1">
                            {inquiry.property_info?.address_street}, {inquiry.property_info?.address_city}, {inquiry.property_info?.address_state}
                          </p>
                          {inquiry.property_info?.price && (
                            <p className="text-lg font-bold text-blue-600 mt-1">
                              {formatPrice(inquiry.property_info.price)}
                            </p>
                          )}
                        </div>
                        
                        {/* Status & Date */}
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(inquiry.status)}`}>
                            {getStatusLabel(inquiry.status)}
                          </span>
                          
                          <span className="text-sm text-gray-500 flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Sent {formatDate(inquiry.created_at)}
                          </span>
                          
                          {inquiry.viewing_requested && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                              <Clock className="w-3 h-3 mr-1" />
                              Viewing Requested
                            </span>
                          )}
                        </div>
                        
                        {/* Message Preview */}
                        <p className="text-gray-700 text-sm leading-relaxed mb-3 line-clamp-2">
                          {inquiry.message}
                        </p>
                        
                        {/* Agent Info */}
                        {inquiry.agent_info && (
                          <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                            {inquiry.agent_info.profile_photo_url ? (
                              <img
                                src={inquiry.agent_info.profile_photo_url}
                                alt={inquiry.agent_info.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">
                                  {inquiry.agent_info.full_name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                Agent: {inquiry.agent_info.full_name}
                              </p>
                              <div className="flex flex-wrap gap-3 mt-1">
                                <a
                                  href={`tel:${inquiry.agent_info.phone_number}`}
                                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="w-3 h-3 mr-1" />
                                  {inquiry.agent_info.phone_number}
                                </a>
                                <a
                                  href={`mailto:${inquiry.agent_info.email}`}
                                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Mail className="w-3 h-3 mr-1" />
                                  {inquiry.agent_info.email}
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Reply Indicator */}
                        {inquiry.replies && inquiry.replies.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center text-sm text-green-600">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              <span className="font-medium">
                                Agent replied {formatDate(inquiry.replies[inquiry.replies.length - 1].created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-2 line-clamp-2 pl-6">
                              {inquiry.replies[inquiry.replies.length - 1].message}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* View Details Arrow */}
                      <div className="flex-shrink-0 flex items-center">
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Inquiry Detail Modal */}
      {inquiryDetailModal.is_open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
              onClick={closeInquiryDetail}
            ></div>
            
            {/* Modal Panel */}
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Inquiry Details</h3>
                  <button
                    onClick={closeInquiryDetail}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
                {detailLoading && (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">Loading conversation...</p>
                  </div>
                )}
                
                {!detailLoading && inquiryDetailData && (
                  <>
                    {/* Property Summary */}
                    {inquiryDetailData.inquiry.property_info && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                        <div className="flex items-start space-x-4">
                          {inquiryDetailData.inquiry.property_info.primary_photo && (
                            <img
                              src={inquiryDetailData.inquiry.property_info.primary_photo.thumbnail_url || inquiryDetailData.inquiry.property_info.primary_photo.image_url}
                              alt={inquiryDetailData.inquiry.property_info.title}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <Link
                              to={`/property/${inquiryDetailData.inquiry.property_id}`}
                              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors flex items-center"
                            >
                              {inquiryDetailData.inquiry.property_info.title}
                              <ChevronRight className="w-5 h-5 ml-1" />
                            </Link>
                            <p className="text-sm text-gray-600 mt-1">
                              {inquiryDetailData.inquiry.property_info.address_street}, {inquiryDetailData.inquiry.property_info.address_city}
                            </p>
                            {inquiryDetailData.inquiry.property_info.price && (
                              <p className="text-lg font-bold text-blue-600 mt-1">
                                {formatPrice(inquiryDetailData.inquiry.property_info.price)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Inquiry Status & Date */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border ${getStatusBadgeColor(inquiryDetailData.inquiry.status)}`}>
                        {getStatusLabel(inquiryDetailData.inquiry.status)}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Sent {formatDate(inquiryDetailData.inquiry.created_at)}
                      </span>
                      {inquiryDetailData.inquiry.viewing_requested && (
                        <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
                          <Clock className="w-4 h-4 mr-2" />
                          Viewing: {inquiryDetailData.inquiry.preferred_viewing_date} {inquiryDetailData.inquiry.preferred_viewing_time}
                        </span>
                      )}
                    </div>
                    
                    {/* Conversation Thread */}
                    <div className="space-y-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h4>
                      
                      {/* Your Message */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {currentUser?.profile_photo_url ? (
                              <img
                                src={currentUser.profile_photo_url}
                                alt={currentUser.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {currentUser?.full_name.split(' ').map(n => n[0]).join('') || 'Y'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-gray-900">You</p>
                              <p className="text-xs text-gray-500">{formatDate(inquiryDetailData.inquiry.created_at)}</p>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {inquiryDetailData.inquiry.message}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Agent Replies */}
                      {inquiryDetailData.replies && inquiryDetailData.replies.length > 0 ? (
                        inquiryDetailData.replies
                          .filter(reply => reply.sender_type === 'agent')
                          .map(reply => (
                            <div key={reply.reply_id} className="bg-green-50 rounded-lg p-4 border border-green-200">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  {inquiryDetailData.inquiry.agent_info?.profile_photo_url ? (
                                    <img
                                      src={inquiryDetailData.inquiry.agent_info.profile_photo_url}
                                      alt={inquiryDetailData.inquiry.agent_info.full_name}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                                      <span className="text-white font-semibold text-sm">
                                        {inquiryDetailData.inquiry.agent_info?.full_name.split(' ').map(n => n[0]).join('') || 'A'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {inquiryDetailData.inquiry.agent_info?.full_name || 'Agent'}
                                    </p>
                                    <p className="text-xs text-gray-500">{formatDate(reply.created_at)}</p>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {reply.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
                          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">Waiting for agent to respond</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Agent Contact Card */}
                    {inquiryDetailData.inquiry.agent_info && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Agent Contact</h4>
                        <div className="flex items-center space-x-4">
                          {inquiryDetailData.inquiry.agent_info.profile_photo_url ? (
                            <img
                              src={inquiryDetailData.inquiry.agent_info.profile_photo_url}
                              alt={inquiryDetailData.inquiry.agent_info.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold">
                                {inquiryDetailData.inquiry.agent_info.full_name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{inquiryDetailData.inquiry.agent_info.full_name}</p>
                            <div className="flex flex-wrap gap-3 mt-1">
                              <a
                                href={`tel:${inquiryDetailData.inquiry.agent_info.phone_number}`}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Call Agent
                              </a>
                              <a
                                href={`mailto:${inquiryDetailData.inquiry.agent_info.email}`}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Email Agent
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <Link
                  to={`/property/${inquiryDetailModal.inquiry_id ? inquiries.find(i => i.inquiry_id === inquiryDetailModal.inquiry_id)?.property_id : ''}`}
                  className="inline-flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-all border border-gray-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Home className="w-4 h-4 mr-2" />
                  View Property
                </Link>
                <button
                  onClick={closeInquiryDetail}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_UserInquiries;