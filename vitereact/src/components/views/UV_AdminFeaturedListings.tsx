import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================================
// TYPES (matching Zod schemas)
// ============================================================================

interface Property {
  property_id: string;
  title: string;
  price: number;
  currency: string;
  address_street: string;
  address_city: string;
  address_state: string;
  property_type: string;
  listing_type: 'sale' | 'rent';
  status: string;
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  is_featured: boolean;
  featured_order: number | null;
  featured_until: string | null;
  created_at: string;
  agent_info?: {
    full_name: string;
  };
  primary_photo?: {
    image_url: string;
    thumbnail_url: string | null;
  } | null;
}

interface FeaturedListingsResponse {
  data: Property[];
}

interface SearchPropertiesResponse {
  data: Property[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface ReorderPayload {
  listing_order: Array<{
    property_id: string;
    featured_order: number;
  }>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminFeaturedListings: React.FC = () => {
  // ========== ZUSTAND STATE (Individual Selectors) ==========
  const adminAuthToken = useAppStore(state => state.authentication_state.admin_auth_token);
  const currentAdmin = useAppStore(state => state.authentication_state.current_admin);
  const showToast = useAppStore(state => state.show_toast);

  // ========== LOCAL STATE ==========
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [draggingPropertyId, setDraggingPropertyId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localFeaturedProperties, setLocalFeaturedProperties] = useState<Property[]>([]);

  const queryClient = useQueryClient();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ========== API CALLS ==========

  // Load featured listings
  const {
    data: featuredListingsData,
    isLoading: featuredLoading,
    error: featuredError,
    refetch: refetchFeatured
  } = useQuery<FeaturedListingsResponse>({
    queryKey: ['admin-featured-listings'],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/featured-listings`,
        {
          headers: {
            'Authorization': `Bearer ${adminAuthToken}`
          }
        }
      );
      return response.data;
    },
    enabled: !!adminAuthToken,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    select: (data) => ({
      ...data,
      data: data.data.map((item: any) => ({
        ...item,
        price: Number(item.price || 0),
        bedrooms: Number(item.bedrooms || 0),
        bathrooms: Number(item.bathrooms || 0),
        square_footage: Number(item.square_footage || 0),
        featured_order: Number(item.featured_order || 0)
      }))
    })
  });

  // Search available properties
  const {
    data: searchResultsData,
    isLoading: searchLoading,
    refetch: refetchSearch
  } = useQuery<SearchPropertiesResponse>({
    queryKey: ['admin-search-properties', searchQuery],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/properties`,
        {
          params: {
            query: searchQuery || undefined,
            status: 'active',
            is_featured: false,
            limit: 10,
            sort_by: 'created_at',
            sort_order: 'desc'
          },
          headers: {
            'Authorization': `Bearer ${adminAuthToken}`
          }
        }
      );
      return response.data;
    },
    enabled: searchModalOpen && !!adminAuthToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    select: (data) => ({
      ...data,
      data: data.data.map((item: any) => ({
        ...item,
        price: Number(item.price || 0),
        bedrooms: Number(item.bedrooms || 0),
        bathrooms: Number(item.bathrooms || 0),
        square_footage: Number(item.square_footage || 0)
      }))
    })
  });

  // Add to featured mutation
  const addToFeaturedMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const featuredOrder = (featuredListingsData?.data.length || 0) + 1;
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/featured-listings`,
        {
          property_id: propertyId,
          featured_until: null,
          featured_order: featuredOrder
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminAuthToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-listings'] });
      setSearchModalOpen(false);
      setSearchQuery('');
      setSelectedPropertyId(null);
      showToast('Property added to featured listings', 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to add property to featured';
      showToast(errorMessage, 'error');
    }
  });

  // Remove from featured mutation
  const removeFromFeaturedMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const response = await axios.delete(
        `${API_BASE_URL}/api/admin/featured-listings/${propertyId}`,
        {
          headers: {
            'Authorization': `Bearer ${adminAuthToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-listings'] });
      showToast('Property removed from featured listings', 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to remove property from featured';
      showToast(errorMessage, 'error');
    }
  });

  // Reorder featured mutation
  const reorderFeaturedMutation = useMutation({
    mutationFn: async (reorderedProperties: Property[]) => {
      const listingOrder = reorderedProperties.map((p, index) => ({
        property_id: p.property_id,
        featured_order: index + 1
      }));

      const response = await axios.put(
        `${API_BASE_URL}/api/admin/featured-listings/reorder`,
        { listing_order: listingOrder },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminAuthToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-listings'] });
      showToast('Featured listings reordered successfully', 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to reorder featured listings';
      showToast(errorMessage, 'error');
      // Revert to original order
      refetchFeatured();
    }
  });

  // ========== EFFECTS ==========
  React.useEffect(() => {
    if (featuredListingsData?.data) {
      setLocalFeaturedProperties([...featuredListingsData.data].sort((a, b) => 
        (a.featured_order || 0) - (b.featured_order || 0)
      ));
    }
  }, [featuredListingsData]);

  // ========== EVENT HANDLERS ==========

  const handleOpenSearchModal = () => {
    setSearchModalOpen(true);
    setSearchQuery('');
    setSelectedPropertyId(null);
  };

  const handleCloseSearchModal = () => {
    setSearchModalOpen(false);
    setSearchQuery('');
    setSelectedPropertyId(null);
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
  };

  const handleAddToFeatured = () => {
    if (selectedPropertyId) {
      addToFeaturedMutation.mutate(selectedPropertyId);
    }
  };

  const handleRemoveFromFeatured = (propertyId: string) => {
    if (window.confirm('Are you sure you want to remove this property from featured listings?')) {
      removeFromFeaturedMutation.mutate(propertyId);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, propertyId: string, index: number) => {
    setDraggingPropertyId(propertyId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggingPropertyId) return;

    const dragIndex = localFeaturedProperties.findIndex(p => p.property_id === draggingPropertyId);
    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDraggingPropertyId(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder array
    const newProperties = [...localFeaturedProperties];
    const [draggedItem] = newProperties.splice(dragIndex, 1);
    newProperties.splice(dropIndex, 0, draggedItem);

    // Update local state immediately (optimistic)
    setLocalFeaturedProperties(newProperties);
    setDraggingPropertyId(null);
    setDragOverIndex(null);

    // Save to backend
    reorderFeaturedMutation.mutate(newProperties);
  };

  const handleDragEnd = () => {
    setDraggingPropertyId(null);
    setDragOverIndex(null);
  };

  // ========== HELPER FUNCTIONS ==========
  const formatPrice = (price: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // ========== RENDER ==========
  return (
    <>
      {/* Page Container */}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  Featured Listings Management
                </h1>
                <p className="mt-2 text-base text-gray-600">
                  Manage which properties appear prominently on the homepage
                </p>
              </div>
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats and Actions Bar */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Featured</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {localFeaturedProperties.length}
                  </p>
                </div>
                <div className="h-12 w-px bg-gray-200"></div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Max Allowed</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => refetchFeatured()}
                  disabled={featuredLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                >
                  <svg className={`w-5 h-5 mr-2 ${featuredLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={handleOpenSearchModal}
                  disabled={localFeaturedProperties.length >= 12}
                  className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Featured Listing
                </button>
              </div>
            </div>
            {localFeaturedProperties.length >= 12 && (
              <p className="mt-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-4 py-2">
                Maximum of 12 featured listings reached. Remove a listing to add another.
              </p>
            )}
          </div>

          {/* Loading State */}
          {featuredLoading && (
            <div className="text-center py-12">
              <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading featured listings...</p>
            </div>
          )}

          {/* Error State */}
          {featuredError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Featured Listings</h3>
              <p className="text-red-700 mb-4">There was an error loading the featured listings.</p>
              <button
                onClick={() => refetchFeatured()}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!featuredLoading && !featuredError && localFeaturedProperties.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Featured Listings Yet</h3>
              <p className="text-gray-600 mb-6">Add properties to showcase on the homepage</p>
              <button
                onClick={handleOpenSearchModal}
                className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Your First Featured Listing
              </button>
            </div>
          )}

          {/* Featured Listings Grid */}
          {!featuredLoading && !featuredError && localFeaturedProperties.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Drag and drop to reorder. First position appears at the top of the homepage.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {localFeaturedProperties.map((property, index) => (
                  <div
                    key={property.property_id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, property.property_id, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all duration-200 cursor-move
                      ${draggingPropertyId === property.property_id ? 'opacity-50 scale-95' : 'hover:shadow-xl'}
                      ${dragOverIndex === index && draggingPropertyId !== property.property_id ? 'border-blue-500 scale-105' : 'border-gray-100'}
                    `}
                  >
                    {/* Position Badge */}
                    <div className="absolute top-3 left-3 z-10 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg">
                      #{index + 1}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveFromFeatured(property.property_id)}
                      disabled={removeFromFeaturedMutation.isPending}
                      className="absolute top-3 right-3 z-10 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50"
                      title="Remove from featured"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {/* Property Image */}
                    <div className="relative h-48 bg-gray-200">
                      {property.primary_photo?.thumbnail_url || property.primary_photo?.image_url ? (
                        <img
                          src={property.primary_photo.thumbnail_url || property.primary_photo.image_url}
                          alt={property.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Drag Handle Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="p-6">
                      <div className="mb-3">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {property.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                        {property.title}
                      </h3>
                      
                      <p className="text-2xl font-bold text-blue-600 mb-3">
                        {formatPrice(property.price, property.currency)}
                      </p>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {property.address_street}, {property.address_city}, {property.address_state}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          {property.bedrooms} bd
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                          </svg>
                          {property.bathrooms} ba
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          {property.square_footage.toLocaleString()} sqft
                        </span>
                      </div>

                      {property.agent_info && (
                        <p className="text-xs text-gray-500">
                          Listed by: {property.agent_info.full_name}
                        </p>
                      )}

                      {/* View Public Listing Link */}
                      <Link
                        to={`/property/${property.property_id}`}
                        target="_blank"
                        className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Public Listing
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" 
              aria-hidden="true"
              onClick={handleCloseSearchModal}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white" id="modal-title">
                    Add Featured Listing
                  </h3>
                  <button
                    onClick={handleCloseSearchModal}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchQueryChange(e.target.value)}
                    placeholder="Search by title, address, or city..."
                    className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 sm:text-sm transition-all"
                  />
                </div>
              </div>

              {/* Search Results */}
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                {searchLoading && (
                  <div className="text-center py-8">
                    <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600 text-sm">Searching properties...</p>
                  </div>
                )}

                {!searchLoading && searchResultsData?.data && searchResultsData.data.length === 0 && (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-600">No active listings found matching your search</p>
                    <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                  </div>
                )}

                {!searchLoading && searchResultsData?.data && searchResultsData.data.length > 0 && (
                  <div className="space-y-3">
                    {searchResultsData.data.map((property) => (
                      <div
                        key={property.property_id}
                        onClick={() => handleSelectProperty(property.property_id)}
                        className={`
                          p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                          ${selectedPropertyId === property.property_id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                        `}
                      >
                        <div className="flex items-start space-x-4">
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-200">
                            {property.primary_photo?.thumbnail_url || property.primary_photo?.image_url ? (
                              <img
                                src={property.primary_photo.thumbnail_url || property.primary_photo.image_url}
                                alt={property.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">
                              {property.title}
                            </h4>
                            <p className="text-lg font-bold text-blue-600 mb-1">
                              {formatPrice(property.price, property.currency)}
                            </p>
                            <p className="text-xs text-gray-600 mb-2">
                              {property.address_city}, {property.address_state}
                            </p>
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <span>{property.bedrooms} bd</span>
                              <span>•</span>
                              <span>{property.bathrooms} ba</span>
                              <span>•</span>
                              <span>{property.square_footage.toLocaleString()} sqft</span>
                            </div>
                          </div>

                          {/* Selection Indicator */}
                          {selectedPropertyId === property.property_id && (
                            <div className="flex-shrink-0">
                              <div className="bg-blue-600 rounded-full p-1">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {selectedPropertyId ? 'Property selected' : 'Select a property to add'}
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCloseSearchModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToFeatured}
                    disabled={!selectedPropertyId || addToFeaturedMutation.isPending}
                    className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addToFeaturedMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </span>
                    ) : (
                      'Add to Featured'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_AdminFeaturedListings;