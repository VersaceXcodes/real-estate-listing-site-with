import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Heart, Trash2, Filter, Grid3x3, AlertCircle, Home } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES (matching Zod schemas)
// ============================================================================

interface PropertyPhoto {
  image_url: string;
  thumbnail_url: string | null;
}

interface AgentInfo {
  agent_id: string;
  full_name: string;
}

interface PropertyData {
  property_id: string;
  title: string;
  price: number;
  currency: string;
  listing_type: 'sale' | 'rent';
  address_street: string;
  address_city: string;
  address_state: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  status: string;
  primary_photo: PropertyPhoto | null;
  agent_info: AgentInfo;
}

interface SavedProperty {
  favorite_id: string;
  property_id: string;
  created_at: string;
  property_data: PropertyData;
}

interface FavoriteResponse {
  data: Array<{
    favorite_id: string;
    user_id: string;
    property_id: string;
    created_at: string;
    property?: PropertyData;
  }>;
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

const fetchUserFavorites = async (
  token: string,
  sortBy: string,
  sortOrder: string
): Promise<SavedProperty[]> => {
  const response = await axios.get<FavoriteResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 100,
        offset: 0,
      },
    }
  );

  // Transform response to match expected format
  return response.data.data
    .filter(fav => fav.property) // Only include if property data exists
    .map(fav => ({
      favorite_id: fav.favorite_id,
      property_id: fav.property_id,
      created_at: fav.created_at,
      property_data: fav.property!,
    }));
};

const deleteFavorite = async (favoriteId: string, token: string): Promise<void> => {
  await axios.delete(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites/${favoriteId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SavedProperties: React.FC = () => {
  // URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSortParam = searchParams.get('sort') || 'date_saved_desc';

  // Zustand global state - CRITICAL: Individual selectors only
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.user_auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const showToast = useAppStore(state => state.show_toast);

  // Local state
  const [sortOrder, setSortOrder] = useState(urlSortParam);
  const [removeConfirmationModal, setRemoveConfirmationModal] = useState<{
    is_open: boolean;
    property_id: string | null;
    property_title: string;
  }>({
    is_open: false,
    property_id: null,
    property_title: '',
  });

  // React Query
  const queryClient = useQueryClient();

  // Determine sort parameters for API
  const getSortParams = (sortValue: string) => {
    switch (sortValue) {
      case 'date_saved_asc':
        return { sortBy: 'created_at', sortOrder: 'asc' };
      case 'date_saved_desc':
      default:
        return { sortBy: 'created_at', sortOrder: 'desc' };
      case 'price_asc':
        return { sortBy: 'price', sortOrder: 'asc' };
      case 'price_desc':
        return { sortBy: 'price', sortOrder: 'desc' };
      case 'newest':
        return { sortBy: 'created_at', sortOrder: 'desc' };
    }
  };

  const { sortBy, sortOrder: apiSortOrder } = getSortParams(sortOrder);

  // Fetch saved properties
  const {
    data: savedProperties = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-favorites', currentUser?.user_id, sortBy, apiSortOrder],
    queryFn: () => fetchUserFavorites(authToken!, sortBy, apiSortOrder),
    enabled: !!authToken && !!currentUser,
    staleTime: 60000, // 1 minute
    select: (data) => {
      // CRITICAL: Transform numeric fields from PostgreSQL strings
      return data.map(item => ({
        ...item,
        property_data: {
          ...item.property_data,
          price: Number(item.property_data.price || 0),
          bedrooms: Number(item.property_data.bedrooms || 0),
          bathrooms: Number(item.property_data.bathrooms || 0),
          square_footage: Number(item.property_data.square_footage || 0),
        },
      }));
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (favoriteId: string) => deleteFavorite(favoriteId, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
      showToast('Property removed from saved', 'success');
      setRemoveConfirmationModal({
        is_open: false,
        property_id: null,
        property_title: '',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to remove property';
      showToast(errorMessage, 'error');
    },
  });

  // Handlers
  const handleSortChange = (newSort: string) => {
    setSortOrder(newSort);
    setSearchParams({ sort: newSort });
  };

  const openRemoveConfirmation = (favoriteId: string, propertyTitle: string) => {
    setRemoveConfirmationModal({
      is_open: true,
      property_id: favoriteId,
      property_title: propertyTitle,
    });
  };

  const closeRemoveConfirmation = () => {
    setRemoveConfirmationModal({
      is_open: false,
      property_id: null,
      property_title: '',
    });
  };

  const confirmRemove = () => {
    if (removeConfirmationModal.property_id) {
      removeFavoriteMutation.mutate(removeConfirmationModal.property_id);
    }
  };

  const formatPrice = (price: number, currency: string, listingType: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(price);
    
    return listingType === 'rent' ? `${formatted}/month` : formatted;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // If not authenticated, redirect handled by route guard
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">Please log in to view your saved properties.</p>
            <Link
              to="/login?redirect=/saved-properties"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Page Container */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                  My Saved Properties
                </h1>
                <p className="mt-2 text-base text-gray-600">
                  {savedProperties.length > 0 
                    ? `${savedProperties.length} ${savedProperties.length === 1 ? 'property' : 'properties'} saved`
                    : 'No saved properties yet'}
                </p>
              </div>

              {savedProperties.length > 0 && (
                <div className="flex items-center gap-3">
                  <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                    Sort by:
                  </label>
                  <select
                    id="sort"
                    value={sortOrder}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-sm font-medium text-gray-900 bg-white transition-all"
                  >
                    <option value="date_saved_desc">Date Saved (Newest)</option>
                    <option value="date_saved_asc">Date Saved (Oldest)</option>
                    <option value="price_asc">Price (Low to High)</option>
                    <option value="price_desc">Price (High to Low)</option>
                    <option value="newest">Newest Listings</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-300"></div>
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Saved Properties</h3>
              <p className="text-gray-600 mb-6">
                {error instanceof Error ? error.message : 'An error occurred while loading your saved properties.'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && savedProperties.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="max-w-md mx-auto">
                <Heart className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 mb-3">No Saved Properties Yet</h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Save your favorite listings to keep track of properties you love. Click the heart icon on any property to add it here.
                </p>
                <Link
                  to="/search"
                  className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <Grid3x3 className="w-5 h-5 mr-2" />
                  Browse Properties
                </Link>
              </div>
            </div>
          )}

          {/* Properties Grid */}
          {!isLoading && !error && savedProperties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProperties.map((item) => {
                const property = item.property_data;
                
                return (
                  <div
                    key={item.favorite_id}
                    className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-200 group"
                  >
                    {/* Property Image */}
                    <Link
                      to={`/property/${property.property_id}`}
                      className="block relative"
                    >
                      <div className="relative h-56 overflow-hidden bg-gray-200">
                        {property.primary_photo?.thumbnail_url || property.primary_photo?.image_url ? (
                          <img
                            src={property.primary_photo.thumbnail_url || property.primary_photo.image_url}
                            alt={property.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300">
                            <Home className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Listing Type Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-lg">
                            For {property.listing_type === 'sale' ? 'Sale' : 'Rent'}
                          </span>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            openRemoveConfirmation(item.favorite_id, property.title);
                          }}
                          className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all"
                          aria-label="Remove from saved properties"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Link>

                    {/* Property Details */}
                    <div className="p-6">
                      {/* Saved Date */}
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 font-medium">
                          Saved on {formatDate(item.created_at)}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="mb-3">
                        <p className="text-2xl font-bold text-blue-600">
                          {formatPrice(property.price, property.currency, property.listing_type)}
                        </p>
                      </div>

                      {/* Address */}
                      <Link
                        to={`/property/${property.property_id}`}
                        className="block mb-3 hover:text-blue-600 transition-colors"
                      >
                        <p className="text-base font-semibold text-gray-900 line-clamp-1">
                          {property.address_street}
                        </p>
                        <p className="text-sm text-gray-600">
                          {property.address_city}, {property.address_state}
                        </p>
                      </Link>

                      {/* Property Type */}
                      <p className="text-sm text-gray-500 mb-4 capitalize">
                        {property.property_type.replace('_', ' ')}
                      </p>

                      {/* Specs */}
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                        <span className="flex items-center">
                          <span className="font-semibold">{property.bedrooms}</span>
                          <span className="ml-1">bd</span>
                        </span>
                        <span className="flex items-center">
                          <span className="font-semibold">{property.bathrooms}</span>
                          <span className="ml-1">ba</span>
                        </span>
                        <span className="flex items-center">
                          <span className="font-semibold">
                            {property.square_footage.toLocaleString()}
                          </span>
                          <span className="ml-1">sqft</span>
                        </span>
                      </div>

                      {/* Agent Info */}
                      <Link
                        to={`/agent/${property.agent_info.agent_id}`}
                        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-semibold text-white">
                          {property.agent_info.full_name.charAt(0)}
                        </div>
                        <span>{property.agent_info.full_name}</span>
                      </Link>

                      {/* View Details Button */}
                      <Link
                        to={`/property/${property.property_id}`}
                        className="mt-4 block w-full text-center px-4 py-2 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 border border-gray-300 transition-all"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Remove Confirmation Modal */}
        {removeConfirmationModal.is_open && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={closeRemoveConfirmation}
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Remove from Saved?
                </h3>
                <p className="text-gray-600">
                  Are you sure you want to remove <strong>{removeConfirmationModal.property_title}</strong> from your saved properties?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeRemoveConfirmation}
                  disabled={removeFavoriteMutation.isPending}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 border border-gray-300 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemove}
                  disabled={removeFavoriteMutation.isPending}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removeFavoriteMutation.isPending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Removing...
                    </span>
                  ) : (
                    'Remove'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_SavedProperties;