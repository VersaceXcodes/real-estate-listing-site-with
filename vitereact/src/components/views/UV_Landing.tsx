import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Search, MapPin, DollarSign, Home, Bed, Bath, Maximize, Heart, TrendingUp, Users, Key } from 'lucide-react';

// ============================================================================
// TYPES (matching Zod schemas)
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
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  neighborhood: string | null;
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  view_count: number;
  inquiry_count: number;
  favorite_count: number;
  primary_photo?: {
    image_url: string;
    thumbnail_url: string | null;
  } | null;
  agent_info?: {
    agent_id: string;
    full_name: string;
    profile_photo_url: string | null;
  };
  created_at: string;
}

interface SearchFormData {
  location: string;
  min_price: number | null;
  max_price: number | null;
  property_type: string;
  listing_type: 'sale' | 'rent';
  validation_errors: {
    location?: string;
    price_range?: string;
  };
}

// ============================================================================
// UV_LANDING COMPONENT
// ============================================================================

const UV_Landing: React.FC = () => {
  const navigate = useNavigate();

  // CRITICAL: Individual selectors, no object destructuring
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const savedProperties = useAppStore(state => state.user_favorites.saved_properties);
  const addFavorite = useAppStore(state => state.add_favorite);
  const removeFavorite = useAppStore(state => state.remove_favorite);
  const openModal = useAppStore(state => state.open_modal);

  // ========== LOCAL STATE ==========
  const [searchForm, setSearchForm] = useState<SearchFormData>({
    location: '',
    min_price: null,
    max_price: null,
    property_type: 'all',
    listing_type: 'sale',
    validation_errors: {}
  });

  // ========== API QUERIES ==========
  
  // Load Featured Properties
  const { 
    data: featuredProperties, 
    isLoading: loadingFeatured, 
    error: featuredError,
    refetch: refetchFeatured 
  } = useQuery({
    queryKey: ['featured-properties'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties`,
        {
          params: {
            is_featured: true,
            status: 'active',
            limit: 12,
            sort_by: 'featured_order',
            sort_order: 'asc'
          }
        }
      );
      return response.data.data as Property[];
    },
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1
  });

  // ========== HELPER FUNCTIONS ==========

  const formatPrice = (price: number, currency: string, listingType: 'sale' | 'rent'): string => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
    
    return listingType === 'rent' ? `${formatted}/month` : formatted;
  };

  const isPropertySaved = (propertyId: string): boolean => {
    return savedProperties.includes(propertyId);
  };

  // ========== EVENT HANDLERS ==========

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setSearchForm(prev => ({ ...prev, validation_errors: {} }));
    
    // Validate price range
    if (searchForm.min_price && searchForm.max_price && searchForm.max_price < searchForm.min_price) {
      setSearchForm(prev => ({
        ...prev,
        validation_errors: { price_range: 'Maximum price must be greater than minimum price' }
      }));
      return;
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    if (searchForm.location) params.set('location', searchForm.location);
    if (searchForm.min_price) params.set('min_price', String(searchForm.min_price));
    if (searchForm.max_price) params.set('max_price', String(searchForm.max_price));
    if (searchForm.property_type !== 'all') params.set('property_type', searchForm.property_type);
    params.set('listing_type', searchForm.listing_type);
    
    // Navigate to search results
    navigate(`/search?${params.toString()}`);
  };

  const handleQuickFilter = (filterType: string, filterValue: string) => {
    const params = new URLSearchParams();
    params.set('listing_type', 'sale');
    
    switch (filterType) {
      case 'bedrooms':
        params.set('bedrooms', filterValue);
        break;
      case 'amenities':
        params.set('amenities', filterValue);
        break;
      case 'price':
        params.set('max_price', filterValue);
        break;
      case 'new':
        params.set('new_construction', 'true');
        break;
    }
    
    navigate(`/search?${params.toString()}`);
  };

  const handleToggleFavorite = async (propertyId: string) => {
    // Check authentication
    if (!isAuthenticated) {
      openModal('auth_modal');
      return;
    }
    
    const isSaved = isPropertySaved(propertyId);
    
    try {
      if (isSaved) {
        await removeFavorite(propertyId);
      } else {
        await addFavorite(propertyId);
      }
    } catch (error) {
      // Error handling is in global actions
      console.error('Favorite toggle error:', error);
    }
  };

  // ========== RENDER ==========
  
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 pt-20 pb-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Content */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Find Your Dream Property
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Browse thousands of listings from trusted agents
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
            <form onSubmit={handleSearchSubmit} className="space-y-6">
              {/* Listing Type Toggle */}
              <div className="flex justify-center">
                <div className="inline-flex rounded-lg bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSearchForm(prev => ({ ...prev, listing_type: 'sale' }))}
                    className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                      searchForm.listing_type === 'sale'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchForm(prev => ({ ...prev, listing_type: 'rent' }))}
                    className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                      searchForm.listing_type === 'rent'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Rent
                  </button>
                </div>
              </div>

              {/* Search Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Location */}
                <div className="lg:col-span-2">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                    <input
                      type="text"
                      value={searchForm.location}
                      onChange={(e) => setSearchForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Enter city, neighborhood, or ZIP code"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Min Price */}
                <div>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                    <select
                      value={searchForm.min_price || ''}
                      onChange={(e) => setSearchForm(prev => ({ 
                        ...prev, 
                        min_price: e.target.value ? Number(e.target.value) : null 
                      }))}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 appearance-none bg-white"
                    >
                      <option value="">Min Price</option>
                      <option value="50000">$50K</option>
                      <option value="100000">$100K</option>
                      <option value="150000">$150K</option>
                      <option value="200000">$200K</option>
                      <option value="250000">$250K</option>
                      <option value="300000">$300K</option>
                      <option value="400000">$400K</option>
                      <option value="500000">$500K</option>
                      <option value="750000">$750K</option>
                      <option value="1000000">$1M+</option>
                    </select>
                  </div>
                </div>

                {/* Max Price */}
                <div>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                    <select
                      value={searchForm.max_price || ''}
                      onChange={(e) => setSearchForm(prev => ({ 
                        ...prev, 
                        max_price: e.target.value ? Number(e.target.value) : null 
                      }))}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 appearance-none bg-white"
                    >
                      <option value="">Max Price</option>
                      <option value="100000">$100K</option>
                      <option value="150000">$150K</option>
                      <option value="200000">$200K</option>
                      <option value="300000">$300K</option>
                      <option value="400000">$400K</option>
                      <option value="500000">$500K</option>
                      <option value="750000">$750K</option>
                      <option value="1000000">$1M</option>
                      <option value="2000000">$2M</option>
                      <option value="5000000">$5M+</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Property Type */}
              <div>
                <div className="relative">
                  <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                  <select
                    value={searchForm.property_type}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, property_type: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 appearance-none bg-white"
                  >
                    <option value="all">All Types</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="land">Land</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
              </div>

              {/* Error Messages */}
              {searchForm.validation_errors.price_range && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {searchForm.validation_errors.price_range}
                </div>
              )}

              {/* Search Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <Search className="size-5" />
                <span>Search Properties</span>
              </button>

              {/* Quick Filter Chips */}
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => handleQuickFilter('bedrooms', '3')}
                  className="px-4 py-2 bg-white border-2 border-gray-200 rounded-full text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all text-sm font-medium"
                >
                  3+ Bedrooms
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFilter('amenities', 'pool')}
                  className="px-4 py-2 bg-white border-2 border-gray-200 rounded-full text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all text-sm font-medium"
                >
                  Has Pool
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFilter('new', 'true')}
                  className="px-4 py-2 bg-white border-2 border-gray-200 rounded-full text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all text-sm font-medium"
                >
                  New Listings
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFilter('price', '300000')}
                  className="px-4 py-2 bg-white border-2 border-gray-200 rounded-full text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all text-sm font-medium"
                >
                  Under $300K
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Featured Properties
            </h2>
            <p className="text-lg text-gray-600">
              Discover handpicked properties from our trusted agents
            </p>
          </div>

          {/* Loading State */}
          {loadingFeatured && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(12)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-gray-200 rounded-xl h-64 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {featuredError && (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-xl p-8 inline-block">
                <p className="text-red-700 mb-4">Failed to load featured properties</p>
                <button
                  onClick={() => refetchFeatured()}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Properties Grid */}
          {!loadingFeatured && !featuredError && featuredProperties && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map((property) => (
                <div
                  key={property.property_id}
                  className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                >
                  {/* Property Image */}
                  <div className="relative h-64 overflow-hidden">
                    <Link to={`/property/${property.property_id}`}>
                      <img
                        src={property.primary_photo?.thumbnail_url || property.primary_photo?.image_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </Link>

                    {/* Favorite Button */}
                    <button
                      onClick={() => handleToggleFavorite(property.property_id)}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                      aria-label={isPropertySaved(property.property_id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart 
                        className={`size-5 transition-colors ${
                          isPropertySaved(property.property_id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>

                    {/* Listing Type Badge */}
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        property.listing_type === 'sale'
                          ? 'bg-blue-600 text-white'
                          : 'bg-green-600 text-white'
                      }`}>
                        For {property.listing_type === 'sale' ? 'Sale' : 'Rent'}
                      </span>
                    </div>

                    {/* Status Badges */}
                    {property.status === 'pending' && (
                      <div className="absolute top-12 left-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500 text-white">
                          Pending
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Property Details */}
                  <div className="p-6">
                    {/* Price */}
                    <div className="mb-3">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatPrice(property.price, property.currency, property.listing_type)}
                      </p>
                      {property.price_per_sqft && (
                        <p className="text-sm text-gray-500">
                          ${Number(property.price_per_sqft || 0).toFixed(0)}/sqft
                        </p>
                      )}
                    </div>

                    {/* Address */}
                    <Link 
                      to={`/property/${property.property_id}`}
                      className="block mb-3 group-hover:text-blue-600 transition-colors"
                    >
                      <p className="font-semibold text-gray-900 mb-1 line-clamp-1">
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
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Bed className="size-4" />
                        <span>{property.bedrooms} bd</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="size-4" />
                        <span>{property.bathrooms} ba</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Maximize className="size-4" />
                        <span>{Number(property.square_footage || 0).toLocaleString()} sqft</span>
                      </div>
                    </div>

                    {/* Description Preview */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {property.description}
                    </p>

                    {/* Agent Info */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <Link
                        to={`/agent/${property.agent_id}`}
                        className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      >
                        {property.agent_info?.profile_photo_url ? (
                          <img
                            src={property.agent_info.profile_photo_url}
                            alt={property.agent_info.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-600">
                              {property.agent_info?.full_name?.charAt(0) || 'A'}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {property.agent_info?.full_name || 'Agent'}
                        </span>
                      </Link>

                      <Link
                        to={`/property/${property.property_id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loadingFeatured && !featuredError && (!featuredProperties || featuredProperties.length === 0) && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No featured properties available</p>
              <Link
                to="/search"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Browse All Properties
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Property Seeker CTA */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Left - Content */}
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-6">
                  <Search className="size-8 text-blue-600" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Find Your Perfect Home
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Search thousands of listings in your area and connect with trusted real estate agents
                </p>
                <Link
                  to="/search"
                  className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Start Searching
                </Link>
              </div>

              {/* Right - Visual */}
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-8 lg:p-12 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <TrendingUp className="size-8 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">1000+</p>
                    <p className="text-sm text-gray-600">Active Listings</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <Users className="size-8 text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">500+</p>
                    <p className="text-sm text-gray-600">Trusted Agents</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <Home className="size-8 text-purple-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">50+</p>
                    <p className="text-sm text-gray-600">Cities</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <Key className="size-8 text-orange-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">200+</p>
                    <p className="text-sm text-gray-600">Sold This Month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent CTA */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Left - Visual */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 lg:p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 rounded-full mb-6 backdrop-blur-sm">
                    <Users className="size-12 text-white" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-white/80">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Join 500+ Active Agents</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Content */}
              <div className="bg-white p-8 lg:p-12 flex flex-col justify-center">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Are You a Real Estate Agent?
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  List your properties, reach more buyers, and grow your business with PropConnect
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-gray-700">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Unlimited property listings</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Direct inquiry management</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Performance analytics dashboard</span>
                  </li>
                </ul>
                <Link
                  to="/agent/register"
                  className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Join as an Agent
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Value Props */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose PropConnect?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-6">
                <Search className="size-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Advanced Search
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Find exactly what you're looking for with our powerful search filters and interactive map view
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-xl mb-6">
                <Users className="size-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Trusted Agents
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Connect with verified real estate professionals who know your area and your needs
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-xl mb-6">
                <Heart className="size-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Save & Track
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Save your favorite properties and get notified about price changes and updates
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default UV_Landing;