import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Home, 
  Building2, 
  DollarSign, 
  Bed, 
  Bath, 
  Maximize, 
  Eye, 
  Mail, 
  Heart, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Grid3x3, 
  List, 
  Search, 
  Filter, 
  Check, 
  X, 
  AlertCircle,
  ChevronDown,
  Plus
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PropertyListing {
  property_id: string;
  title: string;
  address_street: string;
  address_city: string;
  address_state: string;
  price: number;
  currency: string;
  listing_type: 'sale' | 'rent';
  property_type: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  view_count: number;
  inquiry_count: number;
  favorite_count: number;
  created_at: string;
  primary_photo_url: string | null;
}

interface ListingsResponse {
  data: PropertyListing[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface ActiveFilters {
  status: string[];
  property_type: string[];
  listing_type: string | null;
  search_query: string;
}

interface SortConfig {
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AgentListings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // ========== GLOBAL STATE (Individual Selectors) ==========
  const currentAgent = useAppStore(state => state.authentication_state.current_agent);
  const agentAuthToken = useAppStore(state => state.authentication_state.agent_auth_token);
  const isAgentAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_agent_authenticated);
  const showToast = useAppStore(state => state.show_toast);
  
  // ========== LOCAL STATE ==========
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('agent_listings_view_mode') as 'grid' | 'table') || 'grid';
  });
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [bulkActionState, setBulkActionState] = useState<{
    action_type: 'status' | 'delete' | null;
    target_status: string | null;
    confirming: boolean;
    processing: boolean;
  }>({
    action_type: null,
    target_status: null,
    confirming: false,
    processing: false
  });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // ========== PARSE URL PARAMETERS ==========
  const activeFilters = useMemo<ActiveFilters>(() => {
    const statusParam = searchParams.get('status');
    const propertyTypeParam = searchParams.get('property_type');
    
    return {
      status: statusParam ? statusParam.split(',') : [],
      property_type: propertyTypeParam ? propertyTypeParam.split(',') : [],
      listing_type: searchParams.get('listing_type') as string | null,
      search_query: searchParams.get('search') || ''
    };
  }, [searchParams]);
  
  const sortConfig = useMemo<SortConfig>(() => {
    const sortParam = searchParams.get('sort') || 'created_at_desc';
    const [sort_by, sort_order] = sortParam.split('_');
    
    return {
      sort_by: sort_by || 'created_at',
      sort_order: (sort_order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
    };
  }, [searchParams]);
  
  // Initialize search input from URL
  useEffect(() => {
    setSearchInput(activeFilters.search_query);
  }, [activeFilters.search_query]);
  
  // ========== AUTH GUARD ==========
  useEffect(() => {
    if (!isAgentAuthenticated || !currentAgent) {
      navigate('/agent/login?redirect=/agent/listings');
    }
  }, [isAgentAuthenticated, currentAgent, navigate]);
  
  // ========== API DATA FETCHING ==========
  
  const fetchAgentListings = async (): Promise<ListingsResponse> => {
    if (!currentAgent || !agentAuthToken) {
      throw new Error('Not authenticated');
    }
    
    const params = new URLSearchParams();
    params.set('agent_id', currentAgent.agent_id);
    
    if (activeFilters.status.length > 0) {
      activeFilters.status.forEach(s => params.append('status', s));
    }
    if (activeFilters.property_type.length > 0) {
      activeFilters.property_type.forEach(pt => params.append('property_type', pt));
    }
    if (activeFilters.listing_type) {
      params.set('listing_type', activeFilters.listing_type);
    }
    if (activeFilters.search_query) {
      params.set('query', activeFilters.search_query);
    }
    
    params.set('sort_by', sortConfig.sort_by);
    params.set('sort_order', sortConfig.sort_order);
    params.set('limit', '100');
    params.set('offset', '0');
    
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${agentAuthToken}`
        }
      }
    );
    
    return response.data;
  };
  
  const { data: listingsData, isLoading, error, refetch } = useQuery({
    queryKey: ['agent-listings', currentAgent?.agent_id, activeFilters, sortConfig],
    queryFn: fetchAgentListings,
    enabled: !!currentAgent && !!agentAuthToken,
    staleTime: 60000,
    refetchOnWindowFocus: false
  });
  
  const properties = useMemo(() => listingsData?.data || [], [listingsData]);
  const totalCount = useMemo(() => listingsData?.pagination?.total || 0, [listingsData]);
  
  // ========== MUTATIONS ==========
  
  const deletePropertyMutation = useMutation({
    mutationFn: async (property_id: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}`,
        {
          headers: {
            'Authorization': `Bearer ${agentAuthToken}`
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-listings'] });
      showToast('Listing deleted successfully', 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete listing';
      showToast(errorMessage, 'error');
    }
  });
  
  const updatePropertyStatusMutation = useMutation({
    mutationFn: async ({ property_id, status }: { property_id: string; status: string }) => {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}`,
        { property_id, status },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agentAuthToken}`
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-listings'] });
    }
  });
  
  // ========== FILTER HANDLERS ==========
  
  const updateURLParams = (updates: Partial<ActiveFilters & { sort: string }>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        newParams.delete(key);
      } else if (Array.isArray(value)) {
        newParams.set(key, value.join(','));
      } else {
        newParams.set(key, String(value));
      }
    });
    
    setSearchParams(newParams);
  };
  
  const handleStatusFilterChange = (status: string) => {
    let newStatus: string[];
    const currentStatuses = Array.isArray(activeFilters.status) ? activeFilters.status : [];
    if (currentStatuses.includes(status)) {
      newStatus = currentStatuses.filter(s => s !== status);
    } else {
      newStatus = [...currentStatuses, status];
    }
    updateURLParams({ status: newStatus });
  };
  
  const handlePropertyTypeFilterChange = (type: string) => {
    let newTypes: string[];
    const currentTypes = Array.isArray(activeFilters.property_type) ? activeFilters.property_type : [];
    if (currentTypes.includes(type)) {
      newTypes = currentTypes.filter(t => t !== type);
    } else {
      newTypes = [...currentTypes, type];
    }
    updateURLParams({ property_type: newTypes });
  };
  
  const handleListingTypeChange = (type: string | null) => {
    updateURLParams({ listing_type: type || '' });
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    // Debounce search
    const timer = setTimeout(() => {
      updateURLParams({ search_query: value });
    }, 300);
    
    return () => clearTimeout(timer);
  };
  
  const handleSortChange = (sort_option: string) => {
    updateURLParams({ sort: sort_option });
  };
  
  const clearAllFilters = () => {
    setSearchParams({});
    setSearchInput('');
  };
  
  // ========== VIEW MODE ==========
  
  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('agent_listings_view_mode', mode);
  };
  
  // ========== BULK ACTIONS ==========
  
  const handleSelectAll = () => {
    if (selectedPropertyIds.length === properties.length) {
      setSelectedPropertyIds([]);
    } else {
      setSelectedPropertyIds(properties.map(p => p.property_id));
    }
  };
  
  const handleSelectProperty = (property_id: string) => {
    if (selectedPropertyIds.includes(property_id)) {
      setSelectedPropertyIds(selectedPropertyIds.filter(id => id !== property_id));
    } else {
      setSelectedPropertyIds([...selectedPropertyIds, property_id]);
    }
  };
  
  const handleBulkStatusChange = (new_status: string) => {
    setBulkActionState({
      action_type: 'status',
      target_status: new_status,
      confirming: true,
      processing: false
    });
  };
  
  const handleBulkDelete = () => {
    setBulkActionState({
      action_type: 'delete',
      target_status: null,
      confirming: true,
      processing: false
    });
  };
  
  const executeBulkAction = async () => {
    setBulkActionState(prev => ({ ...prev, processing: true }));
    
    try {
      if (bulkActionState.action_type === 'status' && bulkActionState.target_status) {
        // Update status for all selected properties
        await Promise.all(
          selectedPropertyIds.map(property_id =>
            updatePropertyStatusMutation.mutateAsync({
              property_id,
              status: bulkActionState.target_status!
            })
          )
        );
        
        showToast(`${selectedPropertyIds.length} listing(s) updated to ${bulkActionState.target_status}`, 'success');
        
      } else if (bulkActionState.action_type === 'delete') {
        // Delete all selected properties
        await Promise.all(
          selectedPropertyIds.map(property_id =>
            deletePropertyMutation.mutateAsync(property_id)
          )
        );
        
        showToast(`${selectedPropertyIds.length} listing(s) deleted`, 'success');
      }
      
      setSelectedPropertyIds([]);
      setBulkActionState({
        action_type: null,
        target_status: null,
        confirming: false,
        processing: false
      });
      
      refetch();
      
    } catch (error) {
      showToast('Some actions failed. Please try again.', 'error');
      setBulkActionState(prev => ({ ...prev, processing: false }));
    }
  };
  
  const cancelBulkAction = () => {
    setBulkActionState({
      action_type: null,
      target_status: null,
      confirming: false,
      processing: false
    });
  };
  
  // ========== SINGLE PROPERTY ACTIONS ==========
  
  const handleDeleteProperty = (property_id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      deletePropertyMutation.mutate(property_id);
    }
  };
  
  const handleDuplicateProperty = (property_id: string) => {
    navigate(`/agent/listings/duplicate/${property_id}`);
  };
  
  // ========== HELPER FUNCTIONS ==========
  
  const formatPrice = (price: number, currency: string, listing_type: string): string => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0
    }).format(price || 0);
    
    return listing_type === 'rent' ? `${formatted}/month` : formatted;
  };
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };
  
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'draft': 'bg-gray-100 text-gray-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'sold': 'bg-blue-100 text-blue-800',
      'rented': 'bg-purple-100 text-purple-800',
      'inactive': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.status.length > 0) count += activeFilters.status.length;
    if (activeFilters.property_type.length > 0) count += activeFilters.property_type.length;
    if (activeFilters.listing_type) count += 1;
    if (activeFilters.search_query) count += 1;
    return count;
  }, [activeFilters]);
  
  // ========== RENDER GUARDS ==========
  
  if (!currentAgent) {
    return null;
  }
  
  // ========== RENDER ==========
  
  return (
    <>
      {/* Page Header */}
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {totalCount} {totalCount === 1 ? 'listing' : 'listings'}
                </p>
              </div>
              
              <Link
                to="/agent/listings/create"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-lg text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Listing
              </Link>
            </div>
          </div>
        </div>
        
        {/* Filters and Controls Bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Search and View Toggle */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by address or title..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => handleViewModeChange('table')}
                  className={`p-3 rounded-lg border border-2 transition-all duration-200 ${
                    viewMode === 'table'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                  aria-label="Table view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Status Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                  className="inline-flex items-center px-4 py-2 border-2 border-gray-200 rounded-lg bg-white hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                >
                  <Filter className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Status {activeFilters.status.length > 0 && `(${activeFilters.status.length})`}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
                </button>
                
                {activeDropdown === 'status' && (
                  <div className="absolute z-10 mt-2 w-56 rounded-lg bg-white shadow-lg border border-gray-200">
                    <div className="py-2">
                      {['active', 'draft', 'pending', 'sold', 'rented', 'inactive'].map(status => (
                        <label key={status} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeFilters.status.includes(status)}
                            onChange={() => handleStatusFilterChange(status)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-3 text-sm text-gray-700 capitalize">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Property Type Filter */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'property_type' ? null : 'property_type')}
                  className="inline-flex items-center px-4 py-2 border-2 border-gray-200 rounded-lg bg-white hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                >
                  <Building2 className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Type {activeFilters.property_type.length > 0 && `(${activeFilters.property_type.length})`}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
                </button>
                
                {activeDropdown === 'property_type' && (
                  <div className="absolute z-10 mt-2 w-56 rounded-lg bg-white shadow-lg border border-gray-200">
                    <div className="py-2">
                      {['house', 'condo', 'townhouse', 'apartment', 'land', 'commercial'].map(type => (
                        <label key={type} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeFilters.property_type.includes(type)}
                            onChange={() => handlePropertyTypeFilterChange(type)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-3 text-sm text-gray-700 capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Listing Type Toggle */}
              <div className="flex border-2 border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleListingTypeChange(null)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    !activeFilters.listing_type
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleListingTypeChange('sale')}
                  className={`px-4 py-2 text-sm font-medium border-l-2 border-gray-200 transition-colors ${
                    activeFilters.listing_type === 'sale'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  For Sale
                </button>
                <button
                  onClick={() => handleListingTypeChange('rent')}
                  className={`px-4 py-2 text-sm font-medium border-l-2 border-gray-200 transition-colors ${
                    activeFilters.listing_type === 'rent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  For Rent
                </button>
              </div>
              
              {/* Sort Dropdown */}
              <select
                value={`${sortConfig.sort_by}_${sortConfig.sort_order}`}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              >
                <option value="created_at_desc">Newest First</option>
                <option value="created_at_asc">Oldest First</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="view_count_desc">Most Views</option>
                <option value="inquiry_count_desc">Most Inquiries</option>
              </select>
              
              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Bulk Actions Bar */}
        {selectedPropertyIds.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {selectedPropertyIds.length} listing{selectedPropertyIds.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedPropertyIds([])}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear selection
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => e.target.value && handleBulkStatusChange(e.target.value)}
                    value=""
                    className="px-4 py-2 border-2 border-blue-300 rounded-lg bg-white text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Change Status</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="sold">Sold</option>
                    <option value="rented">Rented</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  
                  <button
                    onClick={handleBulkDelete}
                    className="inline-flex items-center px-4 py-2 border-2 border-red-300 rounded-lg bg-white text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Loading your listings...</p>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">Error Loading Listings</h3>
              </div>
              <p className="text-red-700 mb-4">
                {error instanceof Error ? error.message : 'Failed to load listings'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          
          {/* Empty State */}
          {!isLoading && !error && properties.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Home className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {activeFilterCount > 0 ? 'No Listings Match Your Filters' : 'No Listings Yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeFilterCount > 0 
                    ? 'Try adjusting your filters to see more listings.'
                    : "You haven't created any property listings yet. Get started by creating your first listing!"}
                </p>
                {activeFilterCount > 0 ? (
                  <button
                    onClick={clearAllFilters}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Clear All Filters
                  </button>
                ) : (
                  <Link
                    to="/agent/listings/create"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Listing
                  </Link>
                )}
              </div>
            </div>
          )}
          
          {/* Grid View */}
          {!isLoading && !error && properties.length > 0 && viewMode === 'grid' && (
            <>
              {/* Select All */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                  <input
                    type="checkbox"
                    checked={selectedPropertyIds.length === properties.length && properties.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium">Select All</span>
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <div
                    key={property.property_id}
                    className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200"
                  >
                    {/* Checkbox Overlay */}
                    <div className="relative">
                      <label className="absolute top-3 left-3 z-10 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPropertyIds.includes(property.property_id)}
                          onChange={() => handleSelectProperty(property.property_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 text-blue-600 border-2 border-white rounded shadow-lg focus:ring-blue-500"
                        />
                      </label>
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3 z-10">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(property.status)}`}>
                          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                        </span>
                      </div>
                      
                      {/* Property Image */}
                      {property.primary_photo_url ? (
                        <img
                          src={property.primary_photo_url}
                          alt={property.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <Home className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Property Details */}
                    <div className="p-6">
                      <div className="mb-3">
                        <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-1">
                          {property.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {property.address_street}, {property.address_city}, {property.address_state}
                        </p>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-2xl font-bold text-blue-600">
                          {formatPrice(property.price, property.currency, property.listing_type)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)} • {property.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
                        </p>
                      </div>
                      
                      {/* Property Specs */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          <span>{property.bedrooms} bd</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          <span>{property.bathrooms} ba</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Maximize className="w-4 h-4" />
                          <span>{property.square_footage.toLocaleString()} sqft</span>
                        </div>
                      </div>
                      
                      {/* Metrics */}
                      <div className="flex items-center justify-between py-3 border-t border-gray-200 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Eye className="w-4 h-4" />
                          <span>{property.view_count}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span>{property.inquiry_count}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Heart className="w-4 h-4" />
                          <span>{property.favorite_count}</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-4">
                        Listed {formatDate(property.created_at)}
                      </p>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/property/${property.property_id}`}
                          target="_blank"
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Link>
                        
                        <Link
                          to={`/agent/listings/edit/${property.property_id}`}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Link>
                        
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === property.property_id ? null : property.property_id)}
                            className="p-2 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                          </button>
                          
                          {activeDropdown === property.property_id && (
                            <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-200 z-20">
                              <button
                                onClick={() => {
                                  handleDuplicateProperty(property.property_id);
                                  setActiveDropdown(null);
                                }}
                                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteProperty(property.property_id, property.title);
                                  setActiveDropdown(null);
                                }}
                                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Table View */}
          {!isLoading && !error && properties.length > 0 && viewMode === 'table' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedPropertyIds.length === properties.length && properties.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Metrics
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody className="bg-white divide-y divide-gray-200">
                    {properties.map((property) => (
                      <tr key={property.property_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedPropertyIds.includes(property.property_id)}
                            onChange={() => handleSelectProperty(property.property_id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {property.primary_photo_url ? (
                              <img
                                src={property.primary_photo_url}
                                alt={property.title}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Home className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                                {property.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {property.address_city}, {property.address_state}
                              </p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900 capitalize">{property.property_type}</p>
                            <p className="text-xs text-gray-500">
                              {property.bedrooms} bd • {property.bathrooms} ba
                            </p>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatPrice(property.price, property.currency, property.listing_type)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {property.square_footage.toLocaleString()} sqft
                          </p>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(property.status)}`}>
                            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>{property.view_count} views</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span>{property.inquiry_count} inquiries</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              <span>{property.favorite_count} favorites</span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(property.created_at)}
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/property/${property.property_id}`}
                              target="_blank"
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            
                            <Link
                              to={`/agent/listings/edit/${property.property_id}`}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            
                            <div className="relative">
                              <button
                                onClick={() => setActiveDropdown(activeDropdown === property.property_id ? null : property.property_id)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              
                              {activeDropdown === property.property_id && (
                                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-200 z-20">
                                  <button
                                    onClick={() => {
                                      handleDuplicateProperty(property.property_id);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteProperty(property.property_id, property.title);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bulk Action Confirmation Modal */}
      {bulkActionState.confirming && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  bulkActionState.action_type === 'delete' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  {bulkActionState.action_type === 'delete' ? (
                    <Trash2 className="w-6 h-6 text-red-600" />
                  ) : (
                    <Check className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {bulkActionState.action_type === 'delete' 
                    ? 'Delete Listings?' 
                    : 'Change Status?'}
                </h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                {bulkActionState.action_type === 'delete' 
                  ? `You are about to permanently delete ${selectedPropertyIds.length} listing${selectedPropertyIds.length !== 1 ? 's' : ''}. This action cannot be undone.`
                  : `You are about to change the status of ${selectedPropertyIds.length} listing${selectedPropertyIds.length !== 1 ? 's' : ''} to "${bulkActionState.target_status}".`}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelBulkAction}
                  disabled={bulkActionState.processing}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={executeBulkAction}
                  disabled={bulkActionState.processing}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    bulkActionState.action_type === 'delete'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {bulkActionState.processing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    bulkActionState.action_type === 'delete' ? 'Delete' : 'Confirm'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Click outside to close dropdowns */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setActiveDropdown(null)}
        ></div>
      )}
    </>
  );
};

export default UV_AgentListings;