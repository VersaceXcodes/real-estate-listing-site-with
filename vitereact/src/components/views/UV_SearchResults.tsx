import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { SlidersHorizontal, Grid3x3, List, Map, Heart, Bed, Bath, Maximize, X, ChevronDown, MapPin, DollarSign, Home } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Property {
  property_id: string;
  agent_id: string;
  title: string;
  description: string;
  listing_type: 'sale' | 'rent';
  property_type: 'house' | 'condo' | 'townhouse' | 'apartment' | 'land' | 'commercial';
  status: string;
  price: number;
  currency: string;
  price_per_sqft: number | null;
  rent_frequency: 'monthly' | 'weekly' | 'daily' | null;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  neighborhood: string | null;
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  primary_photo: {
    image_url: string;
    thumbnail_url: string | null;
  } | null;
  agent_info: {
    agent_id: string;
    full_name: string;
    profile_photo_url: string | null;
  };
  view_count: number;
  inquiry_count: number;
  favorite_count: number;
  created_at: string;
}

interface SearchFilters {
  query: string | null;
  min_price: number | null;
  max_price: number | null;
  listing_type: 'sale' | 'rent' | null;
  property_type: string[];
  min_bedrooms: number | null;
  min_bathrooms: number | null;
  min_sqft: number | null;
  max_sqft: number | null;
  amenities: string[];
  features: string[];
  furnished: boolean | null;
  pet_friendly: boolean | null;
  new_construction: boolean | null;
  virtual_tour_available: boolean | null;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  limit: number;
  offset: number;
}

interface SearchResponse {
  data: Property[];
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

const fetchProperties = async (filters: SearchFilters): Promise<SearchResponse> => {
  const params = new URLSearchParams();
  
  if (filters.query) params.set('query', filters.query);
  if (filters.min_price) params.set('min_price', String(filters.min_price));
  if (filters.max_price) params.set('max_price', String(filters.max_price));
  if (filters.listing_type) params.set('listing_type', filters.listing_type);
  if (filters.property_type.length > 0) params.set('property_type', filters.property_type.join(','));
  if (filters.min_bedrooms) params.set('min_bedrooms', String(filters.min_bedrooms));
  if (filters.min_bathrooms) params.set('min_bathrooms', String(filters.min_bathrooms));
  if (filters.min_sqft) params.set('min_sqft', String(filters.min_sqft));
  if (filters.max_sqft) params.set('max_sqft', String(filters.max_sqft));
  if (filters.amenities.length > 0) params.set('amenities', filters.amenities.join(','));
  if (filters.features.length > 0) params.set('features', filters.features.join(','));
  if (filters.furnished !== null) params.set('furnished', String(filters.furnished));
  if (filters.pet_friendly !== null) params.set('pet_friendly', String(filters.pet_friendly));
  if (filters.new_construction !== null) params.set('new_construction', String(filters.new_construction));
  if (filters.virtual_tour_available !== null) params.set('virtual_tour_available', String(filters.virtual_tour_available));
  
  params.set('status', 'active');
  params.set('sort_by', filters.sort_by);
  params.set('sort_order', filters.sort_order);
  params.set('limit', String(filters.limit));
  params.set('offset', String(filters.offset));
  
  const response = await axios.get<SearchResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties?${params.toString()}`
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Global state - CRITICAL: Individual selectors only
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const savedProperties = useAppStore(state => state.user_favorites.saved_properties);
  const addFavorite = useAppStore(state => state.add_favorite);
  const removeFavorite = useAppStore(state => state.remove_favorite);
  const showToast = useAppStore(state => state.show_toast);
  const openModal = useAppStore(state => state.open_modal);
  
  // Local state
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [moreFiltersExpanded, setMoreFiltersExpanded] = useState(false);
  
  // Parse URL parameters into filters
  const parseUrlFilters = useMemo((): SearchFilters => {
    return {
      query: searchParams.get('location') || null,
      min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null,
      max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null,
      listing_type: searchParams.get('listing_type') as 'sale' | 'rent' | null,
      property_type: searchParams.get('property_type')?.split(',').filter(Boolean) || [],
      min_bedrooms: searchParams.get('bedrooms') ? Number(searchParams.get('bedrooms')) : null,
      min_bathrooms: searchParams.get('bathrooms') ? Number(searchParams.get('bathrooms')) : null,
      min_sqft: searchParams.get('min_sqft') ? Number(searchParams.get('min_sqft')) : null,
      max_sqft: searchParams.get('max_sqft') ? Number(searchParams.get('max_sqft')) : null,
      amenities: searchParams.get('amenities')?.split(',').filter(Boolean) || [],
      features: searchParams.get('features')?.split(',').filter(Boolean) || [],
      furnished: searchParams.get('furnished') === 'true' ? true : searchParams.get('furnished') === 'false' ? false : null,
      pet_friendly: searchParams.get('pet_friendly') === 'true' ? true : null,
      new_construction: searchParams.get('new_construction') === 'true' ? true : null,
      virtual_tour_available: searchParams.get('virtual_tour_available') === 'true' ? true : null,
      sort_by: searchParams.get('sort')?.split('_')[0] || 'created_at',
      sort_order: (searchParams.get('sort')?.includes('desc') ? 'desc' : 'asc') as 'asc' | 'desc',
      limit: 20,
      offset: searchParams.get('page') ? (Number(searchParams.get('page')) - 1) * 20 : 0
    };
  }, [searchParams]);
  
  const [activeFilters, setActiveFilters] = useState<SearchFilters>(parseUrlFilters);
  
  // Sync activeFilters with URL changes
  useEffect(() => {
    setActiveFilters(parseUrlFilters);
  }, [parseUrlFilters]);
  
  // Fetch properties
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['properties', activeFilters],
    queryFn: () => fetchProperties(activeFilters),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
    select: (data) => ({
      ...data,
      data: data.data.map(property => ({
        ...property,
        price: Number(property.price || 0),
        bedrooms: Number(property.bedrooms || 0),
        bathrooms: Number(property.bathrooms || 0),
        square_footage: Number(property.square_footage || 0)
      }))
    })
  });
  
  // Derived values
  const properties = searchResults?.data || [];
  const totalCount = searchResults?.pagination.total || 0;
  const currentPage = Math.floor((activeFilters.offset / activeFilters.limit) + 1);
  const totalPages = Math.ceil(totalCount / activeFilters.limit);
  
  // Check if property is saved
  const isPropertySaved = (propertyId: string): boolean => {
    return savedProperties.includes(propertyId);
  };
  
  // Update filter and URL
  const updateFilter = (filterName: keyof SearchFilters, value: any) => {
    const updated = { ...activeFilters, [filterName]: value, offset: 0 };
    setActiveFilters(updated);
    
    // Build new URL params
    const newParams = new URLSearchParams();
    if (updated.query) newParams.set('location', updated.query);
    if (updated.min_price) newParams.set('min_price', String(updated.min_price));
    if (updated.max_price) newParams.set('max_price', String(updated.max_price));
    if (updated.listing_type) newParams.set('listing_type', updated.listing_type);
    if (updated.property_type.length > 0) newParams.set('property_type', updated.property_type.join(','));
    if (updated.min_bedrooms) newParams.set('bedrooms', String(updated.min_bedrooms));
    if (updated.min_bathrooms) newParams.set('bathrooms', String(updated.min_bathrooms));
    if (updated.min_sqft) newParams.set('min_sqft', String(updated.min_sqft));
    if (updated.max_sqft) newParams.set('max_sqft', String(updated.max_sqft));
    if (updated.amenities.length > 0) newParams.set('amenities', updated.amenities.join(','));
    if (updated.features.length > 0) newParams.set('features', updated.features.join(','));
    if (updated.furnished !== null) newParams.set('furnished', String(updated.furnished));
    if (updated.pet_friendly) newParams.set('pet_friendly', 'true');
    if (updated.new_construction) newParams.set('new_construction', 'true');
    if (updated.virtual_tour_available) newParams.set('virtual_tour_available', 'true');
    
    const sortString = `${updated.sort_by}_${updated.sort_order}`;
    if (sortString !== 'created_at_desc') newParams.set('sort', sortString);
    
    setSearchParams(newParams);
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({
      query: null,
      min_price: null,
      max_price: null,
      listing_type: null,
      property_type: [],
      min_bedrooms: null,
      min_bathrooms: null,
      min_sqft: null,
      max_sqft: null,
      amenities: [],
      features: [],
      furnished: null,
      pet_friendly: null,
      new_construction: null,
      virtual_tour_available: null,
      sort_by: 'created_at',
      sort_order: 'desc',
      limit: 20,
      offset: 0
    });
    setSearchParams(new URLSearchParams());
  };
  
  // Remove individual filter
  const removeFilter = (filterName: keyof SearchFilters) => {
    if (Array.isArray(activeFilters[filterName])) {
      updateFilter(filterName, []);
    } else {
      updateFilter(filterName, null);
    }
  };
  
  // Toggle favorite
  const handleToggleFavorite = async (propertyId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!isAuthenticated) {
      openModal('auth_modal');
      showToast('Please sign in to save properties', 'info');
      return;
    }
    
    try {
      if (isPropertySaved(propertyId)) {
        await removeFavorite(propertyId);
      } else {
        await addFavorite(propertyId);
      }
    } catch (error) {
      // Error handled in store
    }
  };
  
  // Format price
  const formatPrice = (price: number, listingType: 'sale' | 'rent', rentFrequency: string | null): string => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
    
    if (listingType === 'rent') {
      return `${formatted}/${rentFrequency || 'month'}`;
    }
    
    return formatted;
  };
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.query) count++;
    if (activeFilters.min_price || activeFilters.max_price) count++;
    if (activeFilters.listing_type) count++;
    if (activeFilters.property_type.length > 0) count++;
    if (activeFilters.min_bedrooms) count++;
    if (activeFilters.min_bathrooms) count++;
    if (activeFilters.min_sqft || activeFilters.max_sqft) count++;
    if (activeFilters.amenities.length > 0) count += activeFilters.amenities.length;
    if (activeFilters.features.length > 0) count += activeFilters.features.length;
    if (activeFilters.furnished) count++;
    if (activeFilters.pet_friendly) count++;
    if (activeFilters.new_construction) count++;
    return count;
  }, [activeFilters]);
  
  // Active filter pills
  const filterPills = useMemo(() => {
    const pills: { label: string; onRemove: () => void }[] = [];
    
    if (activeFilters.query) {
      pills.push({ label: activeFilters.query, onRemove: () => removeFilter('query') });
    }
    if (activeFilters.min_price || activeFilters.max_price) {
      const min = activeFilters.min_price ? `$${(activeFilters.min_price / 1000).toFixed(0)}K` : 'Any';
      const max = activeFilters.max_price ? `$${(activeFilters.max_price / 1000).toFixed(0)}K` : 'Any';
      pills.push({ 
        label: `${min} - ${max}`, 
        onRemove: () => {
          updateFilter('min_price', null);
          updateFilter('max_price', null);
        }
      });
    }
    if (activeFilters.listing_type) {
      pills.push({ 
        label: `For ${activeFilters.listing_type === 'sale' ? 'Sale' : 'Rent'}`, 
        onRemove: () => removeFilter('listing_type') 
      });
    }
    if (activeFilters.min_bedrooms) {
      pills.push({ 
        label: `${activeFilters.min_bedrooms}+ Bedrooms`, 
        onRemove: () => removeFilter('min_bedrooms') 
      });
    }
    if (activeFilters.min_bathrooms) {
      pills.push({ 
        label: `${activeFilters.min_bathrooms}+ Bathrooms`, 
        onRemove: () => removeFilter('min_bathrooms') 
      });
    }
    activeFilters.amenities.forEach(amenity => {
      pills.push({
        label: amenity,
        onRemove: () => updateFilter('amenities', activeFilters.amenities.filter(a => a !== amenity))
      });
    });
    
    return pills;
  }, [activeFilters]);
  
  // Pagination
  const goToPage = (page: number) => {
    const newOffset = (page - 1) * activeFilters.limit;
    updateFilter('offset', newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header with results count and view controls */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {isLoading ? 'Searching...' : `${totalCount.toLocaleString()} Properties`}
                  {activeFilters.query && (
                    <span className="text-gray-600 font-normal text-lg ml-2">
                      in {activeFilters.query}
                    </span>
                  )}
                </h1>
                
                {/* Mobile filter button */}
                <button
                  onClick={() => setFilterPanelOpen(true)}
                  className="lg:hidden flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* View mode toggle */}
                <div className="hidden sm:flex bg-gray-100 rounded-lg p-1 space-x-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'} transition-all`}
                    title="Grid view"
                  >
                    <Grid3x3 className={`w-5 h-5 ${viewMode === 'grid' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'} transition-all`}
                    title="List view"
                  >
                    <List className={`w-5 h-5 ${viewMode === 'list' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`p-2 rounded ${viewMode === 'map' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'} transition-all`}
                    title="Map view"
                  >
                    <Map className={`w-5 h-5 ${viewMode === 'map' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </button>
                </div>
                
                {/* Sort dropdown */}
                <select
                  value={`${activeFilters.sort_by}_${activeFilters.sort_order}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('_');
                    updateFilter('sort_by', sortBy);
                    updateFilter('sort_order', sortOrder);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                >
                  <option value="created_at_desc">Newest</option>
                  <option value="created_at_asc">Oldest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="square_footage_desc">Largest First</option>
                  <option value="square_footage_asc">Smallest First</option>
                </select>
              </div>
            </div>
            
            {/* Active filter pills */}
            {filterPills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-sm text-gray-600">Filters:</span>
                {filterPills.map((pill, index) => (
                  <button
                    key={index}
                    onClick={pill.onRemove}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                  >
                    <span>{pill.label}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Desktop filter sidebar */}
            <aside className="hidden lg:block lg:col-span-3 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
                
                {/* Location */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={activeFilters.query || ''}
                      onChange={(e) => updateFilter('query', e.target.value || null)}
                      placeholder="City, neighborhood, or ZIP"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* Listing type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Listing Type
                  </label>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => updateFilter('listing_type', activeFilters.listing_type === 'sale' ? null : 'sale')}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        activeFilters.listing_type === 'sale'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      For Sale
                    </button>
                    <button
                      onClick={() => updateFilter('listing_type', activeFilters.listing_type === 'rent' ? null : 'rent')}
                      className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                        activeFilters.listing_type === 'rent'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      For Rent
                    </button>
                  </div>
                </div>
                
                {/* Price range */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={activeFilters.min_price || ''}
                        onChange={(e) => updateFilter('min_price', e.target.value ? Number(e.target.value) : null)}
                        placeholder="Min"
                        className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={activeFilters.max_price || ''}
                        onChange={(e) => updateFilter('max_price', e.target.value ? Number(e.target.value) : null)}
                        placeholder="Max"
                        className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  {activeFilters.max_price && activeFilters.min_price && activeFilters.max_price < activeFilters.min_price && (
                    <p className="text-red-600 text-xs mt-1">Max must be greater than min</p>
                  )}
                </div>
                
                {/* Property type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type
                  </label>
                  <div className="space-y-2">
                    {['house', 'condo', 'townhouse', 'apartment', 'land', 'commercial'].map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={activeFilters.property_type.includes(type)}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...activeFilters.property_type, type]
                              : activeFilters.property_type.filter(t => t !== type);
                            updateFilter('property_type', updated);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Bedrooms */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrooms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Any', '1+', '2+', '3+', '4+', '5+'].map((label, index) => {
                      const value = index === 0 ? null : index;
                      return (
                        <button
                          key={label}
                          onClick={() => updateFilter('min_bedrooms', value)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeFilters.min_bedrooms === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Bathrooms */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bathrooms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Any', '1+', '2+', '3+', '4+'].map((label, index) => {
                      const value = index === 0 ? null : index;
                      return (
                        <button
                          key={label}
                          onClick={() => updateFilter('min_bathrooms', value)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeFilters.min_bathrooms === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* More Filters */}
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={() => setMoreFiltersExpanded(!moreFiltersExpanded)}
                    className="flex items-center justify-between w-full text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    <span>More Filters</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${moreFiltersExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {moreFiltersExpanded && (
                    <div className="mt-4 space-y-4">
                      {/* Square footage */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Square Footage
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={activeFilters.min_sqft || ''}
                            onChange={(e) => updateFilter('min_sqft', e.target.value ? Number(e.target.value) : null)}
                            placeholder="Min sqft"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <input
                            type="number"
                            value={activeFilters.max_sqft || ''}
                            onChange={(e) => updateFilter('max_sqft', e.target.value ? Number(e.target.value) : null)}
                            placeholder="Max sqft"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      {/* Amenities */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amenities
                        </label>
                        <div className="space-y-2">
                          {['Pool', 'Parking', 'Gym', 'Garden', 'Balcony', 'Security System'].map(amenity => (
                            <label key={amenity} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={activeFilters.amenities.includes(amenity)}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...activeFilters.amenities, amenity]
                                    : activeFilters.amenities.filter(a => a !== amenity);
                                  updateFilter('amenities', updated);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* Additional features */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Features
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={activeFilters.furnished || false}
                              onChange={(e) => updateFilter('furnished', e.target.checked || null)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Furnished</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={activeFilters.pet_friendly || false}
                              onChange={(e) => updateFilter('pet_friendly', e.target.checked || null)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Pet-Friendly</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={activeFilters.new_construction || false}
                              onChange={(e) => updateFilter('new_construction', e.target.checked || null)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">New Construction</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={activeFilters.virtual_tour_available || false}
                              onChange={(e) => updateFilter('virtual_tour_available', e.target.checked || null)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Virtual Tour Available</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Clear filters button */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </aside>
            
            {/* Results area */}
            <main className="lg:col-span-9">
              {/* Loading state */}
              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                      <div className="bg-gray-200 h-64"></div>
                      <div className="p-6 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Error state */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-700 mb-4">Failed to load properties. Please try again.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              
              {/* Empty state */}
              {!isLoading && !error && properties.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Properties Found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    We couldn't find any properties matching your criteria.
                  </p>
                  <div className="space-y-2 text-sm text-gray-600 mb-6">
                    <p>Try:</p>
                    <ul className="list-disc list-inside">
                      <li>Expanding your search area</li>
                      <li>Removing some filters</li>
                      <li>Adjusting your price range</li>
                    </ul>
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
              
              {/* Grid view */}
              {!isLoading && !error && properties.length > 0 && viewMode === 'grid' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                      <Link
                        key={property.property_id}
                        to={`/property/${property.property_id}`}
                        className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                      >
                        {/* Property image */}
                        <div className="relative h-64 bg-gray-200">
                          {property.primary_photo?.image_url ? (
                            <img
                              src={property.primary_photo.thumbnail_url || property.primary_photo.image_url}
                              alt={property.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="w-16 h-16 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Listing type badge */}
                          <div className="absolute top-3 left-3">
                            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                              For {property.listing_type === 'sale' ? 'Sale' : 'Rent'}
                            </span>
                          </div>
                          
                          {/* Favorite button */}
                          <button
                            onClick={(e) => handleToggleFavorite(property.property_id, e)}
                            className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                          >
                            <Heart
                              className={`w-5 h-5 ${
                                isPropertySaved(property.property_id)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-gray-600'
                              }`}
                            />
                          </button>
                        </div>
                        
                        {/* Property details */}
                        <div className="p-6">
                          <div className="mb-2">
                            <p className="text-2xl font-bold text-blue-600">
                              {formatPrice(property.price, property.listing_type, property.rent_frequency)}
                            </p>
                            {property.price_per_sqft && (
                              <p className="text-sm text-gray-500">
                                ${Number(property.price_per_sqft || 0).toFixed(0)}/sqft
                              </p>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                            {property.title}
                          </h3>
                          
                          <p className="text-sm text-gray-600 mb-3">
                            {property.address_street}, {property.address_city}, {property.address_state}
                          </p>
                          
                          <p className="text-xs text-gray-500 mb-3 capitalize">
                            {property.property_type.replace('_', ' ')}
                          </p>
                          
                          {/* Specs */}
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                            <div className="flex items-center space-x-1">
                              <Bed className="w-4 h-4" />
                              <span>{property.bedrooms} bd</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Bath className="w-4 h-4" />
                              <span>{Number(property.bathrooms || 0).toFixed(1)} ba</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Maximize className="w-4 h-4" />
                              <span>{Number(property.square_footage || 0).toLocaleString()} sqft</span>
                            </div>
                          </div>
                          
                          {/* Description preview */}
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                            {property.description}
                          </p>
                          
                          {/* Agent info */}
                          <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                            {property.agent_info.profile_photo_url ? (
                              <img
                                src={property.agent_info.profile_photo_url}
                                alt={property.agent_info.full_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs text-gray-600 font-medium">
                                  {property.agent_info.full_name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-gray-700">{property.agent_info.full_name}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-8">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`px-4 py-2 rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        {totalPages > 5 && (
                          <>
                            <span className="px-2">...</span>
                            <button
                              onClick={() => goToPage(totalPages)}
                              className={`px-4 py-2 rounded-lg transition-colors ${
                                currentPage === totalPages
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
              
              {/* List view */}
              {!isLoading && !error && properties.length > 0 && viewMode === 'list' && (
                <>
                  <div className="space-y-6">
                    {properties.map((property) => (
                      <Link
                        key={property.property_id}
                        to={`/property/${property.property_id}`}
                        className="group flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-200"
                      >
                        {/* Property image */}
                        <div className="relative w-64 h-48 flex-shrink-0 bg-gray-200">
                          {property.primary_photo?.image_url ? (
                            <img
                              src={property.primary_photo.thumbnail_url || property.primary_photo.image_url}
                              alt={property.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Favorite button */}
                          <button
                            onClick={(e) => handleToggleFavorite(property.property_id, e)}
                            className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                          >
                            <Heart
                              className={`w-5 h-5 ${
                                isPropertySaved(property.property_id)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-gray-600'
                              }`}
                            />
                          </button>
                        </div>
                        
                        {/* Property details */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-2xl font-bold text-blue-600">
                                {formatPrice(property.price, property.listing_type, property.rent_frequency)}
                              </p>
                              {property.price_per_sqft && (
                                <p className="text-sm text-gray-500">
                                  ${Number(property.price_per_sqft || 0).toFixed(0)}/sqft
                                </p>
                              )}
                            </div>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                              For {property.listing_type === 'sale' ? 'Sale' : 'Rent'}
                            </span>
                          </div>
                          
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {property.title}
                          </h3>
                          
                          <p className="text-sm text-gray-600 mb-3">
                            {property.address_street}, {property.address_city}, {property.address_state} {property.address_zip}
                          </p>
                          
                          {/* Specs */}
                          <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                            <div className="flex items-center space-x-1">
                              <Bed className="w-4 h-4" />
                              <span>{property.bedrooms} bedrooms</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Bath className="w-4 h-4" />
                              <span>{Number(property.bathrooms || 0).toFixed(1)} bathrooms</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Maximize className="w-4 h-4" />
                              <span>{Number(property.square_footage || 0).toLocaleString()} sqft</span>
                            </div>
                          </div>
                          
                          {/* Description */}
                          <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                            {property.description}
                          </p>
                          
                          {/* Agent info */}
                          <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                            {property.agent_info.profile_photo_url ? (
                              <img
                                src={property.agent_info.profile_photo_url}
                                alt={property.agent_info.full_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs text-gray-600 font-medium">
                                  {property.agent_info.full_name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-gray-700">{property.agent_info.full_name}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-8">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      
                      <span className="px-4 py-2 text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
              
              {/* Map view placeholder */}
              {!isLoading && !error && properties.length > 0 && viewMode === 'map' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Map View
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Map view coming soon. Use grid or list view to browse properties.
                  </p>
                  <button
                    onClick={() => setViewMode('grid')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Switch to Grid View
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
      
      {/* Mobile filter modal */}
      {filterPanelOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setFilterPanelOpen(false)}></div>
          
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              {/* Filter content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={activeFilters.query || ''}
                      onChange={(e) => updateFilter('query', e.target.value || null)}
                      placeholder="City, neighborhood, or ZIP"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* Price range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={activeFilters.min_price || ''}
                      onChange={(e) => updateFilter('min_price', e.target.value ? Number(e.target.value) : null)}
                      placeholder="Min"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      value={activeFilters.max_price || ''}
                      onChange={(e) => updateFilter('max_price', e.target.value ? Number(e.target.value) : null)}
                      placeholder="Max"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* Listing type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Listing Type
                  </label>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => updateFilter('listing_type', activeFilters.listing_type === 'sale' ? null : 'sale')}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        activeFilters.listing_type === 'sale'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700'
                      }`}
                    >
                      For Sale
                    </button>
                    <button
                      onClick={() => updateFilter('listing_type', activeFilters.listing_type === 'rent' ? null : 'rent')}
                      className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                        activeFilters.listing_type === 'rent'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700'
                      }`}
                    >
                      For Rent
                    </button>
                  </div>
                </div>
                
                {/* Property type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type
                  </label>
                  <div className="space-y-2">
                    {['house', 'condo', 'townhouse', 'apartment', 'land', 'commercial'].map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={activeFilters.property_type.includes(type)}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...activeFilters.property_type, type]
                              : activeFilters.property_type.filter(t => t !== type);
                            updateFilter('property_type', updated);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Bedrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrooms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Any', '1+', '2+', '3+', '4+', '5+'].map((label, index) => {
                      const value = index === 0 ? null : index;
                      return (
                        <button
                          key={label}
                          onClick={() => updateFilter('min_bedrooms', value)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeFilters.min_bedrooms === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Bathrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bathrooms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Any', '1+', '2+', '3+', '4+'].map((label, index) => {
                      const value = index === 0 ? null : index;
                      return (
                        <button
                          key={label}
                          onClick={() => updateFilter('min_bathrooms', value)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeFilters.min_bathrooms === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Amenities */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amenities
                  </label>
                  <div className="space-y-2">
                    {['Pool', 'Parking', 'Gym', 'Garden', 'Balcony', 'Security System'].map(amenity => (
                      <label key={amenity} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={activeFilters.amenities.includes(amenity)}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...activeFilters.amenities, amenity]
                              : activeFilters.amenities.filter(a => a !== amenity);
                            updateFilter('amenities', updated);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Footer with action buttons */}
              <div className="px-6 py-4 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Show {totalCount} Properties
                </button>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      clearAllFilters();
                      setFilterPanelOpen(false);
                    }}
                    className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_SearchResults;